import { Link, useRouterState } from "@tanstack/react-router";
import { BadgePercent, Palette, Plug, Settings, Share2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/loja/configuracao", label: "Aparência & Marca", icon: Settings },
  { to: "/loja/templates", label: "Galeria de Temas", icon: Palette },
  { to: "/loja/compartilhar", label: "Link & Divulgação", icon: Share2 },
  { to: "/loja/frete", label: "Frete & Entrega", icon: Truck },
  { to: "/loja/cupons", label: "Cupons de Desconto", icon: BadgePercent },
  { to: "/loja/integracoes", label: "Integrações", icon: Plug },
];

export function VitrineConfigNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none border-b border-border/60">
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
