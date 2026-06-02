import { useCallback, useEffect, useRef, useState } from "react";
import { rangeBetween } from "@/lib/calendarUtils";

interface DragState {
  anchor: string;
  focus: string;
}

interface UseDragSelectionOptions {
  /** Fired on mouseup with the normalized (start <= end) ISO range. */
  onComplete: (range: { start: string; end: string }) => void;
}

export function useDragSelection({ onComplete }: UseDragSelectionOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  // Track whether the pointer actually moved across cells so a plain click
  // (handled separately) isn't swallowed as a drag.
  const movedRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback((iso: string) => {
    movedRef.current = false;
    const next = { anchor: iso, focus: iso };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const extendDrag = useCallback((iso: string) => {
    setDrag((prev) => {
      if (!prev) return prev;
      if (iso !== prev.anchor) movedRef.current = true;
      if (iso === prev.focus) return prev;
      const next = { anchor: prev.anchor, focus: iso };
      dragRef.current = next;
      return next;
    });
  }, []);

  const cancel = useCallback(() => {
    dragRef.current = null;
    movedRef.current = false;
    setDrag(null);
  }, []);

  const isInRange = useCallback(
    (iso: string): boolean => {
      if (!drag) return false;
      const { start, end } = rangeBetween(drag.anchor, drag.focus);
      return iso >= start && iso <= end;
    },
    [drag],
  );

  // Global mouseup completes the drag; Escape cancels.
  useEffect(() => {
    if (!drag) return;

    document.body.classList.add("dragging-cursor");

    const handleUp = () => {
      const current = dragRef.current;
      const moved = movedRef.current;
      dragRef.current = null;
      movedRef.current = false;
      setDrag(null);
      if (current && moved) {
        onComplete(rangeBetween(current.anchor, current.focus));
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };

    window.addEventListener("mouseup", handleUp);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.classList.remove("dragging-cursor");
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("keydown", handleKey);
    };
  }, [drag, cancel, onComplete]);

  return {
    isDragging: drag !== null,
    startDrag,
    extendDrag,
    cancel,
    isInRange,
  };
}
