"use client";

import { useState } from "react";
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
import { useCreateTask } from "@/hooks/useTasks";
import { Column } from "@/types/project";
import { TaskPriority } from "@/types/task";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { useTeamStore } from "@/store/team";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

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
}

export function CreateTaskModal({ open, onOpenChange, projectId, columns }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(columns[0]?.id || "");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [autoWriting, setAutoWriting] = useState(false);
  const [suggestedLabels, setSuggestedLabels] = useState<string[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const aiEnabled = useAIStore((state) => state.aiEnabled);
  const activeTeamId = useTeamStore((state) => state.activeTeamId);
  
  const createTask = useCreateTask();

  const handleCreate = () => {
    if (!title.trim() || !columnId) return;
    
    createTask.mutate({
      title: title.trim(),
      description: description.trim(),
      column: columnId,
      project: projectId,
      priority,
    }, {
      onSuccess: () => {
        setTitle("");
        setDescription("");
        onOpenChange(false);
      }
    });
  };

  const handleGenerateTasks = async () => {
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
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    if (!activeTeamId) {
      toast.error("Select a team to use AI features");
      return;
    }
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
          ? ["", "Acceptance Criteria:", ...payload.acceptance_criteria.map((c) => `- ${c}`)].join("\n")
          : "",
        payload.suggested_subtasks?.length
          ? ["", "Suggested Subtasks:", ...payload.suggested_subtasks.map((s) => `- ${s}`)].join("\n")
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
      setSuggestedLabels(triageData.suggested_labels ?? []);
      toast.success("AI suggestions added");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to generate description"));
    } finally {
      setAutoWriting(false);
    }
  };

  const createSelectedGenerated = async () => {
    if (!columnId) return;
    const selected = generatedTasks.filter((_, index) => selectedGenerated.has(index));
    if (!selected.length) return;
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
    setGeneratedTasks([]);
    setSelectedGenerated(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Create New Task</DialogTitle>
            <AIButton variant="outline" size="sm" className="h-8 text-[12px]" loading={generating} onClick={() => void handleGenerateTasks()}>
              Generate tasks
            </AIButton>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <div className="flex items-center gap-2">
              <Input 
              id="title" 
              placeholder="Enter task title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              />
              {title.trim().length > 5 && (
                <AIButton
                  variant="outline"
                  size="sm"
                  className="h-10 whitespace-nowrap text-[12px]"
                  loading={autoWriting}
                  onClick={() => void handleAutoDescription()}
                >
                  Write description
                </AIButton>
              )}
            </div>
            {!!suggestedLabels.length && (
              <p className="text-[11px] text-muted-foreground">
                Suggested labels: {suggestedLabels.slice(0, 6).join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Add details..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Column</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {generatedTasks.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-2 text-[12px] font-semibold">Generated tasks</p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {generatedTasks.map((task, index) => (
                  <label key={`${task.title}-${index}`} className="flex items-start gap-2 rounded-md border border-border bg-background p-2 text-[12px]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
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
                    <span className="flex-1">
                      <span className="block font-medium">{task.title}</span>
                      <span className="text-muted-foreground">
                        {task.issue_type ?? "task"} - {task.priority ?? "normal"} - {task.estimated_hours ?? 0}h
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {generatedTasks.length > 0 && (
            <Button variant="outline" onClick={() => void createSelectedGenerated()} disabled={createTask.isPending || selectedGenerated.size === 0}>
              Create selected
            </Button>
          )}
          <Button onClick={handleCreate} disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
