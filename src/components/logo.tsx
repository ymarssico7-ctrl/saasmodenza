import { cn } from "@/lib/utils";
import vestuiMark from "@/assets/brand/vestui-mark.png";
import vestuiMarkDark from "@/assets/brand/vestui-mark-dark.png";

export function Logo({
  className,
  compact = false,
  textClassName,
  variant = "dark",
}: {
  className?: string;
  compact?: boolean;
  textClassName?: string;
  /** "dark" usa o V mark otimizado para fundo escuro (sidebar); "light" para fundo claro (auth) */
  variant?: "dark" | "light";
}) {
  const mark = variant === "light" ? vestuiMark : vestuiMarkDark;

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {/* Logomark Vestui — V mark orgânico bicolor (cobalto + navy) */}
      <span className="relative flex size-8 items-center justify-center shrink-0 select-none">
        <img
          src={mark}
          alt="Vestui"
          width={32}
          height={32}
          className="size-8 rounded-[10px] object-cover"
          draggable={false}
        />
      </span>
      {compact ? null : (
        <span
          className={cn(
            "font-display text-[15px] font-semibold tracking-tight text-current",
            textClassName,
          )}
        >
          VESTUI
        </span>
      )}
    </span>
  );
}
