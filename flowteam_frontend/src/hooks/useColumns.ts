import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ApiResponse } from "@/types";
import { Column } from "@/types/project";
import { toast } from "sonner";

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, name, order }: { projectId: string; name: string; order: number }) => {
      const res = await api.post<ApiResponse<Column>>(`/projects/${projectId}/columns/`, {
        name,
        order,
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
      toast.success("Column added");
    },
  });
};

export const useDeleteColumn = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ projectId, columnId }: { projectId: string; columnId: string }) => {
        await api.delete(`/projects/${projectId}/columns/${columnId}/`);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
        toast.success("Column deleted");
      },
    });
  };
