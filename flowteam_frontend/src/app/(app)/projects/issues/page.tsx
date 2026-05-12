"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare,
  Filter,
  FolderKanban,
  LayoutPanelTop,
  Plus,
  Save,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useProject, useProjects } from "@/hooks/useProjects";
import { useDeleteTask, useTasks } from "@/hooks/useTasks";
import { useBulkUpdateTasks, useCreateSavedIssueView, useSavedIssueViews, useSprints } from "@/hooks/usePlanning";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectIssueModal } from "@/components/projects/ProjectIssueModal";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { Task, TaskFilters } from "@/types/task";

type StatusFilter = "all" | "open" | "done";
type PriorityFilter = "all" | "urgent" | "high" | "normal" | "low";
type DueFilter = "all" | "overdue" | "today" | "this_week";

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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkSprintId, setBulkSprintId] = useState("");
  const [bulkColumnId, setBulkColumnId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    const overdue = tasks.filter((task) => task.is_overdue).length;
    const unassigned = tasks.filter((task) => !task.assignee).length;
    const urgent = tasks.filter((task) => task.priority === "urgent").length;
    return { total: tasks.length, overdue, unassigned, urgent };
  }, [tasks]);

  const activeFiltersCount = [projectId, assigneeId, search.trim(), sprintId].filter(Boolean).length
    + [status !== "all", priority !== "all", due !== "all"].filter(Boolean).length;

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;

  const handleSaveView = async () => {
    if (!activeTeamId) return;
    const name = window.prompt("Saved view name");
    if (!name) return;
    await createSavedView.mutateAsync({
      team: activeTeamId,
      name,
      filters: {
        search,
        projectId,
        status,
        priority,
        due,
        assigneeId,
        sprintId,
      },
      is_shared: true,
    });
  };

  const applySavedView = (viewId: string) => {
    const selected = savedViews.find((view) => view.id === viewId);
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

  const handleBulkApply = async () => {
    if (selectedTaskIds.length === 0) return;
    const updates: { priority?: string; sprint?: string | null; column?: string } = {};
    if (bulkPriority) updates.priority = bulkPriority;
    if (bulkSprintId) updates.sprint = bulkSprintId;
    if (bulkColumnId) updates.column = bulkColumnId;
    if (Object.keys(updates).length === 0) return;
    await bulkUpdateTasks.mutateAsync({ task_ids: selectedTaskIds, updates });
    setSelectedTaskIds([]);
  };

  const allVisibleSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;

  return (
    <div className="p-6 max-w-[1480px] mx-auto space-y-6">
      <section className="surface p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <span className="tag tag-mint">
              Jira-style delivery view
            </span>
            <div>
              <h1 className="text-heading text-[22px] font-bold">Project issues</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-muted-foreground">
                A single issue navigator across active projects with saved views, bulk actions, sprint assignment, and issue relationships.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm" className="h-8 text-[12px]">
                <Link href="/projects">
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                  Back to projects
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="h-8 text-[12px]">
                <Link href="/projects/planning">
                  <LayoutPanelTop className="mr-1.5 h-3.5 w-3.5" />
                  Planning hub
                </Link>
              </Button>
              {activeTeam && (
                <span className="inline-flex h-8 items-center rounded-md border border-border bg-card/50 px-3 text-[12px] font-medium text-muted-foreground">
                  Team: {activeTeam.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <StatCard label="Visible issues" value={stats.total} />
            <StatCard label="Urgent" value={stats.urgent} accent="error" />
            <StatCard label="Overdue" value={stats.overdue} accent="warning" />
            <StatCard label="Unassigned" value={stats.unassigned} accent="muted" />
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight">Issue navigator</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Filter like Jira, save views for reuse, and batch-edit issues into the right sprint or workflow column.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                defaultValue=""
                onChange={(event) => applySavedView(event.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-3 text-[12px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-300"
              >
                <option value="">Open saved view</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
              <Button variant="secondary" size="sm" className="h-8 text-[12px]" onClick={() => void handleSaveView()}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save current view
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-8 text-[12px]">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create issue
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border px-6 py-4 lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search summary or description" className="pl-9 text-[13px]" />
          </div>
          <FilterSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </FilterSelect>
          <FilterSelect value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All workflow states</option>
            <option value="open">Open issues</option>
            <option value="done">Done issues</option>
          </FilterSelect>
          <FilterSelect value={priority} onChange={(e) => setPriority(e.target.value as PriorityFilter)}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </FilterSelect>
          <FilterSelect value={due} onChange={(e) => setDue(e.target.value as DueFilter)}>
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this_week">Due this week</option>
          </FilterSelect>
          <FilterSelect value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
            <option value="">All sprints</option>
            {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </FilterSelect>
          <FilterSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">All assignees</option>
            {teamMembers.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.full_name}</option>)}
          </FilterSelect>
        </div>

        <div className="flex flex-col gap-3 border-b border-border px-6 py-3 text-[12px] text-muted-foreground xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            {activeFiltersCount > 0 ? `${activeFiltersCount} filters active` : "No filters applied"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 text-[11px] font-medium text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedTaskIds.length} selected
            </span>
            <FilterSelect value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="h-8 text-[11px]">
              <option value="">Bulk priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </FilterSelect>
            <FilterSelect value={bulkSprintId} onChange={(e) => setBulkSprintId(e.target.value)} className="h-8 text-[11px]">
              <option value="">Move to sprint</option>
              {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
            </FilterSelect>
            <FilterSelect value={bulkColumnId} onChange={(e) => setBulkColumnId(e.target.value)} className="h-8 text-[11px]">
              <option value="">Move to column</option>
              {(selectedProjectDetail?.columns ?? []).map((column) => (
                <option key={column.id} value={column.id}>{column.name}</option>
              ))}
            </FilterSelect>
            <Button variant="secondary" size="sm" className="h-8 text-[11px]" onClick={() => void handleBulkApply()} disabled={selectedTaskIds.length === 0 || bulkUpdateTasks.isPending}>
              Apply bulk update
            </Button>
            <BulkMarkComplete
              selectedIds={selectedTaskIds}
              doneColumnId={selectedProjectDetail?.columns.find((c) => c.is_done_column)?.id ?? null}
              onClearSelection={() => setSelectedTaskIds([])}
            />
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => {
                  setSearch("");
                  setProjectId("");
                  setStatus("all");
                  setPriority("all");
                  setDue("all");
                  setAssigneeId("");
                  setSprintId("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1320px]">
            <div className="grid grid-cols-[48px_110px_1.8fr_170px_120px_120px_150px_150px_170px] gap-3 border-b border-border bg-muted/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => setSelectedTaskIds(event.target.checked ? tasks.map((task) => task.id) : [])}
                  className="accent-primary"
                />
              </div>
              <div>Issue</div>
              <div>Summary</div>
              <div>Project</div>
              <div>Status</div>
              <div>Priority</div>
              <div>Sprint</div>
              <div>Assignee</div>
              <div>Actions</div>
            </div>

            {projectsLoading || tasksLoading ? (
              <div className="px-6 py-16 text-center text-[13px] text-muted-foreground">Loading issues...</div>
            ) : tasks.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[14px] font-medium text-foreground">No issues match the current filters.</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Try widening the filters or create a new issue.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <IssueRow
                  key={task.id}
                  task={task}
                  selected={selectedTaskIds.includes(task.id)}
                  onSelect={(checked) => {
                    setSelectedTaskIds((current) => checked ? [...new Set([...current, task.id])] : current.filter((id) => id !== task.id));
                  }}
                  onEdit={() => setEditingTask(task)}
                  onDelete={() => {
                    if (!confirm(`Delete "${task.title}"?`)) return;
                    deleteTask.mutate(task.id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <ProjectIssueModal open={isCreateOpen} onOpenChange={setIsCreateOpen} projects={projects} teamMembers={teamMembers} defaultProjectId={projectId || undefined} />
      <ProjectIssueModal
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        projects={projects}
        teamMembers={teamMembers}
        task={editingTask}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "error" | "warning" | "muted" }) {
  const borderColor = accent === "error" ? "border-destructive/30" : accent === "warning" ? "border-warning/30" : accent === "muted" ? "border-border" : "border-primary/20";
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-md", borderColor)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-[24px] font-bold tracking-tight", accent === "error" && "text-destructive", accent === "warning" && "text-warning", !accent && "text-primary")}>{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, children, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; className?: string }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={cn("h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-300", className)}
    >
      {children}
    </select>
  );
}

function IssueRow({
  task,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  task: Task;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[48px_110px_1.8fr_170px_120px_120px_150px_150px_170px] gap-3 border-b border-border px-6 py-4 text-[13px] last:border-b-0 hover:bg-muted/20 transition-colors">
      <div><input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} className="accent-primary" /></div>
      <div className="font-semibold text-primary/80">FT-{task.id.split("-")[0]}</div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="uppercase">{task.issue_type || "task"}</span>
          {task.is_overdue && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.project_color || "#6366f1" }} />
          <span className="truncate text-foreground">{task.project_name || task.project}</span>
        </div>
      </div>
      <div>
        <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {task.column_name || "Unknown"}
        </span>
      </div>
      <div>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="text-muted-foreground">{task.sprint_name || "Backlog"}</div>
      <div className="truncate text-muted-foreground">{task.assignee?.full_name || "Unassigned"}</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={onEdit}>
          <SquarePen className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground">
          <Link href={`/projects/${task.project}?task=${task.id}`}>
            Open
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function BulkMarkComplete({ selectedIds, doneColumnId, onClearSelection }: { selectedIds: string[]; doneColumnId: string | null; onClearSelection: () => void }) {
  const bulkUpdateTasks = useBulkUpdateTasks();

  const handleMarkComplete = async () => {
    if (!doneColumnId || selectedIds.length === 0) return;
    await bulkUpdateTasks.mutateAsync({ task_ids: selectedIds, updates: { column: doneColumnId } });
    onClearSelection();
  };

  if (!doneColumnId) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      className="h-8 text-[11px] text-success hover:text-success border-success/20 hover:border-success/40"
      onClick={() => void handleMarkComplete()}
      disabled={selectedIds.length === 0 || bulkUpdateTasks.isPending}
    >
      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      {bulkUpdateTasks.isPending ? "Completing..." : `Mark ${selectedIds.length} complete`}
    </Button>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "border-destructive/30 bg-destructive/10 text-destructive",
    high: "border-warning/30 bg-warning/10 text-warning",
    normal: "border-info/30 bg-info/10 text-info",
    low: "border-border bg-muted/50 text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase", styles[priority] || styles.low)}>
      {priority}
    </span>
  );
}
