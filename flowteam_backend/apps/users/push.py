from __future__ import annotations

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_web_push(user, title: str, body: str, url: str = "/dashboard") -> int:
    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
    claims_sub = getattr(settings, "VAPID_CLAIMS_SUB", "")
    if not private_key:
        return 0

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush is not installed; skipping web push")
        return 0

    from .models import PushSubscription

    payload = json.dumps({"title": title, "body": body, "url": url})
    delivered = 0
    stale_ids = []

    for sub in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": claims_sub},
            )
            delivered += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in (404, 410):
                stale_ids.append(sub.id)
            else:
                logger.warning("Web push failed for subscription %s: %s", sub.id, exc)
        except Exception:
            logger.exception("Unexpected web push error for subscription %s", sub.id)

    if stale_ids:
        PushSubscription.objects.filter(id__in=stale_ids).delete()

    return delivered
