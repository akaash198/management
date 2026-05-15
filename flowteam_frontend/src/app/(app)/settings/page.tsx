"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Bell,
  Check,
  KeyRound,
  Lock,
  Link2,
  MoreHorizontal,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users as UsersIcon,
  X,
} from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, Team, TeamCapabilities, TeamMember } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { TwoFactorCard } from "@/components/settings/TwoFactorCard";
import { SlackWebhooksCard } from "@/components/settings/SlackWebhooksCard";
import { CalendarIntegrationsCard } from "@/components/settings/CalendarIntegrationsCard";
import { disablePushNotifications, enablePushNotifications } from "@/hooks/usePushNotifications";
import { useTeamStore } from "@/store/team";
import { AISettingsCard } from "@/components/settings/AISettingsCard";
import {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  PROJECT_ROLE_LABELS,
  TEAM_ROLE_LABELS,
  useTeamPermissions,
  type Capability,
  type ProjectRole as ProjectRoleType,
  type TeamRole,
} from "@/hooks/usePermissions";

const TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC (Greenwich Mean Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
];

type Role = "ceo" | "admin" | "manager" | "member" | "viewer";

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  admin: "Admin",
  manager: "Manager",
  member: "Employee",
  viewer: "Viewer",
};

type NotificationKey =
  | "task_assigned"
  | "task_completed"
  | "project_update"
  | "member_joined"
  | "weekly_digest";

const NOTIFICATION_OPTIONS: { key: NotificationKey; label: string; description: string }[] = [
  { key: "task_assigned", label: "Task Assigned", description: "When a task is assigned to you" },
  { key: "task_completed", label: "Task Completed", description: "When a task you created is completed" },
  { key: "project_update", label: "Project Updates", description: "When a project you're part of is updated" },
  { key: "member_joined", label: "Member Joined", description: "When a new member joins the team" },
  { key: "weekly_digest", label: "Weekly Digest", description: "A weekly summary of team activity" },
];

const NOTIF_STORAGE_KEY = "cowrk_notif_prefs";

function loadNotifPrefs(): Record<NotificationKey, boolean> {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    task_assigned: true,
    task_completed: true,
    project_update: true,
    member_joined: false,
    weekly_digest: true,
  };
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const { fetchTeams } = useTeamStore();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCaps, setTeamCaps] = useState<TeamCapabilities | null>(null);
  const teamPerms = useTeamPermissions(activeTeam);

  // Profile
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [savingProfile, setSavingProfile] = useState(false);

  // Team
  const [teamName, setTeamName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationKey, boolean>>(loadNotifPrefs);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [savingPush, setSavingPush] = useState(false);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);

  // Change role modal
  const [changeRoleTarget, setChangeRoleTarget] = useState<TeamMember | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<Role>("member");
  const [savingRole, setSavingRole] = useState(false);

  // Remove member modal
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        void fetchTeams();
        const teamsRes = await api.get<ApiResponse<Team[]>>("/teams/");
        if (!teamsRes.data.success) return;

        const [team] = teamsRes.data.data ?? [];
        if (!team) return;

        setActiveTeam(team);
        setTeamName(team.name);

        const membersRes = await api.get<ApiResponse<TeamMember[]>>(`/teams/${team.id}/members/`);
        if (membersRes.data.success) setMembers(membersRes.data.data ?? []);
      } catch (err) {
        console.error(err);
        toast.error(toErrorMessage(err, "Failed to load team data"));
      }
    };

    fetchTeamData();
  }, [fetchTeams]);

  useEffect(() => {
    const fetchCaps = async () => {
      if (!activeTeam) {
        setTeamCaps(null);
        return;
      }
      try {
        const capsRes = await api.get<ApiResponse<TeamCapabilities>>(`/teams/${activeTeam.id}/capabilities/`);
        if (capsRes.data.success) setTeamCaps(capsRes.data.data);
        else setTeamCaps(null);
      } catch {
        setTeamCaps(null);
      }
    };
    fetchCaps();
  }, [activeTeam]);

  const isCEO = !!(teamCaps?.role ? teamCaps.role === "ceo" : teamPerms.isCEO);
  const isAdmin = !!(teamCaps?.role ? teamCaps.role === "admin" || isCEO : teamPerms.isAdmin);
  const isManager = !!(teamCaps?.role ? teamCaps.role === "manager" || isAdmin : teamPerms.isManager);

  const yourRole = (teamCaps?.role ?? activeTeam?.your_role ?? null) as Role | null;

  const canManageTeamSettings = teamCaps?.can_manage_team ?? teamPerms.canManageTeam;
  const canInviteMembers = teamCaps?.can_invite_members ?? teamPerms.canInviteMembers;
  const canDeleteTeam = teamCaps?.can_delete_team ?? teamPerms.canDeleteTeam;
  const initials = useMemo(() => (user?.full_name?.trim()?.[0] ?? "?").toUpperCase(), [user?.full_name]);
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam &&
    ["profile", "team", "members", "notifications", "integrations", "plan", "ai", "security", "rbac"].includes(tabParam)
      ? tabParam
      : "profile";

  const inviteRoleOptions = useMemo(() => {
    if (teamCaps?.assignable_invite_roles?.length) return teamCaps.assignable_invite_roles as Role[];
    if (teamPerms.isCEO || teamPerms.isSuperAdmin) return ["ceo", "admin", "manager", "member", "viewer"] as Role[];
    if (teamPerms.isAdmin) return ["admin", "manager", "member", "viewer"] as Role[];
    if (teamPerms.isManager) return ["member", "viewer"] as Role[];
    return [] as Role[];
  }, [teamCaps?.assignable_invite_roles, teamPerms.isCEO, teamPerms.isAdmin, teamPerms.isManager, teamPerms.isSuperAdmin]);

  const changeRoleOptions = useMemo(() => {
    if (teamPerms.isCEO || teamPerms.isSuperAdmin) return ["ceo", "admin", "manager", "member", "viewer"] as Role[];
    return ["admin", "manager", "member", "viewer"] as Role[];
  }, [teamPerms.isCEO, teamPerms.isSuperAdmin]);

  const handleUpdateProfile = async () => {
    try {
      setSavingProfile(true);
      await api.patch("/auth/me/", { full_name: fullName, timezone });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!activeTeam) return;
    try {
      setSavingTeam(true);
      await api.patch(`/teams/${activeTeam.id}/`, { name: teamName });
      toast.success("Team updated");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update team"));
    } finally {
      setSavingTeam(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      setSavingPassword(true);
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifPrefs));
    toast.success("Notification preferences saved");
  };

  const handlePushToggle = async (enabled: boolean) => {
    try {
      setSavingPush(true);
      const ok = enabled ? await enablePushNotifications() : await disablePushNotifications();
      setPushEnabled(enabled && ok);
      toast.success(enabled && ok ? "Browser notifications enabled" : "Browser notifications disabled");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to update browser notifications"));
    } finally {
      setSavingPush(false);
    }
  };

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

  const reportingTo = useMemo(() => {
    if (isCEO) return null;
    if (isManager || isAdmin) return members.find((m) => m.role === "ceo");
    return members.find((m) => m.role === "manager") || members.find((m) => m.role === "ceo");
  }, [members, isCEO, isManager, isAdmin]);

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">Settings</h1>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">Manage your account and team preferences.</p>
        </div>
        {user?.is_superuser && (
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Super Admin
          </Badge>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-muted/50 p-1 text-muted-foreground border border-border/50 shadow-sm">
          <TabsTrigger value="profile" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <UsersIcon className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <UsersIcon className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Link2 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            Roles &amp; Access
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-2xl border border-border">
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" disabled>
                      Change Avatar (soon)
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 max-w-2xl md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateProfile} disabled={savingProfile} className="gap-2 shadow-sm">
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          {reportingTo && (
            <Card className="border-primary/20 bg-primary/5 shadow-inner">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Reporting Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-10 w-10 border-2 border-primary/20 bg-background">
                      <AvatarImage src={reportingTo.user.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {(reportingTo.user.full_name?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="h-4 w-px bg-primary/20 my-1" />
                    <Avatar className="h-10 w-10 border-2 border-muted-foreground/20 grayscale opacity-80">
                      <AvatarFallback className="text-xs">{(user?.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Direct Report To
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-foreground">{reportingTo.user.full_name}</span>
                        <Badge
                          className={cn(
                            "uppercase text-[9px] font-black",
                              reportingTo.role === "ceo" ? "bg-primary" : "bg-amber-500 dark:bg-amber-600"
                          )}
                        >
                          {reportingTo.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg border border-primary/10">
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        &quot;You currently report directly to the {reportingTo.role} for{" "}
                        <strong>{activeTeam?.name}</strong>. Your project performance and task approvals are managed
                        through this hierarchy.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Team Tab ── */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>Manage your team name and identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="flex items-center gap-4 mb-2">
                <Avatar className="h-14 w-14 rounded-2xl border border-border">
                  <AvatarFallback className="text-xl font-bold">
                    {(activeTeam?.name?.[0] ?? "T").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{activeTeam?.name}</p>
                  <p className="text-xs text-muted-foreground">/{activeTeam?.slug}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <p className="text-xs text-muted-foreground">Slug: {activeTeam?.slug ?? "—"}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleUpdateTeam}
                disabled={!canManageTeamSettings || savingTeam}
                className="gap-2 shadow-sm"
              >
                <Save className="h-4 w-4" />
                {savingTeam ? "Saving..." : "Update Team"}
              </Button>
            </CardFooter>
          </Card>

          {canManageTeamSettings && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Actions that cannot be undone.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-medium">Delete this team</p>
                    <p className="text-sm text-muted-foreground">Once deleted, all data will be permanently removed.</p>
                  </div>
                  <Button variant="destructive" disabled={!canDeleteTeam}>
                    Delete Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to this team.</CardDescription>
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
                      <TableRow key={member.id} className="hover:bg-muted/30 transition-colors duration-200">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={member.user.avatar_url || ""} />
                              <AvatarFallback>{(member.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {member.user.full_name}
                                {isCurrentUser && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                                )}
                              </span>
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
                              className={cn(member.role === "manager" && "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500")}
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
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which events you want to be notified about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Browser notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get OS-level alerts when Cowrk is in the background.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={pushEnabled}
                  disabled={savingPush}
                  onClick={() => void handlePushToggle(!pushEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    savingPush ? "cursor-wait opacity-70" : "cursor-pointer",
                    pushEnabled ? "bg-primary" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      pushEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {NOTIFICATION_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notifPrefs[opt.key]}
                    onClick={() =>
                      setNotifPrefs((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))
                    }
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      notifPrefs[opt.key] ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                        notifPrefs[opt.key] ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} className="gap-2 shadow-sm">
                <Save className="h-4 w-4" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Integrations Tab ── */}
        <TabsContent value="integrations" className="space-y-4">
          <CalendarIntegrationsCard teamId={activeTeam?.id ?? null} />
          <SlackWebhooksCard
            teamId={activeTeam?.id ?? null}
            canManage={teamPerms.isManager || teamPerms.isSuperAdmin}
          />
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="ai" className="space-y-6">
          <AISettingsCard />
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>Manage billing and plan settings for your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  Current plan: {activeTeam?.plan ?? "free"}
                </Badge>
                {activeTeam?.ai_enabled && (
                  <Badge variant="default" className="text-[11px]">
                    AI enabled
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Plan upgrades and billing management are coming soon. Use the AI tab to enable or disable AI features.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="gap-2 shadow-sm"
              >
                <KeyRound className="h-4 w-4" />
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>Information about your account authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Badge variant={user?.is_email_verified === false ? "destructive" : "secondary"}>
                  {user?.is_email_verified === false ? "Unverified" : "Verified"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Account Role</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {yourRole ? ROLE_LABELS[yourRole] : "—"} in {activeTeam?.name}
                  </p>
                </div>
                <Badge
                  variant={isCEO ? "destructive" : isAdmin ? "default" : "secondary"}
                  className={cn(isManager && "bg-amber-500 text-white dark:bg-amber-600")}
                >
                  {yourRole ? ROLE_LABELS[yourRole] : "—"}
                </Badge>
              </div>
              <div className="pt-2">
                <TwoFactorCard />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles & Access Tab ── */}
        <TabsContent value="rbac" className="space-y-4">
          {/* Your permissions summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Permissions
              </CardTitle>
              <CardDescription>
                What you can do in <strong>{activeTeam?.name}</strong> based on your{" "}
                <strong>{yourRole ? ROLE_LABELS[yourRole] : "—"}</strong> role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    { label: "Manage team settings", allowed: teamPerms.canManageTeam },
                    { label: "Invite members", allowed: teamPerms.canInviteMembers },
                    { label: "Change member roles", allowed: teamPerms.canChangeRoles },
                    { label: "Remove members", allowed: teamPerms.canRemoveMembers },
                    { label: "Delete team", allowed: teamPerms.canDeleteTeam },
                    { label: "View audit log", allowed: teamPerms.canViewAuditLog },
                    { label: "Create projects", allowed: teamPerms.canCreateProject },
                  ] as { label: string; allowed: boolean }[]
                ).map(({ label, allowed }) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 border text-sm",
                      allowed
                        ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
                        : "bg-muted/40 border-border text-muted-foreground"
                    )}
                  >
                    {allowed ? (
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team role × capability matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Role Capability Matrix</CardTitle>
              <CardDescription>
                Default capabilities for each team role. Project-level overrides can refine these
                further per project.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold pb-2 pr-4 text-muted-foreground uppercase tracking-wider">
                      Capability
                    </th>
                    {(["ceo", "admin", "manager", "member", "viewer"] as TeamRole[]).map((r) => (
                      <th
                        key={r}
                        className="text-center pb-2 px-2 font-bold uppercase tracking-wider"
                      >
                        {TEAM_ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { label: "Manage team", ceo: true, admin: true, manager: false, member: false, viewer: false },
                      { label: "Invite members", ceo: true, admin: true, manager: true, member: false, viewer: false },
                      { label: "Change roles", ceo: true, admin: true, manager: false, member: false, viewer: false },
                      { label: "Remove members", ceo: true, admin: true, manager: false, member: false, viewer: false },
                      { label: "Delete team", ceo: true, admin: false, manager: false, member: false, viewer: false },
                      { label: "View audit log", ceo: true, admin: true, manager: false, member: false, viewer: false },
                      { label: "Create projects", ceo: true, admin: true, manager: true, member: false, viewer: false },
                    ] as { label: string; ceo: boolean; admin: boolean; manager: boolean; member: boolean; viewer: boolean }[]
                  ).map((row) => (
                    <tr key={row.label} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">{row.label}</td>
                      {(["ceo", "admin", "manager", "member", "viewer"] as TeamRole[]).map((r) => (
                        <td key={r} className="text-center py-2 px-2">
                          {row[r] ? (
                            <Check className="h-3.5 w-3.5 text-green-500 dark:text-green-400 mx-auto" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Project role matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Role Capability Matrix</CardTitle>
              <CardDescription>
                Default capabilities per project role. Admins can override these per-user on any
                project.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold pb-2 pr-4 text-muted-foreground uppercase tracking-wider">
                      Capability
                    </th>
                    {(
                      ["project_admin", "editor", "commenter", "viewer"] as ProjectRoleType[]
                    ).map((r) => (
                      <th
                        key={r}
                        className="text-center pb-2 px-2 font-bold uppercase tracking-wider"
                      >
                        {PROJECT_ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_CAPABILITIES.map((cap) => {
                    const matrix: Record<ProjectRoleType, boolean> = {
                      project_admin: true,
                      editor: ["can_view", "can_edit_tasks", "can_export", "can_comment"].includes(cap),
                      commenter: ["can_view", "can_comment"].includes(cap),
                      viewer: cap === "can_view",
                    };
                    return (
                      <tr key={cap} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground">
                          {CAPABILITY_LABELS[cap as Capability]}
                        </td>
                        {(["project_admin", "editor", "commenter", "viewer"] as ProjectRoleType[]).map(
                          (r) => (
                            <td key={r} className="text-center py-2 px-2">
                              {matrix[r] ? (
                                <Check className="h-3.5 w-3.5 text-green-500 dark:text-green-400 mx-auto" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
