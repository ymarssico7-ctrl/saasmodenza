import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Package,
  Receipt,
  ShoppingBag,
  Sparkles,
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
  totalPecasVendidas,
  ticketMedio,
  pedidosNovosCount,
  goalTarget,
  goalProgress,
  dailyTarget,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  // ── Cálculos dos canais ────────────────────────────────────────────────────
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 100;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 0;

  // ── Meta do Mês ───────────────────────────────────────────────────────────
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const metaAtingida = progressClamp >= 100;
  const metaDefinida = goalTarget > 0;

  // ── Saídas / Despesas ─────────────────────────────────────────────────────
  const despesasExibidas = totalExpenses;
  const opexVal = expenses ?? 0;
  const estoqueVal = stockPurchases ?? 0;

  return (
    <div className="space-y-4">
      {/* ── 1. A TRINDADE FINANCEIRA (3 CARDS MESTRES COM RESPIRO ABSOLUTO) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── CARD 1: FATURAMENTO DO MÊS ──────────────────────────────────── */}
        <div className="panel p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento do Mês
            </span>
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
              <Wallet className="size-4.5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="numeric text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {mascaraSaldo(revenue)}
            </h3>

            <div className="mt-2 text-xs text-muted-foreground">
              {ocultarSaldos ? (
                <span className="font-mono">••••••••</span>
              ) : refunds > 0 ? (
                <span>
                  Líquido:{" "}
                  <strong className="font-medium text-foreground">{brl(netRevenue)}</strong>{" "}
                  após estornos
                </span>
              ) : (
                <span>Entradas consolidadas no período</span>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between">
            {metaDefinida ? (
              <span>
                {metaAtingida ? (
                  <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Meta do mês atingida! ({progressClamp.toFixed(0)}%)
                  </strong>
                ) : (
                  <span>
                    Ritmo:{" "}
                    <strong className="font-semibold text-foreground">
                      {progressClamp.toFixed(0)}%
                    </strong>{" "}
                    da meta
                  </span>
                )}
              </span>
            ) : (
              <span>Meta do mês ainda não definida</span>
            )}
            {dailyTarget && dailyTarget > 0 && !metaAtingida && !ocultarSaldos ? (
              <span className="text-muted-foreground">+{brl(dailyTarget)}/dia</span>
            ) : null}
          </div>
        </div>

        {/* ── CARD 2: SAÍDAS DO MÊS ────────────────────────────────────────── */}
        <div className="panel p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saídas do Mês
            </span>
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
              <Receipt className="size-4.5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="numeric text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {mascaraSaldo(despesasExibidas)}
            </h3>

            <div className="mt-2 text-xs text-muted-foreground">
              {ocultarSaldos ? (
                <span className="font-mono">••••••••</span>
              ) : opexVal > 0 || estoqueVal > 0 ? (
                <span>
                  Contas{" "}
                  <strong className="font-medium text-foreground">{brl(opexVal)}</strong>
                  {" · "}Estoque{" "}
                  <strong className="font-medium text-foreground">{brl(estoqueVal)}</strong>
                </span>
              ) : (
                <span>Todas as despesas e compras do mês</span>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground">
            {revenue > 0 ? (
              <span>
                Consumo:{" "}
                <strong className="font-semibold text-foreground">
                  {Math.round((despesasExibidas / revenue) * 100)}%
                </strong>{" "}
                da receita do período
              </span>
            ) : (
              <span>Nenhuma saída registrada hoje</span>
            )}
          </div>
        </div>

        {/* ── CARD 3: SOBRA NO CAIXA (LUCRO REAL) ─────────────────────────── */}
        <div className="panel p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px] sm:col-span-2 lg:col-span-1">
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

          <div className="mt-4">
            <h3
              className={cn(
                "numeric text-3xl sm:text-4xl font-bold tracking-tight",
                profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {mascaraSaldo(profit)}
            </h3>

            <div className="mt-2 text-xs text-muted-foreground">
              {ocultarSaldos ? (
                <span className="font-mono">••••••••</span>
              ) : netRevenue > 0 ? (
                <span>
                  Margem livre de{" "}
                  <strong className="font-medium text-foreground">
                    {marginPct.toFixed(0)}%
                  </strong>{" "}
                  retida no caixa
                </span>
              ) : (
                <span>Lucro líquido livre após contas e estoque</span>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground">
            {profit >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ● Caixa saudável disponível para o lojista
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                ● Atenção: saídas superaram entradas no mês
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. A FITA ZEN OMNICHANNEL (CANAIS & OPERAÇÃO EM UMA LINHA FLUIDA) ── */}
      <div className="panel p-3.5 sm:p-4 transition-all duration-300 hover:shadow-soft">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Estação 1: Loja Física */}
          <div className="pt-2 md:pt-0 md:px-3 first:pt-0 first:px-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Store className="size-3.5 text-foreground/70" />
              <span>Loja Física</span>
              <span className="text-[10px] text-muted-foreground/60">
                {totalCanais > 0 ? `(${fisicaPct}%)` : ""}
              </span>
            </div>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
              {mascaraSaldo(fisicaRevenue)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Vendas no balcão
            </p>
          </div>

          {/* Estação 2: Vitrine Online */}
          <div className="pt-2 md:pt-0 md:px-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <ShoppingBag
                className={cn(
                  "size-3.5",
                  pedidosNovosCount > 0 ? "text-rose-500" : "text-foreground/70",
                )}
              />
              <span>Vitrine Online</span>
              {pedidosNovosCount > 0 && (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                </span>
              )}
            </div>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
              {mascaraSaldo(onlineRevenue)}
            </p>
            <div className="text-[11px] mt-0.5 truncate">
              {pedidosNovosCount > 0 ? (
                <Link
                  to="/loja/pedidos"
                  className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
                >
                  {pedidosNovosCount} a separar <ChevronRight className="size-3" />
                </Link>
              ) : vitrineAtiva ? (
                <span className="text-muted-foreground">Instagram & Zap</span>
              ) : (
                <Link
                  to="/loja/configuracao"
                  className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="size-3" /> Ativar vitrine
                </Link>
              )}
            </div>
          </div>

          {/* Estação 3: Meta do Mês */}
          <div className="pt-2 md:pt-0 md:px-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Target className="size-3.5 text-foreground/70" />
              <span>Meta do Mês</span>
            </div>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
              {metaDefinida ? (
                ocultarSaldos ? (
                  "••••••••"
                ) : (
                  brl(goalTarget)
                )
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">Sem meta</span>
              )}
            </p>
            <div className="text-[11px] mt-0.5 truncate">
              {metaDefinida ? (
                <span
                  className={cn(
                    "font-semibold",
                    metaAtingida
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {progressClamp.toFixed(0)}% concluída
                </span>
              ) : (
                <Link
                  to="/metas"
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  Definir meta <ChevronRight className="size-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Estação 4: Peças & Giro */}
          <div className="pt-2 md:pt-0 md:px-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Package className="size-3.5 text-foreground/70" />
              <span>Peças Vendidas</span>
            </div>
            <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
              {totalPecasVendidas > 0 ? (
                <>
                  {totalPecasVendidas} <span className="text-xs font-normal text-muted-foreground">un.</span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">0 peças</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Ticket: <strong className="font-medium text-foreground">{ticketMedio > 0 ? brl(ticketMedio) : "R$ 0,00"}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
