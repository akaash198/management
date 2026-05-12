"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { useTasks } from "@/hooks/useTasks";
import type { TaskFilters } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarDays, Search } from "lucide-react";

type DueFilter = "all" | "overdue" | "today" | "this_week";
type StatusFilter = "all" | "open" | "done";

function asDueFilter(value: string | null): DueFilter {
  if (value === "overdue" || value === "today" || value === "this_week") return value;
  return "all";
}

export default function MyTasksPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { activeTeamId, fetchTeams, teams } = useTeamStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const due = asDueFilter(searchParams.get("due"));

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [activeTeamId, teams]);

  const filters = useMemo<TaskFilters>(() => {
    if (!activeTeamId || !user?.id) return {};
    return {
      team_id: activeTeamId,
      assignee_id: user.id,
      ...(status !== "all" ? { status } : {}),
      ...(due !== "all" ? { due } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    };
  }, [activeTeamId, due, search, status, user]);

  const { data: tasks = [], isLoading } = useTasks(filters);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-2 px-0 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My tasks</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Assigned to you{activeTeam ? ` in ${activeTeam.name}` : ""}.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">
              Status: {status}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Due: {due}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Count: {tasks.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Status filter"
            >
              <option value="open">Open</option>
              <option value="done">Done</option>
              <option value="all">All</option>
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks"
                className="h-9 pl-9 sm:w-[260px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant={due === "all" ? "default" : "outline"} size="sm" className="h-8 text-[12px]">
              <Link href="/dashboard/my-tasks">All</Link>
            </Button>
            <Button
              asChild
              variant={due === "overdue" ? "default" : "outline"}
              size="sm"
              className="h-8 text-[12px]"
            >
              <Link href="/dashboard/my-tasks?due=overdue">Overdue</Link>
            </Button>
            <Button asChild variant={due === "today" ? "default" : "outline"} size="sm" className="h-8 text-[12px]">
              <Link href="/dashboard/my-tasks?due=today">Due today</Link>
            </Button>
            <Button
              asChild
              variant={due === "this_week" ? "default" : "outline"}
              size="sm"
              className="h-8 text-[12px]"
            >
              <Link href="/dashboard/my-tasks?due=this_week">This week</Link>
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {isLoading && <div className="px-5 py-6 text-sm text-muted-foreground">Loading tasks…</div>}
          {!isLoading && tasks.length === 0 && (
            <div className="px-5 py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">No tasks found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try changing filters or search.</p>
            </div>
          )}
          {!isLoading &&
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.project}?task=${task.id}`}
                className="block px-5 py-4 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    <p className="mt-1 truncate text-[12px] text-muted-foreground">
                      {task.project_name ?? "Project"} • {task.column_name ?? "Status"} •{" "}
                      {(task.issue_type ?? "task").toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        task.priority === "urgent" && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
                        task.priority === "high" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
                        task.priority === "normal" && "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
                        task.priority === "low" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                      )}
                    >
                      {task.priority}
                    </Badge>
                    <Badge variant="secondary" className={cn("text-[11px]", task.is_overdue && "text-red-600")}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due"}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
