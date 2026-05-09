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
import { TaskDetailPanel } from "@/components/projects/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import {
  Plus,
  Filter,
  Loader2,
  ArrowLeft,
  BarChart3,
  FileText,
  GanttChartSquare,
  Receipt,
  Shield,
  FolderOpen,
  Download,
  CalendarDays,
  UserCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";

export default function ProjectBoardPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const router = useRouter();
  const { user } = useAuthStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "high" | "normal" | "low">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "today" | "this_week">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<false | "csv" | "xlsx" | "pdf">(false);

  const taskFilters = useMemo(() => {
    const assigneeId = assigneeFilter === "me" ? user?.id ?? "" : assigneeFilter;
    return {
      project_id: id,
      ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
      ...(dueFilter !== "all" ? { due: dueFilter } : {}),
      ...(assigneeId ? { assignee_id: assigneeId } : {}),
    };
  }, [assigneeFilter, dueFilter, id, priorityFilter, user?.id]);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id);
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(taskFilters);
  const setBoard = useBoardStore((state) => state.setBoard);

  useEffect(() => {
    if (project && tasks) {
      setBoard(project, tasks);
    }
  }, [project, tasks, setBoard]);

  const filteredTasks = tasks ?? [];
  const completedTasks = useMemo(() => {
    if (!project?.columns || !filteredTasks.length) return 0;
    const doneColumnIds = new Set(project.columns.filter((col) => col.is_done_column).map((col) => col.id));
    return filteredTasks.filter((task) => doneColumnIds.has(task.column)).length;
  }, [filteredTasks, project?.columns]);
  const boardCompletion = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;
  const activeFiltersCount = [priorityFilter !== "all", dueFilter !== "all", !!assigneeFilter].filter(Boolean).length;

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
    if (score >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  }, [health?.health_score]);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setIsExporting(format);
      const res = await api.get(`/projects/${id}/export/?format=${format}`, { responseType: "blob" });
      const extension = format === "xlsx" ? "xlsx" : format;
      saveAs(res.data, `${(project?.name || "project").replace(/\s+/g, "_").toLowerCase()}_board_export.${extension}`);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
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
            <p className="text-[13px]">Loading board...</p>
          </div>
        </div>
      </div>
    );
  }

  if (projectError || tasksError) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-8">
        <div className="max-w-md w-full bg-destructive/5 border-[0.5px] border-destructive/20 rounded-md p-6 text-center">
          <h2 className="text-[16px] font-medium text-destructive mb-2">Failed to load board</h2>
          <p className="text-[13px] text-muted-foreground">
            {(projectError as any)?.message || (tasksError as any)?.message || "Unknown error occurred"}
          </p>
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
      <div className="border-b border-border bg-card shrink-0">
        <div className="h-14 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-muted"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) router.back();
                else router.push("/projects");
              }}
              aria-label="Back to projects"
              title="Back"
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <span className="text-lg">{project.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-[15px] font-medium tracking-tight truncate">{project.name}</h1>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium uppercase border-border text-muted-foreground/70">
                  {project.status || "active"}
                </Badge>
                {health && (
                  <Badge variant="outline" className={cn("h-5 px-2 text-[10px] border", healthToneClass)}>
                    {health.health_label} ({health.health_score})
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                {(project.columns?.length || 0)} columns • {filteredTasks.length} tasks • {boardCompletion}% complete
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/reports`}>
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Reports
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/docs`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Docs
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/files`}>
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                Files
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/timeline`}>
                <GanttChartSquare className="mr-1.5 h-3.5 w-3.5" />
                Timeline
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/billing`}>
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                Billing
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[12px]">
              <Link href={`/projects/${id}/settings/permissions`}>
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Permissions
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[12px]"
              disabled={!!isExporting}
              onClick={() => void handleExport("csv")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setIsTaskModalOpen(true)}
              className="h-8 px-3 text-[13px] font-medium"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New task
            </Button>
          </div>
        </div>

        <div className="px-6 pb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[13px]"
            />
            <Filter className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/50" />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-[12px]"
            aria-label="Priority filter"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as typeof dueFilter)}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-[12px]"
            aria-label="Due date filter"
          >
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this_week">Due this week</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-[12px] max-w-[220px]"
            aria-label="Assignee filter"
          >
            <option value="">All assignees</option>
            <option value="me">Assigned to me</option>
            {(teamMembers ?? []).map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.full_name}
              </option>
            ))}
          </select>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[12px] text-muted-foreground"
              onClick={() => {
                setPriorityFilter("all");
                setDueFilter("all");
                setAssigneeFilter("");
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear filters ({activeFiltersCount})
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {dueFilter === "all" ? "All dates" : dueFilter.replace("_", " ")}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserCircle2 className="h-3.5 w-3.5" />
              {assigneeFilter ? "Filtered assignee" : "All owners"}
            </span>
            {dueFilter === "overdue" && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" />
                Overdue focus
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-muted/20 p-6 custom-scrollbar">
        <KanbanBoard projectId={id} searchTerm={search} />
      </div>

      {taskId && <TaskDetailPanel key={taskId} taskId={taskId} projectId={id} />}

      <CreateTaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        projectId={id}
        columns={project.columns || []}
      />
    </div>
  );
}
