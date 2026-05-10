"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent } from "react";
import { Channel, Message } from "@/types/messaging";
import { useChatSocket } from "@/hooks/useMessaging";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { MessageItem } from "./MessageItem";
import { Button } from "@/components/ui/button";
import { Hash, Lock, Users, Search, Info, Send, Paperclip, X, MessageSquare, Smile, Bell, BellOff, SlidersHorizontal, Clock3, Mail, MoreHorizontal, Phone, Video, ChevronDown, Bold, Italic } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { FormatToolbar } from "./FormatToolbar";
import { CallComponent } from "./CallComponent";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse, TeamMember } from "@/types";
import type { SlimUser } from "@/types/messaging";
import type { ChannelReadState } from "@/types/messaging";
import type { Attachment } from "@/types/messaging";
import type { MessagePin, MessageSave } from "@/types/messaging";
import type { MessageEdit } from "@/types/messaging";
import type { ScheduledMessage } from "@/types/messaging";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNowStrict } from "date-fns";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { AIButton } from "@/components/ai/AIButton";
import { useAIStore } from "@/store/ai";

type SearchPreset = {
  id: string;
  name: string;
  query: string;
  senderId: string;
  dateFrom: string;
  dateTo: string;
  favorite: boolean;
};

export function ChatArea({
  channel,
  focusMessageId,
  onRefreshChannels,
  onStartDirectMessage,
  onlineUserIds,
}: {
  channel: Channel;
  focusMessageId?: string | null;
  onRefreshChannels?: () => void;
  onStartDirectMessage?: (userId: string) => void;
  onlineUserIds?: Set<string>;
}) {
  const { user } = useAuthStore();
  const { activeTeamId, fetchTeams, teams } = useTeamStore();
  const aiEnabled = useAIStore((state) => state.aiEnabled);
  const MAX_ATTACHMENTS_PER_MESSAGE = 5;
  const [text, setText] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [threadText, setThreadText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMobileOpen, setSearchMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSenderId, setSearchSenderId] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchPresetName, setSearchPresetName] = useState("");
  const [searchPresets, setSearchPresets] = useState<SearchPreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [selectedAddIds, setSelectedAddIds] = useState<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [localFocusMessageId, setLocalFocusMessageId] = useState<string | null>(null);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [editHistoryOpen, setEditHistoryOpen] = useState(false);
  const [editHistoryMessage, setEditHistoryMessage] = useState<Message | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [notificationLevel, setNotificationLevel] = useState<"all" | "mentions" | "mute">("all");
  const [notificationKeywords, setNotificationKeywords] = useState("");
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [acceptedCallId, setAcceptedCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callType: 'audio' | 'video'; callerName: string } | null>(null);
  const callEventHandlerRef = useRef<((type: string, data: any) => void) | null>(null);
  const queryClient = useQueryClient();
  const {
    messages,
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
    sendCallMessage,
  } = useChatSocket(channel.id, {
    currentUser: user ? { id: user.id, full_name: user.full_name, avatar: user.avatar_url ?? null } : null,
    onCallEvent: (type, data) => {
      if (type === 'call_started' && !callOpen) {
        // Someone else started a call — show incoming call prompt
        const startedById = data?.started_by?.id ?? data?.started_by;
        if (startedById && String(startedById) !== String(user?.id)) {
          setIncomingCall({
            callId: data?.id,
            callType: data?.call_type ?? 'audio',
            callerName: data?.started_by?.full_name ?? 'Someone',
          });
          return;
        }
      }
      callEventHandlerRef.current?.(type, data);
    },
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingPrependAdjustRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const isAtBottomRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const jumpStateRef = useRef<{ channelId: string; messageId: string; attempts: number; inflight: boolean } | null>(null);
  const prevServerMessageCountRef = useRef(0);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [channelSummary, setChannelSummary] = useState("");
  const [summarizingChannel, setSummarizingChannel] = useState(false);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);

  const draftKey = `draft:channel:${channel.id}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved != null && !text) setText(saved);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(draftKey, text);
        else localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    };
  }, [draftKey, text]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    // Channel switch: reset scroll assumptions.
    isAtBottomRef.current = true;
    setPendingAttachments([]);
    setUploadingCount(0);
    setNewMessageCount(0);
    setQuoteMessage(null);
    setScheduleText("");
    setScheduleAt("");
    prevServerMessageCountRef.current = 0;
  }, [channel.id]);

  useEffect(() => {
    setNotificationLevel((channel.notification_level as "all" | "mentions" | "mute") || "all");
    setNotificationKeywords((channel.notification_keywords ?? []).join(", "));
  }, [channel.notification_keywords, channel.notification_level]);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightMessageId(messageId);
    window.setTimeout(() => setHighlightMessageId((cur) => (cur === messageId ? null : cur)), 2500);
    return true;
  }, []);

  const effectiveFocusMessageId = localFocusMessageId ?? focusMessageId;

  useEffect(() => {
    const target = (effectiveFocusMessageId ?? "").trim();
    if (!target) return;

    const key = `${channel.id}:${target}`;
    const state = jumpStateRef.current;
    if (!state || `${state.channelId}:${state.messageId}` !== key) {
      jumpStateRef.current = { channelId: channel.id, messageId: target, attempts: 0, inflight: false };
      setHighlightMessageId(null);
    }
  }, [channel.id, effectiveFocusMessageId]);

  useEffect(() => {
    const target = (effectiveFocusMessageId ?? "").trim();
    if (!target) return;

    if (messages.some((m) => m.id === target)) {
      window.requestAnimationFrame(() => {
        const ok = scrollToMessage(target);
        if (ok && localFocusMessageId === target) setLocalFocusMessageId(null);
      });
      return;
    }

    const state = jumpStateRef.current;
    if (!state || state.channelId !== channel.id || state.messageId !== target) return;
    if (state.inflight) return;
    if (!hasMoreHistory) return;
    if (messages.length === 0) return; // wait for initial history
    if (state.attempts >= 8) return;

    state.inflight = true;
    void (async () => {
      const loaded = await loadOlder();
      state.attempts += 1;
      if (loaded === 0) return;
    })().finally(() => {
      state.inflight = false;
    });
  }, [channel.id, effectiveFocusMessageId, hasMoreHistory, loadOlder, localFocusMessageId, messages, scrollToMessage]);

  useEffect(() => {
    // Only count new top-level server messages that arrive while the user isn't at the bottom.
    if (pendingPrependAdjustRef.current) {
      // History prepend; don't increment "new messages" counter.
      prevServerMessageCountRef.current = messages.filter((m) => !m.id.startsWith("client:") && !m.parent_id).length;
      return;
    }

    const serverTopLevelCount = messages.filter((m) => !m.id.startsWith("client:") && !m.parent_id).length;
    const prev = prevServerMessageCountRef.current;

    // Initialize on first load.
    if (prev === 0 && serverTopLevelCount > 0) {
      prevServerMessageCountRef.current = serverTopLevelCount;
      return;
    }

    if (serverTopLevelCount > prev && !isAtBottomRef.current) {
      setNewMessageCount((c) => c + (serverTopLevelCount - prev));
    }

    prevServerMessageCountRef.current = serverTopLevelCount;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // If we just prepended older history, preserve the user's viewport.
    if (pendingPrependAdjustRef.current) {
      const prev = pendingPrependAdjustRef.current;
      pendingPrependAdjustRef.current = null;
      const nextScrollHeight = el.scrollHeight;
      el.scrollTop = prev.scrollTop + (nextScrollHeight - prev.scrollHeight);
      return;
    }

    if (isAtBottomRef.current) scrollToBottom("auto");
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    // Best-effort typing indicator (debounced stop).
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!text.trim()) {
      sendTyping(false);
      return;
    }

    sendTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1500);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, sendTyping]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const tick = async () => {
      try {
        await api.post(`/messaging/channels/${channel.id}/scheduled/dispatch-due/`);
      } catch {
        // best-effort
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 30000);
    return () => window.clearInterval(id);
  }, [channel.id]);

  const myRole = useMemo(() => teams.find((t) => t.id === activeTeamId)?.your_role ?? null, [teams, activeTeamId]);
  const canManageChannel = !!user?.is_superuser || myRole === "ceo" || myRole === "admin" || myRole === "manager";

  const { data: channelMembers, isLoading: membersLoading } = useQuery<SlimUser[]>({
    queryKey: ["channel-members", channel.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SlimUser[]>>(`/messaging/channels/${channel.id}/members/`);
      return res.data.data ?? [];
    },
    enabled: channel.is_private || membersOpen || infoOpen || addMembersOpen || searchOpen || searchMobileOpen,
  });

  const { data: pins } = useQuery<MessagePin[]>({
    queryKey: ["channel-pins", channel.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MessagePin[]>>(`/messaging/channels/${channel.id}/pins/`);
      return res.data.data ?? [];
    },
  });

  const { data: saves } = useQuery<MessageSave[]>({
    queryKey: ["channel-saves", channel.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MessageSave[]>>(`/messaging/saved/`, { params: { channel_id: channel.id } });
      return res.data.data ?? [];
    },
  });

  const { data: scheduledMessages, refetch: refetchScheduled } = useQuery<ScheduledMessage[]>({
    queryKey: ["channel-scheduled", channel.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ScheduledMessage[]>>(`/messaging/channels/${channel.id}/scheduled/`);
      return res.data.data ?? [];
    },
    enabled: scheduledOpen,
    refetchInterval: scheduledOpen ? 30000 : false,
  });

  const { data: readState } = useQuery<ChannelReadState[]>({
    queryKey: ["channel-read-state", channel.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ChannelReadState[]>>(`/messaging/channels/${channel.id}/read-state/`);
      return res.data.data ?? [];
    },
    refetchInterval: 15000,
  });
  const savedIds = useMemo(() => new Set((saves ?? []).map((s) => s.message.id)), [saves]);
  const [savedOpen, setSavedOpen] = useState(false);

  const { data: editHistory } = useQuery<MessageEdit[]>({
    queryKey: ["message-edit-history", channel.id, editHistoryMessage?.id],
    queryFn: async () => {
      if (!editHistoryMessage?.id) return [];
      const res = await api.get<ApiResponse<MessageEdit[]>>(
        `/messaging/channels/${channel.id}/messages/${editHistoryMessage.id}/history/`
      );
      return res.data.data ?? [];
    },
    enabled: editHistoryOpen && !!editHistoryMessage?.id,
  });

  const pinnedIds = useMemo(() => new Set((pins ?? []).map((p) => p.message.id)), [pins]);
  const [pinsOpen, setPinsOpen] = useState(false);
  const isDirectMessage = channel.is_private && (
    !!channel.dm_other_user_id ||
    (channel.name || "").startsWith("dm-") ||
    ((channelMembers ?? []).length === 2)
  );
  const directPeer = useMemo(
    () => (isDirectMessage ? (channelMembers ?? []).find((member) => member.id !== user?.id) ?? null : null),
    [isDirectMessage, channelMembers, user?.id]
  );
  const directPeerIsOnline = !!(directPeer && onlineUserIds?.has(directPeer.id));
  const recentMediaAttachments = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .flatMap((message) => message.attachments ?? [])
        .filter((attachment) => /^(image|video)\//.test(attachment.content_type || ""))
        .slice(0, 8),
    [messages]
  );
  const recentDocumentAttachments = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .flatMap((message) => message.attachments ?? [])
        .filter((attachment) => !/^(image|video)\//.test(attachment.content_type || ""))
        .slice(0, 6),
    [messages]
  );

  const toggleSave = useCallback(
    async (messageId: string, isSaved: boolean) => {
      try {
        if (isSaved) {
          await api.delete(`/messaging/saved/${messageId}/`);
        } else {
          await api.post(`/messaging/saved/`, { message_id: messageId });
        }
        await queryClient.invalidateQueries({ queryKey: ["channel-saves", channel.id] });
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to update saved message"));
      }
    },
    [channel.id, queryClient]
  );

  const togglePin = useCallback(
    async (messageId: string, isPinned: boolean) => {
      try {
        if (isPinned) {
          await api.delete(`/messaging/channels/${channel.id}/pins/${messageId}/`);
        } else {
          await api.post(`/messaging/channels/${channel.id}/pins/`, { message_id: messageId });
        }
        await queryClient.invalidateQueries({ queryKey: ["channel-pins", channel.id] });
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to update pin"));
      }
    },
    [channel.id, queryClient]
  );

  const muteChannel = useCallback(
    async (input?: { minutes?: number; forever?: boolean }) => {
      try {
        await api.post(`/messaging/channels/${channel.id}/mute/`, input ?? {});
        onRefreshChannels?.();
        toast.success("Channel muted");
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to mute channel"));
      }
    },
    [channel.id, onRefreshChannels]
  );

  const unmuteChannel = useCallback(async () => {
    try {
      await api.post(`/messaging/channels/${channel.id}/unmute/`);
      onRefreshChannels?.();
      toast.success("Channel unmuted");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to unmute channel"));
    }
  }, [channel.id, onRefreshChannels]);

  const saveNotificationPreferences = useCallback(async () => {
    try {
      setSavingNotificationPrefs(true);
      const keywords = notificationKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await api.post(`/messaging/channels/${channel.id}/notification-settings/`, {
        notification_level: notificationLevel,
        notification_keywords: keywords,
      });
      onRefreshChannels?.();
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to save notification preferences"));
    } finally {
      setSavingNotificationPrefs(false);
    }
  }, [channel.id, notificationKeywords, notificationLevel, onRefreshChannels]);

  const startCall = useCallback(async (type: 'audio' | 'video') => {
    setCallType(type);
    setCallOpen(true);
  }, []);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    setCallType(incomingCall.callType);
    setAcceptedCallId(incomingCall.callId);
    setCallOpen(true);
    setIncomingCall(null);
    sendCallMessage('call.join', { call_id: incomingCall.callId });
  }, [incomingCall, sendCallMessage]);

  const summarizeChannel = useCallback(async () => {
    if (!aiEnabled) {
      toast.error("AI features are not enabled for this team");
      return;
    }
    try {
      setSummarizingChannel(true);
      const response = await api.post<ApiResponse<{ summary: string }>>("/ai/channel-summary/", {
        channel_id: channel.id,
        since_hours: 48,
      });
      setChannelSummary(response.data.data?.summary ?? "");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to summarize channel"));
    } finally {
      setSummarizingChannel(false);
    }
  }, [aiEnabled, channel.id]);

  const declineIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const createScheduledMessage = useCallback(async () => {
    const textToSchedule = (scheduleText.trim() || text.trim()).trim();
    if (!textToSchedule) {
      toast.error("Enter a message to schedule");
      return;
    }
    if (!scheduleAt) {
      toast.error("Select schedule time");
      return;
    }
    try {
      const iso = new Date(scheduleAt).toISOString();
      await api.post(`/messaging/channels/${channel.id}/scheduled/`, { text: textToSchedule, send_at: iso });
      toast.success("Message scheduled");
      setScheduleText("");
      setScheduleAt("");
      if (!scheduleText.trim()) setText("");
      await refetchScheduled();
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to schedule message"));
    }
  }, [channel.id, refetchScheduled, scheduleAt, scheduleText, text]);

  const deleteScheduledMessage = useCallback(
    async (scheduledId: string) => {
      try {
        await api.delete(`/messaging/channels/${channel.id}/scheduled/${scheduledId}/`);
        toast.success("Scheduled message removed");
        await refetchScheduled();
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to remove scheduled message"));
      }
    },
    [channel.id, refetchScheduled]
  );

  const markUnread = useCallback(
    async (messageId: string) => {
      try {
        await api.post(`/messaging/channels/${channel.id}/mark-unread/`, { message_id: messageId });
        await queryClient.invalidateQueries({ queryKey: ["channel-read-state", channel.id] });
        setLocalFocusMessageId(messageId);
        onRefreshChannels?.();
        toast.success("Marked as unread");
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to mark as unread"));
      }
    },
    [channel.id, onRefreshChannels, queryClient]
  );

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["team-members", activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeamId}/members/`);
      return res.data.data ?? [];
    },
    enabled: (addMembersOpen || channel.is_private) && !!activeTeamId,
  });
  const directPeerTeamMember = useMemo(
    () => (channel.is_private ? (teamMembers ?? []).find((tm) => tm.user.id === directPeer?.id) ?? null : null),
    [channel.is_private, directPeer?.id, teamMembers]
  );
  const isDirectConversation = channel.is_private && !!directPeer;

  const hasSearchFilters = !!(searchQuery.trim() || searchSenderId || searchDateFrom || searchDateTo);
  const showSearchPanel = hasSearchFilters || searchPresets.length > 0;
  const searchPresetStorageKey = useMemo(() => `messaging:search-presets:${activeTeamId || "none"}:${channel.id}`, [activeTeamId, channel.id]);
  const pinFavoritePresetsTop = useCallback((items: SearchPreset[]) => {
    const favorites = items.filter((item) => item.favorite);
    const regular = items.filter((item) => !item.favorite);
    return [...favorites, ...regular];
  }, []);
  const searchSummary = useMemo(() => {
    const parts: string[] = [];
    const q = searchQuery.trim();
    if (q) parts.push(`"${q}"`);
    if (searchSenderId) {
      const sender = (channelMembers ?? []).find((member) => member.id === searchSenderId);
      parts.push(sender ? `sender:${sender.full_name}` : "sender");
    }
    if (searchDateFrom) parts.push(`from:${searchDateFrom}`);
    if (searchDateTo) parts.push(`to:${searchDateTo}`);
    return parts.join(" | ");
  }, [channelMembers, searchDateFrom, searchDateTo, searchQuery, searchSenderId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(searchPresetStorageKey);
      if (!raw) {
        setSearchPresets([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setSearchPresets([]);
        return;
      }
      const normalized = parsed
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: String(p.id || ""),
          name: String(p.name || ""),
          query: String(p.query || ""),
          senderId: String(p.senderId || ""),
          dateFrom: String(p.dateFrom || ""),
          dateTo: String(p.dateTo || ""),
          favorite: Boolean(p.favorite),
        }))
        .filter((p) => p.id && p.name)
        .slice(0, 12);
      setSearchPresets(pinFavoritePresetsTop(normalized));
    } catch {
      setSearchPresets([]);
    }
  }, [pinFavoritePresetsTop, searchPresetStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(searchPresetStorageKey, JSON.stringify(searchPresets.slice(0, 12)));
    } catch {
      // ignore local storage errors
    }
  }, [searchPresetStorageKey, searchPresets]);
  const { data: searchResults } = useQuery<Message[]>({
    queryKey: ["channel-search", channel.id, searchQuery, searchSenderId, searchDateFrom, searchDateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      const q = searchQuery.trim();
      if (q) params.q = q;
      if (searchSenderId) params.sender_id = searchSenderId;
      if (searchDateFrom) params.date_from = searchDateFrom;
      if (searchDateTo) params.date_to = searchDateTo;
      const res = await api.get<ApiResponse<Message[]>>(`/messaging/channels/${channel.id}/messages/`, { params });
      return res.data.data ?? [];
    },
    enabled: hasSearchFilters,
  });

  const focusMessage = useCallback(
    (messageId: string, opts?: { closeSearch?: boolean; updateUrl?: boolean }) => {
      const closeSearch = opts?.closeSearch ?? true;
      const updateUrl = opts?.updateUrl ?? true;
      if (closeSearch) {
        setSearchQuery("");
        setSearchOpen(false);
      }
      setLocalFocusMessageId(messageId);
      if (!updateUrl) return;
      try {
        const next = new URL(window.location.href);
        next.searchParams.set("channel", channel.id);
        next.searchParams.set("message", messageId);
        window.history.replaceState(null, "", next.toString());
      } catch {
        // ignore
      }
    },
    [channel.id]
  );

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setSearchSenderId("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchOpen(false);
    setSearchMobileOpen(false);
    setActiveSearchId(null);
  }, []);

  const saveCurrentSearchPreset = useCallback(() => {
    const q = searchQuery.trim();
    if (!q && !searchSenderId && !searchDateFrom && !searchDateTo) {
      toast.error("Add at least one filter before saving a preset");
      return;
    }

    const name = searchPresetName.trim() || "Saved filter";
    const preset = {
      id: `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      name,
      query: q,
      senderId: searchSenderId,
      dateFrom: searchDateFrom,
      dateTo: searchDateTo,
      favorite: false,
    };

    setSearchPresets((prev) => pinFavoritePresetsTop([preset, ...prev]).slice(0, 12));
    setSearchPresetName("");
    toast.success("Search preset saved");
  }, [pinFavoritePresetsTop, searchDateFrom, searchDateTo, searchPresetName, searchQuery, searchSenderId]);

  const applySearchPreset = useCallback(
    (preset: { query: string; senderId: string; dateFrom: string; dateTo: string }) => {
      setSearchQuery(preset.query || "");
      setSearchSenderId(preset.senderId || "");
      setSearchDateFrom(preset.dateFrom || "");
      setSearchDateTo(preset.dateTo || "");
      setSearchOpen(true);
      setSearchMobileOpen(false);
    },
    []
  );

  const removeSearchPreset = useCallback((id: string) => {
    setSearchPresets((prev) => prev.filter((p) => p.id !== id));
    if (editingPresetId === id) {
      setEditingPresetId(null);
      setEditingPresetName("");
    }
  }, [editingPresetId]);

  const moveSearchPreset = useCallback((id: string, direction: "up" | "down") => {
    setSearchPresets((prev) => {
      const index = prev.findIndex((preset) => preset.id === id);
      if (index < 0) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      if ((prev[target]?.favorite ?? false) !== (prev[index]?.favorite ?? false)) return prev;

      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }, []);

  const toggleFavoritePreset = useCallback((id: string) => {
    setSearchPresets((prev) => {
      const updated = prev.map((preset) =>
        preset.id === id ? { ...preset, favorite: !preset.favorite } : preset
      );
      return pinFavoritePresetsTop(updated);
    });
  }, [pinFavoritePresetsTop]);

  const startRenamePreset = useCallback((id: string, name: string) => {
    setEditingPresetId(id);
    setEditingPresetName(name);
  }, []);

  const cancelRenamePreset = useCallback(() => {
    setEditingPresetId(null);
    setEditingPresetName("");
  }, []);

  const saveRenamePreset = useCallback((id: string) => {
    const name = editingPresetName.trim();
    if (!name) {
      toast.error("Preset name cannot be empty");
      return;
    }
    setSearchPresets((prev) => prev.map((preset) => (preset.id === id ? { ...preset, name } : preset)));
    setEditingPresetId(null);
    setEditingPresetName("");
    toast.success("Preset renamed");
  }, []);

  const applyDatePreset = useCallback((preset: "today" | "last7" | "thisMonth") => {
    const now = new Date();
    const toInputDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    if (preset === "today") {
      const today = toInputDate(now);
      setSearchDateFrom(today);
      setSearchDateTo(today);
      return;
    }

    if (preset === "last7") {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      setSearchDateFrom(toInputDate(from));
      setSearchDateTo(toInputDate(now));
      return;
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setSearchDateFrom(toInputDate(monthStart));
    setSearchDateTo(toInputDate(now));
  }, []);

  const clearSearchFilter = useCallback((key: "query" | "sender" | "from" | "to") => {
    if (key === "query") setSearchQuery("");
    if (key === "sender") setSearchSenderId("");
    if (key === "from") setSearchDateFrom("");
    if (key === "to") setSearchDateTo("");
  }, []);

  const activeSearchChips = useMemo(() => {
    const chips: Array<{ key: "query" | "sender" | "from" | "to"; label: string }> = [];
    const q = searchQuery.trim();
    if (q) chips.push({ key: "query", label: `Text: ${q}` });
    if (searchSenderId) {
      const sender = (channelMembers ?? []).find((member) => member.id === searchSenderId);
      chips.push({ key: "sender", label: sender ? `Sender: ${sender.full_name}` : "Sender" });
    }
    if (searchDateFrom) chips.push({ key: "from", label: `From: ${searchDateFrom}` });
    if (searchDateTo) chips.push({ key: "to", label: `To: ${searchDateTo}` });
    return chips;
  }, [channelMembers, searchDateFrom, searchDateTo, searchQuery, searchSenderId]);

  useEffect(() => {
    if (!hasSearchFilters) {
      setActiveSearchId(null);
      return;
    }
    const first = (searchResults ?? [])[0];
    if (!first?.id) return;
    setActiveSearchId((cur) => (cur ? cur : first.id));
  }, [hasSearchFilters, searchResults]);

  const visibleMessages = useMemo(() => {
    if (hasSearchFilters) return searchResults ?? [];
    return messages;
  }, [hasSearchFilters, messages, searchResults]);

  const displayedMessages = useMemo(() => {
    return hasSearchFilters ? visibleMessages : visibleMessages.filter((m) => !m.parent_id);
  }, [hasSearchFilters, visibleMessages]);

  const myLastReadAt = useMemo(() => {
    const me = user?.id ?? "";
    if (!me) return null;
    const row = (readState ?? []).find((r) => r.user?.id === me);
    return row?.last_read_at ?? null;
  }, [readState, user?.id]);

  const firstUnreadId = useMemo(() => {
    if (!myLastReadAt) return null;
    if (hasSearchFilters) return null;
    const cutoff = new Date(myLastReadAt).getTime();
    for (const m of displayedMessages) {
      if (!m || m.id.startsWith("client:")) continue;
      if (new Date(m.created_at).getTime() > cutoff) return m.id;
    }
    return null;
  }, [displayedMessages, hasSearchFilters, myLastReadAt]);

  const lastServerMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.id.startsWith("client:")) continue;
      return m;
    }
    return null;
  }, [messages]);

  const seenByUsers = useMemo(() => {
    if (!lastServerMessage) return [];
    const cutoff = new Date(lastServerMessage.created_at).getTime();
    const me = user?.id ?? "";
    return (readState ?? [])
      .filter((r) => r.user?.id && r.user.id !== me)
      .filter((r) => new Date(r.last_read_at).getTime() >= cutoff)
      .map((r) => r.user);
  }, [lastServerMessage, readState, user?.id]);

  const readStateByUserId = useMemo(() => {
    const map = new Map<string, ChannelReadState>();
    for (const row of readState ?? []) {
      const id = row?.user?.id;
      if (id) map.set(id, row);
    }
    return map;
  }, [readState]);

  const messageById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const replyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages) {
      if (!m.parent_id) continue;
      counts.set(m.parent_id, (counts.get(m.parent_id) ?? 0) + 1);
    }
    return counts;
  }, [messages]);

  const resolveThreadRootId = (m: Message): string => {
    let current: Message | undefined = m;
    let guard = 0;
    while (current?.parent_id && guard < 10) {
      const parent = messageById.get(current.parent_id);
      if (!parent) break;
      current = parent;
      guard += 1;
    }
    return current?.id ?? m.id;
  };

  const threadRoot = useMemo(() => {
    if (!threadRootId) return null;
    return messageById.get(threadRootId) ?? null;
  }, [messageById, threadRootId]);

  const threadReplies = useMemo(() => {
    if (!threadRoot) return [];
    return messages
      .filter((m) => m.parent_id === threadRoot.id)
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, threadRoot]);

  const expandEmojiShortcodes = useCallback((rawInput: string): string => {
    const map: Record<string, string> = {
      smile: "😄",
      laugh: "😂",
      thumbsup: "👍",
      heart: "❤️",
      fire: "🔥",
      rocket: "🚀",
      party: "🎉",
      eyes: "👀",
      check: "✅",
      wave: "👋",
      partyparrot: "🦜",
      shipit: "🚢",
    };
    return rawInput.replace(/:([a-z0-9_+-]+):/gi, (full, key) => map[String(key).toLowerCase()] ?? full);
  }, []);

  const applySlashCommand = useCallback((rawInput: string): string => {
    const raw = rawInput.trim();
    if (!raw.startsWith("/")) return rawInput;

    const [commandRaw, ...restParts] = raw.split(" ");
    const command = commandRaw.toLowerCase();
    const payload = restParts.join(" ").trim();

    if (command === "/shrug") return `${payload}${payload ? " " : ""}¯\\_(ツ)_/¯`;
    if (command === "/giphy") return payload ? `[GIF] https://giphy.com/search/${encodeURIComponent(payload)}` : "[GIF]";
    if (command === "/assign") return payload ? `Assigned: ${payload}` : "Usage: /assign @user task";
    if (command === "/remind") return payload ? `Reminder: ${payload}` : "Usage: /remind 10m follow up";
    if (command === "/poll") {
      const items = payload.split("|").map((item) => item.trim()).filter(Boolean);
      if (items.length < 3) return "Usage: /poll Question | Option 1 | Option 2";
      const [question, ...options] = items;
      return [`📊 Poll: ${question}`, ...options.map((option, index) => `${index + 1}. ${option}`)].join("\n");
    }
    return rawInput;
  }, []);

  const handleSend = (parentId?: string) => {
    if (!text.trim() && pendingAttachments.length === 0) return;
    const parsedText = applySlashCommand(expandEmojiShortcodes(text));
    const finalText = quoteMessage ? `> ${quoteMessage.sender}: ${quoteMessage.text}\n${parsedText}` : parsedText;
    const ok = sendMessage(finalText, parentId, pendingAttachments);
    if (!ok) {
      toast.error(connectionState === "connected" ? "Failed to send message" : "Disconnected. Reconnecting…");
      return;
    }
    setText("");
    setQuoteMessage(null);
    setPendingAttachments([]);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    isAtBottomRef.current = true;
    scrollToBottom("smooth");
  };

  const handleSendThread = () => {
    if (!threadRoot) return;
    if (!threadText.trim() && pendingAttachments.length === 0) return;
    const ok = sendMessage(applySlashCommand(expandEmojiShortcodes(threadText)), threadRoot.id, pendingAttachments);
    if (!ok) {
      toast.error(connectionState === "connected" ? "Failed to send message" : "Disconnected. Reconnecting…");
      return;
    }
    setThreadText("");
    setPendingAttachments([]);
    isAtBottomRef.current = true;
    scrollToBottom("smooth");
  };

  const startEdit = (m: Message) => {
    setEditingMessageId(m.id);
    setEditingValue(m.text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingValue("");
  };

  const saveEdit = () => {
    if (!editingMessageId) return;
    const next = editingValue.trim();
    if (!next) return;
    editMessage(editingMessageId, next);
    cancelEdit();
  };

  const handleToggleReaction = (m: Message, emoji: string, reactedByMe: boolean) => {
    if (reactedByMe) removeReaction(m.id, emoji);
    else addReaction(m.id, emoji);
  };

  const removeMember = useCallback(
    async (userId: string) => {
      try {
        await api.delete(`/messaging/channels/${channel.id}/members/${userId}/`);
        toast.success("Member removed");
        await queryClient.invalidateQueries({ queryKey: ["channel-members", channel.id] });
      } catch (err) {
        toast.error(toErrorMessage(err, "Failed to remove member"));
      }
    },
    [channel.id, queryClient]
  );

  const addMembers = useCallback(async () => {
    if (selectedAddIds.size === 0) return;
    try {
      await api.post(`/messaging/channels/${channel.id}/members/`, { member_ids: Array.from(selectedAddIds) });
      toast.success("Members added");
      setAddMembersOpen(false);
      setSelectedAddIds(new Set());
      setAddMemberQuery("");
      await queryClient.invalidateQueries({ queryKey: ["channel-members", channel.id] });
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to add members"));
    }
  }, [channel.id, queryClient, selectedAddIds]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const remaining = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
      if (remaining <= 0) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
        return;
      }

      const toUpload = list.slice(0, remaining);
      if (toUpload.length < list.length) {
        toast.warning(`Only the first ${toUpload.length} file(s) were attached (max ${MAX_ATTACHMENTS_PER_MESSAGE}).`);
      }

      setUploadingCount((c) => c + toUpload.length);
      try {
        const form = new FormData();
        for (const f of toUpload) form.append("files", f, f.name);

        const res = await api.post<ApiResponse<Attachment[]>>(`/messaging/channels/${channel.id}/uploads/`, form);
        if (!res.data.success) {
          toast.error(res.data.error ?? "Upload failed");
          return;
        }
        const uploaded = res.data.data ?? [];
        setPendingAttachments((prev) => [...prev, ...uploaded]);
      } catch (err) {
        toast.error(toErrorMessage(err, "Upload failed"));
      } finally {
        setUploadingCount((c) => Math.max(0, c - toUpload.length));
      }
    },
    [MAX_ATTACHMENTS_PER_MESSAGE, channel.id, pendingAttachments.length]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      void uploadFiles(files);
    },
    [uploadFiles]
  );

  const hasDragFiles = (e: DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes("Files");
  };

  const onDragEnter = useCallback((e: DragEvent) => {
    if (!hasDragFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    if (!hasDragFiles(e)) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {
      // ignore
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!hasDragFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (!hasDragFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) void uploadFiles(files);
    },
    [uploadFiles]
  );

  const insertIntoComposer = useCallback(
    (insertion: string) => {
      // Fix common Windows-1252 mojibake like "ðŸ˜Š" -> "😊".
      const fixMojibake = (input: string) => {
        const cp1252Extra: Record<number, number> = {
          0x20ac: 0x80,
          0x201a: 0x82,
          0x0192: 0x83,
          0x201e: 0x84,
          0x2026: 0x85,
          0x2020: 0x86,
          0x2021: 0x87,
          0x02c6: 0x88,
          0x2030: 0x89,
          0x0160: 0x8a,
          0x2039: 0x8b,
          0x0152: 0x8c,
          0x017d: 0x8e,
          0x2018: 0x91,
          0x2019: 0x92,
          0x201c: 0x93,
          0x201d: 0x94,
          0x2022: 0x95,
          0x2013: 0x96,
          0x2014: 0x97,
          0x02dc: 0x98,
          0x2122: 0x99,
          0x0161: 0x9a,
          0x203a: 0x9b,
          0x0153: 0x9c,
          0x017e: 0x9e,
          0x0178: 0x9f,
        };

        const bytes: number[] = [];
        for (const ch of input) {
          const code = ch.charCodeAt(0);
          if (code <= 0xff) bytes.push(code);
          else if (code in cp1252Extra) bytes.push(cp1252Extra[code]);
          else return input;
        }
        try {
          return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
        } catch {
          return input;
        }
      };

      const fixed = fixMojibake(insertion);
      const el = composerRef.current;
      if (!el) {
        setText((prev) => prev + fixed);
        return;
      }
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const next = text.slice(0, start) + fixed + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + fixed.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [text]
  );


  const maybeLoadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!hasMoreHistory || isLoadingOlder) return;
    if (el.scrollTop > 120) return;

    pendingPrependAdjustRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    void loadOlder();
  }, [hasMoreHistory, isLoadingOlder, loadOlder]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    isAtBottomRef.current = distanceFromBottom < 120;
    if (isAtBottomRef.current) setNewMessageCount(0);
    maybeLoadOlder();
  }, [maybeLoadOlder]);

  return (
    <div className="relative flex-1 flex h-full flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <div className="z-10 flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-card px-5 xl:pr-[348px]">
        {/* Channel identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            {channel.is_private ? <Lock size={13} /> : <Hash size={13} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground leading-tight">
                {channel.display_name}
              </h2>
              {directPeer ? (
                <span className="inline-flex items-center gap-1 shrink-0 text-[11px]">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", directPeerIsOnline ? "bg-emerald-500" : "bg-amber-400")} />
                  <span className={directPeerIsOnline ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}>
                    {directPeerIsOnline ? "Online" : "Away"}
                  </span>
                </span>
              ) : channel.description ? (
                <span className="hidden md:inline truncate text-[11px] text-muted-foreground/70 leading-tight">
                  {channel.description}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pill tab group */}
          <div className="hidden sm:flex h-7 items-stretch rounded-lg border border-border overflow-hidden divide-x divide-border">
            <button
              type="button"
              onClick={() => setPinsOpen(true)}
              className="flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
              title="Pinned messages"
            >
              📌 {pins?.length ? pins.length : "Pins"}
            </button>
            <button
              type="button"
              onClick={() => setSavedOpen(true)}
              className="flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
              title="Saved messages"
            >
              🔖 {saves?.length ? saves.length : "Saved"}
            </button>
            <button
              type="button"
              onClick={() => setScheduledOpen(true)}
              className="hidden lg:flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
              title="Scheduled messages"
            >
              <Clock3 size={11} />
              {scheduledMessages?.length ? scheduledMessages.length : "Scheduled"}
            </button>
            {aiEnabled && (
              <button
                type="button"
                onClick={() => void summarizeChannel()}
                className="hidden lg:flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
                title="AI catch-up summary"
                disabled={summarizingChannel}
              >
                {summarizingChannel ? "…" : "Catch up"}
              </button>
            )}
            <button
              type="button"
              onClick={() => startCall('audio')}
              className="flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
              title="Start audio call"
            >
              <Phone size={11} />
              Call
            </button>
            <button
              type="button"
              onClick={() => startCall('video')}
              className="flex items-center gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap"
              title="Start video call"
            >
              <Video size={11} />
              Video
            </button>
          </div>

          {/* Divider */}
          <div className="mx-1 hidden h-5 w-px bg-border/70 sm:block" />

          {/* Mute */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-8 w-8 rounded-xl border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
                aria-label={channel.is_muted ? "Muted" : "Mute"} title={channel.is_muted ? "Muted" : "Mute"}
              >
                {channel.is_muted ? <BellOff size={14} /> : <Bell size={14} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {channel.is_muted ? (
                <>
                  <DropdownMenuItem onClick={() => void unmuteChannel()}>Unmute</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 60 })}>Mute 1 hour</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 8 * 60 })}>Mute 8 hours</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 24 * 60 })}>Mute 1 day</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ forever: true })}>Mute indefinitely</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 60 })}>Mute 1 hour</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 8 * 60 })}>Mute 8 hours</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ minutes: 24 * 60 })}>Mute 1 day</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteChannel({ forever: true })}>Mute indefinitely</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search inline */}
          {searchOpen && (
            <div className="ml-1 hidden items-center gap-1.5 md:flex">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages…"
                className="h-8 w-[180px] rounded-lg border-border bg-background text-[12px]"
              />
              <select
                value={searchSenderId}
                onChange={(e) => setSearchSenderId(e.target.value)}
                className="h-8 w-[140px] rounded-lg border border-border bg-background px-3 text-[12px]"
                aria-label="Filter by sender" title="Filter by sender"
              >
                <option value="">All senders</option>
                {(channelMembers ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              <Input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)}
                className="h-8 w-[136px] rounded-lg border-border bg-background text-[12px]" aria-label="From" />
              <Input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)}
                className="h-8 w-[136px] rounded-lg border-border bg-background text-[12px]" aria-label="To" />
              <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 text-[11px]" onClick={() => applyDatePreset("today")}>Today</Button>
              <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 text-[11px]" onClick={() => applyDatePreset("last7")}>7d</Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px] text-muted-foreground hover:bg-white hover:text-foreground" onClick={resetSearch}>Clear</Button>
            </div>
          )}

          <Button variant="ghost" size="icon"
            className="hidden h-8 w-8 rounded-xl border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground md:inline-flex"
            onClick={() => setSearchOpen((v) => !v)} aria-label="Search" title="Search"
          >
            <Search size={14} />
          </Button>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 rounded-xl border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground md:hidden"
            onClick={() => setSearchMobileOpen(true)} aria-label="Search filters"
          >
            <SlidersHorizontal size={14} />
          </Button>

          {firstUnreadId && !hasSearchFilters && (
            <Button variant="ghost" size="sm"
              className="h-8 gap-1 rounded-xl bg-primary/8 px-3 text-[11px] font-medium text-primary hover:bg-primary/12"
              onClick={() => focusMessage(firstUnreadId)} aria-label="Jump to first unread"
            >
              <MessageSquare size={12} /> Unread
            </Button>
          )}

          <div className="mx-1 h-5 w-px bg-border/70" />

          <Button variant="ghost" size="icon"
            className="h-8 w-8 rounded-xl border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
            onClick={() => setMembersOpen(true)} aria-label="Members" title="Members"
          >
            <Users size={14} />
          </Button>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 rounded-xl border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
            onClick={() => setInfoOpen(true)} aria-label="Info" title="Info"
          >
            <Info size={14} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0 xl:pr-[336px]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-5" onScroll={onScroll}>
          <div className="mx-auto w-full max-w-5xl">
            {channelSummary && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-primary">AI catch-up</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-foreground">{channelSummary}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setChannelSummary("")}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}
            {showSearchPanel && (
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-bold">{hasSearchFilters ? "Search results" : "Saved search presets"}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[12px] text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        const items = (searchResults ?? []).filter((m) => m?.id);
                        if (items.length === 0) return;
                        const idx = Math.max(0, items.findIndex((m) => m.id === activeSearchId));
                        const next = items[(idx - 1 + items.length) % items.length];
                        setActiveSearchId(next.id);
                        focusMessage(next.id, { closeSearch: false });
                      }}
                      disabled={!hasSearchFilters || (searchResults ?? []).length === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[12px] text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        const items = (searchResults ?? []).filter((m) => m?.id);
                        if (items.length === 0) return;
                        const idx = Math.max(0, items.findIndex((m) => m.id === activeSearchId));
                        const next = items[(idx + 1) % items.length];
                        setActiveSearchId(next.id);
                        focusMessage(next.id, { closeSearch: false });
                      }}
                      disabled={!hasSearchFilters || (searchResults ?? []).length === 0}
                    >
                      Next
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[12px] text-muted-foreground hover:bg-muted"
                      onClick={resetSearch}
                    >
                      Exit
                    </Button>
                  </div>
                </div>
                {hasSearchFilters ? (
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    {(searchResults ?? []).length} result{(searchResults ?? []).length === 1 ? "" : "s"} for{" "}
                    <span className="font-semibold text-foreground">{searchSummary || "all messages"}</span>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    Select a preset to apply filters, or set filters above and save a new preset.
                  </div>
                )}
                {activeSearchChips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeSearchChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                        onClick={() => clearSearchFilter(chip.key)}
                        title={`Remove ${chip.label} filter`}
                        aria-label={`Remove ${chip.label} filter`}
                      >
                        <span>{chip.label}</span>
                        <span className="text-foreground">x</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={searchPresetName}
                      onChange={(e) => setSearchPresetName(e.target.value)}
                      placeholder="Preset name (optional)"
                      className="h-8 text-[12px]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      onClick={saveCurrentSearchPreset}
                      disabled={!hasSearchFilters}
                    >
                      Save preset
                    </Button>
                  </div>
                  <div className="mt-2 max-h-32 overflow-auto space-y-1">
                    {searchPresets.length === 0 ? (
                      <div className="text-[12px] text-muted-foreground px-1">No saved presets yet.</div>
                    ) : (
                      searchPresets.map((preset, presetIndex) => (
                      <div key={preset.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-2 py-1.5">
                          {editingPresetId === preset.id ? (
                            <>
                              <Input
                                value={editingPresetName}
                                onChange={(e) => setEditingPresetName(e.target.value)}
                                className="h-8 text-[12px] flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveRenamePreset(preset.id);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelRenamePreset();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => saveRenamePreset(preset.id)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={cancelRenamePreset}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="text-left flex-1 min-w-0"
                                onClick={() => applySearchPreset(preset)}
                                title={preset.name}
                              >
                                <div className="text-[12px] font-medium truncate">
                                  {preset.favorite ? "[Fav] " : ""}
                                  {preset.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {[preset.query || "", preset.senderId ? "sender" : "", preset.dateFrom || "", preset.dateTo || ""]
                                    .filter(Boolean)
                                    .join(" | ") || "No filters"}
                                </div>
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => toggleFavoritePreset(preset.id)}
                              >
                                {preset.favorite ? "Unfavorite" : "Favorite"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => startRenamePreset(preset.id, preset.name)}
                              >
                                Rename
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => moveSearchPreset(preset.id, "up")}
                                disabled={presetIndex === 0 || searchPresets[presetIndex - 1]?.favorite !== preset.favorite}
                              >
                                Up
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => moveSearchPreset(preset.id, "down")}
                                disabled={presetIndex === searchPresets.length - 1 || searchPresets[presetIndex + 1]?.favorite !== preset.favorite}
                              >
                                Down
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                                onClick={() => removeSearchPreset(preset.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {hasSearchFilters && (
                  <>
                    <div className="mt-3 max-h-48 overflow-auto divide-y divide-border rounded-lg border border-border">
                      {(searchResults ?? []).length === 0 ? (
                        <div className="p-3 text-[12px] text-muted-foreground">No matches.</div>
                      ) : (
                        (searchResults ?? []).slice(0, 20).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={cn(
                              "w-full text-left p-3 hover:bg-muted/30",
                              activeSearchId === m.id && "bg-primary/10"
                            )}
                            onClick={() => {
                              setActiveSearchId(m.id);
                              focusMessage(m.id, { closeSearch: false });
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[12px] font-semibold truncate">{m.sender?.full_name ?? "Unknown"}</div>
                              <div className="text-[11px] text-muted-foreground shrink-0">
                                {new Date(m.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="mt-1 text-[12px] text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                              {m.text}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {(searchResults ?? []).length > 20 && (
                      <div className="mt-2 text-[11px] text-muted-foreground">Showing first 20 results.</div>
                    )}
                  </>
                )}
              </div>
            )}
            {(hasMoreHistory || isLoadingOlder) && displayedMessages.length > 0 && (
              <div className="flex justify-center pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[12px] text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    const el = scrollRef.current;
                    if (!el) return;
                    pendingPrependAdjustRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
                    void loadOlder();
                  }}
                  disabled={!hasMoreHistory || isLoadingOlder}
                >
                  {isLoadingOlder ? "Loading..." : hasMoreHistory ? "Load older messages" : "No more messages"}
                </Button>
              </div>
            )}
            {displayedMessages.length === 0 ? (
              <div className="h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-3 max-w-sm px-6">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                    <Hash size={20} className="text-muted-foreground/60" />
                  </div>
                  <h3 className="text-[15px] font-medium">No messages yet</h3>
                  <p className="text-[13px] text-muted-foreground/70">
                    Start the conversation in <span className="font-medium text-foreground">#{channel.name}</span>.
                  </p>
                </div>
              </div>
            ) : (
              displayedMessages.map((message, index, arr) => {
                const prev = index > 0 ? arr[index - 1] : null;
                const showDateDivider =
                  !prev ||
                  new Date(prev.created_at).toDateString() !== new Date(message.created_at).toDateString();
                const sameGroup =
                  !showDateDivider &&
                  prev &&
                  !message.is_system &&
                  !prev.is_system &&
                  prev.sender.id === message.sender.id &&
                  !message.parent_id &&
                  !prev.parent_id &&
                  new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
                const showAvatar = !sameGroup;
                const isReply = !!message.parent_id;
                const parent = isReply ? messageById.get(message.parent_id!) : null;
                const parentPreview = parent
                  ? { senderName: parent.sender.full_name, text: parent.text }
                  : null;
                const computedReplies = replyCounts.get(message.id) ?? message.reply_count ?? 0;
                const day = new Date(message.created_at);
                const dayFormat: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
                if (day.getFullYear() !== new Date().getFullYear()) dayFormat.year = "numeric";
                const dayLabel = new Intl.DateTimeFormat(undefined, dayFormat).format(day);

                return (
                  <Fragment key={message.id}>
                    {showDateDivider && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-[11px] font-semibold text-muted-foreground/60 tracking-wide">
                          {dayLabel}
                        </span>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>
                    )}
                    {firstUnreadId === message.id && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="h-px flex-1 bg-border" />
                        <div className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          New messages
                        </div>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <MessageItem
                      message={message}
                      isOwn={message.sender.id === user?.id}
                      canModerate={canManageChannel}
                      showAvatar={showAvatar}
                      isHighlighted={highlightMessageId === message.id}
                      highlightQuery={searchQuery.trim() ? searchQuery.trim() : undefined}
                      parentPreview={parentPreview}
                      replyCount={computedReplies}
                      isPinned={pinnedIds.has(message.id)}
                      isSaved={savedIds.has(message.id)}
                      isEditing={editingMessageId === message.id}
                      editValue={editingMessageId === message.id ? editingValue : undefined}
                      onViewEditHistory={() => {
                        setEditHistoryMessage(message);
                        setEditHistoryOpen(true);
                      }}
                      onMarkUnread={() => void markUnread(message.id)}
                      onStartEdit={() => startEdit(message)}
                      onEditChange={setEditingValue}
                      onEditCancel={cancelEdit}
                      onEditSave={saveEdit}
                      onReply={() => {
                        const rootId = resolveThreadRootId(message);
                        setThreadRootId(rootId);
                        setThreadOpen(true);
                      }}
                      onOpenThread={() => {
                        const rootId = resolveThreadRootId(message);
                        setThreadRootId(rootId);
                        setThreadOpen(true);
                      }}
                      onDelete={() => {
                        if (!confirm("Delete this message?")) return;
                        deleteMessage(message.id);
                      }}
                      onToggleReaction={(emoji, reactedByMe) => handleToggleReaction(message, emoji, reactedByMe)}
                      onRetry={() => retryMessage(message)}
                      onTogglePin={() => void togglePin(message.id, pinnedIds.has(message.id))}
                      onToggleSave={() => void toggleSave(message.id, savedIds.has(message.id))}
                      onCopyLink={() => {
                        const link = `${window.location.origin}/messages?channel=${channel.id}&message=${message.id}`;
                        navigator.clipboard?.writeText(link).then(
                          () => toast.success("Link copied"),
                          () => toast.error("Failed to copy link")
                        );
                      }}
                      onQuoteReply={() => {
                        setQuoteMessage({
                          id: message.id,
                          sender: message.sender.full_name,
                          text: message.text.slice(0, 240),
                        });
                        composerRef.current?.focus();
                      }}
                      onForward={() => {
                        setText((prev) => {
                          const prefix = prev.trim() ? `${prev.trim()}\n\n` : "";
                          return `${prefix}Fwd from ${message.sender.full_name}:\n${message.text}`;
                        });
                        setLocalFocusMessageId(message.id);
                        composerRef.current?.focus();
                        toast.success("Message copied into composer");
                      }}
                    />
                  </Fragment>
                );
              })
            )}
          </div>
        </div>

        {newMessageCount > 0 && (
          <div className="absolute bottom-4 right-4 z-20">
            <Button
              type="button"
              size="sm"
              className="shadow-xl rounded-full px-3.5"
              onClick={() => {
                setNewMessageCount(0);
                scrollToBottom("smooth");
              }}
            >
              {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"}
            </Button>
          </div>
        )}
      </div>

      {lastServerMessage && lastServerMessage.sender.id === user?.id && seenByUsers.length > 0 && (
        <div className="pb-2">
          <div className="max-w-5xl mx-auto px-6 xl:pr-[320px] flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {seenByUsers.slice(0, 5).map((u) => (
                <Avatar key={u.id} className="h-4 w-4 border border-card" title={u.full_name}>
                  <AvatarImage src={u.avatar ?? ""} />
                  <AvatarFallback className="text-[8px] font-bold bg-muted text-muted-foreground">
                    {u.full_name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {seenByUsers.length === 1
                ? `Seen by ${seenByUsers[0]?.full_name}`
                : `Seen by ${seenByUsers.length}`}
            </span>
          </div>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="border-t border-border bg-card px-6 pb-5 pt-3 xl:pr-[348px]">
        <div className="mx-auto max-w-5xl space-y-2">
          {/* Typing indicator */}
          <div className="h-4 text-[11px] text-muted-foreground font-medium px-2 italic">
            {Object.keys(typingUsers).length > 0 && (
              <span>
                {Object.values(typingUsers).map(u => u.name).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing…
              </span>
            )}
          </div>

          <div
            className="relative rounded-xl border border-border bg-background p-2 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15"
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {dragActive && (
              <div className="absolute inset-1 rounded-xl border-2 border-dashed border-primary/50 bg-background/80 flex items-center justify-center pointer-events-none z-20">
                <div className="text-sm font-medium text-primary">Drop files to attach</div>
              </div>
            )}
             {threadOpen && threadRoot && (
               <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-background border border-border mb-2">
                 <div className="min-w-0">
                   <div className="text-[11px] font-bold text-primary">Replying in thread</div>
                   <div className="text-[11px] text-muted-foreground truncate">
                     {threadRoot.sender.full_name}: {threadRoot.text}
                   </div>
                 </div>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8 text-muted-foreground hover:bg-muted"
                   onClick={() => {
                     setThreadOpen(false);
                     setThreadRootId(null);
                   }}
                   aria-label="Cancel thread reply"
                 >
                   <X size={16} />
                 </Button>
               </div>
             )}

             {quoteMessage && (
               <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-background border border-border mb-2">
                 <div className="min-w-0">
                   <div className="text-[11px] font-bold text-primary">Quote reply</div>
                   <div className="text-[11px] text-muted-foreground truncate">
                     {quoteMessage.sender}: {quoteMessage.text}
                   </div>
                 </div>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8 text-muted-foreground hover:bg-muted"
                   onClick={() => setQuoteMessage(null)}
                   aria-label="Cancel quote reply"
                 >
                   <X size={16} />
                 </Button>
               </div>
             )}

             {pendingAttachments.length > 0 && (
               <div className="flex flex-wrap gap-2 px-3 py-2 mb-2">
                 {pendingAttachments.map((a) => (
                   <div
                     key={a.id}
                     className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-2 py-1 text-[12px]"
                   >
                     <span className="truncate max-w-[220px]" title={a.filename}>
                       {a.filename}
                     </span>
                     <Button
                       type="button"
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6"
                       onClick={() => setPendingAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                       aria-label="Remove attachment"
                     >
                       <X size={14} />
                     </Button>
                   </div>
                 ))}
               </div>
             )}
             <MentionAutocomplete 
                value={text}
                onChange={setText}
                onMentionsChange={() => {}}
                teamId={activeTeamId ?? ""}
                inputRef={composerRef}
                onPaste={handlePaste}
                className="min-h-[56px] resize-none border-none bg-transparent px-2 shadow-none focus-visible:ring-0"
                placeholder={`Message ${channel.is_private ? "" : "#"}${channel.display_name || channel.name}`}
                onSubmit={() => handleSend(threadOpen && threadRoot ? threadRoot.id : undefined)}
             />
             {showFormatToolbar && (
               <FormatToolbar
                 value={text}
                 onChange={setText}
                 textareaRef={composerRef}
                 className="border-t border-border/60"
               />
             )}
             <div className="mt-1 flex items-center justify-between border-t border-border/60 px-2 pb-1.5 pt-2">
               <div className="flex items-center gap-1">
                 <input
                   ref={fileInputRef}
                   type="file"
                   multiple
                   className="hidden"
                   onChange={(e) => {
                     const files = e.target.files;
                     if (files) void uploadFiles(files);
                     if (fileInputRef.current) fileInputRef.current.value = "";
                   }}
                 />
                 <button
                   type="button"
                   className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                   onClick={() => fileInputRef.current?.click()}
                   aria-label="Attach files"
                   title="Attach files"
                 >
                   <Paperclip size={15} />
                 </button>
                 <Popover>
                   <PopoverTrigger asChild>
                     <button
                       type="button"
                       className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                       aria-label="Emoji"
                       title="Emoji"
                     >
                       <Smile size={15} />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0" align="start" side="top">
                     <EmojiPicker onSelect={(emoji) => insertIntoComposer(emoji)} />
                   </PopoverContent>
                 </Popover>
                 <button
                   type="button"
                   className={cn(
                     "flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                     showFormatToolbar && "bg-muted text-foreground"
                   )}
                   aria-label="Formatting"
                   title="Text formatting"
                   onClick={() => setShowFormatToolbar((v) => !v)}
                 >
                   <Bold size={15} />
                 </button>
                 <button
                   type="button"
                   className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                   aria-label="Schedule message"
                   title="Schedule message"
                   onClick={() => {
                     if (text.trim()) setScheduleText(text.trim());
                     setScheduledOpen(true);
                   }}
                 >
                   <Clock3 size={15} />
                 </button>
               </div>
               <button
                 type="button"
                 className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                 onClick={() => handleSend(threadOpen && threadRoot ? threadRoot.id : undefined)}
                 disabled={(!text.trim() && pendingAttachments.length === 0) || uploadingCount > 0}
                 title={uploadingCount > 0 ? "Uploading…" : "Send"}
               >
                 <Send size={13} />
               </button>
             </div>
          </div>
          <div className="flex justify-center">
            {connectionState !== "connected" && (
              <button
                type="button"
                className="text-[10px] text-red-500 flex items-center gap-2"
                onClick={() => reconnectNow()}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                {connectionState === "connecting" ? "Reconnecting…" : "Disconnected"} (click to retry)
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="absolute right-0 top-[52px] hidden h-[calc(100%-52px)] w-[336px] border-l border-border bg-card xl:flex xl:flex-col">
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-16 w-16 border border-border bg-muted/30 shadow-sm">
                <AvatarImage src={(directPeer?.avatar || "") as string} />
                <AvatarFallback>{(directPeer?.full_name?.[0] ?? channel.display_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-[18px] font-semibold tracking-[-0.02em]">{directPeer?.full_name || channel.display_name}</div>
                <div className="text-[12px] text-muted-foreground truncate">
                  {isDirectConversation ? "Direct conversation" : "Channel overview"}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      isDirectConversation
                        ? directPeerIsOnline
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        : "bg-primary"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isDirectConversation
                        ? directPeerIsOnline
                          ? "text-emerald-600"
                          : "text-amber-600"
                        : "text-primary"
                    )}
                  >
                    {isDirectConversation ? (directPeerIsOnline ? "Active now" : "Away") : "Team channel"}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setInfoOpen(true)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              className="flex-1 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
              onClick={() => (isDirectConversation ? setMembersOpen(true) : setInfoOpen(true))}
            >
              {isDirectConversation ? "Profile" : "Details"}
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-2 text-[12px] font-medium transition-colors border-r border-border",
                channel.is_muted
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => (channel.is_muted ? void unmuteChannel() : void muteChannel({ minutes: 60 }))}
            >
              {channel.is_muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="flex-1 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => (isDirectConversation ? setInfoOpen(true) : setMembersOpen(true))}
            >
              {isDirectConversation ? "More" : "Members"}
            </button>
          </div>
        </div>

        <div className="space-y-3 border-b border-border p-5 text-[12px]">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">About</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{isDirectConversation ? directPeerTeamMember?.user.email || "No email available" : channel.description || "No description set"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} local time</span>
          </div>
          {!isDirectConversation && (
            <div className="text-muted-foreground">
              {(channelMembers?.length ?? 0) > 0 ? `${channelMembers?.length ?? 0} members` : "Open channel"}
            </div>
          )}
        </div>

        <div className="border-b border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Media ({recentMediaAttachments.length})</div>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setSearchOpen(true)}>
              View all
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recentMediaAttachments.length === 0 ? (
              <div className="col-span-3 text-[12px] text-muted-foreground">No media yet.</div>
            ) : (
              recentMediaAttachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-16 rounded-lg border border-border bg-muted/30 overflow-hidden"
                >
                  {attachment.content_type?.startsWith("image/") ? (
                    <img src={attachment.url} alt={attachment.filename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground px-1 text-center">
                      Video
                    </div>
                  )}
                </a>
              ))
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Documents ({recentDocumentAttachments.length})</div>
          </div>
          <div className="space-y-2">
            {recentDocumentAttachments.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">No documents shared.</div>
            ) : (
              recentDocumentAttachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                    DOC
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium truncate">{attachment.filename}</div>
                    <div className="text-[11px] text-muted-foreground">{Math.max(1, Math.round((attachment.size || 0) / 1024))} KB</div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </aside>

      <Sheet
        open={threadOpen}
        onOpenChange={(open) => {
          setThreadOpen(open);
          if (!open) {
            setThreadRootId(null);
            setThreadText("");
          }
        }}
      >
        <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <SheetHeader>
                <SheetTitle>Thread</SheetTitle>
              </SheetHeader>
              {threadRoot && (
                <div className="mt-3 rounded-xl border border-border bg-muted/20">
                  <MessageItem
                    message={threadRoot}
                    isOwn={threadRoot.sender.id === user?.id}
                    canModerate={canManageChannel}
                    showAvatar={true}
                    replyCount={replyCounts.get(threadRoot.id) ?? threadRoot.reply_count ?? 0}
                    isEditing={editingMessageId === threadRoot.id}
                    editValue={editingMessageId === threadRoot.id ? editingValue : undefined}
                    onViewEditHistory={() => {
                      setEditHistoryMessage(threadRoot);
                      setEditHistoryOpen(true);
                    }}
                    onMarkUnread={() => void markUnread(threadRoot.id)}
                    onStartEdit={() => startEdit(threadRoot)}
                    onEditChange={setEditingValue}
                    onEditCancel={cancelEdit}
                    onEditSave={saveEdit}
                    onReply={() => {}}
                    onOpenThread={() => {}}
                    onDelete={() => {
                      if (!confirm("Delete this message?")) return;
                      deleteMessage(threadRoot.id);
                    }}
                    onToggleReaction={(emoji, reactedByMe) => handleToggleReaction(threadRoot, emoji, reactedByMe)}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto">
                <div className="p-4 space-y-2">
                  {!threadRoot ? (
                    <p className="text-sm text-muted-foreground">Select a message to view replies.</p>
                  ) : threadReplies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No replies yet. Be the first to reply.</p>
                  ) : (
                    threadReplies.map((m, idx) => (
                      <MessageItem
                        key={m.id}
                        message={m}
                        isOwn={m.sender.id === user?.id}
                        canModerate={canManageChannel}
                        showAvatar={idx === 0 || threadReplies[idx - 1].sender.id !== m.sender.id}
                        parentPreview={{ senderName: threadRoot.sender.full_name, text: threadRoot.text }}
                        isEditing={editingMessageId === m.id}
                        editValue={editingMessageId === m.id ? editingValue : undefined}
                        onViewEditHistory={() => {
                          setEditHistoryMessage(m);
                          setEditHistoryOpen(true);
                        }}
                        onMarkUnread={() => void markUnread(m.id)}
                        onStartEdit={() => startEdit(m)}
                        onEditChange={setEditingValue}
                        onEditCancel={cancelEdit}
                        onEditSave={saveEdit}
                        onReply={() => {}}
                        onOpenThread={() => {}}
                        onDelete={() => {
                          if (!confirm("Delete this message?")) return;
                          deleteMessage(m.id);
                        }}
                        onToggleReaction={(emoji, reactedByMe) => handleToggleReaction(m, emoji, reactedByMe)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border p-3 bg-card">
              <div className="space-y-2">
                <MentionAutocomplete
                  value={threadText}
                  onChange={setThreadText}
                  onMentionsChange={() => {}}
                  teamId={activeTeamId ?? ""}
                  className="bg-transparent border border-border focus-visible:ring-0 min-h-[44px] shadow-none rounded-xl"
                  placeholder={threadRoot ? `Reply to ${threadRoot.sender.full_name}` : "Reply"}
                  onSubmit={handleSendThread}
                />
                <div className="flex justify-end">
                  <Button size="sm" className="gap-2" onClick={handleSendThread} disabled={!threadRoot || !threadText.trim()}>
                    <Send size={16} />
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>Members</SheetTitle>
              {canManageChannel && channel.is_private && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => setAddMembersOpen(true)}>
                  Add
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (channelMembers?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <div className="space-y-2">
                {channelMembers?.map((m) => {
                  const isOnline = !!onlineUserIds?.has(m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      <div className="relative">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarImage src={m.avatar || ""} />
                          <AvatarFallback>{(m.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                        </Avatar>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                              isOnline ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            title={isOnline ? "Online" : "Away"}
                          />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.full_name}</div>
                        {readStateByUserId.get(m.id)?.last_read_at ? (
                          <div
                            className="text-[11px] text-muted-foreground"
                            title={new Date(readStateByUserId.get(m.id)!.last_read_at).toLocaleString()}
                          >
                            Last read{" "}
                            {formatDistanceToNowStrict(new Date(readStateByUserId.get(m.id)!.last_read_at), {
                              addSuffix: true,
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">Last read unknown</div>
                        )}
                      </div>
                      {canManageChannel && channel.is_private && user?.id !== m.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (!confirm("Remove this member from the channel?")) return;
                            void removeMember(m.id);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                      {onStartDirectMessage && user?.id !== m.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 gap-2 text-muted-foreground hover:bg-muted",
                            canManageChannel && channel.is_private && user?.id !== m.id ? "" : "ml-auto"
                          )}
                          onClick={() => onStartDirectMessage(m.id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={addMembersOpen}
        onOpenChange={(open) => {
          setAddMembersOpen(open);
          if (!open) {
            setSelectedAddIds(new Set());
            setAddMemberQuery("");
          }
        }}
      >
        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Add members</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input value={addMemberQuery} onChange={(e) => setAddMemberQuery(e.target.value)} placeholder="Search…" />

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[380px] overflow-auto divide-y divide-border">
                {(teamMembers ?? []).length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No team members found.</div>
                ) : (
                  (teamMembers ?? [])
                    .filter((tm) => !(channelMembers ?? []).some((cm) => cm.id === tm.user.id))
                    .filter((tm) => {
                      const q = addMemberQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (tm.user.full_name ?? "").toLowerCase().includes(q) ||
                        (tm.user.email ?? "").toLowerCase().includes(q)
                      );
                    })
                    .map((tm) => {
                      const checked = selectedAddIds.has(tm.user.id);
                      const isOnline = !!onlineUserIds?.has(tm.user.id);
                      return (
                        <button
                          key={tm.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/30 text-left"
                          onClick={() => {
                            setSelectedAddIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(tm.user.id)) next.delete(tm.user.id);
                              else next.add(tm.user.id);
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={tm.user.avatar_url || ""} />
                                <AvatarFallback>{(tm.user.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                                  isOnline ? "bg-emerald-500" : "bg-amber-500"
                                )}
                                title={isOnline ? "Online" : "Away"}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{tm.user.full_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{tm.user.email}</div>
                            </div>
                          </div>
                          <div className={cn("text-xs font-medium", checked ? "text-primary" : "text-muted-foreground")}>
                            {checked ? "Selected" : "Select"}
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddMembersOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void addMembers()} disabled={selectedAddIds.size === 0}>
                Add ({selectedAddIds.size})
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Channel info</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <div className="text-sm font-medium">#{channel.name}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Description</div>
              <div className="text-sm">{channel.description || "No description set"}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Privacy</div>
              <div className="text-sm font-medium">{channel.is_private ? "Private" : "Public"}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Members</div>
              <div className="text-sm font-medium">
                {membersLoading ? "Loading..." : `${channelMembers?.length ?? 0}`}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-xs text-muted-foreground">Notification preferences</div>
              <select
                value={notificationLevel}
                onChange={(e) => setNotificationLevel(e.target.value as "all" | "mentions" | "mute")}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px]"
              >
                <option value="all">All messages</option>
                <option value="mentions">Mentions only</option>
                <option value="mute">Mute notifications</option>
              </select>
              <Input
                value={notificationKeywords}
                onChange={(e) => setNotificationKeywords(e.target.value)}
                placeholder="Keywords (comma separated)"
              />
              <Button className="w-full" onClick={() => void saveNotificationPreferences()} disabled={savingNotificationPrefs}>
                {savingNotificationPrefs ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={pinsOpen} onOpenChange={setPinsOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <SheetHeader>
                <SheetTitle>Pinned messages</SheetTitle>
              </SheetHeader>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-3">
                {(pins ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pinned messages.</p>
                ) : (
                  (pins ?? []).map((p) => (
                    <div key={p.id} className="rounded-xl border border-border bg-muted/20">
                      <MessageItem
                        message={p.message}
                        isOwn={p.message.sender.id === user?.id}
                        canModerate={canManageChannel}
                        showAvatar={true}
                        isPinned={true}
                        onViewEditHistory={() => {
                          setEditHistoryMessage(p.message);
                          setEditHistoryOpen(true);
                        }}
                        onMarkUnread={() => void markUnread(p.message.id)}
                        onTogglePin={() => void togglePin(p.message.id, true)}
                        onOpenThread={() => {}}
                        onReply={() => {}}
                        onDelete={() => {
                          if (!confirm("Delete this message?")) return;
                          deleteMessage(p.message.id);
                        }}
                      />
                      <div className="px-4 pb-3 text-[11px] text-muted-foreground">
                        Pinned by {p.pinned_by.full_name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={savedOpen} onOpenChange={setSavedOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <SheetHeader>
                <SheetTitle>Saved messages</SheetTitle>
              </SheetHeader>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-3">
                {(saves ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved messages.</p>
                ) : (
                  (saves ?? []).map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-muted/20">
                      <MessageItem
                        message={s.message}
                        isOwn={s.message.sender.id === user?.id}
                        canModerate={canManageChannel}
                        showAvatar={true}
                        isSaved={true}
                        onViewEditHistory={() => {
                          setEditHistoryMessage(s.message);
                          setEditHistoryOpen(true);
                        }}
                        onMarkUnread={() => void markUnread(s.message.id)}
                        onToggleSave={() => void toggleSave(s.message.id, true)}
                        onOpenThread={() => {}}
                        onReply={() => {}}
                        onDelete={() => {
                          if (!confirm("Delete this message?")) return;
                          deleteMessage(s.message.id);
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={scheduledOpen} onOpenChange={setScheduledOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <SheetHeader>
                <SheetTitle>Scheduled messages</SheetTitle>
              </SheetHeader>
            </div>
            <div className="p-4 border-b border-border space-y-2">
              <Input
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
                placeholder="Message to schedule (defaults to composer text)"
              />
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
              <Button className="w-full gap-2" onClick={() => void createScheduledMessage()}>
                <Clock3 className="h-4 w-4" />
                Schedule message
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-2">
                {(scheduledMessages ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No scheduled messages.</p>
                ) : (
                  (scheduledMessages ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-[12px] font-semibold">
                        Sends {new Date(item.send_at).toLocaleString()}
                      </div>
                      <div className="mt-1 text-[13px] whitespace-pre-wrap break-words">{item.text}</div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => void deleteScheduledMessage(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={searchMobileOpen} onOpenChange={setSearchMobileOpen}>
        <SheetContent side="right" className="w-[340px] sm:w-[380px]">
          <SheetHeader>
            <SheetTitle>Search Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search… has:files has:links in:channel"
            />
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Sender</div>
              <select
                value={searchSenderId}
                onChange={(e) => setSearchSenderId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px]"
                aria-label="Filter by sender"
              >
                <option value="">All senders</option>
                {(channelMembers ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">From</div>
                <Input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">To</div>
                <Input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => applyDatePreset("today")}>
                Today
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => applyDatePreset("last7")}>
                Last 7d
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => applyDatePreset("thisMonth")}>
                This month
              </Button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={resetSearch}>
                Clear
              </Button>
              <Button
                onClick={() => setSearchMobileOpen(false)}
                disabled={!hasSearchFilters}
              >
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={editHistoryOpen}
        onOpenChange={(open) => {
          setEditHistoryOpen(open);
          if (!open) setEditHistoryMessage(null);
        }}
      >
        <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <SheetHeader>
                <SheetTitle>Edit history</SheetTitle>
              </SheetHeader>
              {editHistoryMessage && (
                <div className="mt-2 text-[12px] text-muted-foreground">
                  {editHistoryMessage.sender.full_name} • {new Date(editHistoryMessage.created_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-3">
                {!editHistoryMessage ? (
                  <p className="text-sm text-muted-foreground">Select a message to view edit history.</p>
                ) : (editHistory ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No edits found.</p>
                ) : (
                  (editHistory ?? []).map((e) => (
                    <div key={e.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                      <div className="text-[12px] font-semibold">
                        Edited by {e.edited_by.full_name} •{" "}
                        <span className="text-muted-foreground font-normal">
                          {formatDistanceToNowStrict(new Date(e.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {editHistoryMessage.sender.id === user?.id && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              if (!confirm("Restore the 'Before' version of this message?")) return;
                              editMessage(editHistoryMessage.id, e.old_text);
                              setLocalFocusMessageId(editHistoryMessage.id);
                              setEditHistoryOpen(false);
                              toast.success("Restored previous version");
                            }}
                          >
                            Restore Before
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              if (!confirm("Restore the 'After' version of this message?")) return;
                              editMessage(editHistoryMessage.id, e.new_text);
                              setLocalFocusMessageId(editHistoryMessage.id);
                              setEditHistoryOpen(false);
                              toast.success("Restored previous version");
                            }}
                          >
                            Restore After
                          </Button>
                        </div>
                      )}
                      <div className="text-[12px] text-muted-foreground whitespace-pre-wrap break-words">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80 mb-1">
                          Before
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">{e.old_text}</div>
                      </div>
                      <div className="text-[12px] text-muted-foreground whitespace-pre-wrap break-words">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80 mb-1">
                          After
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">{e.new_text}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Incoming Call Banner */}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-background shadow-xl px-5 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{incomingCall.callerName}</span>
            <span className="text-xs text-muted-foreground">Incoming {incomingCall.callType} call…</span>
          </div>
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={acceptIncomingCall}>
            Accept
          </Button>
          <Button size="sm" variant="destructive" onClick={declineIncomingCall}>
            Decline
          </Button>
        </div>
      )}

      {/* Call Component */}
      <CallComponent
        channelId={channel.id}
        isOpen={callOpen}
        onClose={() => { setCallOpen(false); setAcceptedCallId(null); }}
        callType={callType}
        sendCallMessage={sendCallMessage}
        onCallEventRef={callEventHandlerRef}
        existingCallId={acceptedCallId}
        remoteUserName={directPeer?.full_name ?? incomingCall?.callerName ?? channel.display_name}
        remoteUserAvatar={directPeer?.avatar ?? undefined}
      />
    </div>
  );
}
