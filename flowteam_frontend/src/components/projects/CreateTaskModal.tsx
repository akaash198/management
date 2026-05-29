"use client";

import { useState, useEffect } from "react";
import {
  Type,
  AlignLeft,
  Layout,
  Flag,
  Sparkles,
  CheckCircle2,
  X,
  Target,
  Clock,
  User,
  Calendar,
  Tags,
  Plus,
  Loader2,
  Paperclip
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { Column, Label as ProjectLabel } from "@/types/project";
import { Task, TaskPriority } from "@/types/task";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { useTeamStore } from "@/store/team";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type GeneratedTask = {
  title: string;
  issue_type?: "epic" | "story" | "task" | "bug" | "subtask";
  priority?: TaskPriority;
  estimated_hours?: number;
};

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  columns: Column[];
  labels?: ProjectLabel[];
  members?: TeamMember[];
  readOnly?: boolean;
  initialTask?: Task | null;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
  columns,
  labels = [],
  members = [],
  readOnly = false,
  initialTask = null,
}: CreateTaskModalProps) {
  const isEditMode = !!initialTask;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [issueType, setIssueType] = useState<string>("task");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());

  const [autoWriting, setAutoWriting] = useState(false);
  const [suggestedLabels, setSuggestedLabels] = useState<string[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  const aiEnabled = useAIStore((state) => state.aiEnabled);
  const activeTeamId = useTeamStore((state) => state.activeTeamId);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setQueuedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeQueuedFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Populate fields when opening in edit mode; reset when closing create mode
  useEffect(() => {
    if (open && initialTask) {
      setTitle(initialTask.title ?? "");
      setDescription(initialTask.description ?? "");
      setColumnId(initialTask.column ?? "");
      setPriority(initialTask.priority ?? "normal");
      setIssueType(initialTask.issue_type ?? "task");
      setAssigneeIds(
        (initialTask.assignees?.map((a: { id: string }) => a.id) ?? (initialTask.assignee ? [initialTask.assignee.id] : [])).filter(Boolean)
      );
      setDueDate(initialTask.due_date ?? "");
      setEstimatedHours(initialTask.estimated_hours != null ? String(initialTask.estimated_hours) : "");
      setSelectedLabelIds(new Set((initialTask.labels ?? []).map((l) => l.id)));
    }
    if (open && !initialTask && !columnId && columns.length > 0) {
      setColumnId(columns[0].id);
    }
    if (!open && !initialTask) resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTask?.id]);

  const handleCreate = () => {
    if (readOnly) {
      toast.error("You have viewer access and cannot create tasks.");
      return;
    }
    if (!title.trim() || !columnId) return;

    if (isEditMode && initialTask) {
      updateTask.mutate({
        id: initialTask.id,
        data: {
          title: title.trim(),
          description: description.trim(),
          column: columnId,
          priority,
          issue_type: issueType as any,
          assignee: assigneeIds[0] || null,
          assignee_ids: assigneeIds,
          due_date: dueDate || null,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          label_ids: Array.from(selectedLabelIds),
        },
      }, {
        onSuccess: () => { toast.success("Task updated"); onOpenChange(false); },
        onError: (err) => toast.error(toErrorMessage(err, "Failed to update task")),
      });
      return;
    }

    setUploadingFiles(queuedFiles.length > 0);
    createTask.mutate({
      title: title.trim(),
      description: description.trim(),
      column: columnId,
      project: projectId,
      priority,
      issue_type: issueType as any,
      assignee: assigneeIds[0] || null,
      assignee_ids: assigneeIds,
      due_date: dueDate || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      label_ids: Array.from(selectedLabelIds),
    }, {
      onSuccess: async (createdTask) => {
        if (queuedFiles.length > 0 && createdTask?.id) {
          try {
            for (const file of queuedFiles) {
              const formData = new FormData();
              formData.append("file", file);
              await api.post(`/projects/tasks/${createdTask.id}/attachments/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            toast.success("Attachments uploaded successfully");
          } catch {
            toast.error("Task created, but some attachments failed to upload.");
          } finally {
            setUploadingFiles(false);
          }
        }
        resetForm();
        onOpenChange(false);
      },
      onError: () => setUploadingFiles(false),
    });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIssueType("task");
    setPriority("normal");
    setAssigneeIds([]);
    setDueDate("");
    setEstimatedHours("");
    setSelectedLabelIds(new Set());
    setSuggestedLabels([]);
    setGeneratedTasks([]);
    setQueuedFiles([]);
    setUploadingFiles(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleCreate();
    }
  };

  const handleGenerateTasks = async () => {
    if (readOnly) {
      toast.error("You have viewer access and cannot create tasks.");
      return;
    }
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    try {
      setGenerating(true);
      const response = await api.post<ApiResponse<{ tasks: GeneratedTask[] }>>("/ai/generate-tasks/", {
        project_id: projectId,
        project_name: title || "Project backlog",
        description,
        goal: title,
      });
      const tasks = response.data.data?.tasks ?? [];
      setGeneratedTasks(tasks);
      setSelectedGenerated(new Set(tasks.map((_, index) => index)));
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to generate tasks"));
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoDescription = async () => {
    if (readOnly) return;
    if (!aiEnabled || !activeTeamId) return;
    const trimmed = title.trim();
    if (trimmed.length < 6) return;

    try {
      setAutoWriting(true);
      const res = await api.post<
        ApiResponse<{
          description?: string;
          acceptance_criteria?: string[];
          suggested_subtasks?: string[];
        }>
      >("/ai/task-description/", {
        team_id: activeTeamId,
        title: trimmed,
        project_context: "",
      });

      const payload = res.data.data ?? {};
      const formatted = [
        (payload.description ?? "").trim(),
        payload.acceptance_criteria?.length
          ? ["", "### Acceptance Criteria", ...payload.acceptance_criteria.map((c) => `- ${c}`)].join("\n")
          : "",
        payload.suggested_subtasks?.length
          ? ["", "### Sub-tasks", ...payload.suggested_subtasks.map((s) => `- ${s}`)].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (formatted) setDescription(formatted);

      const triage = await api.post<
        ApiResponse<{
          suggested_labels?: string[];
          suggested_issue_type?: string;
          suggested_priority?: TaskPriority;
          confidence?: string;
        }>
      >("/ai/auto-label/", { team_id: activeTeamId, title: trimmed, description: formatted || description });

      const triageData = triage.data.data ?? {};
      if (triageData.suggested_priority) setPriority(triageData.suggested_priority);
      if (triageData.suggested_issue_type) setIssueType(triageData.suggested_issue_type);
      setSuggestedLabels(triageData.suggested_labels ?? []);
      
      // Auto-select labels if they match exactly
      if (triageData.suggested_labels) {
        const matchingIds = labels
          .filter(l => triageData.suggested_labels?.some(sl => sl.toLowerCase() === l.name.toLowerCase()))
          .map(l => l.id);
        if (matchingIds.length > 0) {
          setSelectedLabelIds(new Set(matchingIds));
        }
      }

      toast.success("AI analysis complete");
    } catch (err) {
      toast.error(toErrorMessage(err, "AI assist failed"));
    } finally {
      setAutoWriting(false);
    }
  };

  const createSelectedGenerated = async () => {
    if (readOnly) {
      toast.error("You have viewer access and cannot create tasks.");
      return;
    }
    if (!columnId) return;
    const selected = generatedTasks.filter((_, index) => selectedGenerated.has(index));
    if (!selected.length) return;
    try {
      for (const task of selected) {
        await createTask.mutateAsync({
          title: task.title,
          description: "",
          column: columnId,
          project: projectId,
          priority: task.priority ?? "normal",
          issue_type: task.issue_type ?? "task",
          estimated_hours: task.estimated_hours ?? null,
        });
      }
      toast.success(`Created ${selected.length} tasks`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Some tasks could not be created");
    }
  };

  const toggleLabel = (id: string) => {
    setSelectedLabelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden glass-panel border-none page-enter shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-8 pt-8 pb-6 bg-muted/20 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                {isEditMode ? "Edit Task" : "Create Task"}
              </DialogTitle>
              <p className="text-[13px] text-muted-foreground/80">
                {isEditMode ? "Update the task details below" : "Add a new work item to the project board"}
              </p>
            </div>
            {!isEditMode && (
              <AIButton
                variant="outline"
                size="sm"
                className="h-9 px-4 text-[13px] shadow-glow hover:bg-primary/5 border-primary/20 transition-all duration-300 gap-2"
                loading={generating}
                onClick={() => void handleGenerateTasks()}
              >
                <Sparkles className="h-4 w-4" />
                Magic Generate
              </AIButton>
            )}
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-background/30 backdrop-blur-sm">
          {/* Main Content Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {/* Title */}
              <div className="space-y-2.5">
                <Label htmlFor="title" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">Task Title</Label>
                <div className="relative group">
                  <Type className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="title" 
                    placeholder="Enter task name..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="pl-11 h-11 text-[15px] bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm rounded-xl"
                  />
                  {title.trim().length > 5 && (
                    <div className="absolute right-1.5 top-1.5">
                      <AIButton
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 whitespace-nowrap text-[11px] font-semibold hover:text-primary hover:bg-primary/5 rounded-lg"
                        loading={autoWriting}
                        onClick={() => void handleAutoDescription()}
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        AI Polish
                      </AIButton>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2.5">
                <Label htmlFor="description" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">Context & Requirements</Label>
                <div className="relative group">
                  <AlignLeft className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                  <Textarea 
                    id="description" 
                    placeholder="Describe what needs to be done..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="pl-11 pt-3 min-h-[160px] text-[14px] leading-relaxed bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none rounded-xl"
                  />
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2.5 pt-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments / Screenshots
                </Label>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/10 transition-all rounded-xl cursor-pointer text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span>Upload files</span>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                  {queuedFiles.length > 0 && (
                    <span className="text-[11px] text-muted-foreground/70 font-medium">
                      {queuedFiles.length} file{queuedFiles.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>

                {queuedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {queuedFiles.map((file, idx) => (
                      <div 
                        key={`${file.name}-${idx}`} 
                        className="flex items-center gap-2 bg-muted/40 hover:bg-muted/60 border border-border/50 rounded-xl px-3 py-1.5 text-[12px] group"
                      >
                        <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          ({(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0)} {file.size > 1024 * 1024 ? "MB" : "KB"})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQueuedFile(idx)}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors ml-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labels */}
              {labels.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                    <Tags className="h-3.5 w-3.5" />
                    Labels
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map(label => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-2",
                          selectedLabelIds.has(label.id)
                            ? "border-primary/50 bg-primary/10 text-primary ring-2 ring-primary/10"
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.name}
                        {selectedLabelIds.has(label.id) && <X className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Meta Info */}
            <div className="space-y-6">
              {/* Column Selection */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                  <Layout className="h-3.5 w-3.5" />
                  Status
                </Label>
                <Select value={columnId} onValueChange={setColumnId}>
                  <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl shadow-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {columns.map(col => (
                      <SelectItem key={col.id} value={col.id} className="text-[13px] py-2.5 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color || 'var(--primary)' }} />
                          {col.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Selection */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Assignees
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-xl border border-border/50 bg-background/50 shadow-sm items-center">
                  {assigneeIds.length === 0 ? (
                    <span className="text-[13px] text-muted-foreground px-1">Unassigned</span>
                  ) : (
                    assigneeIds.map((id) => {
                      const member = members.find((m) => m.user.id === id);
                      if (!member) return null;
                      return (
                        <span key={id} className="flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full text-[12px] font-medium bg-muted/60 border border-border/50">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.user.avatar_url || ""} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {member.user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.user.full_name}</span>
                          <button
                            type="button"
                            onClick={() => setAssigneeIds(assigneeIds.filter((a) => a !== id))}
                            className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 h-7 px-2 ml-auto rounded-full border border-dashed border-border/60 text-[12px] text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:border-border transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-2 glass-panel border-border/50" align="end">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-2.5 py-1.5 border-b border-border/50 mb-1">
                        Assignees
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {members.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-4">No team members</div>
                        ) : (
                          members.map((member) => {
                            const checked = assigneeIds.includes(member.user.id);
                            return (
                              <label
                                key={member.user.id}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md hover:bg-accent text-xs cursor-pointer select-none transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.user.avatar_url || ""} />
                                    <AvatarFallback className="text-[10px] font-bold">
                                      {member.user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate font-medium">{member.user.full_name}</span>
                                </div>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked) {
                                      setAssigneeIds([...assigneeIds, member.user.id]);
                                    } else {
                                      setAssigneeIds(assigneeIds.filter((a) => a !== member.user.id));
                                    }
                                  }}
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Issue Type */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" />
                  Type
                </Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl shadow-sm">
                    <SelectValue placeholder="Task" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    <SelectItem value="task" className="text-[13px] py-2.5">Task</SelectItem>
                    <SelectItem value="story" className="text-[13px] py-2.5">Story</SelectItem>
                    <SelectItem value="bug" className="text-[13px] py-2.5 text-red-500">Bug</SelectItem>
                    <SelectItem value="epic" className="text-[13px] py-2.5 text-purple-500 font-medium">Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5" />
                  Priority
                </Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                  <SelectTrigger className="h-10 bg-background/50 border-border/50 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    <SelectItem value="urgent" className="text-red-500 text-[13px] py-2.5">Urgent</SelectItem>
                    <SelectItem value="high" className="text-orange-500 text-[13px] py-2.5">High</SelectItem>
                    <SelectItem value="normal" className="text-blue-500 text-[13px] py-2.5">Normal</SelectItem>
                    <SelectItem value="low" className="text-emerald-500 text-[13px] py-2.5">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date & Estimates */}
              <div className="grid grid-cols-1 gap-4 pt-2 border-t border-border/30 mt-4">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Due Date
                  </Label>
                  <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 bg-background/50 border-border/50 rounded-xl text-[13px]"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Estimate (Hrs)
                  </Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="h-10 bg-background/50 border-border/50 rounded-xl text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Generated Suggestions */}
          {generatedTasks.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="text-[14px] font-bold tracking-tight">AI Backlog Expansion</h4>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                  {selectedGenerated.size} items selected
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {generatedTasks.map((task, index) => (
                  <label 
                    key={`${task.title}-${index}`} 
                    className={cn(
                      "flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer group relative overflow-hidden",
                      selectedGenerated.has(index) 
                        ? "bg-primary/[0.03] border-primary/40 ring-1 ring-primary/10" 
                        : "bg-background/40 border-border/50 hover:border-primary/20 hover:bg-muted/10"
                    )}
                  >
                    <div className="mt-0.5">
                      <div className={cn(
                        "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedGenerated.has(index) ? "bg-primary border-primary shadow-sm" : "border-muted-foreground/20 group-hover:border-muted-foreground/40"
                      )}>
                        {selectedGenerated.has(index) && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground stroke-[3px]" />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedGenerated.has(index)}
                        onChange={(event) => {
                          setSelectedGenerated((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(index);
                            else next.delete(index);
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "block text-[13px] font-bold leading-snug mb-2 truncate",
                        selectedGenerated.has(index) ? "text-foreground" : "text-foreground/80"
                      )}>
                        {task.title}
                      </span>
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold uppercase tracking-tight bg-background/50">
                          {task.issue_type ?? "task"}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-medium">
                          <Clock className="h-2.5 w-2.5" />
                          {task.estimated_hours ?? 0}h
                        </span>
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          task.priority === 'urgent' ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" :
                          task.priority === 'high' ? "bg-orange-500" :
                          "bg-blue-500"
                        )} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-5 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60 font-medium">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-bold">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-bold">↵</kbd>
            <span className="ml-1">to create</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
            >
              Cancel
            </Button>
            {generatedTasks.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => void createSelectedGenerated()} 
                disabled={readOnly || createTask.isPending || selectedGenerated.size === 0}
                className="h-10 px-5 text-[13px] font-bold border-primary/30 text-primary hover:bg-primary/10 transition-all rounded-xl gap-2"
              >
                Create {selectedGenerated.size} suggested
              </Button>
            )}
            <Button
              onClick={handleCreate}
              disabled={readOnly || !title.trim() || !columnId || createTask.isPending || updateTask.isPending}
              className="h-10 px-8 text-[13px] font-bold bg-primary text-primary-foreground shadow-glow hover:shadow-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl"
            >
              {(isEditMode ? updateTask.isPending : createTask.isPending) ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </div>
              ) : isEditMode ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
