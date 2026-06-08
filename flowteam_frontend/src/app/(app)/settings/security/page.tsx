"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Monitor, Smartphone, Trash2, Plus, Copy, Eye, EyeOff,
  Shield, Key, AlertTriangle, Check, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { useTeamStore } from "@/store/team";

// Thin wrapper so the rest of the file can keep apiFetch call style
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toLowerCase();
  const hasBody = init?.body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axiosRes = await (api as any).request({
    url: path,
    method,
    data: hasBody ? JSON.parse(init!.body as string) : undefined,
    headers: init?.headers,
    validateStatus: () => true,
  });
  // Wrap in a Response-like object the callers need
  return {
    ok: axiosRes.status >= 200 && axiosRes.status < 300,
    status: axiosRes.status,
    json: async () => axiosRes.data,
  } as unknown as Response;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  jti: string;
  device_name: string;
  ip_address: string | null;
  last_active: string;
  created_at: string;
}

interface APIKey {
  id: string;
  team_id: string;
  team_name: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { value: "tasks:read",       label: "Read tasks" },
  { value: "tasks:write",      label: "Create / update tasks" },
  { value: "projects:read",    label: "Read projects" },
  { value: "webhooks:manage",  label: "Manage webhooks" },
];

const EXPIRY_OPTIONS = [
  { value: "never",   label: "No expiry" },
  { value: "30d",     label: "30 days" },
  { value: "90d",     label: "90 days" },
  { value: "180d",    label: "180 days" },
  { value: "365d",    label: "1 year" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function deviceIcon(deviceName: string) {
  const lower = (deviceName || "").toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  }
  return <Monitor className="h-4 w-4 text-muted-foreground" />;
}

function expiryDate(days: string): string | undefined {
  if (days === "never") return undefined;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(days));
  return d.toISOString();
}

// ── Sessions section ──────────────────────────────────────────────────────────

function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/auth/sessions/");
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function revokeSession(jti: string) {
    setRevoking(jti);
    try {
      const res = await apiFetch(`/auth/sessions/${jti}/`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Session revoked");
        setSessions(prev => prev.filter(s => s.jti !== jti));
      } else {
        toast.error("Failed to revoke session");
      }
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevokingAll(true);
    try {
      const res = await apiFetch("/auth/sessions/all/", { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        toast.success(`Revoked ${json.data?.revoked_count ?? 0} session(s)`);
        loadSessions();
      } else {
        toast.error("Failed to revoke sessions");
      }
    } finally {
      setRevokingAll(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Active Sessions
          </CardTitle>
          <CardDescription>Devices currently signed in to your account</CardDescription>
        </div>
        {sessions.length > 1 && (
          <Button variant="outline" size="sm" onClick={revokeAll} disabled={revokingAll}>
            {revokingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Sign out other sessions
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No active sessions found.</p>
        ) : (
          sessions.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {deviceIcon(s.device_name)}
                <div>
                  <p className="text-sm font-medium">
                    {s.device_name || "Unknown device"}
                    {i === 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ip_address ?? "—"} · Last active {relativeTime(s.last_active)}
                  </p>
                </div>
              </div>
              {i !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSession(s.jti)}
                  disabled={revoking === s.jti}
                  className="text-destructive hover:text-destructive"
                >
                  {revoking === s.jti ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── API Keys section ──────────────────────────────────────────────────────────

function APIKeysSection() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const teams = useTeamStore(s => s.teams);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTeam, setFormTeam] = useState(teams[0]?.id ?? "");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formExpiry, setFormExpiry] = useState("never");
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/auth/api-keys/");
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  function toggleScope(scope: string) {
    setFormScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  }

  async function createKey() {
    if (!formName.trim() || !formTeam || formScopes.length === 0) {
      toast.error("Name, team, and at least one scope are required");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        team_id: formTeam,
        scopes: formScopes,
      };
      const expires = expiryDate(formExpiry);
      if (expires) body.expires_at = expires;

      const res = await apiFetch("/auth/api-keys/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setNewKey(json.data?.key ?? null);
        setKeys(prev => [json.data, ...prev]);
        setFormName("");
        setFormScopes([]);
        setFormExpiry("never");
        toast.success("API key created — copy it now, it won't be shown again");
      } else {
        toast.error(json.error ?? "Failed to create key");
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevoking(id);
    try {
      const res = await apiFetch(`/auth/api-keys/${id}/`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API key revoked");
        setKeys(prev => prev.filter(k => k.id !== id));
      } else {
        toast.error("Failed to revoke key");
      }
    } finally {
      setRevoking(null);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              API Keys
            </CardTitle>
            <CardDescription>Long-lived keys for Zapier, Make, and external integrations</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setCreateOpen(true); setNewKey(null); }}>
            <Plus className="h-4 w-4 mr-1" /> New key
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading keys…
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No API keys yet. Create one to connect external tools.</p>
            </div>
          ) : (
            keys.map(k => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {k.prefix}…
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {k.scopes.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {k.team_name} ·{" "}
                    {k.last_used_at ? `Last used ${relativeTime(k.last_used_at)}` : "Never used"} ·{" "}
                    {k.expires_at ? `Expires ${new Date(k.expires_at).toLocaleDateString()}` : "No expiry"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeKey(k.id)}
                  disabled={revoking === k.id}
                  className="text-destructive hover:text-destructive ml-2 shrink-0"
                >
                  {revoking === k.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create key dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setNewKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>The key is shown once. Copy and store it securely.</DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Copy this key now — it will <strong>not</strong> be shown again.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={showKey ? newKey : "cwrk_" + "•".repeat(newKey.length - 5)}
                  className="font-mono text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreateOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Zapier integration"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Team</Label>
                <Select value={formTeam} onValueChange={setFormTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                {AVAILABLE_SCOPES.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={s.value}
                      checked={formScopes.includes(s.value)}
                      onCheckedChange={() => toggleScope(s.value)}
                    />
                    <label htmlFor={s.value} className="text-sm cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <Label>Expiry</Label>
                <Select value={formExpiry} onValueChange={setFormExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createKey} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── IP Allowlist section ──────────────────────────────────────────────────────

function IPAllowlistSection() {
  const [entries, setEntries] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addEntry() {
    const val = input.trim();
    if (!val || entries.includes(val)) return;
    setEntries(prev => [...prev, val]);
    setInput("");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch("/companies/security/ip-allowlist/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_allowlist: entries }),
      });
      if (res.ok) {
        toast.success("IP allowlist updated");
      } else {
        toast.error("Failed to save allowlist");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          IP Allowlist
        </CardTitle>
        <CardDescription>
          Restrict API access to specific IP addresses or CIDR ranges. Leave empty to allow all IPs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="192.168.1.0/24 or 203.0.113.5"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addEntry()}
            className="font-mono text-sm"
          />
          <Button variant="outline" onClick={addEntry}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map(e => (
            <Badge key={e} variant="secondary" className="font-mono gap-1">
              {e}
              <button
                onClick={() => setEntries(prev => prev.filter(x => x !== e))}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">All IPs are currently allowed.</p>
          )}
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Save allowlist
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your active sessions, API keys, and access controls.
        </p>
      </div>

      <SessionsSection />
      <APIKeysSection />
      <IPAllowlistSection />
    </div>
  );
}
