import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, BarChart3, Calculator, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinanceiroTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPay = pathname.startsWith("/loja/recebimentos");
  const isDRE = pathname === "/relatorio";
  const isMetas = pathname === "/metas" || pathname === "/prolabore" || pathname === "/precificacao";

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none border-b border-border/60">
      <Link
        to="/loja/recebimentos"
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isPay
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <Banknote className="size-3.5" />
        Dinheiro a Receber (Vestui Pay)
      </Link>

      <Link
        to="/relatorio"
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isDRE
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <BarChart3 className="size-3.5" />
        Lucro Real da Loja
      </Link>

      <Link
        to="/metas"
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          isMetas
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground",
        )}
      >
        <Target className="size-3.5" />
        Metas & Planejamento
      </Link>
    </div>
  );
}
