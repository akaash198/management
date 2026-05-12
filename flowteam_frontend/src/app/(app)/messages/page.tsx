"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatSidebar } from "@/components/messaging/ChatSidebar";
import { ChatArea } from "@/components/messaging/ChatArea";
import { SpecialViews } from "@/components/messaging/SpecialViews";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Channel, SidebarViewType } from "@/types/messaging";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { MessageSquare, Phone } from "lucide-react";
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
  const { activeTeamId } = useTeamStore();
  const selectedChannelIdRef = useRef<string>("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
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

  useChannelEventsSocket(
    (incomingId, increment) => {
      setChannels((prev) => prev.map((c) => {
        if (c.id !== incomingId) return c;
        if (c.is_muted) return c;
        if (selectedChannelIdRef.current === incomingId) return { ...c, unread_count: 0 };
        return { ...c, unread_count: Math.max(0, (c.unread_count || 0) + increment) };
      }));
    },
    (type, data) => {
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
    }
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const { channelId, callId } = incomingCall;
    const target = channels.find(c => c.id === channelId);
    if (target) {
      setSelectedChannel(target);
      setActiveView("all");
      setAcceptedCallId(callId);
      router.replace(`${pathname}?channel=${channelId}`);
    } else {
      // If channel not in list, we might need to fetch it or just toast error
      toast.error("Could not find the channel for this call.");
    }
    setIncomingCall(null);
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
    <div className="flex h-full overflow-hidden bg-white">
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
          acceptedCallId={acceptedCallId}
          onClearAcceptedCall={() => setAcceptedCallId(null)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-sm space-y-8 p-12 rounded-[32px] border border-slate-100 bg-white/40 backdrop-blur-xl text-center shadow-xl shadow-slate-200/50">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/20">
              <MessageSquare size={32} className="text-white" />
            </div>
            <div className="space-y-3">
              <h2 className="text-[20px] font-black tracking-tight text-slate-900">
                {isLoading ? "Fetching workspace…" : "Ready for focus?"}
              </h2>
              <p className="text-[14px] text-slate-500 leading-relaxed">
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
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold"
              >
                Create First Channel
              </Button>
            )}
          </div>
        </div>
      )}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-4 rounded-2xl border border-indigo-500/30 bg-background shadow-2xl p-4 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Phone size={24} className="animate-pulse" />
          </div>
          <div className="flex flex-col pr-4">
            <span className="text-[14px] font-bold text-foreground">{incomingCall.callerName}</span>
            <span className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Incoming {incomingCall.callType} call…</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4" onClick={acceptCall}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl border-red-500/20 hover:bg-red-500/5 hover:text-red-400" onClick={declineCall}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
