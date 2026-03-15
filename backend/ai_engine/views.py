from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AnomalyAlert, ChatMessage, ChatSession, MaintenancePrediction, RemarketingRecommendation, RiskScore
from .serializers import (
    AnomalyAlertSerializer,
    ChatMessageSerializer,
    ChatSessionSerializer,
    MaintenancePredictionSerializer,
    RemarketingRecommendationSerializer,
    RiskScoreSerializer,
)


class IsAdminOrAnalyst(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ("admin", "analyst")


# ── Feature 1: Lease Structuring Copilot ─────────────────────────────────────

class LeaseCopilotView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.lease_copilot import structure_lease
        asset_id = request.data.get("asset_id")
        lessee_id = request.data.get("lessee_id")
        risk_appetite = request.data.get("risk_appetite", "balanced")
        requested_term = int(request.data.get("requested_term_months", 24))

        if not asset_id:
            return Response({"detail": "asset_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = structure_lease(
                asset_id=int(asset_id),
                lessee_id=int(lessee_id) if lessee_id else None,
                risk_appetite=risk_appetite,
                requested_term_months=requested_term,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if "error" in result:
            return Response({"detail": result["error"]}, status=status.HTTP_404_NOT_FOUND)

        return Response(result)


# ── Feature 2: Invoice Anomaly Detection ──────────────────────────────────────

class AnomalyAlertListView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        qs = AnomalyAlert.objects.select_related(
            "invoice__lease__asset", "invoice__lease__lessee"
        )
        resolved_filter = request.query_params.get("resolved")
        severity_filter = request.query_params.get("severity")
        if resolved_filter is not None:
            qs = qs.filter(resolved=resolved_filter.lower() == "true")
        if severity_filter:
            qs = qs.filter(severity=severity_filter)

        unresolved_count = AnomalyAlert.objects.filter(resolved=False).count()
        return Response({
            "count": qs.count(),
            "unresolved_count": unresolved_count,
            "results": AnomalyAlertSerializer(qs, many=True).data,
        })


class AnomalyScanView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.anomaly_detector import detect_anomalies
        from servicing.models import Invoice

        try:
            anomaly_list = detect_anomalies()
        except Exception as e:
            return Response({"detail": f"Scan failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        new_alerts = 0
        for item in anomaly_list:
            try:
                invoice = Invoice.objects.get(pk=item["invoice_id"])
                # Avoid duplicate alerts of same type for same invoice
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

        total_unresolved = AnomalyAlert.objects.filter(resolved=False).count()
        return Response({
            "new_alerts_created": new_alerts,
            "total_unresolved": total_unresolved,
            "detail": f"Scan complete. {new_alerts} new anomalies detected.",
        })


class AnomalyResolveView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def patch(self, request, pk):
        try:
            alert = AnomalyAlert.objects.get(pk=pk)
        except AnomalyAlert.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["resolved", "resolved_at"])
        return Response(AnomalyAlertSerializer(alert).data)


# ── Feature 3: Default Risk Scoring ──────────────────────────────────────────

class RiskScoreListView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        qs = RiskScore.objects.select_related("lease__asset", "lease__lessee")
        band_filter = request.query_params.get("band")
        if band_filter:
            qs = qs.filter(risk_band=band_filter)
        return Response({
            "count": qs.count(),
            "results": RiskScoreSerializer(qs, many=True).data,
        })


class RiskScoreRefreshView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.risk_scorer import score_all_active_leases
        try:
            results = score_all_active_leases()
        except Exception as e:
            return Response({"detail": f"Scoring failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        updated = 0
        for lease, result in results:
            RiskScore.objects.update_or_create(
                lease=lease,
                defaults={
                    "probability": result["probability"],
                    "risk_band": result["risk_band"],
                    "top_drivers": result["top_drivers"],
                },
            )
            updated += 1

        return Response({
            "leases_scored": updated,
            "detail": f"Risk scores refreshed for {updated} active leases.",
        })


class RiskScoreDetailView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request, lease_id):
        try:
            rs = RiskScore.objects.select_related(
                "lease__asset", "lease__lessee"
            ).get(lease_id=lease_id)
        except RiskScore.DoesNotExist:
            return Response({"detail": "No risk score for this lease. Run a refresh."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RiskScoreSerializer(rs).data)


# ── Feature 4: Maintenance Failure Prediction ─────────────────────────────────

class MaintenancePredictionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = MaintenancePrediction.objects.select_related("asset")
        level_filter = request.query_params.get("risk_level")
        if level_filter:
            qs = qs.filter(risk_level=level_filter)
        critical_count = MaintenancePrediction.objects.filter(risk_level="critical").count()
        return Response({
            "critical_count": critical_count,
            "count": qs.count(),
            "results": MaintenancePredictionSerializer(qs, many=True).data,
        })


class MaintenancePredictionRefreshView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.maintenance_predictor import predict_all_assets
        try:
            results = predict_all_assets()
        except Exception as e:
            return Response({"detail": f"Prediction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        updated = 0
        for asset, result in results:
            MaintenancePrediction.objects.update_or_create(
                asset=asset,
                defaults={
                    "failure_probability": result["failure_probability"],
                    "days_to_predicted_failure": result["days_to_predicted_failure"],
                    "risk_level": result["risk_level"],
                    "top_signals": result["top_signals"],
                    "recommendation": result["recommendation"],
                },
            )
            updated += 1

        return Response({
            "assets_analyzed": updated,
            "detail": f"Maintenance predictions refreshed for {updated} assets.",
        })


class MaintenancePredictionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, asset_id):
        try:
            mp = MaintenancePrediction.objects.select_related("asset").get(asset_id=asset_id)
        except MaintenancePrediction.DoesNotExist:
            return Response({"detail": "No prediction for this asset. Run a refresh."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MaintenancePredictionSerializer(mp).data)


# ── Feature 6: AI Collections Assistant ──────────────────────────────────────

class CollectionsListView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        from ai_engine.ml.collections_advisor import advise_invoice
        from servicing.models import Invoice
        from django.db.models import Sum

        overdue_qs = Invoice.objects.filter(status="overdue").select_related(
            "lease__asset", "lease__lessee"
        ).order_by("-total_amount")

        total_amount = overdue_qs.aggregate(s=Sum("total_amount"))["s"] or 0
        items = []
        for inv in overdue_qs:
            try:
                items.append(advise_invoice(inv))
            except Exception:
                continue

        items.sort(key=lambda x: -x["urgency_score"])

        return Response({
            "total_overdue": overdue_qs.count(),
            "total_amount": float(total_amount),
            "results": items,
        })


class CollectionsDraftView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request, invoice_id):
        from ai_engine.ml.collections_advisor import advise_invoice
        from servicing.models import Invoice

        try:
            invoice = Invoice.objects.select_related(
                "lease__asset", "lease__lessee"
            ).get(pk=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status != "overdue":
            return Response({"detail": "Invoice is not overdue."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = advise_invoice(invoice)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result)


# ── Feature 7: Remarketing Decision Engine ────────────────────────────────────

class RemarketingRecommendationListView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        qs = RemarketingRecommendation.objects.select_related("asset")
        action_filter = request.query_params.get("action")
        if action_filter:
            qs = qs.filter(recommended_action=action_filter)

        by_action = {}
        for item in RemarketingRecommendation.objects.values("recommended_action"):
            a = item["recommended_action"]
            by_action[a] = by_action.get(a, 0) + 1

        return Response({
            "count": qs.count(),
            "by_action": by_action,
            "results": RemarketingRecommendationSerializer(qs, many=True).data,
        })


class RemarketingRecommendationDetailView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request, asset_id):
        try:
            rec = RemarketingRecommendation.objects.select_related("asset").get(asset_id=asset_id)
        except RemarketingRecommendation.DoesNotExist:
            # Compute on-demand
            from originations.models import Asset
            from ai_engine.ml.remarketing_engine import compute_recommendation
            try:
                asset = Asset.objects.get(pk=asset_id)
                result = compute_recommendation(asset)
                rec, _ = RemarketingRecommendation.objects.update_or_create(
                    asset=asset,
                    defaults={
                        "recommended_action": result["recommended_action"],
                        "sell_price_estimate": result["sell_price_estimate"],
                        "refurbish_cost_estimate": result["refurbish_cost_estimate"],
                        "net_roi_12m": result["net_roi_12m"],
                        "roi_curve": result["roi_curve"],
                        "rationale": result["rationale"],
                    },
                )
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Also return all_roi_curves for detail view
        from ai_engine.ml.remarketing_engine import compute_recommendation
        try:
            full_result = compute_recommendation(rec.asset)
        except Exception:
            full_result = {}

        data = RemarketingRecommendationSerializer(rec).data
        data["all_roi_curves"] = full_result.get("all_roi_curves", {})
        data["final_rois"] = full_result.get("final_rois", {})
        return Response(data)


class RemarketingRefreshView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.remarketing_engine import compute_all_recommendations
        try:
            results = compute_all_recommendations()
        except Exception as e:
            return Response({"detail": f"Computation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        updated = 0
        for asset, result in results:
            RemarketingRecommendation.objects.update_or_create(
                asset=asset,
                defaults={
                    "recommended_action": result["recommended_action"],
                    "sell_price_estimate": result["sell_price_estimate"],
                    "refurbish_cost_estimate": result["refurbish_cost_estimate"],
                    "net_roi_12m": result["net_roi_12m"],
                    "roi_curve": result["roi_curve"],
                    "rationale": result["rationale"],
                },
            )
            updated += 1

        return Response({
            "assets_analyzed": updated,
            "detail": f"Remarketing recommendations refreshed for {updated} assets.",
        })


# ── Feature 8: NL Analytics Chat ─────────────────────────────────────────────

class ChatView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.nl_analytics import process_query, EXAMPLE_QUESTIONS
        from ai_engine.ml.groq_chat import call_groq, build_system_prompt
        question = request.data.get("message", "").strip()
        session_id = request.data.get("session_id")

        if not question:
            return Response({"detail": "message is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create session
        if session_id:
            session = ChatSession.objects.filter(pk=session_id, user=request.user).first()
        else:
            session = None

        if session is None:
            session = ChatSession.objects.create(user=request.user)

        # Build conversation history for multi-turn context
        recent_messages = session.messages.order_by("-timestamp")[:12]
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(list(recent_messages))
        ]

        # Save user message
        ChatMessage.objects.create(session=session, role="user", content=question)

        # ── Try Groq LLM first, fall back to keyword engine ──
        groq_response = None
        try:
            system_prompt = build_system_prompt()
            groq_response = call_groq(
                user_message=question,
                conversation_history=history,
                system_prompt=system_prompt,
            )
        except Exception:
            groq_response = None

        if groq_response:
            # Groq succeeded — also run keyword engine for chart data
            try:
                kw_result = process_query(question)
            except Exception:
                kw_result = {"intent": "general", "chart_type": None, "chart_data": None}

            assistant_msg = ChatMessage.objects.create(
                session=session,
                role="assistant",
                content=groq_response,
                intent=kw_result.get("intent", "general"),
                chart_data={
                    "type": kw_result["chart_type"],
                    "data": kw_result["chart_data"],
                } if kw_result.get("chart_type") else None,
            )
        else:
            # Fall back to keyword engine
            try:
                result = process_query(question)
            except Exception:
                result = {
                    "intent": "error",
                    "text_answer": "I couldn't process that query. Try asking about revenue, overdue invoices, fleet status, or maintenance.",
                    "chart_type": None,
                    "chart_data": None,
                }

            assistant_msg = ChatMessage.objects.create(
                session=session,
                role="assistant",
                content=result["text_answer"],
                intent=result.get("intent", ""),
                chart_data={
                    "type": result["chart_type"],
                    "data": result["chart_data"],
                } if result.get("chart_type") else None,
            )

        # Touch session so last_active (auto_now) is updated
        session.save(update_fields=["last_active"])

        return Response({
            "session_id": session.id,
            "message": ChatMessageSerializer(assistant_msg).data,
            "example_questions": EXAMPLE_QUESTIONS,
        })


class ChatHistoryView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if session_id:
            sessions = ChatSession.objects.filter(pk=session_id, user=request.user)
        else:
            sessions = ChatSession.objects.filter(user=request.user).order_by("-last_active")[:1]

        if not sessions.exists():
            return Response({"session_id": None, "messages": [], "example_questions": []})

        session = sessions.first()
        from ai_engine.ml.nl_analytics import EXAMPLE_QUESTIONS
        return Response({
            "session_id": session.id,
            "messages": ChatMessageSerializer(session.messages.all(), many=True).data,
            "example_questions": EXAMPLE_QUESTIONS,
        })


# ── Feature 9: Scenario Simulator ────────────────────────────────────────────

class ScenarioSimulatorView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.ml.scenario_simulator import run_simulation
        try:
            result = run_simulation(request.data)
        except Exception as e:
            return Response({"detail": f"Simulation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(result)


# ── Feature 10: Autonomous Workflow Triggers ──────────────────────────────────

class PortfolioScanView(APIView):
    """Manually trigger the autonomous AI portfolio scan."""
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from ai_engine.tasks import score_portfolio_and_trigger_workflows
        try:
            score_portfolio_and_trigger_workflows.delay()
        except Exception:
            # Run synchronously as fallback
            from ai_engine.tasks import _run_portfolio_scan
            result = _run_portfolio_scan()
            return Response(result)
        return Response({"detail": "Portfolio AI scan triggered. Approvals will be created shortly."})
