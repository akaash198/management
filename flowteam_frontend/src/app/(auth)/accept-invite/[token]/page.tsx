"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/lib/errorMessage";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const accept = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/teams/invites/${token}/accept/`);
      if (res.data?.success) {
        setSuccess("Invite accepted. Redirecting…");
        setTimeout(() => router.push("/login"), 800);
      } else {
        setError(toErrorMessage(res.data?.error ?? res.data, "Failed to accept invite."));
      }
    } catch (err: any) {
      setError(toErrorMessage(err?.response?.data?.error ?? err?.response?.data ?? err, "Failed to accept invite."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-attempt once; user can retry if needed.
    accept().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Accept invite</CardTitle>
          <CardDescription className="text-center">Joining the team you were invited to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive text-center">{String(error)}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}
          {!error && !success && <p className="text-sm text-muted-foreground text-center">Processing…</p>}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={accept} disabled={loading || !token}>
            {loading ? "Accepting…" : "Retry"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
