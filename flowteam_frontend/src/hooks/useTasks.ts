import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Task, TaskDetail, TaskFilters, TaskMutationInput, TaskMutationPatch } from "@/types/task";
import { ApiResponse } from "@/types";
import { toast } from "sonner";

// All task API calls go to /api/tasks/ (dedicated route, no router conflicts)
const TASKS_BASE = "/tasks";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { error?: string; detail?: string } } }).response;
    return response?.data?.error || response?.data?.detail || fallback;
  }
  return fallback;
};

export const useTasks = (filters: TaskFilters = {}) => {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task[]>>(`${TASKS_BASE}/`, { params: filters });
      // Defensive: never return undefined (React Query will throw if we do)
      return res.data.data ?? [];
    },
    enabled: true,
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TaskDetail>>(`${TASKS_BASE}/${taskId}/`);
      return res.data.data ?? {} as TaskDetail;
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TaskMutationInput) => {
      const res = await api.post<ApiResponse<TaskDetail>>(`${TASKS_BASE}/`, data);
      return res.data.data ?? {} as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { project_id: variables.project }] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to create task"));
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskMutationPatch }) => {
      const res = await api.patch<ApiResponse<TaskDetail>>(`${TASKS_BASE}/${id}/`, data);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data?.id] });
      toast.success("Task updated");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to update task"));
    },
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, columnId, order }: { id: string; columnId: string; order: number }) => {
      const res = await api.post<ApiResponse<Task>>(`${TASKS_BASE}/${id}/move/`, {
        column: columnId,
        order,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast.error("Failed to move task. Please try again.");
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`${TASKS_BASE}/${taskId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });
};
