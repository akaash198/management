"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Bell, Check, KeyRound, Lock, Link2, MoreHorizontal, Save,
  Shield, Sparkles, Trash2, User, UserPlus, Users as UsersIcon,
  X, GitBranch, ChevronRight, Building2, Search,
} from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, CustomRole, Team, TeamCapabilities, TeamMember } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { TwoFactorCard } from "@/components/settings/TwoFactorCard";
import { SlackWebhooksCard } from "@/components/settings/SlackWebhooksCard";
import { CalendarIntegrationsCard } from "@/components/settings/CalendarIntegrationsCard";
import { RolesTab } from "@/components/settings/RolesTab";
import { MemberPermissionsDrawer } from "@/components/settings/MemberPermissionsDrawer";
import { disablePushNotifications, enablePushNotifications } from "@/hooks/usePushNotifications";
import { useTeamStore } from "@/store/team";
import { AISettingsCard } from "@/components/settings/AISettingsCard";
import { AIUsageDashboard } from "@/components/settings/AIUsageDashboard";
import {
  ALL_CAPABILITIES, CAPABILITY_LABELS, PROJECT_ROLE_LABELS, TEAM_ROLE_LABELS,
  useTeamPermissions, type Capability, type ProjectRole as ProjectRoleType, type TeamRole,
} from "@/hooks/usePermissions";
import { format } from "date-fns";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Greenwich Mean Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Kolkata", label: "Indian Standard Time (IST)" },
];

type Role = "ceo" | "admin" | "manager" | "member" | "viewer";
type TabId = "profile" | "team" | "members" | "hierarchy" | "notifications" | "integrations" | "ai" | "plan" | "security" | "rbac";

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO", admin: "Admin", manager: "Manager", member: "Employee", viewer: "Viewer",
};

const ROLE_COLOR: Record<string, string> = {
  ceo:     "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
  admin:   "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  manager: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  member:  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  viewer:  "bg-muted text-muted-foreground border-border",
};

type NotificationKey = "task_assigned" | "task_completed" | "project_update" | "member_joined" | "weekly_digest";
const NOTIFICATION_OPTIONS: { key: NotificationKey; label: string; description: string }[] = [
  { key: "task_assigned",  label: "Task Assigned",   description: "When a task is assigned to you" },
  { key: "task_completed", label: "Task Completed",  description: "When a task you created is completed" },
  { key: "project_update", label: "Project Updates", description: "When a project you're part of is updated" },
  { key: "member_joined",  label: "Member Joined",   description: "When a new member joins the team" },
  { key: "weekly_digest",  label: "Weekly Digest",   description: "A weekly summary of team activity" },
];
const NOTIF_STORAGE_KEY = "cowrk_notif_prefs";
function loadNotifPrefs(): Record<NotificationKey, boolean> {
  try { const raw = localStorage.getItem(NOTIF_STORAGE_KEY); if (raw) return JSON.parse(raw); } catch { /* */ }
  return { task_assigned: true, task_completed: true, project_update: true, member_joined: false, weekly_digest: true };
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "profile",       label: "Profile",          icon: User },
  { id: "security",      label: "Security",          icon: Lock },
  { id: "notifications", label: "Notifications",     icon: Bell },
  { id: "team",          label: "Team",              icon: Building2,  adminOnly: false },
  { id: "members",       label: "Members",           icon: UsersIcon },
  { id: "hierarchy",     label: "Team Hierarchy",    icon: GitBranch },
  { id: "integrations",  label: "Integrations",      icon: Link2 },
  { id: "ai",            label: "AI",                icon: Sparkles },
  { id: "plan",          label: "Plan",              icon: Shield },
  { id: "rbac",          label: "Roles & Access",    icon: Shield },
];

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const searchParams = useSearchParams();
  const { fetchTeams } = useTeamStore();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCaps, setTeamCaps] = useState<TeamCapabilities | null>(null);
  const teamPerms = useTeamPermissions(activeTeam);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [savedFullName, setSavedFullName] = useState(user?.full_name || "");
  const [savedTimezone, setSavedTimezone] = useState(user?.timezone || "UTC");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationKey, boolean>>(loadNotifPrefs);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<TeamMember | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<Role>("member");
  const [savingRole, setSavingRole] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [allRoles, setAllRoles] = useState<CustomRole[]>([]);
  const [permissionsTarget, setPermissionsTarget] = useState<TeamMember | null>(null);

  useEffect(() => {
    const load = async () => {
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
        const rolesRes = await api.get<ApiResponse<CustomRole[]>>(`/teams/${team.id}/roles/`);
        if (rolesRes.data.success) setAllRoles(rolesRes.data.data ?? []);
      } catch (err) { toast.error(toErrorMessage(err, "Failed to load team data")); }
    };
    void load();
  }, [fetchTeams]);

  useEffect(() => {
    const fetchCaps = async () => {
      if (!activeTeam) { setTeamCaps(null); return; }
      try {
        const res = await api.get<ApiResponse<TeamCapabilities>>(`/teams/${activeTeam.id}/capabilities/`);
        if (res.data.success) setTeamCaps(res.data.data);
      } catch { setTeamCaps(null); }
    };
    void fetchCaps();
  }, [activeTeam]);

  const isCEO      = !!(teamCaps?.role ? teamCaps.role === "ceo" : teamPerms.isCEO);
  const isAdmin    = !!(teamCaps?.role ? teamCaps.role === "admin" || isCEO : teamPerms.isAdmin);
  const isManager  = !!(teamCaps?.role ? teamCaps.role === "manager" || isAdmin : teamPerms.isManager);
  const yourRole   = (teamCaps?.role ?? activeTeam?.your_role ?? null) as Role | null;
  const canManageTeamSettings = teamCaps?.can_manage_team ?? teamPerms.canManageTeam;
  const canInviteMembers      = teamCaps?.can_invite_members ?? teamPerms.canInviteMembers;
  const canDeleteTeam         = teamCaps?.can_delete_team ?? teamPerms.canDeleteTeam;
  const initials = useMemo(() => (user?.full_name?.trim()?.[0] ?? "?").toUpperCase(), [user?.full_name]);

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(
    (tabParam && NAV_ITEMS.some((n) => n.id === tabParam) ? tabParam : "profile") as TabId
  );

  const inviteRoleOptions = useMemo<Role[]>(() => {
    if (teamCaps?.assignable_invite_roles?.length) return teamCaps.assignable_invite_roles;
    if (teamPerms.isCEO || teamPerms.isSuperAdmin) return ["ceo", "admin", "manager", "member", "viewer"];
    if (teamPerms.isAdmin) return ["admin", "manager", "member", "viewer"];
    if (teamPerms.isManager) return ["member", "viewer"];
    return [];
  }, [teamCaps, teamPerms]);

  const changeRoleOptions: Role[] = teamPerms.isCEO || teamPerms.isSuperAdmin
    ? ["ceo", "admin", "manager", "member", "viewer"]
    : ["admin", "manager", "member", "viewer"];

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) =>
      m.user.full_name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const profileDirty = fullName.trim() !== savedFullName.trim() || timezone !== savedTimezone;

  const handleSaveClick = () => {
    if (!profileDirty) { toast.info("No changes to save."); return; }
    setConfirmSaveOpen(true);
  };

  const handleUpdateProfile = async () => {
    try {
      setSavingProfile(true);
      await api.patch("/auth/me/", { full_name: fullName, timezone });
      await fetchMe();
      setSavedFullName(fullName);
      setSavedTimezone(timezone);
      setConfirmSaveOpen(false);
      toast.success("Profile updated successfully!");
    }
    catch (err) { toast.error(toErrorMessage(err, "Failed to update profile")); }
    finally { setSavingProfile(false); }
  };

  const handleUpdateTeam = async () => {
    if (!activeTeam) return;
    try { setSavingTeam(true); await api.patch(`/teams/${activeTeam.id}/`, { name: teamName }); toast.success("Team updated"); }
    catch (err) { toast.error(toErrorMessage(err, "Failed to update team")); }
    finally { setSavingTeam(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    try {
      setSavingPassword(true);
      await api.post("/auth/change-password/", { current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) { toast.error(toErrorMessage(err, "Failed to change password")); }
    finally { setSavingPassword(false); }
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
    } catch (err) { toast.error(toErrorMessage(err, "Failed to update notifications")); }
    finally { setSavingPush(false); }
  };

  const handleInvite = async () => {
    if (!activeTeam || !inviteEmail.trim()) return;
    try {
      setInviting(true);
      await api.post(`/teams/${activeTeam.id}/invite/`, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false); setInviteEmail(""); setInviteRole("member");
    } catch (err) { toast.error(toErrorMessage(err, "Failed to send invite")); }
    finally { setInviting(false); }
  };

  const handleChangeRole = async () => {
    if (!activeTeam || !changeRoleTarget) return;
    try {
      setSavingRole(true);
      await api.patch(`/teams/${activeTeam.id}/members/${changeRoleTarget.user.id}/`, { role: changeRoleValue });
      setMembers((prev) => prev.map((m) => m.id === changeRoleTarget.id ? { ...m, role: changeRoleValue } : m));
      toast.success(`Role updated to ${ROLE_LABELS[changeRoleValue]}`);
      setChangeRoleTarget(null);
    } catch (err) { toast.error(toErrorMessage(err, "Failed to update role")); }
    finally { setSavingRole(false); }
  };

  const handleRemoveMember = async () => {
    if (!activeTeam || !removeTarget) return;
    try {
      setRemoving(true);
      await api.delete(`/teams/${activeTeam.id}/members/${removeTarget.user.id}/`);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      toast.success(`${removeTarget.user.full_name} removed from team`);
      setRemoveTarget(null);
    } catch (err) { toast.error(toErrorMessage(err, "Failed to remove member")); }
    finally { setRemoving(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1100px] mx-auto p-4 sm:p-6">
        {/* ── Header ── */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground">Settings</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account and team preferences.</p>
          </div>
          {user?.is_superuser && (
            <Badge variant="secondary" className="gap-1.5 shrink-0">
              <Shield className="h-3.5 w-3.5" />Super Admin
            </Badge>
          )}
        </div>

        {/* ── Mobile tab selector ── */}
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as TabId)}
            className="w-full h-10 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar nav (desktop only) ── */}
          <nav className="hidden sm:block w-52 shrink-0 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon size={14} className={active ? "text-primary" : "text-muted-foreground/70"} />
                  {item.label}
                  {active && <ChevronRight size={12} className="ml-auto text-primary/50" />}
                </button>
              );
            })}
          </nav>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Profile ── */}
            {activeTab === "profile" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[15px]">Personal Information</CardTitle>
                    <CardDescription>Update your personal details and how others see you.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 rounded-2xl border border-border">
                        <AvatarImage src={user?.avatar_url || ""} />
                        <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[14px] font-semibold">{user?.full_name}</p>
                        <p className="text-[12px] text-muted-foreground">{user?.email}</p>
                        {yourRole && (
                          <span className={cn("mt-1.5 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", ROLE_COLOR[yourRole])}>
                            {ROLE_LABELS[yourRole]} · {activeTeam?.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 max-w-xl md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName" className="text-[12.5px]">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-[13px]" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-[12.5px]">Email</Label>
                        <Input id="email" value={user?.email} disabled className="text-[13px]" />
                        <p className="text-[11px] text-muted-foreground">Cannot be changed.</p>
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="timezone" className="text-[12.5px]">Timezone</Label>
                        <select
                          id="timezone"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                        >
                          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center gap-3">
                    <Button onClick={handleSaveClick} disabled={savingProfile} size="sm" className="gap-2">
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </Button>
                    {profileDirty && (
                      <span className="text-[11.5px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        Unsaved changes
                      </span>
                    )}
                  </CardFooter>
                </Card>

                {/* Reporting structure */}
                {(() => {
                  const reportingTo = isCEO ? null :
                    isManager || isAdmin ? members.find((m) => m.role === "ceo") :
                    members.find((m) => m.role === "manager") || members.find((m) => m.role === "ceo");
                  if (!reportingTo) return null;
                  return (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          Reporting Structure
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 border-2 border-primary/20">
                            <AvatarImage src={reportingTo.user.avatar_url || ""} />
                            <AvatarFallback className="text-xs font-bold">{(reportingTo.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="h-px w-8 bg-primary/30 border-t border-dashed border-primary/40" />
                          <Avatar className="h-9 w-9 border-2 border-border">
                            <AvatarImage src={user?.avatar_url || ""} />
                            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="text-[12.5px] font-semibold text-foreground">
                              You report to <strong>{reportingTo.user.full_name}</strong>
                            </p>
                            <p className="text-[11.5px] text-muted-foreground">
                              {ROLE_LABELS[reportingTo.role]} · {activeTeam?.name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}

            {/* ── Security ── */}
            {activeTab === "security" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[15px] flex items-center gap-2"><KeyRound className="h-4 w-4" />Change Password</CardTitle>
                    <CardDescription>Update your password to keep your account secure.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-md">
                    {[
                      { id: "currentPassword", label: "Current Password", value: currentPassword, set: setCurrentPassword, placeholder: "Enter current password" },
                      { id: "newPassword", label: "New Password", value: newPassword, set: setNewPassword, placeholder: "At least 8 characters" },
                      { id: "confirmPassword", label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, placeholder: "Re-enter new password" },
                    ].map(({ id, label, value, set, placeholder }) => (
                      <div key={id} className="grid gap-2">
                        <Label htmlFor={id} className="text-[12.5px]">{label}</Label>
                        <Input id={id} type="password" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="text-[13px]" />
                      </div>
                    ))}
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[12px] text-destructive">Passwords do not match.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleChangePassword}
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                      size="sm" className="gap-2"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {savingPassword ? "Updating…" : "Update Password"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-[15px] flex items-center gap-2"><Shield className="h-4 w-4" />Account Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-[13px] font-medium">Email Address</p>
                        <p className="text-[12px] text-muted-foreground">{user?.email}</p>
                      </div>
                      <Badge variant={user?.is_email_verified === false ? "destructive" : "secondary"} className="text-[11px]">
                        {user?.is_email_verified === false ? "Unverified" : "Verified"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-[13px] font-medium">Team Role</p>
                        <p className="text-[12px] text-muted-foreground capitalize">{yourRole ? ROLE_LABELS[yourRole] : "—"} in {activeTeam?.name}</p>
                      </div>
                      {yourRole && (
                        <span className={cn("inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border", ROLE_COLOR[yourRole])}>
                          {ROLE_LABELS[yourRole]}
                        </span>
                      )}
                    </div>
                    <div className="pt-2">
                      <TwoFactorCard />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Notifications ── */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[15px]">Notification Preferences</CardTitle>
                  <CardDescription>Choose which events you want to be notified about.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  <Toggle
                    label="Browser notifications"
                    description="Get OS-level alerts when the app is in the background."
                    checked={pushEnabled}
                    disabled={savingPush}
                    onChange={() => void handlePushToggle(!pushEnabled)}
                  />
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <Toggle
                      key={opt.key}
                      label={opt.label}
                      description={opt.description}
                      checked={notifPrefs[opt.key]}
                      onChange={() => setNotifPrefs((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                    />
                  ))}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveNotifications} size="sm" className="gap-2">
                    <Save className="h-3.5 w-3.5" />Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* ── Team ── */}
            {activeTab === "team" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[15px]">Team Settings</CardTitle>
                    <CardDescription>Manage your team name and identity.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-md">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-12 w-12 rounded-2xl border border-border">
                        <AvatarFallback className="text-xl font-bold">{(activeTeam?.name?.[0] ?? "T").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[13.5px] font-semibold">{activeTeam?.name}</p>
                        <p className="text-[12px] text-muted-foreground">/{activeTeam?.slug}</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teamName" className="text-[12.5px]">Team Name</Label>
                      <Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="text-[13px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12.5px] text-muted-foreground">
                      <div>Plan: <span className="font-semibold text-foreground capitalize">{activeTeam?.plan ?? "free"}</span></div>
                      <div>Members: <span className="font-semibold text-foreground">{activeTeam?.member_count ?? 0}</span></div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleUpdateTeam} disabled={!canManageTeamSettings || savingTeam} size="sm" className="gap-2">
                      <Save className="h-3.5 w-3.5" />{savingTeam ? "Saving…" : "Update Team"}
                    </Button>
                  </CardFooter>
                </Card>
                {canManageTeamSettings && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-[15px] text-destructive">Danger Zone</CardTitle>
                      <CardDescription>Actions that cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <p className="text-[13px] font-medium">Delete this team</p>
                          <p className="text-[12px] text-muted-foreground">Once deleted, all data will be permanently removed.</p>
                        </div>
                        <Button variant="destructive" size="sm" disabled={!canDeleteTeam}>Delete Team</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ── Members ── */}
            {activeTab === "members" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-[15px]">Team Members</CardTitle>
                      <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""} · {activeTeam?.name}</CardDescription>
                    </div>
                    <Button size="sm" className="gap-2" disabled={!canInviteMembers} onClick={() => setInviteOpen(true)}>
                      <UserPlus className="h-3.5 w-3.5" />Invite
                    </Button>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members…"
                      className="pl-9 h-8 text-[12.5px]"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {filteredMembers.length === 0 && (
                      <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No members found.</p>
                    )}
                    {filteredMembers.map((member) => {
                      const isCurrentUser = member.user.id === user?.id;
                      const isMemberCEO = member.role === "ceo";
                      const canModify = teamPerms.isSuperAdmin || (isCEO ? !isCurrentUser : canManageTeamSettings && !isCurrentUser && !isMemberCEO);
                      return (
                        <div key={member.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group">
                          <Avatar className="h-8 w-8 shrink-0 border border-border">
                            <AvatarImage src={member.user.avatar_url || ""} />
                            <AvatarFallback className="text-[11px] font-bold">{(member.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-medium truncate">{member.user.full_name}</p>
                              {isCurrentUser && <span className="text-[11px] text-muted-foreground">(you)</span>}
                            </div>
                            <p className="text-[11.5px] text-muted-foreground/60 truncate">{member.user.email}</p>
                          </div>
                          <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border", ROLE_COLOR[member.role] ?? ROLE_COLOR.member)}>
                            {member.custom_role?.name ?? ROLE_LABELS[member.role] ?? member.role}
                          </span>
                          <span className="text-[11px] text-muted-foreground/50 shrink-0 hidden sm:block">
                            {format(new Date(member.joined_at), "MMM d, yyyy")}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" disabled={!canModify}>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => { setChangeRoleTarget(member); setChangeRoleValue(member.role as Role); }}>
                                Change role
                              </DropdownMenuItem>
                              {(isCEO || isAdmin) && (
                                <DropdownMenuItem onClick={() => setPermissionsTarget(member)}>
                                  Edit permissions
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRemoveTarget(member)}>
                                <Trash2 className="mr-2 h-3.5 w-3.5" />Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Team Hierarchy ── */}
            {activeTab === "hierarchy" && (
              <HierarchyTab members={members} currentUserId={user?.id} teamName={activeTeam?.name} />
            )}

            {/* ── Integrations ── */}
            {activeTab === "integrations" && (
              <>
                <CalendarIntegrationsCard teamId={activeTeam?.id ?? null} />
                <SlackWebhooksCard teamId={activeTeam?.id ?? null} canManage={teamPerms.isManager || teamPerms.isSuperAdmin} />
              </>
            )}

            {/* ── AI ── */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <AISettingsCard />
                <AIUsageDashboard />
              </div>
            )}

            {/* ── Plan ── */}
            {activeTab === "plan" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[15px]">Plan & Billing</CardTitle>
                  <CardDescription>Manage billing and plan settings for your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[12px] font-semibold px-2.5 py-1 rounded-full border", ROLE_COLOR.member)}>
                      Current plan: {activeTeam?.plan ?? "free"}
                    </span>
                    {activeTeam?.ai_enabled && (
                      <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full border bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                        AI enabled
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-muted-foreground">
                    Plan upgrades and billing management are coming soon. Use the AI tab to enable or disable AI features.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Roles & Access ── */}
            {activeTab === "rbac" && (
              <>
                {/* Your resolved permissions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[15px] flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />Your Permissions
                    </CardTitle>
                    <CardDescription>
                      What you can do in <strong>{activeTeam?.name}</strong> as{" "}
                      <strong>{teamCaps?.custom_role_name ?? (yourRole ? ROLE_LABELS[yourRole] : "—")}</strong>.
                      {teamCaps?.is_owner_role && (
                        <span className="ml-2 inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Owner role
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {([
                        { label: "Manage team settings",  allowed: teamCaps?.can_manage_team        ?? teamPerms.canManageTeam },
                        { label: "Invite members",         allowed: teamCaps?.can_invite_members     ?? teamPerms.canInviteMembers },
                        { label: "Change member roles",    allowed: teamCaps?.can_change_roles       ?? teamPerms.canChangeRoles },
                        { label: "Remove members",         allowed: teamCaps?.can_remove_members     ?? teamPerms.canRemoveMembers },
                        { label: "Delete team",            allowed: teamCaps?.can_delete_team        ?? teamPerms.canDeleteTeam },
                        { label: "View audit log",         allowed: teamCaps?.can_view_audit_log     ?? teamPerms.canViewAuditLog },
                        { label: "Create projects",        allowed: teamCaps?.can_create_project     ?? teamPerms.canCreateProject },
                        { label: "Manage billing",         allowed: teamCaps?.can_manage_billing     ?? teamPerms.canManageBilling },
                        { label: "Access reports",         allowed: teamCaps?.can_access_reports     ?? teamPerms.canAccessReports },
                        { label: "Manage integrations",    allowed: teamCaps?.can_manage_integrations ?? teamPerms.canManageIntegrations },
                      ] as { label: string; allowed: boolean }[]).map(({ label, allowed }) => (
                        <div key={label} className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 border text-[12.5px]",
                          allowed
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                            : "bg-muted/40 border-border text-muted-foreground"
                        )}>
                          {allowed
                            ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            : <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                          {label}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Live role management */}
                {activeTeam && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[15px]">Team Roles</CardTitle>
                      <CardDescription>
                        {isAdmin
                          ? "Create and edit roles with custom capability sets."
                          : "Roles defined for this team."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RolesTab
                        teamId={activeTeam.id}
                        isOwnerActor={isCEO}
                        isAdminActor={isAdmin}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Project role matrix */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[14px]">Project Role Capability Matrix</CardTitle>
                    <CardDescription className="text-[12px]">Default capabilities per project role.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <RoleMatrix
                      roles={["project_admin", "editor", "commenter", "viewer"] as ProjectRoleType[]}
                      roleLabels={PROJECT_ROLE_LABELS}
                      rows={ALL_CAPABILITIES.map((cap) => ({
                        label: CAPABILITY_LABELS[cap as Capability],
                        project_admin: true,
                        editor:        ["can_view", "can_edit_tasks", "can_export", "can_comment"].includes(cap),
                        commenter:     ["can_view", "can_comment"].includes(cap),
                        viewer:        cap === "can_view",
                      }))}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invite to add someone to <strong>{activeTeam?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail" className="text-[12.5px]">Email Address</Label>
              <Input id="inviteEmail" type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="text-[13px]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inviteRole" className="text-[12.5px]">Role</Label>
              <select id="inviteRole" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                {inviteRoleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              <UserPlus className="h-3.5 w-3.5" />{inviting ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!changeRoleTarget} onOpenChange={(open) => !open && setChangeRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update the role for <strong>{changeRoleTarget?.user.full_name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="py-2 grid gap-2">
            <Label htmlFor="changeRole" className="text-[12.5px]">New Role</Label>
            <select id="changeRole" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={changeRoleValue} onChange={(e) => setChangeRoleValue(e.target.value as Role)}>
              {changeRoleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setChangeRoleTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleChangeRole} disabled={savingRole} className="gap-2">
              <Save className="h-3.5 w-3.5" />{savingRole ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Profile Confirmation ── */}
      <Dialog open={confirmSaveOpen} onOpenChange={(open) => { if (!savingProfile) setConfirmSaveOpen(open); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              Save profile changes?
            </DialogTitle>
            <DialogDescription>Review your changes before saving.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {fullName.trim() !== savedFullName.trim() && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</p>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="line-through text-muted-foreground">{savedFullName || "—"}</span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="font-semibold text-foreground">{fullName}</span>
                </div>
              </div>
            )}
            {timezone !== savedTimezone && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Timezone</p>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="line-through text-muted-foreground">
                    {TIMEZONES.find((tz) => tz.value === savedTimezone)?.label ?? savedTimezone}
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="font-semibold text-foreground">
                    {TIMEZONES.find((tz) => tz.value === timezone)?.label ?? timezone}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmSaveOpen(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateProfile} disabled={savingProfile} className="gap-2">
              <Save className="h-3.5 w-3.5" />
              {savingProfile ? "Saving…" : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>Remove <strong>{removeTarget?.user.full_name}</strong> from <strong>{activeTeam?.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveMember} disabled={removing} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />{removing ? "Removing…" : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTeam && (
        <MemberPermissionsDrawer
          open={!!permissionsTarget}
          onOpenChange={(open) => !open && setPermissionsTarget(null)}
          member={permissionsTarget}
          teamId={activeTeam.id}
          allRoles={allRoles}
          assignableCustomRoleIds={teamCaps?.assignable_custom_role_ids ?? []}
          isOwnerActor={isCEO}
          onMemberUpdated={(updated) => {
            setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setPermissionsTarget(updated);
          }}
        />
      )}
    </div>
  );
}

/* ── Toggle row ─────────────────────────────────────────────── */
function Toggle({ label, description, checked, disabled, onChange }: {
  label: string; description: string; checked: boolean; disabled?: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11.5px] text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled ? "cursor-wait opacity-60" : "",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}

/* ── Role matrix table ──────────────────────────────────────── */
type MatrixRow<R extends string> = { label: string } & { [K in R]?: boolean };

function RoleMatrix<R extends string>({
  roles, roleLabels, rows,
}: {
  roles: R[];
  roleLabels: Record<string, string>;
  rows: MatrixRow<R>[];
}) {
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left font-semibold pb-2 pr-4 text-muted-foreground uppercase tracking-wider">Capability</th>
          {roles.map((r) => (
            <th key={r} className="text-center pb-2 px-2 font-bold uppercase tracking-wider text-muted-foreground">{roleLabels[r]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border/50 last:border-0">
            <td className="py-2 pr-4 font-medium text-foreground">{row.label}</td>
            {roles.map((r) => (
              <td key={r} className="text-center py-2 px-2">
                {row[r]
                  ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 mx-auto" />
                  : <X className="h-3.5 w-3.5 text-muted-foreground/25 mx-auto" />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Team Hierarchy Tab ─────────────────────────────────────── */
const ROLE_ORDER: Role[] = ["ceo", "admin", "manager", "member", "viewer"];

function HierarchyTab({ members, currentUserId, teamName }: {
  members: TeamMember[];
  currentUserId?: string;
  teamName?: string;
}) {
  const grouped = useMemo(() => {
    const g: Record<Role, TeamMember[]> = { ceo: [], admin: [], manager: [], member: [], viewer: [] };
    for (const m of members) { if (g[m.role as Role]) g[m.role as Role].push(m); }
    return g;
  }, [members]);

  const levels = ROLE_ORDER.filter((r) => grouped[r].length > 0);

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <GitBranch size={28} className="text-muted-foreground/30" />
          <p className="text-[14px] font-medium text-muted-foreground">No members yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />Team Hierarchy
          </CardTitle>
          <CardDescription>
            Org chart for <strong>{teamName}</strong> · {members.length} member{members.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {levels.map((role, levelIdx) => {
              const levelMembers = grouped[role];
              const isLast = levelIdx === levels.length - 1;
              return (
                <div key={role} className="relative">
                  {/* Connector line down */}
                  {!isLast && (
                    <div className="absolute left-[23px] top-full w-px h-6 bg-border/60 z-10" />
                  )}

                  {/* Level header */}
                  <div className="flex items-center gap-2 mb-3 mt-2">
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold shrink-0",
                      ROLE_COLOR[role]
                    )}>
                      {levelIdx + 1}
                    </div>
                    <span className={cn("text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", ROLE_COLOR[role])}>
                      {ROLE_LABELS[role]}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">{levelMembers.length} {levelMembers.length === 1 ? "person" : "people"}</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>

                  {/* Member cards */}
                  <div className={cn(
                    "grid gap-2 mb-3",
                    levelMembers.length === 1 ? "grid-cols-1 max-w-xs" :
                    levelMembers.length <= 3 ? "grid-cols-2 sm:grid-cols-3" :
                    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  )}>
                    {levelMembers.map((m) => {
                      const isSelf = m.user.id === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border p-3 transition-colors",
                            isSelf
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-card hover:bg-muted/30"
                          )}
                        >
                          <Avatar className={cn("h-8 w-8 shrink-0 border-2", isSelf ? "border-primary/40" : "border-border")}>
                            <AvatarImage src={m.user.avatar_url || ""} />
                            <AvatarFallback className="text-[11px] font-bold">
                              {(m.user.full_name?.[0] ?? "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold truncate leading-tight">
                              {m.user.full_name}
                              {isSelf && <span className="ml-1 text-[10px] text-primary font-bold">You</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 truncate">
                              {m.custom_role?.name ?? m.user.email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connecting line to next level */}
                  {!isLast && (
                    <div className="flex items-center gap-2 mb-2 pl-2">
                      <div className="h-5 w-px bg-border/60" />
                      <ChevronRight size={10} className="text-muted-foreground/40 -ml-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role summary stats */}
      <div className="grid grid-cols-5 gap-2">
        {ROLE_ORDER.map((role) => (
          <div key={role} className={cn("rounded-xl border p-3 text-center", ROLE_COLOR[role])}>
            <p className="text-[20px] font-bold leading-none">{grouped[role].length}</p>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider mt-1">{ROLE_LABELS[role]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
