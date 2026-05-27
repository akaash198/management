"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Zap, Brain, FileText, BarChart2, ShieldCheck, Settings2, KeyRound } from "lucide-react";
import { useAIStore } from "@/store/ai";
import { useTeamStore } from "@/store/team";
import api from "@/lib/api";
import { toast } from "sonner";
import type { ApiResponse, Team } from "@/types";
import { toErrorMessage } from "@/lib/errorMessage";

const AI_FEATURES = [
  { icon: Brain, label: "Daily Briefing", desc: "Morning summary of tasks, meetings, and priorities" },
  { icon: Zap, label: "Auto Task Descriptions", desc: "AI writes description, acceptance criteria, and subtasks" },
  { icon: FileText, label: "Weekly Status Reports", desc: "Auto-generated project reports for managers" },
  { icon: BarChart2, label: "Sprint Planning AI", desc: "Capacity-aware sprint scope suggestions" },
  { icon: Sparkles, label: "Channel Catch-up", desc: "Summarize missed messages in any channel" },
  { icon: Brain, label: "Project Health Score", desc: "0–100 score with risk factors and recommendations" },
  { icon: Zap, label: "Workload Balancer", desc: "Detect overloaded members and suggest reassignments" },
  { icon: FileText, label: "Client Reports", desc: "Client-ready project updates in one click" },
  { icon: Sparkles, label: "Focus Recommendations", desc: "AI tells each member what to work on next" },
  { icon: Brain, label: "Auto Label & Triage", desc: "Suggest labels, type, and priority on task create" },
];

interface CompanyAISettings {
  integration_mode: "platform_managed" | "byok";
  byok_provider: string;
  byok_model_override: string;
  has_api_key: boolean;
  total_allocated: number;
  credits_used: number;
  remaining_credits: number;
  alert_threshold_percentage: number;
}

export function AISettingsCard() {
  const { aiEnabled, setAIEnabled } = useAIStore();
  const { teams, activeTeamId } = useTeamStore();
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);
  const isCEOorAdmin = ["ceo", "admin"].includes(activeTeam?.your_role ?? "");
  const companyId = activeTeam?.company_id;

  // Local settings state
  const [mode, setMode] = useState<"platform_managed" | "byok">("platform_managed");
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState<string>("");
  const [modelOverride, setModelOverride] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState<number>(80);
  const [budgetUSD, setBudgetUSD] = useState<number>(50);
  const [hasApiKeyOnServer, setHasApiKeyOnServer] = useState(false);
  const [loadedProvider, setLoadedProvider] = useState<string>("");

  // Load configuration
  useEffect(() => {
    if (!companyId) return;
    const fetchAIConfig = async () => {
      setLoadingConfig(true);
      try {
        const res = await api.get<ApiResponse<CompanyAISettings>>(`/companies/${companyId}/ai-settings/`);
        const data = res.data.data;
        if (data) {
          setMode(data.integration_mode);
          setProvider(data.byok_provider || "openai");
          setLoadedProvider(data.byok_provider || "openai");
          setModelOverride(data.byok_model_override || "");
          setAlertThreshold(data.alert_threshold_percentage || 80);
          setBudgetUSD((data.total_allocated || 5000) / 100);
          setHasApiKeyOnServer(data.has_api_key);
        }
      } catch (err) {
        console.error("Failed to load AI configuration", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    void fetchAIConfig();
  }, [companyId]);

  const handleToggle = async (value: boolean) => {
    if (!activeTeamId || !isCEOorAdmin) return;
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<Team>>(`/teams/${activeTeamId}/`, { ai_enabled: value });
      const updatedTeam = res.data.data;
      setAIEnabled(!!updatedTeam?.ai_enabled);
      toast.success(value ? "AI features enabled" : "AI features disabled");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update AI settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!companyId || !isCEOorAdmin) return;

    // Field Validations
    if (mode === "byok") {
      if (!provider) {
        toast.error("Please select an AI Provider");
        return;
      }
      const hasSavedKeyForCurrentProvider = hasApiKeyOnServer && provider === loadedProvider;
      if (!apiKey && !hasSavedKeyForCurrentProvider) {
        const providerName = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google Gemini';
        toast.error(`Please enter an API Key for ${providerName}`);
        return;
      }
      if (budgetUSD <= 0) {
        toast.error("Please enter a valid AI Budget (greater than 0)");
        return;
      }
    }

    if (alertThreshold < 1 || alertThreshold > 100) {
      toast.error("Alert Threshold Percentage must be between 1 and 100");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        integration_mode: mode,
        alert_threshold_percentage: alertThreshold,
      };

      if (mode === "byok") {
        payload.byok_provider = provider;
        payload.byok_model_override = modelOverride || null;
        payload.total_allocated = budgetUSD * 100;
        if (apiKey) {
          payload.byok_api_key = apiKey;
        }
      }

      const res = await api.patch<ApiResponse<CompanyAISettings>>(`/companies/${companyId}/ai-settings/`, payload);
      toast.success("AI configuration saved successfully");
      if (res.data.data) {
        setHasApiKeyOnServer(res.data.data.has_api_key);
        setLoadedProvider(res.data.data.byok_provider || "openai");
        setApiKey(""); // Clear local key input after save
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save AI configuration"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!provider) {
      toast.error("Please select an AI Provider to test connection");
      return;
    }
    const hasSavedKeyForCurrentProvider = hasApiKeyOnServer && provider === loadedProvider;
    if (!apiKey && !hasSavedKeyForCurrentProvider) {
      const providerName = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google Gemini';
      toast.error(`Please enter an API Key for ${providerName} to test connection`);
      return;
    }
    setTestingConnection(true);
    try {
      const res = await api.post<ApiResponse<{ message: string; result: string }>>("/ai/test-connection/", {
        provider,
        api_key: apiKey || "use_saved_key",
        model: modelOverride || null,
      });
      toast.success(res.data.data?.message || "Connection successful!");
    } catch (err) {
      toast.error(toErrorMessage(err, "Connection test failed"));
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles size={16} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">AI Features</CardTitle>
                <CardDescription className="mt-0.5 text-xs">Powered by Claude — enable for your entire workspace</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={aiEnabled ? "default" : "secondary"} className="text-[11px]">
                {aiEnabled ? "Active" : "Inactive"}
              </Badge>
              <Switch checked={aiEnabled} onCheckedChange={handleToggle} disabled={saving || !isCEOorAdmin} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCEOorAdmin && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Only CEO and Admin can enable or disable AI features.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AI_FEATURES.map((f) => (
              <div
                key={f.label}
                className={`flex items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                  aiEnabled ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <f.icon size={14} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">{f.label}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Setup (BYOK vs Managed) */}
      {isCEOorAdmin && companyId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 size={16} className="text-primary" /> Engine Integration & Provider Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Determine how AI queries are routed and billed for your company.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingConfig ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Billing Mode</Label>
                  <Select value={mode} onValueChange={(val) => setMode(val as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select integration mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_managed">Platform-Managed Credits (Uses Cowork API keys)</SelectItem>
                      <SelectItem value="byok">Bring Your Own Key (BYOK — Uses your API keys)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mode === "platform_managed" ? (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-xl border">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <ShieldCheck size={14} className="text-success" />
                      Platform Allocation Managed
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      The workspace runs on our central LLM adapters and credit allocations. You do not need to provide any keys.
                    </p>
                    <div className="grid gap-2 pt-2">
                      <Label className="text-xs font-semibold">Alert Threshold Percentage</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 80)}
                        placeholder="80"
                        className="max-w-[120px]"
                      />
                      <p className="text-[10px] text-muted-foreground">Receive budget notifications when allocation drops below this threshold.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                      <KeyRound size={14} className="text-primary" />
                      BYOK Connection Settings
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label className="text-xs font-semibold">AI Provider</Label>
                        <Select value={provider} onValueChange={setProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs font-semibold">Model Name Override (Optional)</Label>
                        <Input
                          type="text"
                          value={modelOverride}
                          onChange={(e) => setModelOverride(e.target.value)}
                          placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>API Key</span>
                        {hasApiKeyOnServer && (
                          <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                            ✓ Key Encrypted on Server
                          </span>
                        )}
                      </Label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={hasApiKeyOnServer ? "••••••••••••••••••••••••" : "Enter raw API key"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label className="text-xs font-semibold">AI Budget / Limit (USD)</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={budgetUSD}
                          onChange={(e) => setBudgetUSD(parseFloat(e.target.value) || 0)}
                          placeholder="50.00"
                        />
                        <p className="text-[10px] text-muted-foreground">Maximum cost cap for your workspace. 1 credit = $0.01 USD.</p>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs font-semibold">Alert Threshold Percentage</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={alertThreshold}
                          onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 80)}
                          placeholder="80"
                        />
                        <p className="text-[10px] text-muted-foreground">Receive notifications when budget spent crosses this threshold.</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleTestConnection}
                        disabled={testingConnection || saving}
                      >
                        {testingConnection ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={handleSaveConfig} disabled={saving} className="h-9 px-4 text-xs font-semibold">
                    {saving ? "Saving..." : "Save AI Configuration"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
