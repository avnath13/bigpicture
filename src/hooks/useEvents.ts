import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { buildSampleEvents } from "@/lib/sampleEvents";
import { deserializeEvents, serializeEvents } from "@/lib/persistence";
import { storageGet, storageSet } from "@/lib/storage";

const STORAGE_KEY = "bigpicture.events";
/** Set the first time we seed demo data, so the UI can nudge a fresh start. */
export const DEMO_ACTIVE_KEY = "bigpicture.demoActive";

function loadEvents(): CalendarEvent[] {
  const raw = storageGet(STORAGE_KEY);
  if (raw) {
    const events = deserializeEvents(raw);
    if (events) return events;
  }
  const seed = buildSampleEvents(new Date().getFullYear());
  storageSet(STORAGE_KEY, serializeEvents(seed));
  storageSet(DEMO_ACTIVE_KEY, "true");
  return seed;
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);

  useEffect(() => {
    storageSet(STORAGE_KEY, serializeEvents(events));
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

  /** Append a batch of events (e.g. an .ics import). */
  const addEvents = useCallback((batch: CalendarEvent[]) => {
    setEvents((prev) => [...prev, ...batch]);
  }, []);

  /** Replace the whole store (e.g. restoring a backup). */
  const replaceEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
  }, []);

  /** Wipe every event and start from an empty calendar. */
  const resetEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    addEvent,
    addEvents,
    updateEvent,
    deleteEvent,
    replaceEvents,
    resetEvents,
  };
}
