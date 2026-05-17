"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatSidebar } from "@/components/messaging/ChatSidebar";
import { ChatArea } from "@/components/messaging/ChatArea";
import { SpecialViews } from "@/components/messaging/SpecialViews";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Channel, SidebarViewType } from "@/types/messaging";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { MessageSquare, Phone, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import { useChannelEventsSocket, useTeamPresenceSocket } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Button } from "@/components/ui/button";

export default function MessagingPage() {
  const { user }         = useAuthStore();
  const searchParams     = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeView, setActiveView]           = useState<SidebarViewType>("all");
  const [channels, setChannels]               = useState<Channel[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const channelId      = searchParams.get("channel");
  const viewId         = searchParams.get("view") as SidebarViewType | null;
  const focusMessageId = searchParams.get("message");
  const { activeTeamId, fetchTeams } = useTeamStore();
  const selectedChannelIdRef = useRef<string>("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [incomingCall, setIncomingCall] = useState<{ 
    callId: string; 
    channelId: string;
    callType: 'audio' | 'video'; 
    callerName: string 
  } | null>(null);
  const [acceptedCallId, setAcceptedCallId] = useState<string | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id ?? "";
  }, [selectedChannel?.id]);

  const fetchChannels = useCallback(async (teamId: string) => {
    try {
      setIsLoading(true);
      const res = await api.get("/messaging/channels/", { params: { team_id: teamId } });
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
          } else {
            if (data.length > 0) {
              setSelectedChannel(data[0]);
              setActiveView("all");
              router.replace(`${pathname}?channel=${data[0].id}`);
            } else {
              setSelectedChannel(null);
              router.replace(pathname);
            }
          }
        } else if (data.length > 0) {
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
  }, [channelId, pathname, router, viewId]);

  const initializedRef = useRef(false);

  // On mount: validate teams (corrects stale persisted activeTeamId), then load channels.
  useEffect(() => {
    fetchTeams().then(() => {
      const teamId = useTeamStore.getState().activeTeamId;
      initializedRef.current = true;
      if (teamId) fetchChannels(teamId);
      else setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After init, re-load channels whenever the user switches teams.
  useEffect(() => {
    if (!initializedRef.current) return;
    setSelectedChannel(null);
    setChannels([]);
    if (activeTeamId) fetchChannels(activeTeamId);
    else setIsLoading(false);
  }, [activeTeamId, fetchChannels]);

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

  const stopIncomingRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.interval);
      try { ringtoneRef.current.ctx.close(); } catch {}
      ringtoneRef.current = null;
    }
  }, []);

  const startIncomingRingtone = useCallback(() => {
    stopIncomingRingtone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx() as AudioContext;
      const play = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      };
      ringtoneRef.current = { ctx, interval: setInterval(play, 1500) };
      play();
    } catch {}
  }, [stopIncomingRingtone]);

  useEffect(() => {
    if (incomingCall) startIncomingRingtone();
    else stopIncomingRingtone();
    return () => stopIncomingRingtone();
  }, [incomingCall, startIncomingRingtone, stopIncomingRingtone]);

  const handleCallEvent = useCallback((type: string, data: any) => {
    if (type === "call.started") {
      const startedBy = data?.started_by?.id ?? data?.started_by;
      if (startedBy && String(startedBy) !== String(user?.id)) {
        setIncomingCall({
          callId: data.id,
          channelId: data.channel?.id ?? data.channel,
          callType: data.call_type ?? "audio",
          callerName: data.started_by?.full_name ?? "Someone",
        });
      }
    } else if (type === "call.ended" || type === "call.missed") {
      setIncomingCall(null);
    }
  }, [user?.id]);

  useChannelEventsSocket(
    (incomingId, increment) => {
      setChannels((prev) => prev.map((c) => {
        if (c.id !== incomingId) return c;
        if (c.is_muted) return c;
        if (selectedChannelIdRef.current === incomingId) return { ...c, unread_count: 0 };
        return { ...c, unread_count: Math.max(0, (c.unread_count || 0) + increment) };
      }));
    },
    handleCallEvent,
  );

  // Fallback: poll channels every 5 s to detect active calls that the
  // WebSocket may have missed (e.g. receiver is on a different channel).
  const seenCallIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeTeamId) return;
    const poll = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Channel[] }>(
          "/messaging/channels/",
          { params: { team_id: activeTeamId } }
        );
        if (!res.data.success) return;
        const data: Channel[] = res.data.data;
        // Update channel list silently (unread counts, active_call_id, etc.)
        setChannels((prev) => data.map((fresh) => {
          const existing = prev.find((c) => c.id === fresh.id);
          return existing ? { ...existing, ...fresh } : fresh;
        }));
        for (const ch of data) {
          if (!ch.active_call_id) continue;
          const startedById = ch.active_call_started_by?.id;
          if (startedById && String(startedById) === String(user?.id)) continue;
          if (seenCallIdsRef.current.has(ch.active_call_id)) continue;
          if (incomingCall?.callId === ch.active_call_id) continue;
          seenCallIdsRef.current.add(ch.active_call_id);
          setIncomingCall({
            callId: ch.active_call_id,
            channelId: ch.id,
            callType: ch.active_call_type ?? "audio",
            callerName: ch.active_call_started_by?.full_name ?? "Someone",
          });
        }
        // Clear seenCallIds for calls that are no longer active
        const activeIds = new Set(data.map((c) => c.active_call_id).filter(Boolean) as string[]);
        seenCallIdsRef.current = new Set([...seenCallIdsRef.current].filter((id) => activeIds.has(id)));
      } catch { /* best-effort */ }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeTeamId, user?.id, incomingCall?.callId]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { channelId, callId } = incomingCall;
    setIncomingCall(null);
    let target = channels.find(c => c.id === channelId);
    if (!target) {
      // Channel not in list yet — fetch it (e.g. cross-team or not yet loaded)
      try {
        const res = await api.get<{ success: boolean; data: Channel }>(
          `/messaging/channels/${channelId}/`
        );
        if (res.data.success) {
          target = res.data.data;
          setChannels((prev) => {
            if (prev.some((c) => c.id === target!.id)) return prev;
            return [target!, ...prev];
          });
        }
      } catch { /* fall through */ }
    }
    if (target) {
      setSelectedChannel(target);
      setActiveView("all");
      setAcceptedCallId(callId);
      router.replace(`${pathname}?channel=${channelId}`);
    } else {
      toast.error("Could not find the channel for this call.");
    }
  }, [incomingCall, channels, router, pathname]);

  const declineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

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
    setMobileSidebarOpen(false);
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
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — full width on mobile (shown/hidden), fixed width on desktop */}
      <div className={cn(
        "absolute inset-y-0 left-0 z-40 md:relative md:z-auto md:translate-x-0 transition-transform duration-200",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
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
      </div>

      {activeView !== "all" ? (
        <SpecialViews view={activeView} onRefreshChannels={refreshChannels} />
      ) : selectedChannel ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile back button */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={15} />Channels
            </button>
          </div>
          <ChatArea
            channel={selectedChannel}
            focusMessageId={focusMessageId}
            onRefreshChannels={refreshChannels}
            onStartDirectMessage={startDirectMessage}
            onlineUserIds={onlineUserIds}
            acceptedCallId={acceptedCallId}
            onClearAcceptedCall={() => setAcceptedCallId(null)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-background">
          {/* Mobile menu button when no channel selected */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden absolute top-4 left-4 flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={15} />Channels
          </button>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[120px] rounded-full pointer-events-none bg-primary/10" />

          <div className="relative z-10 max-w-sm space-y-8 p-8 sm:p-12 rounded-2xl border border-border bg-card shadow-lg text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-glow-strong">
              <MessageSquare size={32} className="text-primary-foreground" />
            </div>
            <div className="space-y-3">
              <h2 className="text-[20px] font-black tracking-tight text-foreground">
                {isLoading ? "Fetching workspace…" : "Ready for focus?"}
              </h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {isLoading
                  ? "We're setting up your workspace environment. One moment."
                  : channels.length === 0
                  ? "Your team hasn't created any channels yet. Start the conversation!"
                  : "Select a channel or teammate from the sidebar to start collaborating."}
              </p>
            </div>
            {!isLoading && channels.length === 0 && (
              <Button 
                onClick={() => router.push('/onboarding')} 
                className="w-full h-11 rounded-xl font-bold"
              >
                Create First Channel
              </Button>
            )}
          </div>
        </div>
      )}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-4 rounded-2xl border border-accent/30 bg-card shadow-lg p-4 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Phone size={24} className="animate-pulse" />
          </div>
          <div className="flex flex-col pr-4">
            <span className="text-[14px] font-bold text-foreground">{incomingCall.callerName}</span>
            <span className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Incoming {incomingCall.callType} call…</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-xl px-4" onClick={acceptCall}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={declineCall}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
