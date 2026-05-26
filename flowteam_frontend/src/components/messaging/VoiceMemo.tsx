"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Mic, Square, Send, Trash2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMemoProps {
  onSend: (blob: Blob, duration: number) => void;
  className?: string;
}

export function VoiceMemo({ onSend, className }: VoiceMemoProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [audioUrl]);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Microphone access denied
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    setIsRecording(false);
  }, []);

  const discardRecording = useCallback(() => {
    cleanup();
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  }, [cleanup]);

  const handleSend = useCallback(() => {
    if (!audioBlob) return;
    onSend(audioBlob, duration);
    discardRecording();
  }, [audioBlob, duration, onSend, discardRecording]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Idle state — just a mic button
  if (!isRecording && !audioBlob) {
    return (
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
          className
        )}
        onClick={startRecording}
        title="Record voice memo"
        aria-label="Record voice memo"
      >
        <Mic size={15} />
      </button>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
        <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[12px] font-mono font-semibold text-red-500">{formatDuration(duration)}</span>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white transition-transform hover:scale-105"
          onClick={stopRecording}
          title="Stop recording"
        >
          <Square size={12} />
        </button>
      </div>
    );
  }

  // Preview state (recorded, not yet sent)
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5">
        <button
          type="button"
          className="text-primary hover:text-primary/80 transition-colors"
          onClick={togglePlayback}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <span className="text-[12px] font-mono font-semibold text-primary">{formatDuration(duration)}</span>
      </div>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        onClick={discardRecording}
        title="Discard"
      >
        <Trash2 size={13} />
      </button>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:scale-105"
        onClick={handleSend}
        title="Send voice memo"
      >
        <Send size={12} />
      </button>
    </div>
  );
}

/** Inline player for voice memo messages */
export function VoiceMemoPlayer({ url, duration }: { url: string; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState<number | undefined>(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setLocalDuration(duration);
  }, [duration]);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setLocalDuration(audio.duration);
      }
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    if (audio.readyState >= 1 && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setLocalDuration(audio.duration);
    }

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [url]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    setProgress(pct);
    setCurrentTime(audio.currentTime);
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audio.play();
      setIsPlaying(true);
      animRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, tick]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 min-w-[200px] max-w-[300px]">
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>{fmt(currentTime)}</span>
          <span>{localDuration ? fmt(localDuration) : "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
