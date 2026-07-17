import { Link2, MapPin, Repeat } from "lucide-react";
import type { RenderEvent } from "@/lib/types";
import {
  CATEGORY_META,
  eventColorValue,
  formatRange,
} from "@/lib/calendarUtils";

export interface HoverAnchor {
  occ: RenderEvent;
  /** Viewport rect of the hovered bar. */
  left: number;
  top: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 288; // w-72
const MARGIN = 8;

/**
 * Read-only details card shown while hovering an event bar — surfaces notes,
 * location, and link without opening the edit dialog. Position is fixed and
 * clamped to the viewport; it flips below the bar when there's no room above.
 */
export function EventHoverCard({
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  anchor: HoverAnchor;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { occ } = anchor;
  const centerX = anchor.left + anchor.width / 2;
  const left = Math.min(
    Math.max(MARGIN, centerX - CARD_WIDTH / 2),
    window.innerWidth - CARD_WIDTH - MARGIN,
  );
  const above = anchor.top > 180;

  const style: React.CSSProperties = {
    left,
    width: CARD_WIDTH,
    ...(above
      ? { bottom: window.innerHeight - anchor.top + 6 }
      : { top: anchor.top + anchor.height + 6 }),
  };

  return (
    <div
      className="fixed z-50 animate-fade-in rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg print:hidden"
      style={style}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: eventColorValue(occ.color) }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {occ.emoji && <span className="mr-1">{occ.emoji}</span>}
            {occ.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {formatRange(occ.startDate, occ.endDate)}
            {occ.isRecurring && <Repeat className="h-3 w-3" />}
            <span aria-hidden>·</span>
            {CATEGORY_META[occ.category].label}
          </p>
        </div>
      </div>

      {occ.notes && (
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
          {occ.notes}
        </p>
      )}

      {(occ.location || occ.url) && (
        <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
          {occ.location && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{occ.location}</span>
            </p>
          )}
          {occ.url && (
            <a
              href={occ.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{occ.url}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
