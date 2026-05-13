"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse } from "@/types";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Users, Layers, Briefcase, CheckSquare, MessageSquare, Activity, MoreHorizontal, Plus, Save, Trash2 } from "lucide-react";
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


  const { data, isLoading, error } = useQuery<SuperAdminDashboard>({
    queryKey: ["super-admin-dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SuperAdminDashboard>>("/dashboard/super-admin/");
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


  const selectableUserIds = useMemo(() => {
    const me = user?.id;
    return (users ?? []).filter((u) => u.id !== me).map((u) => u.id);
  }, [users, user?.id]);

  useEffect(() => {
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

  return (
    <div className="p-8 space-y-8 min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Global overview of the platform.</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* ── Users ── */}
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

      {/* ── Bulk delete dialog ── */}
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

      {/* ── User create/edit dialog ── */}
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
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
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

    </div>
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
