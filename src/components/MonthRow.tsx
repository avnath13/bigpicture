import { useMemo } from "react";
import { addDays, addMonths, format, getDay } from "date-fns";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayOptions, RenderEvent } from "@/lib/types";
import {
  eventColorValue,
  getDaysInMonth,
  isDayOff,
  isoWeek,
  isPastEvent,
  isToday,
  layoutMonthEvents,
  leadingOffset,
  toISO,
  toneForMonth,
} from "@/lib/calendarUtils";

/** Move keyboard focus to another day cell, if it exists in the grid. */
function focusCell(date: Date) {
  document
    .querySelector<HTMLElement>(`[data-date="${toISO(date)}"]`)
    ?.focus();
}

/** Fallback cell width before the container has been measured. */
export const CELL_WIDTH = 44;
const BAR_HEIGHT = 14;
const BAR_GAP = 3;
const OVERFLOW_PAD = 8;
const DENSITY_BASE: Record<string, number> = {
  compact: 56,
  cozy: 72,
  spacious: 92,
};

interface MonthRowProps {
  monthStart: Date;
  monthIndex: number;
  events: RenderEvent[];
  options: DisplayOptions;
  cellWidth: number;
  totalColumns: number;
  todayIso: string;
  /** The one cell that participates in the tab order (roving tabindex). */
  focusIso: string;
  /** ISO date → public holiday name. */
  holidays: Record<string, string>;
  onDayClick: (iso: string) => void;
  onBarPointerDown: (
    e: React.MouseEvent,
    event: RenderEvent,
    kind: "move" | "resize-start" | "resize-end",
  ) => void;
  onBarHover: (event: RenderEvent, element: HTMLElement) => void;
  onBarHoverEnd: () => void;
  startDrag: (iso: string) => void;
  extendDrag: (iso: string) => void;
  isInRange: (iso: string) => boolean;
  isDragging: boolean;
}

export function MonthRow({
  monthStart,
  monthIndex,
  events,
  options,
  cellWidth,
  totalColumns,
  todayIso,
  focusIso,
  holidays,
  onDayClick,
  onBarPointerDown,
  onBarHover,
  onBarHoverEnd,
  startDrag,
  extendDrag,
  isInRange,
  isDragging,
}: MonthRowProps) {
  const maxLanes = options.stampsPerDay;
  const days = useMemo(() => getDaysInMonth(monthStart), [monthStart]);
  const { bars, overflow } = useMemo(
    () => layoutMonthEvents(monthStart, events, maxLanes),
    [monthStart, events, maxLanes],
  );

  const offset =
    options.layout === "fixed-week"
      ? leadingOffset(monthStart, options.weekStart)
      : 0;
  const tone = toneForMonth(monthIndex, options.colorTone);

  const laneTop = options.lanePosition === "top";
  // Vertical space the date label occupies (number + optional weekday letters).
  const labelBlock = options.showWeekdayLetters ? 26 : 17;
  const laneBlock = maxLanes * (BAR_HEIGHT + BAR_GAP);
  const cellHeight = Math.max(
    DENSITY_BASE[options.density],
    labelBlock + laneBlock + OVERFLOW_PAD,
  );
  // Bottom lane starts just below the label; top lane starts at the top edge.
  const barAreaTop = laneTop ? 5 : labelBlock + 3;
  const colX = (col: number) => (col + offset) * cellWidth;

  const quarterDivider =
    options.quarterDividers && monthIndex > 0 && monthIndex % 3 === 0;

  return (
    <section
      data-month={monthIndex}
      className={cn(
        "flex animate-fade-in-up opacity-0",
        quarterDivider && "border-t-2 border-border",
      )}
      style={{ animationDelay: `${150 + monthIndex * 50}ms` }}
      aria-label={format(monthStart, "MMMM yyyy")}
    >
      <div className="sticky left-0 z-20 flex w-14 shrink-0 items-center justify-center border-r border-border/60 bg-background/95 backdrop-blur">
        <h2
          className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {format(monthStart, "MMM")}
        </h2>
      </div>

      <div
        className="relative border-b border-border/50"
        style={{ width: totalColumns * cellWidth, height: cellHeight }}
      >
        {tone && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundColor: tone }}
          />
        )}

        {/* leading offset spacers (fixed-week) */}
        {Array.from({ length: offset }).map((_, i) => (
          <div
            key={`pad-${i}`}
            aria-hidden
            className="absolute top-0 border-r border-border/30 bg-muted/20"
            style={{ left: i * cellWidth, width: cellWidth, height: cellHeight }}
          />
        ))}

        {days.map((day) => {
          const iso = toISO(day);
          const col = day.getDate() - 1;
          const dayOff = isDayOff(day, options.daysOff);
          const holiday = holidays[iso];
          const today = isToday(day);
          const inRange = isInRange(iso);
          const isPast = options.showPast && iso < todayIso;
          const isMonday = getDay(day) === 1;
          return (
            <div
              key={iso}
              data-date={iso}
              role="button"
              tabIndex={iso === focusIso ? 0 : -1}
              title={holiday}
              aria-label={
                holiday
                  ? `${format(day, "EEEE, MMMM d")} — ${holiday}`
                  : format(day, "EEEE, MMMM d")
              }
              className={cn(
                "calendar-cell absolute top-0 cursor-pointer hover:bg-accent/40",
                "outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                laneTop ? "justify-end pb-1" : "justify-start pt-1",
                dayOff && "calendar-cell-weekend",
                holiday && "calendar-cell-holiday",
                today && "calendar-cell-today today-pulse",
                inRange && "z-10 bg-primary/20 ring-1 ring-inset ring-primary",
              )}
              style={{ left: colX(col), width: cellWidth, height: cellHeight }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                startDrag(iso);
              }}
              onMouseEnter={() => {
                if (isDragging) extendDrag(iso);
              }}
              onClick={() => onDayClick(iso)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(iso);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  focusCell(addDays(day, -1));
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  focusCell(addDays(day, 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  focusCell(addMonths(day, -1));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  focusCell(addMonths(day, 1));
                }
              }}
            >
              {options.showWeekNumbers && isMonday && (
                <span className="absolute left-0.5 top-0.5 rounded-sm bg-muted px-1 text-[8px] font-medium leading-tight text-muted-foreground/80">
                  {isoWeek(day)}
                </span>
              )}
              {holiday && (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "hsl(var(--event-coral))" }}
                />
              )}
              <span
                className={cn(
                  "text-[11px] tabular-nums leading-none",
                  today
                    ? "font-semibold text-primary"
                    : "font-medium text-foreground/80",
                  isPast && "opacity-40",
                )}
              >
                {format(day, "d")}
              </span>
              {options.showWeekdayLetters && (
                <span
                  className={cn(
                    "mt-1 text-[8px] font-medium uppercase tracking-tight leading-none text-muted-foreground/60",
                    isPast && "opacity-40",
                  )}
                >
                  {format(day, "EEEEEE")}
                </span>
              )}
            </div>
          );
        })}

        {bars.map(({ event, startCol, span, lane }) => {
          const dimmed = options.showPast && isPastEvent(event);
          const colored = options.categoryColors;
          return (
            <button
              key={event.id}
              type="button"
              className={cn(
                "event-bar",
                !colored && "text-foreground ring-1 ring-border",
                dimmed && "opacity-40 saturate-50",
              )}
              style={{
                left: colX(startCol) + 2,
                width: span * cellWidth - 4,
                top: barAreaTop + lane * (BAR_HEIGHT + BAR_GAP),
                height: BAR_HEIGHT,
                backgroundColor: colored
                  ? eventColorValue(event.color)
                  : "hsl(var(--secondary))",
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                onBarPointerDown(e, event, "move");
              }}
              onMouseEnter={(e) => onBarHover(event, e.currentTarget)}
              onMouseLeave={onBarHoverEnd}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize rounded-l-md opacity-0 transition-opacity hover:bg-foreground/25 hover:opacity-100"
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  onBarPointerDown(e, event, "resize-start");
                }}
              />
              {!colored && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: eventColorValue(event.color) }}
                />
              )}
              {options.showEmojis && event.emoji && (
                <span className="shrink-0 text-[11px] leading-none">
                  {event.emoji}
                </span>
              )}
              {event.isRecurring && (
                <Repeat className="h-2.5 w-2.5 shrink-0 opacity-90" />
              )}
              <span className="truncate">{event.title}</span>
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize rounded-r-md opacity-0 transition-opacity hover:bg-foreground/25 hover:opacity-100"
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  onBarPointerDown(e, event, "resize-end");
                }}
              />
            </button>
          );
        })}

        {Object.entries(overflow).map(([col, count]) => (
          <span
            key={`ov-${col}`}
            className="pointer-events-none absolute text-[8px] font-semibold text-muted-foreground"
            style={{
              left: colX(Number(col)) + 3,
              top: barAreaTop + maxLanes * (BAR_HEIGHT + BAR_GAP),
            }}
          >
            +{count}
          </span>
        ))}
      </div>
    </section>
  );
}
