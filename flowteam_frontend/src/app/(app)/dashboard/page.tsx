"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import api from "@/lib/api";
import { DashboardData } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Clock,
  TrendingUp,
  Briefcase,
  ChevronRight,
  Activity,
  ArrowUpRight,
  BarChart3,
  Gauge,
  CalendarDays,
  Zap,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCcw,
  BookmarkPlus,
  Filter,
  FolderPlus,
  ListTodo,
  CalendarRange,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ApiResponse, TeamMember } from "@/types";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AIGate } from "@/components/ai/AIGate";
import { DailyBriefingCard } from "@/components/ai/DailyBriefingCard";
import { FocusCard } from "@/components/ai/FocusCard";

type DashboardTask = DashboardData["my_tasks"]["recent"][number];
type DashboardProject = DashboardData["projects"]["items"][number];
type QuickLinkProject = DashboardData["quick_links"][number];
type DashboardActivity = DashboardData["activity"][number];
type PriorityKey = keyof DashboardData["my_tasks"]["by_priority"];
type TaskFilterState = "all" | "overdue" | "today" | "upcoming";
type SavedView = {
  id: string;
  name: string;
  priority: string;
  projectId: string;
  taskState: TaskFilterState;
  search: string;
};
type SavedViewMap = Record<string, SavedView[]>;

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"] as PriorityKey[];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { activeTeamId, fetchTeams, isLoading: isTeamsLoading } = useTeamStore();
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [taskState, setTaskState] = useState<TaskFilterState>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [savedViewMap, setSavedViewMap] = useState<SavedViewMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("dashboard-views");
      return raw ? (JSON.parse(raw) as SavedViewMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (user?.is_superuser) router.replace("/super-admin/dashboard");
  }, [user?.is_superuser, router]);

  useEffect(() => {
    try {
      localStorage.setItem("dashboard-views", JSON.stringify(savedViewMap));
    } catch {
      // ignore storage issues
    }
  }, [savedViewMap]);

  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardData>>("/dashboard/", {
        params: { team_id: activeTeamId },
      });
      return res.data.data;
    },
    enabled: !!activeTeamId,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ["members", activeTeamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return res.data.data;
    },
    enabled: !!activeTeamId,
  });

  const reportingTo = useMemo(() => {
    if (!members || !user) return null;
    const myRole = members.find((m) => m.user.id === user.id)?.role;
    if (myRole === "ceo") return null;
    if (myRole === "manager" || myRole === "admin") return members.find((m) => m.role === "ceo");
    return members.find((m) => m.role === "manager") ?? members.find((m) => m.role === "ceo");
  }, [members, user]);

  if (isTeamsLoading || isLoading || !activeTeamId) return <DashboardSkeleton />;

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const savedViews = savedViewMap[activeTeamId] ?? [];
  const recentTasks = data?.my_tasks.recent ?? [];
  const projectItems = data?.projects.items ?? [];
  const search = deferredSearch.trim().toLowerCase();

  const filteredTasks = recentTasks.filter((task) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search) ||
      (task.project_name ?? "").toLowerCase().includes(search) ||
      (task.column_name ?? "").toLowerCase().includes(search);
    const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
    const matchesProject = selectedProjectId === "all" || task.project === selectedProjectId;
    const matchesState =
      taskState === "all" ||
      (taskState === "overdue" && task.is_overdue) ||
      (taskState === "today" && !task.is_overdue && !!task.due_date) ||
      (taskState === "upcoming" && !task.is_overdue && !task.due_date);

    return matchesSearch && matchesPriority && matchesProject && matchesState;
  });

  const filteredProjects = projectItems.filter((project) => {
    const matchesSearch =
      !search ||
      project.name.toLowerCase().includes(search) ||
      (project.status ?? "").toLowerCase().includes(search);
    const matchesProject = selectedProjectId === "all" || project.id === selectedProjectId;
    return matchesSearch && matchesProject;
  });

  const focusTasks = [...filteredTasks]
    .sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .slice(0, 4);

  const anyFiltersActive =
    search.length > 0 || selectedPriority !== "all" || selectedProjectId !== "all" || taskState !== "all";

  const priorityEntries = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: anyFiltersActive
      ? filteredTasks.filter((task) => task.priority === priority).length
      : data?.my_tasks.by_priority?.[priority] ?? 0,
  }));

  const quickProjects = (data?.quick_links ?? []).filter((project) => {
    const matchesSearch = !search || project.name.toLowerCase().includes(search);
    const matchesProject = selectedProjectId === "all" || project.id === selectedProjectId;
    return matchesSearch && matchesProject;
  }).slice(0, 4);

  const strongestProject = [...filteredProjects].sort((a, b) => b.progress_percent - a.progress_percent)[0] ?? null;
  const mostActiveMember = data?.team_stats.most_active_member ?? null;
  const deliveryVelocity = Math.min(
    100,
    Math.round(
      ((data?.team_stats.tasks_completed_this_week ?? 0) /
        Math.max(data?.team_stats.tasks_created_this_week ?? 0, 1)) *
        100
    )
  );
  const workloadPressure = Math.min(
    100,
    Math.round(
      (((data?.my_tasks.overdue ?? 0) + (data?.my_tasks.due_today ?? 0)) /
        Math.max(data?.my_tasks.total ?? 0, 1)) *
        100
    )
  );
  const focusLabel = getFocusLabel({
    selectedPriority,
    selectedProjectId,
    taskState,
    projects: projectItems,
    search,
  });

  const clearFilters = () => {
    setSearchText("");
    setSelectedPriority("all");
    setSelectedProjectId("all");
    setTaskState("all");
  };

  const saveCurrentView = () => {
    const suggested = `View ${savedViews.length + 1}`;
    const name =
      typeof window !== "undefined" ? window.prompt("Save dashboard view as:", suggested)?.trim() : suggested;
    if (!name) return;
    const next: SavedView = {
      id: `view-${Date.now()}`,
      name,
      priority: selectedPriority,
      projectId: selectedProjectId,
      taskState,
      search: searchText,
    };
    setSavedViewMap((prev) => ({
      ...prev,
      [activeTeamId]: [next, ...(prev[activeTeamId] ?? [])].slice(0, 6),
    }));
  };

  const applyView = (view: SavedView) => {
    setSelectedPriority(view.priority);
    setSelectedProjectId(view.projectId);
    setTaskState(view.taskState);
    setSearchText(view.search);
  };

  const removeView = (id: string) => {
    setSavedViewMap((prev) => ({
      ...prev,
      [activeTeamId]: (prev[activeTeamId] ?? []).filter((view) => view.id !== id),
    }));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Good {getTimeOfDay()}, {firstName} {"\uD83D\uDC4B"}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Here&apos;s what&apos;s happening with your projects today.
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" className="gap-2" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCcw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link
            href="/dashboard/my-tasks"
            className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
          >
            View all tasks <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AIGate featureName="Daily AI Briefing">
          <DailyBriefingCard teamId={activeTeamId} />
        </AIGate>
        <AIGate featureName="Focus Recommendations">
          <FocusCard teamId={activeTeamId} />
        </AIGate>
      </div>

      <Section
        title="Workspace lens"
        icon={<Filter size={14} className="text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAutoRefresh((v) => !v)}>
              <RefreshCcw size={12} className={cn(autoRefresh && "animate-spin")} />
              {autoRefresh ? "Live 30s" : "Live off"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={saveCurrentView}>
              <BookmarkPlus size={12} />
              Save view
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search tasks or projects"
              className="xl:col-span-2"
            />
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_ORDER.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {capitalize(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectItems.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={taskState} onValueChange={(value) => setTaskState(value as TaskFilterState)}>
              <SelectTrigger>
                <SelectValue placeholder="Task state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All task states</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="upcoming">No due date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Saved views:</span>
            {savedViews.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">None yet</span>
            ) : (
              savedViews.map((view) => (
                <div key={view.id} className="inline-flex items-center rounded-full border border-border bg-background">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[11px] font-medium text-foreground"
                    onClick={() => applyView(view)}
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    className="border-l border-border px-2 py-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => removeView(view.id)}
                    aria-label={`Remove ${view.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
            {anyFiltersActive && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <HeroPanel
          firstName={firstName}
          dueThisWeek={data?.my_tasks.due_this_week ?? 0}
          activeProjects={filteredProjects.length}
          deliveryVelocity={deliveryVelocity}
          mostActiveMember={mostActiveMember?.full_name ?? null}
          strongestProject={strongestProject?.name ?? null}
          focusLabel={focusLabel}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <InsightCard
            title="Focus queue"
            icon={<Zap size={14} className="text-amber-600" />}
            body={`${focusTasks.length} high-attention item${focusTasks.length === 1 ? "" : "s"} ready for action`}
            metric={focusTasks.length}
            accent="amber"
          />
          <InsightCard
            title="Execution health"
            icon={<Gauge size={14} className="text-emerald-600" />}
            body={`${workloadPressure}% of your open workload needs attention soon`}
            metric={`${workloadPressure}%`}
            accent={workloadPressure > 50 ? "red" : "emerald"}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open tasks"
          value={data?.my_tasks.total ?? 0}
          icon={Briefcase}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          href="/dashboard/my-tasks"
        />
        <StatCard
          title="Overdue"
          value={data?.my_tasks.overdue ?? 0}
          icon={AlertCircle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          danger={Boolean(data?.my_tasks.overdue)}
          href="/dashboard/my-tasks?due=overdue"
        />
        <StatCard
          title="Due today"
          value={data?.my_tasks.due_today ?? 0}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          href="/dashboard/my-tasks?due=today"
        />
        <StatCard
          title="Completed this week"
          value={data?.team_stats.tasks_completed_this_week ?? 0}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Section
            title="Smart focus"
            icon={<Sparkles size={14} className="text-primary" />}
            action={<SectionLink href="/dashboard/my-tasks">Open planner</SectionLink>}
          >
            {focusTasks.length === 0 ? (
              <EmptyNote>No tasks match the current lens. Adjust filters or create more work items.</EmptyNote>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {focusTasks.map((task) => (
                  <FocusTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </Section>

          <Section title="My recent tasks" action={<SectionLink href="/dashboard/my-tasks">View all</SectionLink>}>
            <div className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <EmptyNote>No recent tasks match the current filters.</EmptyNote>
              ) : (
                filteredTasks.map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </div>
          </Section>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Active projects</h2>
              <SectionLink href="/projects">View all</SectionLink>
            </div>
            {filteredProjects.length === 0 ? (
              <EmptyCard>No projects match the current lens.</EmptyCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>

          <Section
            title="Quick access"
            icon={<CalendarDays size={14} className="text-primary" />}
            action={<SectionLink href="/projects">Open workspace</SectionLink>}
          >
            {quickProjects.length === 0 ? (
              <EmptyNote>No quick links match the current lens.</EmptyNote>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                {quickProjects.map((project) => (
                  <QuickAccessProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Quick actions" icon={<Plus size={14} className="text-muted-foreground" />}>
            <div className="grid gap-3 p-4">
              <QuickActionLink href="/projects" icon={<FolderPlus size={14} />} label="Create project" description="Start a new workstream" />
              <QuickActionLink href="/dashboard/my-tasks" icon={<ListTodo size={14} />} label="Open task queue" description="Review assigned work" />
              <QuickActionLink href="/calendar" icon={<CalendarRange size={14} />} label="Plan schedule" description="See due dates and deadlines" />
              <QuickActionLink href="/projects" icon={<ArrowRight size={14} />} label="Review all projects" description="Jump into active delivery" />
            </div>
          </Section>

          <Section title="Priority radar" icon={<BarChart3 size={14} className="text-muted-foreground" />}>
            <div className="space-y-3 p-4">
              {priorityEntries.map((item) => (
                <PriorityBar
                  key={item.priority}
                  label={item.priority}
                  value={item.count}
                  max={Math.max(...priorityEntries.map((entry) => entry.count), 1)}
                />
              ))}
            </div>
          </Section>

          <Section title="Performance pulse" icon={<Gauge size={14} className="text-muted-foreground" />}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <MiniMetric label="Created this week" value={data?.team_stats.tasks_created_this_week ?? 0} tone="neutral" />
              <MiniMetric label="Completed" value={data?.team_stats.tasks_completed_this_week ?? 0} tone="success" />
              <MiniMetric label="Delivery rate" value={`${deliveryVelocity}%`} tone={deliveryVelocity >= 75 ? "success" : "warning"} />
              <MiniMetric label="Active members" value={data?.team_stats.total_members ?? 0} tone="neutral" />
            </div>
          </Section>

          <Section title="Team activity" icon={<Activity size={14} className="text-muted-foreground" />}>
            <div className="divide-y divide-border">
              {(data?.activity?.length ?? 0) === 0 ? (
                <EmptyNote>No recent activity.</EmptyNote>
              ) : (
                data?.activity.map((item) => <ActivityItem key={item.id} item={item} />)
              )}
            </div>
          </Section>

          {reportingTo && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={reportingTo.user.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {reportingTo.user.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reporting to</p>
                <p className="truncate text-[13px] font-semibold">{reportingTo.user.full_name}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] font-semibold capitalize">
                {reportingTo.role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  danger,
  href,
}: {
  title: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor: string;
  iconBg: string;
  danger?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="group cursor-default rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <p className={cn("text-[28px] font-bold leading-none tracking-tight", danger && value > 0 && "text-destructive")}>{value}</p>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function HeroPanel({
  firstName,
  dueThisWeek,
  activeProjects,
  deliveryVelocity,
  mostActiveMember,
  strongestProject,
  focusLabel,
}: {
  firstName: string;
  dueThisWeek: number;
  activeProjects: number;
  deliveryVelocity: number;
  mostActiveMember: string | null;
  strongestProject: string | null;
  focusLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(91,94,222,0.08),rgba(91,94,222,0.02)_45%,rgba(255,255,255,0.96)_100%)] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-semibold text-primary">
            <Sparkles size={12} />
            Daily command center
          </div>
          <h2 className="mt-4 text-[24px] font-semibold tracking-tight text-foreground">
            Lead the day with clarity, {firstName}.
          </h2>
          <p className="mt-2 max-w-lg text-[13px] leading-6 text-muted-foreground">
            Your dashboard now supports custom lenses, saved views, quick actions, and live refresh over the current team signal.
          </p>
        </div>
        <Link
          href="/dashboard/my-tasks"
          className="hidden items-center gap-1 rounded-full border border-primary/15 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-white md:flex"
        >
          Open my queue
          <ArrowRight size={12} />
        </Link>
      </div>
      <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-[12px] text-muted-foreground">
        <span className="font-semibold text-foreground">Current lens:</span> {focusLabel}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat label="Due this week" value={dueThisWeek} sublabel="planned commitments" />
        <HeroStat label="Visible projects" value={activeProjects} sublabel="matching current lens" />
        <HeroStat label="Delivery velocity" value={`${deliveryVelocity}%`} sublabel="completed vs created" />
        <HeroStat
          label="Team signal"
          value={mostActiveMember ?? "No data"}
          sublabel={strongestProject ? `Strongest project: ${strongestProject}` : "Awaiting more execution data"}
        />
      </div>
    </div>
  );
}

function HeroStat({ label, value, sublabel }: { label: string; value: string | number; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-[24px] font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  body,
  metric,
  accent,
}: {
  title: string;
  icon: ReactNode;
  body: string;
  metric: string | number;
  accent: "amber" | "emerald" | "red";
}) {
  const accentClasses = {
    amber: "border-amber-100 bg-amber-50/60",
    emerald: "border-emerald-100 bg-emerald-50/60",
    red: "border-red-100 bg-red-50/60",
  }[accent];

  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", accentClasses)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <div className="text-[22px] font-semibold tracking-tight text-foreground">{metric}</div>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-muted-foreground">{body}.</p>
    </div>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
      {children} <ChevronRight size={12} />
    </Link>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-5 py-5 text-[13px] text-muted-foreground">{children}</p>;
}

function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 text-[13px] text-muted-foreground">{children}</div>;
}

function FocusTaskCard({ task }: { task: DashboardTask }) {
  return (
    <Link
      href={`/projects/${task.project}`}
      className="rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{task.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {task.project_name} · {task.column_name}
          </p>
        </div>
        <PriorityPill priority={task.priority as PriorityKey} />
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className={cn("font-medium", task.is_overdue ? "text-destructive" : "text-muted-foreground")}>
          {task.due_date ? (task.is_overdue ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`) : "No due date"}
        </span>
        <span className="text-primary">Open</span>
      </div>
    </Link>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <div className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium transition-colors group-hover:text-primary">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{task.project_name}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="text-[11px] text-muted-foreground/60">{task.column_name}</span>
        </div>
      </div>
      {task.due_date && (
        <span
          className={cn(
            "ml-4 shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold",
            task.is_overdue ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {task.due_date}
        </span>
      )}
    </div>
  );
}

function QuickAccessProjectCard({ project }: { project: QuickLinkProject }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base shadow-inner"
            style={{ backgroundColor: `${project.color ?? "#5B5EDE"}18`, color: project.color ?? "#5B5EDE" }}
          >
            {project.icon ?? "•"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground group-hover:text-primary">{project.name}</p>
            <p className="text-[11px] text-muted-foreground">{project.completed_task_count}/{project.task_count} tasks complete</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectCard({ project }: { project: DashboardProject }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-px hover:shadow-md">
        <div className="h-[3px] w-full" style={{ backgroundColor: project.color ?? "#5B5EDE" }} />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
              {project.icon ?? "\uD83D\uDCCB"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold transition-colors group-hover:text-primary">{project.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{project.status}</p>
            </div>
            <span className="ml-auto shrink-0 text-[11px] font-semibold text-muted-foreground">{project.progress_percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progress_percent}%`, backgroundColor: project.color ?? "#5B5EDE" }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[8px] font-bold uppercase text-primary"
                  title={member.full_name}
                >
                  {member.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </div>
              ))}
              {project.members.length > 4 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium text-muted-foreground">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {project.completed_tasks}/{project.total_tasks} tasks
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActionLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}

function PriorityBar({ label, value, max }: { label: PriorityKey; value: number; max: number }) {
  const tones: Record<PriorityKey, string> = {
    urgent: "bg-red-500",
    high: "bg-amber-500",
    normal: "bg-primary",
    low: "bg-emerald-500",
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium capitalize text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tones[label])} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClass = {
    neutral: "bg-muted/50 text-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={cn("rounded-xl px-3 py-3", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-[20px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PriorityPill({ priority }: { priority: PriorityKey }) {
  const classes: Record<PriorityKey, string> = {
    urgent: "border-red-200 bg-red-50 text-red-700",
    high: "border-amber-200 bg-amber-50 text-amber-700",
    normal: "border-primary/20 bg-primary/10 text-primary",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", classes[priority])}>
      {priority}
    </span>
  );
}

function ActivityItem({ item }: { item: DashboardActivity }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
        <AvatarImage src={item.actor.avatar ?? ""} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">{item.actor.full_name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{item.actor.full_name}</span>{" "}
          {item.verb} <span className="font-medium text-primary">{item.task_title}</span> in{" "}
          <span className="font-medium text-foreground/70">{item.project_name}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/50">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-7 p-6 animate-pulse">
      <div className="h-7 w-52 rounded-lg bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="h-52 rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="h-56 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-44 rounded-xl bg-muted" />
        </div>
        <div className="space-y-5">
          <div className="h-56 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-96 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function getFocusLabel({
  selectedPriority,
  selectedProjectId,
  taskState,
  projects,
  search,
}: {
  selectedPriority: string;
  selectedProjectId: string;
  taskState: TaskFilterState;
  projects: DashboardProject[];
  search: string;
}) {
  const parts: string[] = [];
  if (selectedPriority !== "all") parts.push(`${capitalize(selectedPriority)} priority`);
  if (selectedProjectId !== "all") {
    const projectName = projects.find((project) => project.id === selectedProjectId)?.name ?? "selected project";
    parts.push(projectName);
  }
  if (taskState !== "all") parts.push(taskState === "today" ? "due today" : taskState);
  if (search) parts.push(`search: "${search}"`);
  return parts.length ? parts.join(" · ") : "All work across the current team";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
