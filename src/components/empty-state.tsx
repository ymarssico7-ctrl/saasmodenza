import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "subtle",
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  variant?: "dashed" | "subtle";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center transition-all",
        variant === "dashed"
          ? "border border-dashed border-border bg-surface-muted/50"
          : "border border-border/60 bg-surface-muted/20",
        className,
      )}
    >
      {icon ? (
        <span className="mb-3.5 flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground/75 shadow-2xs">
          {icon}
        </span>
      ) : null}
      <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
