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
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  const animated = useAnimatedNumber(value);
  const positivo = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "surface-card surface-card-hover relative overflow-hidden p-5",
        accent && "gradient-primary border-transparent text-primary-foreground shadow-glow",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-[0.12em]",
            accent ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              accent
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-primary-soft text-accent-foreground",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="num-display mt-4 text-3xl font-semibold sm:text-[2rem]">{format(animated)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              accent
                ? "bg-primary-foreground/15 text-primary-foreground"
                : positivo
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
            className={cn(
              "text-xs",
              accent ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
