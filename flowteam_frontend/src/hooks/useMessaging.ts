"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { Message, Notification } from "@/types/messaging";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import { getWsBaseUrl } from "@/lib/runtimeConfig";

type SocketEvent = { type: string; data: unknown };

function dedupeMessagesById(items: Message[]): Message[] {
  const seen = new Set<string>();
  const result: Message[] = [];

  // Keep the *last* occurrence of an id while preserving relative order.
  for (let i = items.length - 1; i >= 0; i--) {
    const msg = items[i];
    if (!msg?.id) continue;
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    result.unshift(msg);
  }

  return result;
}

function mergeAndSortMessages(items: Message[]): Message[] {
  const deduped = dedupeMessagesById(items);
  return deduped.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function useChatSocket(
  channelId: string | null,
  opts?: { currentUser?: { id: string; full_name: string; avatar: string | null } | null; onCallEvent?: (type: string, data: any) => void }
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  useEffect(() => {
    // Reset when switching channels so we don't briefly show stale history.
    setMessages([]);
    setTypingUsers({});
    setIsLoadingOlder(false);
    setHasMoreHistory(true);
  }, [channelId]);

  useEffect(() => {
    // Prune stale typing indicators (best-effort).
    const id = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next: typeof prev = {};
        for (const [uid, info] of Object.entries(prev)) {
          if (now - info.timestamp < 3000) next[uid] = info;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const handleMessage = useCallback((event: SocketEvent) => {
    const { type, data } = event;

    switch (type) {
      case "history":
        // Backend sends newest-first; reverse so oldest is at top
        setMessages((prev) => {
          const incoming = Array.isArray(data) ? ((data as Message[]) ?? []) : [];
          return mergeAndSortMessages([...prev, ...incoming.reverse()]);
        });
        break;
      case "message.new":
        // Append new messages to the END (but avoid duplicates on reconnect/history replay)
        setMessages((prev) => {
          const msg = data as Message;
          const pendingId = msg.client_id ? `client:${msg.client_id}` : null;
          if (pendingId && prev.some((m) => m.id === pendingId)) {
            return mergeAndSortMessages(
              prev.map((m) => (m.id === pendingId ? { ...msg, pending: false, failed: false } : m))
            );
          }
          if (prev.some((m) => m.id === msg.id)) {
            return mergeAndSortMessages(prev.map((m) => (m.id === msg.id ? { ...msg, pending: false, failed: false } : m)));
          }
          return mergeAndSortMessages([...prev, { ...msg, pending: false }]);
        });
        break;
      case "message.updated":
        setMessages((prev) => mergeAndSortMessages(prev.map((m) => (m.id === (data as Message).id ? (data as Message) : m))));
        break;
      case "message.deleted":
        setMessages((prev) =>
          mergeAndSortMessages(
            prev.map((m) => {
              const messageId = (data as { message_id?: string }).message_id;
              return m.id === messageId ? { ...m, is_deleted: true, text: "This message was deleted" } : m;
            })
          )
        );
        break;
      case "reaction.updated":
        setMessages((prev) =>
          mergeAndSortMessages(
            prev.map((m) => {
              const payload = data as { message_id?: string; reactions?: Message["reactions"] };
              return m.id === payload.message_id ? { ...m, reactions: payload.reactions ?? [] } : m;
            })
          )
        );
        break;
      case "user.typing":
        setTypingUsers((prev) => {
          const next = { ...prev };
          const payload = data as { is_typing?: boolean; user_id?: string; user_name?: string };
          if (payload.is_typing && payload.user_id) {
            next[payload.user_id] = { name: payload.user_name ?? "Unknown", timestamp: Date.now() };
          } else {
            if (payload.user_id) delete next[payload.user_id];
          }
          return next;
        });
        break;
      case "call.started":
      case "call.participant_joined":
      case "call.participant_left":
      case "call.ended":
      case "call.missed":
      case "call.signal":
        opts?.onCallEvent?.(type, data);
        break;
    }
  }, []);

  const { connectionState, send, reconnectNow } = useWebSocket(
    channelId ? `${getWsBaseUrl()}/ws/chat/${channelId}/` : "",
    { onMessage: handleMessage }
  );

  // REST fallback: if WS hasn't delivered history within 2s, fetch via HTTP.
  useEffect(() => {
    if (!channelId) return;
    const timer = setTimeout(async () => {
      setMessages((prev) => {
        // Only fetch if we have no server messages yet
        if (prev.some((m) => !m.id.startsWith("client:"))) return prev;
        void (async () => {
          try {
            const res = await api.get<ApiResponse<Message[]>>(
              `/messaging/channels/${channelId}/messages/`
            );
            const incoming = res.data.data ?? [];
            if (!Array.isArray(incoming) || incoming.length === 0) return;
            setMessages((current) => {
              if (current.some((m) => !m.id.startsWith("client:"))) return current;
              return mergeAndSortMessages([...current, ...incoming.reverse()]);
            });
          } catch {
            // best-effort
          }
        })();
        return prev;
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [channelId]);

  const sendCallMessage = useCallback((type: string, data: any) => {
    return send(type, data);
  }, [send]);

  const sendMessage = (text: string, parentId?: string, attachments?: Message["attachments"]) => {
    const trimmed = text.trim();
    const attachmentIds = (attachments ?? []).map((a) => a.id).filter(Boolean);
    if ((!trimmed && attachmentIds.length === 0) || !channelId) return false;

    const currentUser = opts?.currentUser ?? null;
    const clientId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());

    const optimisticId = `client:${clientId}`;

    if (currentUser) {
      const optimistic: Message = {
        id: optimisticId,
        client_id: clientId,
        sender: currentUser,
        text: trimmed,
        mentions: [],
        parent_id: parentId ?? null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        reactions: [],
        reply_count: 0,
        attachments: attachments ?? [],
        pending: true,
        failed: false,
      };
      setMessages((prev) => mergeAndSortMessages([...prev, optimistic]));
    }

    const ok = send("message.send", {
      text: trimmed,
      parent_id: parentId,
      client_id: clientId,
      attachment_ids: attachmentIds,
    });

    if (!ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
      );
    }

    return ok;
  };

  const retryMessage = useCallback(
    (m: Message) => {
      if (!m.id.startsWith("client:") || !m.client_id) return false;
      if (!channelId) return false;

      const attachmentIds = (m.attachments ?? []).map((a) => a.id).filter(Boolean);
      const ok = send("message.send", {
        text: (m.text ?? "").trim(),
        parent_id: m.parent_id ?? undefined,
        client_id: m.client_id,
        attachment_ids: attachmentIds,
      });

      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, pending: ok, failed: !ok } : x))
      );

      return ok;
    },
    [channelId, send]
  );
  const editMessage = (messageId: string, text: string) => send("message.edit", { message_id: messageId, text });
  const deleteMessage = (messageId: string) => send("message.delete", { message_id: messageId });
  const addReaction = (messageId: string, emoji: string) => send("reaction.add", { message_id: messageId, emoji });
  const removeReaction = (messageId: string, emoji: string) => send("reaction.remove", { message_id: messageId, emoji });
  const sendTyping = (isTyping: boolean) => send(isTyping ? "typing.start" : "typing.stop", {});

  const loadOlder = useCallback(async () => {
    if (!channelId || isLoadingOlder || !hasMoreHistory) return 0;

    const oldestServer = messages.find((m) => !m.id.startsWith("client:"));
    if (!oldestServer) return 0;

    setIsLoadingOlder(true);
    try {
      const res = await api.get<ApiResponse<Message[]>>(`/messaging/channels/${channelId}/messages/`, {
        params: { before: oldestServer.id },
      });
      const olderRaw = res.data.data ?? [];
      const older = Array.isArray(olderRaw) ? olderRaw : [];
      if (older.length === 0) {
        setHasMoreHistory(false);
        return 0;
      }

      // API returns newest-first; reverse so oldest-first for prepend.
      const toPrepend = older.slice().reverse();
      setMessages((prev) => mergeAndSortMessages([...toPrepend, ...prev]));
      if (older.length < 50) setHasMoreHistory(false);
      return older.length;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [channelId, hasMoreHistory, isLoadingOlder, messages]);

  return {
    messages,
    setMessages,
    sendMessage,
    sendCallMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    sendTyping,
    typingUsers,
    connectionState,
    reconnectNow,
    loadOlder,
    isLoadingOlder,
    hasMoreHistory,
  };
}

export function useNotificationSocket(onNewNotification?: (n: Notification) => void) {
  const handleMessage = useCallback((event: SocketEvent) => {
    if (event.type === "notification.new") {
      onNewNotification?.(event.data as Notification);
    }
  }, [onNewNotification]);

  const { connectionState, send } = useWebSocket(
    `${getWsBaseUrl()}/ws/notifications/`,
    { onMessage: handleMessage }
  );

  const markRead = (notificationIds: string[]) => send("notifications.mark_read", { notification_ids: notificationIds });

  return { connectionState, markRead };
}

export function useChannelEventsSocket(onUnread?: (channelId: string, increment: number) => void) {
  const handleMessage = useCallback(
    (event: SocketEvent) => {
      if (event.type !== "channel.unread") return;
      const payload = event.data as { channel_id?: unknown; increment?: unknown };
      const channelId = typeof payload.channel_id === "string" ? payload.channel_id : "";
      const increment = typeof payload.increment === "number" ? payload.increment : 1;
      if (!channelId) return;
      onUnread?.(channelId, increment);
    },
    [onUnread]
  );

  const { connectionState } = useWebSocket(
    `${getWsBaseUrl()}/ws/channels/`,
    { onMessage: handleMessage }
  );

  return { connectionState };
}

export function useTeamPresenceSocket(
  teamId: string | null | undefined,
  onSnapshot?: (onlineUserIds: string[]) => void,
  onUpdate?: (userId: string, online: boolean) => void
) {
  const handleMessage = useCallback(
    (event: SocketEvent) => {
      if (event.type === "presence.snapshot") {
        const payload = event.data as { online_user_ids?: unknown };
        const ids = Array.isArray(payload.online_user_ids) ? payload.online_user_ids.filter((v) => typeof v === "string") : [];
        onSnapshot?.(ids as string[]);
        return;
      }
      if (event.type === "presence.update") {
        const payload = event.data as { user_id?: unknown; online?: unknown };
        const userId = typeof payload.user_id === "string" ? payload.user_id : "";
        const online = typeof payload.online === "boolean" ? payload.online : false;
        if (!userId) return;
        onUpdate?.(userId, online);
      }
    },
    [onSnapshot, onUpdate]
  );

  const { connectionState } = useWebSocket(
    teamId ? `${getWsBaseUrl()}/ws/presence/${teamId}/` : "",
    { onMessage: handleMessage }
  );

  return { connectionState };
}
