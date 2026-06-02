import type { CalendarEvent, RecurrenceRule } from "./types";
import { CATEGORY_META } from "./calendarUtils";

/** Build the seed set of sample events for a given year. */
export function buildSampleEvents(year: number): CalendarEvent[] {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const d = (month: number, day: number) =>
    `${year}-${pad(month)}-${pad(day)}`;

  const make = (
    id: string,
    title: string,
    start: string,
    end: string,
    category: keyof typeof CATEGORY_META,
    recurrence?: RecurrenceRule,
    colorOverride?: CalendarEvent["color"],
  ): CalendarEvent => ({
    id,
    title,
    startDate: start,
    endDate: end,
    category,
    color: colorOverride ?? CATEGORY_META[category].defaultColor,
    ...(recurrence ? { recurrence } : {}),
  });

  const events: CalendarEvent[] = [
    make("seed-1", "Q1 Kickoff", d(1, 6), d(1, 6), "work"),
    make("seed-2", "Product Launch Sprint", d(2, 3), d(2, 14), "project"),
    make("seed-3", "Tax Filing Deadline", d(4, 15), d(4, 15), "deadline"),
    make("seed-4", "Spring Break in Lisbon", d(4, 5), d(4, 12), "travel"),
    make("seed-5", "Marathon Training Block", d(5, 1), d(6, 20), "health"),
    make("seed-6", "Annual Conference", d(6, 10), d(6, 12), "work"),
    make("seed-7", "Summer Road Trip", d(7, 18), d(7, 28), "travel"),
    make("seed-8", "Anniversary", d(9, 9), d(9, 9), "personal"),
    make("seed-9", "Beta Release", d(10, 21), d(10, 25), "project"),
    make("seed-10", "Year-End Review", d(12, 15), d(12, 19), "deadline"),
    make("seed-11", "Holiday Break", d(12, 24), d(12, 31), "personal"),
    // Recurring samples
    make("seed-12", "Team Standup", d(1, 5), d(1, 5), "work", {
      freq: "weekly",
      interval: 1,
    }),
    make("seed-13", "Rent Due", d(1, 1), d(1, 1), "deadline", {
      freq: "monthly",
      interval: 1,
    }),
    make("seed-14", "Mom's Birthday", d(8, 21), d(8, 21), "personal", {
      freq: "yearly",
      interval: 1,
    }),
  ];

  const emojiById: Record<string, string> = {
    "seed-1": "🚀",
    "seed-2": "📦",
    "seed-3": "🧾",
    "seed-4": "✈️",
    "seed-5": "🏃",
    "seed-6": "🎤",
    "seed-7": "🚗",
    "seed-8": "💛",
    "seed-9": "🧪",
    "seed-11": "🎄",
    "seed-13": "💸",
    "seed-14": "🎂",
  };

  return events.map((e) =>
    emojiById[e.id] ? { ...e, emoji: emojiById[e.id] } : e,
  );
}
