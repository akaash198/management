"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toErrorMessage } from "@/lib/errorMessage";
import { Building2, CheckCircle2, Loader2, Mail } from "lucide-react";

type InvitePreview = {
  email: string;
  role: string;
  company_name: string;
  company_slug: string;
  invite_id: string;
};

type AcceptResult = {
  message: string;
  company_id: string;
  company_name: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

export default function CompanyInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token;
  const { user } = useAuthStore();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [stage, setStage] = useState<"loading" | "preview" | "accepting" | "done" | "register_first">("loading");
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [result, setResult] = useState<AcceptResult | null>(null);

  // ── Register form (for unauthenticated users) ──
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // ── Load invite preview ──
  useEffect(() => {
    if (!token) return;
    api.get<ApiResponse<InvitePreview>>(`/companies/invites/${token}/accept/`)
      .then(res => {
        if (res.data.success) {
          setPreview(res.data.data);
          setStage("preview");
        } else {
          setPreviewError(String(res.data.error ?? "Invalid invite link."));
          setStage("preview");
        }
      })
      .catch(err => {
        setPreviewError(toErrorMessage(err?.response?.data?.error ?? err, "This invite link is invalid or has expired."));
        setStage("preview");
      });
  }, [token]);

  // ── Accept the invite (POST) ──
  const acceptInvite = async () => {
    if (!token) return;
    setStage("accepting");
    setAcceptError(null);
    try {
      const res = await api.post<ApiResponse<AcceptResult>>(`/companies/invites/${token}/accept/`);
      if (res.data.success) {
        setResult(res.data.data);
        setStage("done");
      } else {
        const errData = res.data as any;
        // Backend returns 202 + error="account_required" when user doesn't exist yet
        if (errData?.data?.redirect_to === "register") {
          setStage("register_first");
        } else {
          setAcceptError(String(res.data.error ?? "Failed to accept invite."));
          setStage("preview");
        }
      }
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.data?.redirect_to === "register") {
        setStage("register_first");
        return;
      }
      setAcceptError(toErrorMessage(errData?.error ?? errData ?? err, "Failed to accept invite."));
      setStage("preview");
    }
  };

  // ── Register then accept ──
  const registerAndAccept = async () => {
    if (!preview || !token) return;
    setRegLoading(true);
    setRegError(null);
    try {
      // 1. Register
      await api.post("/auth/register/", {
        email: preview.email,
        full_name: regFullName.trim() || preview.email.split("@")[0],
        password: regPassword,
      });
      // 2. Login
      const loginRes = await api.post<ApiResponse<{ access: string; refresh: string }>>("/auth/login/", {
        email: preview.email,
        password: regPassword,
      });
      const { access, refresh } = loginRes.data.data;
      // Store tokens so api interceptor picks them up on the next request.
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
      }
      // 3. Accept invite (now authenticated)
      const acceptRes = await api.post<ApiResponse<AcceptResult>>(`/companies/invites/${token}/accept/`);
      if (acceptRes.data.success) {
        setResult(acceptRes.data.data);
        setStage("done");
        // Reload to hydrate auth state
        setTimeout(() => router.push("/company-admin/dashboard"), 1800);
      } else {
        setRegError(String(acceptRes.data.error ?? "Failed to join company."));
      }
    } catch (err: any) {
      setRegError(toErrorMessage(err?.response?.data?.error ?? err?.response?.data ?? err, "Registration failed."));
    } finally {
      setRegLoading(false);
    }
  };

  // ── After accepting (authenticated) ──
  useEffect(() => {
    if (stage === "done" && result) {
      const timer = setTimeout(() => router.push("/company-admin/dashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [stage, result, router]);

  // ── Auto-accept if already logged in + on preview stage ──
  // (Don't auto-accept — show the confirmation card so user can see context)

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* ── Logo ── */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-[12px] tracking-tighter">
              CW
            </span>
            <span className="text-lg font-bold tracking-tight">cowrk</span>
          </div>
        </div>

        {/* ── Loading ── */}
        {stage === "loading" && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading invite…</p>
            </CardContent>
          </Card>
        )}

        {/* ── Preview / Accept ── */}
        {stage === "preview" && (
          <Card>
            <CardHeader className="text-center pb-4">
              {previewError ? (
                <>
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <Mail size={22} className="text-destructive" />
                  </div>
                  <CardTitle className="text-xl">Invalid invite</CardTitle>
                  <CardDescription>{previewError}</CardDescription>
                </>
              ) : preview ? (
                <>
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Building2 size={22} className="text-primary" />
                  </div>
                  <CardTitle className="text-xl">You're invited!</CardTitle>
                  <CardDescription>
                    Join <span className="font-semibold text-foreground">{preview.company_name}</span> as{" "}
                    <span className="font-semibold text-foreground">{ROLE_LABELS[preview.role] ?? preview.role}</span>
                  </CardDescription>
                </>
              ) : null}
            </CardHeader>

            {preview && !previewError && (
              <>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Company</span>
                      <span className="font-medium">{preview.company_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your role</span>
                      <Badge variant="secondary" className="capitalize">{ROLE_LABELS[preview.role] ?? preview.role}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Invited email</span>
                      <span className="font-medium text-xs">{preview.email}</span>
                    </div>
                  </div>
                  {acceptError && <p className="text-sm text-destructive text-center">{acceptError}</p>}
                  {user && user.email.toLowerCase() !== preview.email.toLowerCase() && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                      You're logged in as <strong>{user.email}</strong> but this invite is for <strong>{preview.email}</strong>. Log out first or use a different account.
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    onClick={acceptInvite}
                    disabled={!!(user && user.email.toLowerCase() !== preview.email.toLowerCase())}
                  >
                    <Building2 size={16} />
                    {user ? "Accept & join company" : "Accept invite"}
                  </Button>
                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      Already have an account?{" "}
                      <Link href="/login" className="text-primary hover:underline">Sign in first</Link>
                    </p>
                  )}
                </CardFooter>
              </>
            )}
          </Card>
        )}

        {/* ── Accepting spinner ── */}
        {stage === "accepting" && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Joining {preview?.company_name}…</p>
            </CardContent>
          </Card>
        )}

        {/* ── Register first ── */}
        {stage === "register_first" && preview && (
          <Card>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 size={22} className="text-primary" />
              </div>
              <CardTitle className="text-xl">Create your account</CardTitle>
              <CardDescription>
                Set up your account to join <span className="font-semibold text-foreground">{preview.company_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Joining as</p>
                <p className="text-sm font-medium">{preview.email}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Smith"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>
              {regError && <p className="text-sm text-destructive">{regError}</p>}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                onClick={registerAndAccept}
                disabled={regLoading || !regPassword}
              >
                {regLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                  : "Create account & join"
                }
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ── Done ── */}
        {stage === "done" && result && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">You're in!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You've joined <span className="font-medium text-foreground">{result.company_name}</span> as{" "}
                  <span className="font-medium text-foreground">{ROLE_LABELS[result.role] ?? result.role}</span>.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Redirecting to your dashboard…</p>
              <Button variant="outline" size="sm" onClick={() => router.push("/company-admin/dashboard")}>
                Go now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
