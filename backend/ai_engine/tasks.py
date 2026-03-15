from celery import shared_task


def _run_portfolio_scan():
    """Core portfolio scan logic — synchronous, called by Celery task or directly."""
    from ai_engine.ml.risk_scorer import score_all_active_leases
    from ai_engine.ml.maintenance_predictor import predict_all_assets
    from ai_engine.models import AnomalyAlert, MaintenancePrediction, RemarketingRecommendation, RiskScore
    from workflows.models import ApprovalRequest
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    User = get_user_model()
    admin_user = User.objects.filter(role="admin").first()
    if not admin_user:
        return {"detail": "No admin user found."}

    approvals_created = 0
    scores_updated = 0

    # Score active leases
    try:
        for lease, result in score_all_active_leases():
            rs, _ = RiskScore.objects.update_or_create(
                lease=lease,
                defaults={
                    "probability": result["probability"],
                    "risk_band": result["risk_band"],
                    "top_drivers": result["top_drivers"],
                },
            )
            scores_updated += 1

            # Trigger: critical default risk
            if result["probability"] > 0.75 and lease.status == "active":
                if not ApprovalRequest.objects.filter(
                    status="pending", resource_type="lease", resource_id=lease.id,
                    request_type="write_off"
                ).exists():
                    ApprovalRequest.objects.create(
                        request_type="write_off",
                        priority="urgent",
                        status="pending",
                        requested_by=admin_user,
                        resource_type="lease",
                        resource_id=lease.id,
                        payload={"risk_probability": result["probability"], "risk_band": result["risk_band"]},
                        requester_notes=(
                            f"AI-detected: Lease {lease.contract_number} has "
                            f"{result['probability']*100:.0f}% default probability "
                            f"({result['risk_band']} risk). Recommend review."
                        ),
                    )
                    approvals_created += 1
    except Exception:
        pass

    # Predict maintenance
    try:
        for asset, result in predict_all_assets():
            mp, _ = MaintenancePrediction.objects.update_or_create(
                asset=asset,
                defaults={
                    "failure_probability": result["failure_probability"],
                    "days_to_predicted_failure": result["days_to_predicted_failure"],
                    "risk_level": result["risk_level"],
                    "top_signals": result["top_signals"],
                    "recommendation": result["recommendation"],
                },
            )
            # Trigger: critical maintenance risk
            if result["risk_level"] == "critical":
                if not ApprovalRequest.objects.filter(
                    status="pending", resource_type="asset", resource_id=asset.id,
                    request_type="asset_disposal"
                ).exists():
                    ApprovalRequest.objects.create(
                        request_type="asset_disposal",
                        priority="high",
                        status="pending",
                        requested_by=admin_user,
                        resource_type="asset",
                        resource_id=asset.id,
                        payload={"failure_probability": result["failure_probability"]},
                        requester_notes=(
                            f"AI-detected: Asset {asset.name} has "
                            f"{result['failure_probability']*100:.0f}% failure probability. "
                            f"{result['recommendation']}"
                        ),
                    )
                    approvals_created += 1
    except Exception:
        pass

    # Trigger: unresolved critical anomalies
    try:
        critical_anomalies = AnomalyAlert.objects.filter(severity="critical", resolved=False).select_related("invoice__lease")
        for alert in critical_anomalies:
            lease = alert.invoice.lease
            if not ApprovalRequest.objects.filter(
                status="pending", resource_type="invoice", resource_id=alert.invoice_id,
                request_type="write_off"
            ).exists():
                ApprovalRequest.objects.create(
                    request_type="write_off",
                    priority="high",
                    status="pending",
                    requested_by=admin_user,
                    resource_type="invoice",
                    resource_id=alert.invoice_id,
                    payload={"anomaly_type": alert.alert_type, "explanation": alert.explanation[:200]},
                    requester_notes=(
                        f"AI-detected anomaly on invoice {alert.invoice.invoice_number}: "
                        f"{alert.alert_type}. {alert.explanation[:150]}"
                    ),
                )
                approvals_created += 1
    except Exception:
        pass

    # Trigger: expiring leases (< 14 days)
    try:
        from django.utils import timezone as tz
        from datetime import timedelta
        from originations.models import LeaseContract
        today = tz.now().date()
        expiring = LeaseContract.objects.filter(
            status="active",
            end_date__gte=today,
            end_date__lte=today + timedelta(days=14),
        )
        for lease in expiring:
            if not ApprovalRequest.objects.filter(
                status="pending", resource_type="lease", resource_id=lease.id,
                request_type="lease_renew"
            ).exists():
                ApprovalRequest.objects.create(
                    request_type="lease_renew",
                    priority="medium",
                    status="pending",
                    requested_by=admin_user,
                    resource_type="lease",
                    resource_id=lease.id,
                    payload={"days_until_expiry": (lease.end_date - today).days},
                    requester_notes=(
                        f"AI-triggered: Lease {lease.contract_number} ({lease.asset.name}) "
                        f"expires in {(lease.end_date - today).days} days. Renewal outreach recommended."
                    ),
                )
                approvals_created += 1
    except Exception:
        pass

    return {
        "scores_updated": scores_updated,
        "approvals_created": approvals_created,
        "detail": f"Portfolio scan complete. {scores_updated} leases scored, {approvals_created} approval requests created.",
    }


@shared_task(name="ai_engine.tasks.score_portfolio_and_trigger_workflows")
def score_portfolio_and_trigger_workflows():
    return _run_portfolio_scan()


@shared_task(name="ai_engine.tasks.run_anomaly_scan")
def run_anomaly_scan():
    from ai_engine.ml.anomaly_detector import detect_anomalies
    from ai_engine.models import AnomalyAlert
    from servicing.models import Invoice

    try:
        anomaly_list = detect_anomalies()
    except Exception as e:
        return {"error": str(e)}

    new_alerts = 0
    for item in anomaly_list:
        try:
            invoice = Invoice.objects.get(pk=item["invoice_id"])
            if not AnomalyAlert.objects.filter(
                invoice=invoice, alert_type=item["alert_type"], resolved=False
            ).exists():
                AnomalyAlert.objects.create(
                    invoice=invoice,
                    alert_type=item["alert_type"],
                    severity=item["severity"],
                    anomaly_score=item["anomaly_score"],
                    z_score=item.get("z_score"),
                    explanation=item["explanation"],
                )
                new_alerts += 1
        except Exception:
            continue

    return {"new_alerts": new_alerts}
