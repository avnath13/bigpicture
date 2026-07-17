import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileJson,
  FileUp,
  ImageDown,
  Loader2,
  Plus,
  Printer,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JumpToDate } from "@/components/JumpToDate";
import type { CalendarEvent } from "@/lib/types";

interface CalendarHeaderProps {
  year: number;
  events: CalendarEvent[];
  onPrevYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
  onAddEvent: () => void;
  onOpenDisplayOptions: () => void;
  onJump: (iso: string) => void;
  onExport: () => void;
  onExportIcs: () => void;
  onDownloadBackup: () => void;
  onRestoreBackup: () => void;
  onImportIcs: () => void;
  onPrint: () => void;
  exporting: boolean;
}

export function CalendarHeader({
  year,
  events,
  onPrevYear,
  onNextYear,
  onToday,
  onAddEvent,
  onOpenDisplayOptions,
  onJump,
  onExport,
  onExportIcs,
  onDownloadBackup,
  onRestoreBackup,
  onImportIcs,
  onPrint,
  exporting,
}: CalendarHeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b print:hidden">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight text-foreground sm:inline">
            BigPicture
          </span>
        </div>

        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPrevYear}
            aria-label="Previous year"
          >
            <ChevronLeft />
          </Button>
          <span
            className="min-w-[4ch] text-center font-display text-xl font-bold tabular-nums text-foreground"
            aria-live="polite"
          >
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNextYear}
            aria-label="Next year"
          >
            <ChevronRight />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onAddEvent} size="sm" className="hidden sm:inline-flex">
            <Plus />
            Add Event
          </Button>
          <Button
            onClick={onAddEvent}
            size="icon"
            className="sm:hidden"
            aria-label="Add event"
          >
            <Plus />
          </Button>

          <JumpToDate events={events} onJump={onJump} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={exporting}
                aria-label="Import and export"
              >
                {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExport}>
                <ImageDown className="mr-2 h-4 w-4" />
                Export image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportIcs}>
                <FileDown className="mr-2 h-4 w-4" />
                Export calendar (.ics)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownloadBackup}>
                <FileJson className="mr-2 h-4 w-4" />
                Download backup (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print / save as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onImportIcs}>
                <FileUp className="mr-2 h-4 w-4" />
                Import events (.ics)…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRestoreBackup}>
                <Upload className="mr-2 h-4 w-4" />
                Restore backup…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={onOpenDisplayOptions}
            aria-label="Display options"
          >
            <SlidersHorizontal />
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
