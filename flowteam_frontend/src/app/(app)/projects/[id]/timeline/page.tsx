"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ProjectTimelinePage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);
  const { data: tasks = [] } = useTasks({ project_id: id });

  const datedTasks = useMemo(() => {
    return (tasks as Task[])
      .map((t) => {
        const due = parseDate(t.due_date);
        const start = parseDate(t.start_date ?? null) ?? due;
        if (!start || !due) return null;
        return { task: t, start, due };
      })
      .filter(Boolean) as Array<{ task: Task; start: Date; due: Date }>;
  }, [tasks]);

  const [windowDays, setWindowDays] = useState(30);
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const range = useMemo(() => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 3);
    const end = new Date(start);
    end.setDate(start.getDate() + windowDays);
    return { start, end };
  }, [anchor, windowDays]);

  const items = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    const total = Math.max(1, endMs - startMs);
    return datedTasks
      .filter(({ due, start }) => due.getTime() >= startMs && start.getTime() <= endMs)
      .map(({ task, start, due }) => {
        const left = clamp((start.getTime() - startMs) / total, 0, 1);
        const right = clamp((due.getTime() - startMs) / total, 0, 1);
        const width = clamp(right - left, 0.01, 1);
        return { task, start, due, leftPct: left * 100, widthPct: width * 100 };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [datedTasks, range.end, range.start]);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-background">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">Timeline</h1>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">
            {project?.name ? `${project.name} • ` : ""}
            Tasks with start + due dates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setAnchor((d) => new Date(d.getTime() - 7 * 86400000))}
          >
            <ChevronLeft className="h-4 w-4" />
            Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setAnchor((d) => new Date(d.getTime() + 7 * 86400000))}
          >
            Week
            <ChevronRight className="h-4 w-4" />
          </Button>
          <select
            className="h-9 rounded-md border border-border bg-background px-2.5 text-[12px]"
            value={String(windowDays)}
            onChange={(e) => setWindowDays(Number(e.target.value))}
          >
            <option value="14">2 weeks</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {fmt(range.start)} → {fmt(range.end)}
          </div>
          <Badge variant="secondary" className="text-[11px]">
            {items.length} items
          </Badge>
        </div>

        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No tasks with dates in this range. Add `start_date` and `due_date` to tasks to see them here.
            </div>
          ) : (
            items.map(({ task, start, due, leftPct, widthPct }) => (
              <div key={task.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4 min-w-0">
                  <Link
                    href={`/projects/${id}?task=${task.id}`}
                    className="text-sm font-medium truncate hover:underline"
                    title={task.title}
                  >
                    {task.title}
                  </Link>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{fmt(start)} → {fmt(due)}</span>
                    <span className={cn("inline-flex items-center gap-1", task.issue_type === "epic" && "text-violet-600")}>
                      <GitBranch className="h-3 w-3" />
                      {task.issue_type ?? "task"}
                    </span>
                  </div>
                </div>
                <div className="col-span-8">
                  <div className="relative h-7 rounded-lg bg-muted/30 border border-border overflow-hidden">
                    <div
                      className="absolute top-1.5 h-4 rounded-md bg-primary/70"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${task.title} (${fmt(start)} → ${fmt(due)})`}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

