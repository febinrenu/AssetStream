import json
import logging

import requests
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def deliver_webhook_event(self, subscription_id: int, event_type: str, payload: dict):
    """Deliver a webhook event to a single subscription with retry logic."""
    from .models import WebhookDelivery, WebhookSubscription

    try:
        sub = WebhookSubscription.objects.get(pk=subscription_id, active=True)
    except WebhookSubscription.DoesNotExist:
        return

    delivery = WebhookDelivery.objects.create(
        subscription=sub,
        event_type=event_type,
        payload=payload,
        status="pending",
        attempt_count=1,
    )

    body_bytes = json.dumps({
        "event": event_type,
        "data": payload,
        "timestamp": timezone.now().isoformat(),
    }).encode()

    headers = {
        "Content-Type": "application/json",
        "X-AssetStream-Event": event_type,
        "X-AssetStream-Signature": (
            f"sha256={sub.sign_payload(body_bytes)}" if sub.secret else ""
        ),
    }

    try:
        resp = requests.post(sub.url, data=body_bytes, headers=headers, timeout=10)
        delivery.response_code = resp.status_code
        delivery.response_body = resp.text[:500]
        delivery.status = "delivered" if resp.ok else "failed"
        delivery.delivered_at = timezone.now()
        delivery.save(update_fields=["response_code", "response_body", "status", "delivered_at"])

        sub.last_triggered_at = timezone.now()
        if not resp.ok:
            sub.failure_count += 1
        else:
            sub.failure_count = 0
        sub.save(update_fields=["last_triggered_at", "failure_count"])

        if not resp.ok:
            raise self.retry(exc=Exception(f"HTTP {resp.status_code}"))

    except requests.RequestException as exc:
        delivery.status = "failed"
        delivery.response_body = str(exc)[:500]
        delivery.save(update_fields=["status", "response_body"])
        raise self.retry(exc=exc)


@shared_task
def send_communication(user_id: int, channel: str, subject: str, body: str):
    """
    Unified communication dispatcher.
    Email: uses Django's send_mail.
    SMS/WhatsApp: stubbed — plug in Twilio credentials in .env to activate.
    """
    from django.contrib.auth import get_user_model
    from .models import CommunicationLog

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return

    log = CommunicationLog.objects.create(
        user=user,
        channel=channel,
        subject=subject,
        body=body,
        status="pending",
    )

    try:
        if channel == "email":
            if not user.email:
                log.status = "failed"
                log.error_message = "No email address"
                log.save(update_fields=["status", "error_message"])
                return
            from django.core.mail import send_mail
            send_mail(subject, body, "noreply@assetstream.io", [user.email], fail_silently=False)

        elif channel in ("sms", "whatsapp"):
            # Twilio integration point — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
            # TWILIO_FROM_NUMBER in .env to activate.
            import os
            account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
            auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
            from_number = os.environ.get("TWILIO_FROM_NUMBER")

            if not all([account_sid, auth_token, from_number]):
                logger.info("Twilio not configured; skipping %s to user %s", channel, user.id)
                log.status = "failed"
                log.error_message = "Twilio not configured"
                log.save(update_fields=["status", "error_message"])
                return

            from twilio.rest import Client  # type: ignore[import]
            client = Client(account_sid, auth_token)
            to_number = getattr(user, "phone_number", None) or ""
            if not to_number:
                log.status = "failed"
                log.error_message = "No phone number"
                log.save(update_fields=["status", "error_message"])
                return
            msg_from = f"whatsapp:{from_number}" if channel == "whatsapp" else from_number
            msg_to = f"whatsapp:{to_number}" if channel == "whatsapp" else to_number
            client.messages.create(body=body, from_=msg_from, to=msg_to)

        log.status = "sent"
        log.save(update_fields=["status"])

    except Exception as exc:
        log.status = "failed"
        log.error_message = str(exc)[:500]
        log.save(update_fields=["status", "error_message"])
        logger.exception("Failed to send %s to user %s: %s", channel, user_id, exc)
