import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Project, ProjectCreateInput, ProjectDetail } from "@/types/project";
import { ApiResponse } from "@/types";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

type ProjectStatusFilter = "active" | "archived" | "all";

const getProjectError = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error ?? fallback;
  }
  return fallback;
};

export const useProjects = (
  teamId?: string,
  isSuperUser: boolean = false,
  status: ProjectStatusFilter = "active"
) => {
  return useQuery({
    queryKey: ["projects", teamId, isSuperUser, status],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>("/projects/", {
        params: {
          ...(teamId ? { team_id: teamId } : {}),
          ...(status ? { status } : {}),
        },
      });
      return res.data.data;
    },
    enabled: !!teamId || isSuperUser,
    staleTime: 30000,
  });
};

export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProjectDetail>>(`/projects/${projectId}/`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProjectCreateInput) => {
      const res = await api.post<ApiResponse<Project>>("/projects/", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: (error: unknown) => {
      toast.error(toErrorMessage(getProjectError(error, "Failed to create project"), "Failed to create project"));
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project archived");
    },
  });
};

export const useRestoreProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.post(`/projects/${projectId}/restore/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project restored");
    },
    onError: (error: unknown) => {
      toast.error(toErrorMessage(getProjectError(error, "Failed to restore project"), "Failed to restore project"));
    },
  });
};
