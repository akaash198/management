"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChannelEventsSocket } from "@/hooks/useMessaging";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { usePathname, useRouter } from "next/navigation";
import { Phone, Presentation } from "lucide-react";
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
    meetingTitle?: string;
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
        const now = ctx.currentTime;
        const notes = [
          { freq: 622.25, time: 0.00 }, // Eb5
          { freq: 466.16, time: 0.11 }, // Bb4
          { freq: 622.25, time: 0.22 }, // Eb5
          { freq: 466.16, time: 0.44 }, // Bb4
          { freq: 587.33, time: 0.55 }, // D5
          { freq: 466.16, time: 0.66 }, // Bb4
          { freq: 622.25, time: 0.77 }, // Eb5
        ];

        notes.forEach(({ freq, time }) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, now + time);

          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq, now + time);
          osc2.detune.setValueAtTime(6, now + time); // soft chorus

          gainNode.gain.setValueAtTime(0, now + time);
          gainNode.gain.linearRampToValueAtTime(0.08, now + time + 0.02); // fast soft attack
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + 0.32); // smooth decay

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc1.start(now + time);
          osc2.start(now + time);
          osc1.stop(now + time + 0.35);
          osc2.stop(now + time + 0.35);
        });
      };
      // Loop interval 2.0s matches the motif timeline nicely
      ringtoneRef.current = { ctx, interval: setInterval(play, 2000) };
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
            meetingTitle: data.meeting_title,
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
  // True until the first poll completes — used to silently seed seenCallIdsRef
  // with pre-existing calls so we never ring for a call that was already active
  // when the user logged in.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!activeTeamId || isOnMessagesPage) return; // messages page has its own poller
    const poll = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Channel[] }>(
          "/messaging/channels/",
          { params: { team_id: activeTeamId } }
        );
        const activeIds = new Set<string>();

        if (res.data.success) {
          for (const ch of res.data.data) {
            if (!ch.active_call_id) continue;
            activeIds.add(ch.active_call_id);
            // On the very first poll, silently mark all active calls as seen
            // so we don't ring for calls that were already in progress at login.
            if (!initializedRef.current) {
              seenCallIdsRef.current.add(ch.active_call_id);
              continue;
            }
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
              meetingTitle: ch.meeting_id ? ch.display_name : undefined,
            });
          }
        }

        // Check active meetings as well to catch meeting calls
        try {
          const meetingsRes = await api.get<{ success: boolean; data: any[] }>(
            `/meetings/teams/${activeTeamId}/meetings/`,
            { params: { status: "active" } }
          );
          if (meetingsRes.data.success) {
            for (const mtg of meetingsRes.data.data) {
              if (!mtg.active_call_id) continue;
              activeIds.add(mtg.active_call_id);
              if (!initializedRef.current) {
                seenCallIdsRef.current.add(mtg.active_call_id);
                continue;
              }
              const startedById = mtg.created_by?.id ?? mtg.created_by;
              if (startedById && String(startedById) === String(user?.id)) continue;
              if (seenCallIdsRef.current.has(mtg.active_call_id)) continue;
              if (incomingCall?.callId === mtg.active_call_id) continue;
              seenCallIdsRef.current.add(mtg.active_call_id);
              setIncomingCall({
                callId: mtg.active_call_id,
                channelId: mtg.channel_id,
                callType: mtg.call_type ?? "video",
                callerName: mtg.created_by?.full_name ?? "Someone",
                meetingTitle: mtg.title,
              });
            }
          }
        } catch {}

        // After the first poll completes, future polls will ring normally.
        initializedRef.current = true;

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
    const interval = setInterval(poll, 4000);
    return () => {
      clearInterval(interval);
      // Reset on unmount so a re-login suppresses pre-existing calls again.
      initializedRef.current = false;
    };
  }, [activeTeamId, user?.id, incomingCall?.callId, isOnMessagesPage]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setIncomingCall(null);
    try {
      const res = await api.get<{ success: boolean; data: { meeting_id?: string | null } }>(
        `/messaging/channels/${incomingCall.channelId}/`
      );
      if (res.data.success && res.data.data.meeting_id) {
        router.push(
          `/meetings/${res.data.data.meeting_id}?acceptCall=${incomingCall.callId}&callType=${incomingCall.callType}`
        );
        return;
      }
    } catch (err) {
      console.error("Failed to check channel type:", err);
    }
    router.push(
      `/messages?channel=${incomingCall.channelId}&acceptCall=${incomingCall.callId}&callType=${incomingCall.callType}`
    );
  }, [incomingCall, router]);

  const declineCall = useCallback(() => {
    if (incomingCall) {
      api.post(`/messaging/calls/${incomingCall.callId}/decline/`).catch(() => {});
    }
    setIncomingCall(null);
  }, [incomingCall]);

  // ── Auto-dismiss after 45s ──────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall) return;
    const t = setTimeout(() => setIncomingCall(null), 45_000);
    return () => clearTimeout(t);
  }, [incomingCall]);

  // Don't render the toast on the messages page (MessagingPage has its own)
  if (!incomingCall || isOnMessagesPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-4 rounded-2xl border border-accent/30 bg-card shadow-lg p-4 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
        {incomingCall.meetingTitle ? (
          <Presentation size={22} className="animate-pulse" />
        ) : (
          <Phone size={22} className="animate-pulse" />
        )}
      </div>
      <div className="flex flex-col pr-4 min-w-0 max-w-[200px] sm:max-w-[250px]">
        {incomingCall.meetingTitle ? (
          <>
            <span className="text-[13px] font-bold text-foreground truncate">{incomingCall.meetingTitle}</span>
            <span className="text-[11px] text-muted-foreground truncate">
              Live meeting by {incomingCall.callerName}…
            </span>
          </>
        ) : (
          <>
            <span className="text-[14px] font-bold text-foreground truncate">{incomingCall.callerName}</span>
            <span className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium truncate">
              Incoming {incomingCall.callType} call…
            </span>
          </>
        )}
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
