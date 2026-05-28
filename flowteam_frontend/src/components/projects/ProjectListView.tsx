"use client";

import React, { useMemo } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  MessageSquare,
  Calendar,
  User as UserIcon,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Columns
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";
import { SlimUser } from "@/types/messaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ProjectListViewProps {
  tasks: Task[];
  groupBy: "epic" | "sprint" | "column";
  onTaskClick: (taskId: string) => void;
  onAddTask: (groupId?: string) => void;
  readOnly?: boolean;
}

export function ProjectListView({ tasks, groupBy, onTaskClick, onAddTask, readOnly = false }: ProjectListViewProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string; tasks: Task[] }>();
    
    if (groupBy === "epic") {
      tasks.forEach(task => {
        const epicId = task.epic_details?.id || "no-epic";
        const epicName = task.epic_details?.title || "No Epic";
        const epicColor = task.epic_details?.color || "#94a3b8";
        
        if (!map.has(epicId)) {
          map.set(epicId, { id: epicId, name: epicName, color: epicColor, tasks: [] });
        }
        map.get(epicId)!.tasks.push(task);
      });
    } else if (groupBy === "sprint") {
      tasks.forEach(task => {
        const sprintId = task.sprint || "no-sprint";
        const sprintName = task.sprint_name || "No Sprint";
        
        if (!map.has(sprintId)) {
          map.set(sprintId, { id: sprintId, name: sprintName, color: "#6366f1", tasks: [] });
        }
        map.get(sprintId)!.tasks.push(task);
      });
    } else {
      tasks.forEach(task => {
        const columnId = task.column;
        const columnName = task.column_name || "Unknown";
        
        if (!map.has(columnId)) {
          map.set(columnId, { id: columnId, name: columnName, color: "#94a3b8", tasks: [] });
        }
        map.get(columnId)!.tasks.push(task);
      });
    }
    
    return Array.from(map.values());
  }, [tasks, groupBy]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col border border-border/50 rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div 
                className="w-1.5 h-6 rounded-full" 
                style={{ backgroundColor: group.color || "#6366f1" }} 
              />
              <button className="flex items-center gap-2 group">
                <ChevronDown size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                {groupBy === "epic" ? (
                  <Layers size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : groupBy === "sprint" ? (
                  <Clock size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <Columns size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
                <h3 className="font-semibold text-sm tracking-tight">{group.name}</h3>
                <span className="text-[11px] text-muted-foreground/60 font-medium bg-muted px-1.5 py-0.5 rounded">
                  {group.tasks.length} tasks
                </span>
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              {!readOnly && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-[12px] gap-1.5"
                  onClick={() => onAddTask(group.id === "no-epic" || group.id === "no-sprint" ? undefined : group.id)}
                >
                  <Plus size={14} />
                  Add Task
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal size={14} />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/10 border-b border-border/30">
                  <th className="w-10 px-4 py-2"></th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Task Name</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 text-center">Owner</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 text-center">Status</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 text-center">Priority</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 text-center">Due Date</th>
                  <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 text-center">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {group.tasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="group hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center">
                        {task.column_name?.toLowerCase().includes("done") ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground line-clamp-1">{task.title}</span>
                        {task.subtasks_count > 0 && (
                          <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock size={10} /> {task.subtasks_count} subtasks
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <UserAvatar user={task.assignee} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <StatusBadge name={task.column_name || "To Do"} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <div className={cn(
                          "flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md",
                          task.is_overdue ? "text-red-600 bg-red-50" : "text-muted-foreground bg-muted/50"
                        )}>
                          <Calendar size={12} />
                          {task.due_date ? format(new Date(task.due_date), "MMM d") : "No date"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center items-center gap-3 text-muted-foreground/40 group-hover:text-muted-foreground/80">
                        <div className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          <span className="text-[10px] font-medium">{task.attachments_count || 0}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {!readOnly && (
                  <tr className="hover:bg-muted/10 transition-colors cursor-pointer group/add" onClick={() => onAddTask(group.id)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center">
                        <Plus size={16} className="text-muted-foreground/30 group-hover/add:text-primary transition-colors" />
                      </div>
                    </td>
                    <td colSpan={6} className="px-4 py-2.5 text-[12px] text-muted-foreground italic group-hover/add:text-primary transition-colors">
                      Add a task...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserAvatar({ user }: { user: SlimUser | null }) {
  if (!user) {
    return (
      <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/10">
        <UserIcon size={12} className="text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <Avatar className="h-7 w-7 border border-background shadow-sm">
      <AvatarImage src={user.avatar || ""} />
      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
        {user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function StatusBadge({ name }: { name: string }) {
  const lower = name.toLowerCase();
  const isDone = lower.includes("done") || lower.includes("complete") || lower.includes("resolved");
  const isProgress = lower.includes("progress") || lower.includes("wip") || lower.includes("active") || lower.includes("review") || lower.includes("testing");
  
  return (
    <div className={cn(
      "flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold w-28 border shadow-sm transition-all",
      isDone ? "bg-emerald-500 text-white border-emerald-600" :
      isProgress ? "bg-sky-500 text-white border-sky-600" :
      "bg-slate-400 text-white border-slate-500"
    )}>
      {isDone ? <CheckCircle2 size={13} className="shrink-0" /> :
       isProgress ? <RefreshCw size={13} className="shrink-0 animate-spin" /> :
       <Circle size={13} className="shrink-0" />}
      <span className="truncate">{name}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = {
    urgent: { label: "Urgent", class: "bg-rose-500 text-white border-rose-600", icon: AlertTriangle },
    high: { label: "High", class: "bg-orange-400 text-white border-orange-500", icon: TrendingUp },
    normal: { label: "Normal", class: "bg-blue-400 text-white border-blue-500", icon: Minus },
    low: { label: "Low", class: "bg-slate-400 text-white border-slate-500", icon: TrendingDown },
  };
  
  const current = config[priority] || config.normal;
  const Icon = current.icon;
  
  return (
    <div className={cn(
      "flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold w-28 border shadow-sm transition-all",
      current.class
    )}>
      <Icon size={13} className="shrink-0" />
      <span>{current.label}</span>
    </div>
  );
}
