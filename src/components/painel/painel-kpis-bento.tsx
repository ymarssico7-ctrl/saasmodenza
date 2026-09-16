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
  const fisicaPct = totalCanais > 0 ? Math.round((fisicaRevenue / totalCanais) * 100) : 50;
  const onlinePct = totalCanais > 0 ? 100 - fisicaPct : 50;

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
      {/* ── CARD 1: Faturamento do Mês ────────────────────────────────────────── */}
      <div className="panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento
            </p>
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

      {/* ── CARD 4: Vitrine Online Integrada & Pedidos Live ────────────────────── */}
      {vitrineAtiva ? (
        <div
          className={cn(
            "panel relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5",
            pedidosNovosCount > 0 &&
              "border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card ring-1 ring-rose-500/20",
          )}
        >
          {/* Cabeçalho do Card */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {pedidosNovosCount > 0 ? (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                ) : (
                  <span className="size-2 rounded-full bg-emerald-500" />
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vitrine Online
                </p>
              </div>

              {/* Status de Pedidos */}
              {pedidosNovosCount > 0 ? (
                <div className="mt-2">
                  <h3 className="numeric text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400">
                    {pedidosNovosCount}{" "}
                    <span className="text-sm font-semibold">
                      {pedidosNovosCount === 1 ? "novo pedido" : "novos pedidos"}
                    </span>
                  </h3>
                </div>
              ) : (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="numeric text-xl sm:text-2xl font-bold text-foreground">
                    {ocultarSaldos ? "••••" : mascaraSaldo(onlineRevenue)}
                  </span>
                  {totalCanais > 0 && (
                    <span className="text-xs font-medium text-primary">
                      ({onlinePct}% do total)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-2xl shadow-2xs",
                pedidosNovosCount > 0
                  ? "bg-rose-500/10 text-rose-600"
                  : "bg-secondary text-foreground",
              )}
            >
              {pedidosNovosCount > 0 ? (
                <ShoppingBag className="size-5" />
              ) : (
                <Store className="size-5" />
              )}
            </div>
          </div>

          {/* Rodapé Integrado: Link Rápido da Bio ou Ação de Separação */}
          <div className="mt-4 pt-3 border-t border-border/60">
            {pedidosNovosCount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-700/90 dark:text-rose-300 truncate">
                  {pedidosNovosValor > 0 && !ocultarSaldos
                    ? `${brl(pedidosNovosValor)} a confirmar`
                    : "Aguardando separação"}
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 shadow-xs"
                >
                  <Link to="/loja/pedidos">
                    Separar <ChevronRight className="size-3.5 ml-0.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 text-xs">
                {/* Link da Vitrine Inline Limpo */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-muted-foreground font-mono text-[11px]">
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
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <Link
                  to="/loja"
                  className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors ml-1"
                >
                  Gerenciar ➔
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vitrine inativa: convite limpo e conciso */
        <div className="panel relative flex flex-col justify-between p-5 sm:p-6 border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Vitrine Online
              </p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">
                Venda pelo Instagram & Zap
              </h3>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
              <Sparkles className="size-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60">
            <Button
              asChild
              size="sm"
              className="h-8 w-full rounded-full gradient-primary text-xs font-semibold shadow-glow"
            >
              <Link to="/loja/configuracao">
                <Sparkles className="size-3.5 mr-1" /> Ativar Vitrine Online
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
