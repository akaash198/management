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
import type { ApiResponse, CalendarItem, Channel, Message, NotificationItem, Project, Task, User } from "./types";

type Meeting = {
  id: string;
  title: string;
  starts_at?: string;
};

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
