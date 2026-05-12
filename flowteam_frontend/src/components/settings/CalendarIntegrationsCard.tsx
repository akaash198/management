"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type Provider = "google" | "microsoft";

interface CalendarAccount {
  provider: Provider;
  enabled: boolean;
  sync_external_events: boolean;
  expires_at: string | null;
  scopes?: string;
}

export function CalendarIntegrationsCard({ teamId }: { teamId: string | null }) {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);

  const byProvider = useMemo(() => {
    const map = new Map<Provider, CalendarAccount>();
    for (const a of accounts) map.set(a.provider, a);
    return map;
  }, [accounts]);

  const refresh = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<CalendarAccount[]>>(`/integrations/teams/${teamId}/calendar-accounts/`);
      setAccounts(res.data.data ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const startOAuth = async (provider: Provider) => {
    if (!teamId) return;
    try {
      const res = await api.post<ApiResponse<{ url: string }>>(`/integrations/calendar/${provider}/start/`, { team_id: teamId });
      const url = res.data.data?.url;
      if (!url) throw new Error("Missing auth url");
      window.location.href = url;
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to start calendar connection"));
    }
  };

  const toggleExternalEvents = async (provider: Provider, value: boolean) => {
    if (!teamId) return;
    setSavingProvider(provider);
    try {
      await api.patch<ApiResponse<CalendarAccount>>(`/integrations/teams/${teamId}/calendar-accounts/`, {
        provider,
        sync_external_events: value,
      });
      toast.success(value ? "External events enabled" : "External events disabled");
      await refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update calendar settings"));
    } finally {
      setSavingProvider(null);
    }
  };

  const google = byProvider.get("google");
  const microsoft = byProvider.get("microsoft");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Calendar Sync
            </CardTitle>
            <CardDescription>Connect Google Calendar or Outlook to display external events inside Cowrk.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={refresh} disabled={loading || !teamId}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Google Calendar</p>
                <p className="text-xs text-muted-foreground">Read-only external events</p>
              </div>
              {google ? <Badge variant="secondary">Connected</Badge> : <Badge variant="outline">Not connected</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => startOAuth("google")}
                disabled={!teamId}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {google ? "Reconnect" : "Connect"}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show events</span>
                <Switch
                  checked={!!google?.sync_external_events}
                  onCheckedChange={(v) => toggleExternalEvents("google", v === true)}
                  disabled={!google || savingProvider === "google"}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Outlook Calendar</p>
                <p className="text-xs text-muted-foreground">Read-only external events</p>
              </div>
              {microsoft ? <Badge variant="secondary">Connected</Badge> : <Badge variant="outline">Not connected</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => startOAuth("microsoft")}
                disabled={!teamId}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {microsoft ? "Reconnect" : "Connect"}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show events</span>
                <Switch
                  checked={!!microsoft?.sync_external_events}
                  onCheckedChange={(v) => toggleExternalEvents("microsoft", v === true)}
                  disabled={!microsoft || savingProvider === "microsoft"}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Two-way sync (creating/updating events in external calendars) is coming next. For now, Cowrk can display your connected external
          events on the Calendar page.
        </p>
      </CardContent>
    </Card>
  );
}

