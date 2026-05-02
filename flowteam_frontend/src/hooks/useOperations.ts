import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { toast } from "sonner";
import type {
  ActivityFeedItem,
  AdvancedReporting,
  Approval,
  AutomationRule,
  ClientPortalAccess,
  CustomFieldValue,
  IssueFieldDefinition,
  NotificationDigestPreview,
  NotificationPreference,
  NotificationRule,
  ProjectDocument,
} from "@/types/operations";

const errText = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string; detail?: string } } }).response;
    return response?.data?.error || response?.data?.detail || fallback;
  }
  return fallback;
};

export const useApprovals = (params: { teamId?: string; projectId?: string; taskId?: string; status?: string }) =>
  useQuery({
    queryKey: ["ops", "approvals", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Approval[]>>("/projects/approvals/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.taskId ? { task_id: params.taskId } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId || !!params.taskId,
  });

export const useCreateApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Approval>) => {
      const response = await api.post<ApiResponse<Approval>>("/projects/approvals/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "approvals"] });
      toast.success("Approval requested");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to request approval")),
  });
};

export const useDecideApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, status, decision_note }: { approvalId: string; status: "approved" | "rejected"; decision_note?: string }) => {
      const response = await api.post<ApiResponse<Approval>>(`/projects/approvals/${approvalId}/decide/`, { status, decision_note });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "approvals"] });
      toast.success("Approval updated");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to update approval")),
  });
};

export const useActivityFeed = (params: { teamId?: string; projectId?: string; taskId?: string; actorId?: string; verb?: string }) =>
  useQuery({
    queryKey: ["ops", "activity", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ActivityFeedItem[]>>("/projects/activity/feed/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.taskId ? { task_id: params.taskId } : {}),
          ...(params.actorId ? { actor_id: params.actorId } : {}),
          ...(params.verb ? { verb: params.verb } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId || !!params.taskId,
  });

export const useAdvancedReporting = (params: { teamId?: string; projectId?: string }) =>
  useQuery({
    queryKey: ["ops", "reporting", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AdvancedReporting>>("/projects/reporting/advanced/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
        },
      });
      return response.data.data;
    },
    enabled: !!params.teamId || !!params.projectId,
  });

export const useDocuments = (params: { teamId?: string; projectId?: string; taskId?: string }) =>
  useQuery({
    queryKey: ["ops", "documents", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ProjectDocument[]>>("/projects/documents/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
          ...(params.taskId ? { task_id: params.taskId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId || !!params.taskId,
  });

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ProjectDocument>) => {
      const response = await api.post<ApiResponse<ProjectDocument>>("/projects/documents/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "documents"] });
      toast.success("Document created");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to create document")),
  });
};

export const useNotificationRules = (params: { teamId?: string; projectId?: string }) =>
  useQuery({
    queryKey: ["ops", "notification-rules", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NotificationRule[]>>("/projects/notification-rules/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId,
  });

export const useCreateNotificationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NotificationRule>) => {
      const response = await api.post<ApiResponse<NotificationRule>>("/projects/notification-rules/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "notification-rules"] });
      toast.success("Notification rule saved");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to save notification rule")),
  });
};

export const useIssueFields = (projectId?: string) =>
  useQuery({
    queryKey: ["ops", "issue-fields", projectId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<IssueFieldDefinition[]>>("/projects/issue-fields/", {
        params: { project_id: projectId },
      });
      return response.data.data ?? [];
    },
    enabled: !!projectId,
  });

export const useCreateIssueField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<IssueFieldDefinition>) => {
      const response = await api.post<ApiResponse<IssueFieldDefinition>>("/projects/issue-fields/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "issue-fields"] });
      toast.success("Custom field created");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to create custom field")),
  });
};

export const useCustomFieldValues = (taskId?: string) =>
  useQuery({
    queryKey: ["ops", "custom-field-values", taskId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CustomFieldValue[]>>("/projects/custom-field-values/", {
        params: { task_id: taskId },
      });
      return response.data.data ?? [];
    },
    enabled: !!taskId,
  });

export const useUpsertCustomFieldValue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { task: string; field_definition_id: string; value: Record<string, unknown>; id?: string }) => {
      if (payload.id) {
        const response = await api.patch<ApiResponse<CustomFieldValue>>(`/projects/custom-field-values/${payload.id}/`, payload);
        return response.data.data;
      }
      const response = await api.post<ApiResponse<CustomFieldValue>>("/projects/custom-field-values/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "custom-field-values"] });
      toast.success("Custom field updated");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to save custom field")),
  });
};

export const useAutomationRules = (params: { teamId?: string; projectId?: string }) =>
  useQuery({
    queryKey: ["ops", "automation-rules", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AutomationRule[]>>("/projects/automation-rules/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId,
  });

export const useCreateAutomationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AutomationRule>) => {
      const response = await api.post<ApiResponse<AutomationRule>>("/projects/automation-rules/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "automation-rules"] });
      toast.success("Automation rule created");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to create automation rule")),
  });
};

export const useClientAccess = (params: { teamId?: string; projectId?: string }) =>
  useQuery({
    queryKey: ["ops", "client-access", params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClientPortalAccess[]>>("/projects/client-access/", {
        params: {
          ...(params.teamId ? { team_id: params.teamId } : {}),
          ...(params.projectId ? { project_id: params.projectId } : {}),
        },
      });
      return response.data.data ?? [];
    },
    enabled: !!params.teamId || !!params.projectId,
  });

export const useCreateClientAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ClientPortalAccess>) => {
      const response = await api.post<ApiResponse<ClientPortalAccess>>("/projects/client-access/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "client-access"] });
      toast.success("Client portal access created");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to create client access")),
  });
};

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ["ops", "notification-preferences"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NotificationPreference>>("/messaging/notifications/preferences/");
      return response.data.data;
    },
  });

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NotificationPreference>) => {
      const response = await api.patch<ApiResponse<NotificationPreference>>("/messaging/notifications/preferences/", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "notification-preferences"] });
      toast.success("Notification preferences updated");
    },
    onError: (error: unknown) => toast.error(errText(error, "Failed to update notification preferences")),
  });
};

export const useNotificationDigestPreview = () =>
  useQuery({
    queryKey: ["ops", "notification-digest-preview"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NotificationDigestPreview>>("/messaging/notifications/digest-preview/");
      return response.data.data;
    },
  });
