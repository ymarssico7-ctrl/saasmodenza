import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Receipt,
  ShoppingBag,
  Store,
  Target,
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
    <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 md:grid-cols-4">
      {/* ── CARD 1: FATURAMENTO TOTAL ────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between min-h-[145px] hover:shadow-lift hover:-translate-y-0.5 group cursor-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-normal">
            Faturamento total
          </span>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/70 group-hover:text-foreground group-hover:bg-primary/10 transition-colors shadow-2xs">
            <Wallet className="size-4" />
          </div>
        </div>

        <div className="my-2">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>
        </div>

        {/* Rodapé Límpido: Balcão & Vitrine sem truncamento */}
        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Store className="size-3 text-muted-foreground/70 shrink-0" />
                <span>Balcão: <strong className="font-semibold text-foreground">{mascaraSaldo(fisicaRevenue)}</strong></span>
              </span>
              <span className="text-muted-foreground/30 select-none">·</span>
              <span className="flex items-center gap-1.5">
                <ShoppingBag className={cn("size-3 shrink-0", pedidosNovosCount > 0 ? "text-rose-500" : "text-muted-foreground/70")} />
                <span>Vitrine: <strong className="font-semibold text-foreground">{mascaraSaldo(onlineRevenue)}</strong></span>
                {pedidosNovosCount > 0 && (
                  <Link to="/loja/pedidos" className="text-[10px] font-bold text-rose-500 hover:underline">
                    ({pedidosNovosCount})
                  </Link>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 2: SAÍDAS DO MÊS ────────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between min-h-[145px] hover:shadow-lift hover:-translate-y-0.5 group cursor-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-normal">
            Saídas do mês
          </span>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/70 group-hover:text-rose-500 group-hover:bg-rose-500/10 transition-colors shadow-2xs">
            <Receipt className="size-4" />
          </div>
        </div>

        <div className="my-2">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>
        </div>

        {/* Rodapé: Contas e Compras de Estoque */}
        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span>Contas: <strong className="font-semibold text-foreground">{mascaraSaldo(opexVal)}</strong></span>
              <span className="text-muted-foreground/30 select-none">·</span>
              <span>Estoque: <strong className="font-semibold text-foreground">{mascaraSaldo(estoqueVal)}</strong></span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 3: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between min-h-[145px] hover:shadow-lift hover:-translate-y-0.5 group cursor-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-normal">
            Sobra no caixa
          </span>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/70 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors shadow-2xs">
            <TrendingUp className="size-4" />
          </div>
        </div>

        <div className="my-2">
          <h3
            className={cn(
              "numeric text-2xl sm:text-3xl font-bold tracking-tight",
              profit > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : profit < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground",
            )}
          >
            {mascaraSaldo(profit)}
          </h3>
        </div>

        {/* Rodapé: Margem e Status de Caixa */}
        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span>Margem: <strong className="font-semibold text-foreground">{marginPct.toFixed(0)}%</strong></span>
              <span className="text-muted-foreground/30 select-none">·</span>
              <span className="truncate">{netRevenue > 0 ? "Caixa positivo" : "Caixa estável"}</span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 4: META DO MÊS ──────────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between min-h-[145px] hover:shadow-lift hover:-translate-y-0.5 group cursor-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-normal">
            Meta do mês
          </span>
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/70 group-hover:text-primary group-hover:bg-primary/10 transition-colors shadow-2xs">
            <Target className="size-4" />
          </div>
        </div>

        <div className="my-2">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {metaDefinida
              ? (ocultarSaldos ? "R$ ••••••" : mascaraSaldo(netRevenue))
              : "0%"}
          </h3>
        </div>

        {/* Rodapé: Barra de Progresso ou Ação Limpa */}
        <div className="pt-2.5 border-t border-border/50 flex flex-col justify-center min-h-[26px]">
          {metaDefinida ? (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    metaAtingida ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${progressClamp}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">
                  Alvo: <strong className="font-semibold text-foreground">{ocultarSaldos ? "R$ ••••" : mascaraSaldo(goalTarget)}</strong>
                </span>
                {dailyTarget !== undefined && dailyTarget > 0 && !metaAtingida && (
                  <span className="font-medium text-primary shrink-0 ml-1">
                    {ocultarSaldos ? "R$ ••••" : mascaraSaldo(dailyTarget)}/dia
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ritmo diário</span>
              <Link
                to="/metas"
                className="font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                Definir meta <ChevronRight className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
