import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  textClassName,
}: {
  className?: string;
  compact?: boolean;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs shrink-0">
        <span className="font-display text-[14px] font-bold tracking-tight">V</span>
      </span>
      {compact ? null : (
        <span className={cn("font-display text-[15px] font-semibold tracking-tight text-current", textClassName)}>
          Vestui
        </span>
      )}
    </span>
  );
}
