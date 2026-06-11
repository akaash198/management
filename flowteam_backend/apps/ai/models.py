import uuid
import base64
import hashlib
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from apps.companies.models import Company

def get_fernet() -> Fernet:
    # Use a dedicated encryption key for BYOK API key storage — decoupled from
    # SECRET_KEY so that rotating one does not invalidate the other.
    raw = getattr(settings, "AI_ENCRYPTION_KEY", None) or settings.SECRET_KEY
    key_bytes = hashlib.sha256(raw.encode()).digest()
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
    STATUS_BLOCKED = "blocked"
    STATUS_CHOICES = [
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
        (STATUS_BLOCKED, "Blocked by guardrails"),
    ]

    TRIGGER_USER = "user_action"
    TRIGGER_AUTOMATION = "automation"
    TRIGGER_SCHEDULED = "scheduled"
    TRIGGER_CHOICES = [
        (TRIGGER_USER, "User action"),
        (TRIGGER_AUTOMATION, "Automation rule"),
        (TRIGGER_SCHEDULED, "Scheduled task"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ai_logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    feature_name = models.CharField(max_length=60)
    integration_mode = models.CharField(max_length=20)
    provider = models.CharField(max_length=30)
    model_name = models.CharField(max_length=80)
    model_version = models.CharField(max_length=80, blank=True, default="")

    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)

    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0.00)
    credits_deducted = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    latency_ms = models.IntegerField(default=0)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    output_warnings = models.JSONField(default=list, blank=True)  # e.g. ["output_truncated", "ssn_redacted"]
    block_reason = models.CharField(max_length=60, blank=True, default="")  # "prompt_injection" | "input_too_large" | "budget_exceeded"

    triggered_by = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default=TRIGGER_USER)
    output_acted_on = models.BooleanField(null=True, blank=True)

    # User feedback
    feedback_rating = models.SmallIntegerField(null=True, blank=True)   # 1–5 (thumbs: 1=bad, 5=great)
    feedback_text = models.TextField(blank=True, default="")

    request_summary = models.TextField(blank=True, default="")
    response_preview = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Log"
        verbose_name_plural = "AI Logs"
        indexes = [
            models.Index(fields=["company", "feature_name", "created_at"], name="ailog_co_feat_time_idx"),
            models.Index(fields=["company", "status", "created_at"], name="ailog_co_status_time_idx"),
        ]


class AIFeaturePolicy(models.Model):
    """
    Per-company feature-level AI policy.
    Controls which features are enabled, which model tier to use,
    and whether human confirmation is required before applying output.
    One row per company — created on first access, defaults to all enabled.
    """
    TIER_FAST = "fast"       # Gemini Flash, haiku — cheap, low latency
    TIER_STANDARD = "standard"   # Claude Sonnet, GPT-4o-mini
    TIER_PREMIUM = "premium"     # Claude Opus, GPT-4o — complex reasoning

    TIER_CHOICES = [
        (TIER_FAST, "Fast (cheap, low latency)"),
        (TIER_STANDARD, "Standard"),
        (TIER_PREMIUM, "Premium (complex reasoning)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="ai_feature_policy")

    # Global kill-switch — overrides all feature flags
    ai_globally_enabled = models.BooleanField(default=True)

    # Individual contributor features
    feat_daily_briefing = models.BooleanField(default=True)
    feat_focus_recommend = models.BooleanField(default=True)
    feat_task_description = models.BooleanField(default=True)
    feat_task_summarize = models.BooleanField(default=True)
    feat_auto_label = models.BooleanField(default=True)
    feat_thread_reply_draft = models.BooleanField(default=True)

    # Manager features
    feat_sprint_plan = models.BooleanField(default=True)
    feat_workload_balance = models.BooleanField(default=True)
    feat_retrospective = models.BooleanField(default=True)
    feat_project_health = models.BooleanField(default=True)
    feat_blocker_detect = models.BooleanField(default=True)
    feat_escalation_scan = models.BooleanField(default=True)
    feat_weekly_report = models.BooleanField(default=True)
    feat_channel_summary = models.BooleanField(default=True)
    feat_meeting_action_items = models.BooleanField(default=True)
    feat_client_report = models.BooleanField(default=True)
    feat_build_automation = models.BooleanField(default=True)

    # Leadership / admin features
    feat_portfolio_summary = models.BooleanField(default=True)
    feat_generate_tasks = models.BooleanField(default=True)

    # DS / AI team features
    feat_experiment_summary = models.BooleanField(default=True)

    # Model tier routing (null = use company-level default)
    tier_individual = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_STANDARD)
    tier_manager = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_STANDARD)
    tier_leadership = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_PREMIUM)
    tier_ds = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_STANDARD)

    # Human-in-the-loop: require confirmation before applying output
    require_confirm_task_create = models.BooleanField(default=True)
    require_confirm_bulk_label = models.BooleanField(default=True)
    require_confirm_client_report = models.BooleanField(default=True)

    # Data sources — restrict what content AI may access
    allow_message_content = models.BooleanField(default=True)
    allow_document_content = models.BooleanField(default=False)
    allow_meeting_transcripts = models.BooleanField(default=True)

    # Retention — how long prompt/response previews are kept in AILog
    log_retention_days = models.PositiveIntegerField(default=90)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Map feature_name (used in call_llm_engine) -> policy field name
    FEATURE_FLAG_MAP: dict[str, str] = {
        "daily_briefing":       "feat_daily_briefing",
        "focus_recommend":      "feat_focus_recommend",
        "task_description":     "feat_task_description",
        "task_summarize":       "feat_task_summarize",
        "auto_label":           "feat_auto_label",
        "thread_reply_draft":   "feat_thread_reply_draft",
        "sprint_plan":          "feat_sprint_plan",
        "workload_balance":     "feat_workload_balance",
        "retrospective":        "feat_retrospective",
        "project_health_score": "feat_project_health",
        "blocker_detect":       "feat_blocker_detect",
        "escalation_scan":      "feat_escalation_scan",
        "weekly_report":        "feat_weekly_report",
        "channel_summary":      "feat_channel_summary",
        "meeting_action_items": "feat_meeting_action_items",
        "client_report":        "feat_client_report",
        "build_automation":     "feat_build_automation",
        "portfolio_summary":    "feat_portfolio_summary",
        "generate_tasks":       "feat_generate_tasks",
        "experiment_summary":   "feat_experiment_summary",
    }

    def is_feature_enabled(self, feature_name: str) -> bool:
        if not self.ai_globally_enabled:
            return False
        field = self.FEATURE_FLAG_MAP.get(feature_name)
        if field is None:
            return True  # unknown features default to allowed
        return bool(getattr(self, field, True))

    class Meta:
        verbose_name = "AI Feature Policy"


class DailyAIBudget(models.Model):
    """
    Tracks per-company per-feature AI usage per day.
    Enforced in call_llm_engine() to prevent a single company or user from
    draining the credit pool in a short burst.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="daily_ai_budgets")
    date = models.DateField()
    feature = models.CharField(max_length=60)
    calls = models.PositiveIntegerField(default=0)
    credits_used = models.DecimalField(max_digits=12, decimal_places=4, default=0)

    class Meta:
        unique_together = ("company", "date", "feature")
        indexes = [
            models.Index(fields=["company", "date"], name="dailyaibudget_co_date_idx"),
        ]

    def __str__(self):
        return f"{self.company_id} / {self.feature} / {self.date}"
