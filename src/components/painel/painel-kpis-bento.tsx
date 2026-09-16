import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  TrendingDown,
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
  expenses?: number; // OPEX puro (sem estoque, sem prolabore)
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
  // ── Proporções dos canais ──────────────────────────────────────────────────
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
      {/* ── CARD 1: O "MASTER BENTO" (2 COLUNAS DE LARGURA) ────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 sm:col-span-2 xl:col-span-2 flex flex-col justify-between">
        {/* Topo: Faturamento Consolidado + Widget de Meta */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Faturamento Consolidado
                </span>
                {refunds > 0 && !ocultarSaldos && (
                  <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground font-medium">
                    Líq: {brl(netRevenue)}
                  </span>
                )}
              </div>
              <h3 className="numeric text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {mascaraSaldo(revenue)}
              </h3>
            </div>

            {/* Widget de Meta Integrado */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-2.5 sm:p-3 min-w-[170px] sm:min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="size-3 text-primary" />
                  <span>Meta</span>
                </span>
                <span
                  className={cn(
                    "font-bold text-xs",
                    metaDefinida
                      ? metaAtingida
                        ? "text-emerald-600 dark:text-emerald-400"
                        : progressClamp >= 70
                          ? "text-primary"
                          : progressClamp >= 40
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      : "text-muted-foreground",
                  )}
                >
                  {metaDefinida ? `${progressClamp.toFixed(0)}%` : "Não definida"}
                </span>
              </div>

              {metaDefinida ? (
                <>
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
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{ocultarSaldos ? "••••" : brl(goalTarget)}</span>
                    {!metaAtingida && dailyTarget && dailyTarget > 0 && !ocultarSaldos && (
                      <span className="font-medium text-foreground">
                        +{brl(dailyTarget)}/dia
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-muted-foreground">
                  Cadastre sua meta em Metas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Base: As Duas Cápsulas Dedicadas (Loja Física vs. Vitrine Online) com Espaço e Respiro */}
        <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cápsula Loja Física */}
          <div className="rounded-2xl border border-border/50 bg-secondary/30 p-3.5 sm:p-4 transition-colors hover:bg-secondary/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Store className="size-3.5 text-foreground/70" />
                Loja Física
              </span>
              <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground shadow-2xs border border-border/40">
                {totalCanais > 0 ? `${fisicaPct}%` : "Balcão"}
              </span>
            </div>

            <div className="mt-2">
              <p className="numeric text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {mascaraSaldo(fisicaRevenue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Vendas registradas no balcão
              </p>
            </div>
          </div>

          {/* Cápsula Vitrine Online */}
          <div
            className={cn(
              "rounded-2xl border p-3.5 sm:p-4 transition-colors flex flex-col justify-between",
              pedidosNovosCount > 0
                ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                : "border-border/50 bg-secondary/30 hover:bg-secondary/50",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <ShoppingBag
                  className={cn(
                    "size-3.5",
                    pedidosNovosCount > 0 ? "text-rose-500" : "text-foreground/70",
                  )}
                />
                Vitrine Online
                {pedidosNovosCount > 0 && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold shadow-2xs border",
                  pedidosNovosCount > 0
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : "bg-background/80 text-muted-foreground border-border/40",
                )}
              >
                {pedidosNovosCount > 0
                  ? `${pedidosNovosCount} pendente${pedidosNovosCount > 1 ? "s" : ""}`
                  : totalCanais > 0
                    ? `${onlinePct}%`
                    : "Digital"}
              </span>
            </div>

            <div className="mt-2">
              <p className="numeric text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {mascaraSaldo(onlineRevenue)}
              </p>
              <div className="text-[11px] mt-0.5">
                {pedidosNovosCount > 0 ? (
                  <Link
                    to="/loja/pedidos"
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Separar pedidos agora <ChevronRight className="size-3" />
                  </Link>
                ) : vitrineAtiva ? (
                  <span className="text-muted-foreground">Vendas no Instagram e Zap</span>
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
          </div>
        </div>
      </div>

      {/* ── CARD 2: SAÍDAS DO MÊS (1 COLUNA) ─────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between">
        <div>
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

            <div className="mt-1.5 text-xs text-muted-foreground">
              {ocultarSaldos ? (
                <span className="font-mono">••••••••</span>
              ) : opexVal > 0 || estoqueVal > 0 ? (
                <span>
                  Contas <strong className="font-medium text-foreground">{brl(opexVal)}</strong>
                  {" · "}Estoque{" "}
                  <strong className="font-medium text-foreground">{brl(estoqueVal)}</strong>
                </span>
              ) : (
                <span>Todas as saídas do período</span>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Pressão Financeira */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-1.5">
            <span className="flex items-center gap-1">
              <TrendingDown className="size-3 text-rose-500" />
              Consumo da receita
            </span>
            <span className="font-bold text-foreground">
              {revenue > 0 ? `${Math.round((despesasExibidas / revenue) * 100)}%` : "0%"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                revenue > 0 && despesasExibidas / revenue > 0.85
                  ? "bg-rose-500"
                  : revenue > 0 && despesasExibidas / revenue > 0.65
                    ? "bg-amber-400"
                    : "bg-emerald-500",
              )}
              style={{
                width: `${revenue > 0 ? Math.min((despesasExibidas / revenue) * 100, 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {revenue > 0 && despesasExibidas / revenue > 0.85
              ? "Atenção: saídas elevadas no mês"
              : "Despesas sob controle"}
          </p>
        </div>
      </div>

      {/* ── CARD 3: SOBRA NO CAIXA (1 COLUNA) ────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between">
        <div>
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

          <div className="mt-3">
            <h3
              className={cn(
                "numeric text-2xl sm:text-3xl font-bold tracking-tight",
                profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {mascaraSaldo(profit)}
            </h3>

            <div className="mt-1.5 text-xs text-muted-foreground">
              {ocultarSaldos ? (
                <span className="font-mono">••••••••</span>
              ) : netRevenue > 0 ? (
                <span>
                  Margem real de{" "}
                  <strong className="font-medium text-foreground">
                    {marginPct.toFixed(0)}%
                  </strong>{" "}
                  livre
                </span>
              ) : (
                <span>Lucro livre após todas as despesas</span>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Retenção de Caixa */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-1.5">
            <span>Margem líquida</span>
            <span className="font-bold text-foreground">
              {marginPct > 0 ? `${marginPct.toFixed(0)}% livre` : "0%"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{
                width: `${Math.min(Math.max(marginPct, 0), 100)}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {profit >= 0
              ? "Caixa saudável após contas e estoque"
              : "Atenção: saídas superaram entradas"}
          </p>
        </div>
      </div>
    </div>
  );
}
