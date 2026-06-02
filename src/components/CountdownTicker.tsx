import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CountdownTickerProps {
  /** The moment to count down to. */
  target: Date;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function partsTo(target: Date): Parts {
  const ms = Math.max(0, target.getTime() - Date.now());
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function Digit({ value }: { value: string }) {
  return (
    <div className="relative h-9 w-6 overflow-hidden rounded-md bg-foreground font-mono text-xl font-bold text-background shadow-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Group({
  value,
  label,
  minDigits = 2,
}: {
  value: number;
  label: string;
  minDigits?: number;
}) {
  const digits = value.toString().padStart(minDigits, "0").split("");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {digits.map((d, i) => (
          <Digit key={i} value={d} />
        ))}
      </div>
      <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="self-start pt-1.5 font-mono text-lg font-bold text-muted-foreground/60">
      :
    </span>
  );
}

export function CountdownTicker({ target }: CountdownTickerProps) {
  const [parts, setParts] = useState<Parts>(() => partsTo(target));

  useEffect(() => {
    setParts(partsTo(target));
    const id = window.setInterval(() => setParts(partsTo(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return (
    <div
      className="flex items-start gap-1.5"
      role="timer"
      aria-label="Time remaining"
    >
      <Group value={parts.days} label="days" />
      <Separator />
      <Group value={parts.hours} label="hrs" />
      <Separator />
      <Group value={parts.minutes} label="min" />
      <Separator />
      <Group value={parts.seconds} label="sec" />
    </div>
  );
}
