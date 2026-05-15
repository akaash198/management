"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  FolderKanban,
  Gauge,
  Layers,
  Loader2,
  Play,
  Plus,
  Repeat,
  Route,
  Save,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users2,
  Zap,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApiResponse, TeamMember } from "@/types";
import api from "@/lib/api";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "MMM d, yyyy"); } catch { return v; }
}
function fmtAgo(v: string) {
  try { return formatDistanceToNow(new Date(v), { addSuffix: true }); } catch { return v; }
}
function daysUntil(v: string) {
  try { return differenceInDays(new Date(v), new Date()); } catch { return 0; }
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  low: "bg-muted text-muted-foreground",
};

// ─── page ─────────────────────────────────────────────────────────────────────
export default function ProjectPlanningPage() {
  const { user } = useAuthStore();
  const { teams, activeTeamId, fetchTeams } = useTeamStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);
  const queryClient = useQueryClient();

  useEffect(() => { void fetchTeams(); }, [fetchTeams]);

  const { data: projects = [] } = useProjects(activeTeamId ?? undefined, !!user?.is_superuser, "active");
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["planning-team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const r = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return r.data.data ?? [];
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

  // delete mutations
  const deleteSprint = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/sprints/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "sprints"] }); toast.success("Sprint deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete sprint")),
  });
  const updateSprintStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/projects/sprints/${id}/`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "sprints"] }); toast.success("Sprint updated"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to update sprint")),
  });
  const deleteMilestone = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/milestones/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "milestones"] }); queryClient.invalidateQueries({ queryKey: ["planning", "roadmap"] }); toast.success("Milestone deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete milestone")),
  });
  const updateMilestoneStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/projects/milestones/${id}/`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "milestones"] }); queryClient.invalidateQueries({ queryKey: ["planning", "roadmap"] }); toast.success("Milestone updated"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to update milestone")),
  });
  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/templates/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "templates"] }); toast.success("Template deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete template")),
  });
  const deleteRecurringRule = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/recurring-rules/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planning", "recurring"] }); toast.success("Rule deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete rule")),
  });

  // Sprint form
  const [sprintForm, setSprintForm] = useState({ project: "", name: "", goal: "", start_date: "", end_date: "", capacity_hours: "40", status: "planned" as const });
  const [memberCapacities, setMemberCapacities] = useState<Record<string, string>>({});
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<string[]>([]);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [suggestingScope, setSuggestingScope] = useState(false);
  const [scopeReasoning, setScopeReasoning] = useState("");
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);

  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState({ project: "", name: "", description: "", due_date: "", status: "planned" as const });

  // Template form
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", color: "#6366f1", icon: "🚀", columnsText: "Backlog\nIn Progress\nDone", labelsText: "Bug:#ef4444\nFeature:#22c55e\nOps:#6366f1", issueTypesText: "epic\nstory\ntask\nbug\nsubtask" });

  // Recurring rule form
  const [ruleForm, setRuleForm] = useState<{ project: string; column: string; assignee_id: string; title: string; description: string; issue_type: string; priority: string; frequency: "daily" | "weekly" | "monthly"; interval: string; next_run_date: string; is_active: boolean }>({ project: "", column: "", assignee_id: "", title: "", description: "", issue_type: "task", priority: "normal", frequency: "weekly", interval: "1", next_run_date: "", is_active: true });
  const { data: recurringProject } = useProject(ruleForm.project || "");

  // AI retro dialog
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroLoading, setRetroLoading] = useState(false);
  const [retroSprintName, setRetroSprintName] = useState("");
  const [retroData, setRetroData] = useState<{ went_well: string[]; didnt_go_well: string[]; action_items: string[] } | null>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const sprintableBacklog = useMemo(() => backlogTasks.filter((t) => !t.sprint), [backlogTasks]);
  const planningProjects = projects.map((p) => ({ value: p.id, label: p.name }));

  const handleCreateSprint = async () => {
    if (!sprintForm.project || !sprintForm.name || !sprintForm.start_date || !sprintForm.end_date) return;
    await createSprint.mutateAsync({
      ...sprintForm,
      capacity_hours: Number(sprintForm.capacity_hours),
      capacities: teamMembers.filter((m) => memberCapacities[m.user.id]).map((m) => ({ user_id: m.user.id, capacity_hours: Number(memberCapacities[m.user.id]) })),
    });
    setSprintForm({ project: "", name: "", goal: "", start_date: "", end_date: "", capacity_hours: "40", status: "planned" });
    setMemberCapacities({});
  };

  const handleAssignBacklog = async () => {
    if (!targetSprintId || selectedBacklogIds.length === 0) return;
    await bulkUpdateTasks.mutateAsync({ task_ids: selectedBacklogIds, updates: { sprint: targetSprintId } });
    setSelectedBacklogIds([]);
  };

  const handleAISuggestScope = async () => {
    if (!aiEnabled) { toast.error("AI features are not enabled for this team"); return; }
    if (!targetSprintId) { toast.error("Select a target sprint first"); return; }
    try {
      setSuggestingScope(true);
      const r = await api.post<ApiResponse<{ suggested_tasks?: string[]; reasoning?: string }>>("/ai/sprint-plan/", { sprint_id: targetSprintId, capacity_hours: Number(sprintForm.capacity_hours || 40) });
      const suggested = r.data.data?.suggested_tasks ?? [];
      setScopeReasoning(r.data.data?.reasoning ?? "");
      const backlogSet = new Set(sprintableBacklog.map((t) => t.id));
      setSelectedBacklogIds(suggested.map(String).filter((id) => backlogSet.has(id)));
      toast.success("AI suggested sprint scope");
    } catch (e) { toast.error(toErrorMessage(e, "Failed to suggest scope")); }
    finally { setSuggestingScope(false); }
  };

  const handleRetro = async (sprintId: string, sprintName: string) => {
    if (!aiEnabled) { toast.error("AI features are not enabled for this team"); return; }
    try {
      setRetroOpen(true); setRetroLoading(true); setRetroSprintName(sprintName); setRetroData(null);
      const r = await api.post<ApiResponse<{ went_well: string[]; didnt_go_well: string[]; action_items: string[] }>>("/ai/retrospective/", { sprint_id: sprintId });
      setRetroData(r.data.data ?? null);
    } catch (e) { toast.error(toErrorMessage(e, "Failed to generate retrospective")); setRetroOpen(false); }
    finally { setRetroLoading(false); }
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
      columns: templateForm.columnsText.split("\n").map((l, i) => ({ name: l.trim(), order: i, is_done_column: l.trim().toLowerCase() === "done" })).filter((c) => c.name),
      labels: templateForm.labelsText.split("\n").filter(Boolean).map((l) => { const [name, color] = l.split(":"); return { name: name.trim(), color: (color || "#6366f1").trim() }; }),
      default_issue_types: templateForm.issueTypesText.split("\n").map((l) => l.trim()).filter(Boolean),
      default_roles: [],
    });
    setTemplateForm({ name: "", description: "", color: "#6366f1", icon: "🚀", columnsText: "Backlog\nIn Progress\nDone", labelsText: "Bug:#ef4444\nFeature:#22c55e\nOps:#6366f1", issueTypesText: "epic\nstory\ntask\nbug\nsubtask" });
  };

  const handleCreateRule = async () => {
    if (!ruleForm.project || !ruleForm.column || !ruleForm.title || !ruleForm.next_run_date) return;
    await createRecurringRule.mutateAsync({ ...ruleForm, assignee_id: ruleForm.assignee_id || null, interval: Number(ruleForm.interval) });
    setRuleForm({ project: "", column: "", assignee_id: "", title: "", description: "", issue_type: "task", priority: "normal", frequency: "weekly", interval: "1", next_run_date: "", is_active: true });
  };

  return (
    <div className="p-6 max-w-[1480px] mx-auto space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-background to-muted/40 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              Planning hub
            </Badge>
            <h1 className="mt-2 text-[22px] font-bold tracking-tight">Sprints · Roadmap · Templates · Recurring · Workload</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
              Plan capacity, group work into sprints, track milestones, and standardise project setup across your team.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
                <Link href="/projects/issues"><FolderKanban className="h-3.5 w-3.5" />Issue navigator</Link>
              </Button>
              {activeTeam && <Badge variant="outline" className="h-8 px-3 text-[12px]">{activeTeam.name}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatChip icon={Target} label="Sprints" value={sprints.length} accent="amber" />
            <StatChip icon={Route} label="Milestones" value={milestones.length} accent="blue" />
            <StatChip icon={Repeat} label="Recurring" value={recurringRules.length} accent="violet" />
            <StatChip icon={Users2} label="Members" value={workload.length} accent="emerald" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="sprints" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="sprints" className="gap-1.5 text-[12px]"><Target size={13} />Sprint planning</TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5 text-[12px]"><Route size={13} />Roadmap</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-[12px]"><Save size={13} />Templates</TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1.5 text-[12px]"><Repeat size={13} />Recurring work</TabsTrigger>
          <TabsTrigger value="workload" className="gap-1.5 text-[12px]"><Users2 size={13} />Workload</TabsTrigger>
        </TabsList>

        {/* ── SPRINT PLANNING ── */}
        <TabsContent value="sprints" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <SectionCard title="Create sprint" icon={Target}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Project" className="col-span-2">
                    <Select value={sprintForm.project} onChange={(v) => setSprintForm((s) => ({ ...s, project: v }))} options={planningProjects} placeholder="Select project" />
                  </Field>
                  <Field label="Sprint name" className="col-span-2">
                    <Input value={sprintForm.name} onChange={(e) => setSprintForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Sprint 12" />
                  </Field>
                  <Field label="Start date">
                    <Input type="date" value={sprintForm.start_date} onChange={(e) => setSprintForm((s) => ({ ...s, start_date: e.target.value }))} />
                  </Field>
                  <Field label="End date">
                    <Input type="date" value={sprintForm.end_date} onChange={(e) => setSprintForm((s) => ({ ...s, end_date: e.target.value }))} />
                  </Field>
                  <Field label="Goal" className="col-span-2">
                    <Input value={sprintForm.goal} onChange={(e) => setSprintForm((s) => ({ ...s, goal: e.target.value }))} placeholder="What should this sprint achieve?" />
                  </Field>
                  <Field label="Total capacity (h)" className="col-span-2">
                    <Input type="number" min="0" value={sprintForm.capacity_hours} onChange={(e) => setSprintForm((s) => ({ ...s, capacity_hours: e.target.value }))} />
                  </Field>
                </div>

                {teamMembers.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Per-member capacity</p>
                    <div className="space-y-2">
                      {teamMembers.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {m.user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[12px] font-medium">{m.user.full_name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                            </div>
                          </div>
                          <Input type="number" min="0" placeholder="hrs" value={memberCapacities[m.user.id] ?? ""} onChange={(e) => setMemberCapacities((s) => ({ ...s, [m.user.id]: e.target.value }))} className="w-20 text-[12px] h-7" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full gap-2" onClick={() => void handleCreateSprint()} disabled={createSprint.isPending || !sprintForm.project || !sprintForm.name || !sprintForm.start_date || !sprintForm.end_date}>
                  {createSprint.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create sprint
                </Button>
              </div>
            </SectionCard>

            <div className="space-y-5">
              {/* Backlog assignment */}
              <SectionCard title="Backlog assignment" icon={CalendarRange}>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Select value={targetSprintId} onChange={setTargetSprintId}
                    options={sprints.map((s) => ({ value: s.id, label: s.name }))} placeholder="Select target sprint" />
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handleAssignBacklog()} disabled={!targetSprintId || selectedBacklogIds.length === 0 || bulkUpdateTasks.isPending}>
                    {bulkUpdateTasks.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarRange size={13} />}
                    Assign {selectedBacklogIds.length > 0 ? `(${selectedBacklogIds.length})` : "selected"}
                  </Button>
                  {aiEnabled && (
                    <AIButton variant="outline" size="sm" onClick={() => void handleAISuggestScope()} loading={suggestingScope} disabled={!targetSprintId}>
                      <Sparkles size={12} className="mr-1" />AI suggest scope
                    </AIButton>
                  )}
                  {selectedBacklogIds.length > 0 && (
                    <button className="text-[12px] text-muted-foreground hover:text-foreground" onClick={() => setSelectedBacklogIds([])}>Clear</button>
                  )}
                </div>
                {scopeReasoning && (
                  <div className="mb-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground">AI: </span>{scopeReasoning}
                  </div>
                )}
                {sprintableBacklog.length === 0 ? (
                  <EmptyState icon={CalendarRange} message="No unassigned backlog items" sub="All open tasks are already in a sprint." />
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 px-3 py-2 bg-muted/40 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="w-6" />
                      <div>Task</div>
                      <div className="w-24 text-center">Project</div>
                      <div className="w-20 text-center">Priority</div>
                      <div className="w-16 text-right">Est.</div>
                    </div>
                    <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                      {sprintableBacklog.map((task) => (
                        <label key={task.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 px-3 py-2.5 hover:bg-muted/30 cursor-pointer">
                          <input type="checkbox" className="mr-3 rounded" checked={selectedBacklogIds.includes(task.id)} onChange={(e) => setSelectedBacklogIds((s) => e.target.checked ? [...s, task.id] : s.filter((id) => id !== task.id))} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground">{task.issue_type ?? "task"}</p>
                          </div>
                          <span className="w-24 text-center text-[11px] text-muted-foreground truncate">{task.project_name}</span>
                          <span className={cn("w-20 text-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize mx-auto", PRIORITY_COLORS[task.priority ?? "normal"])}>{task.priority}</span>
                          <span className="w-16 text-right text-[12px] text-muted-foreground">{task.estimated_hours != null ? `${task.estimated_hours}h` : "—"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Sprint list */}
              <SectionCard title="Sprints" icon={Target} count={sprints.length}>
                {sprints.length === 0 ? (
                  <EmptyState icon={Target} message="No sprints yet" sub="Create your first sprint using the form on the left." />
                ) : (
                  <div className="space-y-3">
                    {sprints.map((sprint) => {
                      const isExpanded = expandedSprint === sprint.id;
                      const utilPct = sprint.capacity_hours > 0 ? Math.min(100, Math.round((sprint.planned_hours / sprint.capacity_hours) * 100)) : 0;
                      const statusMeta = {
                        planned: { cls: "bg-muted text-muted-foreground", label: "Planned" },
                        active: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", label: "Active" },
                        completed: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", label: "Completed" },
                      }[sprint.status];
                      return (
                        <div key={sprint.id} className="rounded-xl border border-border overflow-hidden">
                          <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold">{sprint.name}</p>
                                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusMeta.cls)}>{statusMeta.label}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {fmtDate(sprint.start_date)} → {fmtDate(sprint.end_date)} · {sprint.planned_tasks} tasks · {sprint.planned_hours}h planned
                              </p>
                            </div>
                            <ChevronDown size={14} className={cn("shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                              {sprint.goal && <p className="text-[13px] text-muted-foreground italic">"{sprint.goal}"</p>}
                              {/* capacity bar */}
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                  <span>Capacity utilisation</span>
                                  <span className={cn("font-semibold", utilPct > 90 ? "text-red-500" : utilPct > 70 ? "text-amber-500" : "text-emerald-500")}>{utilPct}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div className={cn("h-full rounded-full", utilPct > 90 ? "bg-red-400" : utilPct > 70 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${utilPct}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">{sprint.planned_hours}h planned / {sprint.capacity_hours}h capacity</p>
                              </div>
                              {sprint.member_capacities.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {sprint.member_capacities.map((mc) => (
                                    <div key={mc.id} className="rounded-md bg-muted px-2 py-1 text-[11px]">
                                      <span className="font-medium">{mc.user.full_name}</span>
                                      <span className="text-muted-foreground ml-1">{mc.capacity_hours}h</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {sprint.status === "planned" && (
                                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-[12px]" onClick={() => void updateSprintStatus.mutateAsync({ id: sprint.id, status: "active" })}>
                                    <Play size={11} />Start sprint
                                  </Button>
                                )}
                                {sprint.status === "active" && (
                                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-[12px]" onClick={() => void updateSprintStatus.mutateAsync({ id: sprint.id, status: "completed" })}>
                                    <CheckCircle2 size={11} />Complete sprint
                                  </Button>
                                )}
                                {sprint.status === "completed" && aiEnabled && (
                                  <AIButton size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => void handleRetro(sprint.id, sprint.name)}>
                                    <Sparkles size={11} className="mr-1" />AI Retro
                                  </AIButton>
                                )}
                                <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-[12px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => void deleteSprint.mutateAsync(sprint.id)}>
                                  <Trash2 size={11} />Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── ROADMAP ── */}
        <TabsContent value="roadmap" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
            <SectionCard title="Create milestone" icon={Route}>
              <div className="space-y-3">
                <Field label="Project">
                  <Select value={milestoneForm.project} onChange={(v) => setMilestoneForm((s) => ({ ...s, project: v }))} options={planningProjects} placeholder="Select project" />
                </Field>
                <Field label="Milestone name">
                  <Input value={milestoneForm.name} onChange={(e) => setMilestoneForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Public beta launch" />
                </Field>
                <Field label="Description">
                  <textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm((s) => ({ ...s, description: e.target.value }))}
                    className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="What does this milestone represent?" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Due date">
                    <Input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm((s) => ({ ...s, due_date: e.target.value }))} />
                  </Field>
                  <Field label="Status">
                    <Select value={milestoneForm.status} onChange={(v) => setMilestoneForm((s) => ({ ...s, status: v as typeof milestoneForm.status }))}
                      options={[{ value: "planned", label: "Planned" }, { value: "at_risk", label: "At risk" }, { value: "completed", label: "Completed" }]} />
                  </Field>
                </div>
                <Button className="w-full gap-2" onClick={() => void handleCreateMilestone()} disabled={createMilestone.isPending || !milestoneForm.project || !milestoneForm.name || !milestoneForm.due_date}>
                  {createMilestone.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create milestone
                </Button>
              </div>
            </SectionCard>

            <div className="space-y-5">
              {/* Cross-project status */}
              <SectionCard title="Project health" icon={Gauge} count={(roadmap?.projects ?? []).length}>
                {(roadmap?.projects ?? []).length === 0 ? (
                  <EmptyState icon={Gauge} message="No projects" sub="Active projects will appear here." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(roadmap?.projects ?? []).map((proj) => {
                      const isAtRisk = proj.forecast === "at_risk";
                      return (
                        <div key={proj.id} className={cn("rounded-xl border p-4", isAtRisk ? "border-amber-200 dark:border-amber-800" : "border-border")}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                            <p className="text-[13px] font-semibold truncate flex-1">{proj.name}</p>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", isAtRisk ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400")}>
                              {isAtRisk ? "At risk" : "On track"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="text-center">
                              <p className="text-muted-foreground">Open</p>
                              <p className="font-semibold text-[15px]">{proj.open_tasks}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">Overdue</p>
                              <p className={cn("font-semibold text-[15px]", proj.overdue_tasks > 0 ? "text-red-500" : "")}>{proj.overdue_tasks}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">Next due</p>
                              <p className="font-semibold text-[12px]">{proj.next_due_date ? format(new Date(proj.next_due_date), "MMM d") : "—"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(roadmap?.dependency_count ?? 0) > 0 && (
                  <div className="mt-3 rounded-lg bg-muted/40 border border-border px-3 py-2 text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{roadmap?.dependency_count}</span> issue dependencies tracked across this team
                  </div>
                )}
              </SectionCard>

              {/* Milestone timeline */}
              <SectionCard title="Milestones" icon={Route} count={milestones.length}>
                {milestones.length === 0 ? (
                  <EmptyState icon={Route} message="No milestones yet" sub="Create your first milestone using the form on the left." />
                ) : (
                  <div className="space-y-3">
                    {milestones.map((ms) => {
                      const days = daysUntil(ms.due_date);
                      const overdue = isPast(new Date(ms.due_date)) && ms.status !== "completed";
                      const statusMeta = {
                        planned: { cls: "bg-muted text-muted-foreground", icon: Clock },
                        at_risk: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: AlertTriangle },
                        completed: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", icon: CheckCircle2 },
                      }[ms.status];
                      const StatusIcon = statusMeta.icon;
                      return (
                        <div key={ms.id} className={cn("rounded-xl border p-4", overdue ? "border-red-200 dark:border-red-800" : "border-border")}>
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", statusMeta.cls)}>
                              <StatusIcon size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[13px] font-semibold">{ms.name}</p>
                                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusMeta.cls)}>{ms.status.replace("_", " ")}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: ms.project_color }} />
                                {ms.project_name} · Due {fmtDate(ms.due_date)}
                                {ms.status !== "completed" && (
                                  <span className={cn("ml-2 font-medium", overdue ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-muted-foreground")}>
                                    {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                                  </span>
                                )}
                              </p>
                              {ms.description && <p className="text-[12px] text-muted-foreground mt-1">{ms.description}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ms.status !== "completed" && (
                                <button onClick={() => void updateMilestoneStatus.mutateAsync({ id: ms.id, status: "completed" })} className="text-muted-foreground hover:text-emerald-500 transition-colors" title="Mark completed">
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {ms.status === "planned" && (
                                <button onClick={() => void updateMilestoneStatus.mutateAsync({ id: ms.id, status: "at_risk" })} className="text-muted-foreground hover:text-amber-500 transition-colors" title="Mark at risk">
                                  <AlertTriangle size={14} />
                                </button>
                              )}
                              <button onClick={() => void deleteMilestone.mutateAsync(ms.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── TEMPLATES ── */}
        <TabsContent value="templates" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
            <SectionCard title="Create template" icon={Save}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" className="col-span-2">
                    <Input value={templateForm.name} onChange={(e) => setTemplateForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. SaaS Sprint" />
                  </Field>
                  <Field label="Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={templateForm.color} onChange={(e) => setTemplateForm((s) => ({ ...s, color: e.target.value }))} className="h-9 w-9 rounded-md border border-input cursor-pointer p-0.5" />
                      <Input value={templateForm.color} onChange={(e) => setTemplateForm((s) => ({ ...s, color: e.target.value }))} className="font-mono text-[12px]" />
                    </div>
                  </Field>
                  <Field label="Icon">
                    <Input value={templateForm.icon} onChange={(e) => setTemplateForm((s) => ({ ...s, icon: e.target.value }))} placeholder="🚀" />
                  </Field>
                  <Field label="Description" className="col-span-2">
                    <Input value={templateForm.description} onChange={(e) => setTemplateForm((s) => ({ ...s, description: e.target.value }))} placeholder="Brief description" />
                  </Field>
                </div>
                <Field label="Columns (one per line, 'Done' marks the done column)">
                  <textarea value={templateForm.columnsText} onChange={(e) => setTemplateForm((s) => ({ ...s, columnsText: e.target.value }))}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-[13px] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                </Field>
                <Field label="Labels (Name:#hex, one per line)">
                  <textarea value={templateForm.labelsText} onChange={(e) => setTemplateForm((s) => ({ ...s, labelsText: e.target.value }))}
                    className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-[13px] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                </Field>
                <Field label="Issue types (one per line)">
                  <textarea value={templateForm.issueTypesText} onChange={(e) => setTemplateForm((s) => ({ ...s, issueTypesText: e.target.value }))}
                    className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-[13px] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                </Field>
                <Button className="w-full gap-2" onClick={() => void handleCreateTemplate()} disabled={createTemplate.isPending || !templateForm.name}>
                  {createTemplate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save template
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Existing templates" icon={FolderKanban} count={templates.length}>
              {templates.length === 0 ? (
                <EmptyState icon={FolderKanban} message="No templates yet" sub="Save your first project template using the form on the left." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: tpl.color + "22" }}>
                          {tpl.icon ?? "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{tpl.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.description || "No description"}</p>
                        </div>
                        <button onClick={() => void deleteTemplate.mutateAsync(tpl.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {tpl.columns.map((col) => (
                            <span key={col.name} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", col.is_done_column ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-border bg-muted text-muted-foreground")}>{col.name}</span>
                          ))}
                        </div>
                        {tpl.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tpl.labels.map((lbl) => (
                              <span key={lbl.name} className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border" style={{ backgroundColor: lbl.color + "22", color: lbl.color }}>{lbl.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── RECURRING WORK ── */}
        <TabsContent value="recurring" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
            <SectionCard title="Create recurring rule" icon={Repeat}>
              <div className="space-y-3">
                <Field label="Project">
                  <Select value={ruleForm.project} onChange={(v) => setRuleForm((s) => ({ ...s, project: v, column: "" }))} options={planningProjects} placeholder="Select project" />
                </Field>
                <Field label="Column">
                  <Select value={ruleForm.column} onChange={(v) => setRuleForm((s) => ({ ...s, column: v }))}
                    options={(recurringProject?.columns ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Select column" />
                </Field>
                <Field label="Task title">
                  <Input value={ruleForm.title} onChange={(e) => setRuleForm((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Weekly security review" />
                </Field>
                <Field label="Description">
                  <textarea value={ruleForm.description} onChange={(e) => setRuleForm((s) => ({ ...s, description: e.target.value }))}
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Optional description…" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Frequency">
                    <Select value={ruleForm.frequency} onChange={(v) => setRuleForm((s) => ({ ...s, frequency: v as "daily" | "weekly" | "monthly" }))}
                      options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
                  </Field>
                  <Field label="Interval">
                    <Input type="number" min="1" value={ruleForm.interval} onChange={(e) => setRuleForm((s) => ({ ...s, interval: e.target.value }))} />
                  </Field>
                  <Field label="Issue type">
                    <Select value={ruleForm.issue_type} onChange={(v) => setRuleForm((s) => ({ ...s, issue_type: v }))}
                      options={[{ value: "task", label: "Task" }, { value: "bug", label: "Bug" }, { value: "story", label: "Story" }, { value: "epic", label: "Epic" }, { value: "subtask", label: "Subtask" }]} />
                  </Field>
                  <Field label="Priority">
                    <Select value={ruleForm.priority} onChange={(v) => setRuleForm((s) => ({ ...s, priority: v }))}
                      options={[{ value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }, { value: "low", label: "Low" }]} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Next run date" className="col-span-2">
                    <Input type="date" value={ruleForm.next_run_date} onChange={(e) => setRuleForm((s) => ({ ...s, next_run_date: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Assignee">
                  <Select value={ruleForm.assignee_id} onChange={(v) => setRuleForm((s) => ({ ...s, assignee_id: v }))}
                    options={teamMembers.map((m) => ({ value: m.user.id, label: m.user.full_name }))} placeholder="Unassigned" />
                </Field>
                <Button className="w-full gap-2" onClick={() => void handleCreateRule()} disabled={createRecurringRule.isPending || !ruleForm.project || !ruleForm.column || !ruleForm.title || !ruleForm.next_run_date}>
                  {createRecurringRule.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create rule
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Recurring rules" icon={Repeat} count={recurringRules.length}>
              {recurringRules.length === 0 ? (
                <EmptyState icon={Repeat} message="No recurring rules" sub="Create a rule on the left to automate task generation." />
              ) : (
                <div className="space-y-3">
                  {recurringRules.map((rule) => {
                    const nextRun = new Date(rule.next_run_date);
                    const overdue = isPast(nextRun);
                    const days = daysUntil(rule.next_run_date);
                    return (
                      <div key={rule.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", rule.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                            <Repeat size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13px] font-semibold">{rule.title}</p>
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_COLORS[rule.priority])}>{rule.priority}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {rule.project_name} · {rule.frequency === "daily" ? "Every" : "Every"} {rule.interval > 1 ? rule.interval : ""} {rule.frequency}
                              {rule.assignee ? ` · ${rule.assignee.full_name}` : ""}
                            </p>
                            <p className={cn("text-[11px] mt-0.5", overdue ? "text-red-500 font-medium" : days <= 2 ? "text-amber-500" : "text-muted-foreground")}>
                              Next run: {fmtDate(rule.next_run_date)} {overdue ? "(overdue)" : days === 0 ? "(today)" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]" onClick={() => void runRecurringRule.mutateAsync(rule.id)} disabled={runRecurringRule.isPending}>
                              <Play size={11} />Run now
                            </Button>
                            <button onClick={() => void deleteRecurringRule.mutateAsync(rule.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── WORKLOAD ── */}
        <TabsContent value="workload">
          <SectionCard title="Team workload & imbalance detection" icon={Users2} count={workload.length}>
            {workload.length === 0 ? (
              <EmptyState icon={Users2} message="No workload data" sub="Workload appears once team members have assigned tasks." />
            ) : (
              <div className="space-y-3">
                {workload.map((row) => {
                  const utilPct = row.capacity_hours > 0 ? Math.min(100, Math.round((row.planned_hours / row.capacity_hours) * 100)) : 0;
                  const isOverloaded = row.imbalance > 0;
                  return (
                    <div key={row.user.id} className={cn("rounded-xl border p-4", isOverloaded ? "border-amber-200 dark:border-amber-800" : "border-border")}>
                      <div className="flex items-start gap-4">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-[14px] font-bold text-primary shrink-0">
                          {row.user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-[13px] font-semibold">{row.user.full_name}</p>
                            <span className="text-[11px] text-muted-foreground capitalize">{row.role}</span>
                            {isOverloaded && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                <AlertTriangle size={9} />Overloaded
                              </span>
                            )}
                          </div>
                          {/* capacity bar */}
                          <div className="mb-2">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full", utilPct > 100 ? "bg-red-500" : utilPct > 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <p className="text-muted-foreground">Open tasks</p>
                              <p className="font-semibold text-[14px]">{row.open_tasks}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Overdue</p>
                              <p className={cn("font-semibold text-[14px]", row.overdue_tasks > 0 ? "text-red-500" : "")}>{row.overdue_tasks}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Planned hrs</p>
                              <p className="font-semibold text-[14px]">{row.planned_hours}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Capacity</p>
                              <p className="font-semibold text-[14px]">{row.capacity_hours}h</p>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-muted-foreground">Imbalance</p>
                          <p className={cn("text-[18px] font-bold", isOverloaded ? "text-amber-500" : "text-emerald-500")}>
                            {isOverloaded ? "+" : ""}{row.imbalance.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                <div className="rounded-xl bg-muted/40 border border-border p-4 mt-2">
                  <div className="grid grid-cols-3 gap-4 text-center text-[12px]">
                    <div>
                      <p className="text-muted-foreground">Total open tasks</p>
                      <p className="font-bold text-[20px]">{workload.reduce((a, r) => a + r.open_tasks, 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total overdue</p>
                      <p className="font-bold text-[20px] text-red-500">{workload.reduce((a, r) => a + r.overdue_tasks, 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overloaded members</p>
                      <p className="font-bold text-[20px] text-amber-500">{workload.filter((r) => r.imbalance > 0).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* AI Retrospective dialog */}
      <Dialog open={retroOpen} onOpenChange={setRetroOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              AI Retrospective: {retroSprintName}
            </DialogTitle>
          </DialogHeader>
          {retroLoading && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-[13px]">Generating retrospective from sprint data…</p>
            </div>
          )}
          {!retroLoading && !retroData && (
            <p className="py-4 text-[13px] text-muted-foreground text-center">No retrospective data available.</p>
          )}
          {!retroLoading && retroData && (
            <div className="space-y-4">
              <RetroSection title="What went well" items={retroData.went_well} accent="emerald" icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
              <RetroSection title="What didn't go well" items={retroData.didnt_go_well} accent="red" icon={<AlertTriangle size={14} className="text-red-500" />} />
              <RetroSection title="Action items" items={retroData.action_items} accent="blue" icon={<TrendingUp size={14} className="text-blue-500" />} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, count, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
          <Icon size={14} className="text-muted-foreground" />
        </div>
        <h2 className="text-[15px] font-semibold flex-1">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-[11px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function StatChip({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; accent: "amber" | "blue" | "violet" | "emerald" }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400",
    violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
  };
  return (
    <div className={cn("rounded-xl border px-3 py-2 flex items-center gap-2", colors[accent])}>
      <Icon size={14} />
      <div>
        <p className="text-[18px] font-bold leading-none">{value}</p>
        <p className="text-[10px] mt-0.5 opacity-80">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: React.ComponentType<{ size?: number; className?: string }>; message: string; sub?: string }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
        <Icon size={18} className="opacity-40" />
      </div>
      <p className="text-[13px] font-medium text-foreground">{message}</p>
      {sub && <p className="text-[12px] opacity-60 text-center max-w-xs">{sub}</p>}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RetroSection({ title, items, accent, icon }: { title: string; items: string[]; accent: "emerald" | "red" | "blue"; icon: React.ReactNode }) {
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
    red: "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
    blue: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
  };
  return (
    <div className={cn("rounded-xl border p-4", colors[accent])}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[13px] font-semibold">{title}</p>
        <span className="text-[11px] text-muted-foreground ml-auto">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground italic">Nothing noted here.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px]">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
