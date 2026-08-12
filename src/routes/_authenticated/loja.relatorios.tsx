import { useMemo } from "react";
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
import { BarChart3, PackageSearch, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { brl, brlCompact } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { totalPedido, type Pedido } from "@/data/loja";

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

const CORES_CHART = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function dataBR(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function RelatoriosPage() {
  const { storeId } = useStore();

  // Carrega pedidos reais isolados por loja
  const pedidos = useMemo<Pedido[]>(() => {
    try {
      const stored = localStorage.getItem(`modaly_orders_${storeId}`);
      return stored ? (JSON.parse(stored) as Pedido[]) : [];
    } catch {
      return [];
    }
  }, [storeId]);

  const cupons = useMemo(() => {
    try {
      const stored = localStorage.getItem(`modaly_cupons_${storeId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [storeId]);

  // KPIs
  const receita = useMemo(
    () =>
      pedidos
        .filter((p) => p.status === "entregue" || p.status === "enviado")
        .reduce((a, p) => a + totalPedido(p), 0),
    [pedidos],
  );

  const ticketMedio = useMemo(
    () => (pedidos.length > 0 ? pedidos.reduce((a, p) => a + totalPedido(p), 0) / pedidos.length : 0),
    [pedidos],
  );

  // Vendas por dia — últimos 8 dias
  const vendasPorDia = useMemo(() => {
    const today = new Date();
    const days: { dia: string; vendas: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);
      const total = pedidos
        .filter((p) => p.criadoEm.startsWith(isoDate))
        .reduce((a, p) => a + totalPedido(p), 0);
      days.push({ dia: dataBR(isoDate), vendas: total });
    }
    return days;
  }, [pedidos]);

  // Categorias (derivadas dos itens dos pedidos)
  const vendasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pedido of pedidos) {
      for (const item of pedido.itens) {
        map[item.nome] = (map[item.nome] ?? 0) + item.preco * item.qtd;
      }
    }
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome: nome.length > 18 ? nome.slice(0, 18) + "…" : nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [pedidos]);

  // Produtos mais vendidos por quantidade
  const topProdutos = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pedido of pedidos) {
      for (const item of pedido.itens) {
        map[item.nome] = (map[item.nome] ?? 0) + item.qtd;
      }
    }
    return Object.entries(map)
      .map(([nome, vendas]) => ({ nome: nome.length > 22 ? nome.slice(0, 22) + "…" : nome, vendas }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5);
  }, [pedidos]);

  // Origem dos pedidos
  const origemPedidos = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pedido of pedidos) {
      const origem = pedido.origem ?? "Vitrine";
      map[origem] = (map[origem] ?? 0) + 1;
    }
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor }));
  }, [pedidos]);

  const semPedidos = pedidos.length === 0;

  return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          title="Relatórios"
          description="Visão completa do desempenho da sua loja online. Dados em tempo real."
        />

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Receita confirmada",
              value: brl(receita),
              icon: <Wallet className="h-4 w-4" />,
            },
            {
              label: "Pedidos no total",
              value: pedidos.length.toString(),
              icon: <ShoppingBag className="h-4 w-4" />,
            },
            {
              label: "Ticket médio",
              value: brl(ticketMedio),
              icon: <Receipt className="h-4 w-4" />,
            },
            {
              label: "Cupons ativos",
              value: cupons.filter((c: { ativo: boolean }) => c.ativo).length.toString(),
              icon: <TrendingUp className="h-4 w-4" />,
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
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
                {kpi.icon}
              </div>
            </div>
          ))}
        </div>

        {semPedidos ? (
          <EmptyState
            icon={<PackageSearch className="h-7 w-7" />}
            title="Sem dados de vendas ainda"
            description="Quando suas clientes fizerem pedidos pela vitrine, os relatórios serão gerados automaticamente aqui."
          />
        ) : (
          <>
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
              {topProdutos.length > 0 && (
                <SectionCard
                  title="Produtos mais vendidos"
                  description="Unidades vendidas por produto."
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
              )}

              {/* Receita por item/categoria */}
              {vendasPorCategoria.length > 0 && (
                <SectionCard
                  title="Receita por produto"
                  description="Distribuição da receita pelos produtos mais vendidos."
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
              )}
            </div>

            {/* Origem dos pedidos */}
            {origemPedidos.length > 0 && (
              <SectionCard
                title="Origem dos pedidos"
                description="Como suas clientes chegaram até o checkout."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {origemPedidos.map((o) => {
                    const total = origemPedidos.reduce((a, x) => a + x.valor, 0);
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
            )}
          </>
        )}
      </div>
  );
}
