import type { ReactNode } from "react";
import {
  AlignJustify,
  AlignLeft,
  Clock,
  Globe,
  Hash,
  Layers,
  Leaf,
  PanelBottom,
  PanelTop,
  Palette,
  Rows3,
  SeparatorHorizontal,
  Smile,
  StretchVertical,
  Tags,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { WEEKDAYS } from "@/lib/calendarUtils";
import { HOLIDAY_COUNTRIES } from "@/hooks/useHolidays";
import type {
  ColorTone,
  Density,
  DisplayOptions,
  LanePosition,
  LayoutMode,
  StampsPerDay,
  Weekday,
  WeekStart,
} from "@/lib/types";

interface DisplayOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
  onRequestReset: () => void;
}

export function DisplayOptionsDialog({
  open,
  onOpenChange,
  options,
  onChange,
  onRequestReset,
}: DisplayOptionsDialogProps) {
  const set = <K extends keyof DisplayOptions>(
    key: K,
    value: DisplayOptions[K],
  ) => onChange({ ...options, [key]: value });

  const daysOffLabel =
    options.daysOff.length === 0
      ? "No days highlighted"
      : `Highlight ${WEEKDAYS.filter((d) => options.daysOff.includes(d.value))
          .map((d) => d.label)
          .join(", ")} as days off`;

  function toggleDayOff(day: Weekday) {
    const next = options.daysOff.includes(day)
      ? options.daysOff.filter((d) => d !== day)
      : [...options.daysOff, day];
    set("daysOff", next.sort((a, b) => a - b));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Display Options</DialogTitle>
        </DialogHeader>

        {/* ---------- GRID ---------- */}
        <Section title="Grid">
          <Row
            icon={<Rows3 />}
            title="Layout"
            desc={
              options.layout === "fixed-week"
                ? "Weekday-aligned grid — columns line up across months"
                : "Continuous strip of every date in the month"
            }
          >
            <div className="flex flex-col items-end gap-2">
              <Segmented
                value={options.layout}
                onChange={(v: LayoutMode) => set("layout", v)}
                options={[
                  { value: "date-grid", label: "Date Grid", icon: <AlignLeft /> },
                  {
                    value: "fixed-week",
                    label: "Fixed Week",
                    icon: <AlignJustify />,
                  },
                ]}
              />
              {options.layout === "fixed-week" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Start</span>
                  <Segmented
                    size="sm"
                    value={options.weekStart}
                    onChange={(v: WeekStart) => set("weekStart", v)}
                    options={[
                      { value: 0, label: "Sunday" },
                      { value: 1, label: "Monday" },
                    ]}
                  />
                </div>
              )}
            </div>
          </Row>

          <Divider />

          <Row
            icon={<StretchVertical />}
            title="Density"
            desc="Row height for each month"
          >
            <Segmented
              value={options.density}
              onChange={(v: Density) => set("density", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "cozy", label: "Cozy" },
                { value: "spacious", label: "Spacious" },
              ]}
            />
          </Row>
        </Section>

        {/* ---------- HIGHLIGHTS ---------- */}
        <Section title="Highlights">
          <Row icon={<Leaf />} title="Days off" desc={daysOffLabel}>
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              {WEEKDAYS.map((d, i) => {
                const active = options.daysOff.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDayOff(d.value)}
                    className={cn(
                      "px-2.5 py-1.5 text-xs font-medium transition-colors",
                      i > 0 && "border-l border-border",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Divider />

          <Row
            icon={<Globe />}
            title="Public holidays"
            desc={
              options.holidayCountry
                ? "Holidays are marked on the grid"
                : "Pick a country to mark its public holidays"
            }
          >
            <Select
              value={options.holidayCountry || "none"}
              onValueChange={(v) =>
                set("holidayCountry", v === "none" ? "" : v)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off</SelectItem>
                {HOLIDAY_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Divider />

          <Row
            icon={<Palette />}
            title="Color Tone"
            desc="Apply accent tints across the year"
          >
            <Segmented
              value={options.colorTone}
              onChange={(v: ColorTone) => set("colorTone", v)}
              options={[
                { value: "none", label: "None" },
                { value: "subtle", label: "Subtle" },
                { value: "quarter", label: "Quarter" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </Row>

          <Divider />

          <Row
            icon={<SeparatorHorizontal />}
            title="Quarter dividers"
            desc="Draw a line between Q1–Q4"
          >
            <Switch
              checked={options.quarterDividers}
              onCheckedChange={(v) => set("quarterDividers", v)}
            />
          </Row>

          <Divider />

          <Row
            icon={<Clock />}
            title="Past Visualization"
            desc="Dim past dates and completed events"
          >
            <Switch
              checked={options.showPast}
              onCheckedChange={(v) => set("showPast", v)}
            />
          </Row>
        </Section>

        {/* ---------- LABELS ---------- */}
        <Section title="Labels">
          <Row
            icon={<Type />}
            title="Weekday letters"
            desc="Show the 2-letter weekday under each date"
          >
            <Switch
              checked={options.showWeekdayLetters}
              onCheckedChange={(v) => set("showWeekdayLetters", v)}
            />
          </Row>

          <Divider />

          <Row
            icon={<Hash />}
            title="ISO week numbers"
            desc="Show ISO week labels at each Monday"
          >
            <Switch
              checked={options.showWeekNumbers}
              onCheckedChange={(v) => set("showWeekNumbers", v)}
            />
          </Row>
        </Section>

        {/* ---------- STAMPS ---------- */}
        <Section title="Stamps">
          <Row
            icon={<Tags />}
            title="Category Colors"
            desc="Color stamps by category, or use a neutral style"
          >
            <Switch
              checked={options.categoryColors}
              onCheckedChange={(v) => set("categoryColors", v)}
            />
          </Row>

          <Divider />

          <Row icon={<Smile />} title="Emoji" desc="Show emoji on stamps">
            <Switch
              checked={options.showEmojis}
              onCheckedChange={(v) => set("showEmojis", v)}
            />
          </Row>

          <Divider />

          <Row
            icon={<Layers />}
            title="Stamps per day"
            desc="How many stamps to show before “+N”"
          >
            <Segmented
              value={options.stampsPerDay}
              onChange={(v: StampsPerDay) => set("stampsPerDay", v)}
              options={[
                { value: 1, label: "1" },
                { value: 2, label: "2" },
                { value: 3, label: "3" },
              ]}
            />
          </Row>

          <Divider />

          <Row
            icon={options.lanePosition === "top" ? <PanelTop /> : <PanelBottom />}
            title="Lane Position"
            desc="Place the stamp lane at the top or bottom of each cell"
          >
            <Segmented
              value={options.lanePosition}
              onChange={(v: LanePosition) => set("lanePosition", v)}
              options={[
                { value: "top", label: "Top", icon: <PanelTop /> },
                { value: "bottom", label: "Bottom", icon: <PanelBottom /> },
              ]}
            />
          </Row>
        </Section>

        {/* ---------- DANGER ZONE ---------- */}
        <div className="space-y-1">
          <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-widest text-destructive">
            Danger zone
          </h3>
          <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete every event and start from a blank calendar.
              This cannot be undone.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="h-11 w-full text-base font-semibold"
              onClick={onRequestReset}
            >
              <Trash2 />
              Reset calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="rounded-2xl border border-border bg-card/40 px-4">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 shrink-0 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/60" />;
}

interface SegmentedOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md font-medium transition-all [&_svg]:h-4 [&_svg]:w-4",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
