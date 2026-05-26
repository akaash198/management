"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Paperclip } from "lucide-react";
import { useCreateTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useProject } from "@/hooks/useProjects";
import { useCreateTaskLink, useSprints, useTaskLinks } from "@/hooks/usePlanning";
import type { TeamMember } from "@/types";
import type { Project } from "@/types/project";
import type { Task, TaskMutationInput, TaskPriority } from "@/types/task";
import { toast } from "sonner";
import api from "@/lib/api";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const EMPTY_COLUMNS: Array<{ id: string; name: string }> = [];

interface ProjectIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  teamMembers: TeamMember[];
  task?: Task | null;
  defaultProjectId?: string;
}

export function ProjectIssueModal({
  open,
  onOpenChange,
  projects,
  teamMembers,
  task,
  defaultProjectId,
}: ProjectIssueModalProps) {
  const modalKey = `${task?.id ?? "new"}:${defaultProjectId ?? ""}:${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/5">
          <DialogTitle className="text-xl font-bold tracking-tight">{task ? "Edit issue" : "Create issue"}</DialogTitle>
        </DialogHeader>
        <IssueForm
          key={modalKey}
          task={task}
          projects={projects}
          teamMembers={teamMembers}
          defaultProjectId={defaultProjectId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function IssueForm({
  task,
  projects,
  teamMembers,
  defaultProjectId,
  onClose,
}: {
  task?: Task | null;
  projects: Project[];
  teamMembers: TeamMember[];
  defaultProjectId?: string;
  onClose: () => void;
}) {
  const initialProjectId = task?.project ?? defaultProjectId ?? projects[0]?.id ?? "";
  const [projectId, setProjectId] = useState(initialProjectId);
  const { data: selectedProject } = useProject(projectId);
  const { data: projectTasks = [] } = useTasks(projectId ? { project_id: projectId } : {});
  const { data: sprints = [] } = useSprints({ projectId });
  const { data: links = [] } = useTaskLinks({ taskId: task?.id });
  const columns = selectedProject?.columns ?? EMPTY_COLUMNS;

  const initialColumnId = useMemo(() => {
    if (task?.project === initialProjectId && task.column) return task.column;
    return columns[0]?.id ?? "";
  }, [columns, initialProjectId, task?.column, task?.project]);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [columnId, setColumnId] = useState(task?.project === initialProjectId ? task.column : "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    (task?.assignees?.map((a) => a.id) ?? (task?.assignee ? [task.assignee.id] : [])).filter(Boolean)
  );
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours != null ? String(task?.estimated_hours) : "");
  const [issueType, setIssueType] = useState(task?.issue_type ?? "task");
  const [sprintId, setSprintId] = useState(task?.sprint ?? "");
  const [parentTaskId, setParentTaskId] = useState(task?.parent_task_id ?? "");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState<"blocks" | "blocked_by" | "duplicates" | "relates_to">("blocks");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createLink = useCreateTaskLink();

  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setQueuedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeQueuedFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resolvedColumnId = columnId || initialColumnId;
  const isPending = createTask.isPending || updateTask.isPending;
  const availableParentTasks = projectTasks.filter((projectTask) => projectTask.id !== task?.id);

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setColumnId("");
    setSprintId("");
    setParentTaskId("");
  };

  const handleSubmit = () => {
    if (!title.trim() || !projectId || !resolvedColumnId) return;

    const payload: TaskMutationInput = {
      title: title.trim(),
      description: description.trim(),
      project: projectId,
      column: resolvedColumnId,
      assignee: assigneeIds[0] || null,
      assignee_ids: assigneeIds,
      priority,
      due_date: dueDate || null,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      issue_type: issueType as TaskMutationInput["issue_type"],
      sprint: sprintId || null,
      parent_task: parentTaskId || null,
    };

    setUploadingFiles(queuedFiles.length > 0);

    const uploadAttachments = async (targetTaskId: string) => {
      if (queuedFiles.length > 0) {
        try {
          for (const file of queuedFiles) {
            const formData = new FormData();
            formData.append("file", file);
            await api.post(`/projects/tasks/${targetTaskId}/attachments/`, formData, {
              headers: {
                "Content-Type": "multipart/form-data"
              }
            });
          }
          toast.success("Attachments uploaded successfully");
        } catch (err) {
          toast.error("Saved, but some attachments failed to upload.");
        } finally {
          setUploadingFiles(false);
        }
      }
    };

    if (task) {
      updateTask.mutate({ id: task.id, data: payload }, {
        onSuccess: async (updatedTask) => {
          await uploadAttachments(task.id);
          onClose();
        },
        onError: () => {
          setUploadingFiles(false);
        }
      });
      return;
    }

    createTask.mutate(payload, {
      onSuccess: async (createdTask) => {
        if (createdTask && createdTask.id) {
          await uploadAttachments(createdTask.id);
        }
        onClose();
      },
      onError: () => {
        setUploadingFiles(false);
      }
    });
  };

  const handleCreateLink = async () => {
    if (!task?.id || !linkTargetId) return;
    await createLink.mutateAsync({
      source_task: task.id,
      target_task: linkTargetId,
      link_type: linkType,
    });
    setLinkTargetId("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="grid gap-4 px-6 py-6">
          <div className="grid gap-2">
            <Label htmlFor="issue-title" className="text-xs font-semibold tracking-wide text-muted-foreground/80">Summary</Label>
            <Input id="issue-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Describe the work item" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="issue-description" className="text-xs font-semibold tracking-wide text-muted-foreground/80">Description</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, acceptance notes, or delivery detail"
              className="min-h-[140px]"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground/80 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments / Screenshots
            </Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                <Plus className="h-3.5 w-3.5" />
                <span>Upload files</span>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </label>
              {queuedFiles.length > 0 && (
                <span className="text-[11px] text-muted-foreground/75">
                  {queuedFiles.length} file{queuedFiles.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            {queuedFiles.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {queuedFiles.map((file, idx) => (
                  <Badge 
                    key={`${file.name}-${idx}`} 
                    variant="secondary" 
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted/50 border border-border/40"
                  >
                    <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      ({(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0)} {file.size > 1024 * 1024 ? "MB" : "KB"})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeQueuedFile(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Project" value={projectId} onChange={handleProjectChange}>
              <option value="" disabled>Select a project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>

            <SelectField label="Status" value={resolvedColumnId} onChange={setColumnId} disabled={!projectId}>
              <option value="" disabled>Select a column</option>
              {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
            </SelectField>

            <SelectField label="Issue type" value={issueType} onChange={(value) => setIssueType(value as NonNullable<TaskMutationInput["issue_type"]>)}>
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="subtask">Subtask</option>
            </SelectField>

            <SelectField label="Priority" value={priority} onChange={(value) => setPriority(value as TaskPriority)}>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </SelectField>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground/80">Assignee</Label>
              <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-md border border-input bg-background items-center">
                {assigneeIds.length === 0 ? (
                  <span className="text-sm text-muted-foreground px-1">Unassigned</span>
                ) : (
                  assigneeIds.map((id) => {
                    const member = teamMembers.find((m) => m.user.id === id);
                    if (!member) return null;
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full text-xs bg-muted/60 border border-border/50 hover:bg-muted">
                        <Avatar className="h-4.5 w-4.5 border border-background">
                          <AvatarImage src={member.user.avatar_url || ""} />
                          <AvatarFallback className="text-[9px] font-bold">
                            {initials(member.user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.user.full_name}</span>
                        <button
                          type="button"
                          onClick={() => setAssigneeIds([])}
                          className="text-muted-foreground hover:text-foreground rounded-full transition-colors ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    );
                  })
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 border-dashed rounded-full text-xs gap-1 hover:bg-muted/50 ml-auto">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-2.5 py-1.5 border-b border-border/50 mb-1">
                      Assignee
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {teamMembers.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-4">No team members available</div>
                      ) : (
                        teamMembers.map((member) => {
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
                                    {initials(member.user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-medium">{member.user.full_name}</span>
                              </div>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  if (isChecked) {
                                    setAssigneeIds([member.user.id]);
                                  } else {
                                    setAssigneeIds([]);
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

            <SelectField label="Sprint" value={sprintId} onChange={setSprintId} disabled={!projectId}>
              <option value="">Backlog / no sprint</option>
              {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
            </SelectField>

            <SelectField label="Parent issue" value={parentTaskId} onChange={setParentTaskId} disabled={!projectId}>
              <option value="">No parent</option>
              {availableParentTasks.map((parentTask) => <option key={parentTask.id} value={parentTask.id}>{parentTask.title}</option>)}
            </SelectField>

            <div className="grid gap-2">
              <Label htmlFor="issue-due-date" className="text-xs font-semibold tracking-wide text-muted-foreground/80">Due date</Label>
              <Input id="issue-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="issue-estimate" className="text-xs font-semibold tracking-wide text-muted-foreground/80">Estimate (hours)</Label>
              <Input
                id="issue-estimate"
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {task && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold">Issue relationships</p>
                  <p className="text-[12px] text-muted-foreground">Track blockers, duplicates, and related delivery links.</p>
                </div>
                {task.parent_task_id && <Badge variant="outline">Parent linked</Badge>}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <SelectField label="Target issue" value={linkTargetId} onChange={setLinkTargetId}>
                  <option value="">Select issue</option>
                  {availableParentTasks.map((linkTask) => <option key={linkTask.id} value={linkTask.id}>{linkTask.title}</option>)}
                </SelectField>
                <SelectField label="Link type" value={linkType} onChange={(value) => setLinkType(value as typeof linkType)}>
                  <option value="blocks">Blocks</option>
                  <option value="blocked_by">Blocked by</option>
                  <option value="duplicates">Duplicates</option>
                  <option value="relates_to">Relates to</option>
                </SelectField>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void handleCreateLink()} disabled={!linkTargetId || createLink.isPending}>
                    Add link
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {links.length === 0 && <p className="text-[12px] text-muted-foreground">No linked issues yet.</p>}
                {links.map((link) => (
                  <Badge key={link.id} variant="outline" className="px-3 py-1">
                    {link.link_type.replace("_", " ")}: {link.source_task === task.id ? link.target_task_title : link.source_task_title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/5 flex justify-end gap-2 shrink-0">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title.trim() || !projectId || !resolvedColumnId || isPending}>
          {isPending ? "Saving..." : task ? "Update issue" : "Create issue"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground/80">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 text-sm appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_12px_center] bg-[length:18px_18px] hover:bg-muted/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {children}
        </select>
      </div>
    </div>
  );
}
