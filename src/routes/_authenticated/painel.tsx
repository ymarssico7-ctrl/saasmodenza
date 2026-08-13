import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  HandCoins,
  Plus,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { creditsQuery, goalsQuery, profileQuery, transactionsQuery } from "@/lib/db";
import { brl, brlCompact, formatDate, monthLabel, monthStart, pct, todayISO } from "@/lib/format";
import { creditStatus, projectMonth, sumBy, variation, type Transaction } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel financeiro — Modé" },
      {
        name: "description",
        content: "Visão geral do faturamento, despesas, lucro, meta e fiado da sua loja de moda.",
      },
      { property: "og:title", content: "Painel financeiro — Modé" },
      { property: "og:description", content: "Faturamento, lucro, meta e fiado em um só lugar." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: profile } = useQuery(profileQuery());
  const { data: all = [] } = useQuery(transactionsQuery());
  const { data: credits = [] } = useQuery(creditsQuery());
  const { data: goals = [] } = useQuery(goalsQuery());

  const today = todayISO();
  const thisMonth = monthStart(0);
  const prevMonth = monthStart(-1);

  const txs = all as unknown as Transaction[];
  const inMonth = (m: string) => txs.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7));

  const current = inMonth(thisMonth);
  const previous = inMonth(prevMonth);

  const revenue = sumBy(current, "entrada");
  const expenses = sumBy(current, "saida");
  const profit = revenue - expenses;
  const prevRevenue = sumBy(previous, "entrada");
  const revVariation = variation(revenue, prevRevenue);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = projectMonth(revenue, now.getDate(), daysInMonth);

  const goal = goals.find((g) => g.month.slice(0, 7) === thisMonth.slice(0, 7));
  const goalTarget = Number(goal?.target_amount ?? 0);
  const goalProgress = goalTarget > 0 ? Math.min((revenue / goalTarget) * 100, 100) : 0;

  const openCredits = credits.filter(
    (c) =>
      creditStatus(
        { amount: Number(c.amount), paid_amount: Number(c.paid_amount), due_date: c.due_date },
        today,
      ) !== "pago",
  );
  const openCreditTotal = openCredits.reduce(
    (acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)),
    0,
  );
  const overdue = openCredits.filter((c) => c.due_date < today).length;

  const series = Array.from({ length: 6 }, (_, i) => {
    const m = monthStart(-(5 - i));
    const items = inMonth(m);
    return {
      month: monthLabel(m).split(" de ")[0]?.slice(0, 3),
      faturamento: sumBy(items, "entrada"),
      lucro: sumBy(items, "entrada") - sumBy(items, "saida"),
    };
  });

  const recent = txs.slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(thisMonth)}
        title={`Olá, ${(profile?.owner_name || "lojista").split(" ")[0]}`}
        description={`Aqui está o retrato financeiro de ${profile?.store_name || "sua loja"} hoje.`}
        action={
          <Button asChild className="h-11 rounded-full px-5 font-semibold">
            <Link to="/caixa">
              <Plus className="size-4" /> Novo lançamento
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value={brl(revenue)}
          icon={<ArrowUpRight className="size-4" />}
          tone="primary"
          hint={`${revVariation >= 0 ? "+" : ""}${pct(revVariation)} vs. mês anterior`}
        />
        <StatCard
          label="Despesas do mês"
          value={brl(expenses)}
          icon={<ArrowDownRight className="size-4" />}
          hint={`${current.filter((t) => t.kind === "saida").length} saídas registradas`}
        />
        <StatCard
          label="Lucro do mês"
          value={brl(profit)}
          tone={profit >= 0 ? "positive" : "negative"}
          icon={<Wallet className="size-4" />}
          hint={revenue > 0 ? `Margem de ${pct((profit / revenue) * 100)}` : "Sem vendas ainda"}
        />
        <StatCard
          label="Projeção de fechamento"
          value={brlCompact(projection)}
          icon={<TrendingUp className="size-4" />}
          hint={`Baseado no ritmo dos ${now.getDate()} primeiros dias`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Evolução dos últimos 6 meses</h2>
              <p className="mt-1 text-xs text-muted-foreground">Faturamento e lucro por mês</p>
            </div>
          </div>
          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="luc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
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
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#fat)"
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  stroke="var(--color-success)"
                  strokeWidth={2.5}
                  fill="url(#luc)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="space-y-4">
          <section className="panel p-6">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Meta do mês</h2>
            </div>
            {goalTarget > 0 ? (
              <>
                <p className="numeric mt-4 text-2xl font-semibold">{brl(revenue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">de {brl(goalTarget)}</p>
                <Progress value={goalProgress} className="mt-4 h-2" />
                <p className="mt-3 text-xs text-muted-foreground">
                  {pct(goalProgress)} da meta alcançada
                </p>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Você ainda não definiu a meta deste mês.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                  <Link to="/metas">Definir meta</Link>
                </Button>
              </div>
            )}
          </section>

          <section className="panel p-6">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Fiado em aberto</h2>
            </div>
            <p className="numeric mt-4 text-2xl font-semibold">{brl(openCreditTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {openCredits.length} pendente(s)
              {overdue > 0 ? ` · ${overdue} vencido(s)` : ""}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
              <Link to="/fiado">Gerenciar fiado</Link>
            </Button>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel p-6 sm:p-7">
          <h2 className="text-base font-semibold">Últimos lançamentos</h2>
          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nenhum lançamento ainda. Comece registrando a primeira venda do dia.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(t.occurred_on)}
                    </p>
                  </div>
                  <p
                    className={`numeric shrink-0 text-sm font-semibold ${
                      t.kind === "entrada" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.kind === "entrada" ? "+" : "−"}
                    {brl(Number(t.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Atalhos</h2>
          <div className="mt-4 grid gap-2">
            <Shortcut
              to="/precificacao"
              icon={<Calculator className="size-4" />}
              label="Precificar peça"
            />
            <Shortcut
              to="/prolabore"
              icon={<HandCoins className="size-4" />}
              label="Registrar pró-labore"
            />
            <Shortcut
              to="/relatorio"
              icon={<TrendingUp className="size-4" />}
              label="Ver relatório"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Shortcut({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
