"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Copy, Link as LinkIcon, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { SlackWebhook } from "@/types/integrations";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

export function SlackWebhooksCard({
  teamId,
  canManage,
}: {
  teamId: string | null;
  canManage: boolean;
}) {
  const [items, setItems] = useState<SlackWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("Default");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);

  const apiBase = useMemo(() => `/integrations/teams/${teamId}/slack-webhooks/`, [teamId]);

  const load = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<SlackWebhook[]>>(apiBase);
      if (res.data.success) setItems(res.data.data ?? []);
      else setItems([]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const add = async () => {
    if (!teamId) return;
    if (!canManage) return toast.error("You don’t have permission to manage integrations for this team.");
    if (!url.trim()) return toast.error("Webhook URL is required");
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<SlackWebhook>>(apiBase, {
        name: name.trim() || "Default",
        webhook_url: url.trim(),
        enabled,
      });
      if (!res.data.success) throw new Error(res.data.error ?? "Failed to add webhook");
      toast.success("Webhook added");
      setName("Default");
      setUrl("");
      setEnabled(true);
      await load();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to add webhook"));
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, patch: Partial<SlackWebhook>) => {
    if (!teamId) return;
    if (!canManage) return toast.error("You don’t have permission to manage integrations for this team.");
    try {
      const res = await api.patch<ApiResponse<SlackWebhook>>(`${apiBase}${id}/`, patch);
      if (!res.data.success) throw new Error(res.data.error ?? "Failed to update webhook");
      setItems((prev) => prev.map((w) => (w.id === id ? (res.data.data as SlackWebhook) : w)));
      toast.success("Saved");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update webhook"));
    }
  };

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const remove = async (id: string) => {
    if (!teamId) return;
    if (!canManage) return toast.error("You don’t have permission to manage integrations for this team.");
    try {
      await api.delete(`${apiBase}${id}/`);
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to delete webhook"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Slack Webhooks
        </CardTitle>
        <CardDescription>
          Send Cowrk events to Slack using Incoming Webhooks. Delivery is retried via an outbox worker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!teamId ? (
          <p className="text-sm text-muted-foreground">Select a team to configure integrations.</p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hookName">Name</Label>
                  <Input id="hookName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Default" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hookUrl">Webhook URL</Label>
                  <Input
                    id="hookUrl"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/…"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enabled</p>
                  <p className="text-xs text-muted-foreground">Disable to pause deliveries without deleting.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={add} disabled={saving || !canManage} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {saving ? "Adding…" : "Add webhook"}
                </Button>
                <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              {!canManage && (
                <p className="text-xs text-muted-foreground">
                  You need at least <strong>Manager</strong> role to manage Slack webhooks.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Configured webhooks</p>
                <p className="text-xs text-muted-foreground">{loading ? "Loading…" : `${items.length} total`}</p>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No webhooks yet.</p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {items.map((w) => (
                    <div key={w.id} className="p-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{w.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{w.webhook_url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!w.enabled}
                          onCheckedChange={(next) => update(w.id, { enabled: next })}
                          disabled={!canManage}
                        />
                        <Button variant="outline" size="icon" onClick={() => copyUrl(w.webhook_url)} aria-label="Copy URL">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => remove(w.id)} disabled={!canManage} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Tip: run the outbox worker regularly (Celery beat) so Slack deliveries retry if Slack is temporarily down.
        </p>
      </CardFooter>
    </Card>
  );
}
