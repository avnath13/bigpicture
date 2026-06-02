import { useState } from "react";
import { Smile, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
}

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Common",
    emojis: ["🎉", "🚀", "⭐", "🔥", "💡", "✅", "📌", "🎯", "💬", "📝"],
  },
  {
    label: "Life",
    emojis: ["🎂", "💛", "🎄", "🏖️", "✈️", "🚗", "🏠", "🍽️", "☕", "🎁"],
  },
  {
    label: "Work",
    emojis: ["💼", "📦", "🧾", "💸", "📊", "🧪", "🎤", "📞", "🛠️", "🗓️"],
  },
  {
    label: "Health",
    emojis: ["🏃", "💪", "🧘", "🩺", "💊", "🥗", "😴", "🚴", "⚽", "🏆"],
  },
];

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose emoji"
          className={cn(
            "flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg shadow-sm transition-colors hover:bg-accent",
            !value && "text-muted-foreground",
          )}
        >
          {value ?? <Smile className="h-4 w-4" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            Pick an emoji
          </span>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <div className="max-h-56 space-y-3 overflow-y-auto">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-5 gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-lg transition-transform hover:scale-110 hover:bg-accent",
                      value === emoji && "bg-accent ring-1 ring-primary",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
