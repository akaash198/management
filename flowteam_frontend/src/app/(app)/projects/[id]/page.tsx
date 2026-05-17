"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { useProject } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useBoardStore } from "@/store/boardStore";
import { useAuthStore } from "@/store/auth";
import { useAIStore } from "@/store/ai";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { ProjectTabs, ProjectViewType } from "@/components/projects/ProjectTabs";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const EpicView = dynamic(
  () => import("@/components/projects/EpicView").then((m) => ({ default: m.EpicView })),
  { loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-xl m-6" /> }
);
const RetrospectiveView = dynamic(
  () => import("@/components/projects/RetrospectiveView").then((m) => ({ default: m.RetrospectiveView })),
  { loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-xl m-6" /> }
);
const ProjectTimelineInline = dynamic(
  () => import("@/components/projects/ProjectTimelineInline").then((m) => ({ default: m.ProjectTimelineInline })),
  { loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-xl m-6" /> }
);

const TaskDetailPanel = dynamic(
  () => import("@/components/projects/TaskDetailPanel").then((m) => ({ default: m.TaskDetailPanel }))
);
const CreateTaskModal = dynamic(
  () => import("@/components/projects/CreateTaskModal").then((m) => ({ default: m.CreateTaskModal }))
);
import {
  Plus,
  Loader2,
  ArrowLeft,
  BarChart3,
  Download,
  AlertTriangle,
  X,
  Search,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "normal", label: "🟡 Normal" },
  { value: "low", label: "⚪ Low" },
] as const;

const DUE_OPTIONS = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "this_week", label: "This week" },
] as const;

export default function ProjectBoardPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const router = useRouter();
  const { user } = useAuthStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  const [activeView, setActiveView] = useState<ProjectViewType>("board");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "high" | "normal" | "low">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "today" | "this_week">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<false | "csv" | "xlsx" | "pdf">(false);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setIsExporting(format);
      const res = await api.get(`/projects/${id}/export/?format=${format}`, { responseType: "blob" });
      saveAs(res.data, `${(project?.name || "project").replace(/\s+/g, "_").toLowerCase()}_board_export.${format}`);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  const taskFilters = useMemo(() => {
    const assigneeId = assigneeFilter === "me" ? user?.id ?? "" : assigneeFilter;
    return {
      project_id: id,
      ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
      ...(dueFilter !== "all" ? { due: dueFilter } : {}),
      ...(assigneeId ? { assignee_id: assigneeId } : {}),
      ...(activeView === "bugs" ? { issue_type: "bug" } : {}),
    };
  }, [activeView, assigneeFilter, dueFilter, id, priorityFilter, user?.id]);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id);
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(taskFilters);
  const setBoard = useBoardStore((state) => state.setBoard);

  useEffect(() => {
    if (project && tasks) setBoard(project, tasks);
  }, [project, tasks, setBoard]);

  const filteredTasks = tasks ?? [];

  const completedTasks = useMemo(() => {
    if (!project?.columns || !filteredTasks.length) return 0;
    const doneColumnIds = new Set(project.columns.filter((col) => col.is_done_column).map((col) => col.id));
    return filteredTasks.filter((task) => doneColumnIds.has(task.column)).length;
  }, [filteredTasks, project?.columns]);

  const overdueTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.is_overdue).length;
  }, [filteredTasks]);

  const boardCompletion = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;
  const activeFiltersCount = [priorityFilter !== "all", dueFilter !== "all", !!assigneeFilter, !!search].filter(Boolean).length;

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["project-team-members", project?.team],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${project?.team}/members/`);
      return res.data.data ?? [];
    },
    enabled: !!project?.team,
  });

  const { data: health } = useQuery<{ health_score: number; health_label: string }>({
    queryKey: ["project-health-lite", id],
    queryFn: async () => {
      if (aiEnabled) {
        const res = await api.get(`/ai/health-score/?project_id=${id}`);
        const data = res.data.data;
        return { health_score: data.score, health_label: data.label };
      }
      const res = await api.get(`/analytics/project-health/?project_id=${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 60000,
  });

  const healthToneClass = useMemo(() => {
    const score = health?.health_score ?? 0;
    if (score >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800";
    return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800";
  }, [health?.health_score]);

  const clearFilters = () => {
    setPriorityFilter("all");
    setDueFilter("all");
    setAssigneeFilter("");
    setSearch("");
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="h-14 border-b bg-card flex items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground/60">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-[13px]">Loading board…</p>
          </div>
        </div>
      </div>
    );
  }

  if (projectError || tasksError) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-8">
        <div className="max-w-md w-full bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
          <AlertTriangle size={20} className="text-destructive mx-auto mb-3" />
          <h2 className="text-[15px] font-semibold text-destructive mb-1">Failed to load board</h2>
          <p className="text-[13px] text-muted-foreground">
            {(projectError as Error)?.message || (tasksError as Error)?.message || "Unknown error occurred"}
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => router.push("/projects")}>
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Top bar ── */}
      <div className="bg-card shrink-0 border-b border-border/50 shadow-sm z-20">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          {/* Left: back + project identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) router.back();
                else router.push("/projects");
              }}
              title="Back"
            >
              <ArrowLeft size={16} />
            </Button>

            {/* Color dot */}
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: project.color || "#5B5EDE" }}
            />

            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${project.color || "#5B5EDE"}20` }}
            >
              <span className="text-base">{project.icon}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[14px] font-bold tracking-tight truncate">{project.name}</h1>
                <Badge
                  variant="outline"
                  className="h-4 px-1.5 text-[10px] font-bold uppercase border-border text-muted-foreground/70 bg-muted/30 shrink-0"
                >
                  {project.status || "active"}
                </Badge>
                {health && (
                  <Badge variant="outline" className={cn("h-4 px-2 text-[10px] font-bold border shrink-0", healthToneClass)}>
                    {health.health_label} · {health.health_score}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 font-medium">
                <span>{project.columns?.length ?? 0} columns</span>
                <span>·</span>
                <span>{filteredTasks.length} tasks</span>
                <span>·</span>
                <span className="text-emerald-600 dark:text-emerald-400">{boardCompletion}% done</span>
                {overdueTasks > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle size={9} />{overdueTasks} overdue
                    </span>
                  </>
                )}
                {project.description && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[200px]">{project.description}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex h-8 px-2.5 text-[12px] font-semibold text-muted-foreground hover:text-primary"
            >
              <Link href={`/projects/${id}/reports`}>
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />Reports
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[12px] gap-1"
                  disabled={!!isExporting}
                >
                  <Download size={13} />
                  {isExporting ? "Exporting…" : "Export"}
                  <ChevronDown size={11} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => void handleExport("csv")}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport("xlsx")}>Export Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport("pdf")}>Export PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => setIsTaskModalOpen(true)}
              className="h-8 px-3 text-[13px] font-semibold gap-1.5 shadow-sm"
            >
              <Plus size={14} />New task
            </Button>
          </div>
        </div>

        {/* ── View tabs ── */}
        <ProjectTabs activeView={activeView} onViewChange={setActiveView} tasksCount={filteredTasks.length} />

        {/* ── Filter bar ── */}
        <div className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 bg-muted/5 border-t border-border/30">
          {/* Search */}
          <div className="relative min-w-[160px] max-w-[280px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[12.5px] border-border/50 bg-background focus-visible:ring-1"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Priority filter pills */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background p-0.5">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriorityFilter(opt.value as typeof priorityFilter)}
                className={cn(
                  "rounded-md px-2.5 h-6 text-[11.5px] font-semibold transition-colors whitespace-nowrap",
                  priorityFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Due filter pills */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background p-0.5">
            {DUE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDueFilter(opt.value as typeof dueFilter)}
                className={cn(
                  "rounded-md px-2.5 h-6 text-[11.5px] font-semibold transition-colors whitespace-nowrap",
                  dueFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Assignee */}
          {(teamMembers?.length ?? 0) > 0 && (
            <AssigneePicker
              members={teamMembers ?? []}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              currentUserId={user?.id ?? ""}
            />
          )}

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground ml-auto"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3 w-3" />
              Clear ({activeFiltersCount})
            </Button>
          )}

          {/* Task count summary */}
          {activeFiltersCount > 0 && (
            <span className="text-[11px] text-muted-foreground/50 font-medium">
              {filteredTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())).length} result{filteredTasks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Board content ── */}
      <div className="flex-1 overflow-auto bg-background custom-scrollbar">
        {activeView === "board" && (
          <div className="p-5 h-full">
            <KanbanBoard projectId={id} searchTerm={search} />
          </div>
        )}
        {(activeView === "list" || activeView === "bugs") && (
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
            <ProjectListView
              tasks={filteredTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))}
              groupBy={activeView === "bugs" ? "column" : "sprint"}
              onTaskClick={(tId) => router.push(`/projects/${id}?task=${tId}`)}
              onAddTask={() => setIsTaskModalOpen(true)}
            />
          </div>
        )}
        {activeView === "epics" && (
          <EpicView projectId={id} />
        )}
        {activeView === "retrospectives" && project?.team && (
          <div className="h-full overflow-auto">
            <RetrospectiveView teamId={project.team} />
          </div>
        )}
        {activeView === "timeline" && (
          <div className="h-full overflow-auto">
            <ProjectTimelineInline projectId={id} />
          </div>
        )}
      </div>

      {taskId && <TaskDetailPanel key={taskId} taskId={taskId} projectId={id} columns={project.columns || []} />}

      <CreateTaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        projectId={id}
        columns={project.columns || []}
        labels={project.labels || []}
        members={teamMembers || []}
      />
    </div>
  );
}

/* ─── AssigneePicker ─────────────────────────────────────────────────────────
   Shows All + Mine + up to VISIBLE_LIMIT avatar-pills inline.
   Any members beyond that collapse into a searchable "+N more" dropdown.
   ─────────────────────────────────────────────────────────────────────────── */
const VISIBLE_LIMIT = 4;

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AssigneePicker({
  members,
  value,
  onChange,
  currentUserId,
}: {
  members: TeamMember[];
  value: string;
  onChange: (id: string) => void;
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");

  const visible = members.slice(0, VISIBLE_LIMIT);
  const overflow = members.slice(VISIBLE_LIMIT);
  const hasOverflow = overflow.length > 0;

  /* If the selected member is in the overflow, show their name in the trigger */
  const selectedOverflow = overflow.find((m) => m.user.id === value);

  const filteredOverflow = overflow.filter((m) =>
    m.user.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const pillBase =
    "flex items-center gap-1.5 rounded-md px-2 h-7 text-[11.5px] font-semibold transition-all whitespace-nowrap";
  const pillActive = "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30";
  const pillIdle = "text-muted-foreground hover:text-foreground hover:bg-muted/60";

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5">
      {/* All */}
      <button
        onClick={() => onChange("")}
        className={cn(pillBase, !value ? pillActive : pillIdle)}
      >
        <Users size={10} />
        All
      </button>

      {/* Mine */}
      <button
        onClick={() => onChange(value === "me" ? "" : "me")}
        className={cn(pillBase, value === "me" ? pillActive : pillIdle)}
      >
        Mine
      </button>

      {/* Visible member avatars */}
      {visible.map((member) => {
        const active = value === member.user.id;
        const isSelf = member.user.id === currentUserId;
        return (
          <button
            key={member.user.id}
            onClick={() => onChange(active ? "" : member.user.id)}
            title={member.user.full_name}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-1.5 h-7 transition-all",
              active ? pillActive : pillIdle
            )}
          >
            {/* Avatar circle */}
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {initials(member.user.full_name)}
            </span>
            <span className="text-[11.5px] font-semibold">
              {isSelf ? "Me" : member.user.full_name.split(" ")[0]}
            </span>
            {active && <Check size={10} className="shrink-0" />}
          </button>
        );
      })}

      {/* Overflow dropdown */}
      {hasOverflow && (
        <DropdownMenu onOpenChange={() => setSearch("")}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                pillBase,
                selectedOverflow ? pillActive : pillIdle,
                "gap-1"
              )}
            >
              {selectedOverflow ? (
                <>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                      "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {initials(selectedOverflow.user.full_name)}
                  </span>
                  {selectedOverflow.user.full_name.split(" ")[0]}
                  <Check size={10} className="shrink-0" />
                </>
              ) : (
                <>
                  +{overflow.length}
                  <ChevronDown size={10} className="text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56 p-2" side="bottom">
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full h-7 pl-7 pr-2 text-[12px] rounded-md border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {filteredOverflow.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-muted-foreground">No members found</p>
            ) : (
              filteredOverflow.map((member) => {
                const active = value === member.user.id;
                return (
                  <DropdownMenuItem
                    key={member.user.id}
                    onClick={() => onChange(active ? "" : member.user.id)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {initials(member.user.full_name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{member.user.full_name}</div>
                      {member.user.email && (
                        <div className="text-[10.5px] text-muted-foreground truncate">{member.user.email}</div>
                      )}
                    </div>
                    {active && <Check size={13} className="shrink-0 text-primary" />}
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
