import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData, unwrapList } from "./api";
import {
  sampleCalendar,
  sampleChannels,
  sampleMessagesByChannel,
  sampleNotifications,
  sampleProjects,
  sampleTasks,
} from "./sampleData";
import type {
  ApiResponse,
  CalendarItem,
  Channel,
  Column,
  CreateTaskPayload,
  Meeting,
  Message,
  NotificationItem,
  Project,
  Sprint,
  Task,
  TeamMember,
  UpdateTaskPayload,
  User,
} from "./types";

function normalizeChannel(channel: Channel): Channel {
  return {
    ...channel,
    name: channel.display_name || channel.name,
    last_message_text: channel.last_message_text ?? channel.last_message?.text ?? "",
    last_message_at: channel.last_message_at ?? channel.last_message?.created_at ?? null,
  };
}

export function useProjects(isDemoMode: boolean, teamId?: string | null) {
  return useQuery({
    queryKey: ["projects", teamId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return sampleProjects;
      const response = await api.get<ApiResponse<Project[]>>("/projects/", { params: teamId ? { team_id: teamId } : {} });
      return unwrapList<Project>(response.data);
    },
  });
}

export function useTasks(isDemoMode: boolean, projectId?: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return sampleTasks;
      const response = await api.get<ApiResponse<Task[]>>("/tasks/", {
        params: projectId ? { project_id: projectId } : {},
      });
      return unwrapList<Task>(response.data);
    },
  });
}

export function useChannels(isDemoMode: boolean, teamId?: string | null) {
  return useQuery({
    queryKey: ["channels", teamId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return sampleChannels;
      const response = await api.get<ApiResponse<Channel[]>>("/messaging/channels/", {
        params: teamId ? { team_id: teamId } : {},
      });
      return unwrapList<Channel>(response.data).map(normalizeChannel);
    },
    refetchInterval: isDemoMode ? false : 10000,
  });
}

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    sender_id: message.sender_id ?? message.sender?.id ?? null,
    created_at: message.created_at ?? null,
  };
}

export function useChannelMessages(isDemoMode: boolean, channelId?: string | null) {
  return useQuery({
    enabled: Boolean(channelId),
    queryKey: ["channelMessages", channelId, isDemoMode],
    queryFn: async () => {
      if (!channelId) return [];
      if (isDemoMode) return (sampleMessagesByChannel[channelId] ?? []).map(normalizeMessage);
      const response = await api.get<ApiResponse<Message[]>>(`/messaging/channels/${channelId}/messages/`);
      return unwrapList<Message>(response.data).map(normalizeMessage);
    },
    refetchInterval: isDemoMode ? false : 5000,
  });
}

export function useSendMessage(isDemoMode: boolean, channelId: string, currentUser?: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (isDemoMode) {
        const message: Message = {
          id: `demo-${Date.now()}`,
          channel: channelId,
          text,
          created_at: new Date().toISOString(),
          sender: currentUser
            ? { id: currentUser.id, full_name: currentUser.full_name, avatar: null }
            : { id: "demo-user", full_name: "Sarah Chen", avatar: null },
        };
        return normalizeMessage(message);
      }
      const response = await api.post<ApiResponse<Message>>(`/messaging/channels/${channelId}/messages/`, { text });
      return normalizeMessage(unwrapData<Message>(response.data));
    },
    onMutate: async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const key = ["channelMessages", channelId, isDemoMode] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Message[]>(key) ?? [];
      const optimistic: Message = normalizeMessage({
        id: `optimistic-${Date.now()}`,
        channel: channelId,
        text: trimmed,
        created_at: new Date().toISOString(),
        sender: currentUser ? { id: currentUser.id, full_name: currentUser.full_name, avatar: null } : undefined,
        sender_id: currentUser?.id ?? null,
      });
      queryClient.setQueryData<Message[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _text, ctx) => {
      if (!ctx) return;
      const key = ["channelMessages", channelId, isDemoMode] as const;
      queryClient.setQueryData<Message[]>(key, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["channelMessages", channelId, isDemoMode] });
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useCalendarItems(isDemoMode: boolean, teamId?: string | null) {
  return useQuery({
    queryKey: ["calendar", teamId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return sampleCalendar;
      const [tasksResponse, meetingsResponse] = await Promise.all([
        api.get<ApiResponse<Task[]>>("/tasks/", {
          params: { ...(teamId ? { team_id: teamId } : {}), due: "this_week" },
        }),
        teamId
          ? api.get<ApiResponse<Meeting[]>>(`/meetings/teams/${teamId}/meetings/`)
          : Promise.resolve({ data: { data: [] as Meeting[] } }),
      ]);
      const taskItems: CalendarItem[] = unwrapList<Task>(tasksResponse.data)
        .filter((task) => Boolean(task.due_date))
        .map((task) => ({
          id: task.id,
          title: task.title,
          kind: "task",
          due_date: task.due_date ?? undefined,
        }));
      const meetingItems: CalendarItem[] = unwrapList<Meeting>(meetingsResponse.data)
        .map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          kind: "meeting",
          starts_at: meeting.starts_at,
        }));
      return [...meetingItems, ...taskItems];
    },
  });
}

export function useNotifications(isDemoMode: boolean) {
  return useQuery({
    queryKey: ["notifications", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return sampleNotifications;
      const response = await api.get<ApiResponse<NotificationItem[]>>("/messaging/notifications/");
      return unwrapList<NotificationItem>(response.data);
    },
  });
}

export function useMarkNotificationRead(isDemoMode: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) return;
      await api.patch(`/messaging/notifications/${id}/`, { is_read: true });
    },
    onMutate: async (id) => {
      const key = ["notifications", isDemoMode];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<NotificationItem[]>(key) ?? [];
      queryClient.setQueryData<NotificationItem[]>(key, prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notifications", isDemoMode], ctx.prev);
    },
  });
}

export function useTask(isDemoMode: boolean, taskId?: string | null) {
  return useQuery({
    enabled: Boolean(taskId),
    queryKey: ["task", taskId, isDemoMode],
    queryFn: async () => {
      if (!taskId) return null;
      if (isDemoMode) return sampleTasks.find((t) => t.id === taskId) ?? null;
      const response = await api.get<ApiResponse<Task>>(`/tasks/${taskId}/`);
      return unwrapData<Task>(response.data);
    },
  });
}

export function useCreateTask(isDemoMode: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      if (isDemoMode) {
        const task: Task = {
          id: `demo-task-${Date.now()}`,
          title: payload.title,
          description: payload.description ?? null,
          project: payload.project,
          priority: payload.priority ?? "normal",
          due_date: payload.due_date ?? null,
          status: "todo",
          column_name: "To Do",
        };
        return task;
      }
      const response = await api.post<ApiResponse<Task>>("/tasks/", payload);
      return unwrapData<Task>(response.data);
    },
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (task?.project) void queryClient.invalidateQueries({ queryKey: ["tasks", task.project] });
    },
  });
}

export function useUpdateTask(isDemoMode: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      if (isDemoMode) return { id, ...payload } as Task;
      const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}/`, payload);
      return unwrapData<Task>(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask(isDemoMode: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) return;
      await api.delete(`/tasks/${id}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useProjectColumns(isDemoMode: boolean, projectId?: string | null) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["columns", projectId, isDemoMode],
    queryFn: async () => {
      if (!projectId) return [];
      if (isDemoMode) {
        return [
          { id: "col-todo", name: "To Do", order: 0, is_done_column: false, project: projectId },
          { id: "col-prog", name: "In Progress", order: 1, is_done_column: false, project: projectId },
          { id: "col-review", name: "Review", order: 2, is_done_column: false, project: projectId },
          { id: "col-done", name: "Done", order: 3, is_done_column: true, project: projectId },
        ] as Column[];
      }
      const response = await api.get<ApiResponse<Column[]>>(`/projects/${projectId}/columns/`);
      return unwrapList<Column>(response.data);
    },
  });
}

export function useProjectSprints(isDemoMode: boolean, projectId?: string | null) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["sprints", projectId, isDemoMode],
    queryFn: async () => {
      if (!projectId) return [];
      if (isDemoMode) {
        return [
          { id: "sprint-1", name: "Sprint 1", status: "active", start_date: "2026-05-01", end_date: "2026-05-14", project: projectId },
          { id: "sprint-2", name: "Sprint 2", status: "planned", start_date: "2026-05-15", end_date: "2026-05-28", project: projectId },
        ] as Sprint[];
      }
      const response = await api.get<ApiResponse<Sprint[]>>(`/projects/${projectId}/sprints/`);
      return unwrapList<Sprint>(response.data);
    },
  });
}

export function useTeamMembers(isDemoMode: boolean, teamId?: string | null) {
  return useQuery({
    enabled: Boolean(teamId),
    queryKey: ["teamMembers", teamId, isDemoMode],
    queryFn: async () => {
      if (!teamId) return [];
      if (isDemoMode) {
        return [
          { id: "tm1", user: { id: "u1", email: "priya@nova.com", full_name: "Priya Sharma" }, role: "Manager" },
          { id: "tm2", user: { id: "u2", email: "alex@nova.com", full_name: "Alex Kim" }, role: "Member" },
          { id: "tm3", user: { id: "u3", email: "mina@nova.com", full_name: "Mina Rossi" }, role: "Member" },
          { id: "tm4", user: { id: "u4", email: "jordan@nova.com", full_name: "Jordan Blake" }, role: "Viewer" },
          { id: "tm5", user: { id: "demo-user", email: "sarah@nova-agency.com", full_name: "Sarah Chen" }, role: "CEO" },
        ] as TeamMember[];
      }
      const response = await api.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members/`);
      return unwrapList<TeamMember>(response.data);
    },
  });
}

export function useMeetings(isDemoMode: boolean, teamId?: string | null) {
  return useQuery({
    queryKey: ["meetings", teamId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        const now = new Date();
        const soon = new Date(now.getTime() + 1000 * 60 * 45);
        return [
          {
            id: "mtg1",
            title: "Daily Standup",
            start_time: soon.toISOString(),
            status: "upcoming",
            attendee_count: 4,
            description: "Daily team sync – blockers, progress, focus.",
          },
          {
            id: "mtg2",
            title: "Client Review Call",
            start_time: new Date(now.getTime() + 1000 * 60 * 60 * 3).toISOString(),
            status: "upcoming",
            attendee_count: 6,
            description: "Milestone review with Nova Agency client.",
          },
          {
            id: "mtg3",
            title: "Sprint Planning",
            start_time: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
            status: "upcoming",
            attendee_count: 5,
            description: "Sprint 3 scope and capacity planning session.",
          },
          {
            id: "mtg4",
            title: "Retrospective",
            start_time: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
            status: "completed",
            attendee_count: 5,
            has_recording: true,
            description: "Sprint 2 retrospective – what worked, what to improve.",
          },
        ] as Meeting[];
      }
      const response = await api.get<ApiResponse<Meeting[]>>(`/meetings/`, {
        params: teamId ? { team_id: teamId } : {},
      });
      return unwrapList<Meeting>(response.data);
    },
  });
}

export function useSearchTasks(isDemoMode: boolean, query: string, teamId?: string | null) {
  return useQuery({
    enabled: query.trim().length > 1,
    queryKey: ["searchTasks", query, teamId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        const q = query.toLowerCase();
        return sampleTasks.filter(
          (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
        );
      }
      const response = await api.get<ApiResponse<Task[]>>("/tasks/", {
        params: { search: query, ...(teamId ? { team_id: teamId } : {}) },
      });
      return unwrapList<Task>(response.data);
    },
  });
}
