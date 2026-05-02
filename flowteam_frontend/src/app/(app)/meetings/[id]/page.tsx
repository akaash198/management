"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Users, Video, Phone, Play } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { Meeting, MeetingCallType } from "@/types/meetings";
import { useAuthStore } from "@/store/auth";
import { useChatSocket } from "@/hooks/useMessaging";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CallComponent } from "@/components/messaging/CallComponent";
import { toast } from "sonner";
import type { MeetingRecording } from "@/types/meetings";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = params.id;
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Meeting>>(`/meetings/${meetingId}/`);
      return res.data.data;
    },
    enabled: !!meetingId,
  });

  const meeting = data ?? null;
  const callEventHandlerRef = useRef<((type: string, data: any) => void) | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<MeetingCallType>("video");
  const [acceptedCallId, setAcceptedCallId] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return { id: user.id, full_name: user.full_name, avatar: user.avatar_url ?? null };
  }, [user]);

  const { sendCallMessage } = useChatSocket(meeting?.channel_id ?? null, {
    currentUser,
    onCallEvent: (type, payload) => {
      callEventHandlerRef.current?.(type, payload);
    },
  });

  const join = () => {
    if (!meeting) return;
    setCallType(meeting.call_type);
    if (meeting.active_call_id) {
      setAcceptedCallId(meeting.active_call_id);
      sendCallMessage("call.join", { call_id: meeting.active_call_id });
    } else {
      setAcceptedCallId(null);
    }
    setCallOpen(true);
  };

  const { data: recordings = [] } = useQuery({
    queryKey: ["meeting-recordings", meetingId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MeetingRecording[]>>(`/meetings/${meetingId}/recordings/`);
      return res.data.data ?? [];
    },
    enabled: !!meetingId,
    refetchInterval: 4000,
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
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

  const starts = new Date(meeting.starts_at);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/meetings")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{meeting.status}</Badge>
          <Badge variant="secondary" className="capitalize">{meeting.call_type}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {meeting.call_type === "video" ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            {meeting.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {starts.toLocaleString()} • {meeting.duration_minutes} min
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meeting.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}

          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Attendees</p>
              </div>
              <p className="text-xs text-muted-foreground">{(meeting.attendees ?? []).length} total</p>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {(meeting.attendees ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees listed.</p>
              ) : (
                (meeting.attendees ?? []).map((a) => (
                  <div key={a.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {a.full_name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={join} className="gap-2">
              <Play className="h-4 w-4" />
              {meeting.active_call_id ? "Join active call" : "Start call"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meeting.id}`);
                  toast.success("Link copied");
                } catch {
                  toast.error("Copy failed");
                }
              }}
            >
              Copy link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Camera/microphone permission is requested only when you start/join the call.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recordings</CardTitle>
          <CardDescription>Audio recordings uploaded from calls. Transcripts appear when processing finishes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recordings yet.</p>
          ) : (
            recordings.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground truncate">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={r.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                </div>
                {r.audio_file && (
                  <audio controls className="w-full">
                    <source src={r.audio_file} />
                  </audio>
                )}
                {r.ai_summary && (
                  <pre className="text-xs whitespace-pre-wrap bg-background rounded-lg border border-border p-3">{r.ai_summary}</pre>
                )}
                {r.transcript_text && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">View transcript</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-background rounded-lg border border-border p-3">{r.transcript_text}</pre>
                  </details>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CallComponent
        channelId={meeting.channel_id}
        isOpen={callOpen}
        onClose={() => { setCallOpen(false); setAcceptedCallId(null); }}
        callType={callType as MeetingCallType}
        sendCallMessage={sendCallMessage}
        onCallEventRef={callEventHandlerRef}
        existingCallId={acceptedCallId}
        remoteUserName={meeting.title}
        meetingId={meeting.id}
      />
    </div>
  );
}
