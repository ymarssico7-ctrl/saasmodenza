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
import { brl, brlCompact } from "@/lib/format";
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
    <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-4">
      {/* ── CARD 1: FATURAMENTO TOTAL ────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-lift flex flex-col justify-between min-h-[155px] group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Faturamento Total
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <Wallet className="size-4.5" />
          </div>
        </div>

        <div className="my-2 sm:my-3">
          <h3 className="numeric font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>
        </div>

        {/* Rodapé Límpido: Balcão & Vitrine */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground min-h-[28px] whitespace-nowrap">
          {ocultarSaldos ? (
            <span className="font-mono text-xs">••••••••</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Store className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span>Balcão: <strong className="font-semibold text-foreground">{mascaraSaldo(fisicaRevenue)}</strong></span>
              </span>
              <span className="text-muted-foreground/30 select-none px-1">·</span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <ShoppingBag className={cn("size-3.5 shrink-0", pedidosNovosCount > 0 ? "text-rose-500" : "text-muted-foreground/70")} />
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
      <div className="panel p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-lift flex flex-col justify-between min-h-[155px] group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Saídas do Mês
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <Receipt className="size-4.5" />
          </div>
        </div>

        <div className="my-2 sm:my-3">
          <h3 className="numeric font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>
        </div>

        {/* Rodapé: Contas e Compras de Estoque */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground min-h-[28px] whitespace-nowrap">
          {ocultarSaldos ? (
            <span className="font-mono text-xs">••••••••</span>
          ) : (
            <>
              <span className="shrink-0">Contas: <strong className="font-semibold text-foreground">{mascaraSaldo(opexVal)}</strong></span>
              <span className="text-muted-foreground/30 select-none px-1">·</span>
              <span className="shrink-0">Estoque: <strong className="font-semibold text-foreground">{mascaraSaldo(estoqueVal)}</strong></span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 3: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
      <div className="panel p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-lift flex flex-col justify-between min-h-[155px] group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Sobra no Caixa (Lucro)
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <TrendingUp className="size-4.5" />
          </div>
        </div>

        <div className="my-2 sm:my-3">
          <h3
            className={cn(
              "numeric font-display text-3xl sm:text-4xl font-bold tracking-tight",
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
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground min-h-[28px] whitespace-nowrap">
          {ocultarSaldos ? (
            <span className="font-mono text-xs">••••••••</span>
          ) : (
            <>
              <span className="shrink-0">Margem: <strong className="font-semibold text-foreground">{marginPct.toFixed(0)}%</strong></span>
              <span className="text-muted-foreground/30 select-none px-1">·</span>
              <span className="inline-flex items-center gap-1 truncate font-medium text-foreground/80">
                <span className={cn("size-1.5 rounded-full shrink-0", profit >= 0 ? "bg-emerald-500" : "bg-rose-500")} />
                {profit > 0 ? "Caixa positivo" : profit === 0 ? "Caixa neutro" : "Atenção no caixa"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 4: META DO MÊS ──────────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-lift flex flex-col justify-between min-h-[155px] group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Meta do Mês
          </span>
          <div className="flex items-center gap-1.5">
            {metaDefinida && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight",
                  metaAtingida
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-primary/10 text-primary",
                )}
              >
                {progressClamp.toFixed(0)}%
              </span>
            )}
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform duration-200">
              <Target className="size-4.5" />
            </div>
          </div>
        </div>

        <div className="my-2 sm:my-3">
          <h3 className="numeric font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {metaDefinida
              ? (ocultarSaldos ? "R$ ••••••" : mascaraSaldo(netRevenue))
              : "0%"}
          </h3>
        </div>

        {/* Rodapé: Barra de Progresso ou Ação Limpa */}
        <div className="pt-3 border-t border-border/40 flex flex-col justify-center min-h-[28px]">
          {metaDefinida ? (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    metaAtingida ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${progressClamp}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground whitespace-nowrap">
                <span className="shrink-0" title={`Meta: ${brl(goalTarget)}`}>
                  Alvo: <strong className="font-semibold text-foreground">{ocultarSaldos ? "R$ ••••" : brlCompact(goalTarget)}</strong>
                </span>
                {dailyTarget !== undefined && dailyTarget > 0 && !metaAtingida && (
                  <span className="font-medium text-foreground/75 shrink-0 ml-1.5" title={`Necessário por dia útil: ${brl(dailyTarget)}`}>
                    {ocultarSaldos ? "R$ ••••" : brlCompact(dailyTarget)}/dia
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
                Definir meta <ChevronRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
