import { cn } from "@/lib/utils";
import vestuiLogoDark from "@/assets/brand/vestui-logo-dark.svg";
import vestuiLogoLight from "@/assets/brand/vestui-logo-light.svg";
import vestuiMarkDark from "@/assets/brand/vestui-mark-dark.svg";
import vestuiMarkLight from "@/assets/brand/vestui-mark-light.svg";

export interface LogoProps {
  className?: string;
  compact?: boolean;
  /**
   * "dark" para fundos escuros (como a Sidebar do ERP);
   * "light" para fundos claros (como Landing Page, card de Login e Onboarding).
   * @default "dark"
   */
  variant?: "dark" | "light";
  /** Mantido para retrocompatibilidade */
  textClassName?: string;
}

export function Logo({
  className,
  compact = false,
  variant = "dark",
}: LogoProps) {
  if (compact) {
    return (
      <img
        src={variant === "light" ? vestuiMarkLight : vestuiMarkDark}
        alt="Vestui"
        width={32}
        height={32}
        className={cn("size-8 object-contain shrink-0 select-none", className)}
        draggable={false}
      />
    );
  }

  return (
    <img
      src={variant === "light" ? vestuiLogoLight : vestuiLogoDark}
      alt="Vestui"
      height={28}
      className={cn("h-7 w-auto object-contain shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
