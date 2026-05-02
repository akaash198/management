"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIButton } from "@/components/ai/AIButton";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useAIStore } from "@/store/ai";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type FocusPayload = {
  recommendations: Array<{
    rank: number;
    task_id: string;
    task_title: string;
    reason: string;
    urgency_level: "critical" | "high" | "medium" | "low" | string;
  }>;
};

function urgencyBadgeVariant(level: string): "default" | "secondary" | "destructive" {
  const v = (level || "").toLowerCase();
  if (v === "critical") return "destructive";
  if (v === "high") return "default";
  return "secondary";
}

export function FocusCard({ teamId }: { teamId: string | null }) {
  const cached = useAIStore((s) => s.focus);
  const setFocus = useAIStore((s) => s.setFocus);
  const [loading, setLoading] = useState(false);

  const hasTeam = !!teamId;

  const recommendations = useMemo(() => cached?.recommendations ?? [], [cached?.recommendations]);

  const fetchFocus = useCallback(
    async (refresh: boolean) => {
      if (!teamId) return;
      try {
        setLoading(true);
        const res = await api.get<ApiResponse<FocusPayload>>("/ai/focus-recommend/", {
          params: { team_id: teamId, ...(refresh ? { refresh: "1" } : {}) },
        });
        const payload = res.data.data;
        setFocus(
          payload
            ? {
                recommendations: payload.recommendations ?? [],
                updatedAt: Date.now(),
              }
            : null
        );
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to load focus recommendations"));
      } finally {
        setLoading(false);
      }
    },
    [setFocus, teamId]
  );

  useEffect(() => {
    if (!hasTeam) return;
    if (recommendations.length) return;
    void fetchFocus(false);
  }, [fetchFocus, hasTeam, recommendations.length]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Focus recommendations
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ranked suggestions for what to work on next.</p>
        </div>
        <AIButton
          variant="outline"
          size="sm"
          className="h-8 text-[12px]"
          loading={loading}
          onClick={() => void fetchFocus(true)}
        >
          Refresh
        </AIButton>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasTeam && <p className="text-sm text-muted-foreground">Select a team to see recommendations.</p>}
        {hasTeam && !recommendations.length && (
          <p className="text-sm text-muted-foreground">{loading ? "Generating recommendations…" : "No data yet."}</p>
        )}
        {recommendations.slice(0, 6).map((r) => (
          <div key={`${r.task_id}-${r.rank}`} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {r.rank}. {r.task_title}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{r.reason}</p>
              </div>
              <Badge variant={urgencyBadgeVariant(r.urgency_level)} className="shrink-0 text-[11px]">
                {String(r.urgency_level || "medium").toUpperCase()}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
