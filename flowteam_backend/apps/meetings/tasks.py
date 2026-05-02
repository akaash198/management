from __future__ import annotations

import json
import mimetypes
from pathlib import Path

import requests
from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.ai.client import call_claude
from apps.ai.prompts import MEETING_ACTION_ITEMS_SYSTEM
from apps.meetings.models import MeetingRecording
from apps.messaging.services import create_message_with_seq


def _openai_transcribe(*, file_path: str, mime_type: str | None = None, language: str | None = None) -> str:
    api_key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")

    model = (getattr(settings, "OPENAI_TRANSCRIBE_MODEL", "") or "").strip() or "gpt-4o-mini-transcribe"
    url = "https://api.openai.com/v1/audio/transcriptions"

    file_name = Path(file_path).name
    content_type = mime_type or mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    data = {"model": model}
    if isinstance(language, str) and language.strip():
        data["language"] = language.strip()

    with open(file_path, "rb") as f:
        files = {"file": (file_name, f, content_type)}
        res = requests.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            data=data,
            files=files,
            timeout=120,
        )

    if not res.ok:
        raise RuntimeError(f"Transcription failed: {res.status_code} {res.text[:500]}")

    payload = res.json()
    # Standard response is { "text": "..." } for json response_format.
    return (payload.get("text") or "").strip()


@shared_task
def transcribe_meeting_recording(recording_id: str, language: str | None = None) -> dict:
    rec = MeetingRecording.objects.select_related("meeting", "meeting__channel", "meeting__created_by").filter(id=recording_id).first()
    if not rec:
        return {"ok": False, "error": "not_found"}

    if not rec.audio_file:
        MeetingRecording.objects.filter(id=rec.id).update(status=MeetingRecording.STATUS_FAILED, error="Missing audio file", updated_at=timezone.now())
        return {"ok": False, "error": "missing_audio"}

    MeetingRecording.objects.filter(id=rec.id).update(status=MeetingRecording.STATUS_TRANSCRIBING, error="", updated_at=timezone.now())

    try:
        transcript = _openai_transcribe(file_path=rec.audio_file.path, mime_type=rec.mime_type, language=language)
        MeetingRecording.objects.filter(id=rec.id).update(
            status=MeetingRecording.STATUS_TRANSCRIBED,
            transcript_text=transcript,
            updated_at=timezone.now(),
        )
    except Exception as e:
        MeetingRecording.objects.filter(id=rec.id).update(
            status=MeetingRecording.STATUS_FAILED,
            error=str(e)[:2000],
            updated_at=timezone.now(),
        )
        return {"ok": False, "error": str(e)}

    # Generate action items + brief summary via Claude (best-effort)
    try:
        raw = call_claude(MEETING_ACTION_ITEMS_SYSTEM, f"Meeting transcript:\n{transcript}", max_tokens=1024)
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}

        summary = ""
        if isinstance(parsed, dict):
            # Common schema from prompt: action_items array etc.
            items = parsed.get("action_items") or parsed.get("items") or parsed.get("tasks") or None
            if isinstance(items, list):
                lines = []
                for i, item in enumerate(items[:10], start=1):
                    if isinstance(item, dict):
                        title = item.get("title") or item.get("task") or item.get("action") or ""
                        owner = item.get("owner") or item.get("assignee") or ""
                        due = item.get("due") or item.get("due_date") or ""
                        extra = " ".join([x for x in [owner, due] if x]).strip()
                        lines.append(f"{i}. {title}{(' — ' + extra) if extra else ''}".strip())
                    else:
                        lines.append(f"{i}. {str(item)}")
                summary = "Action items:\n" + "\n".join(lines) if lines else ""
        MeetingRecording.objects.filter(id=rec.id).update(action_items=parsed if isinstance(parsed, dict) else {"raw": raw}, ai_summary=summary)
    except Exception:
        parsed = None
        summary = ""

    # Post system message into meeting channel
    try:
        sender = rec.meeting.created_by
        if not sender:
            sender = rec.created_by
        if sender:
            parts = [
                "Meeting recording processed.",
                f"Recording ID: {rec.id}",
            ]
            if summary:
                parts.append("")
                parts.append(summary)
            msg, _ = create_message_with_seq(
                channel_id=rec.meeting.channel_id,
                sender=sender,
                text="\n".join(parts),
            )
            msg.is_system = True
            msg.meta = {"kind": "meeting_recording", "recording_id": str(rec.id)}
            msg.save(update_fields=["is_system", "meta"])
    except Exception:
        pass

    return {"ok": True}

