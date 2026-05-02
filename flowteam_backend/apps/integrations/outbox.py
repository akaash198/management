from __future__ import annotations

from datetime import timedelta
from django.utils import timezone


def compute_next_attempt(attempts: int):
    # Exponential-ish backoff: 10s, 20s, 40s, ... up to 1h
    delay = min(3600, int(10 * (2 ** max(0, int(attempts)))))
    return timezone.now() + timedelta(seconds=delay)

