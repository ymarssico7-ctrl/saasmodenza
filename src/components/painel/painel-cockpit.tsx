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
  ocultarSaldos,
  mascaraSaldo,
}: PainelMetaRitmoProps) {
  const progressClamp = Math.min(Math.max(goalProgress, 0), 100);
  const metaBatida = progressClamp >= 100;
  const temMeta = goalTarget > 0;

  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[290px]">
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

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium rounded-full"
          >
            <Link to="/metas">
              {temMeta ? "Calibrar meta" : "Definir meta"} <ArrowUpRight className="size-3 ml-0.5" />
            </Link>
          </Button>
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-6 px-4 mt-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground/70 shadow-2xs">
              <Target className="size-5 text-primary" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Sua loja ainda não tem meta este mês
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Defina um objetivo de vendas para calcular o ritmo diário exato que sua equipe precisa manter.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-card px-4 text-xs font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs mt-1 cursor-pointer"
            >
              <Link to="/metas">
                <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
                Definir meta do mês
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. PAINEL PEÇA CAMPEÃ (Vitrine & Peça Mais Desejada - Sem Tabelas)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelPecaCampeaProps {
  starProduct: TopProductItem | null;
  totalPecasVendidas: number;
  ticketMedio: number;
  totalCatalogItems: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelPecaCampea({
  starProduct,
  totalPecasVendidas,
  ticketMedio,
  totalCatalogItems,
  ocultarSaldos,
  mascaraSaldo,
}: PainelPecaCampeaProps) {
  const hasSale = starProduct && starProduct.soldCount > 0;

  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[290px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Peça Campeã da Loja
              </h2>
              <p className="text-xs text-muted-foreground">
                {hasSale
                  ? "A mais desejada pelas clientes este mês"
                  : "Destaque comercial das araras"}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium rounded-full"
          >
            <Link to="/estoque">
              Ver araras <ArrowUpRight className="size-3 ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Vitrine Estrela (Layout de Revista de Moda) */}
        {hasSale ? (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-secondary/30 p-4 border border-border/60">
            {/* Foto Grande Nobre */}
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

            {/* Métricas de Valor */}
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
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-6 px-4 mt-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground/70 shadow-2xs">
              <Shirt className="size-5 text-foreground/60" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Araras prontas para faturar
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {totalCatalogItems > 0
                  ? `${totalCatalogItems} ${totalCatalogItems === 1 ? "modelo pronto" : "modelos prontos"} para faturar no balcão ou vitrine.`
                  : "Cadastre suas primeiras peças para ativar a vitrine da loja."}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-card px-4 text-xs font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs mt-1 cursor-pointer"
            >
              <Link to="/caixa">
                <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
                Registrar venda no caixa
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Rodapé Executivo: Ticket Médio das Clientes */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Receipt className="size-3 text-muted-foreground/70" />
          <span>Ticket médio da loja:</span>
        </span>
        <strong className="numeric font-semibold text-foreground">
          {ocultarSaldos ? "R$ ••••" : mascaraSaldo(ticketMedio)}
        </strong>
      </div>
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
  ocultarSaldos,
  mascaraSaldo,
}: PainelCapitalEstoqueProps) {
  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[290px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
              <Package className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Capital em Estoque & Araras
              </h2>
              <p className="text-xs text-muted-foreground">
                Patrimônio ativo em mercadorias para faturar
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium rounded-full"
          >
            <Link to="/estoque">
              Ver estoque <ArrowUpRight className="size-3 ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Número Hero: Valor Total das Araras */}
        <div className="mt-5 space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(totalStockValue)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                {totalStockUnits} peças físicas
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              potencial de faturamento em {totalCatalogItems} modelos cadastrados
            </p>
          </div>

          {/* Barra Apple HIG de Distribuição de Acervo */}
          {totalCatalogItems > 0 && (
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary gap-0.5 flex">
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
                  className="h-full bg-foreground/25 rounded-full transition-all duration-500"
                  title="Esgotados"
                />
              )}
            </div>
          )}

          {/* 3 Blocos de Status Limpos (Cards Visuais, Sem Tabela) */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                Saudável
              </span>
              <span className="numeric text-sm font-bold text-foreground">
                {healthyStockCount}
              </span>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">
                Últimas (&lt; 3)
              </span>
              <span className="numeric text-sm font-bold text-foreground">
                {lowStockCount}
              </span>
            </div>

            <div className="rounded-xl bg-secondary border border-border/70 p-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground block">
                Esgotados
              </span>
              <span className="numeric text-sm font-bold text-foreground">
                {outOfStockCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sugestão de Reposição */}
      {outOfStockCount > 0 ? (
        <div className="mt-3 pt-2.5 border-t border-border/50">
          <Link
            to="/estoque"
            className="text-xs text-amber-700 dark:text-amber-400 font-medium hover:underline flex items-center justify-between"
          >
            <span>⚠️ {outOfStockCount} modelo{outOfStockCount !== 1 ? "s" : ""} sem estoque · Repor peças</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mt-3 pt-2.5 border-t border-border/50 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <span>✓ Todas as araras abastecidas para faturamento</span>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. PAINEL AÇÃO RÁPIDA & SAÚDE DO CAIXA (Decisão Imediata - Sem Extrato Frio)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PainelAcaoCaixaProps {
  profit: number;
  openCreditTotal: number;
  openCreditsCount: number;
  overdue: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelAcaoCaixa({
  profit,
  openCreditTotal,
  openCreditsCount,
  overdue,
  ocultarSaldos,
  mascaraSaldo,
}: PainelAcaoCaixaProps) {
  return (
    <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[290px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
              <Wallet className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Operação & Ação Rápida
              </h2>
              <p className="text-xs text-muted-foreground">
                Controles imediatos do caixa hoje
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium rounded-full"
          >
            <Link to="/caixa">
              Extrato no caixa <ArrowUpRight className="size-3 ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Status de Liquidez & Fiado */}
        <div className="mt-5 space-y-3">
          {/* Card de Alerta Inteligente de Fiado */}
          {openCreditTotal > 0 ? (
            <Link
              to="/fiado"
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl p-3.5 border transition-all hover:scale-[1.01]",
                overdue > 0
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Users className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {ocultarSaldos ? "R$ ••••" : mascaraSaldo(openCreditTotal)} a receber em fiado
                  </p>
                  <p className="text-[11px] opacity-80 truncate">
                    {openCreditsCount} cliente{openCreditsCount !== 1 ? "s" : ""}{" "}
                    {overdue > 0 && `· ${overdue} vencido${overdue !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold underline shrink-0">
                Cobrar ➔
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/50 border border-border/60 p-3.5 text-xs text-foreground">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                ✓
              </span>
              <div>
                <p className="font-semibold">Clientes em dia</p>
                <p className="text-[11px] text-muted-foreground">Nenhum fiado pendente de cobrança no momento.</p>
              </div>
            </div>
          )}

          {/* Botões de Ação Executiva Imediata */}
          <div className="pt-2 grid gap-2 sm:grid-cols-2">
            <Button
              asChild
              className="h-10 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-all text-xs cursor-pointer"
            >
              <Link to="/caixa">
                <Store className="size-3.5 mr-1.5" />
                Venda no Balcão
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-border/80 bg-card hover:bg-secondary/60 text-xs font-medium cursor-pointer"
            >
              <Link to="/caixa">
                <Plus className="size-3.5 mr-1.5 text-muted-foreground" />
                Lançar Despesa
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Rodapé: Sobra Líquida Disponível */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Sobra retida no mês:</span>
        <strong
          className={cn(
            "numeric font-semibold",
            profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {ocultarSaldos ? "R$ ••••" : mascaraSaldo(profit)}
        </strong>
      </div>
    </section>
  );
}
