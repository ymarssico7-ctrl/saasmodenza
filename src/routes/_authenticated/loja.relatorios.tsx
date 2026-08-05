import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
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
import { BarChart3, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { brl, brlCompact } from "@/lib/format";
import { kpisLoja, pedidos, produtos, totalPedido, vendasPorDia } from "@/data/loja";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios da Loja — Modenza" },
      {
        name: "description",
        content: "Análise completa de vendas, produtos mais vendidos e desempenho da loja online.",
      },
    ],
  }),
  component: RelatoriosPage,
});

// Derived data
const vendasPorCategoria = (() => {
  const map: Record<string, number> = {};
  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      const produto = produtos.find((p) => p.id === item.produtoId);
      if (produto) {
        map[produto.categoria] = (map[produto.categoria] ?? 0) + item.preco * item.qtd;
      }
    }
  }
  return Object.entries(map)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
})();

const topProdutos = [...produtos]
  .sort((a, b) => b.vendas - a.vendas)
  .slice(0, 5)
  .map((p) => ({ nome: p.nome.length > 22 ? p.nome.slice(0, 22) + "…" : p.nome, vendas: p.vendas }));

const CORES_CHART = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const receita = pedidos
  .filter((p) => p.status === "entregue" || p.status === "enviado")
  .reduce((a, p) => a + totalPedido(p), 0);

const ticketMedio =
  pedidos.length > 0
    ? pedidos.reduce((a, p) => a + totalPedido(p), 0) / pedidos.length
    : 0;

const taxaConversao = 3.8; // % mock

function RelatoriosPage() {
  return (
    <PlanGuard
      requires="digital"
      featureName="Relatórios da Loja"
      featureDescription="Análise completa de desempenho da sua loja online com gráficos e métricas detalhadas. Disponível no Plano Digital."
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          title="Relatórios"
          description="Visão completa do desempenho da sua loja online. Dados dos últimos 30 dias."
        />

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Receita confirmada",
              value: brl(receita),
              icon: <Wallet className="h-4 w-4" />,
              delta: "+37%",
              up: true,
            },
            {
              label: "Pedidos no mês",
              value: kpisLoja.pedidos.toString(),
              icon: <ShoppingBag className="h-4 w-4" />,
              delta: "+29%",
              up: true,
            },
            {
              label: "Ticket médio",
              value: brl(ticketMedio),
              icon: <Receipt className="h-4 w-4" />,
              delta: "+7%",
              up: true,
            },
            {
              label: "Taxa de conversão",
              value: `${taxaConversao}%`,
              icon: <TrendingUp className="h-4 w-4" />,
              delta: "+0,4pp",
              up: true,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="surface-card flex items-start justify-between gap-3 p-5"
            >
              <div>
                <p className="num-display text-2xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
                  {kpi.icon}
                </div>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                  {kpi.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Vendas por dia */}
        <SectionCard
          title="Vendas diárias"
          description="Receita bruta por dia nos últimos 8 dias."
          bodyClassName="px-2 pb-4 pt-5 sm:px-4"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vendasPorDia} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillVendasRel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => brlCompact(v)}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  formatter={(v) => brl(Number(v))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-popover)",
                    color: "var(--color-popover-foreground)",
                    boxShadow: "var(--shadow-lifted)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#fillVendasRel)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Produtos mais vendidos */}
          <SectionCard
            title="Produtos mais vendidos"
            description="Unidades vendidas desde o início."
            bodyClassName="px-2 pb-4 pt-5 sm:px-4"
          >
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProdutos} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} un.`, "Vendas"]}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="vendas" radius={[0, 8, 8, 0]} fill="var(--color-chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Vendas por categoria */}
          <SectionCard
            title="Receita por categoria"
            description="Distribuição da receita por tipo de peça."
            bodyClassName="flex flex-col items-center gap-4 pb-4 pt-5"
          >
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendasPorCategoria}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {vendasPorCategoria.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CORES_CHART[i % CORES_CHART.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              {vendasPorCategoria.map((cat, i) => (
                <div key={cat.nome} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CORES_CHART[i % CORES_CHART.length] }}
                  />
                  <span className="text-muted-foreground">{cat.nome}</span>
                  <span className="ml-auto font-semibold num-display">{brl(cat.valor)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Origem dos pedidos */}
        <SectionCard
          title="Origem dos pedidos"
          description="Como suas clientes chegaram até o checkout."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {kpisLoja.origem.map((o) => {
              const total = kpisLoja.origem.reduce((a, x) => a + x.valor, 0);
              const pct = Math.round((o.valor / total) * 100);
              return (
                <div
                  key={o.nome}
                  className="rounded-2xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{o.nome}</p>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="num-display mt-2 text-2xl font-bold">{o.valor}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pct}% do total de pedidos</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="gradient-primary h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </PlanGuard>
  );
}

