import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VestuiGuideBanner } from "@/components/vestui-guide-banner";
import { PainelKpisBento } from "@/components/painel/painel-kpis-bento";
import {
  PainelMetaRitmo,
  PainelPecaCampea,
  PainelCapitalEstoque,
  PainelAcaoCaixa,
  type TopProductItem,
  type CatalogPreviewItem,
} from "@/components/painel/painel-cockpit";
import { upsertGoal } from "@/lib/mutations";
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
  const queryClient = useQueryClient();
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

  const quickGoalMutation = useMutation({
    mutationFn: async (amount: number) => {
      return upsertGoal(storeId, thisMonth, amount);
    },
    onSuccess: () => {
      toast.success("Meta ativada com sucesso!");
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao definir meta");
    },
  });

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
  const {
    totalPecasVendidas,
    topProducts,
    outOfStockCount,
    lowStockCount,
    healthyStockCount,
    totalCatalogItems,
    totalStockUnits,
    totalStockValue,
    outOfStockSampleName,
    catalogPreview,
  } = React.useMemo(() => {
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
      let outOfStockSampleName: string | null = null;

      const salesMap: Record<
        string,
        {
          item: InvItem;
          soldCount: number;
          revenue: number;
          totalStock: number;
        }
      > = {};

      let totalStockUnits = 0;
      let totalStockValue = 0;

      for (const item of invItems) {
        const sizes = (item.sizes ?? {}) as Record<string, number>;
        const stock = Object.values(sizes).reduce(
          (a, b) => a + (Math.round(Number(b)) || 0),
          0,
        );
        if (stock === 0) {
          outOfStock++;
          if (!outOfStockSampleName) {
            outOfStockSampleName = item.name;
          }
        } else if (stock < 3) {
          lowStock++;
        }

        totalStockUnits += stock;
        totalStockValue += stock * (Number(item.sale_price) || 0);

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

      const catalogPreview: CatalogPreviewItem[] = invItems.slice(0, 2).map((it) => {
        const sizes = (it.sizes ?? {}) as Record<string, number>;
        const stock = Object.values(sizes).reduce(
          (a, b) => a + (Math.round(Number(b)) || 0),
          0,
        );
        return {
          id: it.id,
          name: it.name,
          category: it.category || "Vestuário",
          price: Number(it.sale_price ?? 0),
          photoUrl: it.photo_url ?? it.image_url ?? undefined,
          stock,
        };
      });

      return {
        totalPecasVendidas: totalPecas,
        topProducts: listTop,
        outOfStockCount: outOfStock,
        lowStockCount: lowStock,
        healthyStockCount: Math.max(0, invItems.length - outOfStock - lowStock),
        totalCatalogItems: invItems.length,
        totalStockUnits,
        totalStockValue,
        outOfStockSampleName,
        catalogPreview,
      };
    }, [inventory, activeMonthOrders, current]);

  const starProduct = topProducts[0] ?? null;

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

        {/* Cockpit Grid Skeletons (2x2 Nobre) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
          <div className="panel p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
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

      {/* ── 2. O ACERVO DA LOJA (Peça Estrela & Saúde do Estoque - Original da Imagem 01) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PainelPecaCampea
          starProduct={starProduct}
          totalPecasVendidas={totalPecasVendidas}
          ticketMedio={ticketMedio}
          totalCatalogItems={totalCatalogItems}
          catalogPreview={catalogPreview}
          ocultarSaldos={ocultarSaldos}
          mascaraSaldo={mascaraSaldo}
        />
        <PainelCapitalEstoque
          totalStockValue={totalStockValue}
          totalStockUnits={totalStockUnits}
          totalCatalogItems={totalCatalogItems}
          outOfStockCount={outOfStockCount}
          lowStockCount={lowStockCount}
          healthyStockCount={healthyStockCount}
          outOfStockSampleName={outOfStockSampleName}
          ocultarSaldos={ocultarSaldos}
          mascaraSaldo={mascaraSaldo}
        />
      </div>

      {/* ── 3. GESTÃO COMERCIAL & CAIXA (Meta & Liquidez do Negócio) ────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PainelMetaRitmo
          goalTarget={goalTarget}
          goalProgress={goalProgress}
          remainingGoal={remainingGoal}
          daysRemaining={daysRemaining}
          dailyTarget={dailyTarget}
          netRevenue={netRevenue}
          thisMonthLabel={monthLabel(thisMonth)}
          onSetQuickGoal={(val) => quickGoalMutation.mutate(val)}
          isSettingGoal={quickGoalMutation.isPending}
          ocultarSaldos={ocultarSaldos}
          mascaraSaldo={mascaraSaldo}
        />
        <PainelAcaoCaixa
          profit={profit}
          openCreditTotal={openCreditTotal}
          openCreditsCount={openCredits.length}
          overdue={overdue}
          ocultarSaldos={ocultarSaldos}
          mascaraSaldo={mascaraSaldo}
        />
      </div>
    </div>
  );
}
