from __future__ import annotations

import hashlib
import hmac
import json
import time

from django.test import TestCase
from django.test.utils import override_settings

from apps.billing.stripe import verify_webhook


class StripeWebhookVerifyTests(TestCase):
    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
    def test_verify_webhook_accepts_valid_signature(self):
        payload = json.dumps({"type": "ping", "data": {"object": {"id": "x"}}}).encode("utf-8")
        ts = int(time.time())
        signed = f"{ts}.{payload.decode('utf-8')}".encode("utf-8")
        sig = hmac.new(b"whsec_test", signed, hashlib.sha256).hexdigest()
        header = f"t={ts},v1={sig}"

        event = verify_webhook(payload=payload, signature_header=header)
        self.assertEqual(event["type"], "ping")

