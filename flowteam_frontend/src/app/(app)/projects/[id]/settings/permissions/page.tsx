"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { ProjectRole, ProjectRoleType } from "@/types/project";
import { SlimUser } from "@/types/messaging";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Trash2,
  UserPlus,
  Info,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useTeamStore } from "@/store/team";
import { cn } from "@/lib/utils";
import {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  PROJECT_ROLE_LABELS,
  TEAM_ROLE_LABELS,
  useTeamPermissions,
  type TeamRole,
} from "@/hooks/usePermissions";
import { GitHubSettingsCard } from "@/components/projects/GitHubSettingsCard";
import { GitLabSettingsCard } from "@/components/projects/GitLabSettingsCard";
import { BitbucketSettingsCard } from "@/components/projects/BitbucketSettingsCard";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";

const ROLE_BADGE_CLASS: Record<ProjectRoleType, string> = {
  project_admin: "bg-violet-100 text-violet-700 border-violet-200",
  editor: "bg-blue-100 text-blue-700 border-blue-200",
  commenter: "bg-amber-100 text-amber-700 border-amber-200",
  viewer: "bg-slate-100 text-slate-600 border-slate-200",
};

// Team role → implied project role (for the matrix display)
const TEAM_TO_PROJECT_ROLE: Record<TeamRole, ProjectRoleType> = {
  ceo: "project_admin",
  admin: "project_admin",
  manager: "editor",
  member: "editor",
  viewer: "viewer",
};

function RoleBadge({ role }: { role: ProjectRoleType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        ROLE_BADGE_CLASS[role]
      )}
    >
      {PROJECT_ROLE_LABELS[role]}
    </span>
  );
}

function CapabilityToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function MemberRoleRow({
  role,
  onUpdate,
  onRemove,
  canManage,
}: {
  role: ProjectRole;
  onUpdate: (id: string, patch: Partial<{ role: ProjectRoleType; capabilities: Record<string, boolean>; valid_until: string | null }>) => void;
  onRemove: (id: string) => void;
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localCaps, setLocalCaps] = useState<Record<string, boolean>>(role.effective_capabilities);
  const [validUntil, setValidUntil] = useState(role.valid_until ? role.valid_until.slice(0, 10) : "");
  const [dirty, setDirty] = useState(false);

  const handleCapChange = (cap: string, val: boolean) => {
    setLocalCaps((prev) => ({ ...prev, [cap]: val }));
    setDirty(true);
  };

  const handleRoleChange = (newRole: ProjectRoleType) => {
    onUpdate(role.id, { role: newRole });
  };

  const handleSaveCaps = () => {
    const overrides: Record<string, boolean> = {};
    for (const cap of ALL_CAPABILITIES) {
      overrides[cap] = !!localCaps[cap];
    }
    onUpdate(role.id, {
      capabilities: overrides,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    setDirty(false);
  };

  const isExpired = role.valid_until && new Date(role.valid_until) < new Date();

  return (
    <div className={cn("border-b border-border last:border-0", !role.is_active && "opacity-60")}>
      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 border border-border">
            <AvatarImage src={role.user.avatar || ""} />
            <AvatarFallback>{(role.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{role.user.full_name}</p>
              <RoleBadge role={role.role} />
              {!role.is_active && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" />
                  {isExpired ? "Expired" : "Not yet active"}
                </span>
              )}
            </div>
            {role.valid_until && (
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {new Date(role.valid_until).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                value={role.role}
                onChange={(e) => handleRoleChange(e.target.value as ProjectRoleType)}
              >
                {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRoleType[]).map((r) => (
                  <option key={r} value={r}>
                    {PROJECT_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(role.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border">
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Capability Overrides
              </p>
              {ALL_CAPABILITIES.map((cap) => (
                <CapabilityToggle
                  key={cap}
                  label={CAPABILITY_LABELS[cap]}
                  checked={!!localCaps[cap]}
                  onChange={(v) => handleCapChange(cap, v)}
                  disabled={!canManage}
                />
              ))}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Access Window
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Access expires on</label>
                  <input
                    type="date"
                    disabled={!canManage}
                    value={validUntil}
                    onChange={(e) => { setValidUntil(e.target.value); setDirty(true); }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Leave blank for permanent access.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Effective Permissions
                  </p>
                  <div className="space-y-1">
                    {ALL_CAPABILITIES.map((cap) => (
                      <div key={cap} className="flex items-center gap-2 text-xs">
                        {localCaps[cap] ? (
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={cn(!localCaps[cap] && "text-muted-foreground/50")}>
                          {CAPABILITY_LABELS[cap]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {canManage && dirty && (
            <div className="flex justify-end mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalCaps(role.effective_capabilities);
                  setValidUntil(role.valid_until ? role.valid_until.slice(0, 10) : "");
                  setDirty(false);
                }}
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSaveCaps}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PermissionsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [newMemberId, setNewMemberId] = useState("");
  const [newRole, setNewRole] = useState<ProjectRoleType>("editor");
  const [newValidUntil, setNewValidUntil] = useState("");
  const { activeTeamId, fetchTeams } = useTeamStore();
  const teamPerms = useTeamPermissions();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const { data: roles, isLoading: rolesLoading } = useQuery<ProjectRole[]>({
    queryKey: ["project-roles", id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/roles/`);
      return res.data.data;
    },
  });

  const { data: teamMembers } = useQuery<{ user: SlimUser }[]>({
    queryKey: ["team-members-active", activeTeamId],
    queryFn: async () => {
      const res = await api.get(`/teams/${activeTeamId}/members/`);
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ uid, patch }: { uid: string; patch: object }) => {
      return api.patch(`/projects/${id}/roles/${uid}/`, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-roles", id] });
      toast.success("Permissions updated");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Failed to update permissions");
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (uid: string) => {
      return api.delete(`/projects/${id}/roles/${uid}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-roles", id] });
      toast.success("Permission override removed");
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { user: newMemberId, role: newRole };
      if (newValidUntil) payload.valid_until = new Date(newValidUntil).toISOString();
      return api.post(`/projects/${id}/roles/`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-roles", id] });
      toast.success("Member added with override");
      setNewMemberId("");
      setNewValidUntil("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Failed to add override");
    },
  });

  const canManage = teamPerms.canManageTeam;

  // Members without an existing override (for the add dropdown)
  const existingUserIds = new Set(roles?.map((r) => r.user.id) ?? []);
  const availableMembers = teamMembers?.filter((m) => !existingUserIds.has(m.user.id)) ?? [];

  if (rolesLoading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id} />
      <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-tight">Project Permissions</h1>
        <p className="text-[13px] text-muted-foreground/70 mt-0.5">
          Fine-tune who can manage, edit, and view this project. Custom overrides always take
          precedence over team-wide roles.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GitHubSettingsCard projectId={String(id)} />
        <GitLabSettingsCard projectId={String(id)} />
        <BitbucketSettingsCard projectId={String(id)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Member overrides */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Member Overrides
              </CardTitle>
              <CardDescription>
                {roles?.length ?? 0} custom override{roles?.length !== 1 ? "s" : ""} set
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(roles?.length ?? 0) === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No custom overrides set. All team members use their default organizational roles.
                </div>
              ) : (
                roles?.map((role) => (
                  <MemberRoleRow
                    key={role.id}
                    role={role}
                    canManage={canManage}
                    onUpdate={(uid, patch) => updateRoleMutation.mutate({ uid, patch })}
                    onRemove={(uid) => removeRoleMutation.mutate(uid)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Add override */}
          {canManage && (
            <Card className="bg-primary text-primary-foreground border-none shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">Add Custom Override</h3>
                    <p className="text-sm text-primary-foreground/70 mt-0.5">
                      Give a team member specific access to this project.
                    </p>
                  </div>
                  <div className="shrink-0 p-3 bg-primary-foreground/10 rounded-xl border border-primary-foreground/20">
                    <UserPlus className="h-5 w-5" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <select
                    className="h-9 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-foreground/50 col-span-1"
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                  >
                    <option value="" disabled className="text-foreground">
                      Select member
                    </option>
                    {availableMembers.map((m) => (
                      <option key={m.user.id} value={m.user.id} className="text-foreground">
                        {m.user.full_name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as ProjectRoleType)}
                  >
                    {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRoleType[]).map((r) => (
                      <option key={r} value={r} className="text-foreground">
                        {PROJECT_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      placeholder="Expires (optional)"
                      value={newValidUntil}
                      onChange={(e) => setNewValidUntil(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground px-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <Button
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
                  disabled={!newMemberId || addRoleMutation.isPending}
                  onClick={() => addRoleMutation.mutate()}
                >
                  Apply Override
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Role descriptions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Role Descriptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRoleType[]).map(
                (role) => (
                  <div key={role}>
                    <div className="flex items-center gap-2 mb-1">
                      <RoleBadge role={role} />
                    </div>
                    <div className="space-y-0.5">
                      {ALL_CAPABILITIES.map((cap) => {
                        const granted = !!{
                          project_admin: true,
                          editor: ["can_view", "can_edit_tasks", "can_export", "can_comment"].includes(cap),
                          commenter: ["can_view", "can_comment"].includes(cap),
                          viewer: cap === "can_view",
                        }[role];
                        return (
                          <div key={cap} className="flex items-center gap-1.5 text-[11px]">
                            {granted ? (
                              <Check className="h-2.5 w-2.5 text-green-500 shrink-0" />
                            ) : (
                              <X className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                            )}
                            <span className={cn("leading-none", !granted && "text-muted-foreground/50")}>
                              {CAPABILITY_LABELS[cap]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Team role matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Team Role Defaults
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Without a custom override, team roles map to these project roles.
              </p>
              <div className="space-y-1.5">
                {(Object.entries(TEAM_ROLE_LABELS) as [TeamRole, string][]).map(([teamRole, label]) => (
                  <div key={teamRole} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{label}</span>
                    <RoleBadge role={TEAM_TO_PROJECT_ROLE[teamRole]} />
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Custom overrides always take precedence. Removing an override reverts the user
                  to their team-wide default.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
