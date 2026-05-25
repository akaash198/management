"use client";

import {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import Peer from "simple-peer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CircleDot, Hand, Mic, MicOff, Monitor, MonitorOff, PhoneOff,
  Send, Signal, Users, Video, VideoOff, X, Smile,
  MessageSquare, ChevronRight, Wifi, WifiOff,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { MeetingRecording } from "@/types/meetings";

// ─── Constants ────────────────────────────────────────────────────────────────

const NO_ANSWER_TIMEOUT_MS = 45_000;
const NETWORK_STATS_INTERVAL_MS = 3_000;

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👏", "🔥"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  isSpeaking: boolean;
}

interface InCallMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  userId: string;
  x: number;
}

type NetworkQuality = "excellent" | "good" | "poor" | "disconnected";

type CallStatus = "calling" | "connected";

export interface CallComponentProps {
  channelId: string;
  meetingId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  callType: "audio" | "video";
  sendCallMessage: (type: string, data: unknown) => boolean;
  onCallEventRef: React.RefObject<((type: string, data: unknown) => void) | null>;
  existingCallId?: string | null;
  remoteUserName?: string;
  remoteUserAvatar?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CallComponent({
  channelId: _channelId,
  meetingId,
  isOpen,
  onClose,
  callType,
  sendCallMessage,
  onCallEventRef,
  existingCallId,
  remoteUserName = "Unknown",
  remoteUserAvatar,
}: CallComponentProps) {
  const { user } = useAuthStore();

  // ── Call state
  const [callStatus, setCallStatus] = useState<CallStatus>("calling");
  const [callDuration, setCallDuration] = useState(0);

  // ── Local media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // ── Participants (remote users)
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // ── View mode
  const [layout, setLayout] = useState<"gallery" | "speaker">("gallery");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(false);

  // ── In-call chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<InCallMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);

  // ── Hand raise / reactions
  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  // ── Recording
  const [isRecording, setIsRecording] = useState(false);

  // ── Network quality
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("excellent");

  // ── Controls visibility (auto-hide)
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(existingCallId ?? null);
  // Buffer signals that arrive before local media is ready
  const pendingSignalsRef = useRef<Array<{ from_user_id: string; signal_data: object }>>([]);
  const callStartTimeRef = useRef<number | null>(null);
  const ringCtxRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const audioAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const speakerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const networkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Audio / Ringing ──────────────────────────────────────────────────────

  const startRinging = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const play = () => {
        const now = ctx.currentTime;
        // Teams ringback tone: soft double-pulse (e.g. at t=0 and t=0.22)
        [0.0, 0.22].forEach((delay) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(320, now + delay);

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(325, now + delay); // slight detune for fullness

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.03); // soft attack
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16); // quick decay

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now + delay);
          osc2.start(now + delay);
          osc1.stop(now + delay + 0.20);
          osc2.stop(now + delay + 0.20);
        });
      };
      ringCtxRef.current = { ctx, interval: setInterval(play, 2000) };
      play();
    } catch { /* silent fallback */ }
  }, []);

  const stopRinging = useCallback(() => {
    if (ringCtxRef.current) {
      clearInterval(ringCtxRef.current.interval);
      try { ringCtxRef.current.ctx.close(); } catch { /* ignore */ }
      ringCtxRef.current = null;
    }
  }, []);

  const playConnectedBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch { /* ignore */ }
  }, []);

  // ─── Duration timer ───────────────────────────────────────────────────────

  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) return;
    setCallDuration(0);
    callStartTimeRef.current = Date.now();
    durationTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ─── Active speaker detection ─────────────────────────────────────────────

  const startSpeakerDetection = useCallback((stream: MediaStream, userId: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      audioAnalysersRef.current.set(userId, analyser);
    } catch { /* ignore */ }
  }, []);

  const stopSpeakerDetection = useCallback(() => {
    if (speakerTimerRef.current) {
      clearInterval(speakerTimerRef.current);
      speakerTimerRef.current = null;
    }
    audioAnalysersRef.current.clear();
  }, []);

  // ─── Network quality monitoring ───────────────────────────────────────────

  const startNetworkMonitoring = useCallback(() => {
    networkTimerRef.current = setInterval(async () => {
      const peers = Array.from(peersRef.current.values());
      if (peers.length === 0) return;

      let totalRtt = 0;
      let count = 0;

      for (const peer of peers) {
        try {
          // @ts-expect-error — _pc is the internal RTCPeerConnection on simple-peer
          const pc = peer._pc as RTCPeerConnection | undefined;
          if (!pc) continue;
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              const rtt = (report as RTCIceCandidatePairStats).currentRoundTripTime;
              if (typeof rtt === "number") {
                totalRtt += rtt * 1000;
                count++;
              }
            }
          });
        } catch { /* ignore */ }
      }

      if (count === 0) return;
      const avgRtt = totalRtt / count;
      if (avgRtt < 100) setNetworkQuality("excellent");
      else if (avgRtt < 250) setNetworkQuality("good");
      else if (avgRtt < 500) setNetworkQuality("poor");
      else setNetworkQuality("disconnected");
    }, NETWORK_STATS_INTERVAL_MS);
  }, []);

  // ─── Media access ─────────────────────────────────────────────────────────

  const getUserMedia = useCallback(async (video: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "Camera/microphone access requires a secure connection (HTTPS). Please contact your administrator.",
        { duration: 8000 }
      );
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
      });
      cameraStreamRef.current = stream;
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone/camera permission denied. Please allow access in your browser settings.");
        return null;
      }
      // Video failed (no camera, busy, etc.) — fall back to audio-only
      if (video) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          toast("Camera unavailable — joining with audio only.", { duration: 4000 });
          cameraStreamRef.current = audioStream;
          localStreamRef.current = audioStream;
          return audioStream;
        } catch {
          // ignore
        }
      }
      toast.error("Failed to access camera/microphone");
      return null;
    }
  }, []);

  // ─── Participant helpers ──────────────────────────────────────────────────

  const upsertParticipant = useCallback((userId: string, update: Partial<Participant>) => {
    setParticipants((prev) => {
      const next = new Map(prev);
      const existing = next.get(userId) ?? {
        userId,
        name: "Participant",
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        handRaised: false,
        isSpeaking: false,
      };
      next.set(userId, { ...existing, ...update });
      return next;
    });
  }, []);

  // ─── WebRTC peer creation ─────────────────────────────────────────────────

  const createPeer = useCallback((userId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
    });

    peer.on("signal", (data) => {
      sendCallMessage("call.signal", {
        signal_type: initiator ? "offer" : "answer",
        signal_data: data,
        target_user_id: userId,
        call_id: callIdRef.current,
      });
    });

    peer.on("stream", (remoteStream) => {
      stopRinging();
      if (noAnswerTimerRef.current) {
        clearTimeout(noAnswerTimerRef.current);
        noAnswerTimerRef.current = null;
      }
      setCallStatus("connected");
      playConnectedBeep();
      startDurationTimer();
      startSpeakerDetection(remoteStream, userId);
      setRemoteStreams((prev) => new Map(prev.set(userId, remoteStream)));

      // Start speaker detection polling once we have the first remote stream
      if (!speakerTimerRef.current) {
        speakerTimerRef.current = setInterval(() => {
          let loudestId: string | null = null;
          let loudestLevel = 0;
          audioAnalysersRef.current.forEach((analyser, uid) => {
            const buf = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
            const avg = Array.from(buf).reduce((a, b) => a + b, 0) / buf.length;
            if (avg > loudestLevel && avg > 15) {
              loudestLevel = avg;
              loudestId = uid;
            }
          });
          setActiveSpeakerId(loudestId);
          if (loudestId) {
            upsertParticipant(loudestId, { isSpeaking: loudestLevel > 15 });
          }
        }, 300);
      }
    });

    peer.on("error", (err) => console.error("Peer error:", err));

    return peer;
  }, [sendCallMessage, stopRinging, playConnectedBeep, startDurationTimer, startSpeakerDetection, upsertParticipant]);

  // ─── Call event handler (registered on mount, kept current via ref) ───────

  const handleCallSignal = useCallback((data: unknown) => {
    const d = data as { from_user_id: string; signal_data: object; target_user_id: string };
    if (d.target_user_id !== user?.id) return;
    const stream = localStreamRef.current;
    if (!stream) {
      // Stream not ready yet — buffer and replay once media is acquired
      pendingSignalsRef.current.push({ from_user_id: d.from_user_id, signal_data: d.signal_data });
      return;
    }
    let peer = peersRef.current.get(d.from_user_id);
    if (!peer) {
      peer = createPeer(d.from_user_id, false, stream);
      peersRef.current.set(d.from_user_id, peer);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.signal(d.signal_data as any);
  }, [user?.id, createPeer]);

  const handleParticipantJoined = useCallback((data: unknown) => {
    const d = data as { user_id: string; user?: { full_name?: string; avatar?: string }; user_name?: string; user_avatar?: string };
    if (!d.user_id || d.user_id === user?.id) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    upsertParticipant(d.user_id, {
      name: d.user?.full_name ?? d.user_name ?? "Participant",
      avatar: d.user?.avatar ?? d.user_avatar,
    });
    if (!peersRef.current.has(d.user_id)) {
      const peer = createPeer(d.user_id, true, stream);
      peersRef.current.set(d.user_id, peer);
    }
  }, [user?.id, createPeer, upsertParticipant]);

  const handleParticipantLeft = useCallback((data: unknown) => {
    const d = data as { user_id: string };
    if (!d.user_id) return;
    peersRef.current.get(d.user_id)?.destroy();
    peersRef.current.delete(d.user_id);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(d.user_id);
      return next;
    });
    setParticipants((prev) => {
      const next = new Map(prev);
      next.delete(d.user_id);
      return next;
    });
    audioAnalysersRef.current.delete(d.user_id);
  }, []);

  const handleScreenShare = useCallback((data: unknown) => {
    const d = data as { user_id: string; is_sharing: boolean };
    if (d.user_id === user?.id) return;
    upsertParticipant(d.user_id, { isScreenSharing: d.is_sharing });
  }, [user?.id, upsertParticipant]);

  const handleHandRaise = useCallback((data: unknown) => {
    const d = data as { user_id: string; raised: boolean; user_name?: string };
    if (d.user_id === user?.id) return;
    upsertParticipant(d.user_id, { handRaised: d.raised });
    if (d.raised) toast(`✋ ${d.user_name ?? "Someone"} raised their hand`);
  }, [user?.id, upsertParticipant]);

  const handleReaction = useCallback((data: unknown) => {
    const d = data as { user_id: string; emoji: string };
    const id = Math.random().toString(36).slice(2);
    const newReaction: FloatingReaction = {
      id,
      emoji: d.emoji,
      userId: d.user_id,
      x: 10 + Math.random() * 80,
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3500);
  }, []);

  const handleInCallChat = useCallback((data: unknown) => {
    const d = data as { user_id: string; user_name: string; text: string };
    const msg: InCallMessage = {
      id: Math.random().toString(36).slice(2),
      senderId: d.user_id,
      senderName: d.user_name,
      text: d.text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, msg]);
    if (!chatOpen) setUnreadChat((n) => n + 1);
  }, [chatOpen]);

  const handleMuteState = useCallback((data: unknown) => {
    const d = data as { user_id: string; muted: boolean; video_off?: boolean };
    upsertParticipant(d.user_id, {
      isMuted: d.muted,
      ...(d.video_off !== undefined ? { isVideoOff: d.video_off } : {}),
    });
  }, [upsertParticipant]);

  useEffect(() => {
    onCallEventRef.current = (type: string, data: unknown) => {
      switch (type) {
        case "call.signal":
        case "signal":
          handleCallSignal(data);
          break;
        case "call.participant_joined":
        case "participant_joined":
          handleParticipantJoined(data);
          break;
        case "call.participant_left":
        case "participant_left":
          handleParticipantLeft(data);
          break;
        case "call.started":
        case "call_started":
          // Only update the call ID reference; the mount effect already sent call.join
          callIdRef.current = (data as { id?: string })?.id ?? callIdRef.current;
          break;
        case "call.screen_share":
          handleScreenShare(data);
          break;
        case "call.hand_raise":
          handleHandRaise(data);
          break;
        case "call.reaction":
          handleReaction(data);
          break;
        case "call.chat":
          handleInCallChat(data);
          break;
        case "call.mute_state":
          handleMuteState(data);
          break;
        case "call.ended":
        case "call.end":
        case "call.missed":
        case "call.declined":
          // Remote party ended/declined — close this side too
          onClose();
          break;
      }
    };
    return () => { onCallEventRef.current = null; };
  }, [
    onCallEventRef, handleCallSignal, handleParticipantJoined, handleParticipantLeft,
    handleScreenShare, handleHandRaise, handleReaction, handleInCallChat, handleMuteState,
    sendCallMessage, onClose,
  ]);

  // ─── Controls auto-hide ───────────────────────────────────────────────────

  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (callStatus === "connected" && callType === "video") {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [callStatus, callType]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [callStatus, resetControlsTimer]);

  // ─── Start / cleanup ──────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    stopRinging();
    stopDurationTimer();
    stopSpeakerDetection();
    if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
    if (networkTimerRef.current) { clearInterval(networkTimerRef.current); networkTimerRef.current = null; }
    if (controlsTimerRef.current) { clearTimeout(controlsTimerRef.current); controlsTimerRef.current = null; }
    peersRef.current.forEach((p) => p.destroy());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setRemoteStreams(new Map());
    setParticipants(new Map());
    setCallStatus("calling");
    setCallDuration(0);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(callType === "audio");
    setHandRaised(false);
    setReactions([]);
    setChatMessages([]);
    setUnreadChat(0);
    setChatOpen(false);
    setNetworkQuality("excellent");
    callStartTimeRef.current = null;
  }, [stopRinging, stopDurationTimer, stopSpeakerDetection, callType]);

  useEffect(() => {
    if (!isOpen) { cleanup(); return; }

    void (async () => {
      setCallStatus("calling");
      const stream = await getUserMedia(callType === "video");

      if (meetingId) {
        // Meeting room: auto-connect immediately regardless of media result.
        if (!stream) {
          toast("Joined without media — check camera/mic permissions.", { duration: 5000 });
        }
        setCallStatus("connected");
        startDurationTimer();
        if (!existingCallId) {
          sendCallMessage("call.start", { call_type: callType });
        } else {
          sendCallMessage("call.join", { call_id: existingCallId });
          // Flush any signals that arrived before media was ready
          const pending = pendingSignalsRef.current.splice(0);
          for (const { from_user_id, signal_data } of pending) {
            if (!stream) break;
            let peer = peersRef.current.get(from_user_id);
            if (!peer) {
              peer = createPeer(from_user_id, false, stream);
              peersRef.current.set(from_user_id, peer);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            peer.signal(signal_data as any);
          }
        }
      } else {
        // DM Call
        if (!stream) return;
        if (!existingCallId) {
          startRinging();
          noAnswerTimerRef.current = setTimeout(() => {
            sendCallMessage("call.missed", { call_id: callIdRef.current, call_type: callType });
            onClose();
          }, NO_ANSWER_TIMEOUT_MS);
          sendCallMessage("call.start", { call_type: callType });
        } else {
          sendCallMessage("call.join", { call_id: existingCallId });
          // Flush any signals that arrived before media was ready
          const pending = pendingSignalsRef.current.splice(0);
          for (const { from_user_id, signal_data } of pending) {
            let peer = peersRef.current.get(from_user_id);
            if (!peer) {
              peer = createPeer(from_user_id, false, stream);
              peersRef.current.set(from_user_id, peer);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            peer.signal(signal_data as any);
          }
        }
      }
    })();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop media tracks when the tab is closed mid-call
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((p) => { try { p.destroy(); } catch { /* ignore */ } });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isOpen]);

  // Start network monitoring once connected
  useEffect(() => {
    if (callStatus === "connected") startNetworkMonitoring();
    return () => {
      if (networkTimerRef.current) { clearInterval(networkTimerRef.current); networkTimerRef.current = null; }
    };
  }, [callStatus, startNetworkMonitoring]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Controls ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
    sendCallMessage("call.mute_state", { call_id: callIdRef.current, muted: next });
  }, [isMuted, sendCallMessage]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !isVideoOff;
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setIsVideoOff(next);
    sendCallMessage("call.mute_state", { call_id: callIdRef.current, muted: isMuted, video_off: next });
  }, [isVideoOff, isMuted, sendCallMessage]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Capture the screen track BEFORE nulling the ref so replaceTrack has the right old track
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0] ?? null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      sendCallMessage("call.screen_share", { call_id: callIdRef.current, is_sharing: false });

      const cam = cameraStreamRef.current ?? await getUserMedia(callType === "video");
      if (cam) {
        localStreamRef.current = cam;
        if (localVideoRef.current) localVideoRef.current.srcObject = cam;
        const newVideo = cam.getVideoTracks()[0];
        if (screenTrack && newVideo) {
          peersRef.current.forEach((peer) => {
            try { peer.replaceTrack(screenTrack, newVideo, cam); } catch { /* ignore if track already removed */ }
          });
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const oldVideo = cameraStreamRef.current?.getVideoTracks()[0] ?? null;
        const newVideo = stream.getVideoTracks()[0];
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
        sendCallMessage("call.screen_share", { call_id: callIdRef.current, is_sharing: true });

        if (oldVideo && newVideo && cameraStreamRef.current) {
          peersRef.current.forEach((peer) => {
            try { peer.replaceTrack(oldVideo, newVideo, cameraStreamRef.current!); } catch { /* ignore */ }
          });
        }

        // Auto-stop when user ends share via browser UI
        newVideo?.addEventListener("ended", () => {
          void toggleScreenShare();
        }, { once: true });
      } catch (err: unknown) {
        // DOMException name === "NotAllowedError" means user cancelled — don't toast
        if (err instanceof DOMException && err.name === "NotAllowedError") return;
        toast.error("Failed to share screen");
      }
    }
  }, [isScreenSharing, callType, getUserMedia, sendCallMessage]);

  const toggleHandRaise = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    sendCallMessage("call.hand_raise", {
      call_id: callIdRef.current,
      raised: next,
      user_name: user?.full_name,
    });
    if (next) toast("✋ Hand raised — everyone can see this");
  }, [handRaised, sendCallMessage, user?.full_name]);

  const sendReaction = useCallback((emoji: string) => {
    setReactionPickerOpen(false);
    const id = Math.random().toString(36).slice(2);
    const newReaction: FloatingReaction = { id, emoji, userId: user?.id ?? "", x: 10 + Math.random() * 80 };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3500);
    sendCallMessage("call.reaction", { call_id: callIdRef.current, emoji });
  }, [sendCallMessage, user?.id]);

  const sendChatMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const msg: InCallMessage = {
      id: Math.random().toString(36).slice(2),
      senderId: user?.id ?? "",
      senderName: user?.full_name ?? "You",
      text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
    sendCallMessage("call.chat", {
      call_id: callIdRef.current,
      text,
      user_name: user?.full_name,
    });
  }, [chatInput, sendCallMessage, user]);

  // ─── Recording ────────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    recordChunksRef.current = [];
    if (recordAudioCtxRef.current) {
      try { recordAudioCtxRef.current.close(); } catch { /* ignore */ }
      recordAudioCtxRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!meetingId) { toast.error("Recording requires a meeting"); return; }
    if (isRecording) return;

    const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) { toast.error("Audio recording not supported in this browser"); return; }

    const ctx = new AudioCtx();
    recordAudioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    // Mix all streams (local + all remotes) into the recording destination
    const streams: MediaStream[] = [];
    if (localStreamRef.current) streams.push(localStreamRef.current);
    for (const s of remoteStreams.values()) streams.push(s);

    let connected = 0;
    for (const s of streams) {
      if (!s.getAudioTracks().length) continue;
      try {
        ctx.createMediaStreamSource(s).connect(dest);
        connected++;
      } catch { /* ignore incompatible tracks */ }
    }

    if (connected === 0) {
      toast.error("No audio tracks to record");
      try { ctx.close(); } catch { /* ignore */ }
      recordAudioCtxRef.current = null;
      return;
    }

    // Try video recording if available
    let recStream: MediaStream = dest.stream;
    if (callType === "video" && localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const combined = new MediaStream([...dest.stream.getAudioTracks(), ...videoTracks]);
        recStream = combined;
      }
    }

    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "audio/webm",
    ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(recStream, mimeType ? { mimeType } : {});
    } catch {
      recorder = new MediaRecorder(recStream);
    }
    recorderRef.current = recorder;
    recordChunksRef.current = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data?.size > 0) recordChunksRef.current.push(ev.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      recordChunksRef.current = [];
      setIsRecording(false);
      try {
        const form = new FormData();
        const isVideo = recorder.mimeType?.startsWith("video/");
        form.append("file", blob, `meeting-${meetingId}-recording.${isVideo ? "webm" : "webm"}`);
        const res = await api.post<ApiResponse<MeetingRecording>>(
          `/meetings/${meetingId}/recordings/`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const rec = res.data.data;
        toast.success(rec?.status === "failed" ? "Recording uploaded (transcription failed)" : "Recording saved");
      } catch {
        toast.error("Failed to upload recording");
      } finally {
        if (recordAudioCtxRef.current) {
          try { recordAudioCtxRef.current.close(); } catch { /* ignore */ }
          recordAudioCtxRef.current = null;
        }
      }
    };

    recorder.start(1000);
    setIsRecording(true);
    toast.success("Recording started");
  }, [isRecording, meetingId, remoteStreams, callType]);

  const endCall = useCallback(() => {
    if (isRecording) stopRecording();
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : undefined;
    if (meetingId) {
      sendCallMessage("call.leave", { call_id: callIdRef.current, duration_seconds: duration });
    } else {
      sendCallMessage("call.end", { call_id: callIdRef.current, call_type: callType, duration_seconds: duration });
    }
    onClose();
  }, [isRecording, stopRecording, sendCallMessage, callType, onClose, meetingId]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const allParticipants = useMemo(() => {
    const self: Participant = {
      userId: user?.id ?? "me",
      name: user?.full_name ?? "You",
      avatar: user?.avatar_url ?? undefined,
      isMuted,
      isVideoOff,
      isScreenSharing,
      handRaised,
      isSpeaking: false,
    };
    return [self, ...Array.from(participants.values())];
  }, [user, isMuted, isVideoOff, isScreenSharing, handRaised, participants]);

  const speakerParticipant = useMemo(() => {
    if (!activeSpeakerId) return allParticipants[1] ?? allParticipants[0];
    return allParticipants.find((p) => p.userId === activeSpeakerId) ?? allParticipants[0];
  }, [activeSpeakerId, allParticipants]);

  const remoteEntries = useMemo(() => Array.from(remoteStreams.entries()), [remoteStreams]);

  const networkIcon = useMemo(() => {
    if (networkQuality === "excellent" || networkQuality === "good")
      return <Wifi size={12} className={networkQuality === "excellent" ? "text-green-400" : "text-yellow-400"} />;
    if (networkQuality === "poor")
      return <Signal size={12} className="text-orange-400" />;
    return <WifiOff size={12} className="text-red-400" />;
  }, [networkQuality]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const remoteInitials = initials(remoteUserName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden border-0 max-w-5xl w-full h-[92vh] [&>button]:hidden shadow-2xl"
        style={{ borderRadius: "20px" }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerMove={resetControlsTimer}
      >
        <VisuallyHidden>
          <DialogTitle>
            {callType === "video" ? "Video" : "Audio"} call
            {callStatus === "connected" ? ` • ${formatDuration(callDuration)}` : ""}
          </DialogTitle>
        </VisuallyHidden>

        <div className="relative flex h-full bg-[#1a1a2e] text-white overflow-hidden">

          {/* ── CALLING SCREEN ─────────────────────────────────────────── */}
          {callStatus === "calling" && (
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-8 py-16 px-8 animate-in fade-in zoom-in-95 duration-500">
              {/* Ambient background */}
              {remoteUserAvatar && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: `url(${remoteUserAvatar})`, backgroundSize: "cover", filter: "blur(60px)" }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/30 to-slate-900/50" />

              <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-52 w-52 rounded-full bg-white/5 animate-ping" style={{ animationDuration: "2.5s" }} />
                  <span className="absolute inline-flex h-36 w-36 rounded-full bg-white/10 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.8s" }} />
                  <span className="absolute inline-flex h-28 w-28 rounded-full border border-white/20 animate-pulse" />
                  <Avatar className="h-24 w-24 border-[3px] border-white/40 shadow-2xl relative z-10">
                    {remoteUserAvatar && <AvatarFallback className="text-3xl bg-slate-800">{remoteInitials}</AvatarFallback>}
                    <AvatarFallback className="text-3xl font-semibold bg-slate-800 text-white">{remoteInitials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight drop-shadow-md">{remoteUserName}</h2>
                  <p className="text-white/60 text-sm font-medium tracking-wide flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    {existingCallId ? "Connecting…" : `${callType === "video" ? "Video" : "Audio"} calling…`}
                  </p>
                </div>

                <button
                  onClick={endCall}
                  className="mt-8 h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95"
                >
                  <PhoneOff size={26} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* ── CONNECTED SCREEN ───────────────────────────────────────── */}
          {callStatus === "connected" && (
            <div className="flex flex-1 min-w-0 h-full">

              {/* Main call area */}
              <div className="flex-1 flex flex-col min-w-0 h-full relative" onPointerMove={resetControlsTimer}>

                {/* ── Gallery view (grid) ── */}
                {layout === "gallery" && (
                  <div className={cn(
                    "flex-1 grid gap-1 p-1 min-h-0",
                    allParticipants.length === 1 && "grid-cols-1",
                    allParticipants.length === 2 && "grid-cols-2",
                    allParticipants.length <= 4 && allParticipants.length > 2 && "grid-cols-2 grid-rows-2",
                    allParticipants.length > 4 && "grid-cols-3",
                  )}>
                    {/* Local tile */}
                    <ParticipantTile
                      participant={allParticipants[0]}
                      stream={null}
                      videoRef={localVideoRef}
                      isLocal
                      isActive={activeSpeakerId === null || activeSpeakerId === (user?.id ?? "me")}
                      callType={callType}
                    />

                    {/* Remote tiles */}
                    {remoteEntries.map(([userId, stream]) => {
                      const p = participants.get(userId) ?? { userId, name: "Participant", isMuted: false, isVideoOff: false, isScreenSharing: false, handRaised: false, isSpeaking: false };
                      return (
                        <ParticipantTile
                          key={userId}
                          participant={p}
                          stream={stream}
                          videoRef={{ current: remoteVideoRefs.current.get(userId) ?? null }}
                          onVideoRef={(el) => {
                            if (el) {
                              remoteVideoRefs.current.set(userId, el);
                              if (el.srcObject !== stream) {
                                el.srcObject = stream;
                                el.volume = 1.0;
                                el.muted = false;
                                void el.play().catch(() => {});
                              }
                            }
                          }}
                          isActive={activeSpeakerId === userId}
                          callType={callType}
                          onClick={() => { setActiveSpeakerId(userId); setLayout("speaker"); }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* ── Speaker view ── */}
                {layout === "speaker" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Main speaker */}
                    <div className="flex-1 relative min-h-0 bg-black/40">
                      {speakerParticipant.userId === (user?.id ?? "me") ? (
                        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                      ) : (
                        <video
                          ref={(el) => {
                            if (el && remoteStreams.has(speakerParticipant.userId)) {
                              const stream = remoteStreams.get(speakerParticipant.userId)!;
                              if (el.srcObject !== stream) {
                                el.srcObject = stream;
                                el.muted = false;
                                void el.play().catch(() => {});
                              }
                            }
                          }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      )}
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                        <span className="text-sm font-semibold">{speakerParticipant.name}</span>
                        {speakerParticipant.isMuted && <MicOff size={12} className="text-red-400" />}
                      </div>
                    </div>

                    {/* Filmstrip of other participants */}
                    <div className="h-28 flex items-center gap-1 px-2 bg-black/60 overflow-x-auto shrink-0">
                      {allParticipants
                        .filter((p) => p.userId !== speakerParticipant.userId)
                        .map((p) => {
                          const isLocal = p.userId === (user?.id ?? "me");
                          const stream = isLocal ? null : remoteStreams.get(p.userId) ?? null;
                          return (
                            <FilmstripTile
                              key={p.userId}
                              participant={p}
                              stream={stream}
                              isLocal={isLocal}
                              localRef={isLocal ? localVideoRef : undefined}
                              isActive={p.userId === activeSpeakerId}
                              onClick={() => setActiveSpeakerId(p.userId)}
                            />
                          );
                        })
                      }
                    </div>
                  </div>
                )}

                {/* ── Floating reactions ── */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  {reactions.map((r) => (
                    <div
                      key={r.id}
                      className="absolute bottom-20 text-4xl animate-in slide-in-from-bottom-4 fade-in duration-500"
                      style={{ left: `${r.x}%` }}
                    >
                      <div className="animate-bounce">{r.emoji}</div>
                    </div>
                  ))}
                </div>

                {/* ── Top HUD ── */}
                <div
                  className={cn(
                    "absolute top-0 inset-x-0 z-20 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-500",
                    controlsVisible ? "opacity-100" : "opacity-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">
                      {networkIcon}
                      <span className="text-xs font-mono">{formatDuration(callDuration)}</span>
                    </div>
                    {isRecording && (
                      <div className="flex items-center gap-1.5 bg-red-600/80 backdrop-blur px-2.5 py-1 rounded-full animate-pulse">
                        <CircleDot size={10} />
                        <span className="text-[11px] font-semibold">REC</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View switcher */}
                    <div className="flex bg-black/40 backdrop-blur rounded-full p-0.5">
                      <button
                        onClick={() => setLayout("gallery")}
                        className={cn("px-3 py-1 rounded-full text-[11px] font-semibold transition-colors", layout === "gallery" ? "bg-white/20" : "hover:bg-white/10")}
                      >
                        Gallery
                      </button>
                      <button
                        onClick={() => setLayout("speaker")}
                        className={cn("px-3 py-1 rounded-full text-[11px] font-semibold transition-colors", layout === "speaker" ? "bg-white/20" : "hover:bg-white/10")}
                      >
                        Speaker
                      </button>
                    </div>

                    {/* Roster toggle */}
                    <button
                      onClick={() => setShowRoster((v) => !v)}
                      className="flex items-center gap-1.5 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full text-[11px] font-semibold hover:bg-white/20 transition-colors"
                    >
                      <Users size={13} />
                      {allParticipants.length}
                    </button>
                  </div>
                </div>

                {/* ── Bottom controls ── */}
                <div
                  className={cn(
                    "absolute bottom-0 inset-x-0 z-20 pb-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent pt-8 transition-opacity duration-500",
                    controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  {/* Reaction picker */}
                  {reactionPickerOpen && (
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl px-4 py-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => sendReaction(emoji)}
                          className="text-2xl hover:scale-125 transition-transform active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button onClick={() => setReactionPickerOpen(false)} className="ml-1 text-white/40 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 py-3 px-6 bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <CallBtn active={isMuted} danger onClick={toggleMute} label={isMuted ? "Unmute" : "Mute"}>
                      {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
                    </CallBtn>

                    {callType === "video" && (
                      <CallBtn active={isVideoOff} danger onClick={toggleVideo} label={isVideoOff ? "Camera on" : "Camera off"}>
                        {isVideoOff ? <VideoOff size={19} /> : <Video size={19} />}
                      </CallBtn>
                    )}

                    <CallBtn active={isScreenSharing} onClick={toggleScreenShare} label="Share screen">
                      {isScreenSharing ? <MonitorOff size={19} /> : <Monitor size={19} />}
                    </CallBtn>

                    <CallBtn active={handRaised} onClick={toggleHandRaise} label={handRaised ? "Lower hand" : "Raise hand"}>
                      <Hand size={19} className={handRaised ? "text-yellow-400" : ""} />
                    </CallBtn>

                    <CallBtn onClick={() => setReactionPickerOpen((v) => !v)} label="React">
                      <Smile size={19} />
                    </CallBtn>

                    <CallBtn
                      onClick={() => { setChatOpen((v) => !v); setUnreadChat(0); }}
                      label="Chat"
                      badge={unreadChat > 0 ? unreadChat : undefined}
                    >
                      <MessageSquare size={19} />
                    </CallBtn>

                    {meetingId && (
                      <CallBtn
                        onClick={() => (isRecording ? stopRecording() : void startRecording())}
                        active={isRecording}
                        danger={isRecording}
                        label={isRecording ? "Stop recording" : "Record"}
                      >
                        <div className="relative">
                          <CircleDot size={19} className={isRecording ? "text-red-400" : ""} />
                          {isRecording && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                        </div>
                      </CallBtn>
                    )}

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    <button
                      onClick={endCall}
                      title="End call"
                      className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-red-500/40 hover:scale-110 active:scale-95"
                    >
                      <PhoneOff size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Participant roster sidebar ── */}
              {showRoster && (
                <div className="w-72 border-l border-white/10 bg-slate-900/90 backdrop-blur flex flex-col shrink-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold">Participants ({allParticipants.length})</h3>
                    <button onClick={() => setShowRoster(false)} className="text-white/40 hover:text-white">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                      {allParticipants.map((p) => (
                        <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              {p.avatar && <AvatarFallback className="bg-slate-700">{initials(p.name)}</AvatarFallback>}
                              <AvatarFallback className="bg-slate-700 text-xs">{initials(p.name)}</AvatarFallback>
                            </Avatar>
                            {p.isSpeaking && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-400 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.name}{p.userId === (user?.id ?? "me") ? " (You)" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {p.handRaised && <span className="text-xs">✋</span>}
                            {p.isMuted && <MicOff size={12} className="text-red-400" />}
                            {p.isVideoOff && <VideoOff size={12} className="text-slate-400" />}
                            {p.isScreenSharing && <Monitor size={12} className="text-blue-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* ── In-call chat sidebar ── */}
              {chatOpen && (
                <div className="w-80 border-l border-white/10 bg-slate-900/90 backdrop-blur flex flex-col shrink-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold">Meeting chat</h3>
                    <button onClick={() => setChatOpen(false)} className="text-white/40 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>

                  <ScrollArea className="flex-1 px-3 py-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-white/30 text-xs mt-8">No messages yet. Say hello!</p>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.map((m) => {
                          const isMe = m.senderId === user?.id;
                          return (
                            <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                              {!isMe && (
                                <span className="text-[10px] text-white/40 mb-1 px-1">{m.senderName}</span>
                              )}
                              <div className={cn(
                                "max-w-[90%] px-3 py-2 rounded-2xl text-sm",
                                isMe
                                  ? "bg-indigo-600 text-white rounded-br-sm"
                                  : "bg-white/10 text-white rounded-bl-sm"
                              )}>
                                {m.text}
                              </div>
                              <span className="text-[10px] text-white/25 mt-0.5 px-1">
                                {new Date(m.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder="Message…"
                        className="flex-1 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm focus:bg-white/15"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                        className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CallBtn({
  children, onClick, active, danger, label, badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "relative h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 text-white border border-transparent hover:scale-105 active:scale-95",
        danger && active
          ? "bg-red-500/90 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]"
          : active
            ? "bg-white/25 border-white/30"
            : "bg-white/10 hover:bg-white/20 hover:border-white/20"
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

interface ParticipantTileProps {
  participant: Participant;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  isLocal?: boolean;
  isActive: boolean;
  callType: "audio" | "video";
  onClick?: () => void;
}

function ParticipantTile({
  participant, stream: _stream, videoRef, onVideoRef, isLocal, isActive, callType, onClick,
}: ParticipantTileProps) {
  const showVideo = callType === "video" && !participant.isVideoOff;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center cursor-pointer",
        isActive && "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900",
      )}
    >
      {showVideo ? (
        isLocal ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <video ref={onVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-16 w-16 border-2 border-white/20">
            <AvatarFallback className="text-xl font-semibold bg-slate-700 text-white">
              {initials(participant.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/60">{participant.name}</span>
        </div>
      )}

      {/* Name + status overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {participant.isSpeaking && (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          )}
          <span className="text-[11px] font-semibold truncate text-white">
            {participant.name}{isLocal ? " (You)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {participant.handRaised && <span className="text-xs">✋</span>}
          {participant.isMuted && <MicOff size={11} className="text-red-400" />}
          {participant.isScreenSharing && <Monitor size={11} className="text-blue-400" />}
        </div>
      </div>
    </div>
  );
}

interface FilmstripTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal: boolean;
  localRef?: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  onClick: () => void;
}

function FilmstripTile({ participant, stream, isLocal, localRef, isActive, onClick }: FilmstripTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative h-24 w-36 shrink-0 rounded-lg overflow-hidden bg-slate-800 cursor-pointer transition-all",
        isActive && "ring-2 ring-indigo-400"
      )}
    >
      {isLocal ? (
        <video ref={localRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : stream ? (
        <video
          ref={(el) => {
            if (el && stream && el.srcObject !== stream) {
              el.srcObject = stream;
              el.muted = false;
              void el.play().catch(() => {});
            }
          }}
          autoPlay playsInline className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-slate-700 text-sm">{initials(participant.name)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 flex items-center gap-1">
        <span className="text-[10px] truncate">{participant.name}</span>
        {participant.isMuted && <MicOff size={9} className="text-red-400 shrink-0" />}
      </div>
    </div>
  );
}
