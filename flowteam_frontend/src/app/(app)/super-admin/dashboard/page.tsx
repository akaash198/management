"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse, Team, TeamMember } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Users, Layers, Briefcase, CheckSquare, MessageSquare, Activity, MoreHorizontal, Plus, Save, Trash2, UserPlus, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyManagementPanel from "@/components/super-admin/CompanyManagementPanel";

type SuperAdminDashboard = {
  counts: {
    users: number;
    teams: number;
    projects: number;
    tasks: number;
    messages: number;
  };
  activity: {
    new_users_7d: number;
    new_users_30d: number;
    task_activity_7d: number;
    messages_7d: number;
  };
  recent_users: { id: string; email: string; full_name: string; date_joined: string; is_staff: boolean; is_superuser: boolean }[];
};

type RecentUser = SuperAdminDashboard["recent_users"][number];

type AdminTeam = Team;

type TeamRole = TeamMember["role"];

type AdminProjectSummary = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  status: "active" | "archived";
  team: string | null;
  team_name?: string | null;
  task_count?: number;
};

type AdminProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: "active" | "archived";
  team: string | null;
  team_name?: string | null;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  timezone?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
};

type AdminUserUpsertPayload = {
  email?: string;
  full_name: string;
  timezone: string;
  password?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
};


export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isSuperuser = !!user?.is_superuser;

  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formTimezone, setFormTimezone] = useState("UTC");
  const [formPassword, setFormPassword] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsStaff, setFormIsStaff] = useState(false);
  const [formIsSuperuser, setFormIsSuperuser] = useState(false);

  const resetForm = () => {
    setFormEmail("");
    setFormFullName("");
    setFormTimezone("UTC");
    setFormPassword("");
    setFormIsActive(true);
    setFormIsStaff(false);
    setFormIsSuperuser(false);
  };

  useEffect(() => {
    if (user && !user.is_superuser) router.replace("/dashboard");
  }, [user, router]);

  // Company state (now fully managed by CompanyManagementPanel)

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<AdminTeam | null>(null);
  const [teamName, setTeamName] = useState("");
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<AdminTeam | null>(null);

  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [membersTeam, setMembersTeam] = useState<AdminTeam | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<TeamRole>("member");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string | null>(null);

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AdminProjectDetail | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectIcon, setProjectIcon] = useState("📁");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [projectTeamId, setProjectTeamId] = useState<string>("");
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<AdminProjectSummary | null>(null);

  const { data, isLoading, error } = useQuery<SuperAdminDashboard>({
    queryKey: ["super-admin-dashboard", selectedTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SuperAdminDashboard>>("/dashboard/super-admin/", {
        params: selectedTeamId ? { team_id: selectedTeamId } : {}
      });
      return res.data.data;
    },
    enabled: isSuperuser,
  });

  const usersQueryKey = useMemo(() => ["super-admin-users", q], [q]);
  const { data: users, isLoading: isUsersLoading } = useQuery<AdminUser[]>({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>("/super-admin/users/", { params: q ? { q } : {} });
      return res.data.data ?? [];
    },
    enabled: isSuperuser,
  });

  const memberSearchKey = useMemo(() => ["super-admin-users-search", memberSearch], [memberSearch]);
  const { data: memberSearchResults, isLoading: isMemberSearchLoading } = useQuery<AdminUser[]>({
    queryKey: memberSearchKey,
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>("/super-admin/users/", {
        params: memberSearch.trim() ? { q: memberSearch.trim() } : {},
      });
      return res.data.data ?? [];
    },
    enabled: isSuperuser && membersDialogOpen && memberSearch.trim().length > 0,
    staleTime: 10_000,
  });

  const selectableUserIds = useMemo(() => {
    const me = user?.id;
    return (users ?? []).filter((u) => u.id !== me).map((u) => u.id);
  }, [users, user?.id]);

  useEffect(() => {
    // Clear selections when search changes (keeps UX predictable).
    setSelectedIds(new Set());
  }, [q]);

  useEffect(() => {
    const total = selectableUserIds.length;
    const selected = Array.from(selectedIds).filter((id) => selectableUserIds.includes(id)).length;
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selected > 0 && selected < total;
  }, [selectedIds, selectableUserIds]);

  const upsertUser = useMutation({
    mutationFn: async () => {
      const payload: AdminUserUpsertPayload = {
        full_name: formFullName,
        timezone: formTimezone,
        is_active: formIsActive,
        is_staff: formIsStaff,
        is_superuser: formIsSuperuser,
      };
      if (formPassword) payload.password = formPassword;

      if (editingUser) {
        const res = await api.patch<ApiResponse<AdminUser>>(`/super-admin/users/${editingUser.id}/`, payload);
        return res.data.data;
      }

      const res = await api.post<ApiResponse<AdminUser>>("/super-admin/users/", { ...payload, email: formEmail, password: formPassword });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(editingUser ? "User updated" : "User created");
      setDialogOpen(false);
      setEditingUser(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to save user")),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/super-admin/users/${id}/`);
    },
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to delete user")),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post<ApiResponse<{ deleted: number }>>("/super-admin/users/bulk-delete/", { ids });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Deleted ${data?.deleted ?? 0} user(s)`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to delete selected users")),
  });

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormFullName(u.full_name ?? "");
    setFormTimezone(u.timezone ?? "UTC");
    setFormPassword("");
    setFormIsActive(!!u.is_active);
    setFormIsStaff(!!u.is_staff);
    setFormIsSuperuser(!!u.is_superuser);
    setDialogOpen(true);
  };

  // Fetch all teams for the filter
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["super-admin-all-teams"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Team[]>>("/teams/");
      return res.data.data ?? [];
    },
    enabled: isSuperuser,
  });

  // Companies are fully managed by CompanyManagementPanel below.

  const upsertTeam = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error("Team name is required");

      if (editingTeam) {
        const res = await api.patch<ApiResponse<Team>>(`/teams/${editingTeam.id}/`, { name: teamName.trim() });
        return res.data.data;
      }

      const res = await api.post<ApiResponse<Team>>("/teams/", { name: teamName.trim() });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(editingTeam ? "Team updated" : "Team created");
      setTeamDialogOpen(false);
      setEditingTeam(null);
      setTeamName("");
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-teams"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-projects"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to save team")),
  });

  const deleteTeam = useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`/teams/${teamId}/`);
    },
    onSuccess: () => {
      toast.success("Team deleted");
      setDeleteTeamOpen(false);
      setDeletingTeam(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-teams"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-projects"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to delete team")),
  });

  const loadMembers = async (team: AdminTeam) => {
    setMembersLoading(true);
    try {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${team.id}/members/`);
      setMembers(res.data.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error(toErrorMessage(err, "Failed to load team members"));
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const addMember = useMutation({
    mutationFn: async () => {
      if (!membersTeam) throw new Error("No team selected");
      if (!selectedUserIdToAdd && !memberEmail.trim()) throw new Error("Select a user or enter an email");
      const res = await api.post<ApiResponse<TeamMember>>(`/teams/${membersTeam.id}/members/`, {
        ...(selectedUserIdToAdd ? { user_id: selectedUserIdToAdd } : { email: memberEmail.trim() }),
        role: memberRole,
      });
      return res.data.data;
    },
    onSuccess: async () => {
      toast.success("Member added");
      setMemberEmail("");
      setMemberSearch("");
      setSelectedUserIdToAdd(null);
      if (membersTeam) await loadMembers(membersTeam);
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-teams"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to add member")),
  });

  const updateMemberRole = useMutation({
    mutationFn: async (payload: { teamId: string; userId: string; role: TeamRole }) => {
      const res = await api.patch<ApiResponse<TeamMember>>(`/teams/${payload.teamId}/members/${payload.userId}/`, { role: payload.role });
      return res.data.data;
    },
    onSuccess: async () => {
      toast.success("Member updated");
      if (membersTeam) await loadMembers(membersTeam);
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-teams"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to update member")),
  });

  const removeMember = useMutation({
    mutationFn: async (payload: { teamId: string; userId: string }) => {
      await api.delete(`/teams/${payload.teamId}/members/${payload.userId}/`);
    },
    onSuccess: async () => {
      toast.success("Member removed");
      if (membersTeam) await loadMembers(membersTeam);
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-teams"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to remove member")),
  });

  const upsertProject = useMutation({
    mutationFn: async () => {
      if (!projectName.trim()) throw new Error("Project name is required");
      const payload: {
        name: string;
        description: string | null;
        icon: string | null;
        color: string;
        team?: string;
      } = {
        name: projectName.trim(),
        description: projectDescription.trim() ? projectDescription.trim() : null,
        icon: projectIcon || null,
        color: projectColor || "#6366f1",
      };
      if (projectTeamId) payload.team = projectTeamId;

      if (editingProject) {
        const res = await api.patch<ApiResponse<AdminProjectDetail>>(`/projects/${editingProject.id}/`, payload);
        return res.data.data;
      }

      if (!projectTeamId) throw new Error("Team is required");
      const res = await api.post<ApiResponse<AdminProjectDetail>>("/projects/", payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(editingProject ? "Project updated" : "Project created");
      setProjectDialogOpen(false);
      setEditingProject(null);
      setProjectName("");
      setProjectDescription("");
      setProjectTeamId("");
      queryClient.invalidateQueries({ queryKey: ["super-admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to save project")),
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}/`);
    },
    onSuccess: () => {
      toast.success("Project deleted");
      setDeleteProjectOpen(false);
      setDeletingProject(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err, "Failed to delete project")),
  });

  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamName("");
    setTeamDialogOpen(true);
  };

  const openEditTeam = (t: AdminTeam) => {
    setEditingTeam(t);
    setTeamName(t.name);
    setTeamDialogOpen(true);
  };

  const openDeleteTeam = (t: AdminTeam) => {
    setDeletingTeam(t);
    setDeleteTeamOpen(true);
  };

  const openMembers = async (t: AdminTeam) => {
    setMembersTeam(t);
    setMembersDialogOpen(true);
    await loadMembers(t);
  };

  const openCreateProject = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectDescription("");
    setProjectIcon("📁");
    setProjectColor("#6366f1");
    setProjectTeamId(selectedTeamId || teams?.[0]?.id || "");
    setProjectDialogOpen(true);
  };

  const openEditProject = async (p: AdminProjectSummary) => {
    try {
      const res = await api.get<ApiResponse<AdminProjectDetail>>(`/projects/${p.id}/`);
      const detail = res.data.data;
      setEditingProject(detail);
      setProjectName(detail.name ?? "");
      setProjectDescription(detail.description ?? "");
      setProjectIcon(detail.icon || "📁");
      setProjectColor(detail.color || "#6366f1");
      setProjectTeamId(detail.team || "");
      setProjectDialogOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(toErrorMessage(err, "Failed to load project"));
    }
  };

  const openDeleteProject = (p: AdminProjectSummary) => {
    setDeletingProject(p);
    setDeleteProjectOpen(true);
  };

  if (!user) return null;
  if (!isSuperuser) return null;
  if (isLoading) return <PageSkeleton />;

  const visibleSelectedCount = Array.from(selectedIds).filter((id) => selectableUserIds.includes(id)).length;
  const allVisibleSelected = selectableUserIds.length > 0 && visibleSelectedCount === selectableUserIds.length;

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableUserIds));
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const activeTeamName = teams?.find(t => t.id === selectedTeamId)?.name;

  return (
    <div className="p-8 space-y-8 min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              {selectedTeamId ? `Insights for ${activeTeamName}` : "Global overview of the platform."}
            </p>
          </div>
          <div className="h-10 w-px bg-border/60 mx-1 hidden lg:block" />
          <div className="hidden lg:flex flex-col gap-1.5 min-w-[200px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Filter by Team</Label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="">All Teams (Global)</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedTeamId && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTeamId("")} className="text-xs text-muted-foreground hover:text-foreground">
              Clear Filter
            </Button>
          )}
          <Badge variant="secondary" className="px-3 py-1 font-bold">Super Admin</Badge>
          {error && <Badge variant="destructive">API error</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Stat title="Users" value={data?.counts.users ?? 0} icon={Users} />
        <Stat title="Teams" value={data?.counts.teams ?? 0} icon={Layers} />
        <Stat title="Projects" value={data?.counts.projects ?? 0} icon={Briefcase} />
        <Stat title="Tasks" value={data?.counts.tasks ?? 0} icon={CheckSquare} />
        <Stat title="Messages" value={data?.counts.messages ?? 0} icon={MessageSquare} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Users</CardTitle>
            <Badge variant="outline" className="text-muted-foreground">
              last 8
            </Badge>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.recent_users ?? []).map((u: RecentUser) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.is_superuser ? (
                          <span className="text-[10px] font-bold text-primary uppercase">Super</span>
                        ) : u.is_staff ? (
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Staff</span>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(data?.recent_users?.length ?? 0) === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={18} className="text-muted-foreground" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Metric label="New users (7d)" value={data?.activity.new_users_7d ?? 0} />
            <Metric label="New users (30d)" value={data?.activity.new_users_30d ?? 0} />
            <Metric label="Task activity (7d)" value={data?.activity.task_activity_7d ?? 0} />
            <Metric label="Messages (7d)" value={data?.activity.messages_7d ?? 0} />
          </CardContent>
        </Card>
      </div>

      {/* ── Companies ── */}
      <CompanyManagementPanel isSuperuser={isSuperuser} />


      {/* ── Teams ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Teams</CardTitle>
            <p className="text-sm text-muted-foreground">Create and rename organizations.</p>
          </div>
          <Button onClick={openCreateTeam} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Team
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right">Members</th>
                  <th className="px-4 py-3 w-[60px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(teams?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                      No teams found.
                    </td>
                  </tr>
                ) : (
                  teams?.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.slug || "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{t.member_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEditTeam(t)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openMembers(t)} className="gap-2">
                              <UserPlus className="h-4 w-4" />
                              Members
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteTeam(t)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProjectsList
        selectedTeamId={selectedTeamId}
        onCreate={openCreateProject}
        onEdit={openEditProject}
        onDelete={openDeleteProject}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Users</CardTitle>
            <p className="text-sm text-muted-foreground">Create, edit, and deactivate accounts.</p>
          </div>
          <div className="flex items-center gap-3">
            {visibleSelectedCount > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                className="gap-2 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected ({visibleSelectedCount})
              </Button>
            )}
            <div className="w-64">
              <Input placeholder="Search name/email..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button onClick={openCreate} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-[52px]">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label="Select all"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      disabled={selectableUserIds.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isUsersLoading && (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                      Loading users...
                    </td>
                  </tr>
                )}
                {!isUsersLoading && (users?.length ?? 0) === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                      No users found.
                    </td>
                  </tr>
                )}
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${u.email}`}
                        checked={selectedIds.has(u.id)}
                        onChange={(e) => toggleSelectOne(u.id, e.target.checked)}
                        disabled={u.id === user.id}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.is_superuser ? (
                        <Badge variant="secondary">Superuser</Badge>
                      ) : u.is_staff ? (
                        <Badge variant="outline">Staff</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">User</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteUser.mutate(u.id)}
                            disabled={u.id === user.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected users?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. {visibleSelectedCount} user(s) will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDelete.mutate(Array.from(selectedIds))}
              disabled={bulkDelete.isPending || visibleSelectedCount === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {bulkDelete.isPending ? "Deleting..." : `Delete (${visibleSelectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit user" : "Create user"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update account details and permissions." : "Create a new account for the platform."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={!!editingUser}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)} placeholder="UTC" />
              <p className="text-xs text-muted-foreground">Use an IANA timezone, e.g. `UTC`, `Europe/London`.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{editingUser ? "New password (optional)" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingUser ? "Leave blank to keep current password" : "At least 6 characters"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formIsSuperuser ? "superuser" : formIsStaff ? "staff" : "user"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "superuser") {
                    setFormIsStaff(true);
                    setFormIsSuperuser(true);
                  } else if (val === "staff") {
                    setFormIsStaff(true);
                    setFormIsSuperuser(false);
                  } else {
                    setFormIsStaff(false);
                    setFormIsSuperuser(false);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="staff">Admin (Staff)</option>
                <option value="superuser">Super Admin</option>
              </select>

            </div>

            <div className="flex items-center gap-2 py-2">
              <input 
                id="active" 
                type="checkbox" 
                checked={formIsActive} 
                onChange={(e) => setFormIsActive(e.target.checked)} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="active" className="cursor-pointer">Active Account</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => upsertUser.mutate()}
              disabled={upsertUser.isPending || (!editingUser && (!formEmail || !formPassword))}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {upsertUser.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Rename Team" : "Create Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update the organization name." : "Create a new organization for projects and members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Acme Inc"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => upsertTeam.mutate()} disabled={upsertTeam.isPending || !teamName.trim()} className="gap-2">
              <Save className="h-4 w-4" />
              {upsertTeam.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              {deletingTeam ? (
                <>
                  This will permanently delete <span className="font-medium">{deletingTeam.name}</span> and all related data (members, projects, tasks).
                </>
              ) : (
                "This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTeam && deleteTeam.mutate(deletingTeam.id)}
              disabled={!deletingTeam || deleteTeam.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleteTeam.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={membersDialogOpen}
        onOpenChange={(open) => {
          setMembersDialogOpen(open);
          if (!open) {
            setMembersTeam(null);
            setMembers([]);
            setMemberEmail("");
            setMemberRole("member");
            setMemberSearch("");
            setSelectedUserIdToAdd(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Team members</DialogTitle>
            <DialogDescription>
              {membersTeam ? `Manage members for ${membersTeam.name}.` : "Manage team members."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="memberEmail">Add member</Label>
                <div className="relative">
                  <Input
                    id="memberEmail"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSelectedUserIdToAdd(null);
                      setMemberEmail(e.target.value);
                    }}
                    placeholder="Search users by name/email or type an email"
                    autoComplete="off"
                  />

                  {memberSearch.trim().length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      <div className="max-h-56 overflow-auto">
                        {isMemberSearchLoading && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                        )}

                        {!isMemberSearchLoading && (memberSearchResults?.length ?? 0) === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No users found.</div>
                        )}

                        {(memberSearchResults ?? [])
                          .filter((u) => !(members ?? []).some((m) => m.user.id === u.id))
                          .slice(0, 8)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserIdToAdd(u.id);
                                setMemberEmail(u.email);
                                setMemberSearch(u.email);
                              }}
                              className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{u.full_name || "—"}</div>
                                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                Select
                              </Badge>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedUserIdToAdd && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium">{memberEmail}</span>
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="memberRole">Role</Label>
                <select
                  id="memberRole"
                    value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as TeamRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                  <option value="ceo">CEO</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => addMember.mutate()}
                disabled={!membersTeam || addMember.isPending || (!selectedUserIdToAdd && !memberEmail.trim())}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {addMember.isPending ? "Adding..." : "Add member"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 w-[160px]">Role</th>
                    <th className="px-4 py-3 w-[90px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {membersLoading && (
                    <tr>
                      <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                        Loading members...
                      </td>
                    </tr>
                  )}
                  {!membersLoading && (members?.length ?? 0) === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                        No members found.
                      </td>
                    </tr>
                  )}
                  {(members ?? []).map((m: TeamMember) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{m.user.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={m.role}
                          onChange={(e) => {
                            if (!membersTeam) return;
                            updateMemberRole.mutate({ teamId: membersTeam.id, userId: m.user.id, role: e.target.value as TeamRole });
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="ceo">CEO</option>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!membersTeam) return;
                            removeMember.mutate({ teamId: membersTeam.id, userId: m.user.id });
                          }}
                          disabled={removeMember.isPending}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) {
            setEditingProject(null);
            setProjectName("");
            setProjectDescription("");
            setProjectIcon("📁");
            setProjectColor("#6366f1");
            setProjectTeamId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit project" : "Create project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update project details and assignment." : "Create a new project and assign it to a team."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="projectTeam">Team</Label>
              <select
                id="projectTeam"
                value={projectTeamId}
                onChange={(e) => setProjectTeamId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a team</option>
                {(teams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectName">Name</Label>
              <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project Alpha" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="What is this project about?"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="projectIcon">Icon (emoji)</Label>
                <Input id="projectIcon" value={projectIcon} onChange={(e) => setProjectIcon(e.target.value)} placeholder="📁" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectColor">Color</Label>
                <Input id="projectColor" type="color" value={projectColor} onChange={(e) => setProjectColor(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => upsertProject.mutate()}
              disabled={upsertProject.isPending || !projectName.trim() || !projectTeamId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {upsertProject.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              {deletingProject ? (
                <>
                  This will archive <span className="font-medium">{deletingProject.name}</span>.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProjectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingProject && deleteProject.mutate(deletingProject.id)}
              disabled={!deletingProject || deleteProject.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsList({
  selectedTeamId,
  onCreate,
  onEdit,
  onDelete,
}: {
  selectedTeamId: string;
  onCreate: () => void;
  onEdit: (p: AdminProjectSummary) => void | Promise<void>;
  onDelete: (p: AdminProjectSummary) => void;
}) {
  const { data: projects, isLoading } = useQuery<AdminProjectSummary[]>({
    queryKey: ["super-admin-projects", selectedTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminProjectSummary[]>>("/projects/", {
        params: selectedTeamId ? { team_id: selectedTeamId } : {}
      });
      return res.data.data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">Projects Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Monitor progress across all organizational projects.</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline">{projects?.length ?? 0} Total</Badge>
          <Button onClick={onCreate} size="sm" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Tasks</th>
                <th className="px-4 py-3 w-[60px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                    Loading projects...
                  </td>
                </tr>
              )}
              {!isLoading && (projects?.length ?? 0) === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                    No projects found for this selection.
                  </td>
                </tr>
              )}
              {projects?.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span className="text-lg">{p.icon || "📁"}</span>
                       <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.team_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === "active" ? "default" : "outline"} className="capitalize">
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                     {p.task_count || 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(p)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(p)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: ComponentType<{ size?: number | string }>;
}) {
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ceo: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    member: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${map[role] ?? map.viewer}`}>
      {role}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
