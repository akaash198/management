import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Epic } from "@/types/task";
import { ApiResponse } from "@/types";
import { toast } from "sonner";

export const useEpics = (filters: { project_id?: string; team_id?: string } = {}) => {
  const queryClient = useQueryClient();

  const { data: epics = [], isLoading: loading } = useQuery({
    queryKey: ["epics", filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Epic[]>>("/projects/epics/", { params: filters });
      return res.data.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Epic>) => {
      const res = await api.post<ApiResponse<Epic>>("/projects/epics/", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      toast.success("Epic created successfully");
    },
    onError: () => {
      toast.error("Failed to create epic");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Epic> }) => {
      const res = await api.patch<ApiResponse<Epic>>(`/projects/epics/${id}/`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      toast.success("Epic updated");
    },
  });

  return {
    epics,
    loading,
    createEpic: createMutation.mutateAsync,
    updateEpic: updateMutation.mutateAsync,
  };
};
