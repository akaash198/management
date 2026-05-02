"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useProject } from "@/hooks/useProjects";
import { useCreateTaskLink, useSprints, useTaskLinks } from "@/hooks/usePlanning";
import type { TeamMember } from "@/types";
import type { Project } from "@/types/project";
import type { Task, TaskMutationInput, TaskPriority } from "@/types/task";

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
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit issue" : "Create issue"}</DialogTitle>
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

    if (task) {
      updateTask.mutate({ id: task.id, data: payload }, { onSuccess: onClose });
      return;
    }

    createTask.mutate(payload, { onSuccess: onClose });
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
    <>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="issue-title">Summary</Label>
          <Input id="issue-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Describe the work item" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="issue-description">Description</Label>
          <Textarea
            id="issue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context, acceptance notes, or delivery detail"
            className="min-h-[140px]"
          />
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
            <Label htmlFor="issue-assignees">Assignees</Label>
            <select
              id="issue-assignees"
              multiple
              value={assigneeIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((o) => o.value).filter(Boolean);
                setAssigneeIds(values);
              }}
              className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {teamMembers.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.full_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">Hold Ctrl/Cmd to select multiple.</p>
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
            <Label htmlFor="issue-due-date">Due date</Label>
            <Input id="issue-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="issue-estimate">Estimate (hours)</Label>
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

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title.trim() || !projectId || !resolvedColumnId || isPending}>
          {isPending ? "Saving..." : task ? "Update issue" : "Create issue"}
        </Button>
      </DialogFooter>
    </>
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
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {children}
      </select>
    </div>
  );
}
