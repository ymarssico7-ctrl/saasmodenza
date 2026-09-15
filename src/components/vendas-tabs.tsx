import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function VendasTabs({ pendingOrdersCount = 0 }: { pendingOrdersCount?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isBalcao = pathname === "/caixa";
  const isOnline = pathname.startsWith("/loja/pedidos");

  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-3 pt-1">
      <Link
        to="/caixa"
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isBalcao
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <Wallet className="size-3.5" />
        Balcão da Loja (PDV)
      </Link>

      <Link
        to="/loja/pedidos"
        className={cn(
          "relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isOnline
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <ShoppingBag className="size-3.5" />
        Pedidos da Vitrine & Insta
        {pendingOrdersCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
            {pendingOrdersCount > 9 ? "9+" : pendingOrdersCount}
          </span>
        )}
      </Link>
    </div>
  );
}
