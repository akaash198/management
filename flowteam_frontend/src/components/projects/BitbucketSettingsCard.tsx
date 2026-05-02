"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, Save } from "lucide-react";
import api from "@/lib/api";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

interface BitbucketIntegration {
  connected: boolean;
  bitbucket_user?: string;
  workspace?: string;
  repo_slug?: string;
}

export function BitbucketSettingsCard({ projectId }: { projectId: string }) {
  const [integration, setIntegration] = useState<BitbucketIntegration | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [repoSlug, setRepoSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadIntegration() {
      try {
        const response = await api.get<ApiResponse<BitbucketIntegration>>(
          `/integrations/projects/${projectId}/bitbucket/`
        );
        const data = response.data.data;
        setIntegration(data);
        setWorkspace(data?.workspace || "");
        setRepoSlug(data?.repo_slug || "");
      } catch {
        setIntegration({ connected: false });
      }
    }

    void loadIntegration();
  }, [projectId]);

  const handleConnect = () => {
    window.location.href = `${getApiBaseUrl()}/auth/oauth/bitbucket/redirect/?project_id=${projectId}`;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.patch<ApiResponse<BitbucketIntegration>>(`/integrations/projects/${projectId}/bitbucket/`, {
        workspace,
        repo_slug: repoSlug,
      });
      setIntegration(response.data.data);
      setWorkspace(response.data.data.workspace || workspace);
      setRepoSlug(response.data.data.repo_slug || repoSlug);
      toast.success("Repository linked");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save repository"));
    } finally {
      setSaving(false);
    }
  };

  const connected = !!integration?.connected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitPullRequest className="h-4 w-4" />
          Bitbucket Integration
        </CardTitle>
        <CardDescription>Connect a repository so pull requests can appear on matching tasks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <Button onClick={handleConnect} variant="outline" className="gap-2">
            <GitPullRequest className="h-4 w-4" />
            Connect Bitbucket repository
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              {integration.bitbucket_user && <span className="text-xs text-muted-foreground">{integration.bitbucket_user}</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="workspace" value={workspace} onChange={(event) => setWorkspace(event.target.value)} />
              <Input placeholder="repo-slug" value={repoSlug} onChange={(event) => setRepoSlug(event.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving || !workspace.trim() || !repoSlug.trim()} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pull requests that mention a task reference like #TASK-123 or the task id will be linked automatically.
        </p>
      </CardContent>
    </Card>
  );
}

