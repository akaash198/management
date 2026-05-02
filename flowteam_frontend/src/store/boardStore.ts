import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Column, ProjectDetail } from "@/types/project";
import { Task } from "@/types/task";

interface BoardState {
  columns: Column[];
  tasksByColumn: Record<string, Task[]>;
  activeProjectId: string | null;
  setBoard: (project: ProjectDetail, tasks: Task[]) => void;
  optimisticMoveTask: (taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  updateTaskLocally: (taskId: string, patch: Partial<Task>) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set) => ({
    columns: [],
    tasksByColumn: {},
    activeProjectId: null,

    setBoard: (project, tasks) => {
      set((state) => {
        state.columns = project.columns;
        state.activeProjectId = project.id;
        state.tasksByColumn = {};
        
        project.columns.forEach((col) => {
          state.tasksByColumn[col.id] = tasks
            .filter((t) => t.column === col.id)
            .sort((a, b) => a.order - b.order);
        });
      });
    },

    optimisticMoveTask: (taskId, fromColId, toColId, newIndex) => {
      set((state) => {
        const taskIndex = state.tasksByColumn[fromColId].findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        const [task] = state.tasksByColumn[fromColId].splice(taskIndex, 1);
        task.column = toColId;
        
        if (!state.tasksByColumn[toColId]) {
          state.tasksByColumn[toColId] = [];
        }
        state.tasksByColumn[toColId].splice(newIndex, 0, task);

        // Update orders in both columns locally
        state.tasksByColumn[fromColId].forEach((t, i) => { t.order = i; });
        state.tasksByColumn[toColId].forEach((t, i) => { t.order = i; });
      });
    },

    updateTaskLocally: (taskId, patch) => {
      set((state) => {
        for (const colId in state.tasksByColumn) {
          const task = state.tasksByColumn[colId].find((t) => t.id === taskId);
          if (task) {
            Object.assign(task, patch);
            break;
          }
        }
      });
    },
  }))
);
