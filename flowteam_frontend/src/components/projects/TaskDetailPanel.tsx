"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProjects";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  User as UserIcon, 
  CheckSquare, 
  CheckCircle2,
  Loader2,
  X,
  GitPullRequest,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CommentSection } from "./CommentSection";
import { TaskTimeTracker } from "./task-time-tracker";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { RichEmbeds } from "@/components/embeds/RichEmbeds";
import type { Column } from "@/types/project";
import { useTask, useUpdateTask, useMoveTask, useTaskWatchers, useAddWatcher, useRemoveWatcher, useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from "@/hooks/useTasks";

interface TaskDetailPanelProps {
  taskId: string;
  projectId: string;
  columns: Column[];
}

interface GitHubPullRequest {
  id: string;
  provider?: "github" | "gitlab" | "bitbucket" | string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  repo: string;
  status: "open" | "merged" | "closed";
}

import { TaskCompletionModal } from "./TaskCompletionModal";

export function TaskDetailPanel({ taskId, projectId, columns }: TaskDetailPanelProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const { data: watchers = [] } = useTaskWatchers(taskId);
  const addWatcher = useAddWatcher();
  const removeWatcher = useRemoveWatcher();
  const createSubtask = useCreateSubtask(taskId);
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const aiEnabled = useAIStore((state) => state.aiEnabled);
  const [draftDescription, setDraftDescription] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    async function loadPullRequests() {
      try {
        const response = await api.get<ApiResponse<GitHubPullRequest[]>>(`/tasks/${taskId}/pull-requests/`);
        setPullRequests(response.data.data ?? []);
      } catch {
        setPullRequests([]);
      }
    }

    if (taskId) void loadPullRequests();
  }, [taskId]);

  const handleClose = () => {
    router.push(`/projects/${projectId}`, { scroll: false });
  };

  const onDescriptionBlur = () => {
    const description = draftDescription ?? task?.description ?? "";
    if (task && description !== task.description) {
      updateTask.mutate({ id: taskId, data: { description } });
    }
  };

  const doneColumn = columns.find((col) => col.is_done_column) ?? null;
  const reviewColumn = columns.find((col) => col.name.toLowerCase().includes("review")) ?? null;
  const isInDoneColumn = doneColumn ? task?.column === doneColumn.id : false;

  const myWatcher = watchers.find((w) => w.user.id === user?.id);
  const isWatching = !!myWatcher;

  const handleConfirmComplete = async () => {
    if (!doneColumn || !task) return;
    setCompleting(true);
    try {
      await moveTask.mutateAsync({ id: task.id, columnId: doneColumn.id, order: 0 });
      toast.success("Task marked as complete");
      setIsCompletionModalOpen(false);
      handleClose(); // Close the side panel after successful completion
    } catch {
      toast.error("Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  const handleSendForReview = async () => {
    if (!task) return;
    const targetColumn = reviewColumn || columns.find(c => !c.is_done_column && c.id !== task.column);
    if (!targetColumn) {
      toast.error("No review or secondary column found");
      return;
    }
    setCompleting(true);
    try {
      await moveTask.mutateAsync({ id: task.id, columnId: targetColumn.id, order: 0 });
      toast.success(`Task sent to ${targetColumn.name}`);
      setIsCompletionModalOpen(false);
      handleClose(); // Close the side panel after sending for review
    } catch {
      toast.error("Failed to send for review");
    } finally {
      setCompleting(false);
    }
  };

  const handleToggleWatch = async () => {
    if (!taskId) return;
    setWatchLoading(true);
    try {
      if (isWatching && myWatcher) {
        await removeWatcher.mutateAsync({ taskId, watcherId: myWatcher.id });
      } else {
        await addWatcher.mutateAsync(taskId);
      }
    } catch {
      toast.error("Failed to update watch status");
    } finally {
      setWatchLoading(false);
    }
  };

  const summarizeTask = async () => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    try {
      setSummarizing(true);
      const response = await api.post<ApiResponse<{ summary: string }>>("/ai/summarize-task/", { task_id: taskId });
      setSummary(response.data.data?.summary ?? "");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to summarize task"));
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <Sheet open={!!taskId} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto bg-background border-l border-border p-0 flex flex-col gap-0 shadow-2xl">
        {/* We keep SheetHeader/SheetTitle outside the conditional so it's ALWAYS present for accessibility */}
        <div className="p-6">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-medium bg-muted/50 border-border text-muted-foreground/60">
                {task?.id ? `TASK-${task.id.split("-")[0]}` : "LOADING..."}
              </Badge>
              {task?.priority && (
                <Badge variant="outline" className={cn(
                  "text-[10px] uppercase font-medium",
                  task.priority === 'urgent' && "bg-destructive/10 text-destructive border-destructive/30",
                  task.priority === 'high' && "bg-warning/10 text-warning border-warning/30",
                  task.priority === 'normal' && "bg-info/10 text-info border-info/30",
                  task.priority === 'low' && "bg-muted/50 text-muted-foreground border-border"
                )}>
                  {task.priority}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-[20px] font-medium tracking-tight leading-snug">
              {isLoading ? "Loading..." : task?.title || "Task details"}
            </SheetTitle>
            {task && (
              <AIButton variant="outline" size="sm" className="h-8 w-fit text-[12px]" loading={summarizing} onClick={() => void summarizeTask()}>
                Summarize
              </AIButton>
            )}
          </SheetHeader>
        </div>

        <Separator className="bg-border/60" />

        <div className="flex-1">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
              <Loader2 className="animate-spin" size={24} />
              <p className="text-[13px]">Fetching latest updates...</p>
            </div>
          ) : task ? (
            <div className="p-6 space-y-8">
              {summary && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold text-primary">AI summary</p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6">{summary}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSummary("")}>
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Mark Complete */}
              {doneColumn && !isInDoneColumn && (
                <Button
                  onClick={() => setIsCompletionModalOpen(true)}
                  disabled={completing}
                  className="w-full h-10 text-[13px] gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                >
                  {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Complete Task...
                </Button>
              )}
              {isInDoneColumn && (
                <div className="rounded-lg border border-success/30 bg-success/10 p-3 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-success shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-success">Completed</p>
                    <p className="text-[11px] text-success/70">This task is in a done column</p>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-medium tracking-wider text-muted-foreground/50 flex items-center gap-2">
                    <UserIcon size={12} /> Assignees
                  </span>
                  <div className="flex items-center gap-2.5">
                    {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).length ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                            .slice(0, 4)
                            .map((a) => (
                              <div
                                key={a.id}
                                title={a.full_name}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                              >
                                {a.full_name[0]}
                              </div>
                            ))}
                        </div>
                        <span className="text-[13px] font-medium">
                          {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                            .map((a) => a.full_name)
                            .join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted-foreground/40 italic">Unassigned</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-medium tracking-wider text-muted-foreground/50 flex items-center gap-2">
                    <Calendar size={12} /> Due Date
                  </span>
                  <div className={cn("text-[13px] font-medium", task.is_overdue ? "text-destructive" : "text-foreground")}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-medium tracking-wider text-muted-foreground/50 flex items-center gap-2">
                    <Eye size={12} /> Watchers
                  </span>
                  <div className="flex items-center gap-2">
                    {watchers.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {watchers.slice(0, 5).map((w) => (
                            <div
                              key={w.id}
                              title={w.user.full_name}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-muted text-muted-foreground border border-border"
                            >
                              {w.user.full_name[0]}
                            </div>
                          ))}
                        </div>
                        <span className="text-[13px] text-muted-foreground">
                          {watchers.length} {watchers.length === 1 ? "watcher" : "watchers"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted-foreground/40 italic">No watchers</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 px-2 text-[11px]", isWatching ? "text-primary" : "text-muted-foreground")}
                      onClick={() => void handleToggleWatch()}
                      disabled={watchLoading}
                    >
                      {watchLoading ? (
                        <Loader2 size={12} className="animate-spin mr-1" />
                      ) : isWatching ? (
                        <EyeOff size={12} className="mr-1" />
                      ) : (
                        <Eye size={12} className="mr-1" />
                      )}
                      {isWatching ? "Unwatch" : "Watch"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-medium tracking-wider text-muted-foreground/50 flex items-center gap-2">
                    <CheckSquare size={12} /> Issue Type
                  </span>
                  <div className="text-[13px] font-medium capitalize">
                    {task.issue_type || "Task"}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <label className="text-[13px] font-medium flex items-center gap-2">
                  Description
                </label>
                <Textarea 
                  value={draftDescription ?? task.description ?? ""}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  onBlur={onDescriptionBlur}
                  placeholder="Detail what needs to be done..."
                  className="min-h-[140px] resize-none text-[13px] leading-relaxed bg-muted/20 border-border/60 focus:bg-background transition-all"
                />
                <RichEmbeds text={draftDescription ?? task.description ?? ""} />
              </div>

              {/* Subtasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-medium flex items-center gap-2">
                    <CheckSquare size={14} className="text-muted-foreground/60" /> Subtasks
                  </h3>
                  <div className="flex items-center gap-2">
                    {task.subtasks?.length > 0 && (
                      <span className="text-[11px] text-muted-foreground/60 font-medium">
                        {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {task.subtasks?.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group transition-all border border-transparent">
                      <button
                        onClick={() => updateSubtask.mutate({ id: sub.id, data: { is_completed: !sub.is_completed } })}
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-all",
                          sub.is_completed ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50"
                        )}
                      >
                        {sub.is_completed && <CheckCircle2 size={10} className="text-primary-foreground stroke-[3px]" />}
                      </button>
                      <span className={cn(
                        "text-[13px] flex-1 truncate",
                        sub.is_completed ? "text-muted-foreground/40 line-through" : "text-foreground"
                      )}>
                        {sub.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        onClick={() => deleteSubtask.mutate(sub.id)}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="pt-2">
                    <div className="relative group">
                      <Plus size={14} className="absolute left-2.5 top-2.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Add a subtask..."
                        className="h-9 pl-9 text-[13px] bg-muted/10 border-dashed border-border/60 focus:border-primary/50 focus:bg-background transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            createSubtask.mutate({ title: e.currentTarget.value.trim() });
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/60" />
              
              <TaskTimeTracker taskId={taskId} projectId={projectId} />

              <Separator className="bg-border/60" />

              <div className="space-y-3">
                <h3 className="text-[13px] font-medium flex items-center gap-2">
                  <GitPullRequest size={14} className="text-muted-foreground/60" /> Pull Requests
                </h3>
                <div className="space-y-2">
                  {pullRequests.length ? (
                    pullRequests.map((pr) => (
                      <a
                        key={pr.id}
                        href={pr.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs transition-colors hover:bg-muted"
                      >
                        <GitPullRequest size={12} className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          #{pr.pr_number} {pr.pr_title}
                        </span>
                        <Badge
                          variant={pr.status === "merged" ? "default" : pr.status === "open" ? "secondary" : "outline"}
                          className="shrink-0"
                        >
                          {pr.status}
                        </Badge>
                      </a>
                    ))
                  ) : (
                    <p className="text-[12px] text-muted-foreground/40 italic">No pull requests linked.</p>
                  )}
                </div>
              </div>

              <Separator className="bg-border/60" />

              <CommentSection 
                taskId={taskId} 
                teamId={task.project_team_id || ""} 
              />
              
              <div className="h-20" /> {/* Spacer for scroll bottom */}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-[14px] text-muted-foreground/50">This task could not be found.</p>
              <Button onClick={handleClose} variant="link" className="mt-2 text-primary">Return to board</Button>
            </div>
          )}
        </div>
      </SheetContent>
      {task && (
        <TaskCompletionModal
          open={isCompletionModalOpen}
          onOpenChange={setIsCompletionModalOpen}
          task={task}
          onConfirmComplete={handleConfirmComplete}
          onSendForReview={handleSendForReview}
          isProcessing={completing}
          hasReviewColumn={!!reviewColumn}
        />
      )}
    </Sheet>
  );
}
