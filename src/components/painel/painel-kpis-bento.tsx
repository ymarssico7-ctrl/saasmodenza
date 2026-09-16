import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Package,
  Receipt,
  Sparkles,
  Target,
  TrendingDown,
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
  expenses?: number;      // OPEX puro (sem estoque, sem prolabore)
  stockPurchases?: number;
  // ── Lucro ─────────────────────────────────────────────────────────────────
  profit: number;
  operatingProfit: number;
  marginPct: number;
  // ── Canais (usados internamente pelo card de Faturamento) ─────────────────
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
  goalProgress: number;   // 0-100
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

  // ── Proporção dos canais (para sub-linha do Card 1) ────────────────────────
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct   = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 100;
  const onlinePct   = totalCanais > 0 ? 100 - fisicaPct : 0;

  // ── Barra de progresso da meta (clamp 0-100) ──────────────────────────────
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const metaAtingida  = progressClamp >= 100;
  const metaDefinida  = goalTarget > 0;

  // ── Despesas exibidas no Card 2 ───────────────────────────────────────────
  // Preferimos mostrar totalExpenses (saídas brutas do mês) para o gestor
  // ter o número real de caixa saído — sem filtros contábeis invisíveis.
  const despesasExibidas = totalExpenses;
  const opexVal          = expenses ?? 0;
  const estoqueVal       = stockPurchases ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      {/* ── CARD 1 ─ FATURAMENTO + META DO MÊS ────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[164px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Faturamento do Mês
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
            <Wallet className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(revenue)}
          </h3>

          {/* Sub-linha: R$ real por canal */}
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : totalCanais > 0 && vitrineAtiva ? (
              <span>
                Balcão{" "}
                <strong className="font-medium text-foreground">{brlCompact(fisicaRevenue)}</strong>
                {" · "}Online{" "}
                <strong className="font-medium text-foreground">{brlCompact(onlineRevenue)}</strong>
              </span>
            ) : refunds > 0 ? (
              <span>
                Líq:{" "}
                <strong className="font-medium text-foreground">{brl(netRevenue)}</strong>
              </span>
            ) : (
              <span>Total consolidado da loja</span>
            )}
          </div>

          {/* Barra de Meta */}
          <div className="mt-3 space-y-1">
            {metaDefinida ? (
              <>
                {/* Track */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      metaAtingida
                        ? "bg-emerald-500"
                        : progressClamp >= 70
                          ? "bg-primary"
                          : progressClamp >= 40
                            ? "bg-amber-400"
                            : "bg-rose-400",
                    )}
                    style={{ width: `${progressClamp}%` }}
                  />
                </div>
                {/* Legenda da Meta */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Target className="size-2.5" />
                    {ocultarSaldos ? "••••" : `Meta: ${brl(goalTarget)}`}
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      metaAtingida
                        ? "text-emerald-600 dark:text-emerald-400"
                        : progressClamp >= 70
                          ? "text-primary"
                          : progressClamp >= 40
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {progressClamp.toFixed(0)}%
                  </span>
                </div>
                {/* Ritmo diário necessário */}
                {!metaAtingida && dailyTarget && dailyTarget > 0 && !ocultarSaldos && (
                  <p className="text-[10px] text-muted-foreground">
                    Precisa de{" "}
                    <strong className="text-foreground">{brl(dailyTarget)}/dia</strong>{" "}
                    para bater a meta
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Target className="size-2.5" />
                Sem meta definida para o mês
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 2 ─ DESPESAS DO MÊS ─────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[164px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saídas do Mês
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
            <Receipt className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(despesasExibidas)}
          </h3>

          <div className="mt-1 text-xs text-muted-foreground">
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
              <span>Todas as saídas do período</span>
            )}
          </div>

          {/* Relação despesa/receita */}
          {!ocultarSaldos && revenue > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mb-1">
                <span className="flex items-center gap-1">
                  <TrendingDown className="size-2.5" />
                  {Math.round((despesasExibidas / revenue) * 100)}% da receita consumida
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    despesasExibidas / revenue > 0.85
                      ? "bg-rose-500"
                      : despesasExibidas / revenue > 0.65
                        ? "bg-amber-400"
                        : "bg-emerald-500",
                  )}
                  style={{
                    width: `${Math.min((despesasExibidas / revenue) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3 ─ SOBRA NO CAIXA (Lucro Real) ───────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[164px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobra no Caixa
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : netRevenue > 0 ? (
              <span>
                Margem livre de{" "}
                <strong className="font-medium text-foreground">
                  {marginPct.toFixed(0)}%
                </strong>{" "}
                da receita
              </span>
            ) : (
              <span>Lucro livre após todas as despesas</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 4 ─ PEÇAS VENDIDAS + TICKET MÉDIO (Operação) ────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[164px]">
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
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "bg-secondary text-foreground",
            )}
          >
            <Package className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {totalPecasVendidas > 0 ? (
              <>
                {totalPecasVendidas}
                <span className="text-base font-medium text-muted-foreground ml-1">peças</span>
              </>
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">Sem vendas</span>
            )}
          </h3>

          <div className="mt-1 text-xs text-muted-foreground">
            {pedidosNovosCount > 0 ? (
              <Link
                to="/loja/pedidos"
                className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
              >
                ● {pedidosNovosCount}{" "}
                {pedidosNovosCount === 1 ? "pedido a separar" : "pedidos a separar"}
                <ChevronRight className="size-3" />
              </Link>
            ) : ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : ticketMedio > 0 ? (
              <span>
                Ticket médio{" "}
                <strong className="font-medium text-foreground">{brl(ticketMedio)}</strong>
              </span>
            ) : vitrineAtiva ? (
              <Link
                to="/loja/configuracao"
                className="text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                <Sparkles className="size-3" /> Ver vitrine online
              </Link>
            ) : (
              <span>Nenhuma venda registrada</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
