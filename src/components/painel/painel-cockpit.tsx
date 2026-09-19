import React from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Package,
  Plus,
  Receipt,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Transaction } from "@/lib/finance";

export interface TopProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  photoUrl?: string | null | undefined;
  soldCount: number;
  revenue: number;
  totalStock: number;
  colors?: string[] | undefined;
  sizesSummary?: string | undefined;
}

export interface CatalogPreviewItem {
  id: string;
  name: string;
  category: string;
  price: number;
  photoUrl?: string | null | undefined;
  stock: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. PAINEL RADAR DA VITRINE & PEDIDOS ONLINE (Compacto, Ágil e Leve)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PedidoRadarItem {
  id: string;
  clienteNome?: string | null | undefined;
  customer_name?: string | null | undefined;
  total: number;
  status: string;
  created_at?: string | null | undefined;
  criadoEm?: string | null | undefined;
  itensQtd?: number | undefined;
  primeiroItemNome?: string | undefined;
}

export interface PainelRadarPedidosOnlineProps {
  pedidosPendentes: PedidoRadarItem[];
  totalPedidosNovos: number;
  valorTotalNovos: number;
  vitrineAtiva: boolean;
  vitrineUrl?: string | undefined;
  vitrineDisplay?: string | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
  onCopiarLink?: (() => void) | undefined;
}

export function PainelRadarPedidosOnline({
  pedidosPendentes,
  totalPedidosNovos,
  valorTotalNovos,
  vitrineAtiva,
  vitrineUrl,
  vitrineDisplay,
  ocultarSaldos,
  mascaraSaldo,
  onCopiarLink,
}: PainelRadarPedidosOnlineProps) {
  const temPendentes = pedidosPendentes.length > 0;

  const handleCopy = () => {
    if (onCopiarLink) {
      onCopiarLink();
    } else if (vitrineUrl) {
      void navigator.clipboard?.writeText(vitrineUrl);
      toast.success("Link da vitrine copiado!");
    }
  };

  return (
    <section
      className={cn(
        "panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300",
        temPendentes &&
          "bg-slate-950 text-white border-slate-800 shadow-md dark:bg-slate-900/95",
      )}
    >
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "grid size-6 place-items-center rounded-lg transition-colors",
                temPendentes
                  ? "bg-slate-800 text-emerald-400"
                  : "bg-secondary text-foreground",
              )}
            >
              <ShoppingBag className="size-3.5" />
            </div>
            <div>
              <h2
                className={cn(
                  "text-sm font-semibold",
                  temPendentes ? "text-white" : "text-foreground",
                )}
              >
                Radar de Pedidos Online
              </h2>
              <p
                className={cn(
                  "text-[11px]",
                  temPendentes ? "text-slate-400" : "text-muted-foreground",
                )}
              >
                Expedição e separação da vitrine
              </p>
            </div>
          </div>

          {temPendentes ? (
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {totalPedidosNovos} {totalPedidosNovos === 1 ? "a despachar" : "a despachar"}
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Tudo despachado
            </span>
          )}
        </div>

        {/* Conteúdo: 1) Quando HÁ pedidos pendentes de separação */}
        {temPendentes ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>
                Total a despachar:{" "}
                <strong className="text-white font-semibold">
                  {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(valorTotalNovos)}
                </strong>
              </span>
              <span className="text-[11px] text-slate-400">
                {pedidosPendentes.length} {pedidosPendentes.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            {/* Lista dos 2 primeiros pedidos aguardando ação */}
            <div className="space-y-1.5">
              {pedidosPendentes.slice(0, 2).map((p) => {
                const cliente = p.customer_name || p.clienteNome || `Pedido #${p.id.slice(0, 6)}`;
                const itemSnippet = p.primeiroItemNome
                  ? `${p.primeiroItemNome}${p.itensQtd && p.itensQtd > 1 ? ` (+${p.itensQtd - 1})` : ""}`
                  : `${p.itensQtd ?? 1} ${(p.itensQtd ?? 1) === 1 ? "peça" : "peças"}`;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 shadow-2xs hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate">
                          {cliente}
                        </span>
                        <span className="rounded-md bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-300 font-medium shrink-0">
                          {p.status === "novo" ? "Novo" : "Em separação"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {itemSnippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="numeric text-xs font-bold text-white">
                        {ocultarSaldos ? "R$ ••••" : mascaraSaldo(p.total)}
                      </span>
                      <Button
                        asChild
                        size="sm"
                        className="h-7 rounded-full bg-white text-slate-950 hover:bg-slate-100 text-[11px] font-bold px-3 cursor-pointer shadow-sm transition-all"
                      >
                        <Link to="/loja/pedidos">
                          Separar ➔
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Conteúdo: 2) Quando NÃO há pedidos pendentes (Vitrine Ativa 24h) */
          <div className="mt-2.5 space-y-2">
            {/* Box do Link da Vitrine com Botão Copiar */}
            <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs shadow-2xs">
              <span className="truncate text-muted-foreground text-[11px] font-mono">
                {vitrineDisplay || "modaly.app/vitrine/sualoja"}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar link da vitrine"
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-card px-2 text-[10px] font-medium text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs"
                >
                  <Copy className="size-2.5 text-muted-foreground" />
                  <span>Copiar</span>
                </button>
                {vitrineUrl && (
                  <a
                    href={vitrineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir vitrine"
                    className="inline-flex h-6 items-center gap-1 rounded-md bg-primary/10 px-2 text-[10px] font-medium text-primary hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botão de Fechamento Largo e Arredondado */}
      <Button
        asChild
        variant="outline"
        className={cn(
          "mt-3 w-full rounded-xl h-9 text-xs font-medium transition-all cursor-pointer shadow-2xs",
          temPendentes
            ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800"
            : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60",
        )}
      >
        <Link to="/loja/pedidos">
          {temPendentes
            ? `Central de Pedidos da Vitrine (${totalPedidosNovos})`
            : "Central de Pedidos Online"}{" "}
          <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. PAINEL CAPITAL EM ESTOQUE & SAÚDE (Design Fiel Original que o Usuário Amou)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelCapitalEstoqueProps {
  totalStockValue: number;
  totalStockUnits: number;
  totalCatalogItems: number;
  outOfStockCount: number;
  lowStockCount: number;
  healthyStockCount: number;
  outOfStockSampleName?: string | null | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelCapitalEstoque({
  totalStockValue,
  totalStockUnits,
  totalCatalogItems,
  outOfStockCount,
  lowStockCount,
  healthyStockCount,
  outOfStockSampleName,
  ocultarSaldos,
  mascaraSaldo,
}: PainelCapitalEstoqueProps) {
  return (
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        {/* Cabeçalho Fiel ao Design Original que o Lojista Amou */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
              <Package className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Saúde do Estoque
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(totalStockValue)} em patrimônio ativo · {totalStockUnits} peças
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground font-medium">
            {totalCatalogItems} {totalCatalogItems === 1 ? "modelo" : "modelos"}
          </span>
        </div>

        {/* Barra Apple HIG de Distribuição de Acervo */}
        {totalCatalogItems > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary gap-0.5 flex">
            {healthyStockCount > 0 && (
              <div
                style={{ width: `${(healthyStockCount / totalCatalogItems) * 100}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                title="Estoque saudável"
              />
            )}
            {lowStockCount > 0 && (
              <div
                style={{ width: `${(lowStockCount / totalCatalogItems) * 100}%` }}
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                title="Últimas unidades"
              />
            )}
            {outOfStockCount > 0 && (
              <div
                style={{ width: `${(outOfStockCount / totalCatalogItems) * 100}%` }}
                className="h-full bg-muted-foreground/30 rounded-full transition-all duration-500"
                title="Esgotados"
              />
            )}
          </div>
        )}

        {/* A Lista Limpa com Pontos Coloridos que o Usuário Amou */}
        <ul className="mt-3 divide-y divide-border/60 text-xs">
          <li className="flex flex-col py-2 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
                Modelos esgotados
              </span>
              <span className="numeric font-medium text-foreground">
                {outOfStockCount} {outOfStockCount === 1 ? "modelo" : "modelos"}
              </span>
            </div>
            {outOfStockCount > 0 && outOfStockSampleName && (
              <div className="mt-1 flex items-center justify-between pl-4 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                <span>⚠️ {outOfStockSampleName} está zerado</span>
                <Link to="/estoque" className="underline hover:opacity-80 text-[10px] font-semibold">
                  Repor estoque ➔
                </Link>
              </div>
            )}
          </li>
          <li className="flex items-center justify-between py-2 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              Últimas unidades (&lt; 3 un.)
            </span>
            <span className="numeric font-medium text-foreground">
              {lowStockCount} {lowStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
          <li className="flex items-center justify-between py-2 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              Modelos com estoque saudável
            </span>
            <span className="numeric font-medium text-foreground">
              {healthyStockCount} {healthyStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
        </ul>
      </div>

      {/* Botão de Fechamento Largo e Arredondado */}
      <Button
        asChild
        variant="outline"
        className="mt-3 w-full rounded-xl h-9 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/estoque">
          Gerenciar Estoque <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. PAINEL META & RITMO COMERCIAL (Retido para compatibilidade)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelMetaRitmoProps {
  goalTarget: number;
  goalProgress: number;
  remainingGoal: number;
  daysRemaining: number;
  dailyTarget: number;
  netRevenue: number;
  thisMonthLabel: string;
  ticketMedio?: number | undefined;
  totalPecasVendidas?: number | undefined;
  prevRevenue?: number | undefined;
  onSetQuickGoal?: ((amount: number) => void) | undefined;
  isSettingGoal?: boolean | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelMetaRitmo({
  goalTarget,
  goalProgress,
  remainingGoal,
  daysRemaining,
  dailyTarget,
  netRevenue,
  thisMonthLabel,
  ticketMedio = 0,
  totalPecasVendidas = 0,
  prevRevenue,
  onSetQuickGoal,
  isSettingGoal,
  ocultarSaldos,
  mascaraSaldo,
}: PainelMetaRitmoProps) {
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const temMeta = goalTarget > 0;

  return (
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-primary-soft text-primary">
              <Target className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Ritmo Comercial & Metas
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Velocidade e objetivo de vendas em {thisMonthLabel}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
            {temMeta ? `${progressClamp.toFixed(0)}%` : "Sem meta"}
          </span>
        </div>

        {temMeta ? (
          <div className="mt-3 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="numeric text-xl font-bold tracking-tight text-foreground">
                {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(netRevenue)}
              </span>
              <span className="text-[11px] font-semibold text-primary">
                Meta: {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(goalTarget)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                style={{ width: `${progressClamp}%` }}
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Ritmo: <strong className="text-primary">{ocultarSaldos ? "R$ ••/dia" : `${mascaraSaldo(dailyTarget)}/dia`}</strong></span>
              <span>Peças: <strong className="text-foreground">{totalPecasVendidas}</strong></span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Ative uma meta rápida:</span>
            <div className="flex gap-1.5">
              {[5000, 10000, 20000].map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSettingGoal}
                  onClick={() => onSetQuickGoal?.(val)}
                  className="h-7 rounded-lg border-border/80 px-2 text-[11px] font-medium"
                >
                  {mascaraSaldo(val)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        asChild
        variant="outline"
        className="mt-3 w-full rounded-xl h-9 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/metas">
          {temMeta ? "Calibrar Metas" : "Configurar Metas"} <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. PAINEL METAS, FIADO & COMPROMISSOS (Estilo "To-Do / Upcoming" da Ref 2)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelCompromissosMetasProps {
  goalTarget: number;
  goalProgress: number;
  remainingGoal: number;
  dailyTarget: number;
  daysRemaining: number;
  netRevenue: number;
  thisMonthLabel: string;
  openCreditTotal: number;
  openCreditsCount: number;
  overdue: number;
  totalExpenses: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
  onSetQuickGoal?: ((amount: number) => void) | undefined;
  isSettingGoal?: boolean | undefined;
}

export function PainelCompromissosMetas({
  goalTarget,
  goalProgress,
  remainingGoal,
  dailyTarget,
  daysRemaining,
  netRevenue,
  thisMonthLabel,
  openCreditTotal,
  openCreditsCount,
  overdue,
  totalExpenses,
  ocultarSaldos,
  mascaraSaldo,
  onSetQuickGoal,
  isSettingGoal,
}: PainelCompromissosMetasProps) {
  const temMeta = goalTarget > 0;
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);

  return (
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Compromissos de Caixa
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Fiado na praça e contas do mês
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
            {thisMonthLabel}
          </span>
        </div>

        {/* 1. Item Fiado / Cobrança na Praça */}
        <div className="mt-3 space-y-2">
          {openCreditTotal > 0 ? (
            <Link
              to="/fiado"
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors border shadow-2xs",
                overdue > 0
                  ? "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15",
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Users className="size-3.5 shrink-0" />
                <span className="truncate">
                  Fiado: <strong>{ocultarSaldos ? "R$ ••••" : mascaraSaldo(openCreditTotal)}</strong> ({openCreditsCount}{" "}
                  {openCreditsCount === 1 ? "cliente" : "clientes"})
                  {overdue > 0 && ` · ${overdue} vencido${overdue !== 1 ? "s" : ""}`}
                </span>
              </div>
              <span className="font-semibold shrink-0 text-[11px] underline">
                Cobrar ➔
              </span>
            </Link>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground border border-border/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>Zero fiado em aberto na praça</span>
              </div>
              <Link to="/fiado" className="text-[11px] underline hover:text-foreground">
                Ver fiado
              </Link>
            </div>
          )}

          {/* 3. Item Contas / Saídas do Mês */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs border border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-muted-foreground">Contas e saídas do mês:</span>
            </div>
            <span className="numeric font-semibold text-foreground">
              {ocultarSaldos ? "R$ ••••" : mascaraSaldo(totalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Botão de Fechamento */}
      <Button
        asChild
        variant="outline"
        className="mt-3 w-full rounded-xl h-9 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/caixa">
          Extrato Completo do Caixa <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 5. PAINEL ÚLTIMAS VENDAS & MOVIMENTAÇÕES (Inspirado em FinScope & Business Manager)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelUltimasVendasProps {
  transactions: Transaction[];
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelUltimasVendas({
  transactions,
  ocultarSaldos,
  mascaraSaldo,
}: PainelUltimasVendasProps) {
  // Ordenar as últimas 4 movimentações por data decrescente
  const ultimas = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
      .slice(0, 4);
  }, [transactions]);

  const temTransacoes = ultimas.length > 0;

  return (
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
              <Receipt className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Movimentações Recentes
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Últimas entradas e saídas registradas na loja
              </p>
            </div>
          </div>

          <Link
            to="/caixa"
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Ver extrato <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Lista de Transações */}
        {temTransacoes ? (
          <div className="mt-3 divide-y divide-border/60">
            {ultimas.map((tx) => {
              const isEntrada = tx.kind === "entrada";
              const isOnline = tx.category === "venda_online";
              const desc =
                tx.notes ||
                (isOnline
                  ? "Venda Vitrine Online"
                  : isEntrada
                    ? "Venda no Balcão"
                    : "Despesa / Saída");

              const [ano, mes, dia] = (tx.occurred_on || "").split("-");
              const dataFormatada = dia && mes ? `${dia}/${mes}` : tx.occurred_on;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg shadow-2xs",
                        isOnline
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : isEntrada
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {isOnline ? (
                        <ShoppingBag className="size-3.5" />
                      ) : isEntrada ? (
                        <Store className="size-3.5" />
                      ) : (
                        <Receipt className="size-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-xs">
                        {desc}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{dataFormatada}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {isOnline
                            ? "Vitrine"
                            : isEntrada
                              ? "Balcão"
                              : tx.category || "Despesa"}
                        </span>
                        {tx.payment_method && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{tx.payment_method.replace("_", " ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span
                      className={cn(
                        "numeric font-bold text-xs tracking-tight",
                        isEntrada
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground/80",
                      )}
                    >
                      {ocultarSaldos
                        ? "R$ ••••"
                        : `${isEntrada ? "+" : "-"} ${mascaraSaldo(tx.amount)}`}
                    </span>
                    <span
                      className={cn(
                        "hidden sm:inline-block rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                        isEntrada
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {isEntrada ? "Concluída" : "Pago"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 py-4 flex flex-col items-center justify-center text-center rounded-xl bg-secondary/30 border border-dashed border-border/70 p-4">
            <Store className="size-6 text-muted-foreground/50 mb-1.5" />
            <p className="text-xs font-medium text-foreground">
              Nenhuma venda registrada este mês
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
              Quando você registrar uma venda no balcão ou na vitrine, ela aparecerá aqui em tempo real.
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-2.5 h-7 rounded-lg text-[11px] font-semibold"
            >
              <Link to="/caixa">
                <Plus className="size-3 mr-1" /> Registrar Venda no Balcão
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Botão de Fechamento Simétrico */}
      {temTransacoes && (
        <Button
          asChild
          variant="outline"
          className="mt-3 w-full rounded-xl h-8 border-border/80 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
        >
          <Link to="/caixa">
            Extrato Completo do Caixa <ChevronRight className="size-3 ml-1" />
          </Link>
        </Button>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 6. COMPATIBILIDADE RETROATIVA PARA PAINELACAO CAIXA
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelAcaoCaixaProps {
  profit: number;
  totalExpenses: number;
  openCreditTotal: number;
  openCreditsCount: number;
  overdue: number;
  goalTarget?: number | undefined;
  dailyTarget?: number | undefined;
  daysRemaining?: number | undefined;
  recentTransactions?: Transaction[] | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelAcaoCaixa(props: PainelAcaoCaixaProps) {
  return (
    <PainelCompromissosMetas
      goalTarget={props.goalTarget ?? 0}
      goalProgress={0}
      remainingGoal={0}
      dailyTarget={props.dailyTarget ?? 0}
      daysRemaining={props.daysRemaining ?? 0}
      netRevenue={0}
      thisMonthLabel="Mês atual"
      openCreditTotal={props.openCreditTotal}
      openCreditsCount={props.openCreditsCount}
      overdue={props.overdue}
      totalExpenses={props.totalExpenses}
      ocultarSaldos={props.ocultarSaldos}
      mascaraSaldo={props.mascaraSaldo}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 5. RETIDO PARA COMPATIBILIDADE (Caso algum componente legado importe)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelPecaCampeaProps {
  starProduct: TopProductItem | null;
  totalPecasVendidas: number;
  ticketMedio: number;
  totalCatalogItems: number;
  catalogPreview?: CatalogPreviewItem[] | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelPecaCampea(props: PainelPecaCampeaProps) {
  return null;
}
