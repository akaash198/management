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

interface GitHubIntegration {
  connected: boolean;
  github_user?: string;
  full_repo?: string;
}

export function GitHubSettingsCard({ projectId }: { projectId: string }) {
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
  const [repo, setRepo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadIntegration() {
      try {
        const response = await api.get<ApiResponse<GitHubIntegration>>(`/integrations/projects/${projectId}/github/`);
        const data = response.data.data;
        setIntegration(data);
        setRepo(data?.full_repo || "");
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
      const response = await api.patch<ApiResponse<GitHubIntegration>>(`/integrations/projects/${projectId}/github/`, { repo });
      setIntegration(response.data.data);
      setRepo(response.data.data.full_repo || repo);
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
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pull requests that mention a task reference like #TASK-123 or the task id will be linked automatically.
        </p>
      </CardContent>
    </Card>
  );
}
