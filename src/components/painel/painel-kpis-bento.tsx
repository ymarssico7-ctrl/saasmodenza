import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Copy,
  ExternalLink,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
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
  profit: number;
  operatingProfit: number;
  marginPct: number;
  fisicaRevenue: number;
  onlineRevenue: number;
  totalPecasVendidas: number;
  ticketMedio: number;
  totalVendasCount: number;
  vitrineAtiva: boolean;
  storeSlug?: string | null | undefined;
  storeName?: string | null | undefined;
  pedidosNovosCount: number;
  pedidosEmSeparacaoCount: number;
  pedidosNovosValor?: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelKpisBento({
  revenue,
  netRevenue,
  prevRevenue,
  refunds,
  profit,
  operatingProfit,
  marginPct,
  fisicaRevenue,
  onlineRevenue,
  totalPecasVendidas,
  ticketMedio,
  totalVendasCount,
  vitrineAtiva,
  storeSlug,
  storeName,
  pedidosNovosCount,
  pedidosEmSeparacaoCount,
  pedidosNovosValor = 0,
  ocultarSaldos,
  mascaraSaldo,
}: PainelKpisBentoProps) {
  const [copied, setCopied] = React.useState(false);

  // Proporções dos canais
  const totalCanais = fisicaRevenue + onlineRevenue;
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 100;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 0;

  // Variação de faturamento vs mês anterior
  const variacaoValor = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const variacaoTexto = prevRevenue > 0 ? formatVariationHint(revenue, prevRevenue) : null;

  // Normalização da URL da Vitrine
  const cleanSlug = React.useMemo(() => {
    if (storeSlug && storeSlug.toLowerCase() !== "boutique") return storeSlug;
    if (storeName && storeName.trim()) {
      return storeName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    }
    return "minha-loja";
  }, [storeSlug, storeName]);

  const vitrineUrl = `vestui.app/vitrine/${cleanSlug}`;
  const fullUrl = `https://${vitrineUrl}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── CARD 1: Faturamento Consolidado ───────────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faturamento Total
              </p>
              {vitrineAtiva && (
                <span className="rounded-md bg-secondary px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                  Física + Online
                </span>
              )}
            </div>
            <h3 className="numeric mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {mascaraSaldo(revenue)}
            </h3>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground shadow-2xs">
            <Wallet className="size-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          {ocultarSaldos ? (
            <span className="font-mono text-muted-foreground">••••••••</span>
          ) : prevRevenue > 0 ? (
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
          ) : (
            <span className="text-muted-foreground">Mês corrente</span>
          )}

          {refunds > 0 && !ocultarSaldos && (
            <span className="text-[11px] text-muted-foreground">
              Líq: {brl(netRevenue)}
            </span>
          )}
        </div>
      </div>

      {/* ── CARD 2: Sobra no Caixa (Lucro Real) ────────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sobra no Caixa
              </p>
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
            <h3
              className={cn(
                "numeric mt-2 text-2xl sm:text-3xl font-bold tracking-tight",
                profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {mascaraSaldo(profit)}
            </h3>
          </div>
          <div
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl shadow-2xs",
              profit >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            )}
          >
            <TrendingUp className="size-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          {ocultarSaldos ? (
            <span className="font-mono text-muted-foreground">••••••••</span>
          ) : (
            <>
              <span className="text-muted-foreground">
                {netRevenue > 0 ? `Margem livre: ${marginPct.toFixed(0)}%` : "Livre no bolso"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Pós-custos e pró-labore
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CARD 3: Peças Vendidas & Ticket Médio ─────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
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

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ticket Médio:</span>
          <strong className="text-foreground font-semibold">
            {ocultarSaldos ? "R$ ••••" : mascaraSaldo(ticketMedio)}
          </strong>
        </div>
      </div>

      {/* ── CARD 4: Canais de Venda (Loja Física vs Vitrine Online) ────────────── */}
      {vitrineAtiva ? (
        <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
          {/* Cabeçalho do Card com Status de Pedidos */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Canais de Venda
                </p>
                {pedidosNovosCount > 0 && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                )}
              </div>

              {/* Valores dos 2 Canais Lado a Lado (Física e Online) */}
              <div className="mt-2 space-y-1">
                {/* Linha 1: Loja Física */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="size-2 rounded-full bg-slate-500 dark:bg-slate-400 shrink-0" />
                    <span className="text-muted-foreground truncate">Loja Física:</span>
                    <strong className="num-display font-semibold text-foreground shrink-0">
                      {ocultarSaldos ? "••••" : mascaraSaldo(fisicaRevenue)}
                    </strong>
                  </div>
                  {totalCanais > 0 && (
                    <span className="num-display font-medium text-[11px] text-muted-foreground">
                      {fisicaPct}%
                    </span>
                  )}
                </div>

                {/* Linha 2: Vitrine Online */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground truncate">Vitrine Online:</span>
                    <strong className="num-display font-semibold text-foreground shrink-0">
                      {ocultarSaldos ? "••••" : mascaraSaldo(onlineRevenue)}
                    </strong>
                  </div>
                  {totalCanais > 0 && (
                    <span className="num-display font-semibold text-[11px] text-primary">
                      {onlinePct}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground shadow-2xs">
              <Store className="size-5" />
            </div>
          </div>

          {/* Barra de Progresso Bicolor e Rodapé Integrado */}
          <div className="mt-3 space-y-2">
            {/* Barra segmentada Física vs Online */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80 flex shadow-inner">
              {totalCanais === 0 ? (
                <div className="h-full w-full bg-border" />
              ) : (
                <>
                  <div
                    className="h-full bg-slate-500 dark:bg-slate-400 transition-all duration-500"
                    style={{ width: `${fisicaPct}%` }}
                    title={`Loja Física: ${fisicaPct}%`}
                  />
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${onlinePct}%` }}
                    title={`Vitrine Online: ${onlinePct}%`}
                  />
                </>
              )}
            </div>

            {/* Rodapé: Alerta de Pedidos ou Link Rápido */}
            <div className="pt-2 border-t border-border/60">
              {pedidosNovosCount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 truncate">
                    ● {pedidosNovosCount} {pedidosNovosCount === 1 ? "pedido a separar" : "pedidos a separar"}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    className="h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2.5 shadow-xs font-semibold"
                  >
                    <Link to="/loja/pedidos">
                      Separar <ChevronRight className="size-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-muted-foreground font-mono text-[10px]">
                      {vitrineUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 text-primary hover:text-primary/80 transition-colors cursor-pointer"
                      title="Copiar link da vitrine"
                    >
                      <Copy className="size-3" />
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Abrir vitrine em nova aba"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <Link
                    to="/loja"
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground font-medium transition-colors ml-1"
                  >
                    Gerenciar ➔
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Vitrine inativa: Canal Físico exclusivo com opção de ativar vitrine */
        <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Canais de Venda
              </p>
              <h3 className="numeric mt-2 text-2xl font-bold tracking-tight text-foreground">
                {mascaraSaldo(revenue)}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                100% vendas no balcão físico
              </p>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground shadow-2xs">
              <Store className="size-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 w-full rounded-full text-xs font-medium border-border/80"
            >
              <Link to="/loja/configuracao">
                <Sparkles className="size-3.5 mr-1 text-primary" /> Ativar Vitrine Online
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
