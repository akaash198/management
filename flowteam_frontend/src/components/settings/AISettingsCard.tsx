"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, FileText, BarChart2 } from "lucide-react";
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

export function AISettingsCard() {
  const { aiEnabled, setAIEnabled } = useAIStore();
  const { teams, activeTeamId } = useTeamStore();
  const [saving, setSaving] = useState(false);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);
  const isCEOorAdmin = ["ceo", "admin"].includes(activeTeam?.your_role ?? "");

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

  return (
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
  );
}

