from __future__ import annotations

from django.conf import settings
import requests


def call_claude(system: str, user: str, max_tokens: int = 1024) -> str:
    api_key = (getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()
    if not api_key:
        return ""

    try:
        import anthropic
    except Exception:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": "claude-sonnet-4-6",
            "max_tokens": max_tokens,
            "system": [
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}},
            ],
            "messages": [{"role": "user", "content": user}],
        }
        try:
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            content = data.get("content") or []
            return (content[0] or {}).get("text", "") if content else ""
        except Exception:
            return ""

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=[
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user}],
    )
    if not response.content:
        return ""
    first = response.content[0]
    return getattr(first, "text", "") or ""
