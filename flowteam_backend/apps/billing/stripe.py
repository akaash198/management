from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass

import requests
from django.conf import settings


@dataclass(frozen=True)
class StripeConfig:
    secret_key: str
    webhook_secret: str
    pro_price_id: str
    ai_price_id: str
    frontend_base_url: str


def get_stripe_config() -> StripeConfig:
    return StripeConfig(
        secret_key=(getattr(settings, "STRIPE_SECRET_KEY", "") or "").strip(),
        webhook_secret=(getattr(settings, "STRIPE_WEBHOOK_SECRET", "") or "").strip(),
        pro_price_id=(getattr(settings, "STRIPE_PRICE_ID_PRO", "") or "").strip(),
        ai_price_id=(getattr(settings, "STRIPE_PRICE_ID_AI", "") or "").strip(),
        frontend_base_url=(getattr(settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/"),
    )


def _stripe_headers(secret_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/x-www-form-urlencoded"}


def get_plan_price_id(plan: str) -> str:
    cfg = get_stripe_config()
    if plan == "ai":
        return cfg.ai_price_id
    return cfg.pro_price_id


def get_plan_from_price_id(price_id: str) -> str:
    cfg = get_stripe_config()
    if price_id and price_id == cfg.ai_price_id:
        return "ai"
    if price_id and price_id == cfg.pro_price_id:
        return "pro"
    return "free"


def create_checkout_session(*, team_id: str, customer_email: str, success_url: str, cancel_url: str, plan: str = "pro") -> dict:
    cfg = get_stripe_config()
    price_id = get_plan_price_id(plan)
    if not cfg.secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not configured")
    if not price_id:
        raise ValueError(f"Stripe price id is not configured for {plan}")

    # Stripe expects URL-encoded form. Keep it minimal.
    data = {
        "mode": "subscription",
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "customer_email": customer_email,
        "metadata[team_id]": team_id,
        "metadata[plan]": plan,
    }
    resp = requests.post("https://api.stripe.com/v1/checkout/sessions", headers=_stripe_headers(cfg.secret_key), data=data, timeout=15)
    resp.raise_for_status()
    return resp.json()


def verify_webhook(*, payload: bytes, signature_header: str) -> dict:
    """
    Minimal Stripe webhook verification (HMAC SHA256) compatible with Stripe-Signature.
    """
    cfg = get_stripe_config()
    if not cfg.webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
    if not signature_header:
        raise ValueError("Missing Stripe-Signature header")

    parts = {}
    for item in signature_header.split(","):
        if "=" in item:
            k, v = item.split("=", 1)
            parts[k.strip()] = v.strip()

    timestamp = int(parts.get("t") or "0")
    sig = parts.get("v1") or ""
    if not timestamp or not sig:
        raise ValueError("Invalid Stripe-Signature header")

    # 5-minute tolerance
    if abs(int(time.time()) - timestamp) > 300:
        raise ValueError("Webhook timestamp outside tolerance")

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(cfg.webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("Webhook signature mismatch")

    return json.loads(payload.decode("utf-8"))
