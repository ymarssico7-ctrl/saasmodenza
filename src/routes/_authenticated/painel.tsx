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
import { Skeleton } from "@/components/ui/skeleton";
import { ActivationChecklist } from "@/components/activation-checklist";
import { useStore } from "@/lib/store-context";
import { creditsQuery, goalsQuery, inventoryQuery, profileQuery, transactionsQuery } from "@/lib/db";
import { brl, brlCompact, formatDate, monthLabel, monthLabelShort, monthStart, pct, todayISO } from "@/lib/format";
import {
  REFUND_CATEGORIES,
  STOCK_PURCHASE_CATEGORIES,
  PROLABORE_CATEGORIES,
  OPEX_CATEGORIES,
  creditStatus,
  formatVariationHint,
  projectMonth,
  sumBy,
  sumByCategories,
  sumByExcluding,
  variation,
  type Transaction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel financeiro — Vestuli" },
      {
        name: "description",
        content: "Visão geral do faturamento, despesas, lucro, meta e fiado da sua loja de moda.",
      },
      { property: "og:title", content: "Painel financeiro — Vestuli" },
      { property: "og:description", content: "Faturamento, lucro, meta e fiado em um só lugar." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { storeId, store } = useStore();
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { data: all = [], isLoading: isTxsLoading } = useQuery(transactionsQuery());
  const { data: inventory = [] } = useQuery(inventoryQuery());
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
  const refunds = sumByCategories(current, "saida", REFUND_CATEGORIES);
  const netRevenue = revenue - refunds;
  // Segregação contábil homogênea com relatorio.tsx:
  // OPEX puro exclui devoluções, pró-labore E compra de estoque (patrimônio em arara)
  const opexExclusions = new Set([...REFUND_CATEGORIES, ...PROLABORE_CATEGORIES, ...STOCK_PURCHASE_CATEGORIES]);
  const expenses = sumByExcluding(current, "saida", opexExclusions);
  // Lucro Operacional: resultado das vendas menos despesas correntes de manutenção da loja
  const operatingProfit = netRevenue - expenses;
  // Pró-labore retirado no mês
  const prolaboreAmount = sumByCategories(current, "saida", PROLABORE_CATEGORIES);
  // Compras de estoque no mês (investimento em novas coleções)
  const stockPurchases = sumByCategories(current, "saida", STOCK_PURCHASE_CATEGORIES);
  // Sobra no Caixa: saldo líquido final retido na conta bancária/gaveta
  const profit = operatingProfit - stockPurchases - prolaboreAmount;
  const prevRevenue = sumBy(previous, "entrada");
  const revVariation = variation(revenue, prevRevenue);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = projectMonth(netRevenue, now.getDate(), daysInMonth);

  const goal = goals.find((g) => g.month.slice(0, 7) === thisMonth.slice(0, 7));
  const goalTarget = Number(goal?.target_amount ?? 0);
  // Fix 1: progresso da meta usa Receita Líquida (idêntico a metas.tsx — base homogênea)
  const goalProgress = goalTarget > 0 ? Math.min((netRevenue / goalTarget) * 100, 100) : 0;

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

  // Série histórica — fórmula unificada com relatorio.tsx
  const series = Array.from({ length: 6 }, (_, i) => {
    const m = monthStart(-(5 - i));
    const items = inMonth(m);
    const mRevenue  = sumBy(items, "entrada");
    const mRefunds  = sumByCategories(items, "saida", REFUND_CATEGORIES);
    const mOpex     = sumByExcluding(items, "saida", opexExclusions);
    const mStock    = sumByCategories(items, "saida", STOCK_PURCHASE_CATEGORIES);
    const mPro      = sumByCategories(items, "saida", PROLABORE_CATEGORIES);
    return {
      month: monthLabelShort(m),
      faturamento: mRevenue,
      // Lucro retido no caixa = Receita Líquida − OPEX − Compras de Estoque − Pró-labore
      lucro: (mRevenue - mRefunds) - mOpex - mStock - mPro,
    };
  });

  // Fix 8: filtra pelo mês atual e ordena por data desc — exibe os lançamentos mais recentes
  const recent = [...current]
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    .slice(0, 6);

  if (isProfileLoading || isTxsLoading) {
    return (
      <div className="space-y-10">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-52 sm:h-12" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
              <Skeleton className="h-9 w-28 mt-4" />
              <Skeleton className="h-3.5 w-36 mt-2" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="panel p-6 sm:p-7 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[260px] w-full mt-6" />
          </div>
          <div className="space-y-4">
            <div className="panel p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="panel p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rawOwner = profile?.owner_name?.trim();
  const greetingName =
    rawOwner && rawOwner.toLowerCase() !== "lojista" && rawOwner.toLowerCase() !== "visitante"
      ? rawOwner.split(" ")[0]
      : "Lojista";

  const rawStore = profile?.store_name?.trim();
  const hasCustomStore = Boolean(rawStore && rawStore !== "Loja Demo" && rawStore !== "Minha loja");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(thisMonth)}
        title={`Olá, ${greetingName}`}
        description={
          hasCustomStore
            ? `Aqui está o resumo financeiro da sua boutique (${rawStore}) hoje.`
            : "Aqui está o resumo financeiro da sua boutique hoje."
        }
        action={
          <Button asChild className="h-11 rounded-full px-5 font-semibold shadow-xs">
            <Link to="/caixa">
              <Plus className="size-4" /> Novo lançamento
            </Link>
          </Button>
        }
      />

      <ActivationChecklist
        storeId={storeId}
        storeName={profile?.store_name || store?.name}
        storeSlug={store?.slug}
        hasInventory={inventory.length > 0}
        inventoryCount={inventory.length}
        hasSales={txs.some((t) => t.kind === "entrada")}
        salesCount={txs.filter((t) => t.kind === "entrada").length}
        hasGoal={goalTarget > 0}
        hasStorefront={Boolean(store?.slug)}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value={brl(revenue)}
          icon={<ArrowUpRight className="size-4" />}
          tone="primary"
          hint={
            refunds > 0
              ? `Líquido: ${brl(netRevenue)} (−${brl(refunds)} em devoluções)`
              : formatVariationHint(revenue, prevRevenue)
          }
        />
        <StatCard
          label="Despesas da loja"
          value={brl(expenses)}
          icon={<ArrowDownRight className="size-4" />}
          hint={(() => {
            const opexCount = current.filter(
              (t) => t.kind === "saida" && !opexExclusions.has(t.category),
            ).length;
            const parts: string[] = [];
            if (opexCount > 0) parts.push(`${opexCount} despesa${opexCount !== 1 ? "s" : ""}`);
            if (stockPurchases > 0) parts.push(`reinvestiu ${brl(stockPurchases)} em roupas`);
            if (prolaboreAmount > 0) parts.push(`exclui ${brl(prolaboreAmount)} pró-labore`);
            if (parts.length === 0) return "Nenhuma despesa registrada";
            return parts.join(" · ");
          })()}
        />
        <StatCard
          label="Sobra no caixa"
          value={brl(profit)}
          tone={profit >= 0 ? "positive" : "negative"}
          icon={<Wallet className="size-4" />}
          hint={(() => {
            if (netRevenue <= 0) return "Sem vendas ainda";
            const marginStr = `Margem ${pct((operatingProfit / netRevenue) * 100)} na operação`;
            if (stockPurchases > 0 && prolaboreAmount > 0) {
              return `Após ${brl(stockPurchases)} estoque e ${brl(prolaboreAmount)} pró-labore`;
            }
            if (stockPurchases > 0) return `Após ${brl(stockPurchases)} em estoque novo`;
            if (prolaboreAmount > 0) return `Após ${brl(prolaboreAmount)} pró-labore`;
            return marginStr;
          })()}
        />
        <StatCard
          label="Projeção de fechamento"
          value={brl(projection)}
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
                  formatter={(v: any, name: any) => [
                    brl(Number(v)),
                    name === "faturamento"
                      ? "Faturamento"
                      : name === "lucro"
                        ? "Resultado líquido"
                        : name,
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
                <p className="numeric mt-4 text-2xl font-semibold">{brl(netRevenue)}</p>
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
