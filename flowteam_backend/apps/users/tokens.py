from __future__ import annotations

from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        # Invalidate the token once the email is verified.
        verified_at = getattr(user, "email_verified_at", None)
        verified_part = verified_at.isoformat() if verified_at else ""
        return f"{user.pk}{user.password}{user.last_login}{timestamp}{verified_part}"


email_verification_token = EmailVerificationTokenGenerator()

