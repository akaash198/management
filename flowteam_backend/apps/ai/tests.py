from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APIClient

from apps.companies.models import Company, CompanyMember
from apps.ai.models import CompanyAIAccess, CompanyAICredits, AILog
from apps.ai.client import call_llm_engine, LLMAdapterFactory, OpenAIAdapter, AnthropicAdapter, GeminiAdapter

User = get_user_model()

class AIEngineAndBillingTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme Inc.", slug="acme")
        self.user = User.objects.create_user(email="test@acme.com", full_name="Acme User", password="password123")
        
        # Default AI Access & Credits setup
        self.ai_access = CompanyAIAccess.objects.create(
            company=self.company,
            integration_mode=CompanyAIAccess.MODE_PLATFORM
        )
        self.ai_credits = CompanyAICredits.objects.create(
            company=self.company,
            total_allocated=Decimal("50.00"),  # $0.50 worth of credits -> 50 credits
            credits_used=Decimal("0.00"),
            alert_threshold_percentage=80
        )

    def test_byok_api_key_encryption(self):
        """Test encryption and decryption of BYOK api keys using CompanyAIAccess methods."""
        raw_key = "sk-proj-testkey12345"
        self.ai_access.set_api_key(raw_key)
        self.ai_access.save()

        # Check that it's encrypted in the database
        self.assertNotEqual(self.ai_access.byok_api_key_encrypted, raw_key)
        self.assertTrue(len(self.ai_access.byok_api_key_encrypted) > 0)

        # Retrieve and decrypt
        decrypted_key = self.ai_access.get_api_key()
        self.assertEqual(decrypted_key, raw_key)

    def test_adapter_factory_platform(self):
        """Test LLMAdapterFactory resolves correct adapter for platform-managed mode."""
        with override_settings(GLOBAL_AI_PROVIDER="openai", OPENAI_API_KEY="platform-openai-key"):
            adapter = LLMAdapterFactory.get_adapter(self.ai_access, feature_name="daily_briefing")
            self.assertIsInstance(adapter, OpenAIAdapter)
            self.assertEqual(adapter.api_key, "platform-openai-key")
            self.assertEqual(adapter.default_model, "gpt-4o")

    def test_adapter_factory_byok(self):
        """Test LLMAdapterFactory resolves correct adapter for BYOK mode."""
        self.ai_access.integration_mode = CompanyAIAccess.MODE_BYOK
        self.ai_access.byok_provider = CompanyAIAccess.PROVIDER_GEMINI
        self.ai_access.set_api_key("gemini-byok-key")
        self.ai_access.byok_model_override = "gemini-1.5-flash"
        self.ai_access.save()

        adapter = LLMAdapterFactory.get_adapter(self.ai_access)
        self.assertIsInstance(adapter, GeminiAdapter)
        self.assertEqual(adapter.api_key, "gemini-byok-key")
        self.assertEqual(adapter.default_model, "gemini-1.5-flash")

    @patch("apps.ai.client.AnthropicAdapter.generate_text")
    def test_call_llm_engine_deducts_credits(self, mock_generate_text):
        """Test call_llm_engine successfully deducts credits and generates logs in platform mode."""
        mock_generate_text.return_value = {
            "content": "Here is your summary.",
            "prompt_tokens": 1000,
            "completion_tokens": 200,
            "model_used": "claude-3-5-sonnet-20241022"
        }

        with override_settings(GLOBAL_AI_PROVIDER="anthropic", ANTHROPIC_API_KEY="anthropic-key"):
            content = call_llm_engine(
                company=self.company,
                user=self.user,
                feature_name="daily_briefing",
                system="System instruction",
                user_prompt="Summarize my day"
            )

            self.assertEqual(content, "Here is your summary.")
            self.ai_credits.refresh_from_db()
            
            # Pricing for Claude 3.5 Sonnet: input: $3/1M, output: $15/1M
            # 1000 input tokens = $0.003 USD.
            # 200 output tokens = $0.003 USD.
            # Total USD = $0.006. At 100 credits per USD, credits deducted = 0.60 credits.
            self.assertEqual(self.ai_credits.credits_used, Decimal("0.60"))
            self.assertEqual(self.ai_credits.remaining_credits, Decimal("49.40"))
            
            # Check log creation
            logs = AILog.objects.filter(company=self.company)
            self.assertEqual(logs.count(), 1)
            log = logs.first()
            self.assertEqual(log.feature_name, "daily_briefing")
            self.assertEqual(log.status, AILog.STATUS_SUCCESS)
            self.assertEqual(log.credits_deducted, Decimal("0.60"))
            self.assertEqual(log.cost_usd, Decimal("0.006000"))

    @patch("apps.ai.client.AnthropicAdapter.generate_text")
    def test_call_llm_engine_insufficient_credits(self, mock_generate_text):
        """Test call_llm_engine raises ValueError when credits are empty/insufficient."""
        self.ai_credits.total_allocated = Decimal("10.00")
        self.ai_credits.credits_used = Decimal("10.00")
        self.ai_credits.save()

        with self.assertRaises(ValueError) as ctx:
            call_llm_engine(
                company=self.company,
                user=self.user,
                feature_name="daily_briefing",
                system="System instruction",
                user_prompt="Summarize my day"
            )
        self.assertIn("Insufficient credit balance", str(ctx.exception))
        self.assertEqual(AILog.objects.filter(company=self.company).count(), 0)

    @patch("apps.ai.client.AnthropicAdapter.generate_text")
    def test_call_llm_engine_byok_deducts_credits(self, mock_generate_text):
        """Test call_llm_engine in BYOK mode generates logs and deducts credits."""
        self.ai_access.integration_mode = CompanyAIAccess.MODE_BYOK
        self.ai_access.byok_provider = CompanyAIAccess.PROVIDER_ANTHROPIC
        self.ai_access.set_api_key("byok-key")
        self.ai_access.save()

        mock_generate_text.return_value = {
            "content": "BYOK response.",
            "prompt_tokens": 500,
            "completion_tokens": 100,
            "model_used": "claude-3-5-sonnet-20241022"
        }

        call_llm_engine(
            company=self.company,
            user=self.user,
            feature_name="daily_briefing",
            system="System instruction",
            user_prompt="Summarize my day"
        )

        self.ai_credits.refresh_from_db()
        self.assertEqual(self.ai_credits.credits_used, Decimal("0.30"))

        # Check logs
        log = AILog.objects.filter(company=self.company).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.integration_mode, CompanyAIAccess.MODE_BYOK)
        self.assertEqual(log.credits_deducted, Decimal("0.30"))

    @patch("apps.ai.client.AnthropicAdapter.generate_text")
    def test_call_llm_engine_alert_triggered(self, mock_generate_text):
        """Test credit warning alert is triggered once the threshold is crossed."""
        # Threshold: 80%. Total: 100.00. Warning when used >= 80.00 credits.
        self.ai_credits.total_allocated = Decimal("100.00")
        self.ai_credits.credits_used = Decimal("79.50")
        self.ai_credits.alert_triggered = False
        self.ai_credits.save()

        mock_generate_text.return_value = {
            "content": "Threshold test.",
            "prompt_tokens": 1000, # $0.003
            "completion_tokens": 200, # $0.003
            "model_used": "claude-3-5-sonnet-20241022"
        }

        with override_settings(GLOBAL_AI_PROVIDER="anthropic", ANTHROPIC_API_KEY="anthropic-key"):
            call_llm_engine(
                company=self.company,
                user=self.user,
                feature_name="daily_briefing",
                system="System instruction",
                user_prompt="Summarize my day"
            )

            self.ai_credits.refresh_from_db()
            # Used increases by 0.60 -> 80.10, crossing 80.00 (80%)
            self.assertEqual(self.ai_credits.credits_used, Decimal("80.10"))
            self.assertTrue(self.ai_credits.alert_triggered)

    def test_company_admin_can_update_budget_in_byok(self):
        """Test that a company CEO/Admin can set total_allocated when using BYOK mode."""
        self.ai_access.integration_mode = CompanyAIAccess.MODE_BYOK
        self.ai_access.save()

        # Create CEO membership
        CompanyMember.objects.create(
            company=self.company,
            user=self.user,
            role=CompanyMember.CEO
        )

        client = APIClient()
        client.force_authenticate(user=self.user)

        # CEO tries to patch the budget (total_allocated) to 8000.00
        url = f"/api/companies/{self.company.id}/ai-settings/"
        response = client.patch(url, {"total_allocated": 8000.00}, format="json")
        self.assertEqual(response.status_code, 200)

        self.ai_credits.refresh_from_db()
        self.assertEqual(self.ai_credits.total_allocated, Decimal("8000.00"))

    def test_company_admin_cannot_update_budget_in_platform_mode(self):
        """Test that a company CEO/Admin cannot set total_allocated when in Platform mode."""
        # integration_mode is platform_managed
        self.ai_access.integration_mode = CompanyAIAccess.MODE_PLATFORM
        self.ai_access.save()

        # Create CEO membership
        CompanyMember.objects.create(
            company=self.company,
            user=self.user,
            role=CompanyMember.CEO
        )

        client = APIClient()
        client.force_authenticate(user=self.user)

        # CEO tries to patch budget to 8000.00
        url = f"/api/companies/{self.company.id}/ai-settings/"
        response = client.patch(url, {"total_allocated": 8000.00}, format="json")
        self.assertEqual(response.status_code, 200)

        # Budget should remain unchanged because they are not superusers and it's Platform mode
        self.ai_credits.refresh_from_db()
        self.assertEqual(self.ai_credits.total_allocated, Decimal("50.00")) # unchanged

    @patch("apps.ai.client.GeminiAdapter.generate_text")
    def test_test_connection_using_saved_key(self, mock_generate_text):
        """Test that AITestConnectionView decrypts the saved key and calls adapter."""
        self.ai_access.integration_mode = CompanyAIAccess.MODE_BYOK
        self.ai_access.byok_provider = CompanyAIAccess.PROVIDER_GEMINI
        self.ai_access.set_api_key("gemini-secret-key-12345")
        self.ai_access.save()

        # Create CEO membership
        CompanyMember.objects.create(
            company=self.company,
            user=self.user,
            role=CompanyMember.CEO
        )

        mock_generate_text.return_value = {
            "content": "OK",
            "prompt_tokens": 1,
            "completion_tokens": 1,
            "model_used": "gemini-1.5-pro"
        }

        client = APIClient()
        client.force_authenticate(user=self.user)

        url = "/api/ai/test-connection/"
        response = client.post(url, {
            "provider": "gemini",
            "api_key": "use_saved_key"
        }, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["message"], "Connection test successful")
        self.assertEqual(response.data["data"]["result"], "OK")

        mock_generate_text.assert_called_once()
