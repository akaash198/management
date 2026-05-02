"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  ClipboardCheck,
  FileText,
  Globe,
  History,
  Plus,
  Settings2,
  ShieldCheck,
  Target,
  Workflow,
} from "lucide-react";
import type { AutomationRule, IssueFieldDefinition, NotificationRule, ProjectDocument } from "@/types/operations";
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

export default function ProjectOperationsPage() {
  const { activeTeamId, teams, fetchTeams } = useTeamStore();
  const { user } = useAuthStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const { data: projects = [] } = useProjects(activeTeamId ?? undefined, !!user?.is_superuser, "active");
  useQuery<TeamMember[]>({
    queryKey: ["operations-team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const response = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return response.data.data ?? [];
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
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const createIssueField = useCreateIssueField();

  const [approvalForm, setApprovalForm] = useState({ project: "", title: "", description: "", required_role: "manager" });
  const [documentForm, setDocumentForm] = useState<{ project: string; title: string; doc_type: ProjectDocument["doc_type"]; content: string }>({ project: "", title: "", doc_type: "spec", content: "" });
  const [notificationRuleForm, setNotificationRuleForm] = useState<{ project: string; name: string; trigger: string; delivery: NotificationRule["delivery"] }>({ project: "", name: "", trigger: "task_overdue", delivery: "both" });
  const [automationForm, setAutomationForm] = useState<{ project: string; name: string; trigger: AutomationRule["trigger"] }>({ project: "", name: "", trigger: "task_done" });
  const [clientForm, setClientForm] = useState({ project: "", email: "", display_name: "", allowed_statuses: "Done\nApproved" });
  const [fieldForm, setFieldForm] = useState<{ project: string; issue_type: string; name: string; field_type: IssueFieldDefinition["field_type"]; options: string }>({ project: "", issue_type: "task", name: "", field_type: "text", options: "" });
  const [automationInstruction, setAutomationInstruction] = useState("");
  const [generatedAutomation, setGeneratedAutomation] = useState<Record<string, unknown> | null>(null);
  const [buildingAutomation, setBuildingAutomation] = useState(false);
  const [clientReport, setClientReport] = useState("");
  const [generatingClientReport, setGeneratingClientReport] = useState(false);

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;

  const buildAutomation = async () => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    if (!automationInstruction.trim()) return;
    try {
      setBuildingAutomation(true);
      const response = await api.post<ApiResponse<Record<string, unknown>>>("/ai/build-automation/", {
        team_id: activeTeamId,
        project_id: automationForm.project || undefined,
        instruction: automationInstruction,
      });
      setGeneratedAutomation(response.data.data ?? null);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to build automation"));
    } finally {
      setBuildingAutomation(false);
    }
  };

  const generateClientReport = async () => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    if (!clientForm.project) return;
    try {
      setGeneratingClientReport(true);
      const response = await api.post<ApiResponse<{ report: string }>>("/ai/client-report/", {
        project_id: clientForm.project,
        period_days: 7,
      });
      setClientReport(response.data.data?.report ?? "");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to generate client report"));
    } finally {
      setGeneratingClientReport(false);
    }
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_45%,#f0fdf4_100%)] p-6">
        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
          Operations hub
        </Badge>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Approvals, reporting, docs, notifications, automation, and client access</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-6 text-muted-foreground">
          A single place to manage the operational layer around project delivery. This continues the planning stack with governance, reporting, and outward-facing access.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/projects/issues">Issues</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/projects/planning">Planning</Link></Button>
          {activeTeam && <Badge variant="outline" className="h-8 px-3 text-[12px]">Team: {activeTeam.name}</Badge>}
        </div>
      </section>

      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="custom-fields">Issue fields</TabsTrigger>
          <TabsTrigger value="client">Client portal</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Request approval" icon={ClipboardCheck}>
            <SelectField label="Project" value={approvalForm.project} onChange={(value) => setApprovalForm((current) => ({ ...current, project: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <TextField label="Title" value={approvalForm.title} onChange={(value) => setApprovalForm((current) => ({ ...current, title: value }))} />
            <TextareaField label="Description" value={approvalForm.description} onChange={(value) => setApprovalForm((current) => ({ ...current, description: value }))} />
            <SelectField label="Required role" value={approvalForm.required_role} onChange={(value) => setApprovalForm((current) => ({ ...current, required_role: value }))} options={[{ value: "manager", label: "Manager" }, { value: "admin", label: "Admin" }, { value: "ceo", label: "CEO" }]} />
            <Button className="mt-4" onClick={() => void createApproval.mutateAsync({ ...approvalForm, target_type: "release" })} disabled={createApproval.isPending}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Request approval
            </Button>
          </Card>

          <Card title="Approval queue" icon={ShieldCheck}>
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{approval.title}</p>
                      <p className="text-[12px] text-muted-foreground">{approval.project_name} • requested by {approval.requested_by.full_name}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{approval.status}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">{approval.description}</p>
                  {approval.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void decideApproval.mutateAsync({ approvalId: approval.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => void decideApproval.mutateAsync({ approvalId: approval.id, status: "rejected" })}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card title="Project and issue timeline" icon={History}>
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.task_title}</p>
                    <Badge variant="outline">{item.verb}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{item.project_name} • {item.actor?.full_name || "System"}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-500">{JSON.stringify(item.detail, null, 2)}</pre>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reporting">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Target} label="Lead time" value={`${reporting?.lead_time_days ?? 0}d`} />
            <MetricCard icon={Target} label="Cycle time" value={`${reporting?.cycle_time_days ?? 0}d`} />
            <MetricCard icon={Target} label="Throughput" value={String(reporting?.throughput ?? 0)} />
            <MetricCard icon={Target} label="Overdue" value={String(reporting?.overdue_count ?? 0)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Overdue trend" icon={Target}>
              <div className="space-y-2">
                {(reporting?.overdue_trend ?? []).map((point) => (
                  <div key={point.date} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span>{point.date}</span>
                    <span className="font-semibold">{point.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Sprint burndown and velocity" icon={Target}>
              <div className="space-y-2">
                {(reporting?.sprint_burndown ?? []).map((row) => (
                  <div key={row.sprint} className="rounded-lg border border-border px-3 py-2">
                    <p className="font-semibold">{row.sprint}</p>
                    <p className="text-[12px] text-muted-foreground">Completed {row.completed_tasks} of {row.planned_tasks}</p>
                  </div>
                ))}
                {(reporting?.team_velocity ?? []).map((row) => (
                  <div key={`velocity-${row.sprint}`} className="rounded-lg border border-border px-3 py-2">
                    <p className="font-semibold">{row.sprint}</p>
                    <p className="text-[12px] text-muted-foreground">Velocity {row.completed}/{row.planned}</p>
                  </div>
                ))}
              </div>
              <Button className="mt-4" asChild variant="outline">
                <a href={`${getApiBaseUrl()}/projects/calendar/export/?team_id=${activeTeamId || ""}`} target="_blank" rel="noreferrer">
                  Export calendar (.ics)
                </a>
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Create document" icon={FileText}>
            <SelectField label="Project" value={documentForm.project} onChange={(value) => setDocumentForm((current) => ({ ...current, project: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <TextField label="Title" value={documentForm.title} onChange={(value) => setDocumentForm((current) => ({ ...current, title: value }))} />
            <SelectField label="Type" value={documentForm.doc_type} onChange={(value) => setDocumentForm((current) => ({ ...current, doc_type: value as ProjectDocument["doc_type"] }))} options={[{ value: "sop", label: "SOP" }, { value: "spec", label: "Spec" }, { value: "meeting", label: "Meeting note" }, { value: "decision", label: "Decision log" }, { value: "note", label: "Note" }]} />
            <TextareaField label="Content" value={documentForm.content} onChange={(value) => setDocumentForm((current) => ({ ...current, content: value }))} />
            <Button className="mt-4" onClick={() => void createDocument.mutateAsync(documentForm)} disabled={createDocument.isPending}>Create document</Button>
          </Card>
          <Card title="Knowledge base" icon={FileText}>
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{document.title}</p>
                    <Badge variant="outline">{document.doc_type}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{document.project_name} • v{document.version}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground whitespace-pre-wrap">{document.content.slice(0, 240)}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Notification preferences" icon={BellRing}>
            <div className="space-y-3">
              <ToggleRow label="Email enabled" checked={!!preferences?.email_enabled} onChange={(checked) => void updateNotificationPreferences.mutateAsync({ email_enabled: checked })} />
              <ToggleRow label="Due reminders" checked={!!preferences?.due_reminders_enabled} onChange={(checked) => void updateNotificationPreferences.mutateAsync({ due_reminders_enabled: checked })} />
              <ToggleRow label="Overdue digest" checked={!!preferences?.overdue_digest_enabled} onChange={(checked) => void updateNotificationPreferences.mutateAsync({ overdue_digest_enabled: checked })} />
              <ToggleRow label="Watch notifications" checked={!!preferences?.watch_notifications_enabled} onChange={(checked) => void updateNotificationPreferences.mutateAsync({ watch_notifications_enabled: checked })} />
              <ToggleRow label="Approval notifications" checked={!!preferences?.approval_notifications_enabled} onChange={(checked) => void updateNotificationPreferences.mutateAsync({ approval_notifications_enabled: checked })} />
            </div>
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="font-semibold">Digest preview</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Overdue tasks: {digestPreview?.overdue_tasks ?? 0}</p>
              <p className="text-[12px] text-muted-foreground">Pending approvals: {digestPreview?.pending_approvals ?? 0}</p>
              <p className="text-[12px] text-muted-foreground">Watching: {digestPreview?.watching_count ?? 0}</p>
            </div>
          </Card>
          <Card title="Notification rules" icon={BellRing}>
            <SelectField label="Project" value={notificationRuleForm.project} onChange={(value) => setNotificationRuleForm((current) => ({ ...current, project: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <TextField label="Rule name" value={notificationRuleForm.name} onChange={(value) => setNotificationRuleForm((current) => ({ ...current, name: value }))} />
            <TextField label="Trigger" value={notificationRuleForm.trigger} onChange={(value) => setNotificationRuleForm((current) => ({ ...current, trigger: value }))} />
            <SelectField label="Delivery" value={notificationRuleForm.delivery} onChange={(value) => setNotificationRuleForm((current) => ({ ...current, delivery: value as NotificationRule["delivery"] }))} options={[{ value: "in_app", label: "In-app" }, { value: "email", label: "Email" }, { value: "both", label: "Both" }]} />
            <Button className="mt-4" onClick={() => void createNotificationRule.mutateAsync({ ...notificationRuleForm, filters: {} })}>Save notification rule</Button>
            <div className="mt-4 space-y-2">
              {notificationRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-semibold">{rule.name}</p>
                  <p className="text-[12px] text-muted-foreground">{rule.trigger} • {rule.delivery}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Automation rules" icon={Workflow}>
            <TextareaField label="AI instruction" value={automationInstruction} onChange={setAutomationInstruction} helper="Example: When an urgent bug is created, notify the reporter." />
            <AIButton className="mt-3" variant="outline" loading={buildingAutomation} onClick={() => void buildAutomation()}>
              Build rule with AI
            </AIButton>
            {generatedAutomation && (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px]">
                {JSON.stringify(generatedAutomation, null, 2)}
              </pre>
            )}
            <div className="my-4 h-px bg-border" />
            <SelectField label="Project" value={automationForm.project} onChange={(value) => setAutomationForm((current) => ({ ...current, project: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <TextField label="Rule name" value={automationForm.name} onChange={(value) => setAutomationForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Trigger" value={automationForm.trigger} onChange={(value) => setAutomationForm((current) => ({ ...current, trigger: value as AutomationRule["trigger"] }))} options={[{ value: "task_done", label: "Task done" }, { value: "task_overdue", label: "Task overdue" }, { value: "approval_requested", label: "Approval requested" }]} />
            <Button className="mt-4" onClick={() => void createAutomationRule.mutateAsync({ ...automationForm, conditions: {}, actions: [{ type: "notify_reporter" }] })}>
              Create automation rule
            </Button>
          </Card>
          <Card title="Automation list" icon={Workflow}>
            <div className="space-y-2">
              {automationRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-semibold">{rule.name}</p>
                  <p className="text-[12px] text-muted-foreground">{rule.trigger}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Issue type fields" icon={Settings2}>
            <SelectField label="Project" value={fieldForm.project} onChange={(value) => { setFieldForm((current) => ({ ...current, project: value })); setFieldProjectId(value); }} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <SelectField label="Issue type" value={fieldForm.issue_type} onChange={(value) => setFieldForm((current) => ({ ...current, issue_type: value }))} options={[{ value: "epic", label: "Epic" }, { value: "story", label: "Story" }, { value: "task", label: "Task" }, { value: "bug", label: "Bug" }, { value: "subtask", label: "Subtask" }]} />
            <TextField label="Field name" value={fieldForm.name} onChange={(value) => setFieldForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Field type" value={fieldForm.field_type} onChange={(value) => setFieldForm((current) => ({ ...current, field_type: value as IssueFieldDefinition["field_type"] }))} options={[{ value: "text", label: "Text" }, { value: "number", label: "Number" }, { value: "date", label: "Date" }, { value: "select", label: "Select" }]} />
            <TextareaField label="Options" value={fieldForm.options} onChange={(value) => setFieldForm((current) => ({ ...current, options: value }))} helper="One option per line for select fields." />
            <Button className="mt-4" onClick={() => void createIssueField.mutateAsync({ ...fieldForm, options: fieldForm.options.split("\n").map((line) => line.trim()).filter(Boolean), is_required: false })}>Create field</Button>
          </Card>
          <Card title="Defined issue fields" icon={Settings2}>
            <div className="space-y-2">
              {issueFields.map((field) => (
                <div key={field.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-semibold">{field.name}</p>
                  <p className="text-[12px] text-muted-foreground">{field.issue_type} • {field.field_type}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Client portal access" icon={Globe}>
            <SelectField label="Project" value={clientForm.project} onChange={(value) => setClientForm((current) => ({ ...current, project: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <AIButton className="mb-4" variant="outline" loading={generatingClientReport} onClick={() => void generateClientReport()} disabled={!clientForm.project}>
              Generate client report
            </AIButton>
            {clientReport && (
              <TextareaField label="AI report" value={clientReport} onChange={setClientReport} />
            )}
            <TextField label="Client email" value={clientForm.email} onChange={(value) => setClientForm((current) => ({ ...current, email: value }))} />
            <TextField label="Client name" value={clientForm.display_name} onChange={(value) => setClientForm((current) => ({ ...current, display_name: value }))} />
            <TextareaField label="Allowed statuses" value={clientForm.allowed_statuses} onChange={(value) => setClientForm((current) => ({ ...current, allowed_statuses: value }))} helper="One status per line." />
            <Button className="mt-4" onClick={() => void createClientAccess.mutateAsync({ ...clientForm, allowed_statuses: clientForm.allowed_statuses.split("\n").map((line) => line.trim()).filter(Boolean), allowed_document_ids: [], status: "active" })}>Grant portal access</Button>
          </Card>
          <Card title="Portal links" icon={Globe}>
            <div className="space-y-2">
              {clientAccess.map((item) => (
                <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-semibold">{item.display_name || item.email}</p>
                  <p className="text-[12px] text-muted-foreground">{item.project_name}</p>
                  <a href={item.portal_url} className="text-[12px] text-primary underline">{item.portal_url}</a>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
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

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
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
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-sm" />
      {helper && <span className="text-[11px] text-muted-foreground">{helper}</span>}
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-[13px] font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
