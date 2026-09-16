import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { brl } from "@/lib/format";
import { formatVariationHint } from "@/lib/finance";
import { cn } from "@/lib/utils";

export interface PainelKpisBentoProps {
  revenue: number;
  netRevenue: number;
  prevRevenue: number;
  refunds: number;
  profit: number;
  operatingProfit: number;
  marginPct: number;
  fisicaRevenue: number;
  onlineRevenue: number;
  vitrineAtiva: boolean;
  pedidosNovosCount: number;
  pedidosEmSeparacaoCount: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelKpisBento({
  revenue,
  netRevenue,
  prevRevenue,
  refunds,
  profit,
  marginPct,
  fisicaRevenue,
  onlineRevenue,
  vitrineAtiva,
  pedidosNovosCount,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  // Proporções dos canais
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 100;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 0;

  // Variação de faturamento vs mês anterior
  const variacaoValor = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const variacaoTexto = prevRevenue > 0 ? formatVariationHint(revenue, prevRevenue) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARD 1: Faturamento Total (Consolidado) ──────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[148px]">
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

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : prevRevenue > 0 ? (
              <span
                className={cn(
                  "inline-flex items-center font-semibold rounded-md px-1.5 py-0.2 text-[11px]",
                  variacaoValor >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                )}
              >
                {variacaoValor >= 0 ? (
                  <ArrowUpRight className="size-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="size-3 mr-0.5" />
                )}
                {variacaoTexto}
              </span>
            ) : (
              <span>Balcão + Vitrine</span>
            )}
            {refunds > 0 && !ocultarSaldos && (
              <span className="text-[11px]">
                Líq: {brl(netRevenue)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 2: Sobra no Caixa (Lucro Real Líquido) ────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[148px]">
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

          <div className="mt-1 text-xs text-muted-foreground">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : netRevenue > 0 ? (
              <span>Margem real de <strong>{marginPct.toFixed(0)}%</strong> livre</span>
            ) : (
              <span>Lucro livre após despesas</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 3: Loja Física (Balcão) ─────────────────────────────────────── */}
      <div className="panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[148px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Loja Física
          </span>
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground shadow-2xs">
            <Store className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mascaraSaldo(fisicaRevenue)}
          </h3>

          <div className="mt-1 text-xs text-muted-foreground">
            {ocultarSaldos ? (
              <span className="font-mono">••••••••</span>
            ) : totalCanais > 0 && vitrineAtiva ? (
              <span><strong>{fisicaPct}%</strong> das vendas no balcão</span>
            ) : (
              <span>Vendas registradas no balcão</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 4: Vitrine Online (Digital) ─────────────────────────────────── */}
      <div
        className={cn(
          "panel p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 flex flex-col justify-between min-h-[148px]",
          pedidosNovosCount > 0 &&
            "border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card ring-1 ring-rose-500/20",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vitrine Online
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
            <ShoppingBag className="size-4.5" />
          </div>
        </div>

        <div className="mt-3">
          {vitrineAtiva ? (
            <>
              <h3 className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {mascaraSaldo(onlineRevenue)}
              </h3>

              <div className="mt-1 text-xs">
                {pedidosNovosCount > 0 ? (
                  <Link
                    to="/loja/pedidos"
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    ● {pedidosNovosCount} {pedidosNovosCount === 1 ? "pedido a separar" : "pedidos a separar"}
                    <ChevronRight className="size-3" />
                  </Link>
                ) : ocultarSaldos ? (
                  <span className="font-mono text-muted-foreground">••••••••</span>
                ) : totalCanais > 0 ? (
                  <span className="text-muted-foreground">
                    <strong className="text-primary">{onlinePct}%</strong> das vendas digitais
                  </span>
                ) : (
                  <span className="text-muted-foreground">Vendas no Instagram e Zap</span>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-muted-foreground">
                Desativada
              </h3>
              <div className="mt-1 text-xs">
                <Link
                  to="/loja/configuracao"
                  className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="size-3" /> Ativar vitrine online
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
