"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  GitPullRequest, GitBranch, Layers, MessageSquare, Calendar,
  CheckCircle2, Settings, Unlink, Loader2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useTeamStore } from "@/store/team";

// ── Types ─────────────────────────────────────────────────────────────────────

type IntegrationCategory = "vcs" | "messaging" | "calendar";

interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: React.ReactNode;
  oauthPath?: string;
  badge?: string;
}

interface IntegrationStatus {
  connected: boolean;
  count?: number;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

const CATALOG: CatalogEntry[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Link repos, sync pull requests, and auto-advance tasks on merge.",
    category: "vcs",
    icon: <GitPullRequest className="h-6 w-6" />,
    oauthPath: "/auth/oauth/github/redirect/",
    badge: "Popular",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect GitLab projects to track branches and MR status in tasks.",
    category: "vcs",
    icon: <GitBranch className="h-6 w-6" />,
    oauthPath: "/auth/oauth/gitlab/redirect/",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Sync Bitbucket repositories and pull requests with your projects.",
    category: "vcs",
    icon: <Layers className="h-6 w-6" />,
    oauthPath: "/auth/oauth/bitbucket/redirect/",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Receive task updates, sprint summaries, and AI insights in Slack.",
    category: "messaging",
    icon: <MessageSquare className="h-6 w-6" />,
    badge: "Popular",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync task deadlines and sprint dates with Google Calendar.",
    category: "calendar",
    icon: <Calendar className="h-6 w-6" />,
    oauthPath: "/auth/oauth/google/redirect/",
  },
  {
    id: "microsoft_calendar",
    name: "Microsoft Outlook",
    description: "Push task due dates and meeting action items to Outlook Calendar.",
    category: "calendar",
    icon: <Calendar className="h-6 w-6" />,
  },
];

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  vcs:       "Version Control",
  messaging: "Messaging",
  calendar:  "Calendar",
};

// ── Slack config dialog ───────────────────────────────────────────────────────

interface SlackWebhookRow {
  id: string;
  name: string;
  webhook_url: string;
  enabled: boolean;
}

function SlackConfigDialog({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: string }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("Default");
  const [saving, setSaving] = useState(false);
  const [webhooks, setWebhooks] = useState<SlackWebhookRow[]>([]);

  useEffect(() => {
    if (!open || !teamId) return;
    api.get(`/integrations/slack/?team=${teamId}`)
      .then(r => setWebhooks(r.data?.data ?? r.data?.results ?? []))
      .catch(() => {});
  }, [open, teamId]);

  async function save() {
    if (!url.trim()) { toast.error("Webhook URL is required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/integrations/slack/", {
        team: teamId,
        name: name.trim() || "Default",
        webhook_url: url.trim(),
      });
      if (res.status < 300) {
        toast.success("Slack webhook saved");
        setUrl("");
        onClose();
      } else {
        toast.error("Failed to save");
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Slack</DialogTitle>
          <DialogDescription>
            Paste an Incoming Webhook URL from your Slack workspace settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {webhooks.length > 0 && (
            <div className="space-y-1">
              <Label>Existing webhooks</Label>
              {webhooks.map(w => (
                <div key={w.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="font-medium">{w.name}</span>
                  <Badge variant={w.enabled ? "default" : "secondary"}>
                    {w.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
              <Separator />
            </div>
          )}
          <div className="space-y-1">
            <Label>Webhook name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Default" />
          </div>
          <div className="space-y-1">
            <Label>Webhook URL</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({
  entry,
  status,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  entry: CatalogEntry;
  status: IntegrationStatus;
  onConnect: (entry: CatalogEntry) => void;
  onDisconnect: (entry: CatalogEntry) => void;
  onConfigure: (entry: CatalogEntry) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-muted p-2.5 shrink-0">{entry.icon}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">{entry.name}</CardTitle>
              {entry.badge && (
                <Badge variant="secondary" className="text-xs">{entry.badge}</Badge>
              )}
            </div>
            {status.connected && (
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">
                  Connected{status.count !== undefined && status.count > 1 ? ` (${status.count})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <p className="text-xs text-muted-foreground">{entry.description}</p>
        <div className="flex gap-2">
          {status.connected ? (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onConfigure(entry)}>
                <Settings className="h-3 w-3 mr-1" /> Configure
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={() => onDisconnect(entry)}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button size="sm" className="flex-1" onClick={() => onConnect(entry)}>
              <Plus className="h-3 w-3 mr-1" /> Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { teams, activeTeamId } = useTeamStore();
  const currentTeamId = activeTeamId ?? teams[0]?.id ?? "";

  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [slackConfigOpen, setSlackConfigOpen] = useState(false);

  const loadStatuses = useCallback(async () => {
    if (!currentTeamId) return;
    setLoadingStatuses(true);
    try {
      const results = await Promise.allSettled([
        api.get(`/integrations/github/?team=${currentTeamId}`),
        api.get(`/integrations/gitlab/?team=${currentTeamId}`),
        api.get(`/integrations/bitbucket/?team=${currentTeamId}`),
        api.get(`/integrations/slack/?team=${currentTeamId}`),
        api.get(`/integrations/calendar/?team=${currentTeamId}`),
      ]);

      const countFrom = (r: PromiseSettledResult<{ data: unknown }>): number => {
        if (r.status === "rejected") return 0;
        const d = r.value.data as { data?: unknown[]; results?: unknown[] };
        const list = d?.data ?? d?.results ?? [];
        return Array.isArray(list) ? list.length : 0;
      };

      const [gh, gl, bb, sl, cal] = results.map(countFrom);

      setStatuses({
        github:             { connected: gh > 0, count: gh },
        gitlab:             { connected: gl > 0, count: gl },
        bitbucket:          { connected: bb > 0, count: bb },
        slack:              { connected: sl > 0, count: sl },
        google_calendar:    { connected: cal > 0 },
        microsoft_calendar: { connected: false },
      });
    } finally {
      setLoadingStatuses(false);
    }
  }, [currentTeamId]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  function handleConnect(entry: CatalogEntry) {
    if (entry.id === "slack") { setSlackConfigOpen(true); return; }
    if (entry.oauthPath) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
      window.location.href = `${apiBase}${entry.oauthPath}`;
    } else {
      toast.info(`${entry.name} OAuth is not configured yet.`);
    }
  }

  function handleConfigure(entry: CatalogEntry) {
    if (entry.id === "slack") { setSlackConfigOpen(true); return; }
    toast.info(`Configure ${entry.name} from the project's integration settings.`);
  }

  async function handleDisconnect(entry: CatalogEntry) {
    if (!confirm(`Disconnect ${entry.name}? This removes all connections for this team.`)) return;
    const pathMap: Record<string, string> = {
      github:    "/integrations/github/",
      gitlab:    "/integrations/gitlab/",
      bitbucket: "/integrations/bitbucket/",
      slack:     "/integrations/slack/",
    };
    const path = pathMap[entry.id];
    if (!path) { toast.info("Remove this integration from the project settings panel."); return; }
    try {
      await api.delete(`${path}?team=${currentTeamId}`);
      toast.success(`${entry.name} disconnected`);
      setStatuses(prev => ({ ...prev, [entry.id]: { connected: false } }));
    } catch {
      toast.error("Failed to disconnect — try from the project integration panel.");
    }
  }

  const categories: IntegrationCategory[] = ["vcs", "messaging", "calendar"];

  return (
    <div className="max-w-3xl space-y-8 py-6">
      <div>
        <h1 className="text-xl font-semibold">Integration Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your tools to automate workflows and keep your team in sync.
        </p>
      </div>

      {loadingStatuses && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading integration status…
        </div>
      )}

      {categories.map(cat => (
        <div key={cat}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATALOG.filter(e => e.category === cat).map(entry => (
              <IntegrationCard
                key={entry.id}
                entry={entry}
                status={statuses[entry.id] ?? { connected: false }}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onConfigure={handleConfigure}
              />
            ))}
          </div>
        </div>
      ))}

      <SlackConfigDialog
        open={slackConfigOpen}
        onClose={() => { setSlackConfigOpen(false); loadStatuses(); }}
        teamId={currentTeamId}
      />
    </div>
  );
}
