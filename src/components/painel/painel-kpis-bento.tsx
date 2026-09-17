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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARD 1: FATURAMENTO TOTAL ────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Faturamento Total
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground/80 shadow-2xs">
            <Wallet className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : refunds > 0 ? (
              <span>
                Líq: <strong className="font-medium text-foreground">{brl(netRevenue)}</strong>
              </span>
            ) : metaDefinida ? (
              <span>
                Meta:{" "}
                <strong className={cn("font-medium", metaAtingida ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                  {progressClamp.toFixed(0)}%
                </strong>{" "}
                de {brl(goalTarget)}
              </span>
            ) : (
              <span>Entradas do mês</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 2: CANAIS DE VENDA (DOIS PILARES SIMÉTRICOS COM CADÊNCIA HEROICA) ── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canais de Venda
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground/80 shadow-2xs">
            <Store className="size-4.5" />
          </div>
        </div>

        {/* Dois Pilares Sólidos Lado a Lado */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 divide-x divide-border/60">
          {/* Pilar Balcão */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Store className="size-3 text-muted-foreground/70" />
              Balcão
            </span>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
              {mascaraSaldo(fisicaRevenue)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {totalCanais > 0 ? `${fisicaPct}% físico` : "Presencial"}
            </p>
          </div>

          {/* Pilar Vitrine */}
          <div className="pl-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <ShoppingBag
                className={cn(
                  "size-3",
                  pedidosNovosCount > 0 ? "text-rose-500" : "text-muted-foreground/70",
                )}
              />
              Vitrine
              {pedidosNovosCount > 0 && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
                </span>
              )}
            </span>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
              {mascaraSaldo(onlineRevenue)}
            </p>
            <div className="text-[10px] mt-0.5 truncate">
              {pedidosNovosCount > 0 ? (
                <Link
                  to="/loja/pedidos"
                  className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center"
                >
                  {pedidosNovosCount} a separar <ChevronRight className="size-2.5 ml-0.5" />
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {totalCanais > 0 ? `${onlinePct}% digital` : "Instagram & Zap"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: SAÍDAS DO MÊS ────────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saídas do Mês
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground/80 shadow-2xs">
            <Receipt className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : opexVal > 0 || estoqueVal > 0 ? (
              <span>
                Contas <strong className="font-medium text-foreground">{brl(opexVal)}</strong> · Estoque{" "}
                <strong className="font-medium text-foreground">{brl(estoqueVal)}</strong>
              </span>
            ) : (
              <span>Contas e compras de estoque</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 4: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobra no Caixa
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                profit >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
            >
              {profit >= 0 ? "Positivo" : "Atenção"}
            </span>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground/80 shadow-2xs">
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

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : netRevenue > 0 ? (
              <span>
                Margem livre de{" "}
                <strong className="font-medium text-foreground">{marginPct.toFixed(0)}%</strong>{" "}
                no caixa
              </span>
            ) : (
              <span>Lucro livre após despesas</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
