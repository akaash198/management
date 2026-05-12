"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatSidebar } from "@/components/messaging/ChatSidebar";
import { ChatArea } from "@/components/messaging/ChatArea";
import { SpecialViews } from "@/components/messaging/SpecialViews";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Channel, SidebarViewType } from "@/types/messaging";
import api from "@/lib/api";
import { MessageSquare } from "lucide-react";
import { useTeamStore } from "@/store/team";
import { useChannelEventsSocket, useTeamPresenceSocket } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

export default function MessagingPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeView, setActiveView]           = useState<SidebarViewType>("all");
  const [channels, setChannels]               = useState<Channel[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const channelId      = searchParams.get("channel");
  const viewId         = searchParams.get("view") as SidebarViewType | null;
  const focusMessageId = searchParams.get("message");
  const { activeTeamId } = useTeamStore();
  const selectedChannelIdRef = useRef<string>("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id ?? "";
  }, [selectedChannel?.id]);

  const fetchChannels = useCallback(async () => {
    if (!activeTeamId) return;
    try {
      setIsLoading(true);
      const res = await api.get("/messaging/channels/", { params: { team_id: activeTeamId } });
      if (res.data.success) {
        const data: Channel[] = res.data.data;
        setChannels(data);
        if (viewId && ["unreads", "threads", "drafts"].includes(viewId)) {
          setActiveView(viewId);
          setSelectedChannel(null);
        } else if (channelId) {
          const active = data.find((c) => c.id === channelId);
          if (active) {
            setSelectedChannel(active);
            setActiveView("all");
          }
        } else if (data.length > 0 && !selectedChannelIdRef.current) {
          setSelectedChannel(data[0]);
          setActiveView("all");
          router.replace(`${pathname}?channel=${data[0].id}`);
        }
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to load channels"));
    } finally {
      setIsLoading(false);
    }
  }, [activeTeamId, channelId, pathname, router]);

  const refreshChannels = useCallback(async () => {
    if (!activeTeamId) return;
    try {
      const res = await api.get("/messaging/channels/", { params: { team_id: activeTeamId } });
      if (!res.data.success) return;
      const data: Channel[] = res.data.data;
      setChannels(data);
      const id = selectedChannelIdRef.current;
      if (id) {
        const active = data.find((c) => c.id === id);
        if (active) setSelectedChannel(active);
      }
    } catch { /* best-effort */ }
  }, [activeTeamId]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const markChannelRead = useCallback(async (id: string) => {
    try { await api.post(`/messaging/channels/${id}/mark-read/`); } catch { /* best-effort */ }
  }, []);

  const startDirectMessage = useCallback(async (userId: string) => {
    if (!activeTeamId) return;
    try {
      const res = await api.post("/messaging/channels/direct/", { team_id: activeTeamId, user_id: userId });
      if (!res.data?.success) return;
      const channel: Channel = res.data.data;
      setChannels((prev) => {
        const exists = prev.some((c) => c.id === channel.id);
        if (exists) return prev.map((c) => (c.id === channel.id ? channel : c));
        return [channel, ...prev];
      });
      setSelectedChannel(channel);
      router.replace(`${pathname}?channel=${channel.id}`);
      await markChannelRead(channel.id);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to start direct message"));
    }
  }, [activeTeamId, markChannelRead, pathname, router]);

  const createChannel = useCallback(async (input: {
    name: string; display_name?: string; description?: string | null;
    is_private: boolean; member_ids?: string[];
  }) => {
    if (!activeTeamId) return;
    try {
      const res = await api.post("/messaging/channels/", { team: activeTeamId, ...input });
      if (!res.data?.success) { toast.error(res.data?.error ?? "Failed to create channel"); return; }
      const channel: Channel = res.data.data;
      setChannels((prev) => [channel, ...prev]);
      setSelectedChannel(channel);
      router.replace(`${pathname}?channel=${channel.id}`);
      await markChannelRead(channel.id);
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to create channel"));
    }
  }, [activeTeamId, markChannelRead, pathname, router]);

  useChannelEventsSocket((incomingId, increment) => {
    setChannels((prev) => prev.map((c) => {
      if (c.id !== incomingId) return c;
      if (c.is_muted) return c;
      if (selectedChannelIdRef.current === incomingId) return { ...c, unread_count: 0 };
      return { ...c, unread_count: Math.max(0, (c.unread_count || 0) + increment) };
    }));
  });

  useTeamPresenceSocket(
    activeTeamId,
    (ids) => setOnlineUserIds(new Set(ids)),
    (userId, online) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId); else next.delete(userId);
        return next;
      });
    }
  );

  const handleSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    setActiveView("all");
    router.replace(`${pathname}?channel=${channel.id}`);
    setChannels((prev) => prev.map((c) => (c.id === channel.id ? { ...c, unread_count: 0 } : c)));
    void markChannelRead(channel.id);
  }, [markChannelRead, pathname, router]);

  const handleViewChange = useCallback((view: SidebarViewType) => {
    setActiveView(view);
    if (view !== "all") {
      setSelectedChannel(null);
      router.replace(`${pathname}?view=${view}`);
    } else {
      // If switching back to "all", maybe pick the last selected or first channel
      if (!selectedChannel && channels.length > 0) {
        setSelectedChannel(channels[0]);
        router.replace(`${pathname}?channel=${channels[0].id}`);
      }
    }
  }, [channels, pathname, router, selectedChannel]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <ChatSidebar
        channels={channels}
        selectedId={selectedChannel?.id || ""}
        activeView={activeView}
        onSelect={handleSelect}
        onViewChange={handleViewChange}
        isLoading={isLoading}
        teamId={activeTeamId ?? ""}
        onRefreshChannels={refreshChannels}
        onStartDirectMessage={startDirectMessage}
        onCreateChannel={createChannel}
        onlineUserIds={onlineUserIds}
      />

      {activeView !== "all" ? (
        <SpecialViews view={activeView} onRefreshChannels={refreshChannels} />
      ) : selectedChannel ? (
        <ChatArea
          channel={selectedChannel}
          focusMessageId={focusMessageId}
          onRefreshChannels={refreshChannels}
          onStartDirectMessage={startDirectMessage}
          onlineUserIds={onlineUserIds}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="max-w-sm space-y-4 rounded-xl border border-border bg-card px-8 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <MessageSquare size={22} className="text-primary/60" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold">
                {isLoading ? "Loading…" : "No channel selected"}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                {isLoading
                  ? "Fetching your channels…"
                  : channels.length === 0
                  ? "No channels found. Create one to get started."
                  : "Pick a channel or direct message from the sidebar."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
