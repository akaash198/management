"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
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
import { Badge } from "@/components/ui/badge";
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
      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_45%,#ffffff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
              Jira-style delivery view
            </Badge>
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight">Project issues</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-muted-foreground">
                A single issue navigator across active projects with saved views, bulk actions, sprint assignment, and issue relationships.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 text-[12px]">
                <Link href="/projects">
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                  Back to projects
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-[12px]">
                <Link href="/projects/planning">
                  <LayoutPanelTop className="mr-1.5 h-3.5 w-3.5" />
                  Planning hub
                </Link>
              </Button>
              {activeTeam && (
                <Badge variant="outline" className="h-8 border-border bg-card px-3 text-[12px] font-medium text-foreground">
                  Team: {activeTeam.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <SummaryCard label="Visible issues" value={stats.total} tone="default" />
            <SummaryCard label="Urgent" value={stats.urgent} tone="danger" />
            <SummaryCard label="Overdue" value={stats.overdue} tone="warning" />
            <SummaryCard label="Unassigned" value={stats.unassigned} tone="muted" />
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold">Issue navigator</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Filter like Jira, save views for reuse, and batch-edit issues into the right sprint or workflow column.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                defaultValue=""
                onChange={(event) => applySavedView(event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-[12px]"
              >
                <option value="">Open saved view</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => void handleSaveView()}>
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

        <div className="grid gap-3 border-b border-border px-5 py-4 lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search summary or description" className="pl-9 text-[13px]" />
          </div>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="all">All workflow states</option>
            <option value="open">Open issues</option>
            <option value="done">Done issues</option>
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <select value={due} onChange={(event) => setDue(event.target.value as DueFilter)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this_week">Due this week</option>
          </select>
          <select value={sprintId} onChange={(event) => setSprintId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="">All sprints</option>
            {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </select>
          <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-[13px]">
            <option value="">All assignees</option>
            {teamMembers.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.full_name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-3 border-b border-border px-5 py-3 text-[12px] text-muted-foreground xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            {activeFiltersCount > 0 ? `${activeFiltersCount} filters active` : "No filters applied"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-8 px-3 text-[12px]">
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
              {selectedTaskIds.length} selected
            </Badge>
            <select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-[12px]">
              <option value="">Bulk priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select value={bulkSprintId} onChange={(event) => setBulkSprintId(event.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-[12px]">
              <option value="">Move to sprint</option>
              {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
            </select>
            <select value={bulkColumnId} onChange={(event) => setBulkColumnId(event.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-[12px]">
              <option value="">Move to column</option>
              {(selectedProjectDetail?.columns ?? []).map((column) => (
                <option key={column.id} value={column.id}>{column.name}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => void handleBulkApply()} disabled={selectedTaskIds.length === 0 || bulkUpdateTasks.isPending}>
              Apply bulk update
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
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
            <div className="grid grid-cols-[48px_110px_1.8fr_170px_120px_120px_150px_150px_170px] gap-3 border-b border-border bg-muted/35 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => setSelectedTaskIds(event.target.checked ? tasks.map((task) => task.id) : [])}
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
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">Loading issues...</div>
            ) : tasks.length === 0 ? (
              <div className="px-5 py-12 text-center">
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

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "default" | "danger" | "warning" | "muted" }) {
  return (
    <div className={cn("rounded-[18px] border p-4", tone === "default" && "border-sky-200 bg-sky-50/60", tone === "danger" && "border-rose-200 bg-rose-50/70", tone === "warning" && "border-amber-200 bg-amber-50/80", tone === "muted" && "border-slate-200 bg-white")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tracking-tight">{value}</p>
    </div>
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
    <div className="grid grid-cols-[48px_110px_1.8fr_170px_120px_120px_150px_150px_170px] gap-3 border-b border-border px-5 py-4 text-[13px] last:border-b-0 hover:bg-muted/20">
      <div><input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} /></div>
      <div className="font-semibold text-primary">FT-{task.id.split("-")[0]}</div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="uppercase">{task.issue_type || "task"}</span>
          {task.is_overdue && (
            <span className="inline-flex items-center gap-1 text-amber-700">
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
      <div><Badge variant="outline" className="border-border bg-background text-[11px] font-medium">{task.column_name || "Unknown"}</Badge></div>
      <div>
              <Badge variant="outline" className={cn("text-[11px] font-semibold uppercase", task.priority === "urgent" && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400", task.priority === "high" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400", task.priority === "normal" && "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400", task.priority === "low" && "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400")}>
          {task.priority}
        </Badge>
      </div>
      <div className="text-muted-foreground">{task.sprint_name || "Backlog"}</div>
      <div className="truncate text-muted-foreground">{task.assignee?.full_name || "Unassigned"}</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[12px]" onClick={onEdit}>
          <SquarePen className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
          <Link href={`/projects/${task.project}?task=${task.id}`}>
            Open
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[12px] text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
