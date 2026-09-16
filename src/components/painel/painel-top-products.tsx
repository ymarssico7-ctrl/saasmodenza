import React from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Package,
  Plus,
  Shirt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { brl } from "@/lib/format";
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

export interface PainelTopProductsProps {
  topProducts: TopProductItem[];
  outOfStockCount: number;
  lowStockCount: number;
  totalCatalogItems: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelTopProducts({
  topProducts,
  outOfStockCount,
  lowStockCount,
  totalCatalogItems,
  ocultarSaldos,
  mascaraSaldo,
}: PainelTopProductsProps) {
  // Apenas considera que tem produtos se houver ao menos 1 peça vendida
  const activeSellers = topProducts.filter((p) => p.soldCount > 0);
  const hasProducts = activeSellers.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* ── SEÇÃO: Peças Campeãs de Vendas ────────────────────────────────────── */}
      <section className="panel flex flex-col justify-between p-6 sm:p-7 transition-all duration-300">
        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-lg bg-primary-soft text-accent-foreground">
                  <Sparkles className="size-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  Peças Campeãs da Loja
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Roupas que mais saíram da arara e geraram faturamento este mês
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full text-xs font-medium border-border/80 self-start sm:self-auto mt-2 sm:mt-0"
            >
              <Link to="/estoque">
                Ver todo o estoque <ArrowUpRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          {/* Lista de Peças Campeãs */}
          {!hasProducts ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center p-6 mt-4 rounded-2xl border border-dashed border-border/70 bg-secondary/20">
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary/80 text-muted-foreground">
                <Shirt className="size-6 text-primary" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Aguardando primeiras vendas do mês
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conforme suas vendas forem registradas no balcão ou na vitrine online, suas roupas campeãs surgirão aqui com foto e receita gerada.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-medium mt-1">
                <Link to="/caixa">
                  <Plus className="size-3.5 mr-1" /> Registrar venda no caixa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-border/60">
              {activeSellers.slice(0, 5).map((item, index) => {
                const isOutOfStock = item.totalStock <= 0;
                const isLowStock = item.totalStock > 0 && item.totalStock < 3;

                return (
                  <div
                    key={item.id || index}
                    className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-secondary/30 rounded-xl px-2"
                  >
                    {/* Imagem + Nome + Info */}
                    <div className="flex min-w-0 items-center gap-3.5">
                      {/* Ranking # */}
                      <span
                        className={cn(
                          "num-display w-5 text-center text-xs font-bold shrink-0",
                          index === 0
                            ? "text-amber-500 font-extrabold"
                            : index === 1
                              ? "text-slate-400 font-bold"
                              : index === 2
                                ? "text-amber-700 font-bold"
                                : "text-muted-foreground/80",
                        )}
                      >
                        #{index + 1}
                      </span>

                      {/* Foto ou Thumbnail elegante */}
                      <div className="relative size-13 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary/50 shadow-2xs">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground/60 bg-gradient-to-br from-primary/10 via-secondary to-muted">
                            <Shirt className="size-6 text-primary/60" />
                          </div>
                        )}
                      </div>

                      {/* Nome e Detalhes da Roupa */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          {/* Badge de Estoque */}
                          {isOutOfStock ? (
                            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              Esgotada
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              Últimas {item.totalStock} un.
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {item.category}
                          {item.sizesSummary ? ` · ${item.sizesSummary}` : ""}
                          {item.colors && item.colors.length > 0 ? ` · ${item.colors.join(", ")}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Vendas & Receita */}
                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {item.soldCount} {item.soldCount === 1 ? "peça" : "peças"}
                        </span>
                      </div>
                      <p className="numeric mt-1 text-xs font-medium text-muted-foreground">
                        {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(item.revenue)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé sutil com dica de moda */}
        {hasProducts && (
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Baseado nas saídas de estoque e pedidos confirmados deste mês.</span>
            <Link
              to="/estoque"
              className="text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              Giro completo <ChevronRight className="size-3" />
            </Link>
          </div>
        )}
      </section>

      {/* ── SEÇÃO: Saúde de Estoque & Alertas de Reposição ────────────────────── */}
      <section className="panel flex flex-col justify-between p-6 sm:p-7 transition-all duration-300">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package className="size-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Saúde do Estoque
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhe rupturas para não perder vendas nas araras
          </p>

          <div className="mt-5 space-y-3">
            {/* Alerta 1: Esgotadas */}
            <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 transition-all">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Peças Esgotadas
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Sem unidades disponíveis para venda
                  </p>
                </div>
              </div>
              <span className="num-display rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                {outOfStockCount} {outOfStockCount === 1 ? "peça" : "peças"}
              </span>
            </div>

            {/* Alerta 2: Últimas Unidades */}
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 transition-all">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                    Últimas Unidades
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Menos de 3 peças restantes na grade
                  </p>
                </div>
              </div>
              <span className="num-display rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                {lowStockCount} {lowStockCount === 1 ? "peça" : "peças"}
              </span>
            </div>

            {/* Status do Catálogo Ativo */}
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total de modelos cadastrados:</span>
                <strong className="text-foreground num-display text-sm font-semibold">
                  {totalCatalogItems} modelos
                </strong>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Estoque atualizado em tempo real com vendas no balcão e pedidos da vitrine.
              </p>
            </div>
          </div>
        </div>

        {/* Ações de Reposição */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 flex-1 rounded-xl text-xs font-medium border-border/80"
          >
            <Link to="/estoque">
              Repor no Estoque
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-9 flex-1 rounded-xl gradient-primary text-xs font-semibold shadow-glow"
          >
            <Link to="/precificacao">
              <Plus className="size-3.5 mr-1" /> Nova Coleção
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
