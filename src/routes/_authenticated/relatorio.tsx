import { createFileRoute } from "@tanstack/react-router";
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
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { transactionsQuery } from "@/lib/db";
import { brl, brlCompact, monthLabel, monthLabelShort, monthStart, pct } from "@/lib/format";
import {
  EXIT_CATEGORIES,
  REFUND_CATEGORIES,
  formatVariationHint,
  labelOf,
  sumBy,
  sumByCategories,
  sumByExcluding,
  type Transaction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório financeiro — Vestuli" },
      {
        name: "description",
        content: "Compare meses, veja onde o dinheiro sai e acompanhe a margem da loja.",
      },
      { property: "og:title", content: "Relatório financeiro — Vestuli" },
      {
        property: "og:description",
        content: "Faturamento, despesas por categoria e margem mês a mês.",
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
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];
  const inMonth = (m: string) => txs.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7));

  const current = inMonth(monthStart(0));
  const previous = inMonth(monthStart(-1));

  // ─── DRE Contábil Correto (CPC 00 / IFRS 15) ────────────────────────────────
  // 1. Receita Bruta: todas as entradas (vendas brutas)
  const grossRevenue = sumBy(current, "entrada");
  // 2. Deduções da Receita: estornos e devoluções de clientes (NÃO são despesas OPEX)
  const refunds = sumByCategories(current, "saida", REFUND_CATEGORIES);
  // 3. Receita Líquida Real: o que a loja realmente reteve após devoluções
  const netRevenue = grossRevenue - refunds;
  // 4. Despesas Operacionais (OPEX): saídas que NÃO são devoluções (aluguel, frete, etc.)
  const expenses = sumByExcluding(current, "saida", REFUND_CATEGORIES);
  // 5. Lucro Líquido Real: resultado operacional da loja
  const profit = netRevenue - expenses;

  // Comparativo homogêneo mês anterior (Receita Líquida vs Receita Líquida)
  const previousGross = sumBy(previous, "entrada");
  const previousRefunds = sumByCategories(previous, "saida", REFUND_CATEGORIES);
  const previousNetRevenue = previousGross - previousRefunds;
  // ────────────────────────────────────────────────────────────────────────────

  const bars = Array.from({ length: 6 }, (_, i) => {
    const m = monthStart(-(5 - i));
    const items = inMonth(m);
    return {
      mes: monthLabelShort(m),
      entradas: sumBy(items, "entrada"),
      // Gráfico mostra só despesas OPEX, não devoluções
      saidas: sumByExcluding(items, "saida", REFUND_CATEGORIES),
    };
  });

  const byCategory = Object.entries(
    current
      // Pie de despesas exclui estornos (que são deduções de receita, não custos)
      .filter((t) => t.kind === "saida" && !REFUND_CATEGORIES.has(t.category))
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
        return acc;
      }, {}),
  ).map(([category, value]) => ({ name: labelOf(EXIT_CATEGORIES, category), value }));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(monthStart(0))}
        title="Relatório"
        description="Onde o dinheiro entra, para onde ele vai e qual é a sua margem real."
      />

      {/* DRE Simplificado — 5 camadas contábeis corretas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Receita Bruta" value={brl(grossRevenue)} tone="primary" />
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
        <StatCard label="Despesas Operacionais" value={brl(expenses)} />
        <StatCard
          label="Lucro Líquido Real"
          value={brl(profit)}
          tone={profit >= 0 ? "positive" : "negative"}
          hint={netRevenue > 0 ? `Margem ${pct((profit / netRevenue) * 100)}` : "—"}
        />
      </div>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Entradas x saídas (6 meses)</h2>
        <div className="mt-6 h-[280px]">
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
                formatter={(v: number | string) => brl(Number(v))}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="entradas"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="saidas"
                fill="var(--color-border)"
                radius={[8, 8, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Despesas por categoria</h2>
        {byCategory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma despesa registrada neste mês.
          </p>
        ) : (
          <div className="mt-4 grid items-center gap-6 sm:grid-cols-[260px_1fr]">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | string) => brl(Number(v))}
                    contentStyle={{ borderRadius: 16, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3">
              {byCategory.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
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
  );
}
