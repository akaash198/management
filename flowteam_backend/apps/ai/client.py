from __future__ import annotations

import time
import requests
import json
from decimal import Decimal
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.conf import settings
from django.db import transaction
from apps.companies.models import Company
from apps.ai.models import CompanyAIAccess, CompanyAICredits, AILog

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
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens
        }
        try:
            response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            res_data = response.json()
            return {
                "content": res_data["choices"][0]["message"]["content"],
                "prompt_tokens": res_data["usage"]["prompt_tokens"],
                "completion_tokens": res_data["usage"]["completion_tokens"],
                "model_used": self.default_model
            }
        except Exception as e:
            raise RuntimeError(f"OpenAI error: {str(e)}")

class AnthropicAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, default_model: str = "claude-3-5-sonnet-20241022"):
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
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            res_data = response.json()
            content_list = res_data.get("content") or []
            content_text = content_list[0].get("text", "") if content_list else ""
            return {
                "content": content_text,
                "prompt_tokens": res_data["usage"]["input_tokens"],
                "completion_tokens": res_data["usage"]["output_tokens"],
                "model_used": self.default_model
            }
        except Exception as e:
            raise RuntimeError(f"Anthropic error: {str(e)}")

class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str, default_model: str = "gemini-1.5-pro"):
        self.api_key = api_key
        self.default_model = default_model

    def generate_text(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
        }
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": max_tokens
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.default_model}:generateContent?key={self.api_key}"
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            res_data = response.json()
            content_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            usage = res_data.get("usageMetadata", {})
            return {
                "content": content_text,
                "prompt_tokens": usage.get("promptTokenCount", 0),
                "completion_tokens": usage.get("candidatesTokenCount", 0),
                "model_used": self.default_model
            }
        except Exception as e:
            raise RuntimeError(f"Gemini error: {str(e)}")

class LLMAdapterFactory:
    @staticmethod
    def get_adapter(company_access: CompanyAIAccess, feature_name: str = None) -> BaseLLMAdapter:
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
                
            model = LLMAdapterFactory.get_feature_specific_model(feature_name, provider)

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
        defaults = {
            "openai": "gpt-4o",
            "anthropic": "claude-3-5-sonnet-20241022",
            "gemini": "gemini-1.5-pro",
        }
        return defaults.get(provider, "claude-3-5-sonnet-20241022")

    @staticmethod
    def get_feature_specific_model(feature_name: str, provider: str) -> str:
        return LLMAdapterFactory.get_default_model(provider)

PRICING_TABLE = {
    "gpt-4o": {"input": Decimal("5.00"), "output": Decimal("15.00")},
    "claude-3-5-sonnet-20241022": {"input": Decimal("3.00"), "output": Decimal("15.00")},
    "gemini-1.5-pro": {"input": Decimal("1.25"), "output": Decimal("5.00")},
    "gemini-1.5-flash": {"input": Decimal("0.075"), "output": Decimal("0.30")},
}
CREDITS_PER_USD = Decimal("100.00")

def call_llm_engine(company: Company, user: Any, feature_name: str, system: str, user_prompt: str, max_tokens: int = 1024) -> str:
    from .utils import scrub_sensitive_data
    system = scrub_sensitive_data(system)
    user_prompt = scrub_sensitive_data(user_prompt)

    ai_access, _ = CompanyAIAccess.objects.get_or_create(
        company=company,
        defaults={"integration_mode": CompanyAIAccess.MODE_PLATFORM}
    )

    is_byok = ai_access.integration_mode == CompanyAIAccess.MODE_BYOK
    
    credits_status, _ = CompanyAICredits.objects.get_or_create(
        company=company,
        defaults={"total_allocated": Decimal("5000.00"), "credits_used": Decimal("0.00")}
    )
    if credits_status.remaining_credits <= Decimal("0.00"):
        if is_byok:
            raise ValueError("Insufficient AI budget. Please increase your budget in settings.")
        else:
            raise ValueError("Insufficient credit balance. Please contact your administrator to purchase credits.")

    adapter = LLMAdapterFactory.get_adapter(ai_access, feature_name)
    
    start_time = time.time()
    status = AILog.STATUS_SUCCESS
    error_msg = None
    prompt_tokens = 0
    completion_tokens = 0
    content = ""
    model_used = getattr(adapter, "default_model", "unknown")

    try:
        res = adapter.generate_text(user_prompt, system_instruction=system, max_tokens=max_tokens)
        content = res["content"]
        prompt_tokens = res["prompt_tokens"]
        completion_tokens = res["completion_tokens"]
        model_used = res["model_used"]
    except Exception as e:
        status = AILog.STATUS_FAILED
        error_msg = str(e)
        raise e
    finally:
        latency = int((time.time() - start_time) * 1000)
        cost_usd = Decimal("0.00")
        credits_deducted = Decimal("0.00")
        
        if status == AILog.STATUS_SUCCESS:
            pricing = PRICING_TABLE.get(model_used, {"input": Decimal("3.00"), "output": Decimal("15.00")})
            cost_in = (Decimal(prompt_tokens) / Decimal("1000000")) * pricing["input"]
            cost_out = (Decimal(completion_tokens) / Decimal("1000000")) * pricing["output"]
            cost_usd = cost_in + cost_out
            credits_deducted = cost_usd * CREDITS_PER_USD
            with transaction.atomic():
                credits_status = CompanyAICredits.objects.select_for_update().get(company=company)
                credits_status.credits_used += credits_deducted
                credits_status.save()

                percentage_used = (credits_status.credits_used / credits_status.total_allocated) * 100
                if percentage_used >= credits_status.alert_threshold_percentage and not credits_status.alert_triggered:
                    credits_status.alert_triggered = True
                    credits_status.save()
        
        try:
            AILog.objects.create(
                company=company,
                user=user if user and user.is_authenticated else None,
                feature_name=feature_name,
                integration_mode=ai_access.integration_mode,
                provider=getattr(ai_access, "byok_provider", "") or getattr(settings, "GLOBAL_AI_PROVIDER", "anthropic"),
                model_name=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=cost_usd,
                credits_deducted=credits_deducted,
                latency_ms=latency,
                status=status,
                error_message=error_msg,
                request_summary=user_prompt[:500],
                response_preview=content[:1000]
            )
        except Exception:
            pass

    return content

def call_claude(system: str, user: str, max_tokens: int = 1024) -> str:
    company = Company.objects.first()
    from apps.users.models import User
    admin_user = User.objects.filter(is_superuser=True).first()
    return call_llm_engine(company, admin_user, "deprecated_direct_call", system, user, max_tokens)
