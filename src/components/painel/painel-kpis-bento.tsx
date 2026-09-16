import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Receipt,
  Shirt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PainelKpisBentoProps {
  revenue: number;
  netRevenue: number;
  prevRevenue: number;
  refunds: number;
  totalExpenses: number;
  expenses?: number;
  stockPurchases?: number;
  profit: number;
  operatingProfit: number;
  marginPct: number;
  fisicaRevenue: number;
  onlineRevenue: number;
  vitrineAtiva: boolean;
  totalPecasVendidas: number;
  ticketMedio: number;
  pedidosNovosCount: number;
  pedidosEmSeparacaoCount?: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelKpisBento({
  revenue,
  totalExpenses,
  expenses = 0,
  stockPurchases = 0,
  profit,
  marginPct,
  fisicaRevenue,
  onlineRevenue,
  vitrineAtiva,
  totalPecasVendidas,
  ticketMedio,
  pedidosNovosCount,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARD 1: Faturamento Total (com split Balcão + Vitrine) ───────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Faturamento Total
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
            <Wallet className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Balcão físico
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {mascaraSaldo(fisicaRevenue)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Vitrine online
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {vitrineAtiva ? mascaraSaldo(onlineRevenue) : "Desativada"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Despesas do Mês (Saídas / OPEX + Estoque) ────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Despesas do Mês
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
            <Receipt className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(totalExpenses)}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Contas fixas
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {mascaraSaldo(expenses)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Estoque
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {mascaraSaldo(stockPurchases)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Sobra no Caixa (Lucro Líquido Real) ───────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobra no Caixa
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider",
                profit >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
            >
              {profit >= 0 ? "Positivo" : "Atenção"}
            </span>
          </div>
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-2xl shadow-2xs",
              profit >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            )}
          >
            <TrendingUp className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3
            className={cn(
              "numeric text-2xl sm:text-3xl font-bold tracking-tight",
              profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {mascaraSaldo(profit)}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Margem livre
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {marginPct > 0 ? `${marginPct.toFixed(0)}% real` : "0% real"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Situação
              </span>
              <span
                className={cn(
                  "block text-xs sm:text-sm font-semibold truncate",
                  profit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {profit >= 0 ? "Lucro livre" : "Prejuízo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: Peças Vendidas (Volume & Ticket Médio / Pedidos Vitrine) ─── */}
      <div
        className={cn(
          "panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px]",
          pedidosNovosCount > 0 &&
            "border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card ring-1 ring-rose-500/20",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Peças Vendidas
            </span>
            {pedidosNovosCount > 0 && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
            )}
          </div>

          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-2xl shadow-2xs",
              pedidosNovosCount > 0
                ? "bg-rose-500/10 text-rose-600"
                : "bg-secondary text-foreground",
            )}
          >
            {pedidosNovosCount > 0 ? (
              <ShoppingBag className="size-4.5" />
            ) : (
              <Shirt className="size-4.5" />
            )}
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {totalPecasVendidas} {totalPecasVendidas === 1 ? "peça" : "peças"}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Ticket médio
              </span>
              <span className="numeric block text-xs sm:text-sm font-semibold text-foreground truncate">
                {ocultarSaldos ? "••••••" : mascaraSaldo(ticketMedio)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground truncate">
                Vitrine online
              </span>
              <div className="text-xs sm:text-sm font-semibold truncate">
                {pedidosNovosCount > 0 ? (
                  <Link
                    to="/loja/pedidos"
                    className="text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    ● {pedidosNovosCount} {pedidosNovosCount === 1 ? "pedido" : "pedidos"}
                    <ChevronRight className="size-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">0 pedidos</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
