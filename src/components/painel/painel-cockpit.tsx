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
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "grid size-6 place-items-center rounded-lg transition-colors",
                temPendentes
                  ? "bg-primary-soft text-primary"
                  : "bg-secondary text-foreground",
              )}
            >
              <ShoppingBag className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Radar de Pedidos Online
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Expedição e separação de vendas da vitrine
              </p>
            </div>
          </div>

          {temPendentes ? (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {totalPedidosNovos} {totalPedidosNovos === 1 ? "novo pedido" : "novos pedidos"}
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
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>
                Total a despachar:{" "}
                <strong className="text-foreground font-semibold">
                  {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(valorTotalNovos)}
                </strong>
              </span>
              <span className="text-[11px]">
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
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs hover:border-border transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {cliente}
                        </span>
                        <span className="rounded-md bg-secondary/80 px-1.5 py-0.2 text-[9px] text-muted-foreground font-medium shrink-0">
                          {p.status === "novo" ? "Novo" : "Em separação"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {itemSnippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="numeric text-xs font-bold text-foreground">
                        {ocultarSaldos ? "R$ ••••" : mascaraSaldo(p.total)}
                      </span>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-[11px] font-semibold px-2.5 cursor-pointer shadow-2xs transition-all"
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
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground border border-border/60">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Zero pedidos pendentes no momento. Vitrine pronta para novas vendas.</span>
            </div>

            {/* Box do Link da Vitrine com Botão Copiar */}
            <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs shadow-2xs">
              <span className="truncate text-muted-foreground text-[11px]">
                {vitrineDisplay || "modaly.app/vitrine/sualoja"}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar link da vitrine"
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-secondary/70 px-2 text-[11px] font-medium text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs"
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
                    className="inline-flex h-6 items-center gap-1 rounded-md bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20 transition-all cursor-pointer"
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
        className="mt-3 w-full rounded-xl h-9 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
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
 * 4. PAINEL CONTAS, COBRANÇAS & FLUXO DO CAIXA (Sem Repetições Burocráticas)
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

export function PainelAcaoCaixa({
  profit,
  totalExpenses,
  openCreditTotal,
  openCreditsCount,
  overdue,
  goalTarget = 0,
  dailyTarget = 0,
  daysRemaining = 0,
  recentTransactions,
  ocultarSaldos,
  mascaraSaldo,
}: PainelAcaoCaixaProps) {
  return (
    <section className="panel flex flex-col justify-between p-4 sm:p-5 transition-all duration-300">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
              <Wallet className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Contas, Fiado & Ritmo
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Compromissos e ritmo de metas do mês
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
            Mês atual
          </span>
        </div>

        {/* Linhas de Compromissos: Fiado, Contas a Pagar e Ritmo da Meta */}
        <div className="mt-3 space-y-2">
          {/* Linha 1: Fiado / Cobranças em Aberto */}
          {openCreditTotal > 0 ? (
            <Link
              to="/fiado"
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors border",
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
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Zero clientes com fiado em aberto</span>
              </div>
              <Link to="/fiado" className="text-[11px] underline hover:text-foreground">
                Ver fiado
              </Link>
            </div>
          )}

          {/* Linha 2: Despesas e Saídas do Mês */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs border border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-muted-foreground">Contas / saídas do mês:</span>
            </div>
            <span className="numeric font-semibold text-foreground">
              {ocultarSaldos ? "R$ ••••" : mascaraSaldo(totalExpenses)}
            </span>
          </div>

          {/* Linha 3: Ritmo Diário da Meta */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs border border-border/60">
            <div className="flex items-center gap-2">
              <Target className="size-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                {goalTarget > 0
                  ? `Ritmo ideal (${daysRemaining}d restantes):`
                  : "Meta mensal da loja:"}
              </span>
            </div>
            {goalTarget > 0 ? (
              <span className="numeric font-semibold text-primary">
                {ocultarSaldos ? "R$ ••••/dia" : `${mascaraSaldo(dailyTarget)}/dia`}
              </span>
            ) : (
              <Link to="/metas" className="text-[11px] font-medium text-primary hover:underline">
                Ativar meta ➔
              </Link>
            )}
          </div>
        </div>

        {/* Botões de Ação Imediata */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            asChild
            variant="outline"
            className="h-8.5 rounded-xl border-border/80 bg-card hover:bg-secondary/70 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <Link to="/caixa">
              <Store className="size-3.5 mr-1.5 text-primary" />
              Venda no Balcão
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-8.5 rounded-xl border-border/80 bg-card hover:bg-secondary/70 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <Link to="/caixa">
              <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
              Lançar Despesa
            </Link>
          </Button>
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
