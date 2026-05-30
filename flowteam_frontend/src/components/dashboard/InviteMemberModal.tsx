"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

type Role = "manager" | "member" | "viewer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  canInviteManager?: boolean;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "manager",  label: "Manager",  description: "Can create projects and manage team workload" },
  { value: "member",   label: "Employee",  description: "Can view and work on tasks in assigned projects" },
  { value: "viewer",   label: "Viewer",    description: "Read-only access to projects and activity" },
];

export function InviteMemberModal({ open, onOpenChange, teamId, canInviteManager = false, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [loading, setLoading] = useState(false);

  const reset = () => { setEmail(""); setRole("member"); };

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) { toast.error("Please enter a valid email address"); return; }

    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>(`/teams/${teamId}/invite/`, {
        email: trimmed,
        role,
      });
      toast.success(`Invitation sent to ${trimmed}`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const raw = err?.response?.data?.error ?? err?.response?.data?.detail;
      const msg =
        typeof raw === "string"
          ? raw
          : typeof raw?.detail === "string"
            ? raw.detail
            : raw
              ? JSON.stringify(raw)
              : "Failed to send invitation";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = canInviteManager ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== "manager");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus size={13} className="text-primary" />
            </div>
            Invite team member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold">Email address <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="pl-8 text-[13px]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") void handleInvite(); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-semibold">Role</Label>
            <div className="space-y-2">
              {availableRoles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    role === r.value
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-border-strong hover:bg-muted/30"
                  }`}
                >
                  <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${
                    role === r.value ? "border-primary bg-primary" : "border-border"
                  }`} />
                  <div>
                    <p className={`text-[12.5px] font-semibold ${role === r.value ? "text-primary" : "text-foreground"}`}>{r.label}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground/70">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button size="sm" onClick={handleInvite} disabled={loading || !email.trim()} className="gap-1.5">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
