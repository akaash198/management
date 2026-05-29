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
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Download,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CommentSection } from "./CommentSection";
import { TaskTimeTracker } from "./task-time-tracker";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useTeamPresenceSocket } from "@/hooks/useMessaging";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { RichEmbeds } from "@/components/embeds/RichEmbeds";
import type { Column } from "@/types/project";
import type { Attachment } from "@/types/task";
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

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!taskId) return;
    setAttachmentsLoading(true);
    api.get<{ success: boolean; data: { attachments: Attachment[] } }>(`/projects/tasks/${taskId}/`)
      .then((res) => {
        if (res.data.success) setAttachments(res.data.data.attachments ?? []);
      })
      .catch(() => {})
      .finally(() => setAttachmentsLoading(false));
  }, [taskId]);

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await api.post<{ success: boolean; data: Attachment }>(
          `/tasks/${taskId}/attachments/`, form
        );
        if (res.data.success) {
          setAttachments((prev) => [res.data.data, ...prev]);
        }
      }
      toast.success("File uploaded");
    } catch (err) {
      toast.error(toErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await api.delete(`/tasks/attachments/${id}/`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Attachment removed");
    } catch (err) {
      toast.error(toErrorMessage(err, "Delete failed"));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useTeamPresenceSocket(
    task?.project_team_id,
    (ids) => setOnlineUserIds(new Set(ids)),
    (userId, online) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId); else next.delete(userId);
        return next;
      });
    }
  );

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["project-team-members", task?.project_team_id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${task?.project_team_id}/members/`);
      return res.data.data ?? [];
    },
    enabled: !!task?.project_team_id,
  });
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
                    <UserIcon size={12} /> Assignee
                  </span>
                  <div className="flex items-center gap-2.5">
                    {(task.assignee || task.assignees?.[0]) ? (
                      (() => {
                        const a = task.assignee || task.assignees?.[0];
                        if (!a) return null;
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              title={`${a.full_name} (${onlineUserIds.has(a.id) ? "Online" : "Offline"})`}
                              className="relative h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                            >
                              {a.full_name[0]}
                              <span className={cn(
                                "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background",
                                onlineUserIds.has(a.id) ? "bg-emerald-500" : "bg-slate-400"
                              )} />
                            </div>
                            <span className="text-[13px] font-medium">
                              {a.full_name}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={teamMembers.length === 0}
                                  className="h-6 px-2 text-[10px] font-semibold border border-border rounded-md flex items-center gap-1 transition-all"
                                >
                                  Reassign
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto p-1.5 bg-popover text-popover-foreground border border-border rounded-lg shadow-md z-[100]">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-2 py-1 mb-1 border-b border-border/40">
                                  Assign to member
                                </div>
                                {teamMembers.length === 0 ? (
                                  <div className="text-xs text-muted-foreground text-center py-3">No team members found</div>
                                ) : (
                                  <>
                                    {teamMembers
                                      .filter((m) => m.user.id !== a.id)
                                      .map((member) => {
                                        const isOnline = onlineUserIds.has(member.user.id);
                                        return (
                                          <DropdownMenuItem
                                            key={member.user.id}
                                            onClick={() => {
                                              updateTask.mutate({
                                                id: task.id,
                                                data: {
                                                  assignee: member.user.id,
                                                  assignee_ids: [member.user.id],
                                                }
                                              });
                                            }}
                                            className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-xs hover:bg-accent hover:text-accent-foreground"
                                          >
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground relative">
                                              {member.user.full_name[0]?.toUpperCase() || "?"}
                                              <span className={cn(
                                                "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background",
                                                isOnline ? "bg-emerald-500" : "bg-slate-400"
                                              )} />
                                            </span>
                                            <span className="flex-1 truncate font-medium">{member.user.full_name}</span>
                                            {isOnline ? (
                                              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full font-bold">Online</span>
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-bold">Offline</span>
                                            )}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                    <div className="my-1 border-t border-border/40" />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        updateTask.mutate({
                                          id: task.id,
                                          data: {
                                            assignee: null,
                                            assignee_ids: [],
                                          }
                                        });
                                      }}
                                      className="text-xs rounded-md px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10"
                                    >
                                      Unassign
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground/40 italic">Unassigned</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={teamMembers.length === 0}
                              className="h-6 px-2 text-[10px] font-semibold border border-border rounded-md"
                            >
                              Assign
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto p-1.5 bg-popover text-popover-foreground border border-border rounded-lg shadow-md z-[100]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-2 py-1 mb-1 border-b border-border/40">
                              Assign to member
                            </div>
                            {teamMembers.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-3">No team members found</div>
                            ) : (
                              teamMembers.map((member) => {
                                const isOnline = onlineUserIds.has(member.user.id);
                                return (
                                  <DropdownMenuItem
                                    key={member.user.id}
                                    onClick={() => {
                                      updateTask.mutate({
                                        id: task.id,
                                        data: {
                                          assignee: member.user.id,
                                          assignee_ids: [member.user.id],
                                        }
                                      });
                                    }}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-xs hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground relative">
                                      {member.user.full_name[0]?.toUpperCase() || "?"}
                                      <span className={cn(
                                        "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background",
                                        isOnline ? "bg-emerald-500" : "bg-slate-400"
                                      )} />
                                    </span>
                                    <span className="flex-1 truncate font-medium">{member.user.full_name}</span>
                                    {isOnline ? (
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full font-bold">Online</span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-bold">Offline</span>
                                    )}
                                  </DropdownMenuItem>
                                );
                              })
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-medium flex items-center gap-2">
                    <Paperclip size={14} className="text-muted-foreground/60" />
                    Attachments
                    {attachments.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">({attachments.length})</span>
                    )}
                  </h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAttachFiles(e.target.files)}
                  />
                </div>

                {attachmentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                ) : attachments.length === 0 ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border border-dashed border-border py-4 text-[12px] text-muted-foreground/50 hover:border-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    Drop files or click Upload
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map((att) => {
                      const isImage = att.mime_type?.startsWith("image/");
                      const isPdf = att.mime_type === "application/pdf";
                      const previewUrl = isPdf
                        ? `/view/pdf?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.original_filename)}`
                        : att.url;
                      return (
                        <div
                          key={att.id}
                          className="group flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background border border-border">
                            {isImage ? (
                              <img src={att.url} alt="" className="h-7 w-7 rounded-md object-cover" />
                            ) : (
                              <FileText size={13} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium">{att.original_filename}</p>
                            <p className="text-[10px] text-muted-foreground">{formatBytes(att.file_size)}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1 hover:bg-background transition-colors"
                              title="Open"
                            >
                              <Download size={13} className="text-muted-foreground" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="rounded p-1 hover:bg-background transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
