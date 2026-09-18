import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronRight,
  Package,
  Plus,
  Receipt,
  Shirt,
  Sparkles,
  Store,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. PAINEL META & RITMO COMERCIAL (Termômetro de Meta do Mês)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelMetaRitmoProps {
  goalTarget: number;
  goalProgress: number;
  remainingGoal: number;
  daysRemaining: number;
  dailyTarget: number;
  netRevenue: number;
  thisMonthLabel: string;
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
  prevRevenue,
  onSetQuickGoal,
  isSettingGoal,
  ocultarSaldos,
  mascaraSaldo,
}: PainelMetaRitmoProps) {
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const metaBatida = progressClamp >= 100;
  const temMeta = goalTarget > 0;

  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary-soft text-accent-foreground">
              <Target className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Ritmo Comercial & Meta
              </h2>
              <p className="text-xs text-muted-foreground">
                Objetivo de vendas em {thisMonthLabel}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
            {temMeta ? `${progressClamp.toFixed(0)}% atingido` : "Sem meta ativa"}
          </span>
        </div>

        {/* Conteúdo Executivo */}
        {temMeta ? (
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(netRevenue)}
                </span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {progressClamp.toFixed(0)}% da meta
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                meta estabelecida de {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(goalTarget)}
              </p>
            </div>

            {/* Barra de Progresso Apple HIG */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                style={{ width: `${progressClamp}%` }}
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
              />
            </div>

            {/* Ritmo Diário / Insight de Negócio */}
            <div className="pt-2">
              {metaBatida ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <Sparkles className="size-4 shrink-0" />
                  <span>🎉 Parabéns! Sua loja superou a meta estipulada para este mês.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 border border-border/60">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Falta faturar</span>
                    <span className="numeric text-xs sm:text-sm font-semibold text-foreground">
                      {ocultarSaldos ? "R$ ••••" : mascaraSaldo(remainingGoal)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                      em {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} restantes
                    </span>
                  </div>
                  <div className="border-l border-border/70 pl-3">
                    <span className="text-[11px] text-muted-foreground block">Ritmo diário ideal</span>
                    <span className="numeric text-xs sm:text-sm font-semibold text-primary">
                      {ocultarSaldos ? "R$ ••••/dia" : `${mascaraSaldo(dailyTarget)}/dia`}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                      para bater 100%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center py-4 px-4 mt-1">
            <div className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
              <Target className="size-4.5" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Ative a meta da loja para {thisMonthLabel}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prevRevenue && prevRevenue > 0
                  ? `Mês anterior: ${ocultarSaldos ? "R$ ••••" : mascaraSaldo(prevRevenue)} faturados. Escolha uma meta rápida:`
                  : "Defina um objetivo em 1 clique para calcular o ritmo diário exato de vendas:"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-0.5">
              {[5000, 10000, 20000].map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSettingGoal}
                  onClick={() => onSetQuickGoal?.(val)}
                  className="h-8 rounded-full border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs cursor-pointer"
                >
                  {ocultarSaldos ? "R$ ••••" : mascaraSaldo(val)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botão de Fechamento Largo e Arredondado (Simétrico em todos os estados!) */}
      <Button
        asChild
        variant="outline"
        className="mt-4 w-full rounded-2xl h-10 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/metas">
          {temMeta ? "Calibrar Objetivos & Metas" : "Configurar Metas da Loja"}{" "}
          <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. PAINEL PEÇA CAMPEÃ & VITRINE ATIVA (Sem Tabelas Burocráticas)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface CatalogPreviewItem {
  id: string;
  name: string;
  category: string;
  price: number;
  photoUrl?: string | null | undefined;
  stock: number;
}

export interface PainelPecaCampeaProps {
  starProduct: TopProductItem | null;
  totalPecasVendidas: number;
  ticketMedio: number;
  totalCatalogItems: number;
  catalogPreview?: CatalogPreviewItem[] | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelPecaCampea({
  starProduct,
  totalPecasVendidas,
  ticketMedio,
  totalCatalogItems,
  catalogPreview,
  ocultarSaldos,
  mascaraSaldo,
}: PainelPecaCampeaProps) {
  const hasSale = starProduct && starProduct.soldCount > 0;
  const hasCatalog = catalogPreview && catalogPreview.length > 0;

  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {hasSale ? "Peça Campeã da Loja" : "Araras Prontas para Venda"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {hasSale
                  ? "A mais desejada pelas clientes este mês"
                  : "Modelos disponíveis para pronta-entrega"}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
            {hasSale ? "Mais Vendida" : "Pronta-entrega"}
          </span>
        </div>

        {/* Conteúdo: 1) Peça Campeã com Venda */}
        {hasSale ? (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-secondary/30 p-4 border border-border/60">
            <div className="relative size-24 sm:size-28 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              {starProduct.photoUrl ? (
                <img
                  src={starProduct.photoUrl}
                  alt={starProduct.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-primary/60 bg-gradient-to-br from-primary/10 to-secondary">
                  <Shirt className="size-8" />
                </div>
              )}
              <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-extrabold text-white shadow-xs">
                #1
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {starProduct.category || "Vestuário"}
                </span>
                <h3 className="truncate text-base font-bold text-foreground">
                  {starProduct.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Saídas da arara</span>
                  <span className="text-xs font-semibold text-foreground">
                    {starProduct.soldCount} {starProduct.soldCount === 1 ? "peça" : "peças"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Receita gerada</span>
                  <span className="numeric text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {ocultarSaldos ? "R$ ••••" : mascaraSaldo(starProduct.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : hasCatalog ? (
          /* Conteúdo: 2) Vitrine Ativa com Fotos/Peças Reais do Estoque */
          <div className="mt-3 space-y-2.5">
            {catalogPreview.map((item) => {
              const isAvailable = item.stock > 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/30 p-2.5 border border-border/60 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-primary/60 bg-gradient-to-br from-primary/10 to-secondary">
                          <Shirt className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block truncate">
                        {item.category}
                      </span>
                      <h4 className="truncate text-xs sm:text-sm font-bold text-foreground">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="numeric text-xs font-semibold text-foreground">
                          {ocultarSaldos ? "R$ ••••" : mascaraSaldo(item.price)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            isAvailable
                              ? "text-muted-foreground"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          · {isAvailable
                              ? `${item.stock} ${item.stock === 1 ? "peça" : "peças"} em arara`
                              : "Esgotado em arara"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAvailable ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-full border-border/80 bg-card text-xs font-medium text-foreground hover:bg-secondary/80 hover:text-primary transition-all px-3 cursor-pointer shadow-2xs"
                    >
                      <Link to="/caixa">
                        <Plus className="size-3 mr-1" /> Vender
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-full border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all px-3 cursor-pointer shadow-2xs"
                    >
                      <Link to="/estoque">
                        Repor
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Conteúdo: 3) Caso a loja realmente não tenha nenhum produto cadastrado */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-6 px-4 mt-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground/70 shadow-2xs">
              <Shirt className="size-5 text-foreground/60" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Cadastre seus modelos de moda
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adicione suas primeiras peças com foto, tamanhos e preços para ativar a vitrine da loja.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-card px-4 text-xs font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs mt-1 cursor-pointer"
            >
              <Link to="/estoque">
                <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
                Cadastrar primeira peça
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Rodapé Executivo & Botão de Fechamento Simétrico */}
      {hasSale && ticketMedio > 0 ? (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Receipt className="size-3 text-muted-foreground/70" />
            <span>Ticket médio da loja:</span>
          </span>
          <strong className="numeric font-semibold text-foreground">
            {ocultarSaldos ? "R$ ••••" : mascaraSaldo(ticketMedio)}
          </strong>
        </div>
      ) : (
        <Button
          asChild
          variant="outline"
          className="mt-4 w-full rounded-2xl h-10 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
        >
          <Link to="/estoque">
            Ver Catálogo Completo <ChevronRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. PAINEL CAPITAL EM ESTOQUE & ARARAS (Inteligência de Capital Parado)
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
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
      <div>
        {/* Cabeçalho Fiel ao Design Original que o Lojista Amou */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
              <Package className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Saúde do Estoque
              </h2>
              <p className="text-xs text-muted-foreground">
                {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(totalStockValue)} em patrimônio ativo · {totalStockUnits} peças
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
            {totalCatalogItems} {totalCatalogItems === 1 ? "modelo" : "modelos"}
          </span>
        </div>

        {/* Barra Apple HIG de Distribuição de Acervo */}
        {totalCatalogItems > 0 && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary gap-0.5 flex">
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
        <ul className="mt-4 divide-y divide-border/60 text-xs">
          <li className="flex flex-col py-2.5 text-muted-foreground">
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
          <li className="flex items-center justify-between py-2.5 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              Últimas unidades (&lt; 3 un.)
            </span>
            <span className="numeric font-medium text-foreground">
              {lowStockCount} {lowStockCount === 1 ? "modelo" : "modelos"}
            </span>
          </li>
          <li className="flex items-center justify-between py-2.5 text-muted-foreground">
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
        className="mt-4 w-full rounded-2xl h-10 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/estoque">
          Gerenciar Estoque <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. PAINEL LIQUIDEZ & OPERAÇÃO DO CAIXA (Simetria Nobre e Ações Sem Fricção)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelAcaoCaixaProps {
  profit: number;
  openCreditTotal: number;
  openCreditsCount: number;
  overdue: number;
  recentTransactions?: Transaction[] | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelAcaoCaixa({
  profit,
  openCreditTotal,
  openCreditsCount,
  overdue,
  recentTransactions,
  ocultarSaldos,
  mascaraSaldo,
}: PainelAcaoCaixaProps) {
  const hasRecent = recentTransactions && recentTransactions.length > 0;

  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
              <Wallet className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Liquidez & Caixa
              </h2>
              <p className="text-xs text-muted-foreground">
                Disponibilidade imediata para o negócio hoje
              </p>
            </div>
          </div>

          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
            Mês atual
          </span>
        </div>

        {/* Saldo Líquido do Mês (Hero Sutil) */}
        <div className="mt-4 flex items-baseline justify-between">
          <span
            className={cn(
              "numeric text-2xl sm:text-3xl font-bold tracking-tight",
              profit >= 0 ? "text-foreground" : "text-destructive",
            )}
          >
            {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(profit)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
            {profit >= 0 ? "Sobra líquida" : "Déficit temporário"}
          </span>
        </div>

        {/* Mini-Feed de Movimentações Recentes ou Status Serena */}
        {hasRecent ? (
          <div className="mt-3 space-y-1.5">
            {recentTransactions.slice(0, 2).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/35 px-3 py-1.5 text-xs border border-border/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      tx.kind === "entrada" ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  <span className="truncate text-foreground font-medium">
                    {tx.description || (tx.kind === "entrada" ? "Venda de produto" : "Despesa da loja")}
                  </span>
                </div>
                <span
                  className={cn(
                    "numeric font-semibold shrink-0",
                    tx.kind === "entrada"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {tx.kind === "entrada" ? "+" : "-"}
                  {ocultarSaldos ? "R$ ••••" : mascaraSaldo(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            {openCreditTotal > 0 ? (
              <Link
                to="/fiado"
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-colors border",
                  overdue > 0
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="size-3.5 shrink-0" />
                  <span className="truncate">
                    <strong>{ocultarSaldos ? "R$ ••••" : mascaraSaldo(openCreditTotal)}</strong> em aberto ({openCreditsCount}{" "}
                    {openCreditsCount === 1 ? "cliente" : "clientes"})
                    {overdue > 0 && ` · ${overdue} vencido${overdue !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <span className="font-semibold shrink-0 text-[11px] underline">
                  Cobranças ➔
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground border border-border/60">
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Zero pendências de cobrança ou fiado</span>
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação Imediata (Harmônicos, sem roxo gritante) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-xl border-border/80 bg-card hover:bg-secondary/70 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <Link to="/caixa">
              <Store className="size-3.5 mr-1.5 text-primary" />
              Venda no Balcão
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-xl border-border/80 bg-card hover:bg-secondary/70 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <Link to="/caixa">
              <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
              Lançar Despesa
            </Link>
          </Button>
        </div>
      </div>

      {/* Botão de Fechamento Largo e Arredondado (Simétrico ao card de estoque!) */}
      <Button
        asChild
        variant="outline"
        className="mt-4 w-full rounded-2xl h-10 border-border/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs"
      >
        <Link to="/caixa">
          Extrato Completo do Caixa <ChevronRight className="size-3.5 ml-1" />
        </Link>
      </Button>
    </section>
  );
}
