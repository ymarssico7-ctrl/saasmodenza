import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { brl } from "@/lib/format";
import { formatVariationHint } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PainelKpisBentoProps {
  revenue: number;
  netRevenue: number;
  prevRevenue: number;
  refunds: number;
  fisicaRevenue: number;
  onlineRevenue: number;
  totalPecasVendidas: number;
  ticketMedio: number;
  totalVendasCount: number;
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
  fisicaRevenue,
  onlineRevenue,
  totalPecasVendidas,
  ticketMedio,
  totalVendasCount,
  vitrineAtiva,
  pedidosNovosCount,
  pedidosEmSeparacaoCount,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  // Proporções dos canais
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 50;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 50;

  // Variação de faturamento vs mês anterior
  const variacaoValor = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const variacaoTexto = prevRevenue > 0 ? formatVariationHint(revenue, prevRevenue) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARD 1: Faturamento do Mês ────────────────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento do Mês
            </p>
            <h3 className="numeric mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {mascaraSaldo(revenue)}
            </h3>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
            <Wallet className="size-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60">
          {ocultarSaldos ? (
            <p className="text-xs text-muted-foreground font-mono">••••••••••••</p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                {prevRevenue > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center font-semibold rounded-md px-1.5 py-0.5 text-[11px]",
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
                )}
                {refunds > 0 ? (
                  <span className="text-muted-foreground truncate">
                    Líq: <strong>{brl(netRevenue)}</strong> (−{brl(refunds)} estornos)
                  </span>
                ) : (
                  <span className="text-muted-foreground">Total de entradas no caixa</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 2: Split de Canais (Físico vs Online) ─────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Divisão de Canais
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vitrineAtiva ? "Balcão físico vs Vitrine online" : "Balcão da loja física"}
            </p>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground shadow-2xs">
            <Store className="size-5" />
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* Métricas por canal */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-foreground shrink-0" />
              <span className="text-muted-foreground truncate">Loja Física:</span>
              <strong className="text-foreground shrink-0">
                {ocultarSaldos ? "••••" : mascaraSaldo(fisicaRevenue)}
              </strong>
            </div>
            {totalCanais > 0 && vitrineAtiva && (
              <span className="num-display font-semibold text-xs text-muted-foreground">
                {fisicaPct}%
              </span>
            )}
          </div>

          {vitrineAtiva && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground truncate">Vitrine Online:</span>
                <strong className="text-foreground shrink-0">
                  {ocultarSaldos ? "••••" : mascaraSaldo(onlineRevenue)}
                </strong>
              </div>
              {totalCanais > 0 && (
                <span className="num-display font-semibold text-xs text-primary">
                  {onlinePct}%
                </span>
              )}
            </div>
          )}

          {/* Barra de Progresso Segmentada em 2 cores */}
          {vitrineAtiva ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80 flex shadow-inner">
              {totalCanais === 0 ? (
                <div className="h-full w-full bg-border" />
              ) : (
                <>
                  <div
                    className="h-full bg-foreground transition-all duration-500"
                    style={{ width: `${fisicaPct}%` }}
                    title={`Física: ${fisicaPct}%`}
                  />
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${onlinePct}%` }}
                    title={`Online: ${onlinePct}%`}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="pt-2 text-xs text-muted-foreground">
              <span>100% das vendas registradas no balcão.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3: Peças Vendidas & Ticket Médio ─────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Peças Vendidas
            </p>
            <h3 className="numeric mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {totalPecasVendidas}{" "}
              <span className="text-lg font-normal text-muted-foreground">peças</span>
            </h3>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground shadow-2xs">
            <ShoppingBag className="size-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ticket Médio:</span>
            <strong className="text-foreground">
              {ocultarSaldos ? "R$ ••••" : mascaraSaldo(ticketMedio)}
            </strong>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {totalVendasCount > 0
              ? `${totalVendasCount} venda${totalVendasCount !== 1 ? "s" : ""} realizada${totalVendasCount !== 1 ? "s" : ""} no mês`
              : "Nenhuma venda registrada ainda"}
          </p>
        </div>
      </div>

      {/* ── CARD 4: Centro de Ação da Loja Online / Live Orders ────────────────── */}
      {vitrineAtiva ? (
        pedidosNovosCount > 0 ? (
          /* Alerta Pulsante: Pedidos Novos Aguardando Separação */
          <div className="panel relative flex flex-col justify-between p-6 border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card transition-all duration-300 hover:shadow-lift ring-1 ring-rose-500/20">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Pedidos da Vitrine
                  </p>
                </div>
                <h3 className="numeric mt-2 text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400">
                  {pedidosNovosCount}{" "}
                  <span className="text-sm font-semibold">
                    {pedidosNovosCount === 1 ? "novo" : "novos"}
                  </span>
                </h3>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                <ShoppingBag className="size-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-rose-500/15 flex items-center justify-between">
              <span className="text-xs text-rose-700/80 dark:text-rose-300 truncate">
                Aguardando separação
              </span>
              <Button
                asChild
                size="sm"
                className="h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 shadow-xs"
              >
                <Link to="/loja/pedidos">
                  Separar <ChevronRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        ) : pedidosEmSeparacaoCount > 0 ? (
          /* Pedidos em separação */
          <div className="panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-lift">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vitrine Online
                </p>
                <h3 className="numeric mt-2 text-2xl sm:text-3xl font-bold text-foreground">
                  {pedidosEmSeparacaoCount}{" "}
                  <span className="text-sm font-normal text-muted-foreground">em preparo</span>
                </h3>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
                <ShoppingBag className="size-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Prontos para despacho</span>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary">
                <Link to="/loja/pedidos">
                  Ver pedidos <ChevronRight className="size-3.5 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Tudo em dia na vitrine */
          <div className="panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-lift">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vitrine Online
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">Tudo em dia!</p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PackageCheck className="size-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {onlineRevenue > 0 ? (
                  <>
                    Online: <strong>{ocultarSaldos ? "••••" : mascaraSaldo(onlineRevenue)}</strong>
                  </>
                ) : (
                  "Nenhum pedido pendente"
                )}
              </span>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary">
                <Link to="/loja/pedidos">
                  Abrir <ChevronRight className="size-3.5 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Vitrine inativa: convite elegante para ativar */
        <div className="panel relative flex flex-col justify-between p-6 border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card transition-all duration-300 hover:shadow-lift">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Venda Online
              </p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">
                Link da Bio no Instagram
              </h3>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
              <Sparkles className="size-5" />
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crie seu catálogo online em 2 minutos e receba pedidos no WhatsApp.
            </p>
            <div className="mt-3">
              <Button
                asChild
                size="sm"
                className="h-8 w-full rounded-full gradient-primary text-xs font-semibold shadow-glow"
              >
                <Link to="/loja/configuracao">
                  <Sparkles className="size-3.5 mr-1" /> Ativar Vitrine
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
