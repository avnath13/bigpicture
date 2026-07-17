import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./types";
import {
  expandEventsInRange,
  layoutMonthEvents,
  pruneOrphanedExceptions,
  rangeBetween,
  toISO,
} from "./calendarUtils";

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    title: "Test",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    color: "teal",
    category: "work",
    ...overrides,
  };
}

const yearStart = new Date(2026, 0, 1);
const yearEnd = new Date(2026, 11, 31);

describe("expandEventsInRange", () => {
  it("yields a single occurrence for a non-recurring event in range", () => {
    const out = expandEventsInRange([event()], yearStart, yearEnd);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      masterId: "e1",
      startDate: "2026-03-10",
      endDate: "2026-03-12",
      isRecurring: false,
    });
  });

  it("excludes non-recurring events outside the range", () => {
    const out = expandEventsInRange(
      [event({ startDate: "2025-05-01", endDate: "2025-05-02" })],
      yearStart,
      yearEnd,
    );
    expect(out).toHaveLength(0);
  });

  it("includes events that straddle the range boundary", () => {
    const out = expandEventsInRange(
      [event({ startDate: "2025-12-28", endDate: "2026-01-03" })],
      yearStart,
      yearEnd,
    );
    expect(out).toHaveLength(1);
  });

  it("expands a weekly recurrence with an interval", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-05",
          recurrence: { freq: "weekly", interval: 2 },
        }),
      ],
      new Date(2026, 0, 1),
      new Date(2026, 1, 28),
    );
    expect(out.map((o) => o.startDate)).toEqual([
      "2026-01-05",
      "2026-01-19",
      "2026-02-02",
      "2026-02-16",
    ]);
  });

  it("respects a count end condition (count includes the first occurrence)", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-05",
          recurrence: { freq: "daily", interval: 1, count: 3 },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out.map((o) => o.startDate)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ]);
  });

  it("respects an inclusive until end condition", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-05",
          recurrence: { freq: "weekly", interval: 1, until: "2026-01-19" },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out.map((o) => o.startDate)).toEqual([
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
    ]);
  });

  it("yields zero occurrences when until precedes the start", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-06-01",
          endDate: "2026-06-01",
          recurrence: { freq: "daily", interval: 1, until: "2026-05-01" },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out).toHaveLength(0);
  });

  it("skips deleted exception occurrences", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-05",
          recurrence: { freq: "weekly", interval: 1, count: 3 },
          exceptions: { "2026-01-12": { deleted: true } },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out.map((o) => o.startDate)).toEqual(["2026-01-05", "2026-01-19"]);
  });

  it("applies exception overrides (moved date, changed category)", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-05",
          endDate: "2026-01-06",
          recurrence: { freq: "weekly", interval: 1, count: 2 },
          exceptions: {
            "2026-01-12": { startDate: "2026-01-14", category: "travel" },
          },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out).toHaveLength(2);
    const moved = out.find((o) => o.originalDate === "2026-01-12")!;
    expect(moved.startDate).toBe("2026-01-14");
    // Duration (1 extra day) is preserved when only the start moves.
    expect(moved.endDate).toBe("2026-01-15");
    expect(moved.category).toBe("travel");
  });

  it("expands a long-running daily series only within the range (lower-bound fast-forward)", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2020-01-01",
          endDate: "2020-01-01",
          recurrence: { freq: "daily", interval: 1 },
        }),
      ],
      new Date(2026, 5, 1),
      new Date(2026, 5, 30),
    );
    expect(out).toHaveLength(30);
    expect(out[0].startDate).toBe("2026-06-01");
    expect(out[29].startDate).toBe("2026-06-30");
  });

  it("handles monthly recurrence from Jan 31 (date-fns clamps short months)", () => {
    const out = expandEventsInRange(
      [
        event({
          startDate: "2026-01-31",
          endDate: "2026-01-31",
          recurrence: { freq: "monthly", interval: 1, count: 3 },
        }),
      ],
      yearStart,
      yearEnd,
    );
    expect(out.map((o) => o.startDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });
});

describe("layoutMonthEvents", () => {
  const march = new Date(2026, 2, 1);
  const re = (id: string, startDate: string, endDate: string) => ({
    id,
    masterId: id,
    originalDate: startDate,
    title: id,
    startDate,
    endDate,
    color: "teal" as const,
    category: "work" as const,
    isRecurring: false,
  });

  it("places non-overlapping events in the same lane", () => {
    const { bars, overflow } = layoutMonthEvents(march, [
      re("a", "2026-03-02", "2026-03-04"),
      re("b", "2026-03-05", "2026-03-06"),
    ]);
    expect(bars).toHaveLength(2);
    expect(bars.every((b) => b.lane === 0)).toBe(true);
    expect(overflow).toEqual({});
  });

  it("stacks overlapping events into separate lanes and clamps to the month", () => {
    const { bars } = layoutMonthEvents(march, [
      re("a", "2026-02-25", "2026-03-03"),
      re("b", "2026-03-02", "2026-03-05"),
    ]);
    const a = bars.find((b) => b.event.id === "a")!;
    const b = bars.find((b) => b.event.id === "b")!;
    expect(a.startCol).toBe(0); // clamped to Mar 1
    expect(a.span).toBe(3);
    expect(a.lane).toBe(0);
    expect(b.lane).toBe(1);
  });

  it("routes events beyond maxLanes into the overflow map", () => {
    const { bars, overflow } = layoutMonthEvents(
      march,
      [
        re("a", "2026-03-02", "2026-03-03"),
        re("b", "2026-03-02", "2026-03-03"),
        re("c", "2026-03-02", "2026-03-03"),
      ],
      2,
    );
    expect(bars).toHaveLength(2);
    // Day cols 1 and 2 (Mar 2–3) each hide one event.
    expect(overflow).toEqual({ 1: 1, 2: 1 });
  });
});

describe("pruneOrphanedExceptions", () => {
  it("keeps exceptions that still match occurrence dates", () => {
    const e = event({
      startDate: "2026-01-05",
      endDate: "2026-01-05",
      recurrence: { freq: "weekly", interval: 1 },
      exceptions: { "2026-01-12": { deleted: true } },
    });
    expect(pruneOrphanedExceptions(e)).toBe(e);
  });

  it("drops exceptions orphaned by an interval change", () => {
    const e = event({
      startDate: "2026-01-05",
      endDate: "2026-01-05",
      recurrence: { freq: "weekly", interval: 2 },
      exceptions: {
        "2026-01-12": { deleted: true }, // no longer an occurrence
        "2026-01-19": { title: "kept" }, // still an occurrence
      },
    });
    const pruned = pruneOrphanedExceptions(e);
    expect(Object.keys(pruned.exceptions!)).toEqual(["2026-01-19"]);
  });

  it("drops exceptions beyond a shortened count", () => {
    const e = event({
      startDate: "2026-01-05",
      endDate: "2026-01-05",
      recurrence: { freq: "weekly", interval: 1, count: 2 },
      exceptions: { "2026-01-26": { deleted: true } },
    });
    expect(pruneOrphanedExceptions(e).exceptions).toBeUndefined();
  });

  it("drops all exceptions when recurrence is removed", () => {
    const e = event({
      exceptions: { "2026-03-10": { deleted: true } },
    });
    expect(pruneOrphanedExceptions(e).exceptions).toBeUndefined();
  });
});

describe("rangeBetween / toISO", () => {
  it("normalizes a reversed range", () => {
    expect(rangeBetween("2026-04-10", "2026-04-02")).toEqual({
      start: "2026-04-02",
      end: "2026-04-10",
    });
  });

  it("formats dates in local time", () => {
    // 23:30 local on Jan 1 must stay Jan 1 regardless of UTC offset.
    expect(toISO(new Date(2026, 0, 1, 23, 30))).toBe("2026-01-01");
  });
});
