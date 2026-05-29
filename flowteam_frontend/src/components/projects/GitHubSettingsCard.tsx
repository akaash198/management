"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, Save, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

interface GitHubIntegration {
  connected: boolean;
  github_user?: string;
  full_repo?: string;
  default_branch?: string;
  sync_commits?: boolean;
  sync_branches?: boolean;
  auto_advance_on_merge?: boolean;
  webhook_status?: "active" | "inactive" | string;
  last_delivery_at?: string | null;
}

export function GitHubSettingsCard({ projectId }: { projectId: string }) {
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
  const [repo, setRepo] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [syncCommits, setSyncCommits] = useState(true);
  const [syncBranches, setSyncBranches] = useState(true);
  const [autoAdvanceOnMerge, setAutoAdvanceOnMerge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reregistering, setReregistering] = useState(false);

  useEffect(() => {
    async function loadIntegration() {
      try {
        const response = await api.get<ApiResponse<GitHubIntegration>>(`/integrations/projects/${projectId}/github/`);
        const data = response.data.data;
        setIntegration(data);
        setRepo(data?.full_repo || "");
        setDefaultBranch(data?.default_branch || "main");
        setSyncCommits(data?.sync_commits ?? true);
        setSyncBranches(data?.sync_branches ?? true);
        setAutoAdvanceOnMerge(!!data?.auto_advance_on_merge);
      } catch {
        setIntegration({ connected: false });
      }
    }

    void loadIntegration();
  }, [projectId]);

  const handleConnect = () => {
    window.location.href = `${getApiBaseUrl()}/auth/oauth/github/redirect/?project_id=${projectId}`;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.patch<ApiResponse<GitHubIntegration>>(`/integrations/projects/${projectId}/github/`, {
        repo,
        default_branch: defaultBranch,
        sync_commits: syncCommits,
        sync_branches: syncBranches,
        auto_advance_on_merge: autoAdvanceOnMerge,
      });
      setIntegration(response.data.data);
      setRepo(response.data.data.full_repo || repo);
      setDefaultBranch(response.data.data.default_branch || defaultBranch);
      setSyncCommits(response.data.data.sync_commits ?? syncCommits);
      setSyncBranches(response.data.data.sync_branches ?? syncBranches);
      setAutoAdvanceOnMerge(!!response.data.data.auto_advance_on_merge);
      toast.success("Repository linked");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save repository"));
    } finally {
      setSaving(false);
    }
  };

  const handleReregister = async () => {
    try {
      setReregistering(true);
      const res = await api.post<ApiResponse<GitHubIntegration>>(`/integrations/projects/${projectId}/github/webhooks/reregister/`, {});
      setIntegration(res.data.data);
      toast.success("Webhook registered");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to re-register webhook"));
    } finally {
      setReregistering(false);
    }
  };

  const connected = !!integration?.connected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitPullRequest className="h-4 w-4" />
          GitHub Integration
        </CardTitle>
        <CardDescription>Connect a repository so pull requests can appear on matching tasks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <Button onClick={handleConnect} variant="outline" className="gap-2">
            <GitPullRequest className="h-4 w-4" />
            Connect GitHub repository
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              {integration.github_user && <span className="text-xs text-muted-foreground">@{integration.github_user}</span>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="owner/repo-name" value={repo} onChange={(event) => setRepo(event.target.value)} />
              <Button onClick={handleSave} disabled={saving || !repo.trim()} className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">Default branch</div>
                  <div className="text-[11px] text-muted-foreground">Used as the base branch when creating PRs.</div>
                </div>
                <Input className="h-8 w-40 text-xs" value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">Track commits</div>
                  <div className="text-[11px] text-muted-foreground">Store commit activity from push events.</div>
                </div>
                <Switch checked={syncCommits} onCheckedChange={setSyncCommits} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">Track branches</div>
                  <div className="text-[11px] text-muted-foreground">Link branches to tasks using branch name patterns.</div>
                </div>
                <Switch checked={syncBranches} onCheckedChange={setSyncBranches} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">Auto-advance on merge</div>
                  <div className="text-[11px] text-muted-foreground">Move tasks forward when PRs are merged (review/testing columns).</div>
                </div>
                <Switch checked={autoAdvanceOnMerge} onCheckedChange={setAutoAdvanceOnMerge} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-muted-foreground">
                  Webhook: <span className="font-medium text-foreground">{integration.webhook_status || "inactive"}</span>
                  {integration.last_delivery_at ? <span className="opacity-70"> · last delivery {new Date(integration.last_delivery_at).toLocaleString()}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleReregister} disabled={reregistering} size="sm" variant="outline" className="gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 ${reregistering ? "animate-spin" : ""}`} />
                    Re-register webhook
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${projectId}/settings/github-webhooks/`}>View delivery log</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pull requests that mention a task reference like #TASK-123 or the task id will be linked automatically.
        </p>
      </CardContent>
    </Card>
  );
}
