export type EventColor =
  | "teal"
  | "coral"
  | "amber"
  | "violet"
  | "emerald"
  | "rose"
  | "sky"
  | "orange"
  | "slate";

export type EventCategory =
  | "work"
  | "project"
  | "deadline"
  | "personal"
  | "travel"
  | "health"
  | "other";

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Repeat every N units of `freq` (>= 1). */
  interval: number;
  /** Inclusive ISO date the series stops on. Mutually exclusive with `count`. */
  until?: string;
  /** Total number of occurrences (including the first). */
  count?: number;
}

/**
 * A per-occurrence override on a recurring series, keyed (in `exceptions`) by the
 * occurrence's ORIGINAL scheduled start date. `deleted` removes that instance;
 * any other field replaces the master's value for that one occurrence.
 */
export interface EventException {
  deleted?: boolean;
  title?: string;
  startDate?: string;
  endDate?: string;
  color?: EventColor;
  category?: EventCategory;
  emoji?: string;
  notes?: string;
  location?: string;
  url?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO date string (yyyy-MM-dd) — start of the FIRST occurrence. */
  startDate: string;
  /** ISO date string (yyyy-MM-dd), inclusive — end of the first occurrence. */
  endDate: string;
  color: EventColor;
  category: EventCategory;
  /** Optional leading emoji shown on the bar. */
  emoji?: string;
  /** Freeform notes / description. */
  notes?: string;
  /** Location text. */
  location?: string;
  /** Related URL. */
  url?: string;
  /** When present, the event repeats; each occurrence keeps the same duration. */
  recurrence?: RecurrenceRule;
  /** Per-occurrence overrides for a recurring series. */
  exceptions?: Record<string, EventException>;
}

/**
 * A concrete, render-ready occurrence. For non-recurring events there is exactly
 * one whose `id`/`masterId` match the source event.
 */
export interface RenderEvent {
  /** Unique per occurrence (used as React key). */
  id: string;
  /** Id of the source CalendarEvent this occurrence came from. */
  masterId: string;
  /** The occurrence's ORIGINAL scheduled start date (key into `exceptions`). */
  originalDate: string;
  title: string;
  startDate: string;
  endDate: string;
  color: EventColor;
  category: EventCategory;
  emoji?: string;
  notes?: string;
  location?: string;
  url?: string;
  isRecurring: boolean;
}

export type LayoutMode = "date-grid" | "fixed-week";
/** 0 = Sunday, 1 = Monday (first column in fixed-week layout). */
export type WeekStart = 0 | 1;
/** Day-of-week index, 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ColorTone = "none" | "subtle" | "quarter" | "monthly";
export type LanePosition = "top" | "bottom";
export type Density = "compact" | "cozy" | "spacious";
export type StampsPerDay = 1 | 2 | 3;

export interface DisplayOptions {
  // --- Grid ---
  /** Continuous day strip vs weekday-aligned grid. */
  layout: LayoutMode;
  /** First column weekday in fixed-week layout. */
  weekStart: WeekStart;
  /** Row height. */
  density: Density;

  // --- Highlights ---
  /** Weekdays highlighted as days off. */
  daysOff: Weekday[];
  /** ISO 3166-1 alpha-2 country whose public holidays are marked ("" = off). */
  holidayCountry: string;
  /** Per-month background accenting. */
  colorTone: ColorTone;
  /** Draw a divider between quarters. */
  quarterDividers: boolean;
  /** Dim past dates and finished events. */
  showPast: boolean;

  // --- Labels ---
  /** Show the 2-letter weekday under each date number. */
  showWeekdayLetters: boolean;
  /** Show ISO week numbers at each Monday. */
  showWeekNumbers: boolean;

  // --- Stamps ---
  /** Color stamps by category vs a neutral style. */
  categoryColors: boolean;
  /** Show emoji on stamps. */
  showEmojis: boolean;
  /** Max stamps shown per day before "+N". */
  stampsPerDay: StampsPerDay;
  /** Place the stamp lane at the top or bottom of each day cell. */
  lanePosition: LanePosition;
}
