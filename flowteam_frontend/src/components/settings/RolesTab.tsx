"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X, Crown, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ApiResponse, CustomRole } from "@/types";

// ── Capability metadata ──────────────────────────────────────────────────────

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

const EMPTY_CAPS: Record<string, boolean> = Object.fromEntries(ALL_CAPS.map((c) => [c.key, false]));

// ── Helpers ──────────────────────────────────────────────────────────────────

function capCount(caps: Record<string, boolean>): number {
  return Object.values(caps).filter(Boolean).length;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CapabilityBar({ count, total }: { count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100 ? "bg-violet-500" : pct >= 50 ? "bg-primary" : "bg-primary/50",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">{count}/{total}</span>
    </div>
  );
}

interface RoleFormProps {
  initial?: Partial<CustomRole>;
  onSave: (data: { name: string; level: number; is_owner_role: boolean; capabilities: Record<string, boolean> }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isOwnerActor: boolean;
}

function RoleForm({ initial, onSave, onCancel, saving, isOwnerActor }: RoleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState(initial?.level ?? 50);
  const [isOwner, setIsOwner] = useState(initial?.is_owner_role ?? false);
  const [caps, setCaps] = useState<Record<string, boolean>>(
    initial?.capabilities ? { ...EMPTY_CAPS, ...initial.capabilities } : { ...EMPTY_CAPS },
  );

  const toggleCap = (key: string) => setCaps((prev) => ({ ...prev, [key]: !prev[key] }));
  const setAll = (val: boolean) => setCaps(Object.fromEntries(ALL_CAPS.map((c) => [c.key, val])));

  const count = capCount(caps);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-[12.5px]">Role name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lead, Contractor"
            className="text-[13px]"
            maxLength={64}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-[12.5px]">
            Authority level
            <span className="ml-1 text-muted-foreground font-normal">(0 = highest, 100 = lowest)</span>
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-8 text-center text-[13px] font-semibold tabular-nums">{level}</span>
          </div>
        </div>
      </div>

      {isOwnerActor && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-3 py-2.5">
          <button
            role="switch"
            aria-checked={isOwner}
            onClick={() => setIsOwner((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              isOwner ? "bg-violet-500" : "bg-input",
            )}
          >
            <span className={cn(
              "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
              isOwner ? "translate-x-4" : "translate-x-0",
            )} />
          </button>
          <div>
            <p className="text-[12.5px] font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />Owner role
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Members with this role can manage all other roles and cannot be restricted.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[12.5px]">Capabilities <span className="text-muted-foreground font-normal">({count}/{ALL_CAPS.length})</span></Label>
          <div className="flex gap-2">
            <button onClick={() => setAll(true)} className="text-[11px] text-primary hover:underline">All</button>
            <span className="text-muted-foreground/40">·</span>
            <button onClick={() => setAll(false)} className="text-[11px] text-muted-foreground hover:underline">None</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {ALL_CAPS.map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => toggleCap(key)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                caps[key]
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "bg-muted/30 border-border hover:bg-muted/60",
              )}
            >
              <div className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                caps[key] ? "bg-emerald-500 border-emerald-500" : "border-border bg-background",
              )}>
                {caps[key] && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <div>
                <p className={cn("text-[12.5px] font-medium", caps[key] ? "text-emerald-800 dark:text-emerald-300" : "text-foreground")}>
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" disabled={saving || !name.trim()} onClick={() => onSave({ name, level, is_owner_role: isOwner, capabilities: caps })}>
          {saving ? "Saving…" : "Save Role"}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RolesTabProps {
  teamId: string;
  isOwnerActor: boolean;
  isAdminActor: boolean;
}

export function RolesTab({ teamId, isOwnerActor, isAdminActor }: RolesTabProps) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<CustomRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<CustomRole[]>>(`/teams/${teamId}/roles/`);
      if (res.data.success) setRoles(res.data.data ?? []);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to load roles"));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (data: { name: string; level: number; is_owner_role: boolean; capabilities: Record<string, boolean> }) => {
    try {
      setSaving(true);
      const res = await api.post<ApiResponse<CustomRole>>(`/teams/${teamId}/roles/`, data);
      if (res.data.success) {
        setRoles((prev) => [...prev, res.data.data].sort((a, b) => a.level - b.level));
        setCreateOpen(false);
        toast.success(`Role "${data.name}" created`);
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to create role"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: { name: string; level: number; is_owner_role: boolean; capabilities: Record<string, boolean> }) => {
    if (!editTarget) return;
    try {
      setSaving(true);
      const res = await api.patch<ApiResponse<CustomRole>>(`/teams/${teamId}/roles/${editTarget.id}/`, data);
      if (res.data.success) {
        setRoles((prev) => prev.map((r) => r.id === editTarget.id ? res.data.data : r).sort((a, b) => a.level - b.level));
        setEditTarget(null);
        toast.success(`Role "${data.name}" updated`);
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update role"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/teams/${teamId}/roles/${deleteTarget.id}/`);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(`Role "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to delete role"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold">Roles & Capabilities</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {roles.length} role{roles.length !== 1 ? "s" : ""} · Define what each role can do
          </p>
        </div>
        {isAdminActor && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />New Role
          </Button>
        )}
      </div>

      {/* Role list */}
      <div className="space-y-2">
        {roles.map((role) => {
          const count = capCount(role.capabilities);
          const expanded = expandedId === role.id;
          return (
            <div
              key={role.id}
              className={cn(
                "rounded-xl border bg-card transition-all",
                role.is_owner_role
                  ? "border-violet-200 dark:border-violet-800"
                  : "border-border",
              )}
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold",
                  role.is_owner_role
                    ? "bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300"
                    : "bg-muted border-border text-muted-foreground",
                )}>
                  {role.is_owner_role ? <Crown className="h-4 w-4" /> : role.level}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-semibold">{role.name}</span>
                    {role.is_owner_role && (
                      <Badge className="text-[10px] py-0 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                        Owner
                      </Badge>
                    )}
                    {role.is_system && (
                      <Badge variant="outline" className="text-[10px] py-0">System</Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {role.member_count} member{role.member_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 max-w-[200px]">
                    <CapabilityBar count={count} total={ALL_CAPS.length} />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isAdminActor && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditTarget(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isOwnerActor && !role.is_owner_role && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(role)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setExpandedId(expanded ? null : role.id)}
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Expanded capability grid */}
              {expanded && (
                <div className="border-t border-border/60 px-4 py-3">
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {ALL_CAPS.map(({ key, label }) => {
                      const allowed = !!role.capabilities[key];
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px]",
                            allowed
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "bg-muted/30 text-muted-foreground",
                          )}
                        >
                          {allowed
                            ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                            : <X className="h-3 w-3 shrink-0 text-muted-foreground/30" />}
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !saving && setCreateOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />Create New Role
            </DialogTitle>
            <DialogDescription>
              Define a custom role with specific capabilities for your team.
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            onSave={handleCreate}
            onCancel={() => setCreateOpen(false)}
            saving={saving}
            isOwnerActor={isOwnerActor}
          />
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !saving && !o && setEditTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />Edit Role — {editTarget?.name}
            </DialogTitle>
            <DialogDescription>
              {editTarget?.is_system
                ? "System roles can have their capabilities and level changed but cannot be renamed."
                : "Update the name, authority level, and capabilities for this role."}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <RoleForm
              initial={editTarget}
              onSave={handleEdit}
              onCancel={() => setEditTarget(null)}
              saving={saving}
              isOwnerActor={isOwnerActor}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !deleting && !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />Delete Role
            </DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>?
              {deleteTarget && deleteTarget.member_count > 0 && (
                <span className="block mt-1 text-destructive font-medium">
                  This role has {deleteTarget.member_count} member(s). Reassign them first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive" size="sm"
              disabled={deleting || (deleteTarget?.member_count ?? 0) > 0}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
