import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-[0.85rem] bg-primary text-primary-foreground shadow-glow">
        <span className="font-display text-[15px] font-semibold tracking-tight">V</span>
      </span>
      {compact ? null : (
        <span className="font-display text-[17px] font-semibold tracking-tight">Vestuli</span>
      )}
    </span>
  );
}
