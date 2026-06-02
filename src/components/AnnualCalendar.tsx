import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  differenceInCalendarDays,
  endOfYear,
  startOfYear,
} from "date-fns";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { CalendarHeader } from "@/components/CalendarHeader";
import { CategoryFilter } from "@/components/CategoryFilter";
import { DisplayOptionsDialog } from "@/components/DisplayOptionsDialog";
import { ResetConfirmDialog } from "@/components/ResetConfirmDialog";
import { CountdownTicker } from "@/components/CountdownTicker";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import {
  EventDialog,
  type EventDialogState,
  type EventDialogResult,
} from "@/components/EventDialog";
import { MonthRow } from "@/components/MonthRow";
import { useEvents, DEMO_ACTIVE_KEY } from "@/hooks/useEvents";
import { useDragSelection } from "@/hooks/useDragSelection";
import {
  useEventDrag,
  computeDragDates,
  dateUnderPoint,
  type DragKind,
} from "@/hooks/useEventDrag";
import type {
  DisplayOptions,
  EventCategory,
  EventColor,
  EventException,
  RenderEvent,
} from "@/lib/types";
import {
  CATEGORY_ORDER,
  DEFAULT_DISPLAY_OPTIONS,
  EVENT_COLORS,
  eventColorValue,
  expandEventsInRange,
  fromISO,
  getDaysInMonth,
  getMonthsForYear,
  leadingOffset,
  toISO,
} from "@/lib/calendarUtils";

interface ScrollTarget {
  monthIndex: number;
  dayIndex: number;
  key: number;
}

const DISPLAY_KEY = "bigpicture.display";
const LABEL_WIDTH = 56;
const MIN_CELL = 30;
const MAX_CELL = 72;

function loadDisplayOptions(): DisplayOptions {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_OPTIONS;
  try {
    const raw = window.localStorage.getItem(DISPLAY_KEY);
    if (raw) return { ...DEFAULT_DISPLAY_OPTIONS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_DISPLAY_OPTIONS;
}

export function AnnualCalendar() {
  const currentYear = new Date().getFullYear();
  const { events, addEvent, updateEvent, deleteEvent, resetEvents } =
    useEvents();

  const [year, setYear] = useState(currentYear);
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    () => new Set(CATEGORY_ORDER),
  );
  const [displayOptions, setDisplayOptions] =
    useState<DisplayOptions>(loadDisplayOptions);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(DEMO_ACTIVE_KEY) === "true",
  );

  const clearDemoFlag = useCallback(() => {
    setDemoActive(false);
    window.localStorage.setItem(DEMO_ACTIVE_KEY, "false");
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<EventDialogState>({
    event: null,
    occurrence: null,
    range: null,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [exporting, setExporting] = useState(false);

  const months = useMemo(() => getMonthsForYear(year), [year]);

  // Distinct event colors actually in use (stable palette order), for the legend.
  const usedColors = useMemo(
    () => EVENT_COLORS.filter((c) => events.some((e) => e.color === c)),
    [events],
  );

  // Persist display options.
  useEffect(() => {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(displayOptions));
  }, [displayOptions]);

  // Track the calendar's available width so cells can fill the screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Widest column count across the year (so every month row aligns).
  const totalColumns = useMemo(() => {
    return months.reduce((max, monthStart) => {
      const offset =
        displayOptions.layout === "fixed-week"
          ? leadingOffset(monthStart, displayOptions.weekStart)
          : 0;
      return Math.max(max, offset + getDaysInMonth(monthStart).length);
    }, 0);
  }, [months, displayOptions.layout, displayOptions.weekStart]);

  // Responsive cell width: fill the viewport, clamped to a readable range.
  const cellWidth = useMemo(() => {
    const available = (viewportWidth || 1200) - LABEL_WIDTH;
    const ideal = Math.floor(available / totalColumns);
    return Math.min(MAX_CELL, Math.max(MIN_CELL, ideal));
  }, [viewportWidth, totalColumns]);

  // ----- dialog openers -----
  const openCreate = useCallback((range: { start: string; end: string } | null) => {
    setDialogState({ event: null, occurrence: null, range });
    setDialogOpen(true);
  }, []);

  // Clicking any occurrence opens its master + the occurrence context.
  const handleOccurrenceClick = useCallback(
    (occurrence: RenderEvent) => {
      const master = events.find((e) => e.id === occurrence.masterId);
      if (master) {
        setDialogState({ event: master, occurrence, range: null });
        setDialogOpen(true);
      }
    },
    [events],
  );

  const drag = useDragSelection({
    onComplete: (range) => openCreate(range),
  });

  // ----- commit dialog results with toasts -----
  const upsertException = useCallback(
    (masterId: string, originalDate: string, patch: EventException) => {
      const master = events.find((e) => e.id === masterId);
      if (!master) return;
      updateEvent({
        ...master,
        exceptions: {
          ...master.exceptions,
          [originalDate]: { ...master.exceptions?.[originalDate], ...patch },
        },
      });
    },
    [events, updateEvent],
  );

  const handleResult = useCallback(
    (result: EventDialogResult) => {
      switch (result.type) {
        case "save-all": {
          const exists = events.some((e) => e.id === result.event.id);
          if (exists) {
            updateEvent(result.event);
            toast.success("Event updated", { description: result.event.title });
          } else {
            addEvent(result.event);
            toast.success("Event added", { description: result.event.title });
          }
          break;
        }
        case "save-this": {
          upsertException(result.masterId, result.originalDate, result.override);
          toast.success("This occurrence updated", {
            description: result.override.title,
          });
          break;
        }
        case "delete-all": {
          const removed = events.find((e) => e.id === result.id);
          deleteEvent(result.id);
          toast.success("Event deleted", { description: removed?.title });
          break;
        }
        case "delete-this": {
          upsertException(result.masterId, result.originalDate, {
            deleted: true,
          });
          toast.success("This occurrence deleted");
          break;
        }
      }
    },
    [events, addEvent, updateEvent, deleteEvent, upsertException],
  );

  // ----- drag existing events to move / resize -----
  const handleDragCommit = useCallback(
    (occ: RenderEvent, dates: { start: string; end: string }) => {
      const master = events.find((e) => e.id === occ.masterId);
      if (!master) return;
      if (master.recurrence) {
        handleResult({
          type: "save-this",
          masterId: occ.masterId,
          originalDate: occ.originalDate,
          override: { startDate: dates.start, endDate: dates.end },
        });
      } else {
        handleResult({
          type: "save-all",
          event: { ...master, startDate: dates.start, endDate: dates.end },
        });
      }
    },
    [events, handleResult],
  );

  const eventDrag = useEventDrag({
    onCommit: handleDragCommit,
    onClickEvent: handleOccurrenceClick,
  });

  const handleBarPointerDown = useCallback(
    (e: React.MouseEvent, occ: RenderEvent, kind: DragKind) => {
      const grabIso = dateUnderPoint(e.clientX, e.clientY) ?? occ.startDate;
      eventDrag.begin(kind, occ, grabIso);
    },
    [eventDrag],
  );

  // Expand events for the year, applying a live preview while dragging an event.
  const renderEvents = useMemo(() => {
    const preview = eventDrag.preview;
    const source = preview
      ? events.map((e) => {
          if (e.id !== preview.occ.masterId) return e;
          const dates = computeDragDates(preview.occ, preview.kind, preview.deltaDays);
          if (e.recurrence) {
            return {
              ...e,
              exceptions: {
                ...e.exceptions,
                [preview.occ.originalDate]: {
                  ...e.exceptions?.[preview.occ.originalDate],
                  startDate: dates.start,
                  endDate: dates.end,
                },
              },
            };
          }
          return { ...e, startDate: dates.start, endDate: dates.end };
        })
      : events;

    const filtered = source.filter((e) => activeCategories.has(e.category));
    const rangeStart = startOfYear(new Date(year, 0, 1));
    const rangeEnd = endOfYear(new Date(year, 0, 1));
    return expandEventsInRange(filtered, rangeStart, rangeEnd);
  }, [events, activeCategories, year, eventDrag.preview]);

  const toggleCategory = useCallback((category: EventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // ----- scrolling -----
  const scrollToDate = useCallback((iso: string) => {
    const date = fromISO(iso);
    setScrollTarget({
      monthIndex: date.getMonth(),
      dayIndex: date.getDate() - 1,
      key: Date.now(),
    });
  }, []);

  const handleJump = useCallback(
    (iso: string) => {
      const targetYear = fromISO(iso).getFullYear();
      if (targetYear !== year) setYear(targetYear);
      scrollToDate(iso);
    },
    [year, scrollToDate],
  );

  const handleToday = useCallback(() => {
    if (year !== currentYear) setYear(currentYear);
    scrollToDate(toISO(new Date()));
  }, [year, currentYear, scrollToDate]);

  // Export the full year grid as a PNG.
  const handleExport = useCallback(async () => {
    const node = gridRef.current;
    if (!node || exporting) return;
    setExporting(true);
    node.classList.add("exporting");
    try {
      const backgroundColor = getComputedStyle(document.body).backgroundColor;
      const width = node.scrollWidth;
      const height = node.scrollHeight;
      const options = {
        backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
      };
      // First pass warms fonts/styles; the second renders reliably.
      await toPng(node, options);
      const dataUrl = await toPng(node, options);
      const link = document.createElement("a");
      link.download = `bigpicture-${year}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image exported", {
        description: `bigpicture-${year}.png`,
      });
    } catch {
      toast.error("Couldn't export image");
    } finally {
      node.classList.remove("exporting");
      setExporting(false);
    }
  }, [year, exporting]);

  // Perform queued scroll after render (also after a year change).
  useEffect(() => {
    if (!scrollTarget) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const section = container.querySelector<HTMLElement>(
        `[data-month="${scrollTarget.monthIndex}"]`,
      );
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
      const monthOffset =
        displayOptions.layout === "fixed-week"
          ? leadingOffset(months[scrollTarget.monthIndex], displayOptions.weekStart)
          : 0;
      const col = scrollTarget.dayIndex + monthOffset;
      const left = Math.max(
        0,
        LABEL_WIDTH + col * cellWidth - container.clientWidth / 2 + cellWidth / 2,
      );
      container.scrollTo({ left, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTarget]);

  // Auto-scroll to today on mount when viewing the current year.
  useEffect(() => {
    if (year === currentYear) {
      const id = window.setTimeout(() => scrollToDate(toISO(new Date())), 400);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayIso = toISO(new Date());
  const daysLeft = differenceInCalendarDays(endOfYear(new Date()), new Date());
  const subtitle =
    year === currentYear
      ? `${daysLeft} days left in ${year}. Make them count.`
      : year > currentYear
        ? `Planning ahead for ${year}.`
        : `Looking back at ${year}.`;

  return (
    <div className="min-h-screen bg-background">
      <CalendarHeader
        year={year}
        events={events}
        onPrevYear={() => setYear((y) => y - 1)}
        onNextYear={() => setYear((y) => y + 1)}
        onToday={handleToday}
        onAddEvent={() => openCreate(null)}
        onOpenDisplayOptions={() => setDisplayOpen(true)}
        onJump={handleJump}
        onExport={handleExport}
        exporting={exporting}
      />

      <main className="mx-auto max-w-[1800px] px-4 sm:px-6">
        {/* First-run demo nudge */}
        {demoActive && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                You're exploring with demo events
              </p>
              <p className="text-sm text-muted-foreground">
                They show what BigPicture can do. Clear them whenever you're
                ready to plan your own year.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setConfirmResetOpen(true)}
              >
                Clear &amp; start fresh
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Dismiss"
                onClick={clearDemoFlag}
              >
                <X />
              </Button>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="py-12 sm:py-16">
          <p className="animate-fade-in-up text-sm font-medium uppercase tracking-[0.2em] text-primary opacity-0">
            {year}
          </p>
          <h1 className="mt-3 animate-fade-in-up animation-delay-100 font-display text-4xl font-extrabold tracking-tight text-foreground opacity-0 sm:text-6xl">
            A year is your canvas.
          </h1>
          <p className="mt-4 max-w-xl animate-fade-in-up animation-delay-200 text-lg text-muted-foreground opacity-0">
            {subtitle}
          </p>
        </section>

        {/* Year progress / days-left countdown */}
        <YearProgress year={year} currentYear={currentYear} />

        {/* Category filter — sits directly above the calendar */}
        <div className="mb-3 overflow-x-auto pb-1">
          <CategoryFilter active={activeCategories} onToggle={toggleCategory} />
        </div>

        {/* Calendar grid */}
        <div
          ref={scrollRef}
          className="no-scrollbar overflow-x-auto rounded-2xl border border-border bg-card/50 shadow-sm"
        >
          <div
            ref={gridRef}
            style={{ width: LABEL_WIDTH + totalColumns * cellWidth }}
          >
            {months.map((monthStart, index) => (
              <MonthRow
                key={index}
                monthStart={monthStart}
                monthIndex={index}
                events={renderEvents}
                options={displayOptions}
                cellWidth={cellWidth}
                totalColumns={totalColumns}
                todayIso={todayIso}
                onDayClick={(iso) => openCreate({ start: iso, end: iso })}
                onBarPointerDown={handleBarPointerDown}
                startDrag={drag.startDrag}
                extendDrag={drag.extendDrag}
                isInRange={drag.isInRange}
                isDragging={drag.isDragging}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <Legend colors={usedColors} />
      </main>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={dialogState}
        onResult={handleResult}
      />

      <DisplayOptionsDialog
        open={displayOpen}
        onOpenChange={setDisplayOpen}
        options={displayOptions}
        onChange={setDisplayOptions}
        onRequestReset={() => {
          setDisplayOpen(false);
          setConfirmResetOpen(true);
        }}
      />

      <ResetConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        eventCount={events.length}
        onConfirm={() => {
          resetEvents();
          clearDemoFlag();
          toast.success("Calendar reset", {
            description: "All events were deleted.",
          });
        }}
      />
    </div>
  );
}

function Legend({ colors }: { colors: EventColor[] }) {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 py-8 text-xs text-muted-foreground">
      <LegendItem label="Day off">
        <span className="h-3.5 w-3.5 rounded border border-border bg-calendar-weekend" />
      </LegendItem>
      <LegendItem label="Today">
        <span className="h-3.5 w-3.5 rounded bg-primary/10 ring-2 ring-inset ring-primary" />
      </LegendItem>
      <LegendItem label="Selection">
        <span className="h-3.5 w-3.5 rounded bg-primary/20 ring-1 ring-inset ring-primary" />
      </LegendItem>
      <LegendItem label={colors.length ? "Event colors in use" : "No events yet"}>
        {colors.length ? (
          <span className="flex">
            {colors.map((c) => (
              <span
                key={c}
                className="-ml-1 h-3.5 w-3.5 rounded-full border-2 border-card first:ml-0"
                style={{ backgroundColor: eventColorValue(c) }}
              />
            ))}
          </span>
        ) : (
          <span className="h-3.5 w-3.5 rounded-full border border-dashed border-border" />
        )}
      </LegendItem>
    </footer>
  );
}

function YearProgress({
  year,
  currentYear,
}: {
  year: number;
  currentYear: number;
}) {
  const now = new Date();
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const totalDays = differenceInCalendarDays(yearEnd, yearStart) + 1;

  let percent: number;
  let primary: string;
  let secondary: string;
  let target: Date | null;

  if (year === currentYear) {
    const elapsed = differenceInCalendarDays(now, yearStart);
    const daysLeft = differenceInCalendarDays(yearEnd, now);
    percent = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
    primary = `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left in ${year}`;
    secondary = `${Math.round(percent)}% of the year is gone — make the rest count`;
    target = yearEnd;
  } else if (year > currentYear) {
    const daysUntil = differenceInCalendarDays(yearStart, now);
    percent = 0;
    primary = `${year} hasn't started`;
    secondary = `Begins in ${daysUntil} ${daysUntil === 1 ? "day" : "days"} — plan ahead`;
    target = yearStart;
  } else {
    percent = 100;
    primary = `${year} is complete`;
    secondary = "A full year, in the books";
    target = null;
  }

  return (
    <div className="mb-6 animate-fade-in-up rounded-2xl border border-border bg-card/50 p-4 opacity-0 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">
            {primary}
          </p>
          <p
            className={`mt-1 text-xs ${
              year === currentYear
                ? "font-medium text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {secondary}
          </p>
        </div>
        {target && <CountdownTicker target={target} />}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

function LegendItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="font-medium">{label}</span>
    </span>
  );
}
