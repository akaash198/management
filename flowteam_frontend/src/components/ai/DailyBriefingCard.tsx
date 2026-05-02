"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIButton } from "@/components/ai/AIButton";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useAIStore } from "@/store/ai";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type DailyBriefingPayload = {
  briefing: string;
  overdue_count: number;
  due_today_count: number;
  meeting_count: number;
};

export function DailyBriefingCard({ teamId }: { teamId: string | null }) {
  const cached = useAIStore((s) => s.dailyBriefing);
  const setDailyBriefing = useAIStore((s) => s.setDailyBriefing);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const hasTeam = !!teamId;

  const briefingText = cached?.text ?? "";
  const counts = useMemo(
    () => ({
      overdue: cached?.overdueCount ?? 0,
      dueToday: cached?.dueTodayCount ?? 0,
      meetings: cached?.meetingCount ?? 0,
    }),
    [cached?.dueTodayCount, cached?.meetingCount, cached?.overdueCount]
  );

  const fetchBriefing = useCallback(
    async (refresh: boolean) => {
      if (!teamId) return;
      try {
        setLoading(true);
        const res = await api.get<ApiResponse<DailyBriefingPayload>>("/ai/daily-briefing/", {
          params: { team_id: teamId, ...(refresh ? { refresh: "1" } : {}) },
        });
        const payload = res.data.data;
        setDailyBriefing(
          payload
            ? {
                text: payload.briefing ?? "",
                overdueCount: payload.overdue_count ?? 0,
                dueTodayCount: payload.due_today_count ?? 0,
                meetingCount: payload.meeting_count ?? 0,
                updatedAt: Date.now(),
              }
            : null
        );
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to load daily briefing"));
      } finally {
        setLoading(false);
      }
    },
    [setDailyBriefing, teamId]
  );

  useEffect(() => {
    if (!hasTeam) return;
    if (cached?.text) return;
    void fetchBriefing(false);
  }, [cached?.text, fetchBriefing, hasTeam]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily briefing
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">
              Overdue: {counts.overdue}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Due today: {counts.dueToday}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Meetings: {counts.meetings}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AIButton
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            loading={loading}
            onClick={() => void fetchBriefing(true)}
          >
            Refresh
          </AIButton>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            aria-label={expanded ? "Collapse briefing" : "Expand briefing"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {briefingText || (hasTeam ? "Generating your briefing…" : "Select a team to view briefing.")}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
