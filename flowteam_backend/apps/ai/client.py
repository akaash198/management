from __future__ import annotations

import time
import requests
import logging
from decimal import Decimal
from abc import ABC, abstractmethod
from typing import Any, Dict

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.companies.models import Company
from apps.ai.models import CompanyAIAccess, CompanyAICredits, AILog, DailyAIBudget

logger = logging.getLogger(__name__)

# ── Per-feature daily call caps (override per company via settings_json) ──────
DEFAULT_FEATURE_DAILY_CAPS: dict[str, int] = {
    "generate_tasks":       100,
    "daily_briefing":       50,
    "task_description":     200,
    "channel_summary":      50,
    "sprint_plan":          30,
    "project_health":       50,
    "retrospective":        20,
    "workload_balance":     30,
    "client_report":        20,
    "meeting_action_items": 50,
    "build_automation":     30,
    "focus_recommend":      50,
    "weekly_report":        20,
    "auto_label":           200,
    "task_summarize":       200,
}
DEFAULT_DAILY_COMPANY_CREDIT_CAP = Decimal("500.00")  # credits per day (configurable)


# ── LLM Adapters ─────────────────────────────────────────────────────────────

class BaseLLMAdapter(ABC):
    @abstractmethod
    def generate_text(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> Dict[str, Any]:
        pass


class OpenAIAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, default_model: str = "gpt-4o"):
        self.api_key = api_key
        self.default_model = default_model

    def generate_text(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.default_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
        }
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=30,
            )
            response.raise_for_status()
            res_data = response.json()
            return {
                "content": res_data["choices"][0]["message"]["content"],
                "prompt_tokens": res_data["usage"]["prompt_tokens"],
                "completion_tokens": res_data["usage"]["completion_tokens"],
                "model_used": self.default_model,
            }
        except Exception as e:
            raise RuntimeError(f"OpenAI error: {e}") from e


class AnthropicAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, default_model: str = "claude-sonnet-4-6"):
        self.api_key = api_key
        self.default_model = default_model

    def generate_text(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> Dict[str, Any]:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.default_model,
            "max_tokens": max_tokens,
            "system": [
                {"type": "text", "text": system_instruction, "cache_control": {"type": "ephemeral"}},
            ],
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers, json=payload, timeout=30,
            )
            response.raise_for_status()
            res_data = response.json()
            content_list = res_data.get("content") or []
            content_text = content_list[0].get("text", "") if content_list else ""
            return {
                "content": content_text,
                "prompt_tokens": res_data["usage"]["input_tokens"],
                "completion_tokens": res_data["usage"]["output_tokens"],
                "model_used": self.default_model,
            }
        except Exception as e:
            raise RuntimeError(f"Anthropic error: {e}") from e


class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, default_model: str = "gemini-1.5-pro"):
        self.api_key = api_key
        self.default_model = default_model

    def generate_text(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.default_model}:generateContent?key={self.api_key}"
        )
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            res_data = response.json()
            content_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            usage = res_data.get("usageMetadata", {})
            return {
                "content": content_text,
                "prompt_tokens": usage.get("promptTokenCount", 0),
                "completion_tokens": usage.get("candidatesTokenCount", 0),
                "model_used": self.default_model,
            }
        except Exception as e:
            raise RuntimeError(f"Gemini error: {e}") from e


# ── Factory ───────────────────────────────────────────────────────────────────

class LLMAdapterFactory:
    @staticmethod
    def get_adapter(company_access: CompanyAIAccess, feature_name: str | None = None) -> BaseLLMAdapter:
        if company_access.integration_mode == CompanyAIAccess.MODE_BYOK:
            provider = company_access.byok_provider
            api_key = company_access.get_api_key()
            model = company_access.byok_model_override or LLMAdapterFactory.get_default_model(provider)
        else:
            provider = getattr(settings, "GLOBAL_AI_PROVIDER", "anthropic")
            if provider == "openai":
                api_key = getattr(settings, "OPENAI_API_KEY", "")
            elif provider == "gemini":
                api_key = getattr(settings, "GEMINI_API_KEY", "")
            else:
                provider = "anthropic"
                api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
            model = LLMAdapterFactory.get_default_model(provider)

        if provider == "openai":
            return OpenAIAdapter(api_key=api_key, default_model=model)
        elif provider == "anthropic":
            return AnthropicAdapter(api_key=api_key, default_model=model)
        elif provider == "gemini":
            return GeminiAdapter(api_key=api_key, default_model=model)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    @staticmethod
    def get_default_model(provider: str) -> str:
        return {
            "openai": "gpt-4o",
            "anthropic": "claude-sonnet-4-6",
            "gemini": "gemini-1.5-pro",
        }.get(provider or "", "claude-sonnet-4-6")


# ── Pricing ───────────────────────────────────────────────────────────────────

PRICING_TABLE: dict[str, dict[str, Decimal]] = {
    "gpt-4o":                     {"input": Decimal("5.00"),   "output": Decimal("15.00")},
    "claude-3-5-sonnet-20241022": {"input": Decimal("3.00"),   "output": Decimal("15.00")},
    "claude-sonnet-4-6":          {"input": Decimal("3.00"),   "output": Decimal("15.00")},
    "gemini-1.5-pro":             {"input": Decimal("1.25"),   "output": Decimal("5.00")},
    "gemini-1.5-flash":           {"input": Decimal("0.075"),  "output": Decimal("0.30")},
}
CREDITS_PER_USD = Decimal("100.00")


# ── Budget helpers ─────────────────────────────────────────────────────────────

def _check_daily_budget(company: Company, feature_name: str) -> None:
    """Raises ValueError if the company has exceeded its daily call or credit cap."""
    today = timezone.now().date()
    ai_policy = (getattr(company, "settings_json", None) or {}).get("ai_policy", {})

    # Per-feature call cap
    cap = ai_policy.get(f"daily_cap_{feature_name}") or DEFAULT_FEATURE_DAILY_CAPS.get(feature_name, 500)
    budget, _ = DailyAIBudget.objects.get_or_create(
        company=company, date=today, feature=feature_name,
        defaults={"calls": 0, "credits_used": Decimal("0")},
    )
    if budget.calls >= cap:
        raise ValueError(
            f"Daily limit reached for '{feature_name}' ({cap} calls/day). "
            "Try again tomorrow or ask your admin to raise the limit."
        )

    # Company-wide daily credit cap
    daily_credit_cap = Decimal(str(ai_policy.get("daily_credit_cap", DEFAULT_DAILY_COMPANY_CREDIT_CAP)))
    total_today = (
        DailyAIBudget.objects.filter(company=company, date=today)
        .aggregate(total=__import__("django.db.models", fromlist=["Sum"]).Sum("credits_used"))["total"]
        or Decimal("0")
    )
    if total_today >= daily_credit_cap:
        raise ValueError(
            f"Daily AI credit cap ({daily_credit_cap} credits) reached. "
            "Contact your admin to increase the daily budget."
        )


def _increment_daily_budget(company: Company, feature_name: str, credits: Decimal) -> None:
    today = timezone.now().date()
    DailyAIBudget.objects.filter(company=company, date=today, feature=feature_name).update(
        calls=__import__("django.db.models", fromlist=["F"]).F("calls") + 1,
        credits_used=__import__("django.db.models", fromlist=["F"]).F("credits_used") + credits,
    )


# ── Main engine ───────────────────────────────────────────────────────────────

def call_llm_engine(
    company: Company,
    user: Any,
    feature_name: str,
    system: str,
    user_prompt: str,
    max_tokens: int = 1024,
    triggered_by: str = AILog.TRIGGER_USER,
) -> str:
    from .utils import (
        classify_input, scrub_sensitive_data, validate_output,
        SAFETY_SUFFIX,
    )

    # 1. Input guardrails
    combined_input = f"{system}\n{user_prompt}"
    classification = classify_input(combined_input)
    if classification.blocked:
        _log_blocked(company, user, feature_name, classification.reason, triggered_by)
        if classification.reason == "input_too_large":
            raise ValueError("Input is too large. Please shorten your request.")
        raise ValueError("Request blocked by content safety policy.")

    # 2. Scrub PII/secrets from both prompts
    system = scrub_sensitive_data(system) + SAFETY_SUFFIX
    user_prompt = scrub_sensitive_data(user_prompt)

    # 3. Resolve AI access + credit check
    ai_access, _ = CompanyAIAccess.objects.get_or_create(
        company=company, defaults={"integration_mode": CompanyAIAccess.MODE_PLATFORM}
    )
    credits_status, _ = CompanyAICredits.objects.get_or_create(
        company=company, defaults={"total_allocated": Decimal("5000.00"), "credits_used": Decimal("0.00")}
    )
    if credits_status.remaining_credits <= Decimal("0.00"):
        raise ValueError("Insufficient credit balance. Contact your administrator.")

    # 4. Daily budget check
    _check_daily_budget(company, feature_name)

    # 5. Call LLM
    adapter = LLMAdapterFactory.get_adapter(ai_access, feature_name)
    start_time = time.time()
    status = AILog.STATUS_SUCCESS
    error_msg = None
    prompt_tokens = completion_tokens = 0
    content = ""
    output_warnings: list[str] = []
    model_used = getattr(adapter, "default_model", "unknown")

    try:
        res = adapter.generate_text(user_prompt, system_instruction=system, max_tokens=max_tokens)
        content = res["content"]
        prompt_tokens = res["prompt_tokens"]
        completion_tokens = res["completion_tokens"]
        model_used = res["model_used"]

        # 6. Output validation
        validated = validate_output(content)
        content = validated.text
        output_warnings = validated.warnings

    except Exception as exc:
        status = AILog.STATUS_FAILED
        error_msg = str(exc)
        raise
    finally:
        latency = int((time.time() - start_time) * 1000)
        cost_usd = Decimal("0.00")
        credits_deducted = Decimal("0.00")

        if status == AILog.STATUS_SUCCESS:
            pricing = PRICING_TABLE.get(model_used, {"input": Decimal("3.00"), "output": Decimal("15.00")})
            cost_usd = (
                (Decimal(prompt_tokens) / Decimal("1_000_000")) * pricing["input"]
                + (Decimal(completion_tokens) / Decimal("1_000_000")) * pricing["output"]
            )
            credits_deducted = cost_usd * CREDITS_PER_USD

            with transaction.atomic():
                cs = CompanyAICredits.objects.select_for_update().get(company=company)
                cs.credits_used += credits_deducted
                if cs.total_allocated > 0:
                    pct_used = (cs.credits_used / cs.total_allocated) * 100
                    if pct_used >= cs.alert_threshold_percentage and not cs.alert_triggered:
                        cs.alert_triggered = True
                cs.save()

            _increment_daily_budget(company, feature_name, credits_deducted)

        provider_name = (
            ai_access.byok_provider
            if ai_access.integration_mode == CompanyAIAccess.MODE_BYOK
            else getattr(settings, "GLOBAL_AI_PROVIDER", "anthropic")
        )

        try:
            AILog.objects.create(
                company=company,
                user=user if (user and getattr(user, "is_authenticated", False)) else None,
                feature_name=feature_name,
                integration_mode=ai_access.integration_mode,
                provider=provider_name or "anthropic",
                model_name=model_used,
                model_version=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=cost_usd,
                credits_deducted=credits_deducted,
                latency_ms=latency,
                status=status,
                error_message=error_msg,
                output_warnings=output_warnings,
                triggered_by=triggered_by,
                request_summary=user_prompt[:500],
                response_preview=content[:1000],
            )
        except Exception:
            logger.exception("Failed to write AILog for feature=%s", feature_name)

    return content


def _log_blocked(company: Company, user: Any, feature_name: str, reason: str, triggered_by: str) -> None:
    """Record a blocked request in AILog without calling the LLM."""
    try:
        ai_access, _ = CompanyAIAccess.objects.get_or_create(
            company=company, defaults={"integration_mode": CompanyAIAccess.MODE_PLATFORM}
        )
        AILog.objects.create(
            company=company,
            user=user if (user and getattr(user, "is_authenticated", False)) else None,
            feature_name=feature_name,
            integration_mode=ai_access.integration_mode,
            provider="",
            model_name="",
            latency_ms=0,
            status=AILog.STATUS_BLOCKED,
            block_reason=reason,
            triggered_by=triggered_by,
        )
    except Exception:
        logger.exception("Failed to write blocked AILog")


# ── Legacy wrapper (kept for backward compat) ─────────────────────────────────

def call_claude(system: str, user_text: str, max_tokens: int = 1024) -> str:
    company = Company.objects.first()
    from apps.users.models import User as _User
    admin_user = _User.objects.filter(is_superuser=True).first()
    return call_llm_engine(company, admin_user, "deprecated_direct_call", system, user_text, max_tokens)
