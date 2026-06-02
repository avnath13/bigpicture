import { useMemo, useState } from "react";
import { CalendarSearch, CornerDownLeft } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarEvent } from "@/lib/types";
import { eventColorValue, formatRange } from "@/lib/calendarUtils";

interface JumpToDateProps {
  events: CalendarEvent[];
  /** Jump to (and scroll) the month containing this ISO date. */
  onJump: (iso: string) => void;
}

export function JumpToDate({ events, onJump }: JumpToDateProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dateValue, setDateValue] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return events
      .filter((e) => e.title.toLowerCase().includes(q))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
  }, [events, query]);

  function jump(iso: string) {
    setOpen(false);
    setQuery("");
    setDateValue("");
    onJump(iso);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Search and jump to date">
          <CalendarSearch />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jump-search">Search events</Label>
          <Input
            id="jump-search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an event by title…"
          />
          {query.trim() && (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {matches.length === 0 && (
                <li className="px-1 py-2 text-xs text-muted-foreground">
                  No matching events.
                </li>
              )}
              {matches.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => jump(event.startDate)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: eventColorValue(event.color) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {event.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatRange(event.startDate, event.endDate)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label htmlFor="jump-date">Jump to date</Label>
          <div className="flex gap-2">
            <Input
              id="jump-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
            <Button
              type="button"
              size="icon"
              disabled={!dateValue}
              onClick={() => dateValue && jump(dateValue)}
              aria-label="Go to date"
            >
              <CornerDownLeft />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
