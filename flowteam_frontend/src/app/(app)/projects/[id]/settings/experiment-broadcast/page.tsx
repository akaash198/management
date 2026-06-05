"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Radio,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
  RefreshCcw,
  Save,
} from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
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

/* ── Types ──────────────────────────────────────────────── */

type SlackWebhook = { id: string; name: string; webhook_url: string };

type BroadcastConfig = {
  configured: boolean;
  enabled: boolean;
  slack_webhook_id: string | null;
  notify_on_statuses: string[];
  message_template: string;
  slack_webhooks: SlackWebhook[];
};

type BroadcastLog = {
  id: string;
  task_title: string;
  experiment_status: string;
  message_sent: string;
  status: "sent" | "failed" | "skipped";
  error: string;
  created_at: string;
};

const ALL_STATUSES = ["Hypothesis", "In Progress", "Eval Review", "Staging", "Deployed", "Abandoned"];

const STATUS_ICONS: Record<string, string> = {
  Hypothesis: "💡",
  "In Progress": "🔬",
  "Eval Review": "📊",
  Staging: "🚀",
  Deployed: "✅",
  Abandoned: "🗑️",
};

/* ── Main page ──────────────────────────────────────────── */

export default function ExperimentBroadcastPage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<BroadcastConfig>({
    queryKey: ["experiment-broadcast", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BroadcastConfig>>(
        `/integrations/projects/${id}/experiment-broadcast/`
      );
      return res.data.data as BroadcastConfig;
    },
    enabled: !!id,
  });

  const { data: logs = [], refetch: refetchLogs, isFetching: logsFetching } = useQuery<BroadcastLog[]>({
    queryKey: ["experiment-broadcast-logs", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BroadcastLog[]>>(
        `/integrations/projects/${id}/experiment-broadcast/logs/`
      );
      return res.data.data ?? [];
    },
    enabled: !!id,
    staleTime: 15_000,
  });

  const [enabled, setEnabled]             = useState(true);
  const [webhookId, setWebhookId]         = useState<string>("");
  const [statuses, setStatuses]           = useState<string[]>(["Deployed", "Eval Review"]);
  const [template, setTemplate]           = useState(
    "Experiment *{title}* moved to *{status}* in project *{project}*."
  );

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled ?? true);
    setWebhookId(config.slack_webhook_id ?? "");
    setStatuses(config.notify_on_statuses?.length ? config.notify_on_statuses : ["Deployed", "Eval Review"]);
    setTemplate(config.message_template || "Experiment *{title}* moved to *{status}* in project *{project}*.");
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/integrations/projects/${id}/experiment-broadcast/`, {
        enabled,
        slack_webhook_id: webhookId || null,
        notify_on_statuses: statuses,
        message_template: template,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment-broadcast", id] });
      toast.success("Broadcast config saved");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to save config")),
  });

  const toggleStatus = (s: string) =>
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const slackWebhooks: SlackWebhook[] = config?.slack_webhooks ?? [];

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id} />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Experiment Broadcast
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Auto-post Slack messages when experiment status changes in {project?.name ?? "this project"}.
          </p>
        </div>

        {/* Config card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription className="text-[12px]">
              Connect a Slack webhook and choose which status transitions trigger a broadcast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  enabled ? "bg-primary" : "bg-muted"
                )}
                onClick={() => setEnabled((e) => !e)}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    enabled ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </div>
              <span className="text-sm font-medium">
                {enabled ? "Broadcast enabled" : "Broadcast disabled"}
              </span>
            </label>

            {/* Slack webhook selector */}
            <div className="space-y-1.5">
              <p className="text-[12px] font-medium text-muted-foreground">Slack webhook</p>
              {slackWebhooks.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-[12px] text-muted-foreground">
                    No Slack webhooks configured for this team. Add one in team settings first.
                  </p>
                </div>
              ) : (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={webhookId}
                  onChange={(e) => setWebhookId(e.target.value)}
                >
                  <option value="">— Select a webhook —</option>
                  {slackWebhooks.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status triggers */}
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-muted-foreground">Broadcast when status changes to</p>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const active = statuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <span>{STATUS_ICONS[s]}</span>
                      {s}
                    </button>
                  );
                })}
              </div>
              {statuses.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Select at least one status to broadcast.</p>
              )}
            </div>

            {/* Message template */}
            <div className="space-y-1.5">
              <p className="text-[12px] font-medium text-muted-foreground">
                Message template
                <span className="ml-2 text-[11px] font-normal opacity-60">
                  Variables: {"{title}"}, {"{status}"}, {"{project}"}
                </span>
              </p>
              <Input
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Experiment *{title}* moved to *{status}*"
              />
              {template && (
                <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5 font-mono">
                  Preview: {template
                    .replace("{title}", "Fraud Detection Model v3")
                    .replace("{status}", statuses[0] ?? "Deployed")
                    .replace("{project}", project?.name ?? "Project")}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                className="gap-2"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                <Save className="h-4 w-4" />
                Save config
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Broadcast log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Broadcast log
                </CardTitle>
                <CardDescription className="text-[12px] mt-0.5">
                  Last 50 experiment broadcast events.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => void refetchLogs()}
                disabled={logsFetching}
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", logsFetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Experiment</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Result</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 max-w-[200px]">
                          <p className="text-[12px] font-medium truncate">{log.task_title || "—"}</p>
                          {log.message_sent && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{log.message_sent}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_ICONS[log.experiment_status] ?? ""} {log.experiment_status || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          {log.status === "sent" && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Sent
                            </span>
                          )}
                          {log.status === "skipped" && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> Skipped
                            </span>
                          )}
                          {log.status === "failed" && (
                            <span className="flex items-center gap-1 text-[11px] text-destructive" title={log.error}>
                              <AlertCircle className="h-3 w-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
