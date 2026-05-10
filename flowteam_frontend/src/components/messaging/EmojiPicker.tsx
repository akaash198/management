"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Fitzpatrick skin tone modifier codepoints
const SKIN_TONES = [
  { label: "Default", modifier: "" },
  { label: "Light", modifier: "\u{1F3FB}" },
  { label: "Medium-Light", modifier: "\u{1F3FC}" },
  { label: "Medium", modifier: "\u{1F3FD}" },
  { label: "Medium-Dark", modifier: "\u{1F3FE}" },
  { label: "Dark", modifier: "\u{1F3FF}" },
] as const;

// Emojis that support skin tone modifiers (people/hand emojis)
const SKIN_TONE_CAPABLE = new Set([
  "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉",
  "👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🙏",
  "✍️","💅","🤳","💪","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵",
  "🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","👮","🦸","🦹","🧙","🧝",
  "🧑‍⚕️","🤶","🎅","👼","🤺","⛷️","🏂","🏄","🚣","🧗","🚵","🚴","🏋️","⛹️","🏇",
  "🦵","🦶","👂","👃","🤳","💆","💇","🚶","🧍","🧎","🏃","🤸","🏌️","🏄","🤽",
]);

/* Full emoji dataset organized by category */
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘",
      "😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥",
      "😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔",
      "😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨",
      "😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬","😷",
      "🤒","🤕","🤢","🤮","🤧","😇","🥳","🥺","🤠","🤡","🤥","🤫","🤭","🧐","🤓",
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝",
      "🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁",
      "🦷","🦴","👀","👁️","👅","👄","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩",
      "🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","👮","🦸",
      "🦹","🧙","🧝","🧛","🧟","🧞","🧜","🧚","👼","🤶","🎅","🧑‍🎄","🦸","🦹","🧑‍⚕️",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
      "🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄",
      "🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕",
      "🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆",
      "🌸","🌺","🌻","🌼","🌷","🌱","🌲","🌳","🌴","🌵","🌾","🍀","🍁","🍂","🍃",
      "🍄","🌰","🦔","🐾","🌍","🌎","🌏","🌕","⭐","🌟","💫","✨","☀️","🌈","⛈️",
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍",
      "🥥","🥝","🍅","🍆","🥑","🫒","🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔",
      "🍠","🧆","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟",
      "🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍛","🍣",
      "🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭",
      "🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","☕","🫖","🍵","🧋","🍶","🍺","🥂",
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️",
      "🛵","🚲","🛴","🛺","🚁","🛸","🚀","✈️","🛩️","🛫","🛬","🚂","🚃","🚄","🚅",
      "⛵","🛥️","🛳️","⛴️","🚢","⚓","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️",
      "🏝️","🏞️","🏟️","🏛️","🏗️","🏘️","🏚️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨",
      "🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩️",
      "🕋","🏙️","🌃","🌆","🌇","🌉","🌌","🎠","🎡","🎢","💈","🎪","🛎️","🛏️","🛋️",
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍",
      "🏏","🥅","⛳","🏹","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🪃","🏋️","⛹️","🤺",
      "🏇","⛷️","🏂","🪂","🏄","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️",
      "🎗️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🎷","🎺",
      "🎸","🪕","🎻","🪗","🥁","🪘","🎲","♟️","🎭","🎨","🧩","🎮","🕹️","🎰","🎳",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀","📼","📷","📸",
      "📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏰","⏲️","🕰️",
      "💡","🔦","🕯️","🪔","🧱","💈","🔭","🔬","🩺","💊","🩹","🩻","🩼","🦯","🔧",
      "🔨","⚒️","🛠️","🪛","🔩","⚙️","🪤","🗜️","⚖️","🔗","⛓️","🪝","🧲","🪜","🧰",
      "🪣","🧲","💰","💴","💵","💶","💷","💸","💳","🧾","📈","📉","📊","📋","📌",
      "📍","📎","🖇️","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔏","🔐","🔑","🗝️","🔨","⛏️",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗",
      "💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐",
      "♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","⛎","🔀","🔁","🔂",
      "▶️","⏩","⏭️","⏯️","◀️","⏪","⏮️","🔼","⏫","🔽","⏬","⏸️","⏹️","⏺️","🎦",
      "🔅","🔆","📶","📳","📴","📵","📳","🔇","🔈","🔉","🔊","📢","📣","📯","🔔",
      "🔕","🎵","🎶","✅","❎","🔱","⚜️","🏁","🚩","🎌","🏴","🏳️","💯","🔚","🔛",
    ],
  },
] as const;

type EmojiCategory = typeof EMOJI_CATEGORIES[number];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>(EMOJI_CATEGORIES[0].id);
  const [skinTone, setSkinTone] = useState<string>("");
  const [skinToneOpen, setSkinToneOpen] = useState(false);

  const applyTone = (emoji: string): string => {
    if (!skinTone || !SKIN_TONE_CAPABLE.has(emoji)) return emoji;
    // Insert modifier after the base emoji character (before any ZWJ or VS-16)
    const codePoints = [...emoji];
    return codePoints[0] + skinTone + codePoints.slice(1).join("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const results: string[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const emoji of cat.emojis) {
        if (results.length >= 60) break;
        results.push(emoji);
      }
    }
    return results;
  }, [search]);

  const currentEmojis = filtered ?? (EMOJI_CATEGORIES.find((c) => c.id === activeCat)?.emojis ?? []);
  const currentToneLabel = SKIN_TONES.find((t) => t.modifier === skinTone)?.label ?? "Default";

  return (
    <div className={cn("flex h-[340px] w-[320px] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl", className)}>
      {/* Search + skin tone row */}
      <div className="shrink-0 border-b border-border p-2 flex gap-1.5 items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji…"
          className="h-8 text-[12px] flex-1"
          autoFocus
        />
        {/* Skin tone selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSkinToneOpen((o) => !o)}
            title={`Skin tone: ${currentToneLabel}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted/60 transition-colors text-base"
          >
            {skinTone ? `✋${skinTone}` : "✋"}
          </button>
          {skinToneOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.label}
                  type="button"
                  title={tone.label}
                  onClick={() => {
                    setSkinTone(tone.modifier);
                    setSkinToneOpen(false);
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted/60",
                    skinTone === tone.modifier && "ring-2 ring-primary"
                  )}
                >
                  {tone.modifier ? `✋${tone.modifier}` : "✋"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5 scrollbar-none">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCat(cat.id)}
              title={cat.label}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base transition-colors",
                activeCat === cat.id ? "bg-primary/15" : "hover:bg-muted/60"
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!search && (
        <div className="shrink-0 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {EMOJI_CATEGORIES.find((c) => c.id === activeCat)?.label}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {(currentEmojis as readonly string[]).length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            No results
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {(currentEmojis as readonly string[]).map((emoji, i) => {
              const display = applyTone(emoji);
              return (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => onSelect(display)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-muted/60 transition-colors"
                  title={display}
                >
                  {display}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
