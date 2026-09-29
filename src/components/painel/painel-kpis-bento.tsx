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
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* ── CARD 1: FATURAMENTO TOTAL ────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-colors duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
            Faturamento Total
          </span>
          <Wallet className="size-4 text-muted-foreground/45 shrink-0" />
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>
        </div>

        {/* Rodapé: Balcão & Vitrine */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 shrink-0">
                <Store className="size-3 text-muted-foreground/60 shrink-0" />
                <span>Balcão: <strong className="font-semibold text-foreground">{mascaraSaldo(fisicaRevenue)}</strong></span>
              </span>
              <span className="text-muted-foreground/30 select-none px-0.5">·</span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <ShoppingBag className={cn("size-3 shrink-0", pedidosNovosCount > 0 ? "text-primary" : "text-muted-foreground/60")} />
                <span>Vitrine: <strong className="font-semibold text-foreground">{mascaraSaldo(onlineRevenue)}</strong></span>
                {pedidosNovosCount > 0 && (
                  <Link to="/loja/pedidos" className="text-[10px] font-bold text-primary hover:underline">
                    ({pedidosNovosCount})
                  </Link>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 2: SAÍDAS DO MÊS ────────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-colors duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
            Saídas do Mês
          </span>
          <Receipt className="size-4 text-muted-foreground/45 shrink-0" />
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>
        </div>

        {/* Rodapé: Contas e Compras de Estoque */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="shrink-0">Contas: <strong className="font-semibold text-foreground">{mascaraSaldo(opexVal)}</strong></span>
              <span className="text-muted-foreground/30 select-none px-0.5">·</span>
              <span className="shrink-0">Estoque: <strong className="font-semibold text-foreground">{mascaraSaldo(estoqueVal)}</strong></span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 3: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-colors duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
            Sobra no Caixa
          </span>
          <TrendingUp className="size-4 text-muted-foreground/45 shrink-0" />
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(profit)}
          </h3>
        </div>

        {/* Rodapé: Margem e Status com pílula refinada */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground min-h-[26px]">
          {ocultarSaldos ? (
            <span className="font-mono">••••••••</span>
          ) : (
            <>
              <span className="shrink-0">Margem: <strong className="font-semibold text-foreground">{marginPct.toFixed(0)}%</strong></span>
              <span className="text-muted-foreground/30 select-none px-0.5">·</span>
              <span className={cn(
                "inline-flex items-center gap-1 font-medium",
                profit > 0 ? "text-emerald-700 dark:text-emerald-400" : profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
              )}>
                {profit > 0 ? "Caixa positivo" : profit === 0 ? "Caixa neutro" : "Atenção no caixa"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 4: META DO MÊS ──────────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 transition-colors duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
            Meta do Mês
          </span>
          <div className="flex items-center gap-1.5">
            {metaDefinida && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {goalProgress.toFixed(1)}%
              </span>
            )}
            <Target className="size-4 text-muted-foreground/45 shrink-0" />
          </div>
        </div>

        <div className="my-1.5">
          <h3 className="numeric text-2xl font-bold tracking-tight text-foreground">
            {metaDefinida
              ? (ocultarSaldos ? "R$ ••••••" : mascaraSaldo(netRevenue))
              : "0%"}
          </h3>
        </div>

        {/* Rodapé: Barra de Progresso ou Ação Limpa */}
        <div className="pt-2 border-t border-border/50 flex flex-col justify-center min-h-[26px]">
          {metaDefinida ? (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-secondary/80 border border-border/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    metaAtingida ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${Math.max(progressClamp, progressClamp > 0 ? 2 : 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground whitespace-nowrap">
                <span className="shrink-0" title={`Meta: ${brl(goalTarget)}`}>
                  Alvo: <strong className="font-semibold text-foreground">{ocultarSaldos ? "R$ ••••" : brlCompact(goalTarget)}</strong>
                </span>
                {dailyTarget !== undefined && dailyTarget > 0 && !metaAtingida && (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/75 shrink-0" title={`Necessário por dia útil: ${brl(dailyTarget)}`}>
                    <span className="text-muted-foreground/30 select-none">·</span>
                    <span>Ritmo: <strong className="font-semibold text-foreground">{ocultarSaldos ? "R$ ••••" : brlCompact(dailyTarget)}</strong>/dia</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px]">
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
