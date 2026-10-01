import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Package,
  PackageCheck,
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
  isSimulacao?: boolean | undefined;
  pagamento?: string | undefined;
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
  className?: string | undefined;
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
  className,
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
        "panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:shadow-lift",
        className,
      )}
    >
      <div>
        {/* Cabeçalho refinado — Padrão Apple HIG & Shopify Polaris */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/15">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Pedidos da Vitrine
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {temPendentes
                  ? `${ocultarSaldos ? "R$ ••••••" : mascaraSaldo(valorTotalNovos)} a despachar · ${pedidosPendentes.length} ${pedidosPendentes.length === 1 ? "pedido aguardando" : "pedidos aguardando"}`
                  : "Expedição em dia · Nenhum pedido aguardando"}
              </p>
            </div>
          </div>

          {/* Pill de status executiva com acabamento esmeralda sutil */}
          {temPendentes ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {totalPedidosNovos} {totalPedidosNovos === 1 ? "a despachar" : "a despachar"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Em dia
            </span>
          )}
        </div>

        {/* Conteúdo com pedidos pendentes — Inset Micro-Cards de Alta Fidelidade */}
        {temPendentes ? (
          <div className="mt-3.5 space-y-2.5">
            {pedidosPendentes.slice(0, 2).map((p) => {
              const cliente = p.customer_name || p.clienteNome || "Cliente";
              const initials =
                cliente
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase() || "P";
              const itemSnippet = p.primeiroItemNome
                ? `${p.itensQtd ?? 1}x ${p.primeiroItemNome}${p.itensQtd && p.itensQtd > 1 ? ` (+${p.itensQtd - 1})` : ""}`
                : `${p.itensQtd ?? 1} ${(p.itensQtd ?? 1) === 1 ? "peça" : "peças"}`;

              return (
                <div
                  key={p.id}
                  className="group relative rounded-2xl border border-border/70 bg-secondary/30 p-3.5 transition-all duration-200 hover:border-border hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-semibold text-xs border border-primary/15">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-xs text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {cliente}
                          </h3>
                          {p.isSimulacao && (
                            <span className="rounded-full bg-muted border border-border px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground shrink-0">
                              Modo Teste
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {itemSnippet}
                          {p.pagamento ? ` · ${p.pagamento}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="numeric text-sm font-bold text-foreground">
                        {ocultarSaldos ? "R$ ••••" : mascaraSaldo(p.total)}
                      </span>
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 w-full rounded-xl text-xs font-medium border-border/80 bg-background/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs cursor-pointer"
                  >
                    <Link to="/loja/pedidos">
                      <PackageCheck className="size-3.5 mr-1.5" />
                      Separar Pedido
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Estado Vazio — Expedição em Dia com Box da Vitrine */
          <div className="mt-3.5 space-y-3">
            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3.5 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-medium text-foreground block text-[11px]">Link da Vitrine</span>
                <span className="truncate text-muted-foreground text-[11px] font-mono block mt-0.5">
                  {vitrineDisplay || "vestui.com.br/vitrine/sualoja"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-medium border-border/70 bg-card hover:bg-secondary cursor-pointer"
                >
                  <Copy className="size-3 mr-1" />
                  Copiar
                </Button>
                {vitrineUrl && (
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 rounded-lg text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <a href={vitrineUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
              Compartilhe o link no seu Instagram ou WhatsApp para receber pedidos direto na vitrine.
            </p>
          </div>
        )}
      </div>

      {/* Rodapé Integrado e Fluido */}
      <Link
        to="/loja/pedidos"
        className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          {temPendentes
            ? `Central de Pedidos da Vitrine (${totalPedidosNovos})`
            : "Central de Pedidos Online"}
        </span>
        <ChevronRight className="size-3.5" />
      </Link>
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
  className?: string | undefined;
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
  className,
}: PainelCapitalEstoqueProps) {
  return (
    <section className={cn("panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:shadow-lift", className)}>
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
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/80 border border-border/40 gap-0.5 flex">
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

        {/* A Lista Limpa com Pontos Coloridos Rigorosamente Alinhada */}
        <ul className="mt-3 divide-y divide-border/50 text-xs">
          <li className="flex items-center justify-between py-2 text-muted-foreground">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  outOfStockCount > 0 ? "bg-rose-500" : "bg-muted-foreground/40",
                )}
              />
              <span className="font-medium text-foreground/90 shrink-0">Modelos esgotados</span>
              {outOfStockCount > 0 && outOfStockSampleName && (
                <Link
                  to="/estoque"
                  className="hidden sm:inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors truncate max-w-[130px]"
                  title={`Repor ${outOfStockSampleName}`}
                >
                  Repor {outOfStockSampleName} ➔
                </Link>
              )}
            </span>
            <span className={cn("numeric font-medium shrink-0", outOfStockCount > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-foreground")}>
              {outOfStockCount} {outOfStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
          <li className="flex items-center justify-between py-2 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
              <span>Últimas unidades (&lt; 3 un.)</span>
            </span>
            <span className={cn("numeric font-medium", lowStockCount > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-foreground")}>
              {lowStockCount} {lowStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
          <li className="flex items-center justify-between py-2 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Modelos com estoque saudável</span>
            </span>
            <span className="numeric font-medium text-foreground">
              {healthyStockCount} {healthyStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
        </ul>
      </div>

      {/* Link de Fechamento Integrado e Fluido */}
      <Link
        to="/estoque"
        className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Gerenciar Estoque</span>
        <ChevronRight className="size-3.5" />
      </Link>
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
  className?: string | undefined;
}

export function PainelUltimasVendas({
  transactions,
  ocultarSaldos,
  mascaraSaldo,
  className,
}: PainelUltimasVendasProps) {
  // Ordenar as últimas 5 movimentações por data decrescente
  const ultimas = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
      .slice(0, 5);
  }, [transactions]);

  const temTransacoes = ultimas.length > 0;

  return (
    <section className={cn("panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:shadow-lift", className)}>
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
              <Receipt className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Movimentações recentes
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
                (tx as any).notes ||
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

                  <div className="text-right shrink-0">
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

      {/* Link de Fechamento Integrado e Fluido */}
      {temTransacoes && (
        <Link
          to="/caixa"
          className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Extrato Completo do Caixa</span>
          <ChevronRight className="size-3.5" />
        </Link>
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
