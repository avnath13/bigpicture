import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./types";
import { DEFAULT_DISPLAY_OPTIONS } from "./calendarUtils";
import {
  buildBackup,
  deserializeEvents,
  parseBackup,
  serializeEvents,
} from "./persistence";

const valid: CalendarEvent = {
  id: "e1",
  title: "Launch",
  startDate: "2026-03-10",
  endDate: "2026-03-12",
  color: "teal",
  category: "work",
};

describe("deserializeEvents", () => {
  it("round-trips the current (v1) format", () => {
    expect(deserializeEvents(serializeEvents([valid]))).toEqual([valid]);
  });

  it("migrates the legacy bare-array (v0) format", () => {
    expect(deserializeEvents(JSON.stringify([valid]))).toEqual([valid]);
  });

  it("returns null for garbage payloads", () => {
    expect(deserializeEvents("not json")).toBeNull();
    expect(deserializeEvents('"a string"')).toBeNull();
    expect(deserializeEvents('{"version":1}')).toBeNull();
  });

  it("drops malformed entries but keeps valid ones", () => {
    const raw = JSON.stringify([
      valid,
      { id: "bad", title: "no dates" },
      { ...valid, id: "e2", startDate: "March 5" },
      null,
      42,
    ]);
    expect(deserializeEvents(raw)).toEqual([valid]);
  });

  it("normalizes reversed dates and coerces unknown color/category", () => {
    const raw = JSON.stringify([
      {
        ...valid,
        startDate: "2026-03-12",
        endDate: "2026-03-10",
        color: "chartreuse",
        category: "gaming",
      },
    ]);
    const [event] = deserializeEvents(raw)!;
    expect(event.startDate).toBe("2026-03-10");
    expect(event.endDate).toBe("2026-03-12");
    expect(event.category).toBe("other");
    expect(event.color).toBe("slate"); // "other"'s default color
  });

  it("sanitizes recurrence and exceptions", () => {
    const raw = JSON.stringify([
      {
        ...valid,
        recurrence: { freq: "weekly", interval: 0, count: 2.9 },
        exceptions: {
          "2026-03-17": { deleted: true },
          "not-a-date": { deleted: true },
          "2026-03-24": { color: "neon" },
        },
      },
    ]);
    const [event] = deserializeEvents(raw)!;
    expect(event.recurrence).toEqual({ freq: "weekly", interval: 1, count: 2 });
    expect(Object.keys(event.exceptions!)).toEqual(["2026-03-17"]);
  });

  it("drops recurrence with an unknown frequency", () => {
    const raw = JSON.stringify([
      { ...valid, recurrence: { freq: "fortnightly", interval: 1 } },
    ]);
    const [event] = deserializeEvents(raw)!;
    expect(event.recurrence).toBeUndefined();
  });
});

describe("backup files", () => {
  it("round-trips events and display options", () => {
    const display = { ...DEFAULT_DISPLAY_OPTIONS, density: "compact" as const };
    const file = buildBackup([valid], display, new Date(2026, 6, 17, 12));
    const restored = parseBackup(file)!;
    expect(restored.events).toEqual([valid]);
    expect(restored.display).toEqual(display);
  });

  it("accepts a bare event array as a backup", () => {
    const restored = parseBackup(JSON.stringify([valid]))!;
    expect(restored.events).toEqual([valid]);
    expect(restored.display).toBeUndefined();
  });

  it("fills missing display fields with defaults", () => {
    const file = JSON.stringify({
      version: 1,
      events: [valid],
      display: { density: "spacious" },
    });
    const restored = parseBackup(file)!;
    expect(restored.display).toEqual({
      ...DEFAULT_DISPLAY_OPTIONS,
      density: "spacious",
    });
  });

  it("rejects unusable files", () => {
    expect(parseBackup("<html>")).toBeNull();
    expect(parseBackup('{"foo":1}')).toBeNull();
  });
});
