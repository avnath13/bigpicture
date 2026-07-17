import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./types";
import { eventsToICS, parseICS } from "./ics";

const NOW = new Date(Date.UTC(2026, 6, 17, 12, 0, 0));

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    title: "Launch",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    color: "teal",
    category: "work",
    ...overrides,
  };
}

describe("eventsToICS", () => {
  it("emits a valid calendar wrapper and all-day dates (exclusive DTEND)", () => {
    const ics = eventsToICS([event()], NOW);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260310");
    // Inclusive end Mar 12 → exclusive DTEND Mar 13.
    expect(ics).toContain("DTEND;VALUE=DATE:20260313");
    expect(ics).toContain("SUMMARY:Launch");
    expect(ics).toContain("UID:e1@bigpicture");
  });

  it("escapes special characters in text fields", () => {
    const ics = eventsToICS(
      [event({ title: "a;b,c", notes: "line1\nline2" })],
      NOW,
    );
    expect(ics).toContain("SUMMARY:a\\;b\\,c");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
  });

  it("maps recurrence to RRULE and exceptions to EXDATE", () => {
    const ics = eventsToICS(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-05",
          recurrence: { freq: "weekly", interval: 2, count: 10 },
          exceptions: { "2026-01-19": { deleted: true } },
        }),
      ],
      NOW,
    );
    expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10");
    expect(ics).toContain("EXDATE;VALUE=DATE:20260119");
  });

  it("re-emits modified occurrences as standalone VEVENTs", () => {
    const ics = eventsToICS(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-06",
          recurrence: { freq: "weekly", interval: 1, count: 4 },
          exceptions: {
            "2026-01-12": { startDate: "2026-01-14", title: "Moved" },
          },
        }),
      ],
      NOW,
    );
    expect(ics).toContain("EXDATE;VALUE=DATE:20260112");
    expect(ics).toContain("UID:e1-2026-01-12@bigpicture");
    expect(ics).toContain("SUMMARY:Moved");
    // Duration (2 days) preserved: Jan 14–15 inclusive → DTEND Jan 16.
    expect(ics).toContain("DTSTART;VALUE=DATE:20260114");
    expect(ics).toContain("DTEND;VALUE=DATE:20260116");
  });
});

describe("parseICS", () => {
  it("round-trips a non-recurring event exported by BigPicture", () => {
    const source = event({
      title: "Trip; to, Lisbon",
      notes: "pack\nlight",
      location: "Lisbon",
      url: "https://example.com",
      category: "travel",
      color: "amber",
    });
    const { events, skippedRecurring } = parseICS(eventsToICS([source], NOW));
    expect(skippedRecurring).toBe(0);
    expect(events).toHaveLength(1);
    const [imported] = events;
    expect(imported.title).toBe(source.title);
    expect(imported.startDate).toBe(source.startDate);
    expect(imported.endDate).toBe(source.endDate);
    expect(imported.notes).toBe(source.notes);
    expect(imported.location).toBe(source.location);
    expect(imported.url).toBe(source.url);
    expect(imported.category).toBe("travel");
    expect(imported.color).toBe("amber");
    expect(imported.id).not.toBe(source.id); // fresh id on import
  });

  it("skips recurring events and counts them", () => {
    const ics = eventsToICS(
      [
        event({ id: "single" }),
        event({
          id: "series",
          recurrence: { freq: "daily", interval: 1, count: 5 },
        }),
      ],
      NOW,
    );
    const { events, skippedRecurring } = parseICS(ics);
    expect(skippedRecurring).toBe(1);
    expect(events).toHaveLength(1);
  });

  it("parses third-party files: folded lines, DATE-TIME values, no category", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:abc@example.com",
      "DTSTART:20260405T090000Z",
      "DTEND:20260405T100000Z",
      "SUMMARY:Dentist app",
      " ointment",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const { events } = parseICS(ics);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Dentist appointment");
    expect(events[0].startDate).toBe("2026-04-05");
    expect(events[0].endDate).toBe("2026-04-05");
    expect(events[0].category).toBe("other");
  });

  it("treats an all-day single-day DTEND correctly (exclusive)", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260610",
      "DTEND;VALUE=DATE:20260611",
      "SUMMARY:One day",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const { events } = parseICS(ics);
    expect(events[0].startDate).toBe("2026-06-10");
    expect(events[0].endDate).toBe("2026-06-10");
  });

  it("returns nothing for files without events", () => {
    const { events, skippedRecurring } = parseICS("hello world");
    expect(events).toHaveLength(0);
    expect(skippedRecurring).toBe(0);
  });
});
