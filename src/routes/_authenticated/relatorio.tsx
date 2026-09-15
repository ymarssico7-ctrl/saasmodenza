import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  BadgePercent,
  BarChart3,
  ExternalLink,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionsQuery, inventoryQuery } from "@/lib/db";
import { brl, brlCompact, monthLabel, monthLabelShort, monthStart, pct } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import {
  EXIT_CATEGORIES,
  REFUND_CATEGORIES,
  STOCK_PURCHASE_CATEGORIES,
  PROLABORE_CATEGORIES,
  formatVariationHint,
  labelOf,
  sumBy,
  sumByCategories,
  sumByExcluding,
  type Transaction,
} from "@/lib/finance";
import { totalPedido, type Pedido } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatórios & Inteligência — Vestui" },
      {
        name: "description",
        content: "DRE contábil completo, análise de lucro real, produtos mais vendidos e canais de venda da sua loja.",
      },
    ],
  }),
  component: Relatorio,
});

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "var(--color-muted-foreground)",
  "var(--color-chart-4)",
];

function Relatorio() {
  const { store, storeId } = useStore();
  const vitrineAtiva = isVitrineAtiva(storeId, store?.metadata);
  const { data: all = [] } = useQuery(transactionsQuery());
  const { data: inventoryItems = [] } = useQuery(inventoryQuery());
  const txs = all as unknown as Transaction[];

  // Pedidos da loja online
  const [orders, setOrders] = useState<Pedido[]>([]);
  useEffect(() => {
    if (!storeId) return;
    try {
      const stored =
        localStorage.getItem(`vestui_orders_${storeId}`) ||
        localStorage.getItem(`vestui_orders_${storeId}`);
      setOrders(stored ? (JSON.parse(stored) as Pedido[]) : []);
    } catch {
      setOrders([]);
    }
  }, [storeId]);

  const inMonth = (m: string) => txs.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7));
  const current = inMonth(monthStart(0));
  const previous = inMonth(monthStart(-1));

  // ─── DRE Contábil ───────────────────────────────────────────────────────────
  const grossRevenue = sumBy(current, "entrada");
  const onlineRevenue = sumByCategories(current, "entrada", new Set(["venda_online"]));
  const physicalRevenue = Math.max(0, grossRevenue - onlineRevenue);
  const refunds = sumByCategories(current, "saida", REFUND_CATEGORIES);
  const netRevenue = grossRevenue - refunds;
  const opexExclusions = new Set([...REFUND_CATEGORIES, ...PROLABORE_CATEGORIES, ...STOCK_PURCHASE_CATEGORIES]);
  const opexExpenses = sumByExcluding(current, "saida", opexExclusions);
  const operatingProfit = netRevenue - opexExpenses;
  const stockPurchases = sumByCategories(current, "saida", STOCK_PURCHASE_CATEGORIES);
  const prolaboreWithdrawals = sumByCategories(current, "saida", PROLABORE_CATEGORIES);
  const retainedProfit = operatingProfit - stockPurchases - prolaboreWithdrawals;

  const previousGross = sumBy(previous, "entrada");
  const previousRefunds = sumByCategories(previous, "saida", REFUND_CATEGORIES);
  const previousNetRevenue = previousGross - previousRefunds;

  const bars = Array.from({ length: 6 }, (_, i) => {
    const m = monthStart(-(5 - i));
    const items = inMonth(m);
    return {
      mes: monthLabelShort(m),
      entradas: sumBy(items, "entrada"),
      saidas: sumByExcluding(items, "saida", REFUND_CATEGORIES),
    };
  });

  const byCategory = Object.entries(
    current
      .filter((t) => t.kind === "saida" && !opexExclusions.has(t.category))
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
        return acc;
      }, {}),
  ).map(([category, value]) => ({ name: labelOf(EXIT_CATEGORIES, category), value }));

  // ─── Inteligência de Produtos & Peças Mais Vendidas ─────────────────────────
  const pedidosValidos = useMemo(
    () => orders.filter((p) => p.status !== "cancelado"),
    [orders],
  );

  const topProdutos = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number }> = {};
    for (const p of pedidosValidos) {
      for (const it of p.itens || []) {
        const nome = it.nome || "Peça";
        if (!map[nome]) map[nome] = { qtd: 0, valor: 0 };
        map[nome].qtd += it.qtd;
        map[nome].valor += it.preco * it.qtd;
      }
    }
    return Object.entries(map)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 6);
  }, [pedidosValidos]);

  const totalVendasOnlineQtd = pedidosValidos.length;
  const ticketMedioOnline =
    totalVendasOnlineQtd > 0
      ? pedidosValidos.reduce((acc, p) => acc + totalPedido(p), 0) / totalVendasOnlineQtd
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Meu Financeiro"
        title="Lucro Real da Loja"
        description="Acompanhe o faturamento líquido, custos e exatamente quanto sobrou no seu bolso."
      />

      <Tabs defaultValue="dre" className="space-y-6">
        <TabsList className="rounded-full bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="dre" className="rounded-full px-5 text-xs font-semibold">
            DRE & Lucro Real
          </TabsTrigger>
          <TabsTrigger value="produtos" className="rounded-full px-5 text-xs font-semibold">
            Peças Mais Vendidas & Canais
          </TabsTrigger>
          {vitrineAtiva && (
            <TabsTrigger value="vestui-pay" className="rounded-full px-5 text-xs font-semibold">
              Vestui Pay & Vendas Online
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── ABA 1: DRE & FINANCEIRO ──────────────────────────────────────── */}
        <TabsContent value="dre" className="space-y-8 mt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground">DRE Gerencial</span> · Conciliação Operacional & Caixa
            </div>
            {prolaboreWithdrawals > 0 && (
              <span className="text-xs text-muted-foreground">
                Pró-labore retirado: <strong className="text-foreground">{brl(prolaboreWithdrawals)}</strong>
              </span>
            )}
          </div>

          {/* DRE em 7 Camadas */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Receita Bruta"
              value={brl(grossRevenue)}
              tone="primary"
              hint={
                onlineRevenue > 0
                  ? `${brl(physicalRevenue)} balcão · ${brl(onlineRevenue)} vitrine`
                  : `${current.filter((t) => t.kind === "entrada").length} vendas confirmadas`
              }
            />
            <StatCard
              label="Estornos / Devoluções"
              value={refunds > 0 ? `− ${brl(refunds)}` : brl(0)}
              hint="Dedução da Receita Bruta"
            />
            <StatCard
              label="Receita Líquida"
              value={brl(netRevenue)}
              hint={formatVariationHint(netRevenue, previousNetRevenue)}
            />
            <StatCard
              label="Despesas da Loja (OPEX)"
              value={brl(opexExpenses)}
              hint="Aluguel, marketing, frete, luz"
            />
            <StatCard
              label="Lucro Operacional"
              value={brl(operatingProfit)}
              tone={operatingProfit >= 0 ? "positive" : "negative"}
              hint={netRevenue > 0 ? `Margem ${pct((operatingProfit / netRevenue) * 100)}` : "—"}
            />
            <StatCard
              label="Compras de Estoque"
              value={brl(stockPurchases)}
              hint={stockPurchases > 0 ? "Patrimônio novo na arara" : "Sem reposição no mês"}
            />
            <StatCard
              label="Sobra no Caixa"
              value={brl(retainedProfit)}
              tone={retainedProfit >= 0 ? "positive" : "negative"}
              hint={
                prolaboreWithdrawals > 0
                  ? "Após estoque e pró-labore"
                  : "Saldo livre em conta"
              }
            />
          </div>

          {/* Gráficos de Finanças */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel p-6 sm:p-7">
              <h2 className="text-base font-semibold">Entradas x Saídas (Últimos 6 meses)</h2>
              <div className="mt-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ left: -18, right: 6, top: 6 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis
                      tickFormatter={(v) => brlCompact(Number(v))}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={78}
                    />
                    <Tooltip
                      formatter={(v: unknown, name: unknown) => [
                        brl(Number(v || 0)),
                        name === "entradas" ? "Entradas" : "Saídas",
                      ]}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-popover)",
                        color: "var(--color-popover-foreground)",
                        boxShadow: "var(--shadow-lifted)",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="entradas"
                      fill="var(--color-primary)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="saidas"
                      fill="var(--color-border)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel p-6 sm:p-7">
              <h2 className="text-base font-semibold">Despesas por Categoria</h2>
              {byCategory.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma despesa registrada neste mês.
                </p>
              ) : (
                <div className="mt-4 grid items-center gap-6 sm:grid-cols-[200px_1fr]">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {byCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number | string) => brl(Number(v))}
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid var(--color-border)",
                            background: "var(--color-popover)",
                            color: "var(--color-popover-foreground)",
                            boxShadow: "var(--shadow-lifted)",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2.5">
                    {byCategory.map((c, i) => (
                      <li key={c.name} className="flex items-center justify-between gap-4 text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                          {c.name}
                        </span>
                        <span className="numeric font-semibold">{brl(c.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        {/* ─── ABA 2: PRODUTOS & CANAIS ─────────────────────────────────────── */}
        <TabsContent value="produtos" className="space-y-6 mt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Vendas da Vitrine Online"
              value={brl(onlineRevenue)}
              hint={`${totalVendasOnlineQtd} pedidos realizados`}
              icon={<ShoppingBag className="size-4" />}
            />
            <StatCard
              label="Ticket Médio Online"
              value={brl(ticketMedioOnline)}
              hint="Média por pedido fechado"
              icon={<Receipt className="size-4" />}
            />
            <StatCard
              label="Total de Peças em Catálogo"
              value={String(inventoryItems.length)}
              hint="Cadastradas no estoque"
              icon={<PackageSearch className="size-4" />}
            />
          </div>

          <section className="panel p-6 sm:p-7">
            <h2 className="text-base font-semibold">Peças Mais Vendidas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranking das roupas mais procuradas e que mais geram faturamento.
            </p>

            {topProdutos.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Ainda não há vendas registradas para calcular o ranking.
              </p>
            ) : (
              <div className="mt-6 divide-y divide-border/60">
                {topProdutos.map((prod, idx) => (
                  <div key={prod.nome} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{prod.nome}</p>
                        <p className="text-xs text-muted-foreground">{prod.qtd} unidades vendidas</p>
                      </div>
                    </div>
                    <span className="num-display text-sm font-bold text-primary">
                      {brl(prod.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* ─── ABA 3: VESTUI PAY & RECEBIMENTOS DIGITAIS ─────────────────────── */}
        {vitrineAtiva && (
          <TabsContent value="vestui-pay" className="space-y-6 mt-0">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Faturamento na Vitrine"
                value={brl(onlineRevenue)}
                tone="primary"
                hint="Total líquido conciliado das vendas online"
                icon={<BadgeDollarSign className="size-4" />}
              />
              <StatCard
                label="Pedidos da Vitrine"
                value={String(totalVendasOnlineQtd)}
                hint="Pedidos confirmados"
                icon={<ShoppingBag className="size-4" />}
              />
              <StatCard
                label="Ticket Médio Online"
                value={brl(ticketMedioOnline)}
                hint="Média por pedido fechado"
                icon={<Receipt className="size-4" />}
              />
            </div>

            <section className="panel p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BadgeDollarSign className="size-4" />
                    </span>
                    <h2 className="text-base font-semibold">Extrato, Taxas & Liquidações D+1</h2>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Todas as vendas pelo Pix e Cartão na sua Vitrine Online são conciliadas automaticamente com o caixa da loja, com comprovantes do Banco Central.
                  </p>
                </div>

                <Button asChild className="gradient-primary h-10 rounded-full px-5 text-xs font-semibold shadow-glow shrink-0">
                  <Link to="/loja/recebimentos">
                    Acessar Extrato Completo
                    <ExternalLink className="ml-2 size-3.5" />
                  </Link>
                </Button>
              </div>
            </section>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
