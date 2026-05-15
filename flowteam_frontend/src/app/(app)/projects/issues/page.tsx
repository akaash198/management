"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleCheck,
  Filter,
  FolderKanban,
  Layers,
  LayoutPanelTop,
  ListFilter,
  Plus,
  Save,
  Search,
  SquarePen,
  Star,
  Trash2,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { useProject, useProjects } from "@/hooks/useProjects";
import { useDeleteTask, useTasks } from "@/hooks/useTasks";
import { useBulkUpdateTasks, useCreateSavedIssueView, useSavedIssueViews, useSprints } from "@/hooks/usePlanning";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectIssueModal } from "@/components/projects/ProjectIssueModal";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { Task, TaskFilters } from "@/types/task";
import { format, isToday, isPast } from "date-fns";

type StatusFilter = "all" | "open" | "done";
type PriorityFilter = "all" | "urgent" | "high" | "normal" | "low";
type DueFilter = "all" | "overdue" | "today" | "this_week";
type GroupBy = "none" | "project" | "priority" | "assignee" | "sprint";

// ─── priority config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", icon: Zap, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", dot: "bg-destructive" },
  high: { label: "High", icon: TriangleAlert, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", dot: "bg-warning" },
  normal: { label: "Normal", icon: Circle, color: "text-info", bg: "bg-info/10", border: "border-info/30", dot: "bg-info" },
  low: { label: "Low", icon: ChevronDown, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", dot: "bg-muted-foreground/40" },
} as const;

const ISSUE_TYPE_CONFIG = {
  epic: { icon: Layers, color: "text-purple-500", bg: "bg-purple-500/10" },
  story: { icon: Star, color: "text-blue-500", bg: "bg-blue-500/10" },
  task: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  bug: { icon: Bug, color: "text-destructive", bg: "bg-destructive/10" },
  subtask: { icon: CircleCheck, color: "text-muted-foreground", bg: "bg-muted/50" },
} as const;

// ─── main page ────────────────────────────────────────────────────────────────

export default function ProjectIssuesPage() {
  const { user } = useAuthStore();
  const { teams, activeTeamId, fetchTeams } = useTeamStore();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkSprintId, setBulkSprintId] = useState("");
  const [bulkColumnId, setBulkColumnId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const { data: projects = [], isLoading: projectsLoading } = useProjects(activeTeamId ?? undefined, !!user?.is_superuser, "active");
  const { data: sprints = [] } = useSprints({ teamId: activeTeamId ?? undefined });
  const { data: savedViews = [] } = useSavedIssueViews(activeTeamId ?? undefined);
  const createSavedView = useCreateSavedIssueView();
  const { data: selectedProjectDetail } = useProject(projectId || "");

  const filters = useMemo<TaskFilters>(() => ({
    ...(activeTeamId ? { team_id: activeTeamId } : {}),
    ...(projectId ? { project_id: projectId } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(priority !== "all" ? { priority } : {}),
    ...(due !== "all" ? { due } : {}),
    ...(assigneeId ? { assignee_id: assigneeId } : {}),
    ...(sprintId ? { sprint_id: sprintId } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  }), [activeTeamId, assigneeId, due, priority, projectId, search, sprintId, status]);

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(filters);
  const deleteTask = useDeleteTask();
  const bulkUpdateTasks = useBulkUpdateTasks();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["project-issues-team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const response = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return response.data.data ?? [];
    },
    enabled: !!activeTeamId,
  });

  const stats = useMemo(() => {
    const overdue = tasks.filter((t) => t.is_overdue).length;
    const unassigned = tasks.filter((t) => !t.assignee).length;
    const urgent = tasks.filter((t) => t.priority === "urgent").length;
    const done = tasks.filter((t) => {
      const col = (t.column_name ?? "").toLowerCase();
      return col === "done" || col === "complete" || col === "completed";
    }).length;
    return { total: tasks.length, overdue, unassigned, urgent, done };
  }, [tasks]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search.trim()) chips.push({ key: "search", label: `"${search.trim()}"`, clear: () => setSearch("") });
    if (projectId) {
      const p = projects.find((x) => x.id === projectId);
      chips.push({ key: "project", label: p?.name ?? "Project", clear: () => setProjectId("") });
    }
    if (status !== "all") chips.push({ key: "status", label: status === "open" ? "Open" : "Done", clear: () => setStatus("all") });
    if (priority !== "all") chips.push({ key: "priority", label: PRIORITY_CONFIG[priority]?.label ?? priority, clear: () => setPriority("all") });
    if (due !== "all") chips.push({ key: "due", label: due === "overdue" ? "Overdue" : due === "today" ? "Due today" : "This week", clear: () => setDue("all") });
    if (assigneeId) {
      const m = teamMembers.find((x) => x.user.id === assigneeId);
      chips.push({ key: "assignee", label: m?.user.full_name ?? "Assignee", clear: () => setAssigneeId("") });
    }
    if (sprintId) {
      const s = sprints.find((x) => x.id === sprintId);
      chips.push({ key: "sprint", label: s?.name ?? "Sprint", clear: () => setSprintId("") });
    }
    return chips;
  }, [search, projectId, projects, status, priority, due, assigneeId, teamMembers, sprintId, sprints]);

  const clearAllFilters = useCallback(() => {
    setSearch(""); setProjectId(""); setStatus("all"); setPriority("all");
    setDue("all"); setAssigneeId(""); setSprintId("");
  }, []);

  const applySavedView = (viewId: string) => {
    const selected = savedViews.find((v) => v.id === viewId);
    if (!selected) return;
    const next = selected.filters as Record<string, string>;
    setSearch(next.search || "");
    setProjectId(next.projectId || "");
    setStatus((next.status as StatusFilter) || "all");
    setPriority((next.priority as PriorityFilter) || "all");
    setDue((next.due as DueFilter) || "all");
    setAssigneeId(next.assigneeId || "");
    setSprintId(next.sprintId || "");
  };

  const handleSaveView = async () => {
    if (!activeTeamId || !saveViewName.trim()) return;
    await createSavedView.mutateAsync({
      team: activeTeamId,
      name: saveViewName.trim(),
      filters: { search, projectId, status, priority, due, assigneeId, sprintId },
      is_shared: true,
    });
    setSaveViewOpen(false);
    setSaveViewName("");
  };

  const handleBulkApply = async () => {
    if (selectedTaskIds.length === 0) return;
    const updates: { priority?: string; sprint?: string | null; column?: string } = {};
    if (bulkPriority) updates.priority = bulkPriority;
    if (bulkSprintId) updates.sprint = bulkSprintId;
    if (bulkColumnId) updates.column = bulkColumnId;
    if (Object.keys(updates).length === 0) return;
    await bulkUpdateTasks.mutateAsync({ task_ids: selectedTaskIds, updates });
    setSelectedTaskIds([]);
    setBulkPriority(""); setBulkSprintId(""); setBulkColumnId("");
  };

  const allVisibleSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;

  // Group tasks
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ label: "", tasks }];
    if (groupBy === "project") {
      const map = new Map<string, { label: string; color: string; tasks: Task[] }>();
      for (const t of tasks) {
        const key = t.project;
        if (!map.has(key)) map.set(key, { label: t.project_name ?? "Unknown", color: t.project_color ?? "#6366f1", tasks: [] });
        map.get(key)!.tasks.push(t);
      }
      return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
    if (groupBy === "priority") {
      const order = ["urgent", "high", "normal", "low"];
      const map = new Map<string, { label: string; tasks: Task[] }>();
      for (const p of order) map.set(p, { label: PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.label ?? p, tasks: [] });
      for (const t of tasks) { map.get(t.priority)?.tasks.push(t); }
      return [...map.values()];
    }
    if (groupBy === "assignee") {
      const map = new Map<string, { label: string; tasks: Task[] }>();
      for (const t of tasks) {
        const key = t.assignee?.id ?? "__unassigned__";
        const label = t.assignee?.full_name ?? "Unassigned";
        if (!map.has(key)) map.set(key, { label, tasks: [] });
        map.get(key)!.tasks.push(t);
      }
      return [...map.values()].sort((a, b) => {
        if (a.label === "Unassigned") return 1;
        if (b.label === "Unassigned") return -1;
        return a.label.localeCompare(b.label);
      });
    }
    if (groupBy === "sprint") {
      const map = new Map<string, { label: string; tasks: Task[] }>();
      map.set("__backlog__", { label: "Backlog", tasks: [] });
      for (const t of tasks) {
        const key = t.sprint ?? "__backlog__";
        const label = t.sprint_name ?? "Backlog";
        if (!map.has(key)) map.set(key, { label, tasks: [] });
        map.get(key)!.tasks.push(t);
      }
      return [...map.values()];
    }
    return [{ label: "", tasks }];
  }, [groupBy, tasks]);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const isLoading = projectsLoading || tasksLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── header ── */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <ListFilter size={17} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-foreground leading-none">Issue Navigator</h1>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {activeTeam ? activeTeam.name : "All teams"} · {isLoading ? "loading…" : `${tasks.length} issue${tasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedViews.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => applySavedView(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-3 text-[12px] text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Saved views</option>
                {savedViews.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setSaveViewOpen(true)}>
              <Save size={13} />
              Save view
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-muted-foreground">
              <Link href="/projects">
                <FolderKanban size={13} />
                Projects
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-muted-foreground">
              <Link href="/projects/planning">
                <LayoutPanelTop size={13} />
                Planning
              </Link>
            </Button>
            <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setIsCreateOpen(true)}>
              <Plus size={14} />
              Create issue
            </Button>
          </div>
        </div>

        {/* ── stats strip ── */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <StatChip label="Total" value={stats.total} />
          <StatChip label="Urgent" value={stats.urgent} accent="error" />
          <StatChip label="Overdue" value={stats.overdue} accent="warning" />
          <StatChip label="Unassigned" value={stats.unassigned} accent="muted" />
          <StatChip label="Done" value={stats.done} accent="success" />
        </div>
      </div>

      {/* ── filter bar ── */}
      <div className="shrink-0 border-b border-border bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[220px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="h-8 pl-8 text-[12px] bg-card"
            />
          </div>

          <FilterChip label="Project" value={projectId} onChange={(v) => setProjectId(v)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FilterChip>

          <FilterChip label="Status" value={status} onChange={(v) => setStatus(v as StatusFilter)}>
            <option value="all">Any status</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </FilterChip>

          <FilterChip label="Priority" value={priority} onChange={(v) => setPriority(v as PriorityFilter)}>
            <option value="all">Any priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </FilterChip>

          <FilterChip label="Due" value={due} onChange={(v) => setDue(v as DueFilter)}>
            <option value="all">Any date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this_week">This week</option>
          </FilterChip>

          <FilterChip label="Sprint" value={sprintId} onChange={(v) => setSprintId(v)}>
            <option value="">All sprints</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FilterChip>

          <FilterChip label="Assignee" value={assigneeId} onChange={(v) => setAssigneeId(v)}>
            <option value="">All assignees</option>
            {teamMembers.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>)}
          </FilterChip>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">Group by</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="none">None</option>
              <option value="project">Project</option>
              <option value="priority">Priority</option>
              <option value="assignee">Assignee</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>
        </div>

        {/* active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              <Filter size={11} className="inline mr-1" />
              Filters:
            </span>
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="inline-flex items-center gap-1 h-6 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {chip.label}
                <X size={10} />
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 h-6 rounded-full border border-border bg-muted/50 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── bulk actions ── */}
      {selectedTaskIds.length > 0 && (
        <div className="shrink-0 border-b border-primary/20 bg-primary/5 px-6 py-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-semibold text-primary">
              {selectedTaskIds.length} selected
            </span>
            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value)}
              className="h-7 rounded-lg border border-border bg-card px-2.5 text-[11px] text-foreground focus:outline-none"
            >
              <option value="">Set priority…</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select
              value={bulkSprintId}
              onChange={(e) => setBulkSprintId(e.target.value)}
              className="h-7 rounded-lg border border-border bg-card px-2.5 text-[11px] text-foreground focus:outline-none"
            >
              <option value="">Move to sprint…</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={bulkColumnId}
              onChange={(e) => setBulkColumnId(e.target.value)}
              className="h-7 rounded-lg border border-border bg-card px-2.5 text-[11px] text-foreground focus:outline-none"
            >
              <option value="">Move to column…</option>
              {(selectedProjectDetail?.columns ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => void handleBulkApply()} disabled={bulkUpdateTasks.isPending || (!bulkPriority && !bulkSprintId && !bulkColumnId)}>
              Apply
            </Button>
            <BulkMarkComplete
              selectedIds={selectedTaskIds}
              doneColumnId={selectedProjectDetail?.columns.find((c) => c.is_done_column)?.id ?? null}
              onClearSelection={() => setSelectedTaskIds([])}
            />
            <button
              onClick={() => setSelectedTaskIds([])}
              className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* ── table ── */}
      <div className="flex-1 overflow-auto">
        {/* table header */}
        <div className="sticky top-0 z-10 grid grid-cols-[40px_100px_1fr_160px_130px_110px_140px_130px_120px] gap-0 border-b border-border bg-muted/40 backdrop-blur px-4 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center py-2.5 px-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => setSelectedTaskIds(e.target.checked ? tasks.map((t) => t.id) : [])}
              className="accent-primary h-3.5 w-3.5"
            />
          </div>
          <div className="flex items-center py-2.5 px-2">ID</div>
          <div className="flex items-center py-2.5 px-2">Summary</div>
          <div className="flex items-center py-2.5 px-2">Project</div>
          <div className="flex items-center py-2.5 px-2">Status</div>
          <div className="flex items-center py-2.5 px-2">Priority</div>
          <div className="flex items-center py-2.5 px-2">Sprint</div>
          <div className="flex items-center py-2.5 px-2">Assignee</div>
          <div className="flex items-center py-2.5 px-2">Due</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-[13px] text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-3" />
            Loading issues…
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState hasFilters={activeFilters.length > 0} onClear={clearAllFilters} onCreate={() => setIsCreateOpen(true)} />
        ) : (
          grouped.map((group, gi) => (
            <IssueGroup
              key={gi}
              label={group.label}
              color={"color" in group ? (group as { color: string }).color : undefined}
              tasks={group.tasks}
              selectedTaskIds={selectedTaskIds}
              onSelect={(id, checked) => setSelectedTaskIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id))}
              onEdit={setEditingTask}
              onDelete={(task) => {
                if (!confirm(`Delete "${task.title}"?`)) return;
                deleteTask.mutate(task.id);
              }}
            />
          ))
        )}
      </div>

      {/* ── modals ── */}
      <ProjectIssueModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projects={projects}
        teamMembers={teamMembers}
        defaultProjectId={projectId || undefined}
      />
      <ProjectIssueModal
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        projects={projects}
        teamMembers={teamMembers}
        task={editingTask}
      />

      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">View name</label>
            <Input
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              placeholder="e.g. My open urgent bugs"
              className="text-[13px]"
              onKeyDown={(e) => { if (e.key === "Enter") void handleSaveView(); }}
              autoFocus
            />
            {activeFilters.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Will save: {activeFilters.map((f) => f.label).join(", ")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveViewOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void handleSaveView()} disabled={!saveViewName.trim() || createSavedView.isPending}>
              {createSavedView.isPending ? "Saving…" : "Save view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: number; accent?: "error" | "warning" | "muted" | "success" }) {
  const textColor = accent === "error" ? "text-destructive" : accent === "warning" ? "text-warning" : accent === "success" ? "text-success" : accent === "muted" ? "text-muted-foreground" : "text-primary";
  const borderColor = accent === "error" ? "border-destructive/20" : accent === "warning" ? "border-warning/20" : accent === "success" ? "border-success/20" : "border-border";
  return (
    <div className={cn("flex items-center gap-2 h-7 rounded-full border bg-card/80 px-3 text-[11.5px]", borderColor)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold tabular-nums", textColor)}>{value}</span>
    </div>
  );
}

function FilterChip({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const isActive = !!value && value !== "all";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 appearance-none rounded-lg border px-3 pr-7 text-[12px] focus:outline-none focus:border-primary transition-colors cursor-pointer",
          isActive
            ? "border-primary/40 bg-primary/10 text-primary font-medium"
            : "border-border bg-card text-foreground"
        )}
      >
        {children}
      </select>
      <ChevronDown size={11} className={cn("pointer-events-none absolute right-2 top-1/2 -translate-y-1/2", isActive ? "text-primary" : "text-muted-foreground")} />
    </div>
  );
}

function IssueGroup({
  label,
  color,
  tasks,
  selectedTaskIds,
  onSelect,
  onEdit,
  onDelete,
}: {
  label: string;
  color?: string;
  tasks: Task[];
  selectedTaskIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div>
      {label && (
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 w-full px-4 py-2 bg-muted/20 border-b border-border hover:bg-muted/40 transition-colors text-left"
        >
          <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
          {color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
          <span className="text-[12px] font-semibold text-foreground">{label}</span>
          <span className="text-[11px] text-muted-foreground ml-1">({tasks.length})</span>
        </button>
      )}
      {!collapsed && tasks.map((task) => (
        <IssueRow
          key={task.id}
          task={task}
          selected={selectedTaskIds.includes(task.id)}
          onSelect={(checked) => onSelect(task.id, checked)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
        />
      ))}
    </div>
  );
}

function IssueRow({ task, selected, onSelect, onEdit, onDelete }: {
  task: Task;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const shortId = `FT-${task.id.split("-")[0].toUpperCase()}`;
  const typeKey = (task.issue_type ?? "task") as keyof typeof ISSUE_TYPE_CONFIG;
  const TypeIcon = ISSUE_TYPE_CONFIG[typeKey]?.icon ?? CheckCircle2;
  const typeColor = ISSUE_TYPE_CONFIG[typeKey]?.color ?? "text-muted-foreground";
  const typeBg = ISSUE_TYPE_CONFIG[typeKey]?.bg ?? "bg-muted/50";

  const priorityKey = task.priority as keyof typeof PRIORITY_CONFIG;
  const PriIcon = PRIORITY_CONFIG[priorityKey]?.icon ?? Circle;
  const priColor = PRIORITY_CONFIG[priorityKey]?.color ?? "text-muted-foreground";

  const dueDateStr = task.due_date;
  const dueLabel = useMemo(() => {
    if (!dueDateStr) return null;
    try {
      const d = new Date(dueDateStr);
      if (isToday(d)) return { text: "Today", warn: true };
      if (isPast(d)) return { text: format(d, "MMM d"), warn: true };
      return { text: format(d, "MMM d"), warn: false };
    } catch { return null; }
  }, [dueDateStr]);

  return (
    <div className={cn(
      "grid grid-cols-[40px_100px_1fr_160px_130px_110px_140px_130px_120px] gap-0 border-b border-border/60 px-4 text-[12.5px] transition-colors group",
      selected ? "bg-primary/5" : "hover:bg-muted/20"
    )}>
      {/* checkbox */}
      <div className="flex items-center py-3 px-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="accent-primary h-3.5 w-3.5"
        />
      </div>

      {/* ID */}
      <div className="flex items-center py-3 px-2">
        <div className={cn("flex items-center justify-center h-6 w-6 rounded-md mr-2 shrink-0", typeBg)}>
          <TypeIcon size={11} className={typeColor} />
        </div>
        <span className="text-[11px] font-mono font-semibold text-muted-foreground">{shortId}</span>
      </div>

      {/* summary */}
      <div className="flex items-center py-3 px-2 min-w-0">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.is_overdue && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-destructive font-medium">
                <AlertTriangle size={10} />
                Overdue
              </span>
            )}
            {task.labels?.length > 0 && (
              <div className="flex items-center gap-1">
                {task.labels.slice(0, 2).map((label) => (
                  <span key={label.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} title={label.name} />
                ))}
              </div>
            )}
            {task.subtasks_count > 0 && (
              <span className="text-[10.5px] text-muted-foreground/60">{task.subtasks_count} subtasks</span>
            )}
          </div>
        </div>
      </div>

      {/* project */}
      <div className="flex items-center py-3 px-2 min-w-0">
        <span
          className="h-2 w-2 rounded-full mr-2 shrink-0"
          style={{ backgroundColor: task.project_color ?? "#6366f1" }}
        />
        <span className="truncate text-[12px] text-muted-foreground">{task.project_name ?? "—"}</span>
      </div>

      {/* status */}
      <div className="flex items-center py-3 px-2">
        <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground font-medium truncate max-w-full">
          {task.column_name ?? "Unknown"}
        </span>
      </div>

      {/* priority */}
      <div className="flex items-center py-3 px-2">
        <span className={cn("inline-flex items-center gap-1", priColor)}>
          <PriIcon size={13} />
          <span className="text-[11px] font-medium capitalize">{task.priority}</span>
        </span>
      </div>

      {/* sprint */}
      <div className="flex items-center py-3 px-2 min-w-0">
        <span className="truncate text-[12px] text-muted-foreground">{task.sprint_name ?? "Backlog"}</span>
      </div>

      {/* assignee */}
      <div className="flex items-center py-3 px-2 min-w-0">
        {task.assignee ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 text-[9px] font-bold text-primary-foreground">
              {task.assignee.full_name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <span className="truncate text-[12px] text-muted-foreground">{task.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-[12px] text-muted-foreground/50">Unassigned</span>
        )}
      </div>

      {/* due date + actions */}
      <div className="flex items-center py-3 px-2 gap-1.5">
        {dueLabel && (
          <span className={cn("text-[11px] font-medium", dueLabel.warn ? "text-destructive" : "text-muted-foreground")}>
            {dueLabel.text}
          </span>
        )}
        {!dueLabel && <span className="text-[11px] text-muted-foreground/40">—</span>}

        {/* inline actions on hover */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit"
          >
            <SquarePen size={12} />
          </button>
          <Link
            href={`/projects/${task.project}?task=${task.id}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Open in project"
          >
            <ArrowUpRight size={12} />
          </Link>
          <button
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkMarkComplete({ selectedIds, doneColumnId, onClearSelection }: {
  selectedIds: string[];
  doneColumnId: string | null;
  onClearSelection: () => void;
}) {
  const bulkUpdateTasks = useBulkUpdateTasks();

  const handle = async () => {
    if (!doneColumnId || selectedIds.length === 0) return;
    await bulkUpdateTasks.mutateAsync({ task_ids: selectedIds, updates: { column: doneColumnId } });
    onClearSelection();
  };

  if (!doneColumnId) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-[11px] border-success/30 text-success hover:bg-success/10 hover:border-success/50"
      onClick={() => void handle()}
      disabled={selectedIds.length === 0 || bulkUpdateTasks.isPending}
    >
      <CheckCircle2 size={13} className="mr-1.5" />
      {bulkUpdateTasks.isPending ? "Marking…" : `Mark ${selectedIds.length} done`}
    </Button>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }: { hasFilters: boolean; onClear: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
        <ListFilter size={24} className="text-muted-foreground" />
      </div>
      <p className="text-[15px] font-semibold text-foreground">
        {hasFilters ? "No issues match these filters" : "No issues yet"}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try removing some filters to see more results."
          : "Create your first issue to start tracking work."}
      </p>
      <div className="mt-5 flex items-center gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClear}>Clear filters</Button>
        )}
        <Button size="sm" onClick={onCreate}>
          <Plus size={14} className="mr-1.5" />
          Create issue
        </Button>
      </div>
    </div>
  );
}
