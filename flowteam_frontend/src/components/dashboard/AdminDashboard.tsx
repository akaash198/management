"use client";

import { useMemo, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import {
  Section, SectionLink, EmptyNote, StatCard, ActivityRow,
  MiniMetric, RoleBadge, VelocityGauge, getTimeOfDay,
} from "./shared";
import { MissedMessagesPulse } from "./MissedMessagesPulse";
import { InviteMemberModal } from "./InviteMemberModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Briefcase, AlertCircle, Activity, BarChart3,
  RefreshCcw, UserPlus, FolderPlus, Settings, ClipboardList,
  Shield, TrendingUp, Plus, MoreHorizontal, Loader2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

type Role = "manager" | "member" | "viewer";
const ROLE_LABELS: Record<string, string> = { ceo: "CEO", admin: "Admin", manager: "Manager", member: "Employee", viewer: "Viewer" };
const CHANGEABLE_ROLES: Role[] = ["manager", "member", "viewer"];

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
  onRefresh: () => void;
  isFetching: boolean;
}

export function AdminDashboard({ data, members, activeTeamId, onRefresh, isFetching }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<TeamMember | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<Role>("member");
  const [savingRole, setSavingRole] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const totalMembers      = data.team_stats.total_members;
  const activeProjects    = data.projects.active;
  const completedThisWeek = data.team_stats.tasks_completed_this_week;
  const createdThisWeek   = data.team_stats.tasks_created_this_week;
  const overdueTotal      = data.my_tasks.overdue;
  const viewerCount       = (members ?? []).filter((m) => m.role === "viewer").length;

  const deliveryVelocity = Math.min(100, Math.round((completedThisWeek / Math.max(createdThisWeek, 1)) * 100));

  const sortedMembers = useMemo(
    () => [...(members ?? [])].sort((a, b) => {
      const order = ["ceo","admin","manager","member","viewer"];
      return order.indexOf(a.role) - order.indexOf(b.role);
    }),
    [members]
  );

  const roleCounts = useMemo(
    () => (["ceo","admin","manager","member","viewer"] as const).map((role) => ({
      role, count: (members ?? []).filter((m) => m.role === role).length,
    })).filter((r) => r.count > 0),
    [members]
  );

  const openChangeRole = (member: TeamMember) => {
    setChangeRoleTarget(member);
    setChangeRoleValue(member.role as Role);
  };

  const handleChangeRole = useCallback(async () => {
    if (!changeRoleTarget) return;
    setSavingRole(true);
    try {
      await api.patch<ApiResponse<unknown>>(`/teams/${activeTeamId}/members/${changeRoleTarget.id}/`, { role: changeRoleValue });
      toast.success(`${changeRoleTarget.user.full_name} is now ${ROLE_LABELS[changeRoleValue]}`);
      setChangeRoleTarget(null);
      onRefresh();
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change role");
    } finally {
      setSavingRole(false);
    }
  }, [changeRoleTarget, changeRoleValue, activeTeamId, onRefresh, queryClient]);

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/teams/${activeTeamId}/members/${removeTarget.id}/`);
      toast.success(`${removeTarget.user.full_name} removed from team`);
      setRemoveTarget(null);
      onRefresh();
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, activeTeamId, onRefresh, queryClient]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} teamId={activeTeamId} onSuccess={onRefresh} />

      {/* Change role dialog */}
      <Dialog open={!!changeRoleTarget} onOpenChange={(v) => !v && setChangeRoleTarget(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Change role</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Update role for <span className="font-semibold text-foreground">{changeRoleTarget?.user.full_name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={changeRoleValue} onValueChange={(v) => setChangeRoleValue(v as Role)}>
              <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANGEABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-[13px]">{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setChangeRoleTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleChangeRole} disabled={savingRole} className="gap-1.5">
              {savingRole && <Loader2 size={12} className="animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Remove member</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Are you sure you want to remove <span className="font-semibold text-foreground">{removeTarget?.user.full_name}</span> from the team? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing} className="gap-1.5">
              {removing && <Loader2 size={12} className="animate-spin" />}Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MissedMessagesPulse />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40">
              <Shield size={12} className="text-blue-500" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Admin overview
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 h-8 text-[12px]">
            <UserPlus size={12} />Invite
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={isFetching}>
            <RefreshCcw size={12} className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Viewer callout ── */}
      {viewerCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 px-5 py-3.5">
          <UserPlus size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
              {viewerCount} viewer{viewerCount > 1 ? "s" : ""} with limited access
            </p>
            <p className="text-[11.5px] text-muted-foreground/70">Consider promoting them to Employee for full access</p>
          </div>
          <Link href="/settings/members" className="shrink-0 rounded-lg border border-amber-300/50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors dark:border-amber-700/30 dark:text-amber-300">
            Manage →
          </Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total members"    value={totalMembers}   icon={Users}       iconColor="text-blue-500"    iconBg="bg-blue-50 dark:bg-blue-950/40"      href="/settings/members" />
        <StatCard title="Viewers / limited" value={viewerCount}   icon={UserPlus}    iconColor="text-amber-500"   iconBg="bg-amber-50 dark:bg-amber-950/40"    href="/settings/members" />
        <StatCard title="Active projects"  value={activeProjects} icon={Briefcase}   iconColor="text-primary"     iconBg="bg-primary/10"                        href="/projects" />
        <StatCard title="Overdue tasks"    value={overdueTotal}   icon={AlertCircle} iconColor="text-destructive" iconBg="bg-destructive/10" danger={overdueTotal > 0} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">

          {/* Member roster with inline actions */}
          <Section
            title={`Member roster (${sortedMembers.length})`}
            icon={<Users size={13} className="text-blue-500" />}
            action={
              <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-0.5 text-[11.5px] font-semibold text-primary/70 hover:text-primary transition-colors">
                Invite <Plus size={10} className="opacity-60" />
              </button>
            }
          >
            {sortedMembers.length === 0 ? (
              <EmptyNote>No members found.</EmptyNote>
            ) : (
              <div className="divide-y divide-border/60">
                {sortedMembers.map((m) => (
                  <AdminMemberRow
                    key={m.user.id}
                    member={m}
                    isSelf={m.user.id === user?.id}
                    onChangeRole={openChangeRole}
                    onRemove={(member) => setRemoveTarget(member)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Team activity */}
          <Section title="Team activity" icon={<Activity size={13} className="text-muted-foreground" />}>
            <div className="divide-y divide-border/60">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.slice(0, 10).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Admin actions */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/60 px-5 py-3 bg-muted/5">
              <h2 className="text-[12.5px] font-semibold text-foreground flex items-center gap-2"><Plus size={13} className="text-muted-foreground" />Admin actions</h2>
            </div>
            <div className="grid gap-2 p-3">
              {[
                { href: "/settings/members?action=invite", icon: <UserPlus size={13} />, label: "Invite member",  desc: "Send an invitation" },
                { href: "/projects",                        icon: <FolderPlus size={13} />, label: "Create project",  desc: "New workstream" },
                { href: "/settings/audit-log",             icon: <ClipboardList size={13} />, label: "Audit log",  desc: "Review all activity" },
                { href: "/settings",                        icon: <Settings size={13} />,  label: "Team settings", desc: "Configure workspace" },
              ].map(({ href, icon, label, desc }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 hover:border-primary/20 hover:bg-primary/3 transition-all group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors">{icon}</div>
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-foreground">{label}</div><div className="text-[11px] text-muted-foreground/70">{desc}</div></div>
                  <ArrowUpRight size={12} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Velocity */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Delivery velocity</p>
            <div className="flex items-center justify-center py-2">
              <VelocityGauge pct={deliveryVelocity} label="completed vs created" />
            </div>
          </div>

          <Section title="Capacity this week" icon={<BarChart3 size={13} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MiniMetric label="Created"   value={createdThisWeek}        tone="neutral" />
              <MiniMetric label="Completed" value={completedThisWeek}      tone="success" />
              <MiniMetric label="Velocity"  value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Overdue"   value={overdueTotal}           tone={overdueTotal > 0 ? "danger" : "neutral"} />
            </div>
          </Section>

          <Section title="Team composition" icon={<TrendingUp size={13} className="text-muted-foreground" />}>
            <div className="space-y-2.5 p-3">
              {roleCounts.map(({ role, count }) => (
                <div key={role} className="flex items-center justify-between">
                  <RoleBadge role={role} />
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${(count / Math.max(totalMembers, 1)) * 100}%` }} />
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums text-foreground w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function AdminMemberRow({ member, isSelf, onChangeRole, onRemove }: {
  member: TeamMember;
  isSelf: boolean;
  onChangeRole: (m: TeamMember) => void;
  onRemove: (m: TeamMember) => void;
}) {
  const initials = (member.user.full_name || member.user.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const canChange = !isSelf && member.role !== "ceo";

  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12.5px] font-medium text-foreground">{member.user.full_name || "—"}</p>
          {isSelf && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">You</span>}
        </div>
        <p className="truncate text-[11px] text-muted-foreground/60">{member.user.email}</p>
      </div>
      <RoleBadge role={member.role} />
      {canChange ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-lg p-1 text-muted-foreground/40 hover:bg-muted hover:text-foreground transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onChangeRole(member)} className="text-[12.5px]">Change role</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRemove(member)} className="text-[12.5px] text-destructive focus:text-destructive">
              Remove from team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="w-7" />
      )}
    </div>
  );
}
