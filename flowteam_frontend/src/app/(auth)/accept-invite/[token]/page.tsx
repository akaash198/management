"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/lib/errorMessage";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse } from "@/types";

type InvitePreview = {
  id: string;
  email: string;
  role: string;
  team: { id: string; name: string };
  invited_by: { id: string; email: string; full_name: string } | null;
  is_accepted: boolean;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const { user } = useAuthStore();

  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!token) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<InvitePreview>>(`/teams/invites/${token}/`);
      if (res.data?.success) setPreview(res.data.data ?? null);
      else setError(toErrorMessage(res.data?.error ?? res.data, "This invite link is invalid or has expired."));
    } catch (err: any) {
      setError(toErrorMessage(err?.response?.data?.error ?? err?.response?.data ?? err, "This invite link is invalid or has expired."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await api.post(`/teams/invites/${token}/accept/`);
      if (res.data?.success) {
        setSuccess("Invite accepted. Redirecting…");
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setError(toErrorMessage(res.data?.error ?? res.data, "Failed to accept invite."));
      }
    } catch (err: any) {
      setError(toErrorMessage(err?.response?.data?.error ?? err?.response?.data ?? err, "Failed to accept invite."));
    } finally {
      setAccepting(false);
    }
  };

  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const inviteEmail = (preview?.email || "").trim();
  const userEmail = (user?.email || "").trim();
  const emailMatches = !!inviteEmail && !!userEmail && inviteEmail.toLowerCase() === userEmail.toLowerCase();
  const redirectPath = token ? `/accept-invite/${token}` : "/accept-invite";
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ""}`;
  const registerHref = `/register?redirect=${encodeURIComponent(redirectPath)}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ""}`;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Accept invite</CardTitle>
          <CardDescription className="text-center">
            {preview?.team?.name ? <>Join <strong>{preview.team.name}</strong>.</> : "Review your invite."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive text-center">{String(error)}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}
          {!error && !success && previewLoading && (
            <p className="text-sm text-muted-foreground text-center">Loading invite…</p>
          )}

          {!error && !success && !previewLoading && preview && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-center">
                Invited as <strong className="text-foreground">{preview.role}</strong> for{" "}
                <strong className="text-foreground">{preview.email}</strong>.
              </p>
              {!user && (
                <p className="text-center">
                  Please sign in or create an account to accept this invite.
                </p>
              )}
              {user && !emailMatches && (
                <p className="text-center text-destructive">
                  You’re signed in as <strong>{user.email}</strong>, but this invite is for{" "}
                  <strong>{preview.email}</strong>.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!preview && (
            <Button onClick={loadPreview} disabled={previewLoading || !token}>
              {previewLoading ? "Loading…" : "Retry"}
            </Button>
          )}

          {preview && !success && (
            <div className="flex gap-2">
              {!user ? (
                <>
                  <Button asChild variant="secondary">
                    <Link href={loginHref}>Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href={registerHref}>Create account</Link>
                  </Button>
                </>
              ) : (
                <Button onClick={accept} disabled={accepting || !emailMatches}>
                  {accepting ? "Accepting…" : "Accept invite"}
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

