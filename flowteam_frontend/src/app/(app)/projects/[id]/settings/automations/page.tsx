"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  useAutomationRules,
  useCreateAutomationRule,
} from "@/hooks/useOperations";
import { useProject } from "@/hooks/useProjects";
import type { AutomationRule } from "@/types/operations";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";
import { cn } from "@/lib/utils";

/* ── Constants ──────────────────────────────────────────── */

const TRIGGER_LABELS: Record<AutomationRule["trigger"], string> = {
  task_done:            "Task moved to Done",
  task_overdue:         "Task becomes overdue",
  approval_requested:   "Approval requested",
  meeting_done:         "Meeting completed",
  experiment_moved:     "Experiment status changed",
};

const TRIGGER_DESCRIPTIONS: Record<AutomationRule["trigger"], string> = {
  task_done:          "Fires when any task is moved to a Done column.",
  task_overdue:       "Fires when a task passes its due date without completion.",
  approval_requested: "Fires when a task approval is submitted.",
  meeting_done:       "Fires when a meeting is marked complete. Action items become tasks.",
  experiment_moved:   "Fires when an Experiment task's Experiment Status field changes.",
};

type ActionType =
  | "notify_reporter"
  | "notify_assignee"
  | "notify_role"
  | "create_task"
  | "broadcast_experiment";

const ACTION_LABELS: Record<ActionType, string> = {
  notify_reporter:       "Notify reporter",
  notify_assignee:       "Notify assignee",
  notify_role:           "Notify team role",
  create_task:           "Create task from meeting action items",
  broadcast_experiment:  "Broadcast experiment update (Slack)",
};

const TRIGGER_COMPATIBLE_ACTIONS: Record<AutomationRule["trigger"], ActionType[]> = {
  task_done:          ["notify_reporter", "notify_assignee", "notify_role"],
  task_overdue:       ["notify_reporter", "notify_assignee", "notify_role"],
  approval_requested: ["notify_reporter", "notify_assignee", "notify_role"],
  meeting_done:       ["create_task", "notify_reporter", "notify_assignee"],
  experiment_moved:   ["broadcast_experiment", "notify_reporter", "notify_assignee"],
};

/* ── Action builder ─────────────────────────────────────── */

function buildDefaultAction(type: ActionType): Record<string, unknown> {
  switch (type) {
    case "notify_role":
      return { type, role: "member", message: "" };
    case "create_task":
      return { type, title: "Meeting action item", issue_type: "task", priority: "normal" };
    case "broadcast_experiment":
      return { type, message_template: "Experiment *{title}* status changed." };
    default:
      return { type, message: "" };
  }
}

/* ── Rule card ──────────────────────────────────────────── */

function RuleCard({ rule, projectId }: { rule: AutomationRule; projectId: string }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/projects/automation-rules/${rule.id}/`, { is_active: !rule.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "automation-rules"] });
      toast.success(rule.is_active ? "Rule disabled" : "Rule enabled");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to update rule")),
  });

  const destroy = useMutation({
    mutationFn: () => api.delete(`/projects/automation-rules/${rule.id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "automation-rules"] });
      toast.success("Rule deleted");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to delete rule")),
  });

  return (
    <div className={cn("rounded-xl border transition-colors", rule.is_active ? "border-border" : "border-border/50 opacity-60")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((e) => !e)}
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{rule.name}</p>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
            </Badge>
            <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
              {rule.is_active ? "Active" : "Disabled"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {(rule.actions ?? []).length} action{rule.actions?.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          aria-label={rule.is_active ? "Disable rule" : "Enable rule"}
        >
          {rule.is_active
            ? <ToggleRight className="h-5 w-5 text-primary" />
            : <ToggleLeft className="h-5 w-5" />}
        </button>
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => destroy.mutate()}
          disabled={destroy.isPending}
          aria-label="Delete rule"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
          <p className="text-[12px] text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {TRIGGER_DESCRIPTIONS[rule.trigger] ?? "Custom trigger"}
          </p>
          <div className="space-y-1.5">
            {(rule.actions ?? []).map((action, i) => {
              const type = action.type as ActionType;
              return (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <Zap className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium">{ACTION_LABELS[type] ?? type}</span>
                  {action.message ? <span className="text-muted-foreground truncate">— "{String(action.message)}"</span> : null}
                  {action.role ? <Badge variant="outline" className="text-[10px]">{String(action.role)}</Badge> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */

type DraftAction = { type: ActionType; message: string; role: string; issue_type: string; priority: string; message_template: string };

const emptyDraft = (): { name: string; trigger: AutomationRule["trigger"]; actions: DraftAction[] } => ({
  name: "",
  trigger: "task_done",
  actions: [{ type: "notify_reporter", message: "", role: "member", issue_type: "task", priority: "normal", message_template: "" }],
});

export default function AutomationsPage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);

  const { data: rules = [], isLoading } = useAutomationRules({ projectId: id });
  const createRule = useCreateAutomationRule();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const compatibleActions = TRIGGER_COMPATIBLE_ACTIONS[draft.trigger] ?? [];

  const handleAddAction = () => {
    const firstCompat = compatibleActions[0] ?? "notify_reporter";
    setDraft((d) => ({
      ...d,
      actions: [...d.actions, { type: firstCompat, message: "", role: "member", issue_type: "task", priority: "normal", message_template: "" }],
    }));
  };

  const handleRemoveAction = (i: number) =>
    setDraft((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }));

  const handleActionChange = (i: number, key: keyof DraftAction, val: string) =>
    setDraft((d) => {
      const actions = [...d.actions];
      actions[i] = { ...actions[i], [key]: val };
      return { ...d, actions };
    });

  const handleTriggerChange = (trigger: AutomationRule["trigger"]) => {
    const newCompat = TRIGGER_COMPATIBLE_ACTIONS[trigger] ?? [];
    setDraft((d) => ({
      ...d,
      trigger,
      actions: d.actions.map((a) =>
        newCompat.includes(a.type) ? a : { ...a, type: newCompat[0] ?? "notify_reporter" }
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!draft.name.trim() || draft.actions.length === 0) return;
    const actions = draft.actions.map((a) => {
      const base = buildDefaultAction(a.type);
      if (a.message) base.message = a.message;
      if (a.role && a.type === "notify_role") base.role = a.role;
      if (a.type === "create_task") { base.issue_type = a.issue_type; base.priority = a.priority; }
      if (a.type === "broadcast_experiment" && a.message_template) base.message_template = a.message_template;
      return base;
    });
    await createRule.mutateAsync({
      project: id,
      name: draft.name.trim(),
      trigger: draft.trigger,
      actions,
      is_active: true,
    } as any);
    setDraft(emptyDraft());
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id} />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Automation Rules
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Automate notifications and task creation in {project?.name ?? "this project"}.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            New rule
          </Button>
        </div>

        {/* New rule form */}
        {showForm && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">New automation rule</CardTitle>
              <CardDescription className="text-[12px]">
                Choose a trigger and one or more actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Rule name (e.g. Notify team when experiment deployed)"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />

              {/* Trigger */}
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Trigger</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(TRIGGER_LABELS) as AutomationRule["trigger"][]).map((t) => (
                    <label
                      key={t}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                        draft.trigger === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="trigger"
                        value={t}
                        checked={draft.trigger === t}
                        onChange={() => handleTriggerChange(t)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-[12px] font-semibold">{TRIGGER_LABELS[t]}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{TRIGGER_DESCRIPTIONS[t]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Actions</p>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={handleAddAction}>
                    <Plus className="h-3 w-3" /> Add action
                  </Button>
                </div>
                {draft.actions.map((action, i) => (
                  <div key={i} className="flex gap-2 items-start rounded-lg border p-3">
                    <div className="flex-1 space-y-2">
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={action.type}
                        onChange={(e) => handleActionChange(i, "type", e.target.value)}
                      >
                        {compatibleActions.map((a) => (
                          <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                        ))}
                      </select>

                      {(action.type === "notify_reporter" || action.type === "notify_assignee") && (
                        <Input
                          placeholder="Custom message (optional)"
                          value={action.message}
                          onChange={(e) => handleActionChange(i, "message", e.target.value)}
                          className="h-8 text-[12px]"
                        />
                      )}
                      {action.type === "notify_role" && (
                        <div className="flex gap-2">
                          <select
                            className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-[12px]"
                            value={action.role}
                            onChange={(e) => handleActionChange(i, "role", e.target.value)}
                          >
                            <option value="ceo">CEO</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="member">Member</option>
                          </select>
                          <Input
                            placeholder="Message (optional)"
                            value={action.message}
                            onChange={(e) => handleActionChange(i, "message", e.target.value)}
                            className="h-8 flex-1 text-[12px]"
                          />
                        </div>
                      )}
                      {action.type === "create_task" && (
                        <div className="flex gap-2">
                          <select
                            className="h-8 rounded-md border border-input bg-background px-3 text-[12px]"
                            value={action.issue_type}
                            onChange={(e) => handleActionChange(i, "issue_type", e.target.value)}
                          >
                            <option value="task">Task</option>
                            <option value="experiment">Experiment</option>
                            <option value="story">Story</option>
                            <option value="bug">Bug</option>
                          </select>
                          <select
                            className="h-8 rounded-md border border-input bg-background px-3 text-[12px]"
                            value={action.priority}
                            onChange={(e) => handleActionChange(i, "priority", e.target.value)}
                          >
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      )}
                      {action.type === "broadcast_experiment" && (
                        <Input
                          placeholder="Message template (use {title}, {trigger})"
                          value={action.message_template}
                          onChange={(e) => handleActionChange(i, "message_template", e.target.value)}
                          className="h-8 text-[12px]"
                        />
                      )}
                    </div>
                    {draft.actions.length > 1 && (
                      <button
                        className="text-muted-foreground hover:text-destructive mt-1"
                        onClick={() => handleRemoveAction(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setShowForm(false); setDraft(emptyDraft()); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!draft.name.trim() || createRule.isPending}
                >
                  Save rule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rule list */}
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading rules…</p>}
          {!isLoading && rules.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No automation rules yet</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Rules automatically notify people or create tasks when project events occur.
              </p>
            </div>
          )}
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} projectId={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
