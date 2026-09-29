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
      {/* Monograma de Alta-Costura — Símbolo Exclusivo Vestui */}
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#27272A] to-[#121214] ring-1 ring-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.45)] shrink-0 overflow-hidden">
        {/* Micro-luz reflexiva superior (efeito de lapidação/metal nobre) */}
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Vetor V Monograma Editorial */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vestui-monogram-champagne" x1="4" y1="4.5" x2="20" y2="19.5" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#EAD8BD" />
              <stop offset="70%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#A88127" />
            </linearGradient>
          </defs>
          {/* Haste esquerda nobre + vértice refinado + haste direita hairline */}
          <path
            d="M4.0 4.5H8.6L12.2 15.8L18.2 4.5H19.8L13.2 19.5H11.0L4.0 4.5Z"
            fill="url(#vestui-monogram-champagne)"
          />
        </svg>
      </span>

      {compact ? null : (
        <span className={cn("font-display text-[15.5px] font-semibold tracking-[-0.03em] text-current", textClassName)}>
          Vestui
        </span>
      )}
    </span>
  );
}
