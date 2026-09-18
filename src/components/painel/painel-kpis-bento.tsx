import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Receipt,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PainelKpisBentoProps {
  // ── Receita ───────────────────────────────────────────────────────────────
  revenue: number;
  netRevenue: number;
  prevRevenue: number;
  refunds: number;
  // ── Despesas ──────────────────────────────────────────────────────────────
  totalExpenses: number;
  expenses?: number; // OPEX puro
  stockPurchases?: number;
  // ── Lucro ─────────────────────────────────────────────────────────────────
  profit: number;
  operatingProfit: number;
  marginPct: number;
  // ── Canais ────────────────────────────────────────────────────────────────
  fisicaRevenue: number;
  onlineRevenue: number;
  vitrineAtiva: boolean;
  // ── Operação ──────────────────────────────────────────────────────────────
  totalPecasVendidas: number;
  ticketMedio: number;
  pedidosNovosCount: number;
  pedidosEmSeparacaoCount?: number;
  // ── Meta do Mês ───────────────────────────────────────────────────────────
  goalTarget: number;
  goalProgress: number; // 0-100
  dailyTarget?: number;
  // ── Privacidade ───────────────────────────────────────────────────────────
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelKpisBento({
  revenue,
  netRevenue,
  refunds,
  totalExpenses,
  expenses,
  stockPurchases,
  profit,
  marginPct,
  fisicaRevenue,
  onlineRevenue,
  vitrineAtiva,
  pedidosNovosCount,
  goalTarget,
  goalProgress,
  dailyTarget,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  // ── Canais ────────────────────────────────────────────────────────────────
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 100;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 0;

  // ── Meta ──────────────────────────────────────────────────────────────────
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const metaAtingida = progressClamp >= 100;
  const metaDefinida = goalTarget > 0;

  // ── Saídas ────────────────────────────────────────────────────────────────
  const despesasExibidas = totalExpenses;
  const opexVal = expenses ?? 0;
  const estoqueVal = stockPurchases ?? 0;

  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
      {/* ── CARD 1: FATURAMENTO TOTAL ────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento Total
            </span>
            {metaDefinida && (
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                Meta: {progressClamp.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/80 shadow-2xs">
            <Wallet className="size-4" />
          </div>
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>
        </div>

        {/* Rodapé Límpido: Composição Balcão & Vitrine */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 truncate">
                <Store className="size-3 text-muted-foreground/70 shrink-0" />
                <span>
                  Balcão: <strong className="font-semibold text-foreground">{mascaraSaldo(fisicaRevenue)}</strong>
                </span>
              </span>
              <span className="text-muted-foreground/40 font-bold mx-1.5 select-none">·</span>
              <span className="flex items-center gap-1.5 truncate">
                <ShoppingBag
                  className={cn(
                    "size-3 shrink-0",
                    pedidosNovosCount > 0 ? "text-rose-500" : "text-muted-foreground/70",
                  )}
                />
                <span>
                  Vitrine: <strong className="font-semibold text-foreground">{mascaraSaldo(onlineRevenue)}</strong>
                </span>
                {pedidosNovosCount > 0 && (
                  <Link
                    to="/loja/pedidos"
                    className="ml-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center shrink-0"
                  >
                    ({pedidosNovosCount} a separar)
                  </Link>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 2: SAÍDAS DO MÊS ────────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Saídas do Mês
          </span>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/80 shadow-2xs">
            <Receipt className="size-4" />
          </div>
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>
        </div>

        {/* Rodapé: Contas e Compras de Estoque */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="truncate">
                Contas: <strong className="font-semibold text-foreground">{mascaraSaldo(opexVal)}</strong>
              </span>
              <span className="text-muted-foreground/40 font-bold mx-1.5 select-none">·</span>
              <span className="truncate">
                Estoque: <strong className="font-semibold text-foreground">{mascaraSaldo(estoqueVal)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 3: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sobra no Caixa
            </span>
            {profit > 0 ? (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Positivo
              </span>
            ) : profit < 0 ? (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400">
                Atenção
              </span>
            ) : null}
          </div>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/80 shadow-2xs">
            <TrendingUp className="size-4" />
          </div>
        </div>

        <div className="my-1.5">
          <h3
            className={cn(
              "numeric text-2xl sm:text-3xl font-bold tracking-tight",
              profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
            )}
          >
            {mascaraSaldo(profit)}
          </h3>
        </div>

        {/* Rodapé: Margem e Status de Caixa */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="truncate">
                Margem: <strong className="font-semibold text-foreground">{marginPct.toFixed(0)}%</strong>
              </span>
              <span className="text-muted-foreground/40 font-bold mx-1.5 select-none">·</span>
              <span className="truncate">
                {netRevenue > 0 ? "Disponível no caixa" : "Caixa estável"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
