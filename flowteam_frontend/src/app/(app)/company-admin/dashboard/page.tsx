"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse, CompanyDetail, CompanyMember, CompanyInvite, CompanyCapabilities, CompanyRole, Team, TeamMember } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  Users, Building2, Layers, MoreHorizontal, Plus, Mail, Trash2,
  UserPlus, Shield, ChevronRight, CheckCircle2, Clock, XCircle,
} from "lucide-react";

// ── Role helpers ──────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  ceo: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  member: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  viewer: "bg-muted text-muted-foreground",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${ROLE_COLORS[role] ?? ROLE_COLORS.viewer}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ── View state machine ────────────────────────────────────────

type View = "overview" | "members" | "invites" | "teams";

// ── Page ─────────────────────────────────────────────────────

export default function CompanyAdminDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("overview");

  // ── Fetch my companies (CEO or member) ──
  const { data: companies, isLoading: isLoadingCompanies } = useQuery<CompanyDetail[]>({
    queryKey: ["my-companies"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CompanyDetail[]>>("/companies/");
      return res.data.data ?? [];
    },
    enabled: !!user,
  });

  const company = companies?.[0] ?? null;
  const companyId = company?.id ?? "";

  // ── Capabilities ──
  const { data: caps } = useQuery<CompanyCapabilities>({
    queryKey: ["company-capabilities", companyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CompanyCapabilities>>(`/companies/${companyId}/capabilities/`);
      return res.data.data;
    },
    enabled: !!companyId,
  });

  // ── Members ──
  const { data: members, isLoading: isLoadingMembers } = useQuery<CompanyMember[]>({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CompanyMember[]>>(`/companies/${companyId}/members/`);
      return res.data.data ?? [];
    },
    enabled: !!companyId && caps?.can_view_members === true,
  });

  // ── Invites ──
  const { data: invites, isLoading: isLoadingInvites } = useQuery<CompanyInvite[]>({
    queryKey: ["company-invites", companyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CompanyInvite[]>>(`/companies/${companyId}/invites/`);
      return res.data.data ?? [];
    },
    enabled: !!companyId && caps?.can_invite_members === true,
  });

  // ── Teams ──
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["company-teams", companyId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Team[]>>(`/companies/${companyId}/teams/`);
      return res.data.data ?? [];
    },
    enabled: !!companyId,
  });

  // ── Invite dialog state ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");

  // ── Role change dialog ──
  const [roleDialogMember, setRoleDialogMember] = useState<CompanyMember | null>(null);
  const [newRole, setNewRole] = useState<CompanyRole>("member");

  // ── Remove member dialog ──
  const [removeDialogMember, setRemoveDialogMember] = useState<CompanyMember | null>(null);

  // ── Team invite dialog state ──
  const [teamInviteTarget, setTeamInviteTarget] = useState<Team | null>(null);
  const [teamInviteEmail, setTeamInviteEmail] = useState("");
  const [teamInviteRole, setTeamInviteRole] = useState<"member" | "viewer">("member");

  // ── New team dialog state ──
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  // ── Mutations ──
  const sendInvite = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<CompanyInvite>>(`/companies/${companyId}/invites/`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      return res.data.data;
    },
    onSuccess: () => {
      const email = inviteEmail.trim();
      try {
        sessionStorage.setItem("cowrk_invite_sent", JSON.stringify({ email, ts: Date.now() }));
      } catch { /* ignore */ }
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      queryClient.invalidateQueries({ queryKey: ["company-invites", companyId] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to send invite")),
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/companies/${companyId}/invites/${inviteId}/`);
    },
    onSuccess: () => {
      toast.success("Invite revoked");
      queryClient.invalidateQueries({ queryKey: ["company-invites", companyId] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to revoke invite")),
  });

  const changeMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: CompanyRole }) => {
      const res = await api.patch<ApiResponse<CompanyMember>>(`/companies/${companyId}/members/${memberId}/`, { role });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Role updated");
      setRoleDialogMember(null);
      queryClient.invalidateQueries({ queryKey: ["company-members", companyId] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to update role")),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/companies/${companyId}/members/${memberId}/`);
    },
    onSuccess: () => {
      toast.success("Member removed");
      setRemoveDialogMember(null);
      queryClient.invalidateQueries({ queryKey: ["company-members", companyId] });
      queryClient.invalidateQueries({ queryKey: ["my-companies"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to remove member")),
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Team>>(`/companies/${companyId}/teams/`, { name: newTeamName.trim() });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(`Team "${newTeamName}" created`);
      setNewTeamOpen(false);
      setNewTeamName("");
      queryClient.invalidateQueries({ queryKey: ["company-teams", companyId] });
      queryClient.invalidateQueries({ queryKey: ["my-companies"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to create team")),
  });

  const sendTeamInvite = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/teams/${teamInviteTarget!.id}/invite/`, {
        email: teamInviteEmail.trim(),
        role: teamInviteRole,
      });
      return res.data;
    },
    onSuccess: () => {
      const email = teamInviteEmail.trim();
      try {
        sessionStorage.setItem("cowrk_invite_sent", JSON.stringify({ email, ts: Date.now() }));
      } catch { /* ignore */ }
      toast.success(`Invite sent to ${teamInviteEmail}`);
      setTeamInviteTarget(null);
      setTeamInviteEmail("");
      setTeamInviteRole("member");
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to send team invite")),
  });

  // ── Loading ──
  if (isLoadingCompanies) return <PageSkeleton />;

  if (!company) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 size={48} className="text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">You are not associated with any company yet.</p>
        <p className="text-xs text-muted-foreground/60">Contact your Super Admin to be onboarded.</p>
      </div>
    );
  }

  const pendingInvites = (invites ?? []).filter(i => i.status === "pending");
  const myRole = caps?.role ?? company.your_role ?? "member";

  return (
    <div className="p-8 space-y-8 min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-sm text-muted-foreground">
              {company.industry && <span className="capitalize">{company.industry}</span>}
              {company.industry && company.country && <span className="mx-1.5">·</span>}
              {company.country && <span className="capitalize">{company.country}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={myRole} />
          {caps?.can_invite_members && (
            <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Members" value={company.member_count} icon={Users} />
        <StatCard title="Teams" value={company.team_count} icon={Layers} />
        <StatCard title="Pending Invites" value={pendingInvites.length} icon={Mail} />
      </div>

      {/* ── Nav tabs ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["overview", "members", "teams", "invites"] as const).map((v) => {
          if (v === "invites" && !caps?.can_invite_members) return null;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                view === v
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* ── View: Overview ── */}
      {view === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={company.name} />
              <InfoRow label="Slug" value={`/${company.slug}`} />
              {company.website && <InfoRow label="Website" value={company.website} />}
              {company.industry && <InfoRow label="Industry" value={company.industry} />}
              {company.size && <InfoRow label="Size" value={company.size} />}
              {company.country && <InfoRow label="Country" value={company.country} />}
              {company.email_domain && (
                <InfoRow
                  label="Email Domain"
                  value={
                    <span className="flex items-center gap-1.5">
                      {company.email_domain}
                      {company.email_domain_verified
                        ? <CheckCircle2 size={13} className="text-green-500" />
                        : <Clock size={13} className="text-amber-500" />}
                    </span>
                  }
                />
              )}
              <InfoRow
                label="Status"
                value={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    company.onboarding_status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  }`}>
                    {company.onboarding_status}
                  </span>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield size={16} className="text-muted-foreground" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {caps && Object.entries({
                "Manage company": caps.can_manage_company,
                "Invite members": caps.can_invite_members,
                "Change roles": caps.can_change_roles,
                "Remove members": caps.can_remove_members,
                "Create teams": caps.can_create_teams,
                "View members": caps.can_view_members,
              }).map(([label, allowed]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {allowed
                    ? <CheckCircle2 size={15} className="text-green-500" />
                    : <XCircle size={15} className="text-muted-foreground/40" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── View: Members ── */}
      {view === "members" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Members</CardTitle>
              <p className="text-sm text-muted-foreground">{members?.length ?? 0} total</p>
            </div>
            {caps?.can_invite_members && (
              <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite member
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Joined</th>
                    {caps?.can_change_roles && <th className="px-4 py-3 w-[52px]" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingMembers && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!isLoadingMembers && (members?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No members yet.</td></tr>
                  )}
                  {(members ?? []).map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{m.user.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                      {caps?.can_change_roles && (
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => {
                                setRoleDialogMember(m);
                                setNewRole(m.role);
                              }}>
                                Change role
                              </DropdownMenuItem>
                              {caps?.can_remove_members && m.user.id !== user?.id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setRemoveDialogMember(m)}
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── View: Teams ── */}
      {view === "teams" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Teams</CardTitle>
              <p className="text-sm text-muted-foreground">Teams under {company.name}.</p>
            </div>
            {caps?.can_create_teams && (
              <Button onClick={() => { setNewTeamName(""); setNewTeamOpen(true); }} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Team
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {isLoadingTeams ? (
              <div className="space-y-2 pt-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : (teams?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              <div className="space-y-2 pt-2">
                {teams?.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Layers size={14} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">/{t.slug} · {t.member_count ?? 0} members</p>
                      </div>
                    </div>
                    {caps?.can_invite_members && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => { setTeamInviteTarget(t); setTeamInviteEmail(""); setTeamInviteRole("member"); }}
                      >
                        <UserPlus size={12} />
                        Invite
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── View: Invites ── */}
      {view === "invites" && caps?.can_invite_members && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Pending Invites</CardTitle>
              <p className="text-sm text-muted-foreground">{pendingInvites.length} waiting</p>
            </div>
            <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Invite
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoadingInvites ? (
              <div className="space-y-2 pt-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : pendingInvites.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3 w-[52px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingInvites.map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{inv.email}</td>
                        <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => revokeInvite.mutate(inv.id)}
                            disabled={revokeInvite.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Invite dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Invite to {company.name}</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to accept and join the company.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as CompanyRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {(caps?.assignable_invite_roles ?? ["member", "viewer"]).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === "ceo" && "Full company control."}
                {inviteRole === "admin" && "Can manage members and settings."}
                {inviteRole === "manager" && "Can invite members to teams."}
                {inviteRole === "member" && "Standard member access."}
                {inviteRole === "viewer" && "Read-only access."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => sendInvite.mutate()}
              disabled={sendInvite.isPending || !inviteEmail.trim()}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {sendInvite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change role dialog ── */}
      <Dialog open={!!roleDialogMember} onOpenChange={open => !open && setRoleDialogMember(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update the role for <span className="font-medium">{roleDialogMember?.user.full_name || roleDialogMember?.user.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>New role</Label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as CompanyRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {(caps?.assignable_invite_roles ?? Object.keys(ROLE_LABELS) as CompanyRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogMember(null)}>Cancel</Button>
            <Button
              onClick={() => roleDialogMember && changeMemberRole.mutate({ memberId: roleDialogMember.user.id, role: newRole })}
              disabled={changeMemberRole.isPending}
            >
              {changeMemberRole.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New team dialog ── */}
      <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create new team</DialogTitle>
            <DialogDescription>Add a team under {company.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="newTeamName">Team name</Label>
            <Input
              id="newTeamName"
              placeholder="e.g. Engineering, Marketing"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newTeamName.trim() && createTeam.mutate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTeamOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createTeam.mutate()}
              disabled={createTeam.isPending || !newTeamName.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {createTeam.isPending ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Team invite dialog ── */}
      <Dialog open={!!teamInviteTarget} onOpenChange={open => !open && setTeamInviteTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Invite to {teamInviteTarget?.name}</DialogTitle>
            <DialogDescription>
              They'll receive an email to join this team directly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="teamInviteEmail">Email address</Label>
              <Input
                id="teamInviteEmail"
                type="email"
                placeholder="colleague@example.com"
                value={teamInviteEmail}
                onChange={e => setTeamInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teamInviteRole">Role</Label>
              <select
                id="teamInviteRole"
                value={teamInviteRole}
                onChange={e => setTeamInviteRole(e.target.value as "member" | "viewer")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamInviteTarget(null)}>Cancel</Button>
            <Button
              onClick={() => sendTeamInvite.mutate()}
              disabled={sendTeamInvite.isPending || !teamInviteEmail.trim()}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {sendTeamInvite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove member dialog ── */}
      <Dialog open={!!removeDialogMember} onOpenChange={open => !open && setRemoveDialogMember(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{removeDialogMember?.user.full_name || removeDialogMember?.user.email}</span> will lose access to this company and all its teams.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogMember(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => removeDialogMember && removeMember.mutate(removeDialogMember.user.id)}
              disabled={removeMember.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {removeMember.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) {
  return (
    <Card className="hover:shadow-md hover:-translate-y-[1px] transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Icon size={16} />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );
}
