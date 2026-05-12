"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, KeyRound, RefreshCcw, Copy, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type SetupResponse = { otpauth_uri: string; backup_codes: string[] };

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const safeUser = user.length <= 2 ? `${user[0] ?? ""}*` : `${user.slice(0, 2)}***`;
  return `${safeUser}@${domain}`;
}

export function TwoFactorCard() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const enabled = !!user?.two_factor_enabled;
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingEnable, setLoadingEnable] = useState(false);
  const [loadingDisable, setLoadingDisable] = useState(false);
  const [loadingRotate, setLoadingRotate] = useState(false);

  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [otpCode, setOtpCode] = useState("");

  const [disableOtp, setDisableOtp] = useState("");
  const [disableBackup, setDisableBackup] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const email = user?.email ?? "";
  const issuer = useMemo(() => "Cowrk", []);

  useEffect(() => {
    const run = async () => {
      if (!otpauthUri) {
        setQrDataUrl(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 200 });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl(null);
      }
    };
    run();
  }, [otpauthUri]);

  const startSetup = async () => {
    setLoadingSetup(true);
    setOtpCode("");
    setNewBackupCodes(null);
    try {
      const res = await api.post<ApiResponse<SetupResponse>>("/auth/2fa/setup/", {});
      const data = res.data?.data;
      if (!res.data?.success || !data?.otpauth_uri) throw new Error("Failed to start 2FA setup");
      setOtpauthUri(data.otpauth_uri);
      setBackupCodes(data.backup_codes ?? []);
      setSetupOpen(true);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to start 2FA setup"));
    } finally {
      setLoadingSetup(false);
    }
  };

  const enable2fa = async () => {
    const code = otpCode.trim().replace(/\s+/g, "");
    if (!code) return;
    setLoadingEnable(true);
    try {
      const res = await api.post("/auth/2fa/enable/", { otp_code: code });
      if (!res.data?.success) throw new Error(res.data?.error ?? "Failed to enable 2FA");
      toast.success("Two‑factor authentication enabled");
      setSetupOpen(false);
      setOtpauthUri(null);
      setQrDataUrl(null);
      setBackupCodes([]);
      // Refresh user state.
      await fetchMe();
    } catch (err) {
      toast.error(toErrorMessage(err, "Invalid code"));
    } finally {
      setLoadingEnable(false);
    }
  };

  const disable2fa = async () => {
    const code = disableOtp.trim().replace(/\s+/g, "");
    const backup = disableBackup.trim();
    if (!code && !backup) return;
    setLoadingDisable(true);
    try {
      const body: Record<string, string> = {};
      if (code) body.otp_code = code;
      if (backup) body.backup_code = backup;
      const res = await api.post("/auth/2fa/disable/", body);
      if (!res.data?.success) throw new Error(res.data?.error ?? "Failed to disable 2FA");
      toast.success("Two‑factor authentication disabled");
      setDisableOpen(false);
      setDisableOtp("");
      setDisableBackup("");
      // Update local state quickly, then refetch.
      if (user) setUser({ ...user, two_factor_enabled: false });
      await fetchMe();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to disable 2FA"));
    } finally {
      setLoadingDisable(false);
    }
  };

  const rotateBackupCodes = async () => {
    const code = otpCode.trim().replace(/\s+/g, "");
    if (!code) return;
    setLoadingRotate(true);
    try {
      const res = await api.post<ApiResponse<{ backup_codes: string[] }>>("/auth/2fa/backup-codes/rotate/", { otp_code: code });
      const next = res.data?.data?.backup_codes ?? [];
      if (!res.data?.success || next.length === 0) throw new Error("Failed to rotate backup codes");
      setNewBackupCodes(next);
      toast.success("Backup codes rotated");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to rotate backup codes"));
    } finally {
      setLoadingRotate(false);
    }
  };

  const copyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Two‑Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Protect your account with an authenticator app (TOTP) and one‑time backup codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Status</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? "2FA is enabled for your account." : "2FA is not enabled."}{" "}
                {email ? `(${maskEmail(email)})` : ""}
              </p>
            </div>
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
          </div>
          {!enabled ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                You’ll scan a QR code in your authenticator app and confirm a 6‑digit code.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Keep your backup codes safe. If you lose your authenticator device, backup codes are the fastest way back in.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          {!enabled ? (
            <Button onClick={startSetup} disabled={loadingSetup} className="gap-2">
              <KeyRound className="h-4 w-4" />
              {loadingSetup ? "Starting…" : "Set up 2FA"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setRotateOpen(true); setOtpCode(""); setNewBackupCodes(null); }} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Rotate backup codes
              </Button>
              <Button variant="destructive" onClick={() => setDisableOpen(true)}>
                Disable 2FA
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Setup dialog */}
      <Dialog open={setupOpen} onOpenChange={(o) => { setSetupOpen(o); if (!o) { setOtpauthUri(null); setQrDataUrl(null); setBackupCodes([]); setOtpCode(""); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Set up two‑factor authentication</DialogTitle>
            <DialogDescription>Scan the QR code with your authenticator app, then confirm the 6‑digit code.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-center min-h-[220px]">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt={`${issuer} 2FA QR`} className="h-[200px] w-[200px]" />
              ) : (
                <div className="text-xs text-muted-foreground">QR code unavailable</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Backup codes</p>
                <p className="text-xs text-muted-foreground">
                  Save these codes somewhere safe. Each code can be used once if you lose access to your authenticator.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <pre className="text-[12px] leading-5 whitespace-pre-wrap">{backupCodes.join("\n")}</pre>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => copyCodes(backupCodes)}>
                  <Copy className="h-4 w-4" /> Copy codes
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp">6‑digit code</Label>
            <Input
              id="otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button onClick={enable2fa} disabled={loadingEnable || otpCode.trim().length < 6}>
              {loadingEnable ? "Enabling…" : "Enable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={(o) => { setDisableOpen(o); if (!o) { setDisableOtp(""); setDisableBackup(""); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Disable 2FA</DialogTitle>
            <DialogDescription>Confirm with an authenticator code or a backup code.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="disableOtp">Authenticator code (optional)</Label>
              <Input id="disableOtp" value={disableOtp} onChange={(e) => setDisableOtp(e.target.value)} inputMode="numeric" placeholder="123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disableBackup">Backup code (optional)</Label>
              <Input id="disableBackup" value={disableBackup} onChange={(e) => setDisableBackup(e.target.value)} placeholder="ABCD-EF12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={disable2fa} disabled={loadingDisable || (!disableOtp.trim() && !disableBackup.trim())}>
              {loadingDisable ? "Disabling…" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate backup codes dialog */}
      <Dialog open={rotateOpen} onOpenChange={(o) => { setRotateOpen(o); if (!o) { setOtpCode(""); setNewBackupCodes(null); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Rotate backup codes</DialogTitle>
            <DialogDescription>Enter a 6‑digit authenticator code to generate new backup codes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rotateOtp">6‑digit code</Label>
            <Input id="rotateOtp" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" placeholder="123456" />
          </div>
          {newBackupCodes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">New backup codes</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => copyCodes(newBackupCodes)}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <pre className="text-[12px] leading-5 whitespace-pre-wrap">{newBackupCodes.join("\n")}</pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>Close</Button>
            <Button onClick={rotateBackupCodes} disabled={loadingRotate || otpCode.trim().length < 6}>
              {loadingRotate ? "Rotating…" : "Generate new codes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
