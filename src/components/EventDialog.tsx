import { useEffect, useMemo, useState } from "react";
import { Link2, MapPin, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmojiPicker } from "@/components/EmojiPicker";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  EventCategory,
  EventColor,
  EventException,
  RecurrenceFreq,
  RecurrenceRule,
  RenderEvent,
} from "@/lib/types";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  EVENT_COLORS,
  EVENT_COLOR_META,
  RECURRENCE_UNIT,
  createId,
  eventColorValue,
  rangeBetween,
} from "@/lib/calendarUtils";

export interface EventDialogState {
  /** Existing master event being edited, or null when creating. */
  event: CalendarEvent | null;
  /** The specific occurrence clicked (carries effective values + originalDate). */
  occurrence: RenderEvent | null;
  /** Prefilled range when creating from a click/drag. */
  range: { start: string; end: string } | null;
}

/** What the user committed; the parent applies it against the event store. */
export type EventDialogResult =
  | { type: "save-all"; event: CalendarEvent }
  | {
      type: "save-this";
      masterId: string;
      originalDate: string;
      override: EventException;
    }
  | { type: "delete-all"; id: string }
  | { type: "delete-this"; masterId: string; originalDate: string };

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: EventDialogState;
  onResult: (result: EventDialogResult) => void;
}

type RepeatChoice = "none" | RecurrenceFreq;
type EndMode = "never" | "on" | "after";
type Scope = "this" | "all";

interface FormState {
  title: string;
  startDate: string;
  endDate: string;
  category: EventCategory;
  color: EventColor;
  emoji?: string;
  location: string;
  url: string;
  notes: string;
  repeats: RepeatChoice;
  interval: number;
  endMode: EndMode;
  until: string;
  count: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function deriveInitial(state: EventDialogState): FormState {
  const recurrence = state.event?.recurrence;
  // Prefer the clicked occurrence's effective values (may include an override).
  const source = state.occurrence ?? state.event;
  const base = source
    ? {
        title: source.title,
        startDate: source.startDate,
        endDate: source.endDate,
        category: source.category,
        color: source.color,
        emoji: source.emoji,
        location: source.location ?? "",
        url: source.url ?? "",
        notes: source.notes ?? "",
      }
    : (() => {
        const start = state.range?.start ?? todayIso();
        return {
          title: "",
          startDate: start,
          endDate: state.range?.end ?? start,
          category: "work" as EventCategory,
          color: CATEGORY_META.work.defaultColor,
          emoji: undefined as string | undefined,
          location: "",
          url: "",
          notes: "",
        };
      })();

  return {
    ...base,
    repeats: recurrence?.freq ?? "none",
    interval: recurrence?.interval ?? 1,
    endMode: recurrence?.until ? "on" : recurrence?.count !== undefined ? "after" : "never",
    until: recurrence?.until ?? base.endDate,
    count: recurrence?.count ?? 10,
  };
}

export function EventDialog({
  open,
  onOpenChange,
  state,
  onResult,
}: EventDialogProps) {
  const isEditing = state.event !== null;
  const isRecurring = state.event?.recurrence != null;
  const [form, setForm] = useState<FormState>(() => deriveInitial(state));
  const [colorTouched, setColorTouched] = useState(false);
  const [scope, setScope] = useState<Scope>("this");

  useEffect(() => {
    if (open) {
      setForm(deriveInitial(state));
      setColorTouched(false);
      setScope("this");
    }
  }, [open, state]);

  const titleValid = form.title.trim().length > 0;

  // Recurrence is only editable when creating / non-recurring / editing the series.
  const showRecurrence = !isRecurring || scope === "all";
  // Editing the whole series keeps the original schedule; dates apply per-occurrence.
  const datesLocked = isRecurring && scope === "all";

  const unitLabel =
    form.repeats === "none"
      ? ""
      : RECURRENCE_UNIT[form.repeats][form.interval === 1 ? 0 : 1];

  const previewColor = useMemo(() => eventColorValue(form.color), [form.color]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategoryChange(category: EventCategory) {
    setForm((prev) => ({
      ...prev,
      category,
      color: colorTouched ? prev.color : CATEGORY_META[category].defaultColor,
    }));
  }

  function buildRecurrence(): RecurrenceRule | undefined {
    if (form.repeats === "none") return undefined;
    const rule: RecurrenceRule = {
      freq: form.repeats,
      interval: Math.max(1, form.interval),
    };
    if (form.endMode === "on" && form.until) rule.until = form.until;
    if (form.endMode === "after") rule.count = Math.max(1, form.count);
    return rule;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titleValid) return;

    const { start, end } = rangeBetween(form.startDate, form.endDate);
    const emoji = form.emoji?.trim() ? form.emoji : undefined;
    const title = form.title.trim();
    const location = form.location.trim() || undefined;
    const url = form.url.trim() || undefined;
    const notes = form.notes.trim() || undefined;

    if (isRecurring && scope === "this" && state.event) {
      const originalDate = state.occurrence?.originalDate ?? start;
      const override: EventException = {
        title,
        startDate: start,
        endDate: end,
        category: form.category,
        color: form.color,
        emoji,
        location,
        url,
        notes,
      };
      onResult({
        type: "save-this",
        masterId: state.event.id,
        originalDate,
        override,
      });
      onOpenChange(false);
      return;
    }

    if (isEditing && isRecurring && scope === "all" && state.event) {
      // Apply non-schedule fields to the whole series; keep the original schedule.
      onResult({
        type: "save-all",
        event: {
          ...state.event,
          title,
          category: form.category,
          color: form.color,
          emoji,
          location,
          url,
          notes,
          recurrence: buildRecurrence(),
        },
      });
      onOpenChange(false);
      return;
    }

    // Create new, or edit a non-recurring event.
    onResult({
      type: "save-all",
      event: {
        ...(state.event ?? {}),
        id: state.event?.id ?? createId(),
        title,
        startDate: start,
        endDate: end,
        category: form.category,
        color: form.color,
        emoji,
        location,
        url,
        notes,
        recurrence: buildRecurrence(),
      },
    });
    onOpenChange(false);
  }

  function handleDelete() {
    if (!state.event) return;
    if (isRecurring && scope === "this") {
      onResult({
        type: "delete-this",
        masterId: state.event.id,
        originalDate: state.occurrence?.originalDate ?? state.event.startDate,
      });
    } else {
      onResult({ type: "delete-all", id: state.event.id });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details or delete this event."
              : "Add an event to your year."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing && isRecurring && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(["this", "all"] as Scope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                      scope === s
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s === "this" ? "This event" : "All events"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {scope === "this"
                  ? "Changes apply to this occurrence only."
                  : "Changes apply to the whole series (keeps its schedule)."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <div className="flex gap-2">
              <EmojiPicker
                value={form.emoji}
                onChange={(emoji) => update("emoji", emoji)}
              />
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: previewColor }}
                />
                <Input
                  id="event-title"
                  autoFocus
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Product launch"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="date"
                value={form.startDate}
                disabled={datesLocked}
                onChange={(e) => {
                  const startDate = e.target.value;
                  update("startDate", startDate);
                  if (form.endDate < startDate) update("endDate", startDate);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="date"
                value={form.endDate}
                min={form.startDate}
                disabled={datesLocked}
                onChange={(e) => update("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => handleCategoryChange(v as EventCategory)}
            >
              <SelectTrigger id="event-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((category) => (
                  <SelectItem key={category} value={category}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: eventColorValue(
                            CATEGORY_META[category].defaultColor,
                          ),
                        }}
                      />
                      {CATEGORY_META[category].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((color) => {
                const selected = form.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={EVENT_COLOR_META[color].label}
                    aria-pressed={selected}
                    onClick={() => {
                      setColorTouched(true);
                      update("color", color);
                    }}
                    className={cn(
                      "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                      selected && "ring-2 ring-foreground scale-110",
                    )}
                    style={{ backgroundColor: eventColorValue(color) }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="event-location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Where?"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-url">Link</Label>
              <div className="relative">
                <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="event-url"
                  type="url"
                  inputMode="url"
                  value={form.url}
                  onChange={(e) => update("url", e.target.value)}
                  placeholder="https://…"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea
              id="event-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Add any details…"
            />
          </div>

          {showRecurrence && (
            <div className="space-y-2">
              <Label htmlFor="event-repeat">Repeat</Label>
              <Select
                value={form.repeats}
                onValueChange={(v) => update("repeats", v as RepeatChoice)}
              >
                <SelectTrigger id="event-repeat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {showRecurrence && form.repeats !== "none" && (
            <div className="animate-fade-in space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="event-interval" className="shrink-0">
                  Every
                </Label>
                <Input
                  id="event-interval"
                  type="number"
                  min={1}
                  value={form.interval}
                  onChange={(e) =>
                    update("interval", Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{unitLabel}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-end-mode">Ends</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={form.endMode}
                    onValueChange={(v) => update("endMode", v as EndMode)}
                  >
                    <SelectTrigger id="event-end-mode" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="on">On date</SelectItem>
                      <SelectItem value="after">After…</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.endMode === "on" && (
                    <Input
                      type="date"
                      min={form.startDate}
                      value={form.until}
                      onChange={(e) => update("until", e.target.value)}
                      className="flex-1"
                    />
                  )}
                  {form.endMode === "after" && (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={form.count}
                        onChange={(e) =>
                          update("count", Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        occurrences
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={handleDelete}
              >
                <Trash2 />
                {isRecurring && scope === "this" ? "Delete this" : "Delete"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!titleValid}>
              {isEditing ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
