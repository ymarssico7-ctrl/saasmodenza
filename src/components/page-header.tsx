import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const actionContent = action ?? actions;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1 sm:space-y-1.5 min-w-0">
        {eyebrow ? (
          typeof eyebrow === "string" ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : (
            <div>{eyebrow}</div>
          )
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-display">
          {title}
        </h1>
        {description ? (
          typeof description === "string" ? (
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : (
            <div className="max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          )
        ) : null}
      </div>
      {actionContent ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {actionContent}
        </div>
      ) : null}
    </header>
  );
}

