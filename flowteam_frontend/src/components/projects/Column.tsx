"use client";

import { useState } from "react";

import { useDroppable } from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Column as ColumnType } from "@/types/project";
import { Task } from "@/types/task";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreateTask } from "@/hooks/useTasks";
import { useDeleteColumn } from "@/hooks/useColumns";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ColumnProps {
  column: ColumnType;
  projectId: string;
  tasks: Task[];
  allColumns?: ColumnType[];
  readOnly?: boolean;
}

export function Column({ column, projectId, tasks, allColumns, readOnly = false }: ColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const createTask = useCreateTask();
  const deleteColumn = useDeleteColumn();

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleAddTask = () => {
    if (readOnly) {
      toast.error("You have viewer access and cannot create tasks.");
      setIsAdding(false);
      return;
    }
    if (!newTaskTitle.trim()) return;
    
    createTask.mutate({
      title: newTaskTitle.trim(),
      column: column.id,
      project: projectId,
    } as any, {
      onSuccess: () => {
        setNewTaskTitle("");
        setIsAdding(false);
      }
    });
  };

  return (
    <div className={cn(
        "flex flex-col w-[280px] shrink-0 bg-secondary/30 border border-border/60 rounded-xl max-h-full shadow-sm transition-all duration-200 group",
        isOver && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
      )}>
      {/* Column Header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {column.name}
          </h3>
          <span className="bg-background border border-border rounded text-muted-foreground/80 text-[10px] font-medium px-1.5 py-0.5">
            {tasks.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
               className="text-destructive focus:text-destructive gap-2 text-[13px]"
               onClick={() => deleteColumn.mutate({ projectId, columnId: column.id })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks Area */}
      <div 
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-3 space-y-2 min-h-[100px]"
      >
        <SortableContext 
          id={column.id} 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} columns={allColumns} />
          ))}
        </SortableContext>
        
        {isAdding ? (
          <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <Textarea
              autoFocus
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTask();
                }
                if (e.key === "Escape") setIsAdding(false);
              }}
              className="min-h-[84px] bg-background border-border/50 focus:border-primary/50 resize-none text-[13px] shadow-sm transition-all rounded-lg"
            />
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleAddTask} 
                disabled={readOnly || !newTaskTitle.trim() || createTask.isPending} 
                className="h-8 px-4 text-[12px] bg-primary text-primary-foreground font-medium shadow-glow"
              >
                {createTask.isPending ? "Adding..." : "Add task"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsAdding(false)} 
                className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : !readOnly ? (
          <Button 
            variant="ghost" 
            onClick={() => setIsAdding(true)}
            className="w-full justify-start text-muted-foreground/50 hover:text-primary hover:bg-primary/5 h-9 px-3 text-[12px] mt-2 group transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Add task
          </Button>
        ) : null}
      </div>
    </div>
  );
}
