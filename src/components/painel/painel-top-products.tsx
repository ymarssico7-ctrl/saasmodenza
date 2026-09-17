import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronRight,
  Package,
  Plus,
  Shirt,
  Sparkles,
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

export interface PainelTopProductsProps {
  topProducts: TopProductItem[];
  totalPecasVendidas?: number;
  ticketMedio?: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalCatalogItems: number;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

export function PainelTopProducts({
  topProducts,
  totalPecasVendidas = 0,
  ticketMedio = 0,
  outOfStockCount,
  lowStockCount,
  totalCatalogItems,
  ocultarSaldos,
  mascaraSaldo,
}: PainelTopProductsProps) {
  const activeSellers = topProducts.filter((p) => p.soldCount > 0);
  const hasProducts = activeSellers.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── SEÇÃO: Peças Campeãs de Vendas ────────────────────────────────────── */}
      <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-primary-soft text-accent-foreground">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  Peças Campeãs da Loja
                </h2>
                <p className="text-xs text-muted-foreground">
                  {totalPecasVendidas > 0 ? (
                    <>
                      <strong>{totalPecasVendidas} {totalPecasVendidas === 1 ? "peça vendida" : "peças vendidas"}</strong>
                      {" · "}Ticket médio: {ocultarSaldos ? "R$ ••••" : mascaraSaldo(ticketMedio)}
                    </>
                  ) : (
                    "Mais vendidas na arara e na vitrine este mês"
                  )}
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

          {/* Lista de Peças Campeãs ou Estado Inspirador */}
          {!hasProducts ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2.5 text-center p-4 mt-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground/70 shadow-2xs">
                <Sparkles className="size-5 text-foreground/60" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Araras prontas para faturar
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {totalCatalogItems > 0
                    ? `${totalCatalogItems} ${totalCatalogItems === 1 ? "modelo cadastrado" : "modelos cadastrados"} prontos para venda no balcão ou vitrine.`
                    : "Cadastre suas peças e registre vendas para ver seu ranking de campeãs aqui."}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-full border-border/80 bg-card px-3.5 text-xs font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs mt-1 cursor-pointer"
              >
                <Link to="/caixa">
                  <Plus className="size-3.5 mr-1 text-muted-foreground" />
                  Registrar venda no caixa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border/60">
              {activeSellers.slice(0, 5).map((item, index) => {
                const isOutOfStock = item.totalStock <= 0;
                const isLowStock = item.totalStock > 0 && item.totalStock < 3;

                return (
                  <div
                    key={item.id || index}
                    className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-secondary/30 rounded-xl px-2"
                  >
                    {/* Imagem + Nome + Info */}
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Ranking # */}
                      <span
                        className={cn(
                          "num-display w-4 text-center text-xs font-bold shrink-0",
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

                      {/* Thumbnail elegante */}
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary/50 shadow-2xs">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground/60 bg-gradient-to-br from-primary/10 via-secondary to-muted">
                            <Shirt className="size-5 text-primary/60" />
                          </div>
                        )}
                      </div>

                      {/* Nome e Detalhes da Roupa */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          {isOutOfStock ? (
                            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              Esgotada
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              Últimas {item.totalStock} un.
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-muted-foreground truncate">
                          {item.category}
                          {item.sizesSummary ? ` · ${item.sizesSummary}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Vendas & Receita */}
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {item.soldCount} {item.soldCount === 1 ? "peça" : "peças"}
                      </span>
                      <p className="numeric mt-0.5 text-xs font-medium text-muted-foreground">
                        {ocultarSaldos ? "R$ ••••" : mascaraSaldo(item.revenue)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── SEÇÃO: Saúde de Estoque (Límpida e Despoluída) ────────────────────── */}
      <section className="panel flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 min-h-[310px]">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
                <Package className="size-4" />
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Saúde do Estoque
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {totalCatalogItems} {totalCatalogItems === 1 ? "modelo" : "modelos"}
            </span>
          </div>

          {/* Barra de Distribuição Visual Apple HIG */}
          {totalCatalogItems > 0 && (
            <div className="mt-4">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary/80 gap-0.5">
                {Math.max(0, totalCatalogItems - outOfStockCount - lowStockCount) > 0 && (
                  <div
                    style={{
                      width: `${(Math.max(0, totalCatalogItems - outOfStockCount - lowStockCount) / totalCatalogItems) * 100}%`,
                    }}
                    className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                    title="Estoque saudável"
                  />
                )}
                {lowStockCount > 0 && (
                  <div
                    style={{ width: `${(lowStockCount / totalCatalogItems) * 100}%` }}
                    className="h-full bg-amber-500/80 rounded-full transition-all duration-500"
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
            </div>
          )}

          {/* Lista Limpa de Status de Estoque */}
          <div className="mt-4 space-y-2.5">
            {/* Status 1: Esgotadas */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    outOfStockCount > 0 ? "bg-foreground/35" : "bg-emerald-500/80",
                  )}
                />
                <span className="text-xs text-foreground font-medium">Modelos esgotados</span>
              </div>
              <span className="num-display text-xs font-semibold text-foreground">
                {outOfStockCount} {outOfStockCount === 1 ? "modelo" : "modelos"}
              </span>
            </div>

            {/* Status 2: Últimas Unidades */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    lowStockCount > 0 ? "bg-amber-500/80" : "bg-emerald-500/80",
                  )}
                />
                <span className="text-xs text-foreground font-medium">Últimas unidades (&lt; 3 un.)</span>
              </div>
              <span className="num-display text-xs font-semibold text-foreground">
                {lowStockCount} {lowStockCount === 1 ? "modelo" : "modelos"}
              </span>
            </div>

            {/* Status 3: Grade Disponível */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-foreground font-medium">Modelos com estoque saudável</span>
              </div>
              <span className="num-display text-xs font-semibold text-foreground">
                {Math.max(0, totalCatalogItems - outOfStockCount - lowStockCount)}{" "}
                {Math.max(0, totalCatalogItems - outOfStockCount - lowStockCount) === 1
                  ? "modelo"
                  : "modelos"}
              </span>
            </div>
          </div>
        </div>

        {/* Ação Única e Limpa */}
        <div className="mt-5 pt-3 border-t border-border/60">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 w-full rounded-full text-xs font-medium border-border/80 hover:bg-secondary/60 transition-colors"
          >
            <Link to="/estoque">
              Gerenciar Estoque <ChevronRight className="size-3.5 ml-1 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
