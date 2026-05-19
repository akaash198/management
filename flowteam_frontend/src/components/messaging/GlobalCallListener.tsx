"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChannelEventsSocket } from "@/hooks/useMessaging";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { usePathname, useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Channel } from "@/types/messaging";

/**
 * GlobalCallListener — mounted in the app layout so incoming calls
 * are detected regardless of which page the user is on.
 *
 * On the /messages page the local MessagingPage already handles calls,
 * so this component defers to avoid double-ringing.
 */
export function GlobalCallListener() {
  const { user } = useAuthStore();
  const { activeTeamId } = useTeamStore();
  const pathname = usePathname();
  const router = useRouter();

  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    channelId: string;
    callType: "audio" | "video";
    callerName: string;
  } | null>(null);

  // Don't show the toast when the user is already on the messages page
  // because MessagingPage has its own call handler.
  const isOnMessagesPage = pathname?.startsWith("/messages");

  // ── Ringtone ────────────────────────────────────────────────────────────
  const ringtoneRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.interval);
      try { ringtoneRef.current.ctx.close(); } catch {}
      ringtoneRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
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
  }, [stopRingtone]);

  useEffect(() => {
    if (incomingCall && !isOnMessagesPage) startRingtone();
    else stopRingtone();
    return () => stopRingtone();
  }, [incomingCall, isOnMessagesPage, startRingtone, stopRingtone]);

  // ── WebSocket listener ──────────────────────────────────────────────────
  const handleCallEvent = useCallback(
    (type: string, data: any) => {
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
    },
    [user?.id]
  );

  useChannelEventsSocket(undefined, handleCallEvent);

  // ── REST fallback polling (catches calls even if WS delivery failed) ──
  const seenCallIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeTeamId || isOnMessagesPage) return; // messages page has its own poller
    const poll = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Channel[] }>(
          "/messaging/channels/",
          { params: { team_id: activeTeamId } }
        );
        if (!res.data.success) return;
        for (const ch of res.data.data) {
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
        const activeIds = new Set(
          res.data.data.map((c) => c.active_call_id).filter(Boolean) as string[]
        );
        seenCallIdsRef.current = new Set(
          [...seenCallIdsRef.current].filter((id) => activeIds.has(id))
        );
        // Clear incoming call if its call is no longer active
        if (incomingCall && !activeIds.has(incomingCall.callId)) {
          setIncomingCall(null);
        }
      } catch {
        /* best-effort */
      }
    };
    void poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeTeamId, user?.id, incomingCall?.callId, isOnMessagesPage]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    setIncomingCall(null);
    // Navigate to messages page with the channel and call pre-selected
    router.push(`/messages?channel=${incomingCall.channelId}`);
  }, [incomingCall, router]);

  const declineCall = useCallback(() => {
    if (incomingCall) {
      api.post(`/messaging/calls/${incomingCall.callId}/decline/`).catch(() => {});
    }
    setIncomingCall(null);
  }, [incomingCall]);

  // ── Auto-dismiss after 30s ──────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall) return;
    const t = setTimeout(() => setIncomingCall(null), 30_000);
    return () => clearTimeout(t);
  }, [incomingCall]);

  // Don't render the toast on the messages page (MessagingPage has its own)
  if (!incomingCall || isOnMessagesPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-4 rounded-2xl border border-accent/30 bg-card shadow-lg p-4 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Phone size={24} className="animate-pulse" />
      </div>
      <div className="flex flex-col pr-4">
        <span className="text-[14px] font-bold text-foreground">{incomingCall.callerName}</span>
        <span className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">
          Incoming {incomingCall.callType} call…
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-xl px-4" onClick={acceptCall}>
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={declineCall}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
