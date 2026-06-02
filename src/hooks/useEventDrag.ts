import { useCallback, useEffect, useRef, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import type { RenderEvent } from "@/lib/types";
import { addDaysISO, fromISO } from "@/lib/calendarUtils";

export type DragKind = "move" | "resize-start" | "resize-end";

interface DragState {
  kind: DragKind;
  occ: RenderEvent;
  grabIso: string;
  hoverIso: string;
}

export interface DragPreview {
  occ: RenderEvent;
  kind: DragKind;
  deltaDays: number;
}

/** Resolve the calendar day cell (its ISO date) under a screen point. */
export function dateUnderPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest<HTMLElement>("[data-date]");
  return cell?.dataset.date ?? null;
}

/** New {start,end} for an occurrence given a drag kind + day delta (clamped). */
export function computeDragDates(
  occ: RenderEvent,
  kind: DragKind,
  deltaDays: number,
): { start: string; end: string } {
  if (deltaDays === 0) return { start: occ.startDate, end: occ.endDate };
  if (kind === "move") {
    return {
      start: addDaysISO(occ.startDate, deltaDays),
      end: addDaysISO(occ.endDate, deltaDays),
    };
  }
  if (kind === "resize-start") {
    let start = addDaysISO(occ.startDate, deltaDays);
    if (start > occ.endDate) start = occ.endDate;
    return { start, end: occ.endDate };
  }
  let end = addDaysISO(occ.endDate, deltaDays);
  if (end < occ.startDate) end = occ.startDate;
  return { start: occ.startDate, end };
}

interface UseEventDragOptions {
  onCommit: (occ: RenderEvent, dates: { start: string; end: string }) => void;
  /** Fired when the pointer is released without moving (a plain click). */
  onClickEvent: (occ: RenderEvent) => void;
}

/** Swallow the synthetic click that fires right after a mouse drag ends. */
function swallowNextClick() {
  const handler = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.removeEventListener("click", handler, true);
    window.clearTimeout(timer);
  };
  window.addEventListener("click", handler, true);
  const timer = window.setTimeout(
    () => window.removeEventListener("click", handler, true),
    100,
  );
}

export function useEventDrag({ onCommit, onClickEvent }: UseEventDragOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const begin = useCallback(
    (kind: DragKind, occ: RenderEvent, grabIso: string) => {
      const next = { kind, occ, grabIso, hoverIso: grabIso };
      dragRef.current = next;
      setDrag(next);
    },
    [],
  );

  const cancel = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  useEffect(() => {
    if (!drag) return;

    const cursorClass = drag.kind === "move" ? "drag-move" : "drag-resize";
    document.body.classList.add("dragging-event", cursorClass);

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      const { clientX, clientY } = e;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const iso = dateUnderPoint(clientX, clientY);
        if (!iso) return;
        setDrag((prev) => {
          if (!prev || prev.hoverIso === iso) return prev;
          const updated = { ...prev, hoverIso: iso };
          dragRef.current = updated;
          return updated;
        });
      });
    };

    const onUp = () => {
      if (raf) cancelAnimationFrame(raf);
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      const delta = differenceInCalendarDays(
        fromISO(current.hoverIso),
        fromISO(current.grabIso),
      );
      // Eat the trailing synthetic click so it can't reach the day cells below.
      swallowNextClick();
      if (delta !== 0) {
        onCommit(current.occ, computeDragDates(current.occ, current.kind, delta));
      } else {
        onClickEvent(current.occ);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("dragging-event", cursorClass);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [drag, cancel, onCommit, onClickEvent]);

  const deltaDays = drag
    ? differenceInCalendarDays(fromISO(drag.hoverIso), fromISO(drag.grabIso))
    : 0;

  const preview: DragPreview | null =
    drag && deltaDays !== 0
      ? { occ: drag.occ, kind: drag.kind, deltaDays }
      : null;

  return { begin, isDragging: drag !== null, preview };
}
