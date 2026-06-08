"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, BarChart3, Check, ChevronDown, ChevronUp,
  Loader2, Save, Shield, Sparkles, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIFeaturePolicy {
  ai_globally_enabled: boolean;
  // individual
  feat_daily_briefing: boolean;
  feat_focus_recommend: boolean;
  feat_task_description: boolean;
  feat_task_summarize: boolean;
  feat_auto_label: boolean;
  feat_thread_reply_draft: boolean;
  // manager
  feat_sprint_plan: boolean;
  feat_workload_balance: boolean;
  feat_retrospective: boolean;
  feat_project_health: boolean;
  feat_blocker_detect: boolean;
  feat_escalation_scan: boolean;
  feat_weekly_report: boolean;
  feat_channel_summary: boolean;
  feat_meeting_action_items: boolean;
  feat_client_report: boolean;
  feat_build_automation: boolean;
  // leadership
  feat_portfolio_summary: boolean;
  feat_generate_tasks: boolean;
  // ds
  feat_experiment_summary: boolean;
  // tiers
  tier_individual: "fast" | "standard" | "premium";
  tier_manager: "fast" | "standard" | "premium";
  tier_leadership: "fast" | "standard" | "premium";
  tier_ds: "fast" | "standard" | "premium";
  // human-in-the-loop
  require_confirm_task_create: boolean;
  require_confirm_bulk_label: boolean;
  require_confirm_client_report: boolean;
  // data sources
  allow_message_content: boolean;
  allow_document_content: boolean;
  allow_meeting_transcripts: boolean;
  // retention
  log_retention_days: number;
}

interface DailyBudgetResponse {
  date: string;
  features: { feature: string; calls: number; credits_used: number; cap: number }[];
  company_daily_credit_cap: number;
  totals: { calls: number; credits_used: number };
  disclaimer: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(used: number, cap: number) {
  if (!cap) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

function featureLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function barColor(p: number) {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

const TIER_LABELS: Record<string, string> = {
  fast: "Fast (Gemini Flash / Haiku — cheap, low latency)",
  standard: "Standard (Claude Sonnet / GPT-4o-mini)",
  premium: "Premium (Claude Opus / GPT-4o — complex reasoning)",
};

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0",
      disabled && "opacity-40 pointer-events-none",
    )}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={value ? "Disable" : "Enable"}
      >
        {value
          ? <ToggleRight className="h-6 w-6 text-primary" />
          : <ToggleLeft className="h-6 w-6" />
        }
      </button>
    </div>
  );
}

// ── Feature group section ─────────────────────────────────────────────────────

function FeatureGroup({
  title,
  description,
  features,
  policy,
  onChange,
  globallyEnabled,
}: {
  title: string;
  description: string;
  features: { key: keyof AIFeaturePolicy; label: string; desc?: string }[];
  policy: AIFeaturePolicy;
  onChange: (k: keyof AIFeaturePolicy, v: boolean) => void;
  globallyEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          {features.map(f => (
            <ToggleRow
              key={String(f.key)}
              label={f.label}
              description={f.desc}
              value={policy[f.key] as boolean}
              onChange={v => onChange(f.key, v)}
              disabled={!globallyEnabled}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ── Feature policy section ────────────────────────────────────────────────────

function FeaturePolicySection({
  policy,
  onChange,
  onSave,
  saving,
  isAdmin,
}: {
  policy: AIFeaturePolicy;
  onChange: (k: keyof AIFeaturePolicy, v: boolean | string | number) => void;
  onSave: () => void;
  saving: boolean;
  isAdmin: boolean;
}) {
  const g = policy.ai_globally_enabled;

  return (
    <div className="space-y-4">
      {/* Global kill-switch */}
      <Card className={cn("border-2", g ? "border-primary/20" : "border-destructive/30")}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">AI Globally Enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Master switch — disabling this blocks all AI features company-wide immediately.
              </p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onChange("ai_globally_enabled", !g)}
                className="text-muted-foreground hover:text-foreground"
              >
                {g
                  ? <ToggleRight className="h-7 w-7 text-primary" />
                  : <ToggleLeft className="h-7 w-7" />
                }
              </button>
            ) : (
              <Badge variant={g ? "default" : "secondary"}>{g ? "Enabled" : "Disabled"}</Badge>
            )}
          </div>
          {!g && (
            <div className="mt-3 flex items-center gap-2 text-xs text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              All AI features are currently disabled for this company.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature groups */}
      <FeatureGroup
        title="Individual Contributor Features"
        description="Features available to all members"
        globallyEnabled={g}
        policy={policy}
        onChange={(k, v) => onChange(k, v)}
        features={[
          { key: "feat_daily_briefing", label: "Daily Briefing", desc: "Morning summary of tasks and meetings" },
          { key: "feat_focus_recommend", label: "Focus Recommendations", desc: "Ranked task priority suggestions" },
          { key: "feat_task_description", label: "Task Description Generator", desc: "AI writes task descriptions from title" },
          { key: "feat_task_summarize", label: "Task Summarizer", desc: "Summarize task thread and history" },
          { key: "feat_auto_label", label: "Auto Label & Type", desc: "Suggest labels and issue types" },
          { key: "feat_thread_reply_draft", label: "Thread Reply Drafts", desc: "Draft replies to message threads" },
        ]}
      />

      <FeatureGroup
        title="Manager Features"
        description="Features for managers and project leads"
        globallyEnabled={g}
        policy={policy}
        onChange={(k, v) => onChange(k, v)}
        features={[
          { key: "feat_sprint_plan", label: "Sprint Planner", desc: "Suggest sprint scope from backlog" },
          { key: "feat_workload_balance", label: "Workload Balancer", desc: "Rebalance tasks across team members" },
          { key: "feat_retrospective", label: "Retrospective Generator", desc: "Generate sprint retro from task data" },
          { key: "feat_project_health", label: "Project Health Score", desc: "Score and explain project health" },
          { key: "feat_blocker_detect", label: "Blocker Detection", desc: "Find hidden blockers in sprint" },
          { key: "feat_escalation_scan", label: "Escalation Scanner", desc: "Find tasks needing urgent attention" },
          { key: "feat_weekly_report", label: "Weekly Project Report", desc: "Automated weekly status report" },
          { key: "feat_channel_summary", label: "Channel Summarizer", desc: "Summarize recent channel activity" },
          { key: "feat_meeting_action_items", label: "Meeting Action Items", desc: "Extract actions from transcripts" },
          { key: "feat_client_report", label: "Client Report", desc: "Generate client-facing project status" },
          { key: "feat_build_automation", label: "Automation Builder", desc: "Convert plain English to automation rules" },
          { key: "feat_generate_tasks", label: "Task Generator", desc: "Generate task breakdown from project description" },
        ]}
      />

      <FeatureGroup
        title="Leadership & Portfolio"
        description="Executive visibility features (CEO, Admin, Manager)"
        globallyEnabled={g}
        policy={policy}
        onChange={(k, v) => onChange(k, v)}
        features={[
          { key: "feat_portfolio_summary", label: "Portfolio Executive Summary", desc: "Cross-project risk and health rollup for leadership" },
        ]}
      />

      <FeatureGroup
        title="DS / AI Team Features"
        description="Experiment and model management for data science teams"
        globallyEnabled={g}
        policy={policy}
        onChange={(k, v) => onChange(k, v)}
        features={[
          { key: "feat_experiment_summary", label: "Experiment Summary", desc: "Summarize experiment task with custom fields and metrics" },
        ]}
      />

      {/* Model tier routing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Model Tier Routing</CardTitle>
          <CardDescription>
            Select the model tier per persona. Fast = cheaper/faster. Premium = stronger reasoning, higher cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["individual", "manager", "leadership", "ds"] as const).map(tier => {
            const key = `tier_${tier}` as keyof AIFeaturePolicy;
            const val = policy[key] as string;
            return (
              <div key={tier}>
                <Label className="text-xs font-semibold capitalize mb-1 block">
                  {tier === "ds" ? "DS / AI Teams" : tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                </Label>
                {isAdmin ? (
                  <select
                    value={val}
                    onChange={e => onChange(key, e.target.value)}
                    disabled={!g}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {Object.entries(TIER_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">{TIER_LABELS[val] ?? val}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Human-in-the-loop */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Human-in-the-Loop Confirmation</CardTitle>
          <CardDescription>
            Require explicit user confirmation before AI output is applied to the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {[
            { key: "require_confirm_task_create" as const, label: "Confirm before creating AI-generated tasks" },
            { key: "require_confirm_bulk_label" as const, label: "Confirm before applying bulk AI labels" },
            { key: "require_confirm_client_report" as const, label: "Confirm before sending AI-generated client reports" },
          ].map(f => (
            <ToggleRow
              key={f.key}
              label={f.label}
              value={policy[f.key]}
              onChange={isAdmin ? v => onChange(f.key, v) : () => {}}
              disabled={!g || !isAdmin}
            />
          ))}
        </CardContent>
      </Card>

      {/* Data source access */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Data Source Access</CardTitle>
          <CardDescription>
            Control which content types AI may read when building context. Disabled = AI will not access this content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {[
            { key: "allow_message_content" as const, label: "Message & Thread Content", desc: "Allow AI to read channel messages for summaries and reply drafts" },
            { key: "allow_document_content" as const, label: "Project Documents", desc: "Allow AI to read project docs and SOPs for experiment summaries" },
            { key: "allow_meeting_transcripts" as const, label: "Meeting Transcripts", desc: "Allow AI to read meeting transcripts for action item extraction" },
          ].map(f => (
            <ToggleRow
              key={f.key}
              label={f.label}
              description={f.desc}
              value={policy[f.key]}
              onChange={isAdmin ? v => onChange(f.key, v) : () => {}}
              disabled={!isAdmin}
            />
          ))}
        </CardContent>
      </Card>

      {/* Log retention */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Prompt & Response Retention</CardTitle>
          <CardDescription>
            How long prompt summaries and response previews are stored in the audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={7}
                max={730}
                value={policy.log_retention_days}
                onChange={e => onChange("log_retention_days", Number(e.target.value))}
                className="w-24 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">days (7–730)</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{policy.log_retention_days} days</p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Policy
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Daily Budget section ──────────────────────────────────────────────────────

function DailyBudgetSection() {
  const [data, setData] = useState<DailyBudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ai/daily-budget/")
      .then(r => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return null;

  const companyPct = pct(data.totals.credits_used, data.company_daily_credit_cap);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Daily Company Credit Usage — {data.date}
          </CardTitle>
          <CardDescription>
            {data.totals.credits_used.toFixed(1)} of {data.company_daily_credit_cap.toFixed(0)} credits · {data.totals.calls} calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", barColor(companyPct))} style={{ width: `${companyPct}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{companyPct}% used</span>
            <span>{(data.company_daily_credit_cap - data.totals.credits_used).toFixed(1)} remaining</span>
          </div>
        </CardContent>
      </Card>

      {data.features.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Per-Feature Usage Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.features.map(f => {
              const p = pct(f.calls, f.cap);
              return (
                <div key={f.feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{featureLabel(f.feature)}</span>
                    <span className="text-xs text-muted-foreground">{f.calls}/{f.cap} calls · {f.credits_used.toFixed(3)} cr</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", barColor(p))} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300">{data.disclaimer}</p>
      </div>
    </div>
  );
}

// ── Safety policies (static) ──────────────────────────────────────────────────

function SafetyPoliciesSection() {
  const policies = [
    { title: "Prompt Injection Protection", desc: "Inputs scanned against 24 OWASP LLM01 injection patterns before reaching the model.", active: true },
    { title: "PII Scrubbing", desc: "Emails, phone numbers, credit card numbers, and secrets are redacted from all prompts.", active: true },
    { title: "Output Validation", desc: "Responses truncated at 12k chars and checked for reflected injection content or fabricated PII.", active: true },
    { title: "Daily Budget Enforcement", desc: "Per-feature call caps and company-wide daily credit limits prevent runaway costs.", active: true },
    { title: "Full Audit Logging", desc: "Every AI call logged with user, scope, tokens, cost, latency, status, and feedback.", active: true },
    { title: "Human-in-the-Loop Confirmation", desc: "Configurable confirmation gates before AI creates tasks, labels, or sends reports.", active: true },
    { title: "Bring Your Own Key (BYOK)", desc: "Enterprise teams can supply OpenAI, Anthropic, or Gemini keys — stored encrypted.", active: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Safety Controls
        </CardTitle>
        <CardDescription>Security and compliance controls enforced on all AI calls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {policies.map(p => (
          <div key={p.title} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs gap-1">
              <Check className="h-3 w-3" /> Active
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ["Feature Policy", "Usage & Budget", "Safety Controls"] as const;
type Tab = typeof TABS[number];

export default function AIGovernancePage() {
  const { user } = useAuthStore();
  const isAdmin = !!(user?.is_superuser || (user as { company_role?: string })?.company_role === "admin" || (user as { company_role?: string })?.company_role === "ceo");

  const [tab, setTab] = useState<Tab>("Feature Policy");
  const [policy, setPolicy] = useState<AIFeaturePolicy | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Partial<AIFeaturePolicy>>({});

  const loadPolicy = useCallback(async () => {
    setLoadingPolicy(true);
    try {
      const res = await api.get("/ai/feature-policy/");
      setPolicy(res.data?.data ?? res.data);
    } catch {
      toast.error("Failed to load AI feature policy.");
    } finally {
      setLoadingPolicy(false);
    }
  }, []);

  useEffect(() => { loadPolicy(); }, [loadPolicy]);

  function handleChange(k: keyof AIFeaturePolicy, v: boolean | string | number) {
    setPolicy(prev => prev ? { ...prev, [k]: v } : prev);
    setDirty(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!Object.keys(dirty).length) return;
    setSaving(true);
    try {
      const res = await api.patch("/ai/feature-policy/", dirty);
      setPolicy(res.data?.data ?? res.data);
      setDirty({});
      toast.success("AI policy saved.");
    } catch {
      toast.error("Failed to save policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Governance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control which AI features are enabled, set model tiers, enforce data access policies, and monitor usage.
          </p>
        </div>
        {!isAdmin && (
          <Badge variant="outline" className="shrink-0 text-xs">View only — Admin required to edit</Badge>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Feature Policy" && (
        loadingPolicy ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading policy…
          </div>
        ) : policy ? (
          <FeaturePolicySection
            policy={policy}
            onChange={handleChange}
            onSave={handleSave}
            saving={saving}
            isAdmin={isAdmin}
          />
        ) : null
      )}

      {tab === "Usage & Budget" && <DailyBudgetSection />}
      {tab === "Safety Controls" && <SafetyPoliciesSection />}
    </div>
  );
}
