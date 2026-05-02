import { useCallback, useEffect, useMemo, useState } from "react";
import { api, unwrapList } from "./api";
import { getWsBaseUrl } from "./runtime";
import { useWebSocket } from "./useWebSocket";
import { sampleMessagesByChannel } from "./sampleData";
import type { ApiResponse, Message, User } from "./types";

type SocketEvent = { type: string; data: unknown };

function dedupeMessagesById(items: Message[]): Message[] {
  const seen = new Set<string>();
  const result: Message[] = [];

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
  return deduped
    .slice()
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
}

export function useChatSocket(channelId: string | null, opts?: { currentUser?: User | null; isDemoMode?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [latestSeq, setLatestSeq] = useState<number | null>(null);

  useEffect(() => {
    if (opts?.isDemoMode && channelId) {
      setMessages(sampleMessagesByChannel[channelId] ?? []);
    } else {
      setMessages([]);
    }
    setTypingUsers({});
    setIsLoadingOlder(false);
    setHasMoreHistory(true);
    setLatestSeq(null);
  }, [channelId, opts?.isDemoMode]);

  useEffect(() => {
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
        setMessages((prev) => {
          const incoming = Array.isArray(data) ? ((data as Message[]) ?? []) : [];
          return mergeAndSortMessages([...prev, ...incoming.reverse()]);
        });
        break;
      case "history.cursor": {
        const cursor = (data ?? {}) as { latest_seq?: unknown };
        const seq = typeof cursor.latest_seq === "number" ? cursor.latest_seq : null;
        setLatestSeq(seq);
        break;
      }
      case "message.new":
        setMessages((prev) => {
          const msg = data as Message;
          const pendingId = msg.client_id ? `client:${msg.client_id}` : null;
          if (pendingId && prev.some((m) => m.id === pendingId)) {
            return mergeAndSortMessages(prev.map((m) => (m.id === pendingId ? { ...msg, pending: false, failed: false } : m)));
          }
          if (prev.some((m) => m.id === msg.id)) {
            return mergeAndSortMessages(prev.map((m) => (m.id === msg.id ? { ...msg, pending: false, failed: false } : m)));
          }
          return mergeAndSortMessages([...prev, { ...msg, pending: false, failed: false }]);
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
      default:
        break;
    }
  }, []);

  const url = useMemo(() => (channelId ? `${getWsBaseUrl()}/ws/chat/${channelId}/` : ""), [channelId]);
  const { connectionState, send, reconnectNow } = useWebSocket(opts?.isDemoMode ? "" : url, { onMessage: handleMessage });

  const sendMessage = useCallback(
    (text: string, options?: { parent_id?: string | null; attachment_ids?: string[] }) => {
      const trimmed = (text ?? "").trim();
      if ((!trimmed && (!options?.attachment_ids || options.attachment_ids.length === 0)) || !channelId) return false;

      if (opts?.isDemoMode) {
        const currentUser = opts?.currentUser ?? null;
        const msg: Message = {
          id: `demo-${Date.now()}`,
          channel: channelId,
          text: trimmed,
          parent_id: options?.parent_id ?? null,
          created_at: new Date().toISOString(),
          sender: currentUser ? { id: currentUser.id, full_name: currentUser.full_name, avatar: null } : null,
          sender_id: currentUser?.id ?? null,
          reactions: [],
        };
        setMessages((prev) => mergeAndSortMessages([...prev, msg]));
        return true;
      }

      const clientId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localId = `client:${clientId}`;
      const currentUser = opts?.currentUser ?? undefined;
      const optimistic: Message = {
        id: localId,
        client_id: clientId,
        channel: channelId,
        text: trimmed,
        parent_id: options?.parent_id ?? null,
        created_at: new Date().toISOString(),
        pending: true,
        failed: false,
        sender: currentUser ? { id: currentUser.id, full_name: currentUser.full_name, avatar: null } : undefined,
        sender_id: currentUser?.id ?? null,
      };

      setMessages((prev) => mergeAndSortMessages([...prev, optimistic]));

      const ok = send("message.send", {
        text: trimmed,
        parent_id: options?.parent_id ?? undefined,
        client_id: clientId,
        attachment_ids: options?.attachment_ids ?? [],
      });

      if (!ok) {
        setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m)));
      }
      return ok;
    },
    [channelId, send, opts?.currentUser, opts?.isDemoMode]
  );

  const retryMessage = useCallback(
    (localMessage: Message) => {
      if (opts?.isDemoMode) return false;
      if (!localMessage.id?.startsWith("client:") || !localMessage.client_id) return false;
      if (!channelId) return false;

      const attachmentIds = (localMessage.attachments ?? []).map((a) => a.id).filter(Boolean);
      const ok = send("message.send", {
        text: (localMessage.text ?? "").trim(),
        parent_id: localMessage.parent_id ?? undefined,
        client_id: localMessage.client_id,
        attachment_ids: attachmentIds,
      });

      setMessages((prev) => prev.map((m) => (m.id === localMessage.id ? { ...m, pending: ok, failed: !ok } : m)));
      return ok;
    },
    [channelId, send, opts?.isDemoMode]
  );

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      if (opts?.isDemoMode) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text, is_edited: true, edited_at: new Date().toISOString() } : m)));
        return true;
      }
      return send("message.edit", { message_id: messageId, text });
    },
    [opts?.isDemoMode, send]
  );
  const deleteMessage = useCallback(
    (messageId: string) => {
      if (opts?.isDemoMode) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true, text: "This message was deleted" } : m)));
        return true;
      }
      return send("message.delete", { message_id: messageId });
    },
    [opts?.isDemoMode, send]
  );
  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (opts?.isDemoMode) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions ?? [];
            const existing = reactions.find((r) => r.emoji === emoji);
            if (existing) {
              return { ...m, reactions: reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, reacted_by_me: true } : r)) };
            }
            return { ...m, reactions: [...reactions, { emoji, count: 1, reacted_by_me: true }] };
          })
        );
        return true;
      }
      return send("reaction.add", { message_id: messageId, emoji });
    },
    [opts?.isDemoMode, send]
  );
  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (opts?.isDemoMode) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = (m.reactions ?? []).map((r) => (r.emoji === emoji ? { ...r, reacted_by_me: false } : r));
            return { ...m, reactions };
          })
        );
        return true;
      }
      return send("reaction.remove", { message_id: messageId, emoji });
    },
    [opts?.isDemoMode, send]
  );
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (opts?.isDemoMode) return false;
      return send(isTyping ? "typing.start" : "typing.stop", {});
    },
    [opts?.isDemoMode, send]
  );

  const loadOlder = useCallback(async () => {
    if (opts?.isDemoMode) return 0;
    if (!channelId || isLoadingOlder || !hasMoreHistory) return 0;
    const oldestServer = messages.find((m) => !m.id.startsWith("client:"));
    if (!oldestServer?.id) return 0;

    setIsLoadingOlder(true);
    try {
      const res = await api.get<ApiResponse<Message[]>>(`/messaging/channels/${channelId}/messages/`, {
        params: { before: oldestServer.id },
      });
      const older = unwrapList<Message>(res.data);
      if (older.length === 0) {
        setHasMoreHistory(false);
        return 0;
      }
      const toPrepend = older.slice().reverse();
      setMessages((prev) => mergeAndSortMessages([...toPrepend, ...prev]));
      if (older.length < 50) setHasMoreHistory(false);
      return older.length;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [channelId, hasMoreHistory, isLoadingOlder, messages, opts?.isDemoMode]);

  return {
    messages,
    setMessages,
    sendMessage,
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
    latestSeq,
  };
}
