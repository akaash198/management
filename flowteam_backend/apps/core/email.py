from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailSendResult:
    ok: bool
    provider: str
    message_id: str | None = None
    error: str | None = None


def send_transactional_email(*, to_email: str, subject: str, text: str) -> EmailSendResult:
    """
    Sends a single transactional email via the configured provider.

    Providers:
    - django (default): uses Django's configured EMAIL_BACKEND.
    - resend: uses Resend HTTP API.
    - sendgrid: uses SendGrid HTTP API.
    """
    provider = (getattr(settings, "EMAIL_PROVIDER", "") or "django").strip().lower()

    if provider == "django":
        try:
            send_mail(
                subject=subject,
                message=text,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[to_email],
                fail_silently=False,
            )
            return EmailSendResult(ok=True, provider="django")
        except Exception as e:
            logger.exception("Django email backend failed")
            return EmailSendResult(ok=False, provider="django", error=str(e))

    if provider == "resend":
        api_key = (getattr(settings, "RESEND_API_KEY", "") or "").strip()
        from_email = (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
        if not api_key:
            return EmailSendResult(ok=False, provider="resend", error="RESEND_API_KEY is not configured")
        if not from_email:
            return EmailSendResult(ok=False, provider="resend", error="DEFAULT_FROM_EMAIL is not configured")

        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                data=json.dumps({"from": from_email, "to": [to_email], "subject": subject, "text": text}),
                timeout=10,
            )
            if resp.status_code >= 400:
                return EmailSendResult(ok=False, provider="resend", error=f"HTTP {resp.status_code}: {resp.text[:500]}")
            payload = resp.json() if resp.content else {}
            return EmailSendResult(ok=True, provider="resend", message_id=payload.get("id"))
        except Exception as e:
            logger.exception("Resend email failed")
            return EmailSendResult(ok=False, provider="resend", error=str(e))

    if provider == "sendgrid":
        api_key = (getattr(settings, "SENDGRID_API_KEY", "") or "").strip()
        from_email = (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
        if not api_key:
            return EmailSendResult(ok=False, provider="sendgrid", error="SENDGRID_API_KEY is not configured")
        if not from_email:
            return EmailSendResult(ok=False, provider="sendgrid", error="DEFAULT_FROM_EMAIL is not configured")

        try:
            resp = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                data=json.dumps(
                    {
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": from_email},
                        "subject": subject,
                        "content": [{"type": "text/plain", "value": text}],
                    }
                ),
                timeout=10,
            )
            if resp.status_code >= 400:
                return EmailSendResult(ok=False, provider="sendgrid", error=f"HTTP {resp.status_code}: {resp.text[:500]}")
            return EmailSendResult(ok=True, provider="sendgrid", message_id=resp.headers.get("X-Message-Id"))
        except Exception as e:
            logger.exception("SendGrid email failed")
            return EmailSendResult(ok=False, provider="sendgrid", error=str(e))

    return EmailSendResult(ok=False, provider=provider, error=f"Unknown EMAIL_PROVIDER '{provider}'")

