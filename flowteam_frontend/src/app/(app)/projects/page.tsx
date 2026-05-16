"use client";

import { useDeleteProject, useProjects, useRestoreProject } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Briefcase, Users, Search,
  CheckCircle2, AlertTriangle, ArrowUpRight,
  FolderKanban, TrendingUp, MoreHorizontal, FileDown, Settings,
  LayoutList, LayoutGrid,
  LayoutPanelTop,
  ShieldCheck,
  Archive,
  RefreshCw,
  Clock,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

type ViewMode = "grid" | "list";

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "tasks" | "completion" | "overdue">("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { teams, activeTeamId, fetchTeams } = useTeamStore();
  const archiveProject = useDeleteProject();
  const restoreProject = useRestoreProject();

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [teams, activeTeamId]);
  const canCreate =
    activeTeam?.your_role === "admin" ||
    activeTeam?.your_role === "ceo"   ||
    activeTeam?.your_role === "manager" ||
    user?.is_superuser;

  const { data: projects, isLoading, refetch } = useProjects(activeTeamId ?? undefined, user?.is_superuser, statusFilter);
  const allProjects = useMemo(() => projects ?? [], [projects]);

  const stats = useMemo(() => {
    const total      = allProjects.length;
    const active     = allProjects.filter((p) => p.status === "active").length;
    const archived   = allProjects.filter((p) => p.status === "archived").length;
    const totalT     = allProjects.reduce((s, p) => s + (p.task_count ?? 0), 0);
    const completedT = allProjects.reduce((s, p) => s + (p.completed_task_count ?? 0), 0);
    const overdue    = allProjects.reduce((s, p) => s + (p.overdue_count ?? 0), 0);
    const pct        = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
    const atRisk     = allProjects.filter((p) => (p.overdue_count ?? 0) >= 2).length;
    return { total, active, archived, totalT, completedT, overdue, pct, atRisk };
  }, [allProjects]);

  const visible = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = allProjects.filter((p) => {
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    });
    const pct = (p: Project) => (p.task_count ? (p.completed_task_count ?? 0) / p.task_count : 0);
    return filtered.sort((a, b) => {
      if (sortBy === "name")       return a.name.localeCompare(b.name);
      if (sortBy === "tasks")      return (b.task_count ?? 0) - (a.task_count ?? 0);
      if (sortBy === "completion") return pct(b) - pct(a);
      if (sortBy === "overdue")    return (b.overdue_count ?? 0) - (a.overdue_count ?? 0);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [allProjects, searchText, sortBy]);

  const hasActiveFilters = searchText || statusFilter !== "all" || sortBy !== "updated";

  if (isLoading || (!activeTeamId && !user?.is_superuser)) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground">Projects</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {stats.active} active · {stats.archived} archived · {stats.totalT} total tasks
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {canCreate && (
            <>
              <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[12.5px] gap-1.5">
                <Link href="/projects/issues"><LayoutList size={13} />Issues</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[12.5px] gap-1.5">
                <Link href="/projects/planning"><LayoutPanelTop size={13} />Planning</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[12.5px] gap-1.5">
                <Link href="/projects/operations"><ShieldCheck size={13} />Operations</Link>
              </Button>
              <Button onClick={() => setIsModalOpen(true)} size="sm" className="h-8 px-3 text-[13px] gap-1.5">
                <Plus size={14} />New project
              </Button>
            </>
          )}
          {!canCreate && (
            <>
              <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[12.5px] gap-1.5">
                <Link href="/projects/issues"><LayoutList size={13} />Issues</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[12.5px] gap-1.5">
                <Link href="/projects/planning"><LayoutPanelTop size={13} />Planning</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active projects"
          value={stats.active}
          sub={`${stats.archived} archived`}
          icon={FolderKanban}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatTile
          label="Overall completion"
          value={`${stats.pct}%`}
          sub={`${stats.completedT} of ${stats.totalT} tasks`}
          icon={Target}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          progress={stats.pct}
        />
        <StatTile
          label="Team members"
          value={allProjects.reduce((s, p) => Math.max(s, p.member_count ?? 0), 0)}
          sub="Across all projects"
          icon={Users}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-50 dark:bg-violet-950/40"
        />
        <StatTile
          label="Overdue tasks"
          value={stats.overdue}
          sub={stats.atRisk > 0 ? `${stats.atRisk} project${stats.atRisk > 1 ? "s" : ""} at risk` : "Everything on track"}
          icon={AlertTriangle}
          iconColor={stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
          iconBg={stats.overdue > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-muted/50"}
          danger={stats.overdue > 0}
        />
      </div>

      {/* ── At-risk banner ── */}
      {stats.atRisk > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[12.5px] font-medium text-amber-800 dark:text-amber-300">
            {stats.atRisk} project{stats.atRisk > 1 ? "s are" : " is"} at risk with multiple overdue tasks — review and reassign to get back on track.
          </p>
          <button
            onClick={() => { setStatusFilter("active"); setSortBy("overdue"); }}
            className="ml-auto shrink-0 text-[12px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            View at-risk
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search projects…"
            className="pl-9 h-9 text-[13px] bg-card"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
            {(["all", "active", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-3 h-7 text-[12px] font-semibold capitalize transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {s === "all" ? `All (${stats.total})` : s === "active" ? `Active (${stats.active})` : `Archived (${stats.archived})`}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-[12.5px] text-foreground outline-none"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="tasks">Most tasks</option>
            <option value="completion">Highest completion</option>
            <option value="overdue">Most overdue</option>
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("rounded-md p-1.5 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              title="List view"
            >
              <LayoutList size={14} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => void refetch()}
            className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[13px] text-muted-foreground hover:text-foreground px-2"
              onClick={() => { setSearchText(""); setStatusFilter("all"); setSortBy("updated"); }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {allProjects.length === 0 ? (
        <EmptyState canCreate={canCreate} onOpen={() => setIsModalOpen(true)} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border">
          <Search size={24} className="text-muted-foreground/40 mb-3" />
          <p className="text-[14px] font-medium text-muted-foreground">No projects match your filters</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-[13px]"
            onClick={() => { setSearchText(""); setStatusFilter("all"); setSortBy("updated"); }}
          >
            Reset filters
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectGridCard
              key={project.id}
              project={project}
              onArchive={async () => {
                if (!confirm(`Archive "${project.name}"?`)) return;
                await archiveProject.mutateAsync(project.id);
              }}
              onRestore={async () => {
                await restoreProject.mutateAsync(project.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_80px_80px_100px_120px_44px] gap-0 border-b border-border/60 bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Project</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 text-right">Tasks</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 text-right">Done</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 text-right">Progress</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 text-right">Updated</span>
            <span />
          </div>
          <div className="divide-y divide-border/60">
            {visible.map((project) => (
              <ProjectListRow
                key={project.id}
                project={project}
                onArchive={async () => {
                  if (!confirm(`Archive "${project.name}"?`)) return;
                  await archiveProject.mutateAsync(project.id);
                }}
                onRestore={async () => {
                  await restoreProject.mutateAsync(project.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {canCreate && <CreateProjectModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

/* ── Stat Tile ─────────────────────────────────────────────── */

function StatTile({
  label, value, sub, icon: Icon, iconColor, iconBg, danger, progress,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  danger?: boolean;
  progress?: number;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200",
      danger && "border-red-200/60 dark:border-red-800/40"
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconBg ?? "bg-muted/50")}>
          <Icon size={14} className={iconColor ?? "text-muted-foreground/70"} />
        </div>
      </div>
      <p className={cn(
        "text-[28px] font-bold tracking-tight leading-none",
        danger ? "text-red-600 dark:text-red-400" : "text-foreground"
      )}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-medium">{sub}</p>
    </div>
  );
}

/* ── Project Grid Card ──────────────────────────────────────── */

function ProjectGridCard({
  project, onArchive, onRestore,
}: {
  project: Project;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const total     = project.task_count ?? 0;
  const completed = project.completed_task_count ?? 0;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue   = project.overdue_count ?? 0;
  const isAtRisk  = overdue >= 2;
  const isArchived = project.status === "archived";
  const [isExporting, setIsExporting] = useState<false | "csv" | "xlsx" | "pdf">(false);

  const health = overdue >= 2 ? "at-risk" : overdue >= 1 ? "warning" : "on-track";
  const healthColor = health === "at-risk" ? "text-red-600 dark:text-red-400" : health === "warning" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  const progressColor = health === "at-risk" ? "#dc2626" : health === "warning" ? "#d97706" : project.color || "#5B5EDE";

  const exportProject = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setIsExporting(format);
      const res = await api.get(`/projects/${project.id}/export/?format=${format}`, { responseType: "blob" });
      saveAs(res.data, `${project.name.replace(/\s+/g, "_").toLowerCase()}_export.${format}`);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn(
      "group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
      isAtRisk ? "border-red-200/70 dark:border-red-800/40" : "border-border"
    )}>
      {/* Color bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: project.color || "#5B5EDE" }} />

      <Link href={`/projects/${project.id}`} className="block p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${project.color || "#5B5EDE"}15` }}
            >
              {project.icon || "📋"}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-semibold truncate group-hover:text-primary transition-colors leading-tight">
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isArchived ? (
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Archived</span>
                ) : (
                  <span className={cn("text-[10.5px] font-semibold flex items-center gap-1", healthColor)}>
                    {health === "at-risk" ? <><AlertTriangle size={9} />At risk</> :
                     health === "warning" ? <><AlertTriangle size={9} />{overdue} overdue</> :
                     <><CheckCircle2 size={9} />On track</>}
                  </span>
                )}
              </div>
            </div>
          </div>
          <ArrowUpRight size={14} className="shrink-0 text-muted-foreground/20 group-hover:text-primary/50 transition-colors mt-1" />
        </div>

        {/* Description */}
        <p className="text-[12px] text-muted-foreground/70 line-clamp-2 min-h-[32px] leading-relaxed">
          {project.description || "No description provided"}
        </p>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-bold text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: progressColor }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase size={10} />
            {completed}/{total} tasks
          </span>
          <span className="flex items-center gap-1">
            <Users size={10} />
            {project.member_count ?? 0} members
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={10} />
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </span>
        </div>
      </Link>

      {/* Footer actions */}
      <div className="px-5 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
          <Link href={`/projects/${project.id}/reports`}>
            <TrendingUp size={11} className="mr-1" />Reports
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
            <Link href={`/projects/${project.id}/settings/permissions`}>
              <Settings size={11} className="mr-1" />Settings
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreHorizontal size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`} className="cursor-pointer">
                  <ArrowUpRight className="mr-2 h-3.5 w-3.5" />Open board
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("csv")}>
                <FileDown className="mr-2 h-3.5 w-3.5" />Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("xlsx")}>
                <FileDown className="mr-2 h-3.5 w-3.5" />Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("pdf")}>
                <FileDown className="mr-2 h-3.5 w-3.5" />Export PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {project.status === "archived" ? (
                <DropdownMenuItem onClick={() => void onRestore()}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />Restore project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => void onArchive()}
                >
                  <Archive className="mr-2 h-3.5 w-3.5" />Archive project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

/* ── Project List Row ───────────────────────────────────────── */

function ProjectListRow({
  project, onArchive, onRestore,
}: {
  project: Project;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const total     = project.task_count ?? 0;
  const completed = project.completed_task_count ?? 0;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue   = project.overdue_count ?? 0;
  const health    = overdue >= 2 ? "at-risk" : overdue >= 1 ? "warning" : "on-track";
  const [isExporting, setIsExporting] = useState<false | "csv" | "xlsx" | "pdf">(false);

  const exportProject = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setIsExporting(format);
      const res = await api.get(`/projects/${project.id}/export/?format=${format}`, { responseType: "blob" });
      saveAs(res.data, `${project.name.replace(/\s+/g, "_").toLowerCase()}_export.${format}`);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="group grid grid-cols-[1fr_80px_80px_100px_120px_44px] gap-0 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Name */}
      <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-primary transition-colors">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${project.color || "#5B5EDE"}20` }}
        >
          {project.icon || "📋"}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">{project.name}</p>
          {project.description && (
            <p className="text-[11px] text-muted-foreground/60 truncate">{project.description}</p>
          )}
        </div>
        {health === "at-risk" && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-0.5">
            <AlertTriangle size={9} />At risk
          </span>
        )}
      </Link>

      {/* Tasks */}
      <span className="text-[12.5px] text-foreground font-medium text-right tabular-nums">{total}</span>

      {/* Done */}
      <span className="text-[12.5px] text-emerald-600 dark:text-emerald-400 font-medium text-right tabular-nums">{completed}</span>

      {/* Progress bar */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[11.5px] font-bold text-foreground tabular-nums w-8 text-right">{pct}%</span>
        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: project.color || "#5B5EDE" }}
          />
        </div>
      </div>

      {/* Updated */}
      <span className="text-[11px] text-muted-foreground/60 text-right">
        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
      </span>

      {/* Actions */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`} className="cursor-pointer">
                <ArrowUpRight className="mr-2 h-3.5 w-3.5" />Open board
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/reports`} className="cursor-pointer">
                <TrendingUp className="mr-2 h-3.5 w-3.5" />Reports
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/settings/permissions`} className="cursor-pointer">
                <Settings className="mr-2 h-3.5 w-3.5" />Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("csv")}>
              <FileDown className="mr-2 h-3.5 w-3.5" />Export CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {project.status === "archived" ? (
              <DropdownMenuItem onClick={() => void onRestore()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />Restore project
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void onArchive()}
              >
                <Archive className="mr-2 h-3.5 w-3.5" />Archive project
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

function EmptyState({ canCreate, onOpen }: { canCreate: boolean | null | undefined; onOpen: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-border bg-muted/5">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <FolderKanban size={22} className="text-muted-foreground/50" />
      </div>
      {canCreate ? (
        <>
          <h3 className="text-[15px] font-semibold">Create your first project</h3>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
            Projects keep tasks, members, and updates organised in one place.
          </p>
          <Button onClick={onOpen} size="sm" className="mt-5 h-8 text-[13px] gap-1.5">
            <Plus size={14} />Create project
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-[15px] font-semibold">No projects yet</h3>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
            Ask your admin to create a project or add you to an existing one.
          </p>
        </>
      )}
    </div>
  );
}
