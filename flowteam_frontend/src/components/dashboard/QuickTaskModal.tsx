"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTask } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useTeamStore } from "@/store/team";
import type { TaskPriority } from "@/types/task";
import type { Column } from "@/types/project";
import type { ApiResponse } from "@/types";
import api from "@/lib/api";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

const PRIORITIES: TaskPriority[] = ["urgent", "high", "normal", "low"];
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: "text-red-600 dark:text-red-400",
  high:   "text-amber-600 dark:text-amber-400",
  normal: "text-primary",
  low:    "text-muted-foreground",
};

export function QuickTaskModal({ open, onOpenChange, defaultProjectId }: Props) {
  const { activeTeamId } = useTeamStore();
  const createTask = useCreateTask();

  const { data: projects = [] } = useProjects(activeTeamId ?? undefined);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Load columns when project changes
  useEffect(() => {
    if (!projectId) { setColumns([]); setColumnId(""); return; }
    setLoadingColumns(true);
    api.get<ApiResponse<{ columns: Column[] }>>(`/projects/${projectId}/`)
      .then((res) => {
        const cols = res.data.data?.columns ?? [];
        setColumns(cols);
        if (cols.length > 0) setColumnId(cols[0].id);
      })
      .catch(() => setColumns([]))
      .finally(() => setLoadingColumns(false));
  }, [projectId]);

  // Set default project on open
  useEffect(() => {
    if (open && defaultProjectId) setProjectId(defaultProjectId);
    if (open && !defaultProjectId && projects.length > 0) setProjectId(projects[0].id);
  }, [open, defaultProjectId, projects]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setColumnId("");
    setPriority("normal");
    setDueDate("");
    setProjectId(defaultProjectId ?? projects[0]?.id ?? "");
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Task title is required"); return; }
    if (!projectId) { toast.error("Please select a project"); return; }
    if (!columnId) { toast.error("Please select a status column"); return; }

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      project: projectId,
      column: columnId,
      priority,
      due_date: dueDate || null,
      assignee: null,
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Plus size={13} className="text-primary" />
            </div>
            Create task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold">Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="text-[13px]"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); } }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
              className="min-h-[72px] resize-none text-[12.5px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Project <span className="text-destructive">*</span></Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 text-[12.5px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[12.5px]">
                      <span className="flex items-center gap-2">
                        <span>{p.icon ?? "📋"}</span>
                        <span>{p.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column / Status */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Status <span className="text-destructive">*</span></Label>
              <Select value={columnId} onValueChange={setColumnId} disabled={!projectId || loadingColumns}>
                <SelectTrigger className="h-9 text-[12.5px]">
                  {loadingColumns ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Loader2 size={11} className="animate-spin" />Loading…</div>
                  ) : (
                    <SelectValue placeholder="Select status" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[12.5px]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9 text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className={cn("text-[12.5px] capitalize font-medium", PRIORITY_COLOR[p])}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-[12.5px]"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createTask.isPending || !title.trim() || !projectId || !columnId} className="gap-1.5">
            {createTask.isPending && <Loader2 size={12} className="animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
