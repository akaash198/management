"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CircleDot, Mic, MicOff, Monitor, PhoneOff, Video, VideoOff } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { MeetingRecording } from "@/types/meetings";

const NO_ANSWER_TIMEOUT_MS = 30_000;

interface CallComponentProps {
  channelId: string;
  meetingId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  sendCallMessage: (type: string, data: any) => boolean;
  onCallEventRef: React.RefObject<((type: string, data: any) => void) | null>;
  existingCallId?: string | null;
  remoteUserName?: string;
  remoteUserAvatar?: string;
}

type CallStatus = 'calling' | 'connected';

export function CallComponent({
  channelId: _channelId,
  meetingId,
  isOpen,
  onClose,
  callType,
  sendCallMessage,
  onCallEventRef,
  existingCallId,
  remoteUserName = 'Unknown',
  remoteUserAvatar,
}: CallComponentProps) {
  const { user } = useAuthStore();
  const [callStatus, setCallStatus] = useState<CallStatus>('calling');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(existingCallId ?? null);
  const callStartTimeRef = useRef<number | null>(null);
  const ringCtxRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);

  // ── Ringing (Web Audio, no file needed) ──────────────────────────────────
  const startRinging = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx() as AudioContext;
      const play = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0);
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

  // ── Duration timer ────────────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    callStartTimeRef.current = Date.now();
    durationTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const stopRecording = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch { /* ignore */ }
    recorderRef.current = null;
    recordChunksRef.current = [];
    if (recordAudioCtxRef.current) {
      try { recordAudioCtxRef.current.close(); } catch { /* ignore */ }
      recordAudioCtxRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!meetingId) {
      toast.error("Missing meeting id for recording");
      return;
    }
    if (isRecording) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx() as AudioContext;
    recordAudioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    const sources: MediaStream[] = [];
    if (localStreamRef.current) sources.push(localStreamRef.current);
    for (const stream of remoteStreams.values()) sources.push(stream);

    let connected = 0;
    for (const stream of sources) {
      try {
        if (stream.getAudioTracks().length === 0) continue;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(dest);
        connected += 1;
      } catch {
        // Some streams may be incompatible with createMediaStreamSource; skip.
      }
    }
    if (connected === 0) {
      toast.error("No audio tracks available to record");
      try { ctx.close(); } catch { /* ignore */ }
      recordAudioCtxRef.current = null;
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm" });
    } catch {
      recorder = new MediaRecorder(dest.stream);
    }
    recorderRef.current = recorder;
    recordChunksRef.current = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) recordChunksRef.current.push(ev.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      recordChunksRef.current = [];
      setIsRecording(false);
      try {
        const form = new FormData();
        form.append("file", blob, `meeting-${meetingId}-recording.webm`);
        const res = await api.post<ApiResponse<MeetingRecording>>(`/meetings/${meetingId}/recordings/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const rec = res.data.data;
        toast.success(rec?.status === "failed" ? "Recording uploaded (transcription failed)" : "Recording uploaded");
      } catch (err) {
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
  }, [isRecording, meetingId, remoteStreams]);

  // ── Media ─────────────────────────────────────────────────────────────────
  const getUserMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: 640, height: 480 } : false,
      });
      cameraStreamRef.current = stream;
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      toast.error("Failed to access camera/microphone");
      return null;
    }
  }, []);

  const getScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setScreenStream(stream);
      setIsScreenSharing(true);

      // If the user stops sharing from the browser UI, clean up and restore camera.
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener(
          "ended",
          () => {
            setIsScreenSharing(false);
            setScreenStream(null);
            const cam = cameraStreamRef.current;
            if (cam) {
              localStreamRef.current = cam;
              if (localVideoRef.current) localVideoRef.current.srcObject = cam;
              peersRef.current.forEach((peer) => {
                const oldVideo = stream.getVideoTracks()[0];
                const newVideo = cam.getVideoTracks()[0];
                if (oldVideo && newVideo) peer.replaceTrack(oldVideo, newVideo, stream);
              });
            }
          },
          { once: true }
        );
      }

      return stream;
    } catch {
      toast.error("Failed to share screen");
      return null;
    }
  }, []);

  // ── WebRTC peer ───────────────────────────────────────────────────────────
  const createPeer = useCallback((userId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new Peer({ initiator, trickle: false, stream });

    peer.on('signal', (data) => {
      sendCallMessage('call.signal', {
        signal_type: initiator ? 'offer' : 'answer',
        signal_data: data,
        target_user_id: userId,
        call_id: callIdRef.current,
      });
    });

    peer.on('stream', (remoteStream) => {
      stopRinging();
      if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
      setCallStatus('connected');
      startDurationTimer();
      setRemoteStreams(prev => new Map(prev.set(userId, remoteStream)));
    });

    peer.on('error', (err) => console.error('Peer error:', err));

    return peer;
  }, [sendCallMessage, stopRinging, startDurationTimer]);

  const handleCallSignal = useCallback((data: any) => {
    const { from_user_id, signal_data, target_user_id } = data;
    if (target_user_id !== user?.id) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    let peer = peersRef.current.get(from_user_id);
    if (!peer) {
      peer = createPeer(from_user_id, false, stream);
      peersRef.current.set(from_user_id, peer);
    }
    peer.signal(signal_data);
  }, [user?.id, createPeer]);

  const handleParticipantJoined = useCallback((data: any) => {
    const { user_id } = data;
    if (!user_id || user_id === user?.id) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    if (!peersRef.current.has(user_id)) {
      const peer = createPeer(user_id, true, stream);
      peersRef.current.set(user_id, peer);
    }
  }, [user?.id, createPeer]);

  useEffect(() => {
    onCallEventRef.current = (type: string, data: any) => {
      if (type === 'signal') handleCallSignal(data);
      if (type === 'participant_joined') handleParticipantJoined(data);
      if (type === 'call_started') {
        callIdRef.current = data?.id ?? null;
        sendCallMessage('call.join', { call_id: data?.id });
      }
    };
    return () => { onCallEventRef.current = null; };
  }, [onCallEventRef, handleCallSignal, handleParticipantJoined, sendCallMessage]);

  // ── Start / cleanup ───────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopRinging();
    stopDurationTimer();
    if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
    peersRef.current.forEach(p => p.destroy());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setRemoteStreams(new Map());
    setCallStatus('calling');
    setCallDuration(0);
    setIsScreenSharing(false);
    setScreenStream(null);
    setIsMuted(false);
    setIsVideoOff(callType === 'audio');
    callStartTimeRef.current = null;
  }, [stopRinging, stopDurationTimer, callType]);

  useEffect(() => {
    if (!isOpen) { cleanup(); return; }

    (async () => {
      setCallStatus('calling');
      const stream = await getUserMedia(callType === 'video');
      if (!stream) return;

      if (!existingCallId) {
        // Initiator — ring and set no-answer timeout
        startRinging();
        noAnswerTimerRef.current = setTimeout(() => {
          // No one answered — send missed, close
          sendCallMessage('call.missed', {
            call_id: callIdRef.current,
            call_type: callType,
          });
          onClose();
        }, NO_ANSWER_TIMEOUT_MS);
        sendCallMessage('call.start', { call_type: callType });
      }
      // Acceptor: media ready, peer created when signal arrives
    })();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(m => !m);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(v => !v);
    }
  }, [isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Restore camera stream when stopping screen share (video calls only).
      if (callType === 'video') {
        const cam = cameraStreamRef.current ?? await getUserMedia(true);
        if (cam) {
          localStreamRef.current = cam;
          if (localVideoRef.current) localVideoRef.current.srcObject = cam;
          peersRef.current.forEach(peer => {
            const oldStream = screenStream;
            const newVideo = cam.getVideoTracks()[0];
            const oldVideo = oldStream?.getVideoTracks()[0];
            if (oldStream && oldVideo && newVideo) peer.replaceTrack(oldVideo, newVideo, oldStream);
          });
        }
      }
    } else {
      const stream = await getScreenShare();
      if (stream) {
        // Preview local screen share in the PiP.
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;

        peersRef.current.forEach(peer => {
          const oldStream = cameraStreamRef.current;
          const newVideo = stream.getVideoTracks()[0];
          const oldVideo = oldStream?.getVideoTracks()[0];
          if (oldStream && oldVideo && newVideo) {
            peer.replaceTrack(oldVideo, newVideo, oldStream);
          }
        });
      }
    }
  }, [isScreenSharing, screenStream, callType, getUserMedia, getScreenShare]);

  const endCall = useCallback(() => {
    if (isRecording) stopRecording();
    const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : undefined;
    sendCallMessage('call.end', { call_id: callIdRef.current, call_type: callType, duration_seconds: duration });
    onClose();
  }, [isRecording, sendCallMessage, onClose, callType, stopRecording]);

  const initials = remoteUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden border-0 max-w-md w-full [&>button]:text-white" style={{ borderRadius: '20px' }}>
        <VisuallyHidden>
          <DialogTitle>{callType === 'video' ? 'Video' : 'Audio'} call with {remoteUserName}</DialogTitle>
        </VisuallyHidden>

        <div className="relative flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white min-h-[520px]">

          {/* ── Calling screen ── */}
          {callStatus === 'calling' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-6 py-16 px-8">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-36 w-36 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '1.8s' }} />
                <span className="absolute inline-flex h-28 w-28 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.4s' }} />
                <Avatar className="h-20 w-20 border-2 border-white/30 relative z-10">
                  {remoteUserAvatar && <AvatarImage src={remoteUserAvatar} />}
                  <AvatarFallback className="text-2xl font-semibold bg-slate-600 text-white">{initials}</AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-semibold">{remoteUserName}</h2>
                <p className="text-slate-400 text-sm animate-pulse">
                  {existingCallId ? 'Connecting…' : `${callType === 'video' ? 'Video' : 'Audio'} calling…`}
                </p>
              </div>

              <button
                onClick={endCall}
                className="mt-8 h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg"
              >
                <PhoneOff size={26} />
              </button>
            </div>
          )}

          {/* ── Connected screen ── */}
          {callStatus === 'connected' && (
            <div className="flex flex-col flex-1">
              {/* Remote video / avatar */}
              <div className="relative flex-1 bg-slate-800 min-h-[340px]">
                {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                  <video
                    key={userId}
                    ref={(el) => {
                      if (el) { el.srcObject = stream; remoteVideoRefs.current.set(userId, el); }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ))}
                {remoteStreams.size === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar className="h-24 w-24">
                      {remoteUserAvatar && <AvatarImage src={remoteUserAvatar} />}
                      <AvatarFallback className="text-3xl bg-slate-600 text-white">{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Duration */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full tabular-nums">
                  {formatDuration(callDuration)}
                </div>

                {/* Local PiP (video only) */}
                {callType === 'video' && (
                  <div className="absolute bottom-3 right-3 w-28 h-20 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    {isVideoOff && (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <VideoOff size={16} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                  {remoteUserName}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 py-5 bg-slate-900">
                <ControlButton active={isMuted} danger onClick={toggleMute} label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </ControlButton>

                {callType === 'video' && (
                  <ControlButton active={isVideoOff} danger onClick={toggleVideo} label={isVideoOff ? 'Show video' : 'Hide video'}>
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </ControlButton>
                )}

                <ControlButton onClick={toggleScreenShare} active={isScreenSharing} label="Screen share">
                  <Monitor size={20} />
                </ControlButton>

                {meetingId && (
                  <ControlButton
                    onClick={() => (isRecording ? stopRecording() : void startRecording())}
                    active={isRecording}
                    danger
                    label={isRecording ? "Stop recording" : "Record"}
                  >
                    <CircleDot size={20} />
                  </ControlButton>
                )}

                <button
                  onClick={endCall}
                  title="End call"
                  className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-md"
                >
                  <PhoneOff size={22} />
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ControlButton({
  children, onClick, active, danger, label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "h-12 w-12 rounded-full flex items-center justify-center transition-colors text-white",
        danger && active ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}
