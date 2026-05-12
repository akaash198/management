"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useTeamStore } from "@/store/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, RefreshCcw } from "lucide-react";

type PortfolioProject = {
  id: string;
  name: string;
  team_id: string;
  team_name: string;
  color: string;
  icon: string | null;
  progress_percent: number;
  task_total: number;
  task_open: number;
  task_overdue: number;
  health_score: number;
  health_label: string;
  next_milestone?: { name: string; due_date: string | null; status: string } | null;
};

export default function PortfolioPage() {
  const { activeTeamId, fetchTeams, teams } = useTeamStore();

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);

  const { data, isLoading, refetch, isFetching } = useQuery<{ projects: PortfolioProject[] }>({
    queryKey: ["portfolio", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ projects: PortfolioProject[] }>>("/reports/portfolio/", {
        params: activeTeamId ? { team_id: activeTeamId } : {},
      });
      return res.data.data ?? { projects: [] };
    },
    enabled: true,
    staleTime: 30_000,
  });

  const projects = data?.projects ?? [];

  const totals = useMemo(() => {
    const total = projects.length;
    const overdue = projects.filter((p) => (p.task_overdue ?? 0) > 0).length;
    const atRisk = projects.filter((p) => (p.health_score ?? 0) < 50).length;
    return { total, overdue, atRisk };
  }, [projects]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Portfolio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Health and delivery signals across active projects{activeTeam ? ` in ${activeTeam.name}` : ""}.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[11px]">
              Projects: {totals.total}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Overdue: {totals.overdue}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              At risk: {totals.atRisk}
            </Badge>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCcw size={14} className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading portfolio…</div>}
        {!isLoading &&
          projects.map((p) => {
            const score = p.health_score ?? 0;
            const scoreTone = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive";
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="min-w-0 truncate">{p.name}</span>
                    <Badge variant="secondary" className={cn("shrink-0 text-[11px]", scoreTone)}>
                      {score} • {p.health_label}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{p.team_name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, p.progress_percent ?? 0))}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      Progress: {p.progress_percent ?? 0}%
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      Open: {p.task_open ?? 0}/{p.task_total ?? 0}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[11px]", (p.task_overdue ?? 0) > 0 && "text-destructive")}>
                      Overdue: {p.task_overdue ?? 0}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Next milestone:{" "}
                    {p.next_milestone?.due_date
                      ? `${p.next_milestone.name} • ${new Date(p.next_milestone.due_date).toLocaleDateString()}`
                      : "None"}
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-8 w-full gap-2 text-[12px]">
                    <Link href={`/projects/${p.id}`}>
                      Open project <ArrowUpRight size={13} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

