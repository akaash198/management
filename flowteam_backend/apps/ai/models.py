import uuid
import base64
import hashlib
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from apps.companies.models import Company

def get_fernet() -> Fernet:
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

class CompanyAIAccess(models.Model):
    MODE_PLATFORM = "platform_managed"
    MODE_BYOK = "byok"
    INTEGRATION_MODES = [
        (MODE_PLATFORM, "Platform-Managed Credits"),
        (MODE_BYOK, "Bring Your Own Key (BYOK)"),
    ]

    PROVIDER_OPENAI = "openai"
    PROVIDER_ANTHROPIC = "anthropic"
    PROVIDER_GEMINI = "gemini"
    PROVIDERS = [
        (PROVIDER_OPENAI, "OpenAI"),
        (PROVIDER_ANTHROPIC, "Anthropic"),
        (PROVIDER_GEMINI, "Google Gemini"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="ai_access")
    integration_mode = models.CharField(max_length=30, choices=INTEGRATION_MODES, default=MODE_PLATFORM)
    
    # BYOK Config
    byok_provider = models.CharField(max_length=30, choices=PROVIDERS, blank=True, null=True)
    byok_api_key_encrypted = models.TextField(blank=True, null=True)
    byok_model_override = models.CharField(max_length=50, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_api_key(self, raw_key: str):
        if not raw_key:
            self.byok_api_key_encrypted = None
            return
        f = get_fernet()
        self.byok_api_key_encrypted = f.encrypt(raw_key.encode()).decode()

    def get_api_key(self) -> str:
        if not self.byok_api_key_encrypted:
            return ""
        f = get_fernet()
        try:
            return f.decrypt(self.byok_api_key_encrypted.encode()).decode()
        except Exception:
            return ""

    class Meta:
        verbose_name = "Company AI Access"
        verbose_name_plural = "Company AI Accesses"

class CompanyAICredits(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="ai_credits")
    total_allocated = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    credits_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    alert_threshold_percentage = models.IntegerField(default=80)
    alert_triggered = models.BooleanField(default=False)
    
    last_replenished_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def remaining_credits(self):
        return max(self.total_allocated - self.credits_used, 0.00)

    class Meta:
        verbose_name = "Company AI Credits"
        verbose_name_plural = "Company AI Credits"

class AILog(models.Model):
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ai_logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    feature_name = models.CharField(max_length=50)
    integration_mode = models.CharField(max_length=20)
    provider = models.CharField(max_length=30)
    model_name = models.CharField(max_length=50)
    
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0.00)
    credits_deducted = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    latency_ms = models.IntegerField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    
    request_summary = models.TextField(blank=True, default="")
    response_preview = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Log"
        verbose_name_plural = "AI Logs"
