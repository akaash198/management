"use client";

import { Message } from "@/types/messaging";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn, normalizeUrl } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import { Smile, MessageSquare, Edit2, Trash2, MoreHorizontal, X, Check, Phone, PhoneOff, Video, VideoOff, ChevronDown, FileText } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Attachment } from "@/types/messaging";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Pin, Link as LinkIcon, Star, Send } from "lucide-react";
import { RichEmbeds } from "@/components/embeds/RichEmbeds";
import { VoiceMemoPlayer } from "./VoiceMemo";

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isHighlighted?: boolean;
  canModerate?: boolean;
  highlightQuery?: string;
  replyCount?: number;
  parentPreview?: { senderName: string; text: string } | null;
  isPinned?: boolean;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditCancel?: () => void;
  onEditSave?: () => void;
  onStartEdit?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  onToggleReaction?: (emoji: string, reactedByMe: boolean) => void;
  onOpenThread?: () => void;
  onRetry?: () => void;
  onTogglePin?: () => void;
  onCopyLink?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onViewEditHistory?: () => void;
  onMarkUnread?: () => void;
  onQuoteReply?: () => void;
  onForward?: () => void;
}

/* ── Text rendering ─────────────────────────────────────── */

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode[] {
  const q = query.trim();
  if (!q || q.length < 2) return [text];
  const re = new RegExp(escapeRegExp(q), "ig");
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={`${idx}`} className="rounded bg-amber-100 dark:bg-amber-900/40 px-0.5 text-foreground">
        {text.slice(idx, idx + m[0].length)}
      </mark>
    );
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderMessageText(text: string, opts?: { highlightQuery?: string }): ReactNode[] {
  // Blockquote lines (> text)
  if (/^> /m.test(text)) {
    const lines = text.split("\n");
    const out: ReactNode[] = [];
    let quoteBuffer: string[] = [];
    let rest: string[] = [];

    const flushQuote = (key: string) => {
      if (!quoteBuffer.length) return;
      out.push(
        <div key={key} className="my-1.5 border-l-2 border-primary/40 pl-3 text-muted-foreground/80 italic text-[13px]">
          {renderMessageText(quoteBuffer.join("\n"), opts)}
        </div>
      );
      quoteBuffer = [];
    };

    lines.forEach((line, i) => {
      if (line.startsWith("> ")) {
        if (rest.length) {
          out.push(<span key={`r${i}`}>{renderMessageText(rest.join("\n"), opts)}</span>);
          rest = [];
        }
        quoteBuffer.push(line.slice(2));
      } else {
        flushQuote(`q${i}`);
        rest.push(line);
      }
    });
    flushQuote("qend");
    if (rest.length) out.push(<span key="rend">{renderMessageText(rest.join("\n"), opts)}</span>);
    return out;
  }

  // Code blocks
  if (/```[\s\S]*?```/.test(text)) {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(/```([\w-]+)?\n?([\s\S]*?)```/g)) {
      const idx = match.index ?? 0;
      if (idx > last) parts.push(<span key={`t${idx}`}>{renderMessageText(text.slice(last, idx), opts)}</span>);
      const lang = (match[1] ?? "").trim();
      const code = (match[2] ?? "").replace(/\n$/, "");
      parts.push(
        <div key={`c${idx}`} className="my-2 overflow-auto rounded-lg border border-border bg-muted/60 font-mono text-[12px]">
          {lang && (
            <div className="border-b border-border px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              {lang}
            </div>
          )}
          <pre className="px-3 py-2 leading-5 whitespace-pre-wrap text-foreground">{code}</pre>
        </div>
      );
      last = idx + (match[0]?.length ?? 0);
    }
    if (last < text.length) parts.push(<span key="tend">{renderMessageText(text.slice(last), opts)}</span>);
    return parts;
  }

  // Inline: bold (**text**), italic (_text_), strikethrough (~~text~~), mentions, URLs, code
  const regex = /(\*\*([^*]+)\*\*)|(_([^_]+)_)|(~~([^~]+)~~)|(@[\w.-]+)|(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  type Token = { type: "text" | "bold" | "italic" | "strike" | "mention" | "url"; value: string; inner?: string };
  const out: Token[] = [];
  let last = 0;
  for (const match of text.matchAll(regex)) {
    const idx = match.index ?? 0;
    if (idx > last) out.push({ type: "text", value: text.slice(last, idx) });
    const token = match[0] ?? "";
    if (token.startsWith("**")) out.push({ type: "bold", value: token, inner: match[2] });
    else if (token.startsWith("_") && !token.startsWith("__")) out.push({ type: "italic", value: token, inner: match[4] });
    else if (token.startsWith("~~")) out.push({ type: "strike", value: token, inner: match[6] });
    else if (token.startsWith("@")) out.push({ type: "mention", value: token });
    else out.push({ type: "url", value: token });
    last = idx + token.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });

  return out.map((p, i) => {
    if (p.type === "bold") return <strong key={i} className="font-semibold">{p.inner}</strong>;
    if (p.type === "italic") return <em key={i} className="italic">{p.inner}</em>;
    if (p.type === "strike") return <del key={i} className="line-through text-muted-foreground/70">{p.inner}</del>;
    if (p.type === "mention") {
      const isSpecial = p.value === "@channel" || p.value === "@here";
      return (
        <span key={i} className={cn(
          "font-semibold rounded px-0.5",
          isSpecial ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "text-primary bg-primary/8"
        )}>
          {p.value}
        </span>
      );
    }
    if (p.type === "url") {
      let url = p.value;
      let trail = "";
      while (url.length && /[).,!?:;]$/.test(url)) { trail = url.slice(-1) + trail; url = url.slice(0, -1); }
      const href = url.startsWith("http") ? url : `https://${url}`;
      return (
        <span key={i}>
          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
            {url}
          </a>
          {trail}
        </span>
      );
    }
    return (
      <span key={i}>
        {p.value.split(/(`[^`]+`)/g).map((seg, si) =>
          /^`[^`]+`$/.test(seg) ? (
            <code key={si} className="rounded-md bg-muted/70 border border-border/60 px-1.5 py-0.5 text-[12px] font-mono text-foreground">
              {seg.slice(1, -1)}
            </code>
          ) : (
            <span key={si}>{highlightText(seg, opts?.highlightQuery ?? "")}</span>
          )
        )}
      </span>
    );
  });
}

/* ── Attachments ────────────────────────────────────────── */

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

function formatBytes(bytes: number) {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function AttachmentList({ items }: { items: Attachment[] }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  if (!items.length) return null;

  const apiBase = getApiBaseUrl();
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");
  const norm = (url: string) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return url.startsWith("/") ? `${apiOrigin}${url}` : `${apiOrigin}/${url}`;
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((a) => {
        const href = norm(a.url);
        const ct   = a.content_type || "";
        if (ct.startsWith("image/")) {
          return (
            <button key={a.id} type="button" title={a.filename}
              className="overflow-hidden rounded-xl border border-border hover:border-primary/40 transition-colors"
              onClick={() => setLightbox({ src: href, alt: a.filename })}
            >
              <img src={href} alt={a.filename} className="h-36 w-36 object-cover" />
            </button>
          );
        }
        if (ct.startsWith("video/")) {
          return (
            <div key={a.id} className="overflow-hidden rounded-xl border border-border bg-card p-1">
              <video src={href} controls className="h-40 w-60 rounded-lg object-cover" />
            </div>
          );
        }
        if (ct.startsWith("audio/")) {
          return (
            <div key={a.id} className="mt-1">
              <VoiceMemoPlayer url={href} />
            </div>
          );
        }
        if (ct === "application/pdf") {
          const viewUrl = `/view/pdf?url=${encodeURIComponent(href)}&name=${encodeURIComponent(a.filename)}`;
          return (
            <a key={a.id} href={viewUrl} target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all w-64 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate text-foreground group-hover:text-primary transition-colors">{a.filename}</div>
                <div className="text-[11px] text-muted-foreground">{formatBytes(a.size)} · PDF</div>
              </div>
            </a>
          );
        }
        return (
          <a key={a.id} href={href} target="_blank" rel="noreferrer" title={a.filename}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 text-[12px]">
            <span className="text-base">📄</span>
            <span>
              <span className="block font-medium truncate max-w-[200px]">{a.filename}</span>
              <span className="text-[10px] text-muted-foreground">{formatBytes(a.size)}</span>
            </span>
          </a>
        );
      })}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>{lightbox?.alt ?? "Image preview"}</DialogTitle>
          </VisuallyHidden>
          {lightbox && (
            <img src={lightbox.src} alt={lightbox.alt} className="max-h-[85vh] w-full object-contain bg-black/80" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

export function MessageItem({
  message, isOwn, showAvatar, isHighlighted, canModerate,
  highlightQuery, replyCount, parentPreview, isPinned,
  isEditing, editValue, onEditChange, onEditCancel, onEditSave,
  onStartEdit, onReply, onDelete, onToggleReaction, onOpenThread,
  onRetry, onTogglePin, onCopyLink, isSaved, onToggleSave,
  onViewEditHistory, onMarkUnread, onQuoteReply, onForward,
}: MessageItemProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const createdAt = useMemo(() => new Date(message.created_at), [message.created_at]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);
  const replies   = replyCount ?? message.reply_count ?? 0;

  /* System message (call log) */
  if (message.is_system) {
    const isMissed = message.meta?.event === "call_missed";
    const isVideoCall = message.meta?.call_type === "video";
    const callLabel = isMissed ? "Missed call" : "Call ended";
    const callKind = isVideoCall ? "Video" : "Audio";
    const duration = typeof message.meta?.duration === "number" ? message.meta.duration : null;
    const durationLabel = duration
      ? `${Math.floor(duration / 60) ? `${Math.floor(duration / 60)}m ` : ""}${duration % 60}s`
      : null;
    const CallIcon = isMissed
      ? (isVideoCall ? VideoOff : PhoneOff)
      : (isVideoCall ? Video : Phone);

    return (
      <div className="my-3 flex justify-center px-4">
        <div
          className={cn(
            "inline-flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm",
            isMissed
              ? "border-red-100 bg-card text-foreground"
              : "border-border/70 bg-card text-foreground"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              isMissed
                ? "border-red-100 bg-red-50 text-red-500"
                : "border-border bg-muted/50 text-muted-foreground"
            )}
          >
            <CallIcon size={17} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {callLabel}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  isMissed
                    ? "border-red-100 bg-red-50 text-red-600"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {callKind}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {isMissed
                ? `${callKind} call was not answered`
                : durationLabel
                  ? `${callKind} call lasted ${durationLabel}`
                  : `${callKind} call finished`}
            </p>
          </div>

          <span className="shrink-0 text-[11px] font-medium text-muted-foreground/80">
            {format(createdAt, "h:mm a")}
          </span>
        </div>
      </div>
    );
  }

  /* Deleted */
  if (message.is_deleted) {
    const actor = message.deleted_by ?? message.sender ?? null;
    const deletedBySelf = !message.deleted_by || message.deleted_by.id === message.sender?.id;
    const senderName = message.sender?.full_name ?? "Unknown";
    const deletedByName = message.deleted_by?.full_name;

    let sublabel: string;
    if (!deletedByName) {
      sublabel = message.sender?.full_name
        ? `${message.sender.full_name}'s message was deleted`
        : "This message was deleted";
    } else if (deletedBySelf) {
      sublabel = `${senderName} deleted their own message`;
    } else {
      sublabel = `${senderName}'s message was removed by ${deletedByName}`;
    }

    const initials = actor?.full_name
      ? actor.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
      : "?";

    return (
      <div className={cn("group flex items-start gap-3 px-4 py-1.5", showAvatar ? "mt-2" : "mt-0.5")}>
        {/* Avatar column — same width as normal messages */}
        <div className="w-9 shrink-0 flex justify-center pt-0.5">
          <div className="relative">
            <Avatar className="h-7 w-7 rounded-full opacity-40">
              <AvatarImage src={actor?.avatar ?? undefined} />
              <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Trash badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted border border-border">
              <Trash2 size={7} className="text-muted-foreground/70" />
            </span>
          </div>
        </div>

        {/* Pill */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-1.5 max-w-sm">
          <Trash2 size={12} className="shrink-0 text-muted-foreground/40" />
          <span className="text-[12px] italic text-muted-foreground/55 leading-snug">
            {sublabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-0.5 hover:bg-muted/30 transition-colors",
        showAvatar && "mt-3",
        isHighlighted && "bg-primary/5 hover:bg-primary/8"
      )}
    >
      {/* ── Avatar / timestamp ghost ── */}
      <div className="w-9 shrink-0 pt-0.5">
        {showAvatar ? (
          <Avatar className="h-9 w-9 rounded-full border border-border/50">
            <AvatarImage src={normalizeUrl(message.sender.avatar)} />
            <AvatarFallback className="text-[12px] font-semibold bg-primary/10 text-primary">
              {message.sender.full_name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="block text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/50 text-center pt-1.5 select-none transition-colors">
            {format(createdAt, "h:mm")}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        {/* Sender + timestamp */}
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-foreground leading-none">
              {message.sender.full_name}
            </span>
            <span className="text-[11px] text-muted-foreground/60 font-normal">
              {format(createdAt, "h:mm a")}
            </span>
            {message.pending && (
              <span className="text-[10px] text-muted-foreground/50 italic">Sending…</span>
            )}
            {message.failed && (
              <>
                <span className="text-[10px] font-semibold text-destructive">Failed to send</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-[10px] font-semibold text-primary underline underline-offset-2"
                  >
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Parent preview (thread reply) */}
        {parentPreview && (
          <button
            type="button"
            onClick={onOpenThread}
            className="mb-1.5 flex items-center gap-2 rounded-lg border-l-2 border-border bg-muted/30 pl-3 pr-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors max-w-xl"
          >
            <span className="font-semibold text-foreground/70">{parentPreview.senderName}</span>
            <span className="truncate">{parentPreview.text}</span>
          </button>
        )}

        {/* Edit mode */}
        {isEditing ? (
          <div className="space-y-2 mt-1">
            <Textarea
              value={editValue ?? ""}
              onChange={(e) => onEditChange?.(e.target.value)}
              className="min-h-[68px] text-[13px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); onEditCancel?.(); }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSave?.(); }
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 gap-1 text-[12px] px-2.5" onClick={onEditSave}>
                <Check size={12} /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[12px] px-2.5 text-muted-foreground" onClick={onEditCancel}>
                <X size={12} /> Cancel
              </Button>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                Enter to save · Shift+Enter for newline
              </span>
            </div>
          </div>
        ) : (
          /* Message text */
          <div className="text-[14px] text-foreground/90 leading-6 break-words whitespace-pre-wrap">
            {renderMessageText(message.text, { highlightQuery })}
            {message.is_edited && (
              <span
                className="ml-1.5 text-[10px] text-muted-foreground/40 font-normal"
                title={message.edited_at ? `Edited ${new Date(message.edited_at).toLocaleString()}` : "Edited"}
              >
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Attachments */}
        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <AttachmentList items={message.attachments} />
        )}

        {/* Rich embeds (Figma/Drive/Miro) */}
        {!isEditing && !!(message.text || "").trim() && <RichEmbeds text={message.text} />}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-all",
                  r.reacted_by_me
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-background border-border text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
                onClick={() => onToggleReaction?.(r.emoji, r.reacted_by_me)}
              >
                <span className="text-sm leading-none">{r.emoji}</span>
                <span className="font-semibold">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {replies > 0 && (
          <button
            type="button"
            onClick={onOpenThread}
            className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline underline-offset-2"
          >
            <MessageSquare size={12} />
            {replies} {replies === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* ── Hover action toolbar ── */}
      {!message.pending && !message.failed && (
        <div className="absolute right-3 top-0 hidden group-hover:flex items-center gap-px bg-card border border-border rounded-lg shadow-sm p-0.5 z-20">
          {/* Emoji picker toggle */}
          <ActionBtn label="React" onClick={() => setPickerOpen((v) => !v)}>
            <Smile size={15} />
          </ActionBtn>
          <ActionBtn label="Reply in thread" onClick={onReply}>
            <MessageSquare size={15} />
          </ActionBtn>
          {isOwn && (
            <>
              <ActionBtn label="Edit" onClick={(e) => { e.stopPropagation(); onStartEdit?.(); }}>
                <Edit2 size={15} />
              </ActionBtn>
              <ActionBtn label="Delete" onClick={(e) => { e.stopPropagation(); onDelete?.(); }} danger>
                <Trash2 size={15} />
              </ActionBtn>
            </>
          )}
          {/* More actions — inline menu anchored to the button, no portal */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="More actions"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <MoreHorizontal size={15} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-border bg-popover shadow-md py-1">
                {message.is_edited && onViewEditHistory && (
                  <MoreItem onClick={() => { onViewEditHistory(); setMoreOpen(false); }}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit history
                  </MoreItem>
                )}
                {onMarkUnread && (
                  <MoreItem onClick={() => { onMarkUnread(); setMoreOpen(false); }}>
                    <MessageSquare className="h-3.5 w-3.5" /> Mark unread
                  </MoreItem>
                )}
                {onToggleSave && (
                  <MoreItem onClick={() => { onToggleSave(); setMoreOpen(false); }}>
                    <Star className="h-3.5 w-3.5" /> {isSaved ? "Unsave" : "Save"}
                  </MoreItem>
                )}
                {onTogglePin && (
                  <MoreItem onClick={() => { onTogglePin(); setMoreOpen(false); }}>
                    <Pin className="h-3.5 w-3.5" /> {isPinned ? "Unpin" : "Pin"}
                  </MoreItem>
                )}
                {onCopyLink && (
                  <MoreItem onClick={() => { onCopyLink(); setMoreOpen(false); }}>
                    <LinkIcon className="h-3.5 w-3.5" /> Copy link
                  </MoreItem>
                )}
                {onQuoteReply && (
                  <MoreItem onClick={() => { onQuoteReply(); setMoreOpen(false); }}>
                    <MessageSquare className="h-3.5 w-3.5" /> Quote reply
                  </MoreItem>
                )}
                {onForward && (
                  <MoreItem onClick={() => { onForward(); setMoreOpen(false); }}>
                    <Send className="h-3.5 w-3.5" /> Forward
                  </MoreItem>
                )}
                {canModerate && !isOwn && onDelete && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <MoreItem onClick={() => { onDelete(); setMoreOpen(false); }} danger>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </MoreItem>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Full emoji picker for reactions ── */}
      {pickerOpen && (
        <div className="absolute right-3 top-9 z-30">
          <div className="flex flex-col gap-1">
            {/* Quick reactions row */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card shadow-lg p-1.5">
              {QUICK_REACTIONS.map((emoji) => {
                const mine = !!message.reactions?.find((r) => r.emoji === emoji)?.reacted_by_me;
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-[18px] hover:bg-muted transition-colors",
                      mine && "bg-primary/10"
                    )}
                    onClick={() => { onToggleReaction?.(emoji, mine); setPickerOpen(false); }}
                  >
                    {emoji}
                  </button>
                );
              })}
              <div className="mx-1 h-5 w-px bg-border" />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    title="More reactions"
                  >
                    <ChevronDown size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" side="bottom">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      const mine = !!message.reactions?.find((r) => r.emoji === emoji)?.reacted_by_me;
                      onToggleReaction?.(emoji, mine);
                      setPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared action button ──────────────────────────────── */
function ActionBtn({
  children, label, onClick, danger,
}: {
  children: ReactNode; label: string; onClick?: React.MouseEventHandler; danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ── Inline menu item ──────────────────────────────────── */
function MoreItem({
  children, onClick, danger,
}: {
  children: ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-[13px] transition-colors text-left",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-popover-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
