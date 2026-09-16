import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HandCoins,
  Package,
  Plus,
  Receipt,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
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
  slugify,
  todayISO,
} from "@/lib/format";
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
      { title: "Painel — Vestui" },
      {
        name: "description",
        content:
          "Visão geral integrada do seu varejo de moda: faturamento, divisão físico e online, peças vendidas, pedidos e estoque.",
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

// ─── Header Inline Pill: Link da Vitrine & Pedidos Pendentes ──────────────────
function PainelVitrinePill({
  storeSlug,
  storeName,
  pendingCount,
}: {
  storeSlug: string | null | undefined;
  storeName?: string | null | undefined;
  pendingCount: number;
}) {
  const [copied, setCopied] = React.useState(false);

  const cleanSlug = React.useMemo(() => {
    if (storeSlug && storeSlug.toLowerCase() !== "boutique") {
      return storeSlug;
    }
    if (storeName && storeName.trim()) {
      const s = slugify(storeName);
      if (s && s.toLowerCase() !== "boutique") return s;
    }
    return "minhaloja";
  }, [storeSlug, storeName]);

  const vitrineUrl = `vestui.app/vitrine/${cleanSlug}`;
  const fullUrl = `https://${vitrineUrl}`;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1 text-xs shadow-2xs backdrop-blur-sm">
        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-muted-foreground font-medium truncate max-w-[180px] sm:max-w-none">
          {vitrineUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          title="Copiar link da vitrine"
        >
          <Copy className="size-3" />
          <span>{copied ? "Copiado!" : "Copiar"}</span>
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Abrir vitrine em nova aba"
        >
          <ExternalLink className="size-3" />
        </a>
      </div>

      {pendingCount > 0 && (
        <Link
          to="/loja/pedidos"
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors shadow-2xs"
        >
          <ShoppingBag className="size-3.5" />
          <span>
            {pendingCount} {pendingCount === 1 ? "pedido pendente" : "pedidos pendentes"}
          </span>
        </Link>
      )}
    </div>
  );
}

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

  // ── Normalização de Pedidos ───────────────────────────────────────────────
  const orders = React.useMemo(() => {
    return (rawOrders || []) as Array<{
      id: string;
      status?: string;
      total?: number;
      created_at?: string;
      itens?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
      items?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
    }>;
  }, [rawOrders]);

  const pedidosNovosCount = React.useMemo(() => {
    return orders.filter((o) => o.status === "novo").length;
  }, [orders]);

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

  const prevRevenue = sumBy(previous, "entrada");

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = projectMonth(netRevenue, now.getDate(), daysInMonth);

  const goal = goals.find((g) => g.month.slice(0, 7) === thisMonth.slice(0, 7));
  const goalTarget = Number(goal?.target_amount ?? 0);
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

  // ── Peças Vendidas, Best Sellers & Saúde de Estoque ───────────────────────
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

      // Mapa acumulador por produto
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

        const price = Number(item.sale_price ?? 0);
        const initialSold = Number(item.sold_this_month ?? 0);

        salesMap[item.id] = {
          item,
          soldCount: initialSold,
          revenue: initialSold * price,
          totalStock: stock,
        };
      }

      // Soma vendas dos pedidos da vitrine
      for (const order of orders) {
        if (order.status === "cancelado") continue;
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

      // Soma transações do caixa com peças vinculadas
      for (const t of current) {
        if (t.kind === "entrada") {
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

      let totalPecas = Object.values(salesMap).reduce((acc, s) => acc + s.soldCount, 0);

      // Fallback: se houver entradas de venda no caixa mas sem vínculo de peça cadastrada
      const totalEntradasVenda = current.filter(
        (t) =>
          t.kind === "entrada" &&
          (t.category === "venda_produto" || t.category === "venda_online"),
      ).length;
      if (totalPecas === 0 && totalEntradasVenda > 0) {
        totalPecas = totalEntradasVenda;
      }

      // Lista ordenada das mais vendidas
      let listTop: TopProductItem[] = Object.values(salesMap)
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
            photoUrl: s.item.photo_url ?? s.item.image_url ?? null,
            soldCount: s.soldCount,
            revenue: s.revenue,
            totalStock: s.totalStock,
            sizesSummary: sizesList.length > 0 ? `Tam: ${sizesList.join(", ")}` : undefined,
          };
        });

      // Se for loja nova/demo sem histórico de vendas mas com produtos cadastrados, exibe primeiros itens com estoque
      if (listTop.length === 0 && invItems.length > 0) {
        listTop = invItems.slice(0, 5).map((item) => {
          const sizes = (item.sizes ?? {}) as Record<string, number>;
          const stock = Object.values(sizes).reduce(
            (a, b) => a + (Math.round(Number(b)) || 0),
            0,
          );
          const sizesList = Object.keys(sizes).filter((k) => (Number(sizes[k]) || 0) > 0);
          return {
            id: item.id,
            name: item.name,
            category: item.category,
            price: Number(item.sale_price ?? 0),
            photoUrl: item.photo_url ?? item.image_url ?? null,
            soldCount: 0,
            revenue: 0,
            totalStock: stock,
            sizesSummary: sizesList.length > 0 ? `Tam: ${sizesList.join(", ")}` : undefined,
          };
        });
      }

      return {
        totalPecasVendidas: totalPecas,
        topProducts: listTop,
        outOfStockCount: outOfStock,
        lowStockCount: lowStock,
        totalCatalogItems: invItems.length,
      };
    }, [inventory, orders, current]);

  // ── Ticket Médio e Total de Vendas ────────────────────────────────────────
  const totalVendasCount = React.useMemo(() => {
    const entradasVendas = current.filter(
      (t) =>
        t.kind === "entrada" &&
        (t.category === "venda_produto" || t.category === "venda_online"),
    ).length;
    const onlineOrdersCount = orders.filter((o) => o.status !== "cancelado").length;
    return Math.max(entradasVendas, onlineOrdersCount);
  }, [current, orders]);

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

        {/* Bento KPIs Skeletons */}
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

        {/* Top Products Bento Skeleton */}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
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
    <div className="space-y-8">
      {/* ── CABEÇALHO UNIFICADO (Sem Empilhamento de Barras Cinzas) ────────────── */}
      <div className="space-y-3">
        <PageHeader
          eyebrow={monthLabel(thisMonth)}
          title={`Olá, ${greetingName}`}
          description={
            hasCustomStore
              ? `Aqui está o centro de gestão da sua loja (${rawStore}) hoje.`
              : "Aqui está o centro de gestão da sua loja hoje."
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
                  "h-11 gap-1.5 rounded-full border px-4 text-xs font-medium transition-all shadow-2xs cursor-pointer",
                  ocultarSaldos
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                    : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {ocultarSaldos ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span>{ocultarSaldos ? "Saldos ocultos" : "Ocultar saldos"}</span>
              </Button>
              <Button
                asChild
                className="h-11 rounded-full px-5 font-semibold gradient-primary shadow-glow hover:opacity-95 transition-all cursor-pointer"
              >
                <Link to="/caixa">
                  <Plus className="size-4" /> Novo lançamento
                </Link>
              </Button>
            </div>
          }
        />

        {/* Pill Integrado da Vitrine Online (Substitui a antiga barra cinza isolada) */}
        {vitrineAtiva && (
          <div className="pt-1">
            <PainelVitrinePill
              storeSlug={store?.slug}
              storeName={store?.name}
              pendingCount={pedidosNovosCount}
            />
          </div>
        )}
      </div>

      {/* Banner de Boas-Vindas / Guia Financeiro (Aparece se faltar concluir onboarding) */}
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

      {/* ── 1. BENTO BOX KPIS (Faturamento, Split Físico x Online, Peças, Live Pedidos) ── */}
      <PainelKpisBento
        revenue={revenue}
        netRevenue={netRevenue}
        prevRevenue={prevRevenue}
        refunds={refunds}
        fisicaRevenue={fisicaRevenue}
        onlineRevenue={onlineRevenue}
        totalPecasVendidas={totalPecasVendidas}
        ticketMedio={ticketMedio}
        totalVendasCount={totalVendasCount}
        vitrineAtiva={vitrineAtiva}
        pedidosNovosCount={pedidosNovosCount}
        pedidosEmSeparacaoCount={pedidosEmSeparacaoCount}
        ocultarSaldos={ocultarSaldos}
        mascaraSaldo={mascaraSaldo}
      />

      {/* ── 2. BENTO BOX PRODUTOS (Peças Campeãs da Loja & Saúde de Estoque) ──── */}
      <PainelTopProducts
        topProducts={topProducts}
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        totalCatalogItems={totalCatalogItems}
        ocultarSaldos={ocultarSaldos}
        mascaraSaldo={mascaraSaldo}
      />

      {/* ── 3. EVOLUÇÃO FINANCEIRA & METAS ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Gráfico de Evolução 6 Meses */}
        <section className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Evolução dos últimos 6 meses</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Faturamento e lucro líquido retido por mês
              </p>
            </div>
            {onlineRevenue > 0 && !ocultarSaldos && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {brl(onlineRevenue)} via vitrine
              </span>
            )}
          </div>
          {totalHistorico === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center p-6">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Sua evolução financeira aparecerá aqui
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conforme suas vendas e despesas forem registradas, o gráfico traçará sua curva de faturamento e sobra de caixa.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-medium mt-1">
                <Link to="/caixa">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar primeira movimentação
                </Link>
              </Button>
            </div>
          ) : (
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

        {/* Coluna Direita: Meta do Mês + Fiados a Receber */}
        <div className="space-y-4">
          <section className="panel p-6">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Meta do mês</h2>
            </div>
            {goalTarget > 0 ? (
              <>
                <p className="numeric mt-4 text-2xl font-semibold">{mascaraSaldo(netRevenue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">de {mascaraSaldo(goalTarget)}</p>
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
            <p className="numeric mt-4 text-2xl font-semibold">{mascaraSaldo(openCreditTotal)}</p>
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

      {/* ── 4. SOBRA NO CAIXA (DRE GERENCIAL) & ÚLTIMOS LANÇAMENTOS ────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Últimos Lançamentos com Identificação de Canal */}
        <section className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Últimos lançamentos</h2>
              <p className="mt-1 text-xs text-muted-foreground">Movimentações recentes no caixa</p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-xs font-medium border-border/80"
            >
              <Link to="/caixa">Ver extrato completo</Link>
            </Button>
          </div>

          {recent.length === 0 ? (
            <div className="flex h-[180px] flex-col items-center justify-center gap-2.5 text-center p-6 mt-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-semibold text-foreground">Nenhum lançamento no mês</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Comece registrando uma venda no balcão ou uma despesa para movimentar seu caixa.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5 rounded-full mt-1"
              >
                <Link to="/caixa">
                  Registrar movimentação <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      {t.category === "venda_online" ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Online
                        </span>
                      ) : t.kind === "entrada" ? (
                        <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Balcão
                        </span>
                      ) : null}
                    </div>
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
                    {mascaraSaldo(Number(t.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sobra no Caixa & Atalhos */}
        <div className="space-y-4">
          {/* Card Resumo de Sobra no Caixa */}
          <section className="panel p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Sobra no Caixa</h2>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  profit >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                )}
              >
                {profit >= 0 ? "Positivo" : "Atenção"}
              </span>
            </div>

            <p className="numeric mt-3 text-2xl sm:text-3xl font-bold">
              {mascaraSaldo(profit)}
            </p>

            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-3">
              <div className="flex justify-between">
                <span>Receita líquida:</span>
                <strong className="text-foreground">{ocultarSaldos ? "••••" : mascaraSaldo(netRevenue)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Despesas operacionais:</span>
                <span className="text-rose-600 dark:text-rose-400">
                  −{ocultarSaldos ? "••••" : mascaraSaldo(expenses)}
                </span>
              </div>
              {stockPurchases > 0 && (
                <div className="flex justify-between">
                  <span>Reinvestido em roupas:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    −{ocultarSaldos ? "••••" : mascaraSaldo(stockPurchases)}
                  </span>
                </div>
              )}
              {prolaboreAmount > 0 && (
                <div className="flex justify-between">
                  <span>Pró-labore retirado:</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    −{ocultarSaldos ? "••••" : mascaraSaldo(prolaboreAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/40 font-medium">
                <span>Projeção final do mês:</span>
                <strong className="text-foreground">{ocultarSaldos ? "••••" : mascaraSaldo(projection)}</strong>
              </div>
            </div>
          </section>

          {/* Atalhos Rápidos */}
          <section className="panel p-6">
            <h2 className="text-sm font-semibold">Atalhos do Lojista</h2>
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
                label="Ver relatório financeiro"
              />
            </div>
          </section>
        </div>
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
