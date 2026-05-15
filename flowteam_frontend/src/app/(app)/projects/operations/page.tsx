"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Globe,
  History,
  Layers,
  Loader2,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import type {
  AutomationRule,
  IssueFieldDefinition,
  NotificationRule,
  ProjectDocument,
} from "@/types/operations";
import { useProjects } from "@/hooks/useProjects";
import {
  useActivityFeed,
  useAdvancedReporting,
  useApprovals,
  useAutomationRules,
  useClientAccess,
  useCreateApproval,
  useCreateAutomationRule,
  useCreateClientAccess,
  useCreateDocument,
  useCreateIssueField,
  useCreateNotificationRule,
  useDecideApproval,
  useDocuments,
  useIssueFields,
  useNotificationDigestPreview,
  useNotificationPreferences,
  useNotificationRules,
  useUpdateNotificationPreferences,
} from "@/hooks/useOperations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeamStore } from "@/store/team";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import type { ApiResponse, TeamMember } from "@/types";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "MMM d, yyyy"); } catch { return v; }
}

function fmtAgo(v: string | null | undefined) {
  if (!v) return "—";
  try { return formatDistanceToNow(new Date(v), { addSuffix: true }); } catch { return v; }
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ProjectOperationsPage() {
  const { activeTeamId, teams, fetchTeams } = useTeamStore();
  const { user } = useAuthStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  useEffect(() => { void fetchTeams(); }, [fetchTeams]);

  const { data: projects = [] } = useProjects(activeTeamId ?? undefined, !!user?.is_superuser, "active");

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["operations-team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const r = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return r.data.data ?? [];
    },
    enabled: !!activeTeamId,
  });

  const { data: approvals = [] } = useApprovals({ teamId: activeTeamId ?? undefined });
  const { data: activity = [] } = useActivityFeed({ teamId: activeTeamId ?? undefined });
  const { data: reporting } = useAdvancedReporting({ teamId: activeTeamId ?? undefined });
  const { data: documents = [] } = useDocuments({ teamId: activeTeamId ?? undefined });
  const { data: notificationRules = [] } = useNotificationRules({ teamId: activeTeamId ?? undefined });
  const { data: automationRules = [] } = useAutomationRules({ teamId: activeTeamId ?? undefined });
  const { data: clientAccess = [] } = useClientAccess({ teamId: activeTeamId ?? undefined });
  const { data: preferences } = useNotificationPreferences();
  const { data: digestPreview } = useNotificationDigestPreview();

  const [fieldProjectId, setFieldProjectId] = useState("");
  const { data: issueFields = [] } = useIssueFields(fieldProjectId || undefined);

  const createApproval = useCreateApproval();
  const decideApproval = useDecideApproval();
  const createDocument = useCreateDocument();
  const createNotificationRule = useCreateNotificationRule();
  const createAutomationRule = useCreateAutomationRule();
  const createClientAccess = useCreateClientAccess();
  const updatePrefs = useUpdateNotificationPreferences();
  const createIssueField = useCreateIssueField();
  const queryClient = useQueryClient();

  // delete mutations
  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/documents/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops", "documents"] }); toast.success("Document deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete")),
  });
  const deleteNotifRule = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/notification-rules/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops", "notification-rules"] }); toast.success("Rule deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete")),
  });
  const deleteAutomation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/automation-rules/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops", "automation-rules"] }); toast.success("Automation deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete")),
  });
  const revokeClient = useMutation({
    mutationFn: (id: string) => api.patch(`/projects/client-access/${id}/`, { status: "revoked" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops", "client-access"] }); toast.success("Access revoked"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to revoke")),
  });
  const deleteIssueField = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/issue-fields/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops", "issue-fields"] }); toast.success("Field deleted"); },
    onError: (e: unknown) => toast.error(toErrorMessage(e, "Failed to delete")),
  });

  // forms
  const [approvalForm, setApprovalForm] = useState({ project: "", title: "", description: "", required_role: "manager" });
  const [documentForm, setDocumentForm] = useState<{ project: string; title: string; doc_type: ProjectDocument["doc_type"]; content: string; attachment: File | null }>({ project: "", title: "", doc_type: "spec", content: "", attachment: null });
  const [notifForm, setNotifForm] = useState<{ project: string; name: string; trigger: string; delivery: NotificationRule["delivery"] }>({ project: "", name: "", trigger: "task_overdue", delivery: "both" });
  const [automationForm, setAutomationForm] = useState<{ project: string; name: string; trigger: AutomationRule["trigger"] }>({ project: "", name: "", trigger: "task_done" });
  const [clientForm, setClientForm] = useState({ project: "", email: "", display_name: "", allowed_statuses: "Done\nApproved" });
  const [fieldForm, setFieldForm] = useState<{ project: string; issue_type: string; name: string; field_type: IssueFieldDefinition["field_type"]; options: string; is_required: boolean }>({ project: "", issue_type: "task", name: "", field_type: "text", options: "", is_required: false });
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // AI states
  const [automationInstruction, setAutomationInstruction] = useState("");
  const [generatedAutomation, setGeneratedAutomation] = useState<Record<string, unknown> | null>(null);
  const [buildingAutomation, setBuildingAutomation] = useState(false);
  const [clientReport, setClientReport] = useState("");
  const [generatingClientReport, setGeneratingClientReport] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  const buildAutomation = async () => {
    if (!aiEnabled) { toast.error("AI features are not enabled for this team"); return; }
    if (!automationInstruction.trim()) return;
    try {
      setBuildingAutomation(true);
      const r = await api.post<ApiResponse<Record<string, unknown>>>("/ai/build-automation/", {
        team_id: activeTeamId, project_id: automationForm.project || undefined, instruction: automationInstruction,
      });
      setGeneratedAutomation(r.data.data ?? null);
    } catch (e) { toast.error(toErrorMessage(e, "Failed to build automation")); }
    finally { setBuildingAutomation(false); }
  };

  const generateClientReport = async () => {
    if (!aiEnabled) { toast.error("AI features are not enabled for this team"); return; }
    if (!clientForm.project) return;
    try {
      setGeneratingClientReport(true);
      const r = await api.post<ApiResponse<{ report: string }>>("/ai/client-report/", { project_id: clientForm.project, period_days: 7 });
      setClientReport(r.data.data?.report ?? "");
    } catch (e) { toast.error(toErrorMessage(e, "Failed to generate report")); }
    finally { setGeneratingClientReport(false); }
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-background to-muted/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400">
              Operations hub
            </Badge>
            <h1 className="mt-2 text-[22px] font-bold tracking-tight">
              Approvals · Reporting · Docs · Notifications · Automation · Client portal
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
              Governance, delivery reporting, and outward-facing access — all in one place.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/projects/issues">Issues</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/projects/planning">Planning</Link></Button>
              {activeTeam && <Badge variant="outline" className="h-8 px-3 text-[12px]">{activeTeam.name}</Badge>}
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex gap-3 flex-wrap shrink-0">
            <StatChip icon={ClipboardCheck} label="Pending approvals" value={pendingApprovals.length} accent="amber" />
            <StatChip icon={FileText} label="Documents" value={documents.length} accent="blue" />
            <StatChip icon={Workflow} label="Automations" value={automationRules.length} accent="violet" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="approvals" className="gap-1.5 text-[12px]">
            <ClipboardCheck size={13} />
            Approvals
            {pendingApprovals.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {pendingApprovals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-[12px]"><History size={13} />Activity</TabsTrigger>
          <TabsTrigger value="reporting" className="gap-1.5 text-[12px]"><Target size={13} />Reporting</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5 text-[12px]"><FileText size={13} />Docs</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-[12px]"><BellRing size={13} />Notifications</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5 text-[12px]"><Workflow size={13} />Automation</TabsTrigger>
          <TabsTrigger value="custom-fields" className="gap-1.5 text-[12px]"><Settings2 size={13} />Issue fields</TabsTrigger>
          <TabsTrigger value="client" className="gap-1.5 text-[12px]"><Globe size={13} />Client portal</TabsTrigger>
        </TabsList>

        {/* ── APPROVALS ── */}
        <TabsContent value="approvals" className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <SectionCard title="Request approval" icon={ClipboardCheck}>
            <div className="space-y-3">
              <Field label="Project">
                <Select value={approvalForm.project} onChange={(v) => setApprovalForm((s) => ({ ...s, project: v }))}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
              </Field>
              <Field label="Title">
                <Input value={approvalForm.title} onChange={(e) => setApprovalForm((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Release v2.4" />
              </Field>
              <Field label="Description">
                <textarea value={approvalForm.description} onChange={(e) => setApprovalForm((s) => ({ ...s, description: e.target.value }))}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Why is this approval needed?" />
              </Field>
              <Field label="Required role">
                <Select value={approvalForm.required_role} onChange={(v) => setApprovalForm((s) => ({ ...s, required_role: v }))}
                  options={[{ value: "manager", label: "Manager" }, { value: "admin", label: "Admin" }, { value: "ceo", label: "CEO" }]} />
              </Field>
              <Button className="w-full gap-2" onClick={() => void createApproval.mutateAsync({ ...approvalForm, target_type: "release" })} disabled={createApproval.isPending || !approvalForm.project || !approvalForm.title}>
                {createApproval.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Request approval
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Approval queue" icon={ShieldCheck} count={approvals.length}>
            {approvals.length === 0 ? (
              <EmptyState icon={ShieldCheck} message="No approvals yet" sub="Request an approval using the form on the left." />
            ) : (
              <div className="space-y-3">
                {approvals.map((approval) => {
                  const isExpanded = expandedApproval === approval.id;
                  const statusMeta = {
                    pending: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: Clock },
                    approved: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", icon: CheckCircle2 },
                    rejected: { cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400", icon: XCircle },
                  }[approval.status];
                  const StatusIcon = statusMeta.icon;
                  return (
                    <div key={approval.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button className="w-full text-left px-4 py-3 flex items-start gap-3" onClick={() => setExpandedApproval(isExpanded ? null : approval.id)}>
                        <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", statusMeta.cls)}>
                          <StatusIcon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{approval.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {approval.project_name} · by {approval.requested_by.full_name} · {fmtAgo(approval.created_at)}
                          </p>
                        </div>
                        <ChevronDown size={14} className={cn("shrink-0 text-muted-foreground transition-transform mt-1", isExpanded && "rotate-180")} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                          {approval.description && <p className="text-[13px] text-muted-foreground">{approval.description}</p>}
                          <div className="flex gap-3 text-[12px] text-muted-foreground">
                            <span>Required role: <strong className="text-foreground">{approval.required_role}</strong></span>
                            {approval.decided_at && <span>Decided: {fmtDate(approval.decided_at)}</span>}
                          </div>
                          {approval.decision_note && (
                            <div className="rounded-lg bg-muted/50 px-3 py-2 text-[12px]">
                              <span className="font-medium">Note: </span>{approval.decision_note}
                            </div>
                          )}
                          {approval.status === "pending" && (
                            <div className="space-y-2">
                              <textarea
                                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Optional decision note…"
                                value={decisionNote[approval.id] ?? ""}
                                onChange={(e) => setDecisionNote((s) => ({ ...s, [approval.id]: e.target.value }))}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void decideApproval.mutateAsync({ approvalId: approval.id, status: "approved", decision_note: decisionNote[approval.id] })}>
                                  <CheckCircle2 size={12} /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30" onClick={() => void decideApproval.mutateAsync({ approvalId: approval.id, status: "rejected", decision_note: decisionNote[approval.id] })}>
                                  <XCircle size={12} /> Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── ACTIVITY ── */}
        <TabsContent value="activity">
          <SectionCard title="Project & issue activity" icon={History} count={activity.length}>
            {activity.length === 0 ? (
              <EmptyState icon={History} message="No activity yet" sub="Activity appears here as tasks are created, moved, and updated." />
            ) : (
              <div className="space-y-2">
                {activity.map((item) => {
                  const isExpanded = expandedActivity === item.id;
                  const verbMeta: Record<string, { cls: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
                    created: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", icon: Plus },
                    moved: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", icon: ChevronRight },
                    updated: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: Settings2 },
                    completed: { cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400", icon: CheckCircle2 },
                    assigned: { cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400", icon: ShieldCheck },
                    commented: { cls: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400", icon: FileText },
                  };
                  const meta = verbMeta[item.verb] ?? { cls: "bg-muted text-muted-foreground", icon: History };
                  const VerbIcon = meta.icon;
                  const hasDetail = Object.keys(item.detail ?? {}).length > 0;
                  return (
                    <div key={item.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => hasDetail && setExpandedActivity(isExpanded ? null : item.id)}>
                        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", meta.cls)}>
                          <VerbIcon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{item.task_title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.project_name} · {item.actor?.full_name ?? "System"} · {fmtAgo(item.created_at)}
                          </p>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", meta.cls)}>{item.verb}</span>
                        {hasDetail && <ChevronDown size={13} className={cn("shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />}
                      </button>
                      {isExpanded && hasDetail && (
                        <div className="px-4 pb-3 border-t border-border/40 pt-3">
                          <pre className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(item.detail, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── REPORTING ── */}
        <TabsContent value="reporting" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp} label="Lead time" value={`${reporting?.lead_time_days ?? 0}d`} sub="avg. start → done" accent="emerald" />
            <MetricCard icon={Zap} label="Cycle time" value={`${reporting?.cycle_time_days ?? 0}d`} sub="avg. wip → done" accent="blue" />
            <MetricCard icon={Target} label="Throughput" value={String(reporting?.throughput ?? 0)} sub="tasks completed" accent="violet" />
            <MetricCard icon={AlertCircle} label="Overdue" value={String(reporting?.overdue_count ?? 0)} sub="tasks past due" accent="red" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard title="Overdue trend" icon={TrendingDown}>
              {(reporting?.overdue_trend ?? []).length === 0 ? (
                <EmptyState icon={TrendingDown} message="No trend data" sub="Overdue task counts will appear here once tasks are tracked." />
              ) : (
                <div className="space-y-2">
                  {(reporting?.overdue_trend ?? []).map((point) => {
                    const max = Math.max(...(reporting?.overdue_trend ?? []).map((p) => p.count), 1);
                    return (
                      <div key={point.date} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-20 shrink-0">{point.date}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-red-400/70" style={{ width: `${(point.count / max) * 100}%` }} />
                        </div>
                        <span className="text-[12px] font-semibold w-6 text-right">{point.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Sprint velocity" icon={Zap}>
              {(reporting?.team_velocity ?? []).length === 0 ? (
                <EmptyState icon={Zap} message="No sprint data" sub="Sprint velocity appears here after sprints are completed." />
              ) : (
                <div className="space-y-2">
                  {(reporting?.team_velocity ?? []).map((row) => {
                    const pct = row.planned > 0 ? Math.round((row.completed / row.planned) * 100) : 0;
                    return (
                      <div key={row.sprint} className="rounded-lg border border-border px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13px] font-medium">{row.sprint}</p>
                          <span className={cn("text-[11px] font-semibold", pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500")}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{row.completed} / {row.planned} tasks</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <Button asChild variant="outline" size="sm" className="gap-2 w-full">
                  <a href={`${getApiBaseUrl()}/projects/calendar/export/?team_id=${activeTeamId ?? ""}`} target="_blank" rel="noreferrer">
                    <Download size={13} /> Export calendar (.ics)
                  </a>
                </Button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Sprint burndown" icon={TrendingDown}>
            {(reporting?.sprint_burndown ?? []).length === 0 ? (
              <EmptyState icon={TrendingDown} message="No burndown data" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(reporting?.sprint_burndown ?? []).map((row) => {
                  const pct = row.planned_tasks > 0 ? Math.round((row.completed_tasks / row.planned_tasks) * 100) : 0;
                  return (
                    <div key={row.sprint} className="rounded-xl border border-border p-4">
                      <p className="text-[13px] font-semibold truncate">{row.sprint}</p>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">{row.completed_tasks} of {row.planned_tasks} completed</p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── DOCS ── */}
        <TabsContent value="docs" className="grid gap-5 xl:grid-cols-[400px_1fr]">
          <SectionCard title="Create document" icon={FileText}>
            <div className="space-y-3">
              <Field label="Project">
                <Select value={documentForm.project} onChange={(v) => setDocumentForm((s) => ({ ...s, project: v }))}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
              </Field>
              <Field label="Title">
                <Input value={documentForm.title} onChange={(e) => setDocumentForm((s) => ({ ...s, title: e.target.value }))} placeholder="Document title" />
              </Field>
              <Field label="Type">
                <Select value={documentForm.doc_type} onChange={(v) => setDocumentForm((s) => ({ ...s, doc_type: v as ProjectDocument["doc_type"] }))}
                  options={[{ value: "sop", label: "SOP" }, { value: "spec", label: "Spec" }, { value: "meeting", label: "Meeting note" }, { value: "decision", label: "Decision log" }, { value: "note", label: "Note" }]} />
              </Field>
              <Field label="Content">
                <textarea value={documentForm.content} onChange={(e) => setDocumentForm((s) => ({ ...s, content: e.target.value }))}
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Write your document content…" />
              </Field>
              <Field label="Attachment (optional)">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setDocumentForm((s) => ({ ...s, attachment: e.target.files?.[0] ?? null }))} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                    <Upload size={13} /> {documentForm.attachment ? documentForm.attachment.name : "Choose file"}
                  </Button>
                  {documentForm.attachment && (
                    <button onClick={() => setDocumentForm((s) => ({ ...s, attachment: null }))} className="text-muted-foreground hover:text-foreground">
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </Field>
              <Button className="w-full gap-2" onClick={() => void createDocument.mutateAsync({ ...documentForm })} disabled={createDocument.isPending || !documentForm.project || !documentForm.title}>
                {createDocument.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create document
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Knowledge base" icon={Layers} count={documents.length}>
            {documents.length === 0 ? (
              <EmptyState icon={FileText} message="No documents yet" sub="Create your first document using the form on the left." />
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{doc.project_name} · v{doc.version} · {fmtDate(doc.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DocTypeBadge type={doc.doc_type} />
                        <button onClick={() => void deleteDoc.mutateAsync(doc.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {doc.content && <p className="mt-2 text-[12px] text-muted-foreground line-clamp-3">{doc.content}</p>}
                    {doc.attachment_url && (
                      <a href={doc.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                        <Download size={12} /> Download attachment
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── NOTIFICATIONS ── */}
        <TabsContent value="notifications" className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <SectionCard title="Preferences" icon={BellRing}>
              <div className="space-y-2">
                {([
                  ["email_enabled", "Email notifications"],
                  ["due_reminders_enabled", "Due date reminders"],
                  ["overdue_digest_enabled", "Overdue digest"],
                  ["watch_notifications_enabled", "Watch notifications"],
                  ["approval_notifications_enabled", "Approval notifications"],
                ] as [keyof typeof preferences, string][]).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40">
                    <span className="text-[13px] font-medium">{label}</span>
                    <div
                      onClick={() => void updatePrefs.mutateAsync({ [key]: !preferences?.[key] })}
                      className={cn("h-5 w-9 rounded-full transition-colors cursor-pointer relative", preferences?.[key] ? "bg-primary" : "bg-muted-foreground/30")}
                    >
                      <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", preferences?.[key] ? "translate-x-4" : "translate-x-0.5")} />
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-muted/40 border border-border p-4 space-y-1.5">
                <p className="text-[12px] font-semibold text-foreground">Digest snapshot</p>
                <DigestRow label="Overdue tasks" value={digestPreview?.overdue_tasks ?? 0} accent="red" />
                <DigestRow label="Pending approvals" value={digestPreview?.pending_approvals ?? 0} accent="amber" />
                <DigestRow label="Watching" value={digestPreview?.watching_count ?? 0} accent="blue" />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Notification rules" icon={BellRing} count={notificationRules.length}>
            <div className="space-y-3 mb-5">
              <Field label="Project">
                <Select value={notifForm.project} onChange={(v) => setNotifForm((s) => ({ ...s, project: v }))}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rule name">
                  <Input value={notifForm.name} onChange={(e) => setNotifForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Overdue alert" />
                </Field>
                <Field label="Delivery">
                  <Select value={notifForm.delivery} onChange={(v) => setNotifForm((s) => ({ ...s, delivery: v as NotificationRule["delivery"] }))}
                    options={[{ value: "in_app", label: "In-app" }, { value: "email", label: "Email" }, { value: "both", label: "Both" }]} />
                </Field>
              </div>
              <Field label="Trigger">
                <Select value={notifForm.trigger} onChange={(v) => setNotifForm((s) => ({ ...s, trigger: v }))}
                  options={[{ value: "task_overdue", label: "Task overdue" }, { value: "task_done", label: "Task done" }, { value: "task_assigned", label: "Task assigned" }, { value: "approval_requested", label: "Approval requested" }, { value: "comment_added", label: "Comment added" }]} />
              </Field>
              <Button size="sm" className="gap-2" onClick={() => void createNotificationRule.mutateAsync({ ...notifForm, filters: {} })} disabled={createNotificationRule.isPending || !notifForm.project || !notifForm.name}>
                {createNotificationRule.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add rule
              </Button>
            </div>

            {notificationRules.length === 0 ? (
              <EmptyState icon={BellRing} message="No notification rules" sub="Add a rule above to get started." />
            ) : (
              <div className="space-y-2 border-t border-border pt-4">
                {notificationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium">{rule.name}</p>
                      <p className="text-[11px] text-muted-foreground">{rule.trigger} · {rule.delivery}</p>
                    </div>
                    <button onClick={() => void deleteNotifRule.mutateAsync(rule.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── AUTOMATION ── */}
        <TabsContent value="automation" className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            {aiEnabled && (
              <SectionCard title="Build with AI" icon={Sparkles}>
                <div className="space-y-3">
                  <Field label="Describe your rule">
                    <textarea value={automationInstruction} onChange={(e) => setAutomationInstruction(e.target.value)}
                      className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="e.g. When an urgent bug is created, notify the reporter and move to the Backlog column." />
                  </Field>
                  <AIButton className="w-full" variant="outline" loading={buildingAutomation} onClick={() => void buildAutomation()} disabled={!automationInstruction.trim()}>
                    Generate automation
                  </AIButton>
                  {generatedAutomation && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Generated rule</p>
                      <pre className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] overflow-auto max-h-48 whitespace-pre-wrap">
                        {JSON.stringify(generatedAutomation, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Create rule" icon={Workflow}>
              <div className="space-y-3">
                <Field label="Project">
                  <Select value={automationForm.project} onChange={(v) => setAutomationForm((s) => ({ ...s, project: v }))}
                    options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
                </Field>
                <Field label="Rule name">
                  <Input value={automationForm.name} onChange={(e) => setAutomationForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Notify on overdue" />
                </Field>
                <Field label="Trigger">
                  <Select value={automationForm.trigger} onChange={(v) => setAutomationForm((s) => ({ ...s, trigger: v as AutomationRule["trigger"] }))}
                    options={[{ value: "task_done", label: "Task done" }, { value: "task_overdue", label: "Task overdue" }, { value: "approval_requested", label: "Approval requested" }]} />
                </Field>
                <Button className="w-full gap-2" onClick={() => void createAutomationRule.mutateAsync({ ...automationForm, conditions: {}, actions: [{ type: "notify_reporter" }] })} disabled={createAutomationRule.isPending || !automationForm.project || !automationForm.name}>
                  {createAutomationRule.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create automation
                </Button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Automation rules" icon={Workflow} count={automationRules.length}>
            {automationRules.length === 0 ? (
              <EmptyState icon={Workflow} message="No automation rules" sub="Create a rule on the left to automate repetitive actions." />
            ) : (
              <div className="space-y-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold">{rule.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Trigger: {rule.trigger} · {fmtDate(rule.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", rule.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                          {rule.is_active ? "Active" : "Paused"}
                        </span>
                        <button onClick={() => void deleteAutomation.mutateAsync(rule.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {rule.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rule.actions.map((action, i) => (
                          <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {String((action as Record<string, unknown>).type ?? "action")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── ISSUE FIELDS ── */}
        <TabsContent value="custom-fields" className="grid gap-5 xl:grid-cols-[400px_1fr]">
          <SectionCard title="Define field" icon={Settings2}>
            <div className="space-y-3">
              <Field label="Project">
                <Select value={fieldForm.project} onChange={(v) => { setFieldForm((s) => ({ ...s, project: v })); setFieldProjectId(v); }}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Issue type">
                  <Select value={fieldForm.issue_type} onChange={(v) => setFieldForm((s) => ({ ...s, issue_type: v }))}
                    options={[{ value: "epic", label: "Epic" }, { value: "story", label: "Story" }, { value: "task", label: "Task" }, { value: "bug", label: "Bug" }, { value: "subtask", label: "Subtask" }]} />
                </Field>
                <Field label="Field type">
                  <Select value={fieldForm.field_type} onChange={(v) => setFieldForm((s) => ({ ...s, field_type: v as IssueFieldDefinition["field_type"] }))}
                    options={[{ value: "text", label: "Text" }, { value: "number", label: "Number" }, { value: "date", label: "Date" }, { value: "select", label: "Select" }]} />
                </Field>
              </div>
              <Field label="Field name">
                <Input value={fieldForm.name} onChange={(e) => setFieldForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Customer segment" />
              </Field>
              {fieldForm.field_type === "select" && (
                <Field label="Options (one per line)">
                  <textarea value={fieldForm.options} onChange={(e) => setFieldForm((s) => ({ ...s, options: e.target.value }))}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={"Option A\nOption B\nOption C"} />
                </Field>
              )}
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={fieldForm.is_required} onChange={(e) => setFieldForm((s) => ({ ...s, is_required: e.target.checked }))} className="rounded" />
                Required field
              </label>
              <Button className="w-full gap-2" onClick={() => void createIssueField.mutateAsync({ ...fieldForm, options: fieldForm.options.split("\n").map((l) => l.trim()).filter(Boolean) })} disabled={createIssueField.isPending || !fieldForm.project || !fieldForm.name}>
                {createIssueField.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create field
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Defined fields" icon={Settings2} count={issueFields.length}>
            {!fieldProjectId ? (
              <EmptyState icon={Settings2} message="Select a project" sub="Choose a project on the left to see its custom fields." />
            ) : issueFields.length === 0 ? (
              <EmptyState icon={Settings2} message="No custom fields" sub="Define your first field using the form on the left." />
            ) : (
              <div className="space-y-2">
                {issueFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium">{field.name}</p>
                        {field.is_required && <span className="text-[10px] font-semibold text-red-500">Required</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{field.issue_type} · {field.field_type}{field.options.length > 0 ? ` · ${field.options.join(", ")}` : ""}</p>
                    </div>
                    <button onClick={() => void deleteIssueField.mutateAsync(field.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── CLIENT PORTAL ── */}
        <TabsContent value="client" className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            {aiEnabled && (
              <SectionCard title="AI client report" icon={Sparkles}>
                <div className="space-y-3">
                  <Field label="Project">
                    <Select value={clientForm.project} onChange={(v) => setClientForm((s) => ({ ...s, project: v }))}
                      options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
                  </Field>
                  <AIButton className="w-full" variant="outline" loading={generatingClientReport} onClick={() => void generateClientReport()} disabled={!clientForm.project}>
                    Generate 7-day report
                  </AIButton>
                  {clientReport && (
                    <textarea value={clientReport} onChange={(e) => setClientReport(e.target.value)}
                      className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-[13px] resize-y focus:outline-none focus:ring-1 focus:ring-ring" />
                  )}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Grant portal access" icon={Globe}>
              <div className="space-y-3">
                {!aiEnabled && (
                  <Field label="Project">
                    <Select value={clientForm.project} onChange={(v) => setClientForm((s) => ({ ...s, project: v }))}
                      options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client email">
                    <Input type="email" value={clientForm.email} onChange={(e) => setClientForm((s) => ({ ...s, email: e.target.value }))} placeholder="client@example.com" />
                  </Field>
                  <Field label="Display name">
                    <Input value={clientForm.display_name} onChange={(e) => setClientForm((s) => ({ ...s, display_name: e.target.value }))} placeholder="Acme Corp" />
                  </Field>
                </div>
                <Field label="Allowed statuses (one per line)">
                  <textarea value={clientForm.allowed_statuses} onChange={(e) => setClientForm((s) => ({ ...s, allowed_statuses: e.target.value }))}
                    className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                </Field>
                <Button className="w-full gap-2" onClick={() => void createClientAccess.mutateAsync({ ...clientForm, allowed_statuses: clientForm.allowed_statuses.split("\n").map((l) => l.trim()).filter(Boolean), allowed_document_ids: [], status: "active" })} disabled={createClientAccess.isPending || !clientForm.project || !clientForm.email}>
                  {createClientAccess.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Grant access
                </Button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Portal links" icon={Globe} count={clientAccess.length}>
            {clientAccess.length === 0 ? (
              <EmptyState icon={Globe} message="No portal links" sub="Grant access to a client using the form on the left." />
            ) : (
              <div className="space-y-3">
                {clientAccess.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{item.display_name || item.email}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.project_name} · {item.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", item.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                          {item.status}
                        </span>
                        {item.status === "active" && (
                          <button onClick={() => void revokeClient.mutateAsync(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Revoke access">
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a href={item.portal_url} target="_blank" rel="noreferrer" className="flex-1 truncate text-[12px] text-primary hover:underline">{item.portal_url}</a>
                      <button onClick={() => { void navigator.clipboard.writeText(item.portal_url); toast.success("Link copied"); }}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                        Copy
                      </button>
                    </div>
                    {item.allowed_statuses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.allowed_statuses.map((s) => (
                          <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, count, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count?: number;
  children: React.ReactNode;
}) {
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

function StatChip({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  accent: "amber" | "blue" | "violet" | "red" | "emerald";
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400",
    violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400",
    red: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400",
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

function MetricCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "emerald" | "blue" | "violet" | "red";
}) {
  const iconColors: Record<string, string> = {
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
    red: "text-red-500",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <Icon size={15} className={iconColors[accent]} />
      </div>
      <p className="mt-2 text-[28px] font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  message: string;
  sub?: string;
}) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DocTypeBadge({ type }: { type: ProjectDocument["doc_type"] }) {
  const colors: Record<string, string> = {
    sop: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    spec: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    meeting: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    decision: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    note: "bg-muted text-muted-foreground",
  };
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", colors[type])}>{type}</span>;
}

function DigestRow({ label, value, accent }: { label: string; value: number; accent: "red" | "amber" | "blue" }) {
  const colors = { red: "text-red-600", amber: "text-amber-600", blue: "text-blue-600" };
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", colors[accent])}>{value}</span>
    </div>
  );
}
