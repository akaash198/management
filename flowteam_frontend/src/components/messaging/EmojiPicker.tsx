"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("flex h-[320px] w-[320px] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl", className)}>
      {/* Search */}
      <div className="shrink-0 border-b border-border p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji…"
          className="h-8 text-[12px]"
          autoFocus
        />
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
            {(currentEmojis as readonly string[]).map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onClick={() => onSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-muted/60 transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
