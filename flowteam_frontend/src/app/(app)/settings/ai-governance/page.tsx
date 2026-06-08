"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, Sparkles, BarChart3, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureBudget {
  feature: string;
  calls: number;
  credits_used: number;
  call_cap: number;
  credits_cap: number;
}

interface BudgetResponse {
  date: string;
  features: FeatureBudget[];
  company_daily_credit_cap: number;
  total_credits_used: number;
  disclaimer: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(used: number, cap: number): number {
  if (!cap) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

function featureLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function progressColor(p: number): string {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-500";
  return "bg-green-500";
}

// ── Daily Budget section ──────────────────────────────────────────────────────

function DailyBudgetSection() {
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ai/daily-budget/");
      setData(res.data?.data ?? res.data);
    } catch {
      setError("Network error loading budget.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading budget data…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-4">
        <AlertCircle className="h-4 w-4" /> {error || "No data available."}
      </div>
    );
  }

  const companyPct = pct(data.total_credits_used, data.company_daily_credit_cap);

  return (
    <div className="space-y-6">
      {/* Company-wide credit bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Daily Company Credit Usage
          </CardTitle>
          <CardDescription>
            {data.total_credits_used.toFixed(1)} of {data.company_daily_credit_cap.toFixed(0)} credits used today ({data.date})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(companyPct)}`}
              style={{ width: `${companyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{companyPct}% used</span>
            <span>{(data.company_daily_credit_cap - data.total_credits_used).toFixed(1)} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-feature table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Per-Feature Usage</CardTitle>
          <CardDescription>Call counts and credits consumed per AI feature today</CardDescription>
        </CardHeader>
        <CardContent>
          {data.features.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No AI features used today.</p>
          ) : (
            <div className="space-y-4">
              {data.features.map(f => {
                const callPct = pct(f.calls, f.call_cap);
                return (
                  <div key={f.feature}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{featureLabel(f.feature)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {f.calls}/{f.call_cap} calls
                        </span>
                        <Badge
                          variant={callPct >= 90 ? "destructive" : callPct >= 70 ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {callPct}%
                        </Badge>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full ${progressColor(callPct)}`}
                        style={{ width: `${callPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.credits_used.toFixed(3)} credits used
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{data.disclaimer}</p>
      </div>
    </div>
  );
}

// ── AI Policy overview ────────────────────────────────────────────────────────

function AIPolicySection() {
  const policies = [
    {
      title: "Prompt Injection Protection",
      description: "Inputs are scanned for OWASP LLM01 injection patterns before reaching the model.",
      status: "active",
    },
    {
      title: "PII Scrubbing",
      description: "Email addresses, phone numbers, credit card numbers, and secrets are redacted from all prompts.",
      status: "active",
    },
    {
      title: "Output Validation",
      description: "Responses are truncated to safe lengths and checked for reflected injection content.",
      status: "active",
    },
    {
      title: "Daily Budget Enforcement",
      description: "Per-feature call caps and company-wide daily credit limits prevent runaway costs.",
      status: "active",
    },
    {
      title: "Audit Logging",
      description: "Every AI call is logged with prompt tokens, cost, latency, and feedback ratings.",
      status: "active",
    },
    {
      title: "Bring Your Own Key (BYOK)",
      description: "Enterprise teams can supply their own OpenAI / Anthropic / Gemini API keys.",
      status: "available",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4" />
          AI Safety Policies
        </CardTitle>
        <CardDescription>Controls enforced on all AI features in your workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {policies.map(p => (
          <div key={p.title} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
            </div>
            <Badge
              variant={p.status === "active" ? "default" : "outline"}
              className="shrink-0 text-xs"
            >
              {p.status === "active" ? "Active" : "Available"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AIGovernancePage() {
  return (
    <div className="max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor AI usage, enforce budgets, and review safety policies.
        </p>
      </div>

      <DailyBudgetSection />
      <AIPolicySection />
    </div>
  );
}
