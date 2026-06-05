"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useTeamStore } from "@/store/team";
import { useMyTeamCapabilities } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, FlaskConical, LayoutGrid, RefreshCcw, Table2 } from "lucide-react";

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
  experiment_total: number;
  experiment_deployed: number;
};

type ViewMode = "projects" | "ds";

export default function PortfolioPage() {
  const { activeTeamId, fetchTeams, teams } = useTeamStore();
  const router = useRouter();
  const { can: canTeamCap, isLoading: capsLoading } = useMyTeamCapabilities(activeTeamId);
  const canAccessReports = canTeamCap("can_access_reports");
  const [viewMode, setViewMode] = useState<ViewMode>("projects");

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);

  useEffect(() => {
    if (capsLoading) return;
    if (!activeTeamId) return;
    if (canAccessReports) return;
    router.replace("/dashboard");
  }, [activeTeamId, canAccessReports, capsLoading, router]);

  const { data, isLoading, refetch, isFetching } = useQuery<{ projects: PortfolioProject[] }>({
    queryKey: ["portfolio", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ projects: PortfolioProject[] }>>("/reports/portfolio/", {
        params: activeTeamId ? { team_id: activeTeamId } : {},
      });
      return res.data.data ?? { projects: [] };
    },
    enabled: !!activeTeamId && canAccessReports,
    staleTime: 30_000,
  });

  const projects = data?.projects ?? [];

  const totals = useMemo(() => {
    const total = projects.length;
    const overdue = projects.filter((p) => (p.task_overdue ?? 0) > 0).length;
    const atRisk = projects.filter((p) => (p.health_score ?? 0) < 50).length;
    const expTotal = projects.reduce((s, p) => s + (p.experiment_total ?? 0), 0);
    const expDeployed = projects.reduce((s, p) => s + (p.experiment_deployed ?? 0), 0);
    return { total, overdue, atRisk, expTotal, expDeployed };
  }, [projects]);

  if (!capsLoading && activeTeamId && !canAccessReports) {
    return (
      <div className="mx-auto max-w-[1400px] p-6">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Portfolio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Health and delivery signals across active projects{activeTeam ? ` in ${activeTeam.name}` : ""}.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[11px]">Projects: {totals.total}</Badge>
            <Badge variant="secondary" className="text-[11px]">Overdue: {totals.overdue}</Badge>
            <Badge variant="secondary" className="text-[11px]">At risk: {totals.atRisk}</Badge>
            {totals.expTotal > 0 && (
              <>
                <Badge variant="secondary" className="text-[11px] gap-1">
                  <FlaskConical className="h-2.5 w-2.5" />
                  Experiments: {totals.expTotal}
                </Badge>
                <Badge variant="secondary" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400">
                  Deployed: {totals.expDeployed}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode("projects")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors",
                viewMode === "projects" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Projects
            </button>
            <button
              onClick={() => setViewMode("ds")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[12px] border-l transition-colors",
                viewMode === "ds" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              DS / AI
            </button>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCcw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Projects view */}
      {viewMode === "projects" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && <div className="text-sm text-muted-foreground">Loading portfolio…</div>}
          {!isLoading &&
            projects.map((p) => {
              const score = p.health_score ?? 0;
              const scoreTone =
                score >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : score >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive";
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
                      <Badge
                        variant="outline"
                        className={cn("text-[11px]", (p.task_overdue ?? 0) > 0 && "text-destructive")}
                      >
                        Overdue: {p.task_overdue ?? 0}
                      </Badge>
                      {(p.experiment_total ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[11px] gap-1">
                          <FlaskConical className="h-2.5 w-2.5" />
                          {p.experiment_deployed ?? 0}/{p.experiment_total} deployed
                        </Badge>
                      )}
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
      )}

      {/* DS / AI view */}
      {viewMode === "ds" && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Model experiment overview across all active projects. Shows projects with at least one Experiment task.
          </p>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total experiments</p>
                <p className="text-3xl font-bold mt-1">{totals.expTotal}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Deployed models</p>
                <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{totals.expDeployed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Deployment rate</p>
                <p className="text-3xl font-bold mt-1">
                  {totals.expTotal > 0 ? Math.round((totals.expDeployed / totals.expTotal) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Model initiative table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Project</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Team</th>
                      <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Health</th>
                      <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Experiments</th>
                      <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deployed</th>
                      <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deploy Rate</th>
                      <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Overdue Tasks</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground text-sm">
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!isLoading && projects.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No projects found.
                        </td>
                      </tr>
                    )}
                    {projects.map((p) => {
                      const score = p.health_score ?? 0;
                      const scoreTone =
                        score >= 80 ? "text-emerald-600 dark:text-emerald-400"
                        : score >= 50 ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive";
                      const deployRate = (p.experiment_total ?? 0) > 0
                        ? Math.round(((p.experiment_deployed ?? 0) / p.experiment_total) * 100)
                        : null;
                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-sm">{p.icon && <span className="mr-1">{p.icon}</span>}{p.name}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground">{p.team_name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("text-[12px] font-semibold", scoreTone)}>{score}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">{p.health_label}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-[13px] font-medium">
                            {p.experiment_total ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("text-[13px] font-medium", (p.experiment_deployed ?? 0) > 0 && "text-emerald-600 dark:text-emerald-400")}>
                              {p.experiment_deployed ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {deployRate !== null ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-muted">
                                  <div
                                    className="h-1.5 rounded-full bg-emerald-500"
                                    style={{ width: `${deployRate}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground">{deployRate}%</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("text-[12px]", (p.task_overdue ?? 0) > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {p.task_overdue ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-[11px]">
                              <Link href={`/projects/${p.id}`}>
                                Open <ArrowUpRight size={11} />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
