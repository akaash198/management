"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";

type WebhookDelivery = {
  id: string;
  event: string;
  delivery_id: string;
  status: "received" | "processed" | "failed" | "ignored" | string;
  error?: string;
  created_at: string;
  processed_at?: string | null;
};

type WebhookListResponse = {
  connected: boolean;
  deliveries: WebhookDelivery[];
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  processed: "default",
  received: "secondary",
  ignored: "outline",
  failed: "destructive",
};

export default function GitHubWebhookLogPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<WebhookListResponse>({
    queryKey: ["github-webhook-deliveries", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WebhookListResponse>>(`/integrations/projects/${projectId}/github/webhooks/`);
      return res.data.data as WebhookListResponse;
    },
    enabled: !!projectId,
  });

  const retry = useMutation({
    mutationFn: async (deliveryId: string) => {
      const res = await api.post<ApiResponse<{ status: string }>>(
        `/integrations/projects/${projectId}/github/webhooks/${deliveryId}/retry/`,
        {}
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["github-webhook-deliveries", projectId] });
      toast.success("Webhook reprocessed");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Retry failed")),
  });

  const deliveries = data?.deliveries ?? [];

  return (
    <div className="space-y-6">
      <ProjectTopNav projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GitHub webhook delivery log</CardTitle>
          <CardDescription>Recent deliveries received from GitHub. Failed deliveries can be retried.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !data?.connected ? (
            <div className="text-sm text-muted-foreground">GitHub is not connected for this project.</div>
          ) : deliveries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No webhook deliveries yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.event}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[d.status] || "outline"} className="capitalize">
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[520px] truncate">
                      {d.error || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(d.id)}
                      >
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

