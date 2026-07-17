import type {
  CalendarEvent,
  DisplayOptions,
  EventCategory,
  EventColor,
  EventException,
  RecurrenceFreq,
  RecurrenceRule,
} from "./types";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_DISPLAY_OPTIONS,
  EVENT_COLORS,
} from "./calendarUtils";

/**
 * Versioned localStorage payload for events. Version 0 (the original release)
 * stored a bare array; version 1 wraps it so future shape changes can migrate
 * instead of crashing on stale data.
 */
export const STORAGE_VERSION = 1;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FREQS: RecurrenceFreq[] = ["daily", "weekly", "monthly", "yearly"];

export function serializeEvents(events: CalendarEvent[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, events });
}

/**
 * Parse a stored/backed-up events payload of any known version, dropping
 * malformed entries instead of failing wholesale. Returns null only when the
 * payload as a whole is unusable.
 */
export function deserializeEvents(raw: string): CalendarEvent[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return sanitizeEvents(parsed);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { events?: unknown }).events)
    ) {
      return sanitizeEvents((parsed as { events: unknown[] }).events);
    }
  } catch {
    // fall through
  }
  return null;
}

export function sanitizeEvents(input: unknown[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const item of input) {
    const event = sanitizeEvent(item);
    if (event) out.push(event);
  }
  return out;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sanitizeEvent(item: unknown): CalendarEvent | null {
  if (item === null || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;

  if (typeof raw.id !== "string" || raw.id.length === 0) return null;
  if (typeof raw.title !== "string") return null;
  if (!isIsoDate(raw.startDate) || !isIsoDate(raw.endDate)) return null;

  const [startDate, endDate] =
    raw.startDate <= raw.endDate
      ? [raw.startDate, raw.endDate]
      : [raw.endDate, raw.startDate];

  const category = CATEGORY_ORDER.includes(raw.category as EventCategory)
    ? (raw.category as EventCategory)
    : "other";
  const color = EVENT_COLORS.includes(raw.color as EventColor)
    ? (raw.color as EventColor)
    : CATEGORY_META[category].defaultColor;

  const event: CalendarEvent = {
    id: raw.id,
    title: raw.title,
    startDate,
    endDate,
    color,
    category,
    emoji: optionalString(raw.emoji),
    notes: optionalString(raw.notes),
    location: optionalString(raw.location),
    url: optionalString(raw.url),
  };

  const recurrence = sanitizeRecurrence(raw.recurrence);
  if (recurrence) {
    event.recurrence = recurrence;
    const exceptions = sanitizeExceptions(raw.exceptions);
    if (exceptions) event.exceptions = exceptions;
  }

  return event;
}

function sanitizeRecurrence(value: unknown): RecurrenceRule | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!FREQS.includes(raw.freq as RecurrenceFreq)) return undefined;
  const rule: RecurrenceRule = {
    freq: raw.freq as RecurrenceFreq,
    interval:
      typeof raw.interval === "number" && raw.interval >= 1
        ? Math.floor(raw.interval)
        : 1,
  };
  if (isIsoDate(raw.until)) rule.until = raw.until;
  else if (typeof raw.count === "number" && raw.count >= 1) {
    rule.count = Math.floor(raw.count);
  }
  return rule;
}

function sanitizeExceptions(
  value: unknown,
): Record<string, EventException> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const out: Record<string, EventException> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!ISO_DATE.test(key)) continue;
    if (entry === null || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const exception: EventException = {};
    if (raw.deleted === true) exception.deleted = true;
    if (typeof raw.title === "string") exception.title = raw.title;
    if (isIsoDate(raw.startDate)) exception.startDate = raw.startDate;
    if (isIsoDate(raw.endDate)) exception.endDate = raw.endDate;
    if (EVENT_COLORS.includes(raw.color as EventColor)) {
      exception.color = raw.color as EventColor;
    }
    if (CATEGORY_ORDER.includes(raw.category as EventCategory)) {
      exception.category = raw.category as EventCategory;
    }
    if (typeof raw.emoji === "string") exception.emoji = raw.emoji;
    if (typeof raw.notes === "string") exception.notes = raw.notes;
    if (typeof raw.location === "string") exception.location = raw.location;
    if (typeof raw.url === "string") exception.url = raw.url;
    if (Object.keys(exception).length > 0) out[key] = exception;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ----- JSON backup files -----

export interface BackupPayload {
  events: CalendarEvent[];
  display?: DisplayOptions;
}

/** Build the downloadable backup file contents. */
export function buildBackup(
  events: CalendarEvent[],
  display: DisplayOptions,
  exportedAt: Date,
): string {
  return JSON.stringify(
    {
      app: "bigpicture",
      version: STORAGE_VERSION,
      exportedAt: exportedAt.toISOString(),
      events,
      display,
    },
    null,
    2,
  );
}

/**
 * Parse a backup file. Accepts full backups, bare event arrays, and raw
 * storage payloads, so users can restore anything BigPicture ever produced.
 */
export function parseBackup(raw: string): BackupPayload | null {
  const events = deserializeEvents(raw);
  if (!events) return null;

  let display: DisplayOptions | undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { display?: unknown }).display === "object" &&
      (parsed as { display?: unknown }).display !== null
    ) {
      display = {
        ...DEFAULT_DISPLAY_OPTIONS,
        ...(parsed as { display: Partial<DisplayOptions> }).display,
      };
    }
  } catch {
    // events parsed above, so this cannot happen; keep display undefined
  }

  return { events, display };
}
