import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { buildSampleEvents } from "@/lib/sampleEvents";

const STORAGE_KEY = "bigpicture.events";
/** Set the first time we seed demo data, so the UI can nudge a fresh start. */
export const DEMO_ACTIVE_KEY = "bigpicture.demoActive";

function loadEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CalendarEvent[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to seed
  }
  const seed = buildSampleEvents(new Date().getFullYear());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  window.localStorage.setItem(DEMO_ACTIVE_KEY, "true");
  return seed;
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  const updateEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /** Wipe every event and start from an empty calendar. */
  const resetEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, resetEvents };
}
