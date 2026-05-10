"use client";

import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Link2, Minus,
} from "lucide-react";
import type { RefObject } from "react";

interface FormatToolbarProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

type WrapMode = "inline" | "block" | "list" | "orderedList" | "hr" | "link";

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  mode: WrapMode,
  marker: string,
  endMarker?: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  if (mode === "inline") {
    const close = endMarker ?? marker;
    const toggled = before + marker + selected + close + after;
    onChange(toggled);
    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + marker.length;
      const newEnd = end + marker.length;
      textarea.setSelectionRange(newStart, newEnd);
    });
    return;
  }

  if (mode === "block") {
    // Add prefix to each selected line
    const lines = selected.split("\n");
    const already = lines.every((l) => l.startsWith(marker));
    const next = already
      ? lines.map((l) => l.slice(marker.length)).join("\n")
      : lines.map((l) => `${marker}${l}`).join("\n");
    const toggled = before + next + after;
    onChange(toggled);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + next.length);
    });
    return;
  }

  if (mode === "list") {
    const lines = selected ? selected.split("\n") : [""];
    const already = lines.every((l) => l.startsWith("• "));
    const next = already
      ? lines.map((l) => l.replace(/^• /, "")).join("\n")
      : lines.map((l) => `• ${l}`).join("\n");
    const toggled = before + next + after;
    onChange(toggled);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + next.length);
    });
    return;
  }

  if (mode === "orderedList") {
    const lines = selected ? selected.split("\n") : [""];
    const already = lines.every((l, i) => l.startsWith(`${i + 1}. `));
    const next = already
      ? lines.map((l, i) => l.replace(new RegExp(`^${i + 1}\\. `), "")).join("\n")
      : lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
    const toggled = before + next + after;
    onChange(toggled);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + next.length);
    });
    return;
  }

  if (mode === "hr") {
    const insert = `\n---\n`;
    onChange(before + insert + after);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + insert.length;
      textarea.setSelectionRange(pos, pos);
    });
    return;
  }

  if (mode === "link") {
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const text = selected || url;
    const insert = `[${text}](${url})`;
    onChange(before + insert + after);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + insert.length;
      textarea.setSelectionRange(pos, pos);
    });
    return;
  }
}

interface ToolBtnProps {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

function ToolBtn({ label, children, onClick, active }: ToolBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent textarea blur
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

export function FormatToolbar({ value, onChange, textareaRef, className }: FormatToolbarProps) {
  const wrap = (mode: WrapMode, marker: string, end?: string) => {
    const el = textareaRef.current;
    if (!el) return;
    wrapSelection(el, value, onChange, mode, marker, end);
  };

  return (
    <div className={cn("flex items-center gap-0.5 px-2 py-1", className)}>
      <ToolBtn label="Bold (Ctrl+B)" onClick={() => wrap("inline", "**")}>
        <Bold size={13} />
      </ToolBtn>
      <ToolBtn label="Italic (Ctrl+I)" onClick={() => wrap("inline", "_")}>
        <Italic size={13} />
      </ToolBtn>
      <ToolBtn label="Strikethrough" onClick={() => wrap("inline", "~~")}>
        <Strikethrough size={13} />
      </ToolBtn>
      <ToolBtn label="Inline code" onClick={() => wrap("inline", "`")}>
        <Code size={13} />
      </ToolBtn>

      <Divider />

      <ToolBtn label="Bullet list" onClick={() => wrap("list", "• ")}>
        <List size={13} />
      </ToolBtn>
      <ToolBtn label="Numbered list" onClick={() => wrap("orderedList", "")}>
        <ListOrdered size={13} />
      </ToolBtn>
      <ToolBtn label="Blockquote" onClick={() => wrap("block", "> ")}>
        <Quote size={13} />
      </ToolBtn>

      <Divider />

      <ToolBtn label="Add link" onClick={() => wrap("link", "")}>
        <Link2 size={13} />
      </ToolBtn>
      <ToolBtn label="Horizontal rule" onClick={() => wrap("hr", "")}>
        <Minus size={13} />
      </ToolBtn>
    </div>
  );
}
