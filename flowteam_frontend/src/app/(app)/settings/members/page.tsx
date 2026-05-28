"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Save,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  ArrowLeft,
} from "lucide-react";

import { MemberPermissionsSheet } from "@/components/settings/MemberPermissionsSheet";
import type { PermissionsJson } from "@/components/settings/MemberPermissionsSheet";
import api from "@/lib/api";
import type { ApiResponse, Team, TeamCapabilities, TeamMember } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { useTeamPermissions } from "@/hooks/usePermissions";
import Link from "next/link";

type Role = "ceo" | "admin" | "manager" | "member" | "viewer";

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  member: "Employee",
  viewer: "Viewer",
};

export default function SettingsMembersPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const { fetchTeams } = useTeamStore();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCaps, setTeamCaps] = useState<TeamCapabilities | null>(null);
  const teamPerms = useTeamPermissions(activeTeam);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);

  const [changeRoleTarget, setChangeRoleTarget] = useState<TeamMember | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<Role>("member");
  const [savingRole, setSavingRole] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const [permTarget, setPermTarget] = useState<TeamMember | null>(null);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const load = async () => {
      try {
        const teamsRes = await api.get<ApiResponse<Team[]>>("/teams/");
        if (!teamsRes.data.success) return;
        const [team] = teamsRes.data.data ?? [];
        if (!team) return;
        setActiveTeam(team);

        const membersRes = await api.get<ApiResponse<TeamMember[]>>(`/teams/${team.id}/members/`);
        if (membersRes.data.success) setMembers(membersRes.data.data ?? []);
      } catch (err) {
        console.error(err);
        toast.error(toErrorMessage(err, "Failed to load team data"));
      }
    };
    void load();
  }, [fetchTeams]);

  useEffect(() => {
    const fetchCaps = async () => {
      if (!activeTeam) { setTeamCaps(null); return; }
      try {
        const capsRes = await api.get<ApiResponse<TeamCapabilities>>(`/teams/${activeTeam.id}/capabilities/`);
        if (capsRes.data.success) setTeamCaps(capsRes.data.data);
      } catch {
        setTeamCaps(null);
      }
    };
    void fetchCaps();
  }, [activeTeam]);

  useEffect(() => {
    if (searchParams.get("action") === "invite" && activeTeam) {
      setInviteOpen(true);
    }
  }, [searchParams, activeTeam]);

  const isCEO = !!(teamCaps?.role ? teamCaps.role === "ceo" : teamPerms.isCEO);
  const canManageTeamSettings = teamCaps?.can_manage_team ?? teamPerms.canManageTeam;
  const canInviteMembers = teamCaps?.can_invite_members ?? teamPerms.canInviteMembers;

  const inviteRoleOptions = useMemo(() => {
    if (teamCaps?.assignable_invite_roles?.length) return teamCaps.assignable_invite_roles as Role[];
    if (teamPerms.isCEO || teamPerms.isSuperAdmin) return ["ceo", "admin", "manager", "member", "viewer"] as Role[];
    if (teamPerms.isAdmin) return ["admin", "manager", "member", "viewer"] as Role[];
    if (teamPerms.isManager) return ["member", "viewer"] as Role[];
    return [] as Role[];
  }, [teamCaps, teamPerms]);

  const changeRoleOptions: Role[] = teamPerms.isCEO || teamPerms.isSuperAdmin
    ? ["ceo", "admin", "manager", "member", "viewer"]
    : ["admin", "manager", "member", "viewer"];

  const handleInvite = async () => {
    if (!activeTeam || !inviteEmail.trim()) return;
    try {
      setInviting(true);
      await api.post(`/teams/${activeTeam.id}/invite/`, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to send invite"));
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!activeTeam || !changeRoleTarget) return;
    try {
      setSavingRole(true);
      await api.patch(`/teams/${activeTeam.id}/members/${changeRoleTarget.user.id}/`, { role: changeRoleValue });
      setMembers((prev) =>
        prev.map((m) => (m.id === changeRoleTarget.id ? { ...m, role: changeRoleValue } : m))
      );
      toast.success(`Role updated to ${changeRoleValue}`);
      setChangeRoleTarget(null);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update role"));
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!activeTeam || !removeTarget) return;
    try {
      setRemoving(true);
      await api.delete(`/teams/${activeTeam.id}/members/${removeTarget.user.id}/`);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      toast.success(`${removeTarget.user.full_name} removed from team`);
      setRemoveTarget(null);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to remove member"));
    } finally {
      setRemoving(false);
    }
  };

  const handleSavePermissions = async (userId: string, permissions: PermissionsJson) => {
    if (!activeTeam) return;
    await api.patch(`/teams/${activeTeam.id}/members/${userId}/`, { permissions_json: permissions });
    setMembers((prev) =>
      prev.map((m) =>
        m.user.id === userId
          ? { ...m, permissions_json: permissions as unknown as TeamMember["permissions_json"] }
          : m
      )
    );
    toast.success("Permissions saved");
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h1 className="text-[22px] font-medium tracking-tight">Members</h1>
            </div>
            <p className="text-[13px] text-muted-foreground/70 mt-0.5">
              Manage who has access to {activeTeam?.name ?? "your team"}.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 shadow-sm"
          disabled={!canInviteMembers}
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""} in this team.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                    No members found.
                  </TableCell>
                </TableRow>
              )}
              {members.map((member) => {
                const isCurrentUser = member.user.id === user?.id;
                const isMemberCEO = member.role === "ceo";
                const canModify =
                  teamPerms.isSuperAdmin ||
                  (isCEO ? !isCurrentUser : canManageTeamSettings && !isCurrentUser && !isMemberCEO);

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarImage src={member.user.avatar_url || ""} />
                          <AvatarFallback>{(member.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => setPermTarget(member)}
                            className="font-medium text-left hover:underline underline-offset-2 w-fit"
                          >
                            {member.user.full_name}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
                            )}
                            {member.permissions_json && (
                              <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                custom
                              </span>
                            )}
                          </button>
                          <span className="text-xs text-muted-foreground">{member.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "ceo"
                            ? "destructive"
                            : member.role === "admin"
                            ? "default"
                            : "secondary"
                        }
                        className={cn(
                          member.role === "manager" && "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                        )}
                      >
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={!canModify}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPermTarget(member)}>
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setChangeRoleTarget(member);
                              setChangeRoleValue(member.role as Role);
                            }}
                          >
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRemoveTarget(member)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Invite Member Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invite to add someone to <strong>{activeTeam?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
              >
                {inviteRoleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Role Dialog ── */}
      <Dialog open={!!changeRoleTarget} onOpenChange={(open) => !open && setChangeRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for <strong>{changeRoleTarget?.user.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid gap-2">
              <Label htmlFor="changeRole">New Role</Label>
              <select
                id="changeRole"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={changeRoleValue}
                onChange={(e) => setChangeRoleValue(e.target.value as Role)}
              >
                {changeRoleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={savingRole} className="gap-2">
              <Save className="h-4 w-4" />
              {savingRole ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Dialog ── */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.user.full_name}</strong> from{" "}
              <strong>{activeTeam?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removing} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {removing ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Member Permissions Sheet ── */}
      <MemberPermissionsSheet
        member={permTarget}
        open={!!permTarget}
        onOpenChange={(open) => !open && setPermTarget(null)}
        canEdit={canManageTeamSettings}
        onSave={handleSavePermissions}
      />
    </div>
  );
}
