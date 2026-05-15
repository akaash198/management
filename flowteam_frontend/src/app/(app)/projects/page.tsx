"use client";

import { useDeleteProject, useProjects, useRestoreProject } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Briefcase, Users, Search,
  CheckCircle2, AlertTriangle, ArrowUpRight,
  FolderKanban, TrendingUp, MoreHorizontal, FileDown, Settings,
  LayoutList,
  LayoutPanelTop,
  ShieldCheck,
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

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "tasks" | "completion">("updated");
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

  const { data: projects, isLoading } = useProjects(activeTeamId ?? undefined, user?.is_superuser, statusFilter);
  const allProjects = useMemo(() => projects ?? [], [projects]);

  const stats = useMemo(() => {
    const total     = allProjects.length;
    const active    = allProjects.filter((p) => p.status === "active").length;
    const archived  = allProjects.filter((p) => p.status === "archived").length;
    const totalT    = allProjects.reduce((s, p) => s + (p.task_count ?? 0), 0);
    const completedT = allProjects.reduce((s, p) => s + (p.completed_task_count ?? 0), 0);
    const overdue   = allProjects.reduce((s, p) => s + (p.overdue_count ?? 0), 0);
    const pct       = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
    return { total, active, archived, totalT, completedT, overdue, pct };
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
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [allProjects, searchText, statusFilter, sortBy]);

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
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="relative">
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5 max-w-lg">
            Manage your team&apos;s workflows, monitor progress, and deliver high-quality results.
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/operations">
                <ShieldCheck size={14} />
                Operations hub
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/planning">
                <LayoutPanelTop size={14} />
                Planning hub
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/issues">
                <LayoutList size={14} />
                Issue navigator
              </Link>
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="h-8 px-3 text-[13px] gap-1.5"
            >
              <Plus size={14} />
              New project
            </Button>
          </div>
        )}
        {!canCreate && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/operations">
                <ShieldCheck size={14} />
                Operations hub
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/planning">
                <LayoutPanelTop size={14} />
                Planning hub
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-[13px] gap-1.5">
              <Link href="/projects/issues">
                <LayoutList size={14} />
                Issue navigator
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── Stat strip ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total projects" value={stats.total} sub={`${stats.active} active · ${stats.archived} archived`} icon={FolderKanban} />
        <StatTile label="Total tasks"    value={stats.totalT} sub={`${stats.completedT} completed`} icon={Briefcase} />
        <StatTile label="Completion"     value={`${stats.pct}%`} sub="Across all projects" icon={TrendingUp} />
        <StatTile
          label="Overdue tasks"
          value={stats.overdue}
          sub="Past due date"
          icon={AlertTriangle}
          danger={stats.overdue > 0}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search projects…"
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "archived")}
          className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "updated" | "name" | "tasks" | "completion")}
          className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground"
          aria-label="Sort"
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="tasks">Most tasks</option>
          <option value="completion">Highest completion</option>
        </select>
        {(searchText || statusFilter !== "all" || sortBy !== "updated") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => { setSearchText(""); setStatusFilter("all"); setSortBy("updated"); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* ── Grid ── */}
      {allProjects.length === 0 ? (
        <EmptyState canCreate={canCreate} onOpen={() => setIsModalOpen(true)} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border">
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
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
      )}

      {canCreate && <CreateProjectModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function StatTile({
  label, value, sub, icon: Icon, danger,
}: { label: string; value: string | number; sub: string; icon: LucideIcon; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
        <div className={cn("p-1.5 rounded-lg bg-muted/50", danger && "bg-destructive/10")}>
          <Icon size={14} className={cn("text-muted-foreground/70", danger && "text-destructive")} />
        </div>
      </div>
      <p className={cn("text-[26px] font-bold tracking-tight text-foreground", danger && "text-destructive")}>{value}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function ProjectCard({
  project,
  onArchive,
  onRestore,
}: {
  project: Project;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const total     = project.task_count ?? 0;
  const completed = project.completed_task_count ?? 0;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const [isExporting, setIsExporting] = useState<false | "csv" | "xlsx" | "pdf">(false);

  const exportProject = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setIsExporting(format);
      const res = await api.get(`/projects/${project.id}/export/?format=${format}`, { responseType: "blob" });
      const extension = format === "xlsx" ? "xlsx" : format;
      saveAs(res.data, `${project.name.replace(/\s+/g, "_").toLowerCase()}_export.${extension}`);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <Link href={`/projects/${project.id}`} className="block">
        <div className="h-[3px] w-full" style={{ backgroundColor: project.color || "#5B5EDE" }} />
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                {project.icon || "📋"}
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-0.5 h-4 px-1.5 text-[9px] font-semibold uppercase border-border text-muted-foreground/70 bg-transparent"
                >
                  {project.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-border text-muted-foreground/70">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </Badge>
              <ArrowUpRight
                size={14}
                className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0 mt-0.5"
              />
            </div>
          </div>

          {/* Description */}
          <p className="text-[12px] text-muted-foreground line-clamp-2 min-h-[32px]">
            {project.description || "No description provided"}
          </p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: project.color || "#5B5EDE" }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase size={11} /> {project.task_count ?? 0} tasks
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} /> {project.member_count ?? 0}
              </span>
            </div>
            <span className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              (project.overdue_count ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {(project.overdue_count ?? 0) > 0 ? (
                <><AlertTriangle size={11} /> {project.overdue_count} overdue</>
              ) : (
                <><CheckCircle2 size={11} /> On track</>
              )}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-5 pb-4 -mt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            Team size: <span className="font-medium text-foreground">{project.member_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
              <Link href={`/projects/${project.id}/reports`}>Reports</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}`} className="cursor-pointer">Open board</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}/settings/permissions`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Permissions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("csv")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("xlsx")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!!isExporting} onClick={() => void exportProject("pdf")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {project.status === "archived" ? (
                  <DropdownMenuItem onClick={() => void onRestore()}>
                    Restore project
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void onArchive()}
                  >
                    Archive project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ canCreate, onOpen }: { canCreate: boolean | null | undefined; onOpen: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-border">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Briefcase size={20} className="text-muted-foreground/60" />
      </div>
      {canCreate ? (
        <>
          <h3 className="text-[15px] font-semibold">Create your first project</h3>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xs">
            Projects keep tasks, members, and updates organised in one place.
          </p>
          <Button onClick={onOpen} size="sm" className="mt-5 h-8 text-[13px] gap-1.5">
            <Plus size={14} /> Create project
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-[15px] font-semibold">No projects yet</h3>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xs">
            Ask your admin to create a project or add you to an existing one.
          </p>
        </>
      )}
    </div>
  );
}
