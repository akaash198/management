"use client";

import { useBoardStore } from "@/store/boardStore";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { useState } from "react";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { useMoveTask } from "@/hooks/useTasks";
import { Task } from "@/types/task";
import { useCreateColumn } from "@/hooks/useColumns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export function KanbanBoard({ projectId, searchTerm }: { projectId: string; searchTerm: string }) {
  const { columns, tasksByColumn, optimisticMoveTask } = useBoardStore();
  const moveTaskMutation = useMoveTask();
  const createColumn = useCreateColumn();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = Object.values(tasksByColumn).flat().find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    const activeColId = Object.keys(tasksByColumn).find(colId => 
      tasksByColumn[colId].some(t => t.id === taskId)
    );
    
    let overColId = Object.keys(tasksByColumn).find(colId => colId === overId);
    if (!overColId) {
      overColId = Object.keys(tasksByColumn).find(colId => 
        tasksByColumn[colId].some(t => t.id === overId)
      );
    }

    if (activeColId && overColId) {
      const overTasks = tasksByColumn[overColId];
      const overIndex = overTasks.findIndex(t => t.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : overTasks.length;

      if (activeColId !== overColId || newIndex !== tasksByColumn[activeColId].findIndex(t => t.id === taskId)) {
        optimisticMoveTask(taskId, activeColId, overColId, newIndex);
        moveTaskMutation.mutate({ id: taskId, columnId: overColId, order: newIndex });
      }
    }

    setActiveTask(null);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    createColumn.mutate({
      projectId,
      name: newColumnName.trim(),
      order: columns.length,
    }, {
      onSuccess: () => {
        setNewColumnName("");
        setIsAddingColumn(false);
      }
    });
  };

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center space-y-3">
          <p className="text-[14px] text-muted-foreground/60">No columns yet.</p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsAddingColumn(true)}
            className="text-[13px]"
          >
            <Plus size={14} className="mr-1.5" />
            Add first column
          </Button>
          {isAddingColumn && (
            <div className="flex items-center gap-2 mt-3">
              <Input 
                autoFocus
                placeholder="Column name..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") setIsAddingColumn(false);
                }}
                className="h-8 text-[13px] w-48"
              />
              <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()} className="h-8">
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingColumn(false)} className="h-8">
                <X size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full items-start">
        {columns.map((column) => (
          <Column 
            key={column.id} 
            column={column}
            projectId={projectId}
            tasks={tasksByColumn[column.id]?.filter(t => 
              t.title.toLowerCase().includes(searchTerm.toLowerCase())
            ) || []}
            allColumns={columns}
          />
        ))}
        
        {/* Add Column button */}
        {isAddingColumn ? (
          <div className="w-[280px] shrink-0 bg-muted/40 p-3 rounded-lg border-[0.5px] border-primary/30 space-y-2">
            <Input 
              autoFocus
              placeholder="Column name..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") setIsAddingColumn(false);
              }}
              className="h-8 bg-card border-[0.5px] text-[13px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim() || createColumn.isPending} className="h-7 text-[12px]">
                Add column
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingColumn(false)} className="h-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsAddingColumn(true)}
            className="w-[280px] shrink-0 h-10 flex items-center justify-center border-[0.5px] border-dashed border-border/60 rounded-lg text-muted-foreground/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group text-[12px] font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add column
          </div>
        )}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay columns={columns} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
