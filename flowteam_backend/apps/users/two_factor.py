from __future__ import annotations

import secrets
from dataclasses import dataclass

try:
    import pyotp
except Exception:  # pragma: no cover
    pyotp = None
from django.contrib.auth.hashers import make_password, check_password


def generate_totp_secret() -> str:
    if pyotp is None:
        raise RuntimeError("pyotp is not installed")
    return pyotp.random_base32()


def build_otpauth_uri(*, secret: str, email: str, issuer: str = "FlowTeam") -> str:
    if pyotp is None:
        raise RuntimeError("pyotp is not installed")
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(*, secret: str, code: str) -> bool:
    if pyotp is None:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(code, valid_window=1))
    except Exception:
        return False


def _format_backup_code(raw: str) -> str:
    raw = raw.strip().replace("-", "").upper()
    return f"{raw[:4]}-{raw[4:8]}"


def generate_backup_codes(count: int = 10) -> list[str]:
    codes: list[str] = []
    for _ in range(max(1, min(20, int(count)))):
        raw = secrets.token_hex(4).upper()  # 8 chars
        codes.append(_format_backup_code(raw))
    return codes


def hash_backup_codes(codes: list[str]) -> list[str]:
    return [make_password(c) for c in codes]


@dataclass
class BackupCodeCheckResult:
    ok: bool
    remaining_hashed_codes: list[str]


def consume_backup_code(hashed_codes: list[str], provided: str) -> BackupCodeCheckResult:
    provided_norm = _format_backup_code(provided or "")
    remaining: list[str] = []
    used = False

    for h in hashed_codes or []:
        if not used and check_password(provided_norm, h):
            used = True
            continue
        remaining.append(h)

    return BackupCodeCheckResult(ok=used, remaining_hashed_codes=remaining)
