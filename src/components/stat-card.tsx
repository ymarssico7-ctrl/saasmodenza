import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning" | "primary";
  className?: string;
  children?: ReactNode;
}) {
  const toneText = {
    default: "text-foreground",
    positive: "text-success",
    negative: "text-destructive",
    warning: "text-warning",
    primary: "text-primary",
  }[tone];

  return (
    <article
      className={cn(
        "panel group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform duration-300 group-hover:scale-105">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("numeric mt-5 text-[2rem] font-semibold leading-none", toneText)}>{value}</p>
      {hint ? <p className="mt-3 text-xs text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}
