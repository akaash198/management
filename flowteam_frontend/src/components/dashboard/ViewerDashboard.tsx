"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import type { TeamMember } from "@/types";
import type { DashboardData } from "@/types/dashboard";
import { Section, SectionLink, EmptyNote, ProjectCard, ActivityRow, StatCard, RoleBadge, getTimeOfDay } from "./shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Eye, Activity, Briefcase, Users, TrendingUp, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AIGate } from "@/components/ai/AIGate";
import { DailyBriefingCard } from "@/components/ai/DailyBriefingCard";

interface Props {
  data: DashboardData;
  members: TeamMember[] | undefined;
  activeTeamId: string;
}

export function ViewerDashboard({ data, members, activeTeamId }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const projectItems = data.projects.items ?? [];

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"projects" | "members">("projects");

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projectItems;
    const q = search.toLowerCase();
    return projectItems.filter((p) => p.name.toLowerCase().includes(q));
  }, [projectItems, search]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members ?? [];
    const q = search.toLowerCase();
    return (members ?? []).filter((m) =>
      m.user.full_name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted/70 border border-border">
              <Eye size={12} className="text-muted-foreground" />
            </div>
            <h1 className="text-[20px] font-bold tracking-[-0.03em] text-foreground">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <p className="ml-8 text-[12.5px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} · Read-only access
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground shrink-0">
          <Eye size={10} />View only
        </span>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-4">
        <Eye size={15} className="mt-0.5 shrink-0 text-muted-foreground/60" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">You have viewer access</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground/70">
            You can browse projects and team activity, but cannot create or edit tasks. Contact an admin to upgrade your role.
          </p>
        </div>
      </div>

      {/* ── At-a-glance stats ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Active projects"  value={data.projects.active}                      icon={Briefcase}   iconColor="text-primary"    iconBg="bg-primary/10" />
        <StatCard title="Team members"     value={data.team_stats.total_members}             icon={Users}       iconColor="text-violet-500" iconBg="bg-violet-50 dark:bg-violet-950/40" />
        <StatCard title="Completed tasks"  value={data.team_stats.tasks_completed_this_week} icon={TrendingUp}  iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <AIGate featureName="Daily briefing">
            <DailyBriefingCard teamId={activeTeamId} />
          </AIGate>

          {/* Tabs: Projects | Members */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/5 px-4 py-2.5 gap-3">
              <div className="flex gap-1">
                {(["projects", "members"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                      activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab}
                    <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      activeTab === tab ? "bg-white/20 text-white" : "bg-muted-foreground/10"
                    )}>
                      {tab === "projects" ? projectItems.length : (members ?? []).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative max-w-[200px] flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${activeTab}…`}
                  className="pl-7 h-7 text-[12px] bg-muted/30 border-0 focus-visible:ring-0"
                />
              </div>

              {activeTab === "projects" && <SectionLink href="/projects">View all</SectionLink>}
            </div>

            {/* Projects tab */}
            {activeTab === "projects" && (
              filteredProjects.length === 0 ? (
                <p className="px-5 py-6 text-[12.5px] text-muted-foreground/70 italic">
                  {search ? "No projects match your search." : "No projects available."}
                </p>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {filteredProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              )
            )}

            {/* Members tab */}
            {activeTab === "members" && (
              filteredMembers.length === 0 ? (
                <p className="px-5 py-6 text-[12.5px] text-muted-foreground/70 italic">
                  {search ? "No members match your search." : "No members found."}
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredMembers.map((m) => <ViewerMemberRow key={m.user.id} member={m} />)}
                </div>
              )
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <Section title="Team activity" icon={<Activity size={13} className="text-muted-foreground" />}>
            <div className="divide-y divide-border/60">
              {(data.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data.activity.slice(0, 15).map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function ViewerMemberRow({ member }: { member: TeamMember }) {
  const initials = (member.user.full_name || member.user.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={member.user.avatar_url || ""} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-foreground">{member.user.full_name || "—"}</p>
        <p className="truncate text-[11px] text-muted-foreground/60">{member.user.email}</p>
      </div>
      <RoleBadge role={member.role} />
    </div>
  );
}
