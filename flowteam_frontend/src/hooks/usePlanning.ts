import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  BulkTaskUpdateInput,
  Milestone,
  MilestoneWriteInput,
  ProjectTemplate,
  ProjectTemplateWriteInput,
  RecurringTaskRule,
  RecurringTaskRuleWriteInput,
  RoadmapOverview,
  SavedIssueView,
  SavedIssueViewWriteInput,
  Sprint,
  SprintWriteInput,
  TaskLink,
  WorkloadRow,
} from "@/types/planning";
import { toast } from "sonner";

const planningError = (error: unknown, fallback: string) => {
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

export const useSprints = (params: { projectId?: string; teamId?: string }) =>
  useQuery({
    queryKey: ["planning", "sprints", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Sprint[]>>("/projects/sprints/", {
        params: {
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.teamId ? { team_id: params.teamId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.projectId || !!params.teamId,
  });

export const useCreateSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SprintWriteInput) => {
      const response = await api.post<ApiResponse<Sprint>>("/projects/sprints/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "sprints"] });
      toast.success("Sprint created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to create sprint")),
  });
};

export const useMilestones = (params: { projectId?: string; teamId?: string }) =>
  useQuery({
    queryKey: ["planning", "milestones", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Milestone[]>>("/projects/milestones/", {
        params: {
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.teamId ? { team_id: params.teamId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.projectId || !!params.teamId,
  });

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MilestoneWriteInput) => {
      const response = await api.post<ApiResponse<Milestone>>("/projects/milestones/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "roadmap"] });
      toast.success("Milestone created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to create milestone")),
  });
};

export const useRoadmapOverview = (teamId?: string) =>
  useQuery({
    queryKey: ["planning", "roadmap", teamId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RoadmapOverview>>("/projects/roadmap/overview/", {
        params: { team_id: teamId },
      });
      return response.data.data;
    },
    enabled: !!teamId,
  });

export const useTaskLinks = (params: { taskId?: string; teamId?: string }) =>
  useQuery({
    queryKey: ["planning", "task-links", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<TaskLink[]>>("/projects/task-links/", {
        params: {
          ...(params.taskId ? { task_id: params.taskId } : {}),
          ...(params.teamId ? { team_id: params.teamId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.taskId || !!params.teamId,
  });

export const useCreateTaskLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Pick<TaskLink, "source_task" | "target_task" | "link_type">) => {
      const response = await api.post<ApiResponse<TaskLink>>("/projects/task-links/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "task-links"] });
      toast.success("Issue link created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to create issue link")),
  });
};

export const useSavedIssueViews = (teamId?: string) =>
  useQuery({
    queryKey: ["planning", "saved-views", teamId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SavedIssueView[]>>("/projects/saved-views/", {
        params: { team_id: teamId },
      });
      return response.data.data ?? [];
    },
    enabled: !!teamId,
  });

export const useCreateSavedIssueView = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SavedIssueViewWriteInput) => {
      const response = await api.post<ApiResponse<SavedIssueView>>("/projects/saved-views/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "saved-views"] });
      toast.success("Saved view created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to save view")),
  });
};

export const useProjectTemplates = (teamId?: string) =>
  useQuery({
    queryKey: ["planning", "templates", teamId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ProjectTemplate[]>>("/projects/templates/", {
        params: { team_id: teamId },
      });
      return response.data.data ?? [];
    },
    enabled: !!teamId,
  });

export const useCreateProjectTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProjectTemplateWriteInput) => {
      const response = await api.post<ApiResponse<ProjectTemplate>>("/projects/templates/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "templates"] });
      toast.success("Template created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to create template")),
  });
};

export const useRecurringRules = (params: { projectId?: string; teamId?: string }) =>
  useQuery({
    queryKey: ["planning", "recurring", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecurringTaskRule[]>>("/projects/recurring-rules/", {
        params: {
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.teamId ? { team_id: params.teamId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.projectId || !!params.teamId,
  });

export const useCreateRecurringRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecurringTaskRuleWriteInput) => {
      const response = await api.post<ApiResponse<RecurringTaskRule>>("/projects/recurring-rules/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "recurring"] });
      toast.success("Recurring rule created");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to create recurring rule")),
  });
};

export const useRunRecurringRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await api.post(`/projects/recurring-rules/${ruleId}/run/`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning", "recurring"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Recurring task generated");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to run recurring rule")),
  });
};

export const useWorkloadOverview = (teamId?: string) =>
  useQuery({
    queryKey: ["planning", "workload", teamId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<WorkloadRow[]>>("/projects/workload/overview/", {
        params: { team_id: teamId },
      });
      return response.data.data ?? [];
    },
    enabled: !!teamId,
  });

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkTaskUpdateInput) => {
      const response = await api.post<ApiResponse<{ updated: number }>>("/tasks/bulk-update/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "workload"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "sprints"] });
      toast.success("Bulk update applied");
    },
    onError: (error: unknown) => toast.error(planningError(error, "Failed to update issues")),
  });
};
