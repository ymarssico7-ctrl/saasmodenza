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
      {/* Monograma de Alta-Costura — Símbolo Exclusivo Vestui em Azul Cobalto Elétrico */}
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] ring-1 ring-white/25 shadow-[0_2px_14px_rgba(37,99,235,0.45)] shrink-0 overflow-hidden group">
        {/* Micro-luz reflexiva superior (efeito de vidro e brilho tridimensional) */}
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
        
        {/* Vetor V Monograma Editorial em Branco Puro */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          aria-hidden="true"
        >
          {/* Haste esquerda nobre + vértice refinado + haste direita hairline */}
          <path
            d="M4.0 4.5H8.6L12.2 15.8L18.2 4.5H19.8L13.2 19.5H11.0L4.0 4.5Z"
            fill="#FFFFFF"
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
