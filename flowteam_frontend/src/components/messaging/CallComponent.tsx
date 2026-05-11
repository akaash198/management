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
      // Play a subtle connected beep
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
      } catch {}

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
      } else {
        // Acceptor: media ready, send join to trigger participant_joined on sender
        sendCallMessage('call.join', { call_id: existingCallId });
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
      <DialogContent 
        className="p-0 overflow-hidden border-0 max-w-md w-full [&>button]:hidden shadow-2xl" 
        style={{ borderRadius: '24px' }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{callType === 'video' ? 'Video' : 'Audio'} call with {remoteUserName}</DialogTitle>
        </VisuallyHidden>

        <div className="relative flex flex-col bg-black text-white min-h-[520px] overflow-hidden">
          
          {/* Ambient Blurred Background */}
          {remoteUserAvatar && (
            <div 
              className="absolute inset-0 z-0 opacity-40 mix-blend-screen scale-110"
              style={{
                backgroundImage: `url(${remoteUserAvatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(60px)'
              }}
            />
          )}
          {!remoteUserAvatar && (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-60 blur-3xl scale-150" />
          )}

          {/* ── Calling screen ── */}
          {callStatus === 'calling' && (
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-8 py-16 px-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative flex items-center justify-center">
                {/* Multi-layered dynamic ripples */}
                <span className="absolute inline-flex h-48 w-48 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '2.5s' }} />
                <span className="absolute inline-flex h-36 w-36 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.8s' }} />
                <span className="absolute inline-flex h-28 w-28 rounded-full border border-white/20 animate-pulse" />
                <Avatar className="h-24 w-24 border-[3px] border-white/40 shadow-2xl shadow-white/10 relative z-10 transition-transform duration-700 hover:scale-105">
                  {remoteUserAvatar && <AvatarImage src={remoteUserAvatar} />}
                  <AvatarFallback className="text-3xl font-semibold bg-slate-800/80 backdrop-blur-sm text-white">{initials}</AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">{remoteUserName}</h2>
                <p className="text-white/70 text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {existingCallId ? 'Connecting…' : `${callType === 'video' ? 'Video' : 'Audio'} calling…`}
                </p>
              </div>

              <button
                onClick={endCall}
                className="mt-12 h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-110 active:scale-95"
              >
                <PhoneOff size={26} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* ── Connected screen ── */}
          {callStatus === 'connected' && (
            <div className="relative z-10 flex flex-col flex-1 h-full">
              {/* Remote video / avatar container */}
              <div className="relative flex-1 bg-black/40 backdrop-blur-md overflow-hidden flex items-center justify-center">
                
                {/* Always render remote streams (invisible if audio-only) to capture the audio playback */}
                {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                  <video
                    key={userId}
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(userId, el);
                        if (el.srcObject !== stream) {
                          el.srcObject = stream;
                          el.volume = 1.0;
                          el.muted = false;
                          el.play().catch((e) => console.error("Playback failed", e));
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-500",
                      callType === 'audio' ? "opacity-0 absolute inset-0" : "opacity-100 relative z-10"
                    )}
                  />
                ))}

                {/* Show big avatar overlay for audio calls or when waiting for video stream */}
                {(callType === 'audio' || remoteStreams.size === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 z-0">
                    <div className="relative">
                      <span className="absolute inset-[-40%] rounded-full border border-white/10 animate-[spin_4s_linear_infinite]" />
                      <span className="absolute inset-[-20%] rounded-full border border-white/5 animate-[spin_3s_linear_infinite_reverse]" />
                      <Avatar className="h-32 w-32 shadow-2xl border border-white/20 relative z-10">
                        {remoteUserAvatar && <AvatarImage src={remoteUserAvatar} />}
                        <AvatarFallback className="text-4xl font-semibold bg-slate-800/80 backdrop-blur-sm text-white">{initials}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                )}

                {/* Top bar (Duration & Name) */}
                <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
                  <div className="flex items-center gap-2.5">
                     <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-white/90 text-sm font-medium drop-shadow-sm">{remoteUserName}</span>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md text-white/90 font-mono text-sm px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">
                    {formatDuration(callDuration)}
                  </div>
                </div>

                {/* Local PiP (video only) */}
                {callType === 'video' && (
                  <div className="absolute bottom-6 right-6 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-30 transition-transform hover:scale-105 duration-300">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    {isVideoOff && (
                      <div className="absolute inset-0 bg-slate-800/90 backdrop-blur flex flex-col items-center justify-center gap-2">
                        <VideoOff size={24} className="text-white/50" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Floating Controls Bar */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-4 py-3 px-6 bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 animate-in slide-in-from-bottom-8 duration-700">
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
                    <div className="relative">
                       <CircleDot size={20} className={isRecording ? "text-red-500" : ""} />
                       {isRecording && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                    </div>
                  </ControlButton>
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
        "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 text-white border border-transparent shadow-sm hover:scale-105 active:scale-95",
        danger && active ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-white/10 hover:bg-white/20 hover:border-white/20 backdrop-blur-md",
      )}
    >
      {children}
    </button>
  );
}
