import { Link, useRouterState } from "@tanstack/react-router";
import { HandCoins, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClientesTabs({ pendingCreditsCount = 0 }: { pendingCreditsCount?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isClientes = pathname === "/clientes";
  const isFiado = pathname === "/fiado";

  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-3 pt-1">
      <Link
        to="/clientes"
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isClientes
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <Users className="size-3.5" />
        Minhas Clientes (CRM)
      </Link>

      <Link
        to="/fiado"
        className={cn(
          "relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isFiado
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <HandCoins className="size-3.5" />
        Caderninho de Fiado
        {pendingCreditsCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-sm">
            {pendingCreditsCount > 9 ? "9+" : pendingCreditsCount}
          </span>
        )}
      </Link>
    </div>
  );
}
