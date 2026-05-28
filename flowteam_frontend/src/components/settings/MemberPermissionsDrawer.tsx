"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Crown, RefreshCw, RotateCcw, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ApiResponse, CustomRole, MemberPermissions, TeamMember } from "@/types";

// ── Capability metadata (must match RolesTab) ────────────────────────────────

const ALL_CAPS: { key: string; label: string; description: string }[] = [
  { key: "can_manage_team",         label: "Manage team settings",    description: "Update team name, avatar, and config" },
  { key: "can_invite_members",      label: "Invite members",          description: "Send invites and add people to the team" },
  { key: "can_change_roles",        label: "Change member roles",     description: "Assign or change roles for any member" },
  { key: "can_remove_members",      label: "Remove members",          description: "Kick members from the team" },
  { key: "can_delete_team",         label: "Delete team",             description: "Permanently delete the entire team" },
  { key: "can_view_audit_log",      label: "View audit log",          description: "See all team activity and changes" },
  { key: "can_create_project",      label: "Create projects",         description: "Start new projects in this team" },
  { key: "can_manage_billing",      label: "Manage billing",          description: "View and update plan and billing" },
  { key: "can_access_reports",      label: "Access reports",          description: "View analytics and reporting data" },
  { key: "can_manage_integrations", label: "Manage integrations",     description: "Connect GitHub, Slack, calendars, etc." },
];

// ── Override state per capability: null = inherited, true = granted, false = revoked
type OverrideState = true | false | null;

function overrideIcon(state: OverrideState, roleDefault: boolean) {
  if (state === true)  return { icon: Check, color: "text-emerald-500", label: "Granted" };
  if (state === false) return { icon: X,     color: "text-destructive",  label: "Revoked" };
  if (roleDefault)     return { icon: Check, color: "text-muted-foreground/60", label: "Inherited (allowed)" };
  return               { icon: X,     color: "text-muted-foreground/30", label: "Inherited (denied)" };
}

// ── Role selector ─────────────────────────────────────────────────────────────

interface RoleSelectorProps {
  roles: CustomRole[];
  currentRoleId: string | null;
  assignableIds: string[];
  onChange: (roleId: string) => void;
  disabled: boolean;
}

function RoleSelector({ roles, currentRoleId, assignableIds, onChange, disabled }: RoleSelectorProps) {
  const assignable = roles.filter((r) => assignableIds.includes(r.id));
  if (assignable.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Role</p>
      <Select value={currentRoleId ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="text-[13px] h-9">
          <SelectValue placeholder="Select role…" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => {
            const assignable = assignableIds.includes(role.id);
            return (
              <SelectItem
                key={role.id}
                value={role.id}
                disabled={!assignable}
                className="text-[13px]"
              >
                <div className="flex items-center gap-2">
                  {role.is_owner_role && <Crown className="h-3 w-3 text-violet-500" />}
                  {role.name}
                  {!assignable && (
                    <span className="text-[10px] text-muted-foreground ml-1">(not assignable)</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MemberPermissionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  teamId: string;
  allRoles: CustomRole[];
  assignableCustomRoleIds: string[];
  isOwnerActor: boolean;
  onMemberUpdated: (updated: TeamMember) => void;
}

export function MemberPermissionsDrawer({
  open,
  onOpenChange,
  member,
  teamId,
  allRoles,
  assignableCustomRoleIds,
  isOwnerActor,
  onMemberUpdated,
}: MemberPermissionsDrawerProps) {
  const [perms, setPerms] = useState<MemberPermissions | null>(null);
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>({});
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const load = useCallback(async () => {
    if (!member) return;
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<MemberPermissions>>(
        `/teams/${teamId}/members/${member.user.id}/permissions/`,
      );
      if (res.data.success) {
        setPerms(res.data.data);
        // Convert stored overrides (true/false) to OverrideState (add nulls for unset)
        const raw = res.data.data.overrides ?? {};
        const mapped: Record<string, OverrideState> = {};
        for (const cap of ALL_CAPS) {
          mapped[cap.key] = cap.key in raw ? (raw[cap.key] as boolean) : null;
        }
        setOverrides(mapped);
        setPendingRoleId(member.custom_role?.id ?? null);
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to load permissions"));
    } finally {
      setLoading(false);
    }
  }, [member, teamId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const cycleOverride = (key: string, roleDefault: boolean) => {
    setOverrides((prev) => {
      const cur = prev[key];
      // Cycle: inherited → grant → revoke → inherited
      if (cur === null)  return { ...prev, [key]: true };
      if (cur === true)  return { ...prev, [key]: false };
      return              { ...prev, [key]: null };
    });
  };

  const handleSaveOverrides = async () => {
    if (!member) return;
    const grant: string[] = [];
    const revoke: string[] = [];
    for (const [key, state] of Object.entries(overrides)) {
      if (state === true)  grant.push(key);
      if (state === false) revoke.push(key);
    }
    try {
      setSaving(true);
      const res = await api.patch<ApiResponse<{ overrides: Record<string, boolean>; resolved: Record<string, boolean> }>>(
        `/teams/${teamId}/members/${member.user.id}/permissions/`,
        { grant, revoke },
      );
      if (res.data.success) {
        setPerms((prev) => prev ? { ...prev, overrides: res.data.data.overrides, resolved: res.data.data.resolved } : prev);
        toast.success("Permissions updated");
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save permissions"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!member) return;
    try {
      setResetting(true);
      await api.delete(`/teams/${teamId}/members/${member.user.id}/permissions/`);
      const mapped: Record<string, OverrideState> = {};
      for (const cap of ALL_CAPS) { mapped[cap.key] = null; }
      setOverrides(mapped);
      setPerms((prev) => prev ? { ...prev, overrides: {} } : prev);
      toast.success("Permissions reset to role defaults");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to reset permissions"));
    } finally {
      setResetting(false);
    }
  };

  const handleRoleChange = async (roleId: string) => {
    if (!member) return;
    setPendingRoleId(roleId);
    try {
      setChangingRole(true);
      const res = await api.patch<ApiResponse<TeamMember>>(
        `/teams/${teamId}/members/${member.user.id}/role/`,
        { custom_role_id: roleId },
      );
      if (res.data.success) {
        onMemberUpdated(res.data.data);
        toast.success(`Role changed to ${allRoles.find((r) => r.id === roleId)?.name ?? "new role"}`);
        void load();
      }
    } catch (err) {
      setPendingRoleId(member.custom_role?.id ?? null);
      toast.error(toErrorMessage(err, "Failed to change role"));
    } finally {
      setChangingRole(false);
    }
  };

  const overrideCount = Object.values(overrides).filter((v) => v !== null).length;
  const hasChanges = overrideCount > 0 || Object.entries(overrides).some(([k, v]) => {
    const stored = perms?.overrides?.[k];
    return (stored === undefined ? null : stored) !== v;
  });

  const initials = (member?.user.full_name?.[0] ?? "?").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && !resetting && onOpenChange(o)}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Member Permissions
          </DialogTitle>
          <DialogDescription>
            Grant or revoke individual capabilities on top of this member&apos;s role.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="space-y-4">
            {/* Member identity */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={member.user.avatar_url ?? ""} />
                <AvatarFallback className="text-[12px] font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold truncate">{member.user.full_name}</p>
                <p className="text-[11.5px] text-muted-foreground truncate">{member.user.email}</p>
              </div>
              {member.custom_role?.is_owner_role && (
                <Badge className="text-[10px] bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                  <Crown className="h-2.5 w-2.5 mr-1" />Owner
                </Badge>
              )}
            </div>

            {/* Role selector */}
            <RoleSelector
              roles={allRoles}
              currentRoleId={pendingRoleId}
              assignableIds={assignableCustomRoleIds}
              onChange={handleRoleChange}
              disabled={changingRole || loading}
            />

            {/* Capability overrides */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[12.5px] font-semibold">
                    Capability Overrides
                    {overrideCount > 0 && (
                      <span className="ml-2 text-[11px] text-primary font-normal">
                        {overrideCount} override{overrideCount !== 1 ? "s" : ""} active
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    Click a row to cycle: inherited → granted → revoked → inherited
                  </p>
                </div>
                {overrideCount > 0 && (
                  <Button
                    variant="ghost" size="sm"
                    className="gap-1.5 text-[11.5px] h-7 text-muted-foreground"
                    onClick={handleReset}
                    disabled={resetting || saving}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {resetting ? "Resetting…" : "Reset all"}
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {ALL_CAPS.map(({ key, label, description }) => {
                    const roleDefault = !!(perms?.role_capabilities?.[key]);
                    const override = overrides[key] ?? null;
                    const { icon: Icon, color, label: stateLabel } = overrideIcon(override, roleDefault);
                    const isOverridden = override !== null;

                    return (
                      <button
                        key={key}
                        onClick={() => cycleOverride(key, roleDefault)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                          isOverridden && override === true
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                            : isOverridden && override === false
                            ? "border-destructive/20 bg-destructive/5"
                            : "border-border bg-card hover:bg-muted/30",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-medium truncate">{label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{description}</p>
                        </div>
                        <span className={cn(
                          "shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full",
                          isOverridden && override === true
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : isOverridden && override === false
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {stateLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11.5px] text-muted-foreground">
                Changes take effect immediately on next API call.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveOverrides}
                  disabled={saving || loading}
                  className="gap-1.5"
                >
                  {saving
                    ? <><RefreshCw className="h-3 w-3 animate-spin" />Saving…</>
                    : "Save Overrides"
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
