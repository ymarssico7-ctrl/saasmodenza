import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function useAnimatedNumber(value: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return display;
}

export function KpiCard({
  label,
  value,
  format,
  delta,
  hint,
  icon,
  accent = false,
  className,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  const animated = useAnimatedNumber(value);
  const positivo = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "surface-card surface-card-hover relative overflow-hidden rounded-2xl p-4 transition-all duration-200 border border-border/70 bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors",
              accent
                ? "bg-primary/10 text-primary"
                : "bg-secondary/80 text-muted-foreground",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "num-display mt-2 text-2xl font-semibold tracking-tight sm:text-[1.6rem]",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {format(animated)}
      </p>


      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {delta !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              positivo
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
          >
            {positivo ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {`${positivo ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </span>
        ) : null}
        {hint ? (
          <span
            className="text-[11px] text-muted-foreground"
          >
            {hint}
          </span>
        ) : null}

      </div>
    </div>
  );
}
