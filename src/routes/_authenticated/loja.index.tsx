import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Receipt,
  Rocket,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inventoryQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { hasAnyActiveProduct, bulkActivateAll } from "@/lib/showcase-store";
import { KpiCard } from "@/components/loja/kpi-card";
import { SectionCard } from "@/components/loja/section-card";
import { StatusBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { brl, brlCompact, toNumber } from "@/lib/format";
import { dateBR, type StatusPedido } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Vestui" },
      {
        name: "description",
        content:
          "Centro de comando da sua loja online: acompanhe faturamento real, pedidos e estoque em tempo real.",
      },
    ],
  }),
  component: VisaoGeral,
});

interface DbOrderItem {
  produtoId?: string;
  id?: string;
  nome?: string;
  name?: string;
  tamanho?: string;
  cor?: string;
  qtd?: number;
  quantity?: number;
  preco?: number;
  price?: number;
}

interface OrderRecord {
  id: string;
  numero: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total: number | string;
  payment_method: string;
  payment_fee: number | string;
  net_amount: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  items?: DbOrderItem[] | null;
  frete_tipo?: string | null;
  origem?: string | null;
}

function normalizeStatus(s?: string): StatusPedido {
  if (s === "confirmado" || s === "pago") return "confirmado";
  if (s === "em_separacao" || s === "preparando") return "em_separacao";
  if (s === "enviado") return "enviado";
  if (s === "entregue") return "entregue";
  if (s === "cancelado") return "cancelado";
  return "novo";
}

function VisaoGeral() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const primeiroNome = (profile?.owner_name || store?.name || "Lojista").split(" ")[0] ?? "Lojista";

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://vestui.com.br";
  const vitrinePath = store?.slug ? `/vitrine/${store.slug}` : "";
  const vitrineUrl = vitrinePath ? `${origin}${vitrinePath}` : "";
  const vitrineDisplay = store?.slug ? `vestui.com.br/vitrine/${store.slug}` : "sua vitrine online";

  const copiarLink = () => {
    if (!vitrineUrl) {
      toast.error("Configure o link da sua loja nas Configurações");
      return;
    }
    void navigator.clipboard?.writeText(vitrineUrl);
    toast.success("Link da vitrine copiado!", {
      description: `${vitrineDisplay} (pronto para colocar na Bio do Instagram ou WhatsApp)`,
    });
  };

  // ── 1. Busca de Pedidos Nativos no Supabase ───────────────────────────────
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar pedidos do Supabase:", error);
        return [];
      }
      return (data || []) as OrderRecord[];
    },
    enabled: !!storeId,
  });

  // Escuta realtime para atualizar novos pedidos instantaneamente
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`loja_overview_orders_${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // ── 2. Consulta de Estoque ────────────────────────────────────────────────
  const { data: inventoryItems = [] } = useQuery(inventoryQuery());

  const esgotados = useMemo(() => {
    return inventoryItems.filter((i) => {
      const s = (i.sizes ?? {}) as Record<string, number>;
      const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
      return units === 0;
    }).length;
  }, [inventoryItems]);

  const ultimasUnidades = useMemo(() => {
    return inventoryItems.filter((i) => {
      const s = (i.sizes ?? {}) as Record<string, number>;
      const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
      return units > 0 && units < 3;
    }).length;
  }, [inventoryItems]);

  // ── 3. Métricas e KPIs Financeiros Reais ──────────────────────────────────
  const now = new Date();
  const thisMonthPrefix = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7);

  const isPedidoPago = (p: OrderRecord) =>
    p.status !== "cancelado" &&
    (p.payment_status === "pago" ||
      p.status === "pago" ||
      p.status === "entregue" ||
      p.status === "enviado" ||
      p.status === "preparando");

  const pedidosMes = useMemo(
    () => orders.filter((p) => isPedidoPago(p) && p.created_at.startsWith(thisMonthPrefix)),
    [orders, thisMonthPrefix],
  );

  const pedidosMesAnterior = useMemo(
    () => orders.filter((p) => isPedidoPago(p) && p.created_at.startsWith(lastMonthPrefix)),
    [orders, lastMonthPrefix],
  );

  const vendasMes = useMemo(
    () => pedidosMes.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    [pedidosMes],
  );

  const vendasMesAnterior = useMemo(
    () => pedidosMesAnterior.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    [pedidosMesAnterior],
  );

  const variacaoMes = useMemo(() => {
    if (vendasMesAnterior > 0) {
      return ((vendasMes - vendasMesAnterior) / vendasMesAnterior) * 100;
    }
    return vendasMes > 0 ? 100 : null;
  }, [vendasMes, vendasMesAnterior]);

  const totalPedidosMes = pedidosMes.length;
  const ticketMedio = totalPedidosMes > 0 ? vendasMes / totalPedidosMes : 0;

  // Peça mais vendida calculada dos itens reais do Supabase
  const melhorProduto = useMemo(() => {
    const contagem: Record<string, { nome: string; qtd: number }> = {};
    for (const p of pedidosMes) {
      if (Array.isArray(p.items)) {
        for (const item of p.items) {
          const nome = item.nome || item.name || "Peça";
          const key = item.produtoId || item.id || nome;
          const qtd = Number(item.qtd || item.quantity || 1);
          if (!contagem[key]) contagem[key] = { nome, qtd: 0 };
          contagem[key]!.qtd += qtd;
        }
      }
    }
    return Object.values(contagem).sort((a, b) => b.qtd - a.qtd)[0] ?? null;
  }, [pedidosMes]);

  // ── 4. Gráfico de Vendas Dinâmico (7d / 30d) ──────────────────────────────
  const [periodoDias, setPeriodoDias] = useState<7 | 30>(7);

  const chartData = useMemo(() => {
    const days = Array.from({ length: periodoDias }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (periodoDias - 1 - i));
      return d.toISOString().slice(0, 10);
    });

    return days.map((day) => {
      const [, m, d] = day.split("-");
      const vendasDoDia = orders
        .filter((p) => isPedidoPago(p) && p.created_at.startsWith(day))
        .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

      return {
        dia: `${d}/${m}`,
        vendas: vendasDoDia,
      };
    });
  }, [orders, periodoDias]);

  const totalVendasPeriodo = useMemo(
    () => chartData.reduce((acc, item) => acc + item.vendas, 0),
    [chartData],
  );

  // ── Onboarding / Publicação de Estoque ────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (inventoryItems.length > 0 && !hasAnyActiveProduct()) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [inventoryItems]);

  const ativarTodasNaVitrine = () => {
    bulkActivateAll(inventoryItems.map((i) => i.id));
    setShowOnboarding(false);
    toast.success(
      `${inventoryItems.length} ${inventoryItems.length === 1 ? "peça publicada" : "peças publicadas"} na vitrine!`,
      { description: 'Acesse "Produtos" para personalizar a ordem e destaques.' },
    );
  };

  const ultimosPedidos = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <div className="space-y-6">
      {/* Alerta de Onboarding: Estoque pronto para vitrine */}
      {showOnboarding && (
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary-soft via-primary-soft/60 to-transparent p-6 shadow-glow">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">Sua loja está pronta para decolar!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Encontramos{" "}
                  <span className="font-semibold text-foreground">
                    {inventoryItems.length} {inventoryItems.length === 1 ? "peça" : "peças"}
                  </span>{" "}
                  no seu estoque de gestão. Publique tudo na vitrine com um clique.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowOnboarding(false)}
              >
                Agora não
              </Button>
              <Button
                size="sm"
                className="gradient-primary rounded-full text-xs shadow-glow"
                onClick={ativarTodasNaVitrine}
              >
                Publicar na Vitrine
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Limpo e Elegante (Padrão Apple) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Vitrine Online · Pronta para Vender
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold sm:text-3xl">
            Bom te ver, {primeiroNome}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sua vitrine está no ar em{" "}
            <span className="font-medium text-foreground">{vitrineDisplay}</span>. Tudo cadastrado no
            estoque sincroniza automaticamente.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copiarLink}
            className="h-10 rounded-full border-border bg-card px-4 text-sm cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar link
          </Button>

          {vitrinePath && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 rounded-full border-border bg-card px-4 text-sm cursor-pointer"
            >
              <a href={vitrinePath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Ver vitrine
              </a>
            </Button>
          )}

          <Button
            asChild
            size="sm"
            className="gradient-primary h-10 rounded-full px-5 text-sm shadow-glow cursor-pointer"
          >
            <Link to="/loja/produtos">
              <Sparkles className="mr-2 h-4 w-4" /> Gerenciar vitrine
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 4 KPIs Clássicos e Harmoniosos (Conectados ao Supabase) ─────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          accent
          label="Vendas no mês"
          value={vendasMes}
          format={brl}
          hint={
            totalPedidosMes > 0
              ? `${totalPedidosMes} pedido${totalPedidosMes > 1 ? "s" : ""} pago${totalPedidosMes > 1 ? "s" : ""}${
                  variacaoMes !== null ? ` (${variacaoMes >= 0 ? "+" : ""}${variacaoMes.toFixed(0)}% vs mês ant.)` : ""
                }`
              : "Nenhuma venda neste mês"
          }
          icon={<Wallet className="h-4 w-4" />}
        />

        <KpiCard
          label="Pedidos recebidos"
          value={totalPedidosMes}
          format={(n) => Math.round(n).toString()}
          hint={
            totalPedidosMes === 0
              ? "Nenhum pedido no mês"
              : `${orders.length} pedidos no histórico total`
          }
          icon={<ShoppingBag className="h-4 w-4" />}
        />

        <KpiCard
          label="Ticket médio"
          value={ticketMedio}
          format={brl}
          hint={ticketMedio > 0 ? "Média por pedido concluído" : "Aguardando primeiros pedidos"}
          icon={<Receipt className="h-4 w-4" />}
        />

        <KpiCard
          label="Peça mais vendida"
          value={0}
          format={() => melhorProduto?.nome ?? "—"}
          hint={
            melhorProduto
              ? `${melhorProduto.qtd} unid. vendida${melhorProduto.qtd > 1 ? "s" : ""}`
              : "Nenhum item vendido ainda"
          }
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      {/* ── Gráficos e Gestão Operacional ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico de Vendas */}
        <SectionCard
          className="lg:col-span-2"
          title={`Faturamento — Últimos ${periodoDias} dias`}
          description="Receitas confirmadas via Pix, Cartão ou pedidos na vitrine."
          actions={
            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPeriodoDias(7)}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  periodoDias === 7
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                7 dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodoDias(30)}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  periodoDias === 30
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30 dias
              </button>
            </div>
          }
          bodyClassName="px-2 pb-4 pt-5 sm:px-4"
        >
          {totalVendasPeriodo === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-center p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground">
                <ShoppingBag className="h-6 w-6 opacity-40" />
              </div>
              <div className="max-w-md">
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma venda registrada nos últimos {periodoDias} dias
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Assim que suas clientes realizarem compras pela vitrine ou WhatsApp, a curva de
                  faturamento e o ticket médio aparecerão aqui em tempo real.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copiarLink}
                className="mt-2 rounded-full text-xs"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Compartilhar link da vitrine
              </Button>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    domain={[0, "auto"]}
                    allowDecimals={false}
                    tickFormatter={(v: number) => brlCompact(v)}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(v) => [brl(Number(v)), "Vendas"]}
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
                    fill="url(#fillVendas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Coluna Lateral: Atenção no Estoque & Canais de Venda */}
        <div className="space-y-4">
          <SectionCard
            title="Atenção no estoque"
            description="Reflete direto na sua vitrine online."
          >
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2.5 border border-amber-500/15">
                <span className="text-muted-foreground text-xs">Últimas unidades</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {ultimasUnidades} {ultimasUnidades === 1 ? "peça" : "peças"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-500/10 px-3 py-2.5 border border-rose-500/15">
                <span className="text-muted-foreground text-xs">Esgotadas na vitrine</span>
                <span className="font-semibold text-rose-700 dark:text-rose-400">
                  {esgotados} {esgotados === 1 ? "peça" : "peças"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                <span className="text-muted-foreground text-xs">Total cadastrado</span>
                <span className="font-semibold text-foreground">
                  {inventoryItems.length} produtos
                </span>
              </div>

              <Button asChild variant="ghost" className="h-9 w-full rounded-xl text-xs">
                <Link to="/loja/produtos">
                  Gerenciar estoque da vitrine <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Origem dos pedidos"
            description="Como suas clientes compram."
          >
            {orders.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                Nenhum pedido registrado ainda.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {(["Pix Vestui Pay", "Cartão de Crédito", "WhatsApp / Outros"] as const).map(
                  (origem) => {
                    let count = 0;
                    if (origem === "Pix Vestui Pay") {
                      count = orders.filter((p) => p.payment_method === "pix").length;
                    } else if (origem === "Cartão de Crédito") {
                      count = orders.filter((p) => p.payment_method === "cartao").length;
                    } else {
                      count = orders.filter(
                        (p) => p.payment_method !== "pix" && p.payment_method !== "cartao",
                      ).length;
                    }

                    if (count === 0) return null;
                    return (
                      <div
                        key={origem}
                        className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">{origem}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Últimos Pedidos Recebidos ────────────────────────────────────────── */}
      <SectionCard
        title="Últimos pedidos recebidos"
        description="Pedidos confirmados sincronizam o estoque e dão entrada no caixa automaticamente."
        actions={
          <Button asChild variant="ghost" className="h-9 rounded-full text-xs">
            <Link to="/loja/pedidos">Ver todos os pedidos</Link>
          </Button>
        }
        bodyClassName="p-0"
      >
        {ultimosPedidos.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShoppingBag className="h-8 w-8 opacity-30" />
            <p className="font-medium">Nenhum pedido recebido ainda.</p>
            <p className="text-xs">
              Assim que uma cliente finalizar uma compra na sua vitrine, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ultimosPedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.customer_name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.numero || `#${p.id.slice(0, 6)}`} · {dateBR(p.created_at)} ·{" "}
                    {p.payment_method === "pix"
                      ? "Pix Automático"
                      : p.payment_method === "cartao"
                      ? "Cartão"
                      : "Manual"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={normalizeStatus(p.status)} />
                  <span className="text-sm font-semibold text-foreground">
                    {brl(Number(p.total) || 0)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
