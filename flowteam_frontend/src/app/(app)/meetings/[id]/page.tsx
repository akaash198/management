"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock,
  Copy, ExternalLink, Loader2, Mic, MonitorPlay, Phone, Play,
  Users, Video, Volume2, Zap,
} from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { Meeting, MeetingCallType, MeetingRecording } from "@/types/meetings";
import { useAuthStore } from "@/store/auth";
import { useTeamStore } from "@/store/team";
import { useChatSocket } from "@/hooks/useMessaging";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast, isWithinInterval, subMinutes, addMinutes } from "date-fns";

const CallComponent = dynamic(
  () => import("@/components/messaging/CallComponent").then((m) => ({ default: m.CallComponent }))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatRecordingDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type MeetingPhase = "upcoming" | "live" | "past" | "cancelled";

function getMeetingPhase(meeting: Meeting): MeetingPhase {
  if (meeting.status === "cancelled") return "cancelled";
  const starts = new Date(meeting.starts_at);
  const ends = new Date(starts.getTime() + meeting.duration_minutes * 60_000);
  const now = new Date();
  if (isWithinInterval(now, { start: subMinutes(starts, 5), end: ends })) return "live";
  if (isPast(ends)) return "past";
  return "upcoming";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meetingId = params.id;
  const { user } = useAuthStore();
  const { activeTeamId } = useTeamStore();

  const searchParams = useSearchParams();
  const acceptCallIdParam = searchParams.get("acceptCall");
  const acceptCallTypeParam = searchParams.get("callType") as MeetingCallType | null;

  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<MeetingCallType>("video");
  const [acceptedCallId, setAcceptedCallId] = useState<string | null>(null);
  const [expandedRecordingId, setExpandedRecordingId] = useState<string | null>(null);

  const callEventHandlerRef = useRef<((type: string, data: unknown) => void) | null>(null);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return { id: user.id, full_name: user.full_name, avatar: user.avatar_url ?? null };
  }, [user]);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Meeting>>(`/meetings/${meetingId}/`);
      return res.data.data;
    },
    enabled: !!meetingId,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (meeting && acceptCallIdParam) {
      setCallType(acceptCallTypeParam || meeting.call_type);
      setAcceptedCallId(acceptCallIdParam);
      setCallOpen(true);

      const newUrl = window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [meeting, acceptCallIdParam, acceptCallTypeParam]);

  const { data: recordings = [] } = useQuery<MeetingRecording[]>({
    queryKey: ["meeting-recordings", meetingId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MeetingRecording[]>>(`/meetings/${meetingId}/recordings/`);
      return res.data.data ?? [];
    },
    enabled: !!meetingId,
    refetchInterval: 5_000,
  });

  /* ── Sibling meetings for Prev / Next navigation ─────────────── */
  const siblingRange = useMemo(() => {
    const now = meeting ? new Date(meeting.starts_at) : new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    const end = new Date(now);
    end.setMonth(end.getMonth() + 3);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }, [meeting]);

  const { data: siblingMeetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings-siblings", activeTeamId, siblingRange.start, siblingRange.end],
    queryFn: async () => {
      if (!activeTeamId) return [];
      const qs = new URLSearchParams({ start: siblingRange.start, end: siblingRange.end });
      const res = await api.get<ApiResponse<Meeting[]>>(`/meetings/teams/${activeTeamId}/meetings/?${qs}`);
      return (res.data.data ?? []).sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    },
    enabled: !!activeTeamId,
    staleTime: 60_000,
  });

  const { prevMeeting, nextMeeting } = useMemo(() => {
    const idx = siblingMeetings.findIndex((m) => m.id === meetingId);
    return {
      prevMeeting: idx > 0 ? siblingMeetings[idx - 1] : null,
      nextMeeting: idx >= 0 && idx < siblingMeetings.length - 1 ? siblingMeetings[idx + 1] : null,
    };
  }, [siblingMeetings, meetingId]);

  const { sendCallMessage } = useChatSocket(meeting?.channel_id ?? null, {
    currentUser,
    onCallEvent: (type, payload) => {
      if (type === "call.started" || type === "call_started") {
        const callData = payload as { id: string; call_type?: MeetingCallType };
        queryClient.setQueryData(["meeting", meetingId], (prev: Meeting | undefined) => {
          if (!prev) return prev;
          return { ...prev, active_call_id: callData.id, call_type: callData.call_type || prev.call_type };
        });
      } else if (type === "call.ended" || type === "call.end") {
        queryClient.setQueryData(["meeting", meetingId], (prev: Meeting | undefined) => {
          if (!prev) return prev;
          return { ...prev, active_call_id: null };
        });
      }
      callEventHandlerRef.current?.(type, payload);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/meetings/${meetingId}/`, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success("Meeting cancelled");
    },
    onError: () => toast.error("Failed to cancel meeting"),
  });

  const joinCall = () => {
    if (!meeting) return;
    setCallType(meeting.call_type);
    // CallComponent sends call.join itself on mount when existingCallId is set
    setAcceptedCallId(meeting.active_call_id ?? null);
    setCallOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meetingId}`);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading meeting…</span>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Meeting not found.</p>
        <Button variant="outline" onClick={() => router.push("/meetings")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to meetings
        </Button>
      </div>
    );
  }

  const phase = getMeetingPhase(meeting);
  const starts = new Date(meeting.starts_at);
  const ends = new Date(starts.getTime() + meeting.duration_minutes * 60_000);
  const isHost = meeting.created_by?.id === user?.id;
  const attendees = meeting.attendees ?? [];
  const hasRecordings = recordings.length > 0;
  const canJoin = phase === "live" || phase === "upcoming";

  return (
    <div className="min-h-full bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/meetings")} aria-label="Back to meetings">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <PhaseBadge phase={phase} />
              {meeting.call_type === "video" ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Video className="h-3 w-3" />
                  Video
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Phone className="h-3 w-3" />
                  Audio
                </Badge>
              )}
            </div>

            {/* Prev / Next meeting */}
            <div className="flex items-center gap-0.5 border-l border-border pl-3 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-[12px] px-2"
                disabled={!prevMeeting}
                onClick={() => prevMeeting && router.push(`/meetings/${prevMeeting.id}`)}
                title={prevMeeting ? `Previous: ${prevMeeting.title}` : undefined}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {prevMeeting ? prevMeeting.title : "Prev"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-[12px] px-2"
                disabled={!nextMeeting}
                onClick={() => nextMeeting && router.push(`/meetings/${nextMeeting.id}`)}
                title={nextMeeting ? `Next: ${nextMeeting.title}` : undefined}
              >
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {nextMeeting ? nextMeeting.title : "Next"}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </Button>
            {canJoin && (
              <Button
                size="sm"
                onClick={joinCall}
                className={cn(
                  "gap-1.5 text-xs h-8 font-semibold",
                  phase === "live" && "bg-green-600 hover:bg-green-700 shadow-[0_0_12px_rgba(22,163,74,0.35)] animate-pulse"
                )}
              >
                {meeting.call_type === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {meeting.active_call_id ? "Join active call" : "Start call"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Hero card ── */}
        <Card className="overflow-hidden">
          <div className={cn(
            "h-1.5 w-full",
            phase === "live" && "bg-green-500",
            phase === "upcoming" && "bg-primary",
            phase === "past" && "bg-muted-foreground/30",
            phase === "cancelled" && "bg-destructive/40",
          )} />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                meeting.call_type === "video" ? "bg-violet-500/10" : "bg-blue-500/10"
              )}>
                {meeting.call_type === "video"
                  ? <Video className="h-7 w-7 text-violet-500" />
                  : <Phone className="h-7 w-7 text-blue-500" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">{meeting.title}</h1>
                {meeting.description && (
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{meeting.description}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(starts, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(starts, "h:mm a")} – {format(ends, "h:mm a")}</span>
                    <span className="text-muted-foreground/60">({meeting.duration_minutes} min)</span>
                  </div>
                  {phase === "upcoming" && (
                    <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                      <Zap className="h-3.5 w-3.5" />
                      Starts {formatDistanceToNow(starts, { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live indicator */}
            {phase === "live" && (
              <div className="mt-5 flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">This call is live right now</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {meeting.active_call_id ? "Active call in progress" : "Click 'Start call' to begin"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={joinCall}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  Join now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Attendees */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Attendees
                  </CardTitle>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {attendees.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {attendees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No attendees listed.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {attendees.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                            {initials(a.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.full_name}</p>
                          {a.id === meeting.created_by?.id && (
                            <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">Host</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recordings */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                    Recordings
                  </CardTitle>
                  {hasRecordings && (
                    <Badge variant="secondary" className="text-xs">{recordings.length}</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Call recordings, transcripts, and AI summaries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordings.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recordings yet.</p>
                    <p className="text-xs text-muted-foreground/60">
                      Start a call and hit the record button to save recordings here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recordings.map((r) => (
                      <RecordingCard
                        key={r.id}
                        recording={r}
                        expanded={expandedRecordingId === r.id}
                        onToggle={() => setExpandedRecordingId((prev) => prev === r.id ? null : r.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {canJoin && (
                  <Button className="w-full justify-start gap-2 text-sm" onClick={joinCall}>
                    {meeting.call_type === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    {meeting.active_call_id ? "Join active call" : "Start call"}
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                  Copy meeting link
                </Button>
                {meeting.channel_id && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm"
                    onClick={() => router.push(`/messages?channel=${meeting.channel_id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open meeting chat
                  </Button>
                )}
                {isHost && phase !== "past" && phase !== "cancelled" && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel meeting
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Meeting info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date">
                  {format(starts, "MMM d, yyyy")}
                </InfoRow>
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Time">
                  {format(starts, "h:mm a")} – {format(ends, "h:mm a")}
                </InfoRow>
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Duration">
                  {meeting.duration_minutes} minutes
                </InfoRow>
                <InfoRow
                  icon={meeting.call_type === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  label="Type"
                >
                  <span className="capitalize">{meeting.call_type}</span>
                </InfoRow>
                {meeting.created_by && (
                  <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="Host">
                    {meeting.created_by.full_name ?? "Unknown"}
                  </InfoRow>
                )}
                {hasRecordings && (
                  <InfoRow icon={<Mic className="h-3.5 w-3.5" />} label="Recordings">
                    {recordings.length} recording{recordings.length !== 1 ? "s" : ""}
                  </InfoRow>
                )}
              </CardContent>
            </Card>

            {/* Transcription progress */}
            {recordings.some((r) => r.status === "transcribing") && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Transcribing…
                  </div>
                  <Progress value={undefined} className="h-1" />
                  <p className="text-xs text-muted-foreground">AI transcription is in progress. This page updates automatically.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Call modal ── */}
      {meeting && (
        <CallComponent
          channelId={meeting.channel_id}
          isOpen={callOpen}
          onClose={() => { setCallOpen(false); setAcceptedCallId(null); }}
          callType={callType}
          sendCallMessage={sendCallMessage}
          onCallEventRef={callEventHandlerRef}
          existingCallId={acceptedCallId}
          remoteUserName={meeting.title}
          meetingId={meeting.id}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: MeetingPhase }) {
  const configs: Record<MeetingPhase, { label: string; className: string }> = {
    live: { label: "● Live", className: "bg-green-500/10 text-green-600 border-green-500/20 animate-pulse" },
    upcoming: { label: "Upcoming", className: "bg-primary/10 text-primary border-primary/20" },
    past: { label: "Ended", className: "bg-muted text-muted-foreground border-border" },
    cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const { label, className } = configs[phase];
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold", className)}>
      {label}
    </Badge>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
        <div className="text-[13px] text-foreground mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function RecordingCard({
  recording, expanded, onToggle,
}: {
  recording: MeetingRecording;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    uploaded: { label: "Processing", variant: "secondary" },
    transcribing: { label: "Transcribing", variant: "outline" },
    transcribed: { label: "Transcribed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const { label, variant } = statusConfig[recording.status] ?? { label: recording.status, variant: "secondary" };

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Volume2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              Recording {format(new Date(recording.created_at), "h:mm a")}
            </p>
            {recording.duration_seconds > 0 && (
              <p className="text-xs text-muted-foreground">{formatRecordingDuration(recording.duration_seconds)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={variant} className="text-[10px]">{label}</Badge>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border animate-in slide-in-from-top-1 duration-150">
          {recording.audio_file && (
            <div className="pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Playback</p>
              <audio controls className="w-full h-10 rounded-lg">
                <source src={recording.audio_file} />
              </audio>
            </div>
          )}

          {recording.ai_summary && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                AI Summary
              </p>
              <div className="text-xs text-foreground bg-primary/5 border border-primary/10 rounded-lg p-3 whitespace-pre-wrap">
                {recording.ai_summary}
              </div>
            </div>
          )}

          {recording.transcript_text && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Transcript
              </p>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {recording.transcript_text}
              </div>
            </div>
          )}

          {!recording.ai_summary && !recording.transcript_text && recording.status === "transcribing" && (
            <div className="py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Transcription in progress…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
