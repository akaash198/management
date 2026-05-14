import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Retrospective, RetroItem } from "@/types/task";
import { ApiResponse } from "@/types";
import { toast } from "sonner";

export const useRetrospectives = (teamId: string) => {
  const queryClient = useQueryClient();

  const { data: retrospectives = [], isLoading: loading } = useQuery({
    queryKey: ["retrospectives", teamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Retrospective[]>>("/projects/retrospectives/", { 
        params: { team_id: teamId } 
      });
      return res.data.data ?? [];
    },
    enabled: !!teamId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Retrospective>) => {
      const res = await api.post<ApiResponse<Retrospective>>("/projects/retrospectives/", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives", teamId] });
      toast.success("Retrospective session started");
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: Partial<RetroItem>) => {
      const res = await api.post<ApiResponse<RetroItem>>("/projects/retro-items/", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives", teamId] });
      toast.success("Reflection item added");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.post<ApiResponse<any>>(`/projects/retro-items/${itemId}/vote/`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives", teamId] });
    },
  });

  return {
    retrospectives,
    loading,
    createRetrospective: createMutation.mutateAsync,
    addRetroItem: addItemMutation.mutateAsync,
    voteRetroItem: voteMutation.mutateAsync,
  };
};
