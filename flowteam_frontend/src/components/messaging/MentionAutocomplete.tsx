"use client";

import { useCallback, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, TeamMember } from "@/types";

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: string[]) => void;
  teamId: string;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

type MentionSuggestion =
  | { kind: "user"; member: TeamMember }
  | { kind: "emoji"; shortcode: string; emoji: string };

const EMOJI_SHORTCODES: Array<{ shortcode: string; emoji: string }> = [
  { shortcode: "smile", emoji: "😄" },
  { shortcode: "laugh", emoji: "😂" },
  { shortcode: "thumbsup", emoji: "👍" },
  { shortcode: "heart", emoji: "❤️" },
  { shortcode: "fire", emoji: "🔥" },
  { shortcode: "rocket", emoji: "🚀" },
  { shortcode: "party", emoji: "🎉" },
  { shortcode: "eyes", emoji: "👀" },
  { shortcode: "check", emoji: "✅" },
  { shortcode: "wave", emoji: "👋" },
  { shortcode: "partyparrot", emoji: "🦜" },
  { shortcode: "shipit", emoji: "🚢" },
];

export function MentionAutocomplete({ 
  value, 
  onChange, 
  onMentionsChange, 
  teamId, 
  placeholder,
  className,
  onSubmit,
  inputRef,
  onPaste,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const effectiveRef = inputRef ?? textareaRef;
  const [allMembers, setAllMembers] = useState<TeamMember[] | null>(null);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    if (!teamId) return [];
    if (loadedTeamId === teamId && allMembers) return allMembers;

    const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members/`);
    const members = res.data.data ?? [];
    setAllMembers(members);
    setLoadedTeamId(teamId);
    return members;
  }, [allMembers, loadedTeamId, teamId]);

  const computeSuggestions = useCallback(
    async (search: string) => {
      if (!teamId) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const members = await loadTeamMembers();
      const q = search.trim().toLowerCase();
      const filtered = q
        ? members.filter((m) => {
            const name = (m.user.full_name ?? "").toLowerCase();
            const email = (m.user.email ?? "").toLowerCase();
            return name.includes(q) || email.includes(q);
          })
        : members;

      const top = filtered.slice(0, 6).map((member) => ({ kind: "user", member } as MentionSuggestion));
      setSuggestions(top);
      setSelectedIndex(0);
      setShowSuggestions(top.length > 0);
    },
    [loadTeamMembers, teamId]
  );

  const computeEmojiSuggestions = useCallback((search: string) => {
    const q = search.trim().toLowerCase();
    const top = EMOJI_SHORTCODES
      .filter((item) => !q || item.shortcode.includes(q))
      .slice(0, 8)
      .map((item) => ({ kind: "emoji", shortcode: item.shortcode, emoji: item.emoji } as MentionSuggestion));
    setSuggestions(top);
    setSelectedIndex(0);
    setShowSuggestions(top.length > 0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Avoid interfering with IME composition (e.g. Japanese/Chinese input)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isComposing = (e.nativeEvent as any)?.isComposing;
    if (isComposing) return;

    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (!selected) return;
        if (selected.kind === "user") insertMention(selected.member);
        else insertEmoji(selected);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
      return;
    }

    // When suggestions are not open: Enter sends, Shift+Enter inserts newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const insertMention = (member: TeamMember) => {
    const email = member.user.email ?? "";
    const prefix = email.split("@")[0]?.replace(/[^\w.-]/g, "") || (member.user.full_name ?? "").split(" ")[0] || "user";
    const textBefore = value.substring(0, cursorPos - query.length - 1);
    const textAfter = value.substring(cursorPos);
    const newValue = `${textBefore}@${prefix} ${textAfter}`;
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after the mention
    setTimeout(() => {
      effectiveRef.current?.focus();
      const newPos = textBefore.length + prefix.length + 2;
      effectiveRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertEmoji = (item: { shortcode: string; emoji: string }) => {
    const textBefore = value.substring(0, cursorPos - query.length - 1);
    const textAfter = value.substring(cursorPos);
    const newValue = `${textBefore}${item.emoji} ${textAfter}`;
    onChange(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      effectiveRef.current?.focus();
      const newPos = textBefore.length + item.emoji.length + 1;
      effectiveRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const pos = e.target.selectionStart;
    onChange(newVal);
    onMentionsChange?.(
      Array.from(new Set((newVal.match(/@[\w.-]+/g) ?? []).map((item) => item.slice(1))))
    );
    setCursorPos(pos);

    const textBefore = newVal.substring(0, pos);
    const match = textBefore.match(/@(\w*)$/);
    const emojiMatch = textBefore.match(/:([\w+-]*)$/);

    if (match) {
      const q = match[1];
      setQuery(q);
      void computeSuggestions(q);
    } else if (emojiMatch) {
      const q = emojiMatch[1] ?? "";
      setQuery(q);
      computeEmojiSuggestions(q);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <Textarea 
        ref={effectiveRef as unknown as React.Ref<HTMLTextAreaElement>}
        value={value}
        onChange={onTextChange}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        className={cn("min-h-[80px]", className)}
      />

      {showSuggestions && (
        <div className="absolute bottom-full mb-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Mention Teammate
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((m, i) => (
              <div 
                key={m.kind === "user" ? m.member.user.id : `emoji:${m.shortcode}`}
                onClick={() => (m.kind === "user" ? insertMention(m.member) : insertEmoji(m))}
                className={cn(
                  "flex items-center gap-3 p-2 cursor-pointer transition-colors",
                  i === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"
                )}
              >
                {m.kind === "user" ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.member.user.avatar_url || ""} />
                      <AvatarFallback className={cn(i === selectedIndex ? "text-primary" : "")}>
                        {m.member.user.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{m.member.user.full_name}</span>
                      <span
                        className={cn(
                          "text-[10px] truncate",
                          i === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {m.member.user.email}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-6 rounded bg-background/70 flex items-center justify-center text-sm">
                      {m.emoji}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">:{m.shortcode}:</span>
                      <span
                        className={cn(
                          "text-[10px] truncate",
                          i === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        Emoji shortcut
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
