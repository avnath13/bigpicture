import { Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/lib/types";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/calendarUtils";

interface CategoryFilterProps {
  active: Set<EventCategory>;
  onToggle: (category: EventCategory) => void;
}

export function CategoryFilter({ active, onToggle }: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter events by category"
      className="flex flex-wrap items-center gap-2"
    >
      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category];
        const isActive = active.has(category);
        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (isActive && active.size === 1) {
                toast.info("At least one category must stay active");
                return;
              }
              onToggle(category);
            }}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
              isActive
                ? "border-border bg-secondary text-secondary-foreground shadow-sm"
                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
          >
            <Tag
              className={cn(
                "h-3 w-3 transition-opacity",
                isActive ? "opacity-70" : "opacity-40",
              )}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
