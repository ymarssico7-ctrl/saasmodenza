import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  ChevronRight,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  Package,
  Plus,
  Receipt,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { VestuiGuideBanner } from "@/components/vestui-guide-banner";
import { PainelKpisBento } from "@/components/painel/painel-kpis-bento";
import { PainelTopProducts, type TopProductItem } from "@/components/painel/painel-top-products";
import { useStore } from "@/lib/store-context";
import { usePrivacyMode } from "@/lib/usePrivacyMode";
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";
import {
  creditsQuery,
  goalsQuery,
  inventoryQuery,
  ordersQuery,
  profileQuery,
  transactionsQuery,
} from "@/lib/db";
import {
  brl,
  brlCompact,
  formatDate,
  monthLabel,
  monthLabelShort,
  monthStart,
  pct,
  todayISO,
} from "@/lib/format";
import {
  REFUND_CATEGORIES,
  STOCK_PURCHASE_CATEGORIES,
  PROLABORE_CATEGORIES,
  creditStatus,
  projectMonth,
  sumBy,
  sumByCategories,
  sumByExcluding,
  type Transaction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Vestui" },
      {
        name: "description",
        content:
          "Visão geral integrada do seu varejo de moda: faturamento, lucro real, divisão físico e online, peças vendidas, pedidos e estoque.",
      },
      { property: "og:title", content: "Painel — Vestui" },
      {
        property: "og:description",
        content: "Gestão completa da sua loja de moda e vitrine online em um só lugar.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { storeId, store } = useStore();
  const { ocultarSaldos, togglePrivacidade, mascaraSaldo } = usePrivacyMode();
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { data: all = [], isLoading: isTxsLoading } = useQuery(transactionsQuery());
  const { data: inventory = [], isLoading: isInventoryLoading } = useQuery(inventoryQuery());
  const { data: credits = [] } = useQuery(creditsQuery());
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: rawOrders = [] } = useQuery(ordersQuery(storeId));

  const today = todayISO();
  const thisMonth = monthStart(0);
  const prevMonth = monthStart(-1);

  // ── Gestão de Canais & Ativação da Vitrine ──────────────────────────────────
  const [vitrineAtiva, setVitrineAtiva] = React.useState(() =>
    isVitrineAtiva(storeId, store?.metadata),
  );

  React.useEffect(() => {
    setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    const handleChanged = () => {
      setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    };
    window.addEventListener("vitrine-settings-changed", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("vitrine-settings-changed", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [storeId, store?.metadata]);

  // ── Normalização de Pedidos com Filtro Temporal Estrito ───────────────────
  const orders = React.useMemo(() => {
    return (rawOrders || []) as Array<{
      id: string;
      status?: string;
      total?: number;
      created_at?: string;
      criadoEm?: string;
      itens?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
      items?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
    }>;
  }, [rawOrders]);

  // Pedidos do mês vigente
  const currentMonthOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const dt = o.created_at || o.criadoEm || "";
      return dt.slice(0, 7) === thisMonth.slice(0, 7);
    });
  }, [orders, thisMonth]);

  // Pedidos ativos no mês (exclui cancelados)
  const activeMonthOrders = React.useMemo(() => {
    return currentMonthOrders.filter((o) => o.status !== "cancelado");
  }, [currentMonthOrders]);

  // Pedidos novos aguardando separação
  const pedidosNovos = React.useMemo(() => {
    return orders.filter((o) => o.status === "novo");
  }, [orders]);

  const pedidosNovosCount = pedidosNovos.length;
  const pedidosNovosValor = pedidosNovos.reduce(
    (acc, o) => acc + (Number(o.total) || 0),
    0,
  );

  const pedidosEmSeparacaoCount = React.useMemo(() => {
    return orders.filter((o) => o.status === "em_separacao").length;
  }, [orders]);

  // ── Cálculos Financeiros (Consolidados) ────────────────────────────────────
  const txs = all as unknown as Transaction[];
  const inMonth = (m: string) => txs.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7));

  const current = inMonth(thisMonth);
  const previous = inMonth(prevMonth);

  const revenue = sumBy(current, "entrada");
  const onlineRevenue = sumByCategories(current, "entrada", new Set(["venda_online"]));
  const fisicaRevenue = Math.max(0, revenue - onlineRevenue);

  const refunds = sumByCategories(current, "saida", REFUND_CATEGORIES);
  const netRevenue = revenue - refunds;
  const totalExpenses = sumBy(current, "saida");

  // Segregação contábil homogênea com relatorio.tsx:
  const opexExclusions = new Set([
    ...REFUND_CATEGORIES,
    ...PROLABORE_CATEGORIES,
    ...STOCK_PURCHASE_CATEGORIES,
  ]);
  const expenses = sumByExcluding(current, "saida", opexExclusions);
  const operatingProfit = netRevenue - expenses;
  const prolaboreAmount = sumByCategories(current, "saida", PROLABORE_CATEGORIES);
  const stockPurchases = sumByCategories(current, "saida", STOCK_PURCHASE_CATEGORIES);
  const profit = operatingProfit - stockPurchases - prolaboreAmount;

  const marginPct = React.useMemo(() => {
    if (netRevenue <= 0) return 0;
    return (operatingProfit / netRevenue) * 100;
  }, [operatingProfit, netRevenue]);

  const prevRevenue = sumBy(previous, "entrada");

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());

  const goal = goals.find((g) => g.month.slice(0, 7) === thisMonth.slice(0, 7));
  const goalTarget = Number(goal?.target_amount ?? 0);
  const goalProgress = goalTarget > 0 ? Math.min((netRevenue / goalTarget) * 100, 100) : 0;
  const remainingGoal = Math.max(0, goalTarget - netRevenue);
  const dailyTarget = goalTarget > 0 && remainingGoal > 0 ? remainingGoal / daysRemaining : 0;

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

  // ── Peças Vendidas, Best Sellers & Saúde de Estoque (Reconciliado) ────────
  const { totalPecasVendidas, topProducts, outOfStockCount, lowStockCount, totalCatalogItems } =
    React.useMemo(() => {
      type InvItem = {
        id: string;
        name: string;
        category: string;
        sale_price?: number;
        cost_price?: number;
        photo_url?: string | null;
        image_url?: string | null;
        sizes?: Record<string, number> | null;
        sold_this_month?: number | null;
      };

      const invItems = (inventory.length > 0 ? inventory : []) as unknown as InvItem[];

      let outOfStock = 0;
      let lowStock = 0;

      const salesMap: Record<
        string,
        {
          item: InvItem;
          soldCount: number;
          revenue: number;
          totalStock: number;
        }
      > = {};

      for (const item of invItems) {
        const sizes = (item.sizes ?? {}) as Record<string, number>;
        const stock = Object.values(sizes).reduce(
          (a, b) => a + (Math.round(Number(b)) || 0),
          0,
        );
        if (stock === 0) outOfStock++;
        else if (stock < 3) lowStock++;

        salesMap[item.id] = {
          item,
          soldCount: 0,
          revenue: 0,
          totalStock: stock,
        };
      }

      // 1) Peças vendidas nos pedidos da vitrine DO MÊS ATUAL
      for (const order of activeMonthOrders) {
        const list = order.itens ?? order.items ?? [];
        for (const it of list) {
          const pId = it.produtoId;
          const qtd = Number(it.qtd ?? 1);
          const preco = Number(it.preco ?? 0);

          if (pId && salesMap[pId]) {
            salesMap[pId].soldCount += qtd;
            salesMap[pId].revenue += qtd * preco;
          } else if (it.nome) {
            const matched = Object.values(salesMap).find(
              (s) => s.item.name.toLowerCase() === it.nome?.toLowerCase(),
            );
            if (matched) {
              matched.soldCount += qtd;
              matched.revenue += qtd * preco;
            }
          }
        }
      }

      // 2) Peças vendidas no balcão físico do mês
      for (const t of current) {
        if (t.kind === "entrada" && t.category !== "venda_online") {
          const desc = (t.description || "").toLowerCase();
          for (const s of Object.values(salesMap)) {
            if (desc.includes(s.item.name.toLowerCase())) {
              s.soldCount += 1;
              s.revenue += Number(t.amount);
              break;
            }
          }
        }
      }

      // 3) Fallback se não há vendas detectadas mas o banco possui sold_this_month
      const anySales = Object.values(salesMap).some((s) => s.soldCount > 0);
      if (!anySales) {
        for (const item of invItems) {
          const initSold = Number(item.sold_this_month ?? 0);
          const target = salesMap[item.id];
          if (initSold > 0 && target) {
            target.soldCount += initSold;
            target.revenue += initSold * Number(item.sale_price ?? 0);
          }
        }
      }

      let totalPecas = Object.values(salesMap).reduce((acc, s) => acc + s.soldCount, 0);

      const totalEntradasBalcao = current.filter(
        (t) => t.kind === "entrada" && t.category === "venda_produto",
      ).length;
      if (totalPecas === 0 && totalEntradasBalcao > 0) {
        totalPecas = totalEntradasBalcao;
      }

      const listTop: TopProductItem[] = Object.values(salesMap)
        .filter((s) => s.soldCount > 0)
        .sort((a, b) => b.soldCount - a.soldCount || b.revenue - a.revenue)
        .map((s) => {
          const sizesObj = s.item.sizes ?? {};
          const sizesList = Object.keys(sizesObj).filter((k) => (Number(sizesObj[k]) || 0) > 0);
          return {
            id: s.item.id,
            name: s.item.name,
            category: s.item.category,
            price: Number(s.item.sale_price ?? 0),
            photoUrl: s.item.photo_url ?? s.item.image_url ?? undefined,
            soldCount: s.soldCount,
            revenue: s.revenue,
            totalStock: s.totalStock,
            sizesSummary: sizesList.length > 0 ? `Tam: ${sizesList.join(", ")}` : undefined,
          };
        });

      return {
        totalPecasVendidas: totalPecas,
        topProducts: listTop,
        outOfStockCount: outOfStock,
        lowStockCount: lowStock,
        totalCatalogItems: invItems.length,
      };
    }, [inventory, activeMonthOrders, current]);

  // ── Ticket Médio e Total de Vendas (Reconciliado) ─────────────────────────
  const totalVendasCount = React.useMemo(() => {
    const entradasBalcao = current.filter(
      (t) => t.kind === "entrada" && t.category !== "venda_online",
    ).length;
    const onlineOrdersCount = activeMonthOrders.length;
    return entradasBalcao + onlineOrdersCount;
  }, [current, activeMonthOrders]);

  const ticketMedio = React.useMemo(() => {
    if (totalVendasCount > 0 && revenue > 0) {
      return revenue / totalVendasCount;
    }
    if (totalPecasVendidas > 0 && revenue > 0) {
      return revenue / totalPecasVendidas;
    }
    return 0;
  }, [revenue, totalVendasCount, totalPecasVendidas]);

  // ── Série Histórica de 6 meses ────────────────────────────────────────────
  const series = Array.from({ length: 6 }, (_, i) => {
    const m = monthStart(-(5 - i));
    const items = inMonth(m);
    const mRevenue = sumBy(items, "entrada");
    const mRefunds = sumByCategories(items, "saida", REFUND_CATEGORIES);
    const mOpex = sumByExcluding(items, "saida", opexExclusions);
    const mStock = sumByCategories(items, "saida", STOCK_PURCHASE_CATEGORIES);
    const mPro = sumByCategories(items, "saida", PROLABORE_CATEGORIES);
    return {
      month: monthLabelShort(m),
      faturamento: mRevenue,
      lucro: mRevenue - mRefunds - mOpex - mStock - mPro,
    };
  });

  const totalHistorico = series.reduce(
    (acc, s) => acc + (s.faturamento || 0) + Math.abs(s.lucro || 0),
    0,
  );

  const recent = [...current]
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    .slice(0, 6);

  // ── Skeletons com Geometria Exata (Apple Standard) ────────────────────────
  if (isProfileLoading || isTxsLoading || isInventoryLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-52 sm:h-12" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Bento KPIs Skeletons (Trindade Mestre) */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

        {/* Top Products Bento Skeleton */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
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
    <div className="space-y-7 pb-24">
      {/* ── CABEÇALHO ZEN (Sem Barras Soltas Empilhadas) ───────────────────────── */}
      <PageHeader
        eyebrow={monthLabel(thisMonth)}
        title={`Olá, ${greetingName}`}
        description={
          hasCustomStore
            ? `Aqui está o centro de comando da sua loja (${rawStore}) hoje.`
            : "Aqui está o centro de comando da sua loja hoje."
        }
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePrivacidade}
              title={
                ocultarSaldos
                  ? "Modo Balcão ativo: clique para exibir saldos"
                  : "Ocultar saldos para privacidade no balcão"
              }
              className={cn(
                "h-10 gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all shadow-2xs cursor-pointer",
                ocultarSaldos
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                  : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              {ocultarSaldos ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              <span>{ocultarSaldos ? "Saldos ocultos" : "Ocultar saldos"}</span>
            </Button>
            <Button
              asChild
              className="h-10 rounded-full px-4 font-semibold gradient-primary shadow-glow hover:opacity-95 transition-all cursor-pointer text-xs"
            >
              <Link to="/caixa">
                <Plus className="size-3.5" /> Novo lançamento
              </Link>
            </Button>
          </div>
        }
      />

      {/* Banner de Boas-Vindas / Guia Financeiro */}
      <VestuiGuideBanner
        mode="gestao"
        storeId={storeId}
        storeSlug={store?.slug}
        inventoryCount={inventory.length}
        hasSales={txs.some((t) => t.kind === "entrada")}
        salesCount={txs.filter((t) => t.kind === "entrada").length}
        hasGoal={goalTarget > 0}
        hasStorefront={Boolean(store?.slug)}
      />

      {/* ── 1. BENTO BOX KPIS (Faturamento+Meta, Saídas, Sobra no Caixa, Peças+Ticket) ── */}
      <PainelKpisBento
        revenue={revenue}
        netRevenue={netRevenue}
        prevRevenue={prevRevenue}
        refunds={refunds}
        totalExpenses={totalExpenses}
        expenses={expenses}
        stockPurchases={stockPurchases}
        profit={profit}
        operatingProfit={operatingProfit}
        marginPct={marginPct}
        fisicaRevenue={fisicaRevenue}
        onlineRevenue={onlineRevenue}
        vitrineAtiva={vitrineAtiva}
        totalPecasVendidas={totalPecasVendidas}
        ticketMedio={ticketMedio}
        pedidosNovosCount={pedidosNovosCount}
        pedidosEmSeparacaoCount={pedidosEmSeparacaoCount}
        goalTarget={goalTarget}
        goalProgress={goalProgress}
        dailyTarget={dailyTarget}
        ocultarSaldos={ocultarSaldos}
        mascaraSaldo={mascaraSaldo}
      />

      {/* ── 2. O PULSO DA LOJA (Peças Campeãs da Arara & Saúde do Estoque) ────── */}
      <PainelTopProducts
        topProducts={topProducts}
        totalPecasVendidas={totalPecasVendidas}
        ticketMedio={ticketMedio}
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        totalCatalogItems={totalCatalogItems}
        ocultarSaldos={ocultarSaldos}
        mascaraSaldo={mascaraSaldo}
      />

      {/* ── 3. EVOLUÇÃO FINANCEIRA & METAS ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Gráfico de Evolução 6 Meses com Legenda Visual */}
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold">Evolução dos últimos 6 meses</h2>
              <p className="text-xs text-muted-foreground">
                Faturamento e lucro líquido retido por mês
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="size-2 rounded-full bg-primary" /> Faturamento
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="size-2 rounded-full bg-emerald-500" /> Sobra Líquida
              </span>
            </div>
          </div>
          {totalHistorico === 0 ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center p-6">
              <div className="grid size-10 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                <TrendingUp className="size-5 text-primary/70" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Sua evolução financeira aparecerá aqui
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                O gráfico traçará a curva de faturamento e sobra de caixa conforme as movimentações forem registradas.
              </p>
            </div>
          ) : (
            <div className="mt-5 h-[250px]">
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
                    tickFormatter={(v) => (ocultarSaldos ? "••••" : brlCompact(Number(v)))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={78}
                  />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => [
                      ocultarSaldos ? "R$ ••••••" : brl(Number(v)),
                      name === "faturamento"
                        ? "Faturamento"
                        : name === "lucro"
                          ? "Resultado líquido"
                          : String(name ?? ""),
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
          )}
        </section>

        {/* Coluna Direita: Metas Comerciais + Fiados a Receber */}
        <div className="space-y-4">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Meta do mês</h2>
              </div>
              {goalTarget > 0 && (
                <span className="num-display text-xs font-semibold text-primary">
                  {pct(goalProgress)}
                </span>
              )}
            </div>

            {goalTarget > 0 ? (
              <>
                <p className="numeric mt-3 text-2xl font-semibold">{mascaraSaldo(netRevenue)}</p>
                <p className="text-xs text-muted-foreground">de {mascaraSaldo(goalTarget)}</p>
                <Progress value={goalProgress} className="mt-3.5 h-2" />
                <div className="mt-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
                  {remainingGoal > 0 ? (
                    <p className="leading-relaxed">
                      Faltam <strong className="text-foreground">{mascaraSaldo(remainingGoal)}</strong> em{" "}
                      {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} · Ritmo:{" "}
                      <strong className="text-foreground">{mascaraSaldo(dailyTarget)}/dia</strong>
                    </p>
                  ) : (
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      🎉 Parabéns! Meta do mês superada!
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">
                  Defina um objetivo mensal para acompanhar o ritmo diário das araras.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 rounded-full text-xs">
                  <Link to="/metas">Definir meta</Link>
                </Button>
              </div>
            )}
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Fiado em aberto</h2>
              </div>
              {overdue > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {overdue} vencido{overdue !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="numeric mt-3 text-2xl font-semibold">{mascaraSaldo(openCreditTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {openCredits.length} cliente{openCredits.length !== 1 ? "s" : ""} com saldo pendente
            </p>
            <div className="mt-3 pt-2.5 border-t border-border/60">
              <Link
                to="/fiado"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                Cobranças e recibos <ChevronRight className="size-3" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* ── 4. FLUXO OPERACIONAL RECENTE & ATALHOS RÁPIDOS ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Últimos Lançamentos (Limpos e Sem Redundâncias) */}
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold">Últimos lançamentos</h2>
              <p className="text-xs text-muted-foreground">Movimentações recentes no caixa</p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              <Link to="/caixa">Extrato completo ➔</Link>
            </Button>
          </div>

          {recent.length === 0 ? (
            <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-center p-6 mt-3">
              <div className="grid size-9 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                <Wallet className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                Nenhuma movimentação registrada no caixa este mês.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      {t.kind === "entrada" ? (
                        t.category === "venda_online" ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                            Online
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                            Balcão
                          </span>
                        )
                      ) : t.category === "estorno_devolucao" ? (
                        <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          Devolução
                        </span>
                      ) : t.category === "compra_estoque" ? (
                        <span className="shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Estoque
                        </span>
                      ) : t.category === "prolabore" ? (
                        <span className="shrink-0 rounded-full bg-purple-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          Pró-labore
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                          Despesa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.occurred_on)}
                    </p>
                  </div>
                  <p
                    className={`numeric shrink-0 text-sm font-semibold ${
                      t.kind === "entrada" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.kind === "entrada" ? "+" : "−"}
                    {mascaraSaldo(Number(t.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Atalhos Executivos (Substitui DRE duplicado por Ferramentas de Gestão) */}
        <section className="panel p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Ferramentas de Gestão</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesso rápido aos controles financeiros e araras
            </p>

            <div className="mt-4 grid gap-2">
              <Shortcut
                to="/relatorio"
                icon={<FileSpreadsheet className="size-4" />}
                title="DRE e Relatório Contábil"
                desc="Demonstrativo completo de receitas, custos e margem"
              />
              <Shortcut
                to="/precificacao"
                icon={<Calculator className="size-4" />}
                title="Calculadora de Preço & Markup"
                desc="Descubra a margem e o preço ideal de cada peça"
              />
              <Shortcut
                to="/prolabore"
                icon={<HandCoins className="size-4" />}
                title="Controle de Pró-labore"
                desc="Organize as retiradas da sócia sem sangrar o caixa"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Shortcut({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-3 text-left transition-all hover:bg-secondary/60 hover:border-border"
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-2xs group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {title} <ChevronRight className="size-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {desc}
        </p>
      </div>
    </Link>
  );
}
