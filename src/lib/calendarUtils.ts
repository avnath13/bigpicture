import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  getISOWeek,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfYear,
} from "date-fns";
import type {
  CalendarEvent,
  ColorTone,
  DisplayOptions,
  EventCategory,
  EventColor,
  RecurrenceFreq,
  RenderEvent,
  Weekday,
  WeekStart,
} from "./types";

export const EVENT_COLORS: EventColor[] = [
  "teal",
  "coral",
  "amber",
  "violet",
  "emerald",
  "rose",
  "sky",
  "orange",
  "slate",
];

export const EVENT_COLOR_META: Record<
  EventColor,
  { label: string; token: string }
> = {
  teal: { label: "Teal", token: "var(--event-teal)" },
  coral: { label: "Coral", token: "var(--event-coral)" },
  amber: { label: "Amber", token: "var(--event-amber)" },
  violet: { label: "Violet", token: "var(--event-violet)" },
  emerald: { label: "Emerald", token: "var(--event-emerald)" },
  rose: { label: "Rose", token: "var(--event-rose)" },
  sky: { label: "Sky", token: "var(--event-sky)" },
  orange: { label: "Orange", token: "var(--event-orange)" },
  slate: { label: "Slate", token: "var(--event-slate)" },
};

export const CATEGORY_ORDER: EventCategory[] = [
  "work",
  "project",
  "deadline",
  "personal",
  "travel",
  "health",
  "other",
];

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; defaultColor: EventColor }
> = {
  work: { label: "Work", defaultColor: "sky" },
  project: { label: "Project", defaultColor: "violet" },
  deadline: { label: "Deadline", defaultColor: "coral" },
  personal: { label: "Personal", defaultColor: "emerald" },
  travel: { label: "Travel", defaultColor: "amber" },
  health: { label: "Health", defaultColor: "rose" },
  other: { label: "Other", defaultColor: "slate" },
};

/** Returns a CSS hsl() string for an event color token. */
export function eventColorValue(color: EventColor): string {
  return `hsl(${EVENT_COLOR_META[color].token})`;
}

export function createId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const ISO = "yyyy-MM-dd";

export function toISO(date: Date): string {
  return format(date, ISO);
}

export function fromISO(iso: string): Date {
  return parseISO(iso);
}

export function getMonthsForYear(year: number): Date[] {
  const start = startOfYear(new Date(year, 0, 1));
  return Array.from({ length: 12 }, (_, i) => startOfMonth(addMonthsLocal(start, i)));
}

function addMonthsLocal(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getDaysInMonth(monthStart: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(monthStart),
    end: endOfMonth(monthStart),
  });
}

// ----- display option helpers -----

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  layout: "date-grid",
  weekStart: 0,
  density: "cozy",
  daysOff: [0, 6],
  colorTone: "none",
  quarterDividers: false,
  showPast: true,
  showWeekdayLetters: true,
  showWeekNumbers: false,
  categoryColors: true,
  showEmojis: true,
  stampsPerDay: 2,
  lanePosition: "bottom",
};

/** Short weekday labels in display order for a given week start. */
export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function isDayOff(date: Date, daysOff: Weekday[]): boolean {
  return daysOff.includes(getDay(date) as Weekday);
}

/** Columns the first of the month is shifted right in fixed-week layout (0–6). */
export function leadingOffset(monthStart: Date, weekStart: WeekStart): number {
  return (getDay(startOfMonth(monthStart)) - weekStart + 7) % 7;
}

export function isoWeek(date: Date): number {
  return getISOWeek(date);
}

const QUARTER_TONE_TOKENS = [
  "--event-teal",
  "--event-violet",
  "--event-amber",
  "--event-emerald",
];

const MONTHLY_TONE_TOKENS = [
  "--event-teal",
  "--event-sky",
  "--event-violet",
  "--event-rose",
  "--event-amber",
  "--event-emerald",
  "--event-coral",
  "--event-orange",
  "--event-slate",
  "--event-teal",
  "--event-sky",
  "--event-violet",
];

/** Background tint for a month row (0-based index), or undefined for none. */
export function toneForMonth(
  monthIndex: number,
  tone: ColorTone,
): string | undefined {
  switch (tone) {
    case "none":
      return undefined;
    case "subtle":
      return monthIndex % 2 === 1 ? "hsl(var(--foreground) / 0.04)" : undefined;
    case "quarter":
      return `hsl(var(${QUARTER_TONE_TOKENS[Math.floor(monthIndex / 3)]}) / 0.08)`;
    case "monthly":
      return `hsl(var(${MONTHLY_TONE_TOKENS[monthIndex % 12]}) / 0.08)`;
  }
}

export function isToday(date: Date): boolean {
  return toISO(date) === toISO(startOfToday());
}

export function isPastEvent(event: { endDate: string }): boolean {
  return differenceInCalendarDays(startOfToday(), fromISO(event.endDate)) > 0;
}

export const RECURRENCE_UNIT: Record<RecurrenceFreq, [string, string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
  yearly: ["year", "years"],
};

/** Date of the nth (0-based) occurrence's start. */
function occurrenceStart(start: Date, freq: RecurrenceFreq, interval: number, n: number): Date {
  switch (freq) {
    case "daily":
      return addDays(start, n * interval);
    case "weekly":
      return addWeeks(start, n * interval);
    case "monthly":
      return addMonths(start, n * interval);
    case "yearly":
      return addYears(start, n * interval);
  }
}

/**
 * A lower-bound occurrence index whose start could still overlap `rangeStart`,
 * so we can skip iterating from the very first occurrence for long-running series.
 * Intentionally conservative (may be a couple steps early) to absorb month-length
 * variance; the caller clamps to >= 0 and re-checks every candidate.
 */
function lowerBoundIndex(
  start: Date,
  freq: RecurrenceFreq,
  interval: number,
  durationDays: number,
  rangeStart: Date,
): number {
  switch (freq) {
    case "daily": {
      const gap = differenceInCalendarDays(rangeStart, start) - durationDays;
      return Math.floor(gap / interval) - 1;
    }
    case "weekly": {
      const gap = differenceInCalendarDays(rangeStart, start) - durationDays;
      return Math.floor(gap / (interval * 7)) - 1;
    }
    case "monthly":
      return Math.floor(differenceInCalendarMonths(rangeStart, start) / interval) - 2;
    case "yearly":
      return Math.floor(differenceInCalendarYears(rangeStart, start) / interval) - 2;
  }
}

const MAX_OCCURRENCES = 2000;

/**
 * Expand events into concrete occurrences overlapping [rangeStart, rangeEnd].
 * Non-recurring events yield a single occurrence (when they overlap); recurring
 * events yield one occurrence per matching cycle, each preserving the duration.
 */
export function expandEventsInRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): RenderEvent[] {
  const result: RenderEvent[] = [];

  for (const event of events) {
    const start = fromISO(event.startDate);
    const end = fromISO(event.endDate);
    const durationDays = Math.max(0, differenceInCalendarDays(end, start));

    if (!event.recurrence) {
      if (end >= rangeStart && start <= rangeEnd) {
        result.push({
          id: event.id,
          masterId: event.id,
          originalDate: event.startDate,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          color: event.color,
          category: event.category,
          emoji: event.emoji,
          notes: event.notes,
          location: event.location,
          url: event.url,
          isRecurring: false,
        });
      }
      continue;
    }

    const { freq, interval: rawInterval, until, count } = event.recurrence;
    const interval = Math.max(1, rawInterval);
    const untilDate = until ? fromISO(until) : null;

    let n = Math.max(0, lowerBoundIndex(start, freq, interval, durationDays, rangeStart));
    let guard = 0;
    while (guard++ < MAX_OCCURRENCES) {
      if (count !== undefined && n >= count) break;
      const occStart = occurrenceStart(start, freq, interval, n);
      if (untilDate && occStart > untilDate) break;
      if (occStart > rangeEnd) break;
      n++;

      const originalIso = toISO(occStart);
      const exception = event.exceptions?.[originalIso];
      if (exception?.deleted) continue;

      // Effective dates: an override may move the occurrence.
      const effStart = exception?.startDate
        ? fromISO(exception.startDate)
        : occStart;
      const effEnd = exception?.endDate
        ? fromISO(exception.endDate)
        : addDays(effStart, durationDays);

      if (effEnd < rangeStart || effStart > rangeEnd) continue;

      result.push({
        id: `${event.id}#${originalIso}`,
        masterId: event.id,
        originalDate: originalIso,
        title: exception?.title ?? event.title,
        startDate: toISO(effStart),
        endDate: toISO(effEnd),
        color: exception?.color ?? event.color,
        category: exception?.category ?? event.category,
        emoji: exception?.emoji ?? event.emoji,
        notes: exception?.notes ?? event.notes,
        location: exception?.location ?? event.location,
        url: exception?.url ?? event.url,
        isRecurring: true,
      });
    }
  }

  return result;
}

export interface PositionedEvent {
  event: RenderEvent;
  /** zero-based day index within the month where the bar starts */
  startCol: number;
  /** number of day cells the bar spans within this month */
  span: number;
  /** stack lane (0 or 1 are visible) */
  lane: number;
}

export interface DayOverflow {
  /** zero-based day index → count of hidden events on that day */
  [col: number]: number;
}

/**
 * Lay out events for a single month into stacked lanes.
 * Returns positioned bars (lanes 0..maxLanes-1 are rendered) and an overflow
 * map of how many additional events touch each day beyond the visible lanes.
 */
export function layoutMonthEvents(
  monthStart: Date,
  events: RenderEvent[],
  maxLanes = 2,
): { bars: PositionedEvent[]; overflow: DayOverflow } {
  const monthBegin = startOfMonth(monthStart);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = differenceInCalendarDays(monthEnd, monthBegin) + 1;

  // Events overlapping this month, sorted by start then by longer duration.
  const relevant = events
    .map((event) => {
      const start = fromISO(event.startDate);
      const end = fromISO(event.endDate);
      return { event, start, end };
    })
    .filter(({ start, end }) => end >= monthBegin && start <= monthEnd)
    .sort((a, b) => {
      const s = a.start.getTime() - b.start.getTime();
      if (s !== 0) return s;
      return b.end.getTime() - a.end.getTime();
    });

  // lane occupancy: lanes[lane] = last occupied col index
  const lanes: number[] = [];
  const bars: PositionedEvent[] = [];
  const overflow: DayOverflow = {};

  for (const { event, start, end } of relevant) {
    const clampedStart = start < monthBegin ? monthBegin : start;
    const clampedEnd = end > monthEnd ? monthEnd : end;
    const startCol = differenceInCalendarDays(clampedStart, monthBegin);
    const endCol = differenceInCalendarDays(clampedEnd, monthBegin);
    const span = endCol - startCol + 1;

    // find a free lane
    let lane = lanes.findIndex((lastCol) => lastCol < startCol);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(endCol);
    } else {
      lanes[lane] = endCol;
    }

    if (lane < maxLanes) {
      bars.push({ event, startCol, span, lane });
    } else {
      for (let c = startCol; c <= endCol; c++) {
        overflow[c] = (overflow[c] ?? 0) + 1;
      }
    }
  }

  // sanity: ensure cols within bounds
  void daysInMonth;
  return { bars, overflow };
}

export function rangeBetween(a: string, b: string): { start: string; end: string } {
  const da = fromISO(a);
  const db = fromISO(b);
  return da <= db
    ? { start: a, end: b }
    : { start: b, end: a };
}

export function formatRange(startIso: string, endIso: string): string {
  const start = fromISO(startIso);
  const end = fromISO(endIso);
  if (startIso === endIso) return format(start, "MMM d, yyyy");
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
    }
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(addDays(fromISO(iso), days));
}
