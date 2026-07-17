import { differenceInCalendarDays } from "date-fns";
import type {
  CalendarEvent,
  EventCategory,
  EventColor,
  RecurrenceFreq,
} from "./types";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  EVENT_COLORS,
  addDaysISO,
  createId,
  fromISO,
} from "./calendarUtils";

/**
 * Minimal RFC 5545 (iCalendar) support for all-day events.
 *
 * Export: masters become VEVENTs with RRULE; deleted/modified occurrences
 * become EXDATEs, and modified occurrences are re-emitted as standalone
 * VEVENTs with their effective values. Category/color round-trip via
 * CATEGORIES and a private X-BIGPICTURE-COLOR property.
 *
 * Import: all-day-oriented; DATE-TIME values are truncated to their date.
 * Recurring VEVENTs (RRULE) are skipped and counted for the caller to report.
 */

const FREQ_TO_ICS: Record<RecurrenceFreq, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

/** yyyy-MM-dd → yyyyMMdd */
function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/** yyyyMMdd (or a DATE-TIME) → yyyy-MM-dd, or null when unparseable. */
function isoFromIcsDate(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, c: string) =>
    c === "n" || c === "N" ? "\n" : c,
  );
}

/** Fold long content lines per RFC 5545 (continuation lines start with a space). */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
  }
  return parts.join("\r\n");
}

interface VEventInput {
  uid: string;
  title: string;
  startDate: string;
  /** Inclusive end date (DTEND is emitted exclusive). */
  endDate: string;
  category: EventCategory;
  color: EventColor;
  notes?: string;
  location?: string;
  url?: string;
  rrule?: string;
  exdates?: string[];
}

function buildVEvent(input: VEventInput, dtstamp: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${icsDate(input.startDate)}`,
    `DTEND;VALUE=DATE:${icsDate(addDaysISO(input.endDate, 1))}`,
    `SUMMARY:${escapeText(input.title)}`,
    `CATEGORIES:${escapeText(CATEGORY_META[input.category].label)}`,
    `X-BIGPICTURE-COLOR:${input.color}`,
  ];
  if (input.rrule) lines.push(`RRULE:${input.rrule}`);
  for (const exdate of input.exdates ?? []) {
    lines.push(`EXDATE;VALUE=DATE:${icsDate(exdate)}`);
  }
  if (input.notes) lines.push(`DESCRIPTION:${escapeText(input.notes)}`);
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  if (input.url) lines.push(`URL:${escapeText(input.url)}`);
  lines.push("END:VEVENT");
  return lines;
}

export function eventsToICS(events: CalendarEvent[], now: Date): string {
  const dtstamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BigPicture//Annual Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const duration = Math.max(
      0,
      differenceInCalendarDays(fromISO(event.endDate), fromISO(event.startDate)),
    );

    let rrule: string | undefined;
    const exdates: string[] = [];
    if (event.recurrence) {
      const { freq, interval, until, count } = event.recurrence;
      const parts = [`FREQ=${FREQ_TO_ICS[freq]}`];
      if (interval > 1) parts.push(`INTERVAL=${interval}`);
      if (until) parts.push(`UNTIL=${icsDate(until)}`);
      else if (count !== undefined) parts.push(`COUNT=${count}`);
      rrule = parts.join(";");
      // Both deleted and modified occurrences leave the base series.
      exdates.push(...Object.keys(event.exceptions ?? {}));
    }

    lines.push(
      ...buildVEvent(
        {
          uid: `${event.id}@bigpicture`,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          category: event.category,
          color: event.color,
          notes: event.notes,
          location: event.location,
          url: event.url,
          rrule,
          exdates,
        },
        dtstamp,
      ),
    );

    // Re-emit modified (non-deleted) occurrences as standalone events.
    for (const [originalDate, exception] of Object.entries(
      event.exceptions ?? {},
    )) {
      if (exception.deleted) continue;
      const start = exception.startDate ?? originalDate;
      const end = exception.endDate ?? addDaysISO(start, duration);
      lines.push(
        ...buildVEvent(
          {
            uid: `${event.id}-${originalDate}@bigpicture`,
            title: exception.title ?? event.title,
            startDate: start,
            endDate: end,
            category: exception.category ?? event.category,
            color: exception.color ?? event.color,
            notes: exception.notes ?? event.notes,
            location: exception.location ?? event.location,
            url: exception.url ?? event.url,
          },
          dtstamp,
        ),
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export interface IcsImportResult {
  events: CalendarEvent[];
  /** VEVENTs skipped because they carry an RRULE we don't import (yet). */
  skippedRecurring: number;
}

/** Unfold RFC 5545 continuation lines and split into content lines. */
function contentLines(text: string): string[] {
  return text
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
}

/** "NAME;PARAM=X:value" → { name, params, value }, or null. */
function parseProperty(
  line: string,
): { name: string; params: string; value: string } | null {
  // The first ':' outside of quoted params ends the name+params section.
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const semi = head.indexOf(";");
  return {
    name: (semi === -1 ? head : head.slice(0, semi)).toUpperCase(),
    params: semi === -1 ? "" : head.slice(semi + 1).toUpperCase(),
    value: line.slice(colon + 1),
  };
}

export function parseICS(text: string): IcsImportResult {
  const events: CalendarEvent[] = [];
  let skippedRecurring = 0;

  let current: Record<string, { params: string; value: string }> | null = null;
  for (const line of contentLines(text)) {
    if (/^BEGIN:VEVENT$/i.test(line)) {
      current = {};
      continue;
    }
    if (/^END:VEVENT$/i.test(line)) {
      if (current) {
        if ("RRULE" in current) {
          skippedRecurring++;
        } else {
          const event = veventToEvent(current);
          if (event) events.push(event);
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const prop = parseProperty(line);
    if (prop) current[prop.name] = { params: prop.params, value: prop.value };
  }

  return { events, skippedRecurring };
}

function veventToEvent(
  props: Record<string, { params: string; value: string }>,
): CalendarEvent | null {
  const dtstart = props.DTSTART;
  if (!dtstart) return null;
  const startDate = isoFromIcsDate(dtstart.value);
  if (!startDate) return null;

  let endDate = startDate;
  const dtend = props.DTEND;
  if (dtend) {
    const rawEnd = isoFromIcsDate(dtend.value);
    if (rawEnd) {
      // All-day DTEND is exclusive; DATE-TIME ends are truncated to their date.
      endDate = dtend.params.includes("VALUE=DATE")
        ? addDaysISO(rawEnd, -1)
        : rawEnd;
      if (endDate < startDate) endDate = startDate;
    }
  }

  const categoryLabel = props.CATEGORIES
    ? unescapeText(props.CATEGORIES.value).split(",")[0].trim().toLowerCase()
    : "";
  const category = CATEGORY_ORDER.includes(categoryLabel as EventCategory)
    ? (categoryLabel as EventCategory)
    : "other";

  const rawColor = props["X-BIGPICTURE-COLOR"]?.value.trim().toLowerCase();
  const color = EVENT_COLORS.includes(rawColor as EventColor)
    ? (rawColor as EventColor)
    : CATEGORY_META[category].defaultColor;

  const title = props.SUMMARY ? unescapeText(props.SUMMARY.value).trim() : "";
  const notes = props.DESCRIPTION
    ? unescapeText(props.DESCRIPTION.value)
    : undefined;
  const location = props.LOCATION
    ? unescapeText(props.LOCATION.value)
    : undefined;
  const url = props.URL ? unescapeText(props.URL.value) : undefined;

  return {
    id: createId(),
    title: title || "Untitled event",
    startDate,
    endDate,
    color,
    category,
    notes: notes || undefined,
    location: location || undefined,
    url: url || undefined,
  };
}
