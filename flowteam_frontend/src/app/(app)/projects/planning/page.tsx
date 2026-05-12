"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, FolderKanban, Gauge, Plus, Repeat, Route, Save, Target, Users2 } from "lucide-react";
import { useProject, useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import {
  useBulkUpdateTasks,
  useCreateMilestone,
  useCreateProjectTemplate,
  useCreateRecurringRule,
  useCreateSprint,
  useMilestones,
  useProjectTemplates,
  useRecurringRules,
  useRoadmapOverview,
  useRunRecurringRule,
  useSprints,
  useWorkloadOverview,
} from "@/hooks/usePlanning";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApiResponse, TeamMember } from "@/types";
import api from "@/lib/api";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

export default function ProjectPlanningPage() {
  const { user } = useAuthStore();
  const { teams, activeTeamId, fetchTeams } = useTeamStore();

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const { data: projects = [] } = useProjects(activeTeamId ?? undefined, !!user?.is_superuser, "active");
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["planning-team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const response = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return response.data.data ?? [];
    },
    enabled: !!activeTeamId,
  });

  const { data: backlogTasks = [] } = useTasks({ team_id: activeTeamId ?? undefined, status: "open" });
  const { data: sprints = [] } = useSprints({ teamId: activeTeamId ?? undefined });
  const { data: roadmap } = useRoadmapOverview(activeTeamId ?? undefined);
  const { data: milestones = [] } = useMilestones({ teamId: activeTeamId ?? undefined });
  const { data: workload = [] } = useWorkloadOverview(activeTeamId ?? undefined);
  const { data: templates = [] } = useProjectTemplates(activeTeamId ?? undefined);
  const { data: recurringRules = [] } = useRecurringRules({ teamId: activeTeamId ?? undefined });

  const createSprint = useCreateSprint();
  const createMilestone = useCreateMilestone();
  const createTemplate = useCreateProjectTemplate();
  const createRecurringRule = useCreateRecurringRule();
  const runRecurringRule = useRunRecurringRule();
  const bulkUpdateTasks = useBulkUpdateTasks();

  const [selectedBacklogTaskIds, setSelectedBacklogTaskIds] = useState<string[]>([]);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [suggestingScope, setSuggestingScope] = useState(false);
  const [scopeReasoning, setScopeReasoning] = useState("");
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroLoading, setRetroLoading] = useState(false);
  const [retroSprintName, setRetroSprintName] = useState("");
  const [retroData, setRetroData] = useState<{
    went_well: string[];
    didnt_go_well: string[];
    action_items: string[];
  } | null>(null);
  const [sprintForm, setSprintForm] = useState({
    project: "",
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
    capacity_hours: "40",
    status: "planned" as const,
  });
  const [milestoneForm, setMilestoneForm] = useState({
    project: "",
    name: "",
    description: "",
    due_date: "",
    status: "planned" as const,
  });
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    icon: "🚀",
    columnsText: "Backlog\nIn Progress\nDone",
    labelsText: "Bug:#ef4444\nFeature:#22c55e\nOps:#6366f1",
    issueTypesText: "epic\nstory\ntask\nbug\nsubtask",
  });
  const [ruleForm, setRuleForm] = useState<{
    project: string;
    column: string;
    assignee_id: string;
    title: string;
    description: string;
    issue_type: string;
    priority: string;
    frequency: "daily" | "weekly" | "monthly";
    interval: string;
    next_run_date: string;
    is_active: boolean;
  }>({
    project: "",
    column: "",
    assignee_id: "",
    title: "",
    description: "",
    issue_type: "task",
    priority: "normal",
    frequency: "weekly" as const,
    interval: "1",
    next_run_date: "",
    is_active: true,
  });
  const [memberCapacities, setMemberCapacities] = useState<Record<string, string>>({});
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;
  const sprintableBacklog = useMemo(() => backlogTasks.filter((task) => !task.sprint), [backlogTasks]);
  const { data: recurringProject } = useProject(ruleForm.project || "");

  const handleCreateSprint = async () => {
    if (!sprintForm.project || !sprintForm.name || !sprintForm.start_date || !sprintForm.end_date) return;
    await createSprint.mutateAsync({
      ...sprintForm,
      capacity_hours: Number(sprintForm.capacity_hours),
      capacities: teamMembers
        .filter((member) => memberCapacities[member.user.id])
        .map((member) => ({
          user_id: member.user.id,
          capacity_hours: Number(memberCapacities[member.user.id]),
        })),
    });
    setSprintForm({ project: "", name: "", goal: "", start_date: "", end_date: "", capacity_hours: "40", status: "planned" });
    setMemberCapacities({});
  };

  const handleAssignBacklog = async () => {
    if (!targetSprintId || selectedBacklogTaskIds.length === 0) return;
    await bulkUpdateTasks.mutateAsync({
      task_ids: selectedBacklogTaskIds,
      updates: { sprint: targetSprintId },
    });
    setSelectedBacklogTaskIds([]);
  };

  const handleAISuggestScope = async () => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    if (!targetSprintId) {
      toast.error("Select a target sprint first");
      return;
    }
    try {
      setSuggestingScope(true);
      const response = await api.post<
        ApiResponse<{
          suggested_tasks?: Array<string>;
          reasoning?: string;
        }>
      >("/ai/sprint-plan/", {
        sprint_id: targetSprintId,
        capacity_hours: Number(sprintForm.capacity_hours || 40),
      });

      const suggested = response.data.data?.suggested_tasks ?? [];
      setScopeReasoning(response.data.data?.reasoning ?? "");

      const backlogIdSet = new Set(sprintableBacklog.map((t) => t.id));
      const next = suggested.map(String).filter((id) => backlogIdSet.has(id));
      setSelectedBacklogTaskIds(next);
      toast.success("AI suggested sprint scope");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to suggest sprint scope"));
    } finally {
      setSuggestingScope(false);
    }
  };

  const handleRetro = async (sprintId: string, sprintName: string) => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    try {
      setRetroOpen(true);
      setRetroLoading(true);
      setRetroSprintName(sprintName);
      setRetroData(null);
      const res = await api.post<
        ApiResponse<{
          went_well: string[];
          didnt_go_well: string[];
          action_items: string[];
        }>
      >("/ai/retrospective/", { sprint_id: sprintId });
      setRetroData(res.data.data ?? null);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to generate retrospective"));
      setRetroOpen(false);
    } finally {
      setRetroLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.project || !milestoneForm.name || !milestoneForm.due_date) return;
    await createMilestone.mutateAsync(milestoneForm);
    setMilestoneForm({ project: "", name: "", description: "", due_date: "", status: "planned" });
  };

  const handleCreateTemplate = async () => {
    if (!activeTeamId || !templateForm.name) return;
    await createTemplate.mutateAsync({
      team: activeTeamId,
      name: templateForm.name,
      description: templateForm.description,
      color: templateForm.color,
      icon: templateForm.icon,
      columns: templateForm.columnsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name, index) => ({
          name,
          order: index,
          is_done_column: name.toLowerCase() === "done",
        })),
      labels: templateForm.labelsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, color] = line.split(":");
          return { name: name.trim(), color: (color || "#6366f1").trim() };
        }),
      default_issue_types: templateForm.issueTypesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      default_roles: [],
    });
    setTemplateForm({
      name: "",
      description: "",
      color: "#6366f1",
      icon: "🚀",
      columnsText: "Backlog\nIn Progress\nDone",
      labelsText: "Bug:#ef4444\nFeature:#22c55e\nOps:#6366f1",
      issueTypesText: "epic\nstory\ntask\nbug\nsubtask",
    });
  };

  const handleCreateRule = async () => {
    if (!ruleForm.project || !ruleForm.column || !ruleForm.title || !ruleForm.next_run_date) return;
    await createRecurringRule.mutateAsync({
      project: ruleForm.project,
      column: ruleForm.column,
      assignee_id: ruleForm.assignee_id || null,
      title: ruleForm.title,
      description: ruleForm.description,
      issue_type: ruleForm.issue_type,
      priority: ruleForm.priority,
      frequency: ruleForm.frequency,
      interval: Number(ruleForm.interval),
      next_run_date: ruleForm.next_run_date,
      is_active: ruleForm.is_active,
    });
    setRuleForm({
      project: "",
      column: "",
      assignee_id: "",
      title: "",
      description: "",
      issue_type: "task",
      priority: "normal",
      frequency: "weekly",
      interval: "1",
      next_run_date: "",
      is_active: true,
    });
  };

  const planningProjects = projects.map((project) => ({ value: project.id, label: project.name }));

  return (
    <div className="p-6 max-w-[1480px] mx-auto space-y-6">
      <section className="rounded-[24px] border border-border bg-[linear-gradient(135deg,var(--color-card)_0%,var(--color-background)_45%,var(--color-muted)_100%)] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              Planning hub
            </Badge>
            <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Sprint, roadmap, templates, recurring work, and workload</h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-muted-foreground">
              A team-level planning surface for the features you asked to complete first. Use this alongside the issue navigator
              to plan capacity, group work into sprints, forecast delivery, and standardise project setup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 text-[12px]">
                <Link href="/projects/issues">
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                  Open issue navigator
                </Link>
              </Button>
              {activeTeam && (
                <Badge variant="outline" className="h-8 border-border bg-card px-3 text-[12px] text-foreground">
                  Team: {activeTeam.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Target} label="Sprints" value={sprints.length} />
            <MetricCard icon={Route} label="Milestones" value={milestones.length} />
            <MetricCard icon={Repeat} label="Recurring rules" value={recurringRules.length} />
            <MetricCard icon={Users2} label="Team members" value={workload.length} />
          </div>
        </div>
      </section>

      <Tabs defaultValue="sprints" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="sprints">Sprint planning</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="recurring">Recurring work</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card title="Create sprint" icon={Target}>
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Project" value={sprintForm.project} onChange={(value) => setSprintForm((current) => ({ ...current, project: value }))} options={planningProjects} />
                <TextField label="Sprint name" value={sprintForm.name} onChange={(value) => setSprintForm((current) => ({ ...current, name: value }))} />
                <TextField label="Goal" value={sprintForm.goal} onChange={(value) => setSprintForm((current) => ({ ...current, goal: value }))} />
                <TextField label="Total capacity hours" type="number" value={sprintForm.capacity_hours} onChange={(value) => setSprintForm((current) => ({ ...current, capacity_hours: value }))} />
                <TextField label="Start date" type="date" value={sprintForm.start_date} onChange={(value) => setSprintForm((current) => ({ ...current, start_date: value }))} />
                <TextField label="End date" type="date" value={sprintForm.end_date} onChange={(value) => setSprintForm((current) => ({ ...current, end_date: value }))} />
              </div>
              <div className="mt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Capacity planning</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                      <div>
                        <p className="text-[13px] font-medium">{member.user.full_name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={memberCapacities[member.user.id] ?? ""}
                        onChange={(event) => setMemberCapacities((current) => ({ ...current, [member.user.id]: event.target.value }))}
                        className="w-24 text-[12px]"
                        placeholder="hrs"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button className="mt-4" onClick={() => void handleCreateSprint()} disabled={createSprint.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {createSprint.isPending ? "Creating..." : "Create sprint"}
              </Button>
            </Card>

            <Card title="Backlog and sprint assignment" icon={CalendarRange}>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={targetSprintId}
                  onChange={(event) => setTargetSprintId(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select target sprint</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => void handleAssignBacklog()} disabled={!targetSprintId || selectedBacklogTaskIds.length === 0 || bulkUpdateTasks.isPending}>
                  Assign selected backlog items
                </Button>
                <AIButton
                  variant="outline"
                  onClick={() => void handleAISuggestScope()}
                  loading={suggestingScope}
                  disabled={!targetSprintId}
                >
                  AI suggest scope
                </AIButton>
              </div>
              {!!scopeReasoning && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">AI reasoning:</span> {scopeReasoning}
                </p>
              )}
              <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Estimate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprintableBacklog.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedBacklogTaskIds.includes(task.id)}
                            onChange={(event) => {
                              setSelectedBacklogTaskIds((current) =>
                                event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground">{task.issue_type || "task"}</p>
                        </TableCell>
                        <TableCell>{task.project_name}</TableCell>
                        <TableCell className="capitalize">{task.priority}</TableCell>
                        <TableCell>{task.estimated_hours != null ? `${task.estimated_hours}h` : "n/a"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sprints.map((sprint) => (
                  <div key={sprint.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold">{sprint.name}</p>
                        <p className="text-[12px] text-muted-foreground">{sprint.goal || "No sprint goal set"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sprint.status === "completed" && (
                          <AIButton
                            variant="outline"
                            size="sm"
                            className="h-8 text-[12px]"
                            onClick={() => void handleRetro(sprint.id, sprint.name)}
                          >
                            Retrospective
                          </AIButton>
                        )}
                        <Badge variant="outline" className="capitalize">{sprint.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-[12px] text-muted-foreground">
                      <span>Planned tasks: {sprint.planned_tasks}</span>
                      <span>Planned hours: {sprint.planned_hours}</span>
                      <span>Capacity hours: {sprint.capacity_hours}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card title="Create milestone" icon={Route}>
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Project" value={milestoneForm.project} onChange={(value) => setMilestoneForm((current) => ({ ...current, project: value }))} options={planningProjects} />
                <TextField label="Milestone name" value={milestoneForm.name} onChange={(value) => setMilestoneForm((current) => ({ ...current, name: value }))} />
                <TextField label="Description" value={milestoneForm.description} onChange={(value) => setMilestoneForm((current) => ({ ...current, description: value }))} />
                <TextField label="Due date" type="date" value={milestoneForm.due_date} onChange={(value) => setMilestoneForm((current) => ({ ...current, due_date: value }))} />
              </div>
              <Button className="mt-4" onClick={() => void handleCreateMilestone()} disabled={createMilestone.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {createMilestone.isPending ? "Creating..." : "Create milestone"}
              </Button>
            </Card>
            <Card title="Cross-project delivery view" icon={Gauge}>
              <div className="grid gap-3 md:grid-cols-2">
                {(roadmap?.projects ?? []).map((project) => (
                  <div key={project.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                      <p className="font-semibold">{project.name}</p>
                      <Badge variant="outline" className="ml-auto capitalize">{project.forecast.replace("_", " ")}</Badge>
                    </div>
                    <div className="mt-3 text-[12px] text-muted-foreground">
                      <p>Open tasks: {project.open_tasks}</p>
                      <p>Overdue tasks: {project.overdue_tasks}</p>
                      <p>Next due: {project.next_due_date ? new Date(project.next_due_date).toLocaleDateString() : "n/a"}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dependency bars</p>
                <p className="mt-2 text-[14px] font-medium">{roadmap?.dependency_count ?? 0} issue dependencies tracked across this team</p>
              </div>
              <div className="mt-4 space-y-3">
                {(roadmap?.milestones ?? []).map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <p className="font-semibold">{milestone.name}</p>
                      <p className="text-[12px] text-muted-foreground">{milestone.project_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="capitalize">{milestone.status.replace("_", " ")}</Badge>
                      <p className="mt-1 text-[12px] text-muted-foreground">{new Date(milestone.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card title="Create project template" icon={Save}>
              <div className="grid gap-3">
                <TextField label="Template name" value={templateForm.name} onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))} />
                <TextField label="Description" value={templateForm.description} onChange={(value) => setTemplateForm((current) => ({ ...current, description: value }))} />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Color" value={templateForm.color} onChange={(value) => setTemplateForm((current) => ({ ...current, color: value }))} />
                  <TextField label="Icon" value={templateForm.icon} onChange={(value) => setTemplateForm((current) => ({ ...current, icon: value }))} />
                </div>
                <TextareaField label="Columns" value={templateForm.columnsText} onChange={(value) => setTemplateForm((current) => ({ ...current, columnsText: value }))} helper="One column per line. Use 'Done' for the done lane." />
                <TextareaField label="Labels" value={templateForm.labelsText} onChange={(value) => setTemplateForm((current) => ({ ...current, labelsText: value }))} helper="Format: Label:#hex" />
                <TextareaField label="Issue types" value={templateForm.issueTypesText} onChange={(value) => setTemplateForm((current) => ({ ...current, issueTypesText: value }))} helper="One issue type per line." />
              </div>
              <Button className="mt-4" onClick={() => void handleCreateTemplate()} disabled={createTemplate.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {createTemplate.isPending ? "Saving..." : "Save template"}
              </Button>
            </Card>
            <Card title="Existing templates" icon={FolderKanban}>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <span>{template.icon || "📦"}</span>
                      <p className="font-semibold">{template.name}</p>
                    </div>
                    <p className="mt-2 text-[12px] text-muted-foreground">{template.description || "No description"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.columns.map((column) => (
                        <Badge key={column.name} variant="outline">{column.name}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card title="Create recurring work rule" icon={Repeat}>
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Project" value={ruleForm.project} onChange={(value) => setRuleForm((current) => ({ ...current, project: value, column: "" }))} options={planningProjects} />
                <select value={ruleForm.column} onChange={(event) => setRuleForm((current) => ({ ...current, column: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select column</option>
                  {(recurringProject?.columns ?? []).map((column) => (
                    <option key={column.id} value={column.id}>{column.name}</option>
                  ))}
                </select>
                <TextField label="Title" value={ruleForm.title} onChange={(value) => setRuleForm((current) => ({ ...current, title: value }))} />
                <TextField label="Next run date" type="date" value={ruleForm.next_run_date} onChange={(value) => setRuleForm((current) => ({ ...current, next_run_date: value }))} />
                <TextField label="Description" value={ruleForm.description} onChange={(value) => setRuleForm((current) => ({ ...current, description: value }))} />
                <TextField label="Interval" type="number" value={ruleForm.interval} onChange={(value) => setRuleForm((current) => ({ ...current, interval: value }))} />
                <select value={ruleForm.issue_type} onChange={(event) => setRuleForm((current) => ({ ...current, issue_type: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="subtask">Subtask</option>
                </select>
                <select value={ruleForm.priority} onChange={(event) => setRuleForm((current) => ({ ...current, priority: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <select value={ruleForm.frequency} onChange={(event) => setRuleForm((current) => ({ ...current, frequency: event.target.value as "daily" | "weekly" | "monthly" }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <select value={ruleForm.assignee_id} onChange={(event) => setRuleForm((current) => ({ ...current, assignee_id: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.user.id} value={member.user.id}>{member.user.full_name}</option>
                  ))}
                </select>
              </div>
              <Button className="mt-4" onClick={() => void handleCreateRule()} disabled={createRecurringRule.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {createRecurringRule.isPending ? "Saving..." : "Create recurring rule"}
              </Button>
            </Card>
            <Card title="Recurring rules" icon={Repeat}>
              <div className="space-y-3">
                {recurringRules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{rule.title}</p>
                        <p className="text-[12px] text-muted-foreground">{rule.project_name} • {rule.frequency} every {rule.interval}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void runRecurringRule.mutateAsync(rule.id)} disabled={runRecurringRule.isPending}>
                        Run now
                      </Button>
                    </div>
                    <div className="mt-2 text-[12px] text-muted-foreground">
                      <p>Next run: {new Date(rule.next_run_date).toLocaleDateString()}</p>
                      <p>Priority: {rule.priority}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <Card title="Workload and imbalance detection" icon={Users2}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Open tasks</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Planned hours</TableHead>
                  <TableHead>Capacity hours</TableHead>
                  <TableHead>Imbalance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell>
                      <p className="font-medium">{row.user.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{row.user.email}</p>
                    </TableCell>
                    <TableCell className="capitalize">{row.role}</TableCell>
                    <TableCell>{row.open_tasks}</TableCell>
                    <TableCell>{row.overdue_tasks}</TableCell>
                    <TableCell>{row.planned_hours}</TableCell>
                    <TableCell>{row.capacity_hours}</TableCell>
                    <TableCell className={row.imbalance > 0 ? "text-amber-700 dark:text-amber-400 font-medium" : "text-emerald-700 dark:text-emerald-400"}>
                      {row.imbalance.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={retroOpen} onOpenChange={setRetroOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Retrospective: {retroSprintName || "Sprint"}</DialogTitle>
          </DialogHeader>
          {retroLoading && <p className="text-sm text-muted-foreground">Generating retrospective…</p>}
          {!retroLoading && !retroData && <p className="text-sm text-muted-foreground">No data yet.</p>}
          {!retroLoading && retroData && (
            <div className="space-y-4">
              <section>
                <p className="text-sm font-semibold">Went well</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {(retroData.went_well ?? []).map((item, idx) => (
                    <li key={`well-${idx}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <p className="text-sm font-semibold">Didn&apos;t go well</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {(retroData.didnt_go_well ?? []).map((item, idx) => (
                    <li key={`notwell-${idx}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <p className="text-sm font-semibold">Action items</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {(retroData.action_items ?? []).map((item, idx) => (
                    <li key={`action-${idx}`}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string; size?: number }>; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
          <Icon size={16} className="text-muted-foreground" />
        </div>
        <h2 className="text-[18px] font-semibold">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; size?: number }>; label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <p className="mt-2 text-[24px] font-semibold">{value}</p>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({ label, value, onChange, helper }: { label: string; value: string; onChange: (value: string) => void; helper?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {helper && <span className="text-[11px] text-muted-foreground">{helper}</span>}
    </label>
  );
}
