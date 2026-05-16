"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useTeamPermissions } from "@/hooks/usePermissions";
import type { Task, TaskFilters, TaskPriority } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Search, CheckCircle2, Circle, AlertCircle, Clock,
  ArrowUpDown, ChevronDown, ChevronUp, Filter, X,
  ListTodo, CalendarDays, Briefcase, Zap,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type DueFilter = "all" | "overdue" | "today" | "this_week";
type StatusFilter = "open" | "done" | "all";
type PriorityFilter = "all" | TaskPriority;
type SortKey = "due_date" | "priority" | "project" | "title";
type SortDir = "asc" | "desc";
type GroupKey = "priority" | "project" | "due" | "none";

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high:   "bg-amber-500",
  normal: "bg-primary",
  low:    "bg-muted-foreground/30",
};
const PRIORITY_LABEL_COLOR: Record<TaskPriority, string> = {
  urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
  high:   "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  normal: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
  low:    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

function asDueFilter(v: string | null): DueFilter {
  if (v === "overdue" || v === "today" || v === "this_week") return v;
  return "all";
}

function formatDue(d: string | null): { label: string; tone: string } {
  if (!d) return { label: "No due date", tone: "text-muted-foreground/50" };
  const date = parseISO(d);
  if (isPast(date) && !isToday(date)) return { label: `Overdue · ${format(date, "MMM d")}`, tone: "text-destructive font-semibold" };
  if (isToday(date)) return { label: "Due today", tone: "text-amber-600 dark:text-amber-400 font-semibold" };
  if (isTomorrow(date)) return { label: `Tomorrow · ${format(date, "MMM d")}`, tone: "text-foreground/70" };
  return { label: format(date, "MMM d, yyyy"), tone: "text-muted-foreground/70" };
}

function getDueGroup(d: string | null, isDone: boolean): string {
  if (isDone) return "Completed";
  if (!d) return "No due date";
  const date = parseISO(d);
  if (isPast(date) && !isToday(date)) return "Overdue";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMMM d, yyyy");
}

export default function MyTasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeTeamId, fetchTeams, teams } = useTeamStore();
  const { canCreateProject } = useTeamPermissions();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const due = asDueFilter(searchParams.get("due"));

  useEffect(() => { void fetchTeams(); }, [fetchTeams]);
  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);

  const filters = useMemo<TaskFilters>(() => {
    if (!activeTeamId || !user?.id) return {};
    return {
      team_id: activeTeamId,
      assignee_id: user.id,
      ...(status !== "all" ? { status } : {}),
      ...(due !== "all" ? { due } : {}),
    };
  }, [activeTeamId, due, status, user]);

  const { data: rawTasks = [], isLoading } = useTasks(filters);

  const tasks = useMemo(() => {
    let filtered = rawTasks;
    if (priorityFilter !== "all") filtered = filtered.filter((t) => t.priority === priorityFilter);
    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.project_name ?? "").toLowerCase().includes(q) ||
        (t.column_name ?? "").toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      else if (sortKey === "due_date") {
        const ad = a.due_date ?? "9999-12-31";
        const bd = b.due_date ?? "9999-12-31";
        cmp = ad.localeCompare(bd);
      } else if (sortKey === "project") cmp = (a.project_name ?? "").localeCompare(b.project_name ?? "");
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rawTasks, priorityFilter, deferredSearch, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ label: "", tasks }];
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      let key = "";
      if (groupBy === "priority") key = t.priority;
      else if (groupBy === "project") key = t.project_name ?? "No project";
      else if (groupBy === "due") key = getDueGroup(t.due_date, false);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }));
  }, [tasks, groupBy]);

  const overdueCount = useMemo(() => rawTasks.filter((t) => t.is_overdue).length, [rawTasks]);
  const todayCount   = useMemo(() => rawTasks.filter((t) => t.due_date === format(new Date(), "yyyy-MM-dd")).length, [rawTasks]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const markComplete = useCallback(async (taskId: string) => {
    setCompletingIds((p) => new Set([...p, taskId]));
    try {
      await api.patch(`/tasks/${taskId}/`, { is_done: true });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task marked complete");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setCompletingIds((p) => { const n = new Set(p); n.delete(taskId); return n; });
    }
  }, [queryClient]);

  const bulkComplete = useCallback(async () => {
    const ids = Array.from(selected);
    const allIds = new Set(ids);
    setCompletingIds((p) => new Set([...p, ...ids]));
    try {
      await Promise.all(ids.map((id) => api.patch(`/tasks/${id}/`, { is_done: true })));
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelected(new Set());
      toast.success(`${ids.length} task${ids.length > 1 ? "s" : ""} completed`);
    } catch {
      toast.error("Some tasks could not be updated");
    } finally {
      setCompletingIds((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });
    }
  }, [selected, queryClient]);

  const clearFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setStatus("open");
    router.push("/dashboard/my-tasks");
  };

  const hasActiveFilters = search || priorityFilter !== "all" || status !== "open" || due !== "all";

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp size={12} className="ml-1 inline" /> : <ChevronDown size={12} className="ml-1 inline" />
    ) : <ArrowUpDown size={11} className="ml-1 inline opacity-30" />;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 px-0 text-muted-foreground hover:text-foreground -ml-1">
            <Link href="/dashboard"><ArrowLeft size={13} />Back to dashboard</Link>
          </Button>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">My tasks</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Assigned to you{activeTeam ? ` in ${activeTeam.name}` : ""} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap items-center gap-2">
          {overdueCount > 0 && (
            <Link href="/dashboard/my-tasks?due=overdue"
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/8 px-3 py-1 text-[11.5px] font-semibold text-destructive hover:bg-destructive/12 transition-colors">
              <AlertCircle size={11} />{overdueCount} overdue
            </Link>
          )}
          {todayCount > 0 && (
            <Link href="/dashboard/my-tasks?due=today"
              className="flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1 text-[11.5px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
              <Clock size={11} />{todayCount} today
            </Link>
          )}
        </div>
      </div>

      {/* ── Filter + search bar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, projects…"
            className="pl-8 h-9 text-[13px]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 min-w-[90px] justify-between text-[12.5px]">
              <span className="capitalize">{status === "all" ? "All status" : status}</span>
              <ChevronDown size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {(["open", "done", "all"] as StatusFilter[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatus(s)} className={cn("text-[12.5px] capitalize", status === s && "font-semibold text-primary")}>
                {s === "all" ? "All" : s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 min-w-[90px] justify-between text-[12.5px]">
              {priorityFilter !== "all" && <span className={cn("h-2 w-2 rounded-full", PRIORITY_COLOR[priorityFilter as TaskPriority])} />}
              <span className="capitalize">{priorityFilter === "all" ? "Priority" : priorityFilter}</span>
              <ChevronDown size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setPriorityFilter("all")} className={cn("text-[12.5px]", priorityFilter === "all" && "font-semibold text-primary")}>All priorities</DropdownMenuItem>
            <DropdownMenuSeparator />
            {(["urgent", "high", "normal", "low"] as TaskPriority[]).map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)} className={cn("text-[12.5px] capitalize flex items-center gap-2", priorityFilter === p && "font-semibold text-primary")}>
                <span className={cn("h-2 w-2 rounded-full", PRIORITY_COLOR[p])} />{p}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group by */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-[12.5px]">
              <Filter size={12} />Group
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {([["none", "No grouping"], ["priority", "Priority"], ["project", "Project"], ["due", "Due date"]] as [GroupKey, string][]).map(([k, label]) => (
              <DropdownMenuItem key={k} onClick={() => setGroupBy(k)} className={cn("text-[12.5px]", groupBy === k && "font-semibold text-primary")}>{label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
            <X size={12} />Clear
          </Button>
        )}
      </div>

      {/* ── Due filter tabs ── */}
      <div className="flex gap-1 border-b border-border pb-1">
        {([["all", "All", rawTasks.length], ["overdue", "Overdue", overdueCount], ["today", "Today", todayCount], ["this_week", "This week", null]] as [DueFilter, string, number | null][]).map(([key, label, count]) => (
          <Link
            key={key}
            href={key === "all" ? "/dashboard/my-tasks" : `/dashboard/my-tasks?due=${key}`}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              due === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            {count !== null && count > 0 && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                due === key ? "bg-white/20 text-white"
                  : key === "overdue" ? "bg-destructive/10 text-destructive"
                  : "bg-muted-foreground/10"
              )}>
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-[12.5px] font-semibold text-primary">{selected.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="h-7 text-[12px]">Deselect</Button>
          <Button size="sm" onClick={bulkComplete} className="h-7 gap-1.5 text-[12px]">
            <CheckCircle2 size={12} />Mark complete
          </Button>
        </div>
      )}

      {/* ── Task list ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_140px_110px_100px] items-center gap-3 border-b border-border/60 bg-muted/30 px-5 py-2.5">
          <Checkbox
            checked={selected.size === tasks.length && tasks.length > 0}
            onCheckedChange={toggleSelectAll}
            className="h-3.5 w-3.5"
          />
          <button onClick={() => toggleSort("title")} className="flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
            Task <SortIcon k="title" />
          </button>
          <button onClick={() => toggleSort("project")} className="flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
            Project <SortIcon k="project" />
          </button>
          <button onClick={() => toggleSort("priority")} className="flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
            Priority <SortIcon k="priority" />
          </button>
          <button onClick={() => toggleSort("due_date")} className="flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
            Due <SortIcon k="due_date" />
          </button>
        </div>

        {isLoading && (
          <div className="space-y-0 divide-y divide-border/60">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                <div className="h-3.5 w-3.5 rounded bg-muted" />
                <div className="h-4 flex-1 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <ListTodo size={20} className="text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-foreground">No tasks found</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {hasActiveFilters ? "Try clearing your filters" : "You have no tasks assigned"}
              </p>
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={clearFilters} className="mt-1 text-[12px]">Clear filters</Button>
            )}
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <div className="divide-y divide-border/40">
            {grouped.map(({ label, tasks: groupTasks }) => (
              <div key={label || "all"}>
                {groupBy !== "none" && label && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(label)}
                    className="flex w-full items-center gap-2 bg-muted/20 px-5 py-2 text-left hover:bg-muted/30 transition-colors"
                  >
                    {collapsedGroups.has(label) ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</span>
                    <span className="ml-1 text-[11px] text-muted-foreground/50">({groupTasks.length})</span>
                  </button>
                )}
                {!collapsedGroups.has(label) && groupTasks.map((task) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    selected={selected.has(task.id)}
                    completing={completingIds.has(task.id)}
                    onSelect={toggleSelect}
                    onComplete={markComplete}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskTableRow({
  task, selected, completing, onSelect, onComplete,
}: {
  task: Task;
  selected: boolean;
  completing: boolean;
  onSelect: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const { label: dueLabel, tone: dueTone } = formatDue(task.due_date);
  const isDone = (task as any).is_done ?? false;

  return (
    <div className={cn(
      "group grid sm:grid-cols-[auto_1fr_140px_110px_100px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/15",
      selected && "bg-primary/4",
      isDone && "opacity-50"
    )}>
      <Checkbox
        checked={selected}
        onCheckedChange={() => onSelect(task.id)}
        className="h-3.5 w-3.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Title + subtitle */}
      <div className="min-w-0 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          disabled={completing || isDone}
          className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors disabled:opacity-30"
          title="Mark complete"
        >
          {completing ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : isDone ? (
            <CheckCircle2 size={15} className="text-primary" />
          ) : (
            <Circle size={15} />
          )}
        </button>
        <div className="min-w-0">
          <Link
            href={`/projects/${task.project}?task=${task.id}`}
            className={cn(
              "block truncate text-[13px] font-medium hover:text-primary transition-colors",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60 sm:hidden">
            {task.project_name} · {task.column_name}
          </p>
          {task.labels && task.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {task.labels.slice(0, 3).map((l) => (
                <span key={l.id} className="rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ backgroundColor: `${l.color}20`, color: l.color }}>{l.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project */}
      <Link href={`/projects/${task.project}`} className="hidden sm:flex items-center gap-1.5 min-w-0 hover:text-primary transition-colors">
        <Briefcase size={11} className="shrink-0 text-muted-foreground/40" />
        <span className="truncate text-[12px] text-muted-foreground/80">{task.project_name ?? "—"}</span>
      </Link>

      {/* Priority */}
      <div className="hidden sm:block">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]",
          PRIORITY_LABEL_COLOR[task.priority]
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_COLOR[task.priority])} />
          {task.priority}
        </span>
      </div>

      {/* Due date */}
      <div className="hidden sm:block">
        <span className={cn("text-[11.5px]", dueTone)}>{dueLabel}</span>
      </div>
    </div>
  );
}
