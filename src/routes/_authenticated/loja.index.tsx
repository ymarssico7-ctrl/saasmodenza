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
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inventoryQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
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

  const ultimosPedidos = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <div className="space-y-4">
      {/* Header Limpo e Calibrado (Padrão Apple) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              Vitrine Online Ativa
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl tracking-tight text-foreground">
            Bom te ver, {primeiroNome}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Sua vitrine está no ar em{" "}
            <span className="font-medium text-foreground">{vitrineDisplay}</span> · Sincronização automática com o estoque.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copiarLink}
            className="h-8 rounded-full border-border bg-card px-3 text-xs font-medium cursor-pointer"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar link
          </Button>

          {vitrinePath && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border bg-card px-3 text-xs font-medium cursor-pointer"
            >
              <a href={vitrinePath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Ver vitrine
              </a>
            </Button>
          )}

          <Button
            asChild
            size="sm"
            className="gradient-primary h-8 rounded-full px-3.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Link to="/loja/pedidos">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo pedido
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
            <div className="flex flex-col justify-between p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Como realizar suas primeiras vendas</p>
                  <p className="text-[11px] text-muted-foreground">3 ações simples e práticas para lojistas</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  Guia Rápido
                </span>
              </div>

              <div className="grid gap-3 pt-3 sm:grid-cols-3">
                {/* Passo 1: Fotos e Grade */}
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 flex flex-col justify-between hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
                      <span>Grade & Fotos</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                      {esgotados > 0
                        ? `Você tem ${esgotados} peça esgotada. Atualize o estoque para liberar na vitrine.`
                        : "Defina tamanhos e cadastre fotos nítidas para as peças."}
                    </p>
                  </div>
                  <Link
                    to="/loja/produtos"
                    className="mt-3 inline-flex items-center text-[11px] font-medium text-primary hover:underline"
                  >
                    Ajustar vitrine <ArrowUpRight className="ml-1 size-3" />
                  </Link>
                </div>

                {/* Passo 2: Divulgação */}
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 flex flex-col justify-between hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                      <span>Link na Bio</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                      Coloque seu link na bio do Instagram ou envie no WhatsApp para suas clientes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copiarLink}
                    className="mt-3 inline-flex items-center text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Copiar link da vitrine <Copy className="ml-1 size-3" />
                  </button>
                </div>

                {/* Passo 3: Cupom de Boas-Vindas */}
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 flex flex-col justify-between hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
                      <span>Incentivo 10% OFF</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                      Crie um cupom de boas-vindas para acelerar as primeiras compras da sua vitrine.
                    </p>
                  </div>
                  <Link
                    to="/loja/cupons"
                    className="mt-3 inline-flex items-center text-[11px] font-medium text-primary hover:underline"
                  >
                    Criar cupom <ArrowUpRight className="ml-1 size-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[240px] w-full">
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
        <div className="space-y-4 flex flex-col justify-between">
          <SectionCard
            title="Atenção no estoque"
            description="Reflete direto na sua vitrine online."
          >
            <div className="space-y-2.5 text-sm">
              {ultimasUnidades > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-500/20 text-xs">
                  <span className="text-amber-800 dark:text-amber-300 font-medium">Últimas unidades</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {ultimasUnidades} {ultimasUnidades === 1 ? "peça" : "peças"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Estoque crítico</span>
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-500" /> Nenhuma peça acabando
                  </span>
                </div>
              )}

              {esgotados > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-rose-500/10 px-3 py-2 border border-rose-500/20 text-xs">
                  <span className="text-rose-800 dark:text-rose-300 font-medium">Esgotadas na vitrine</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    {esgotados} {esgotados === 1 ? "peça" : "peças"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Esgotadas</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-500" /> Todas ativas
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Total cadastrado</span>
                <span className="font-semibold text-foreground">
                  {inventoryItems.length} {inventoryItems.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              <Button asChild variant="ghost" className="h-8 w-full rounded-xl text-xs font-medium text-primary hover:text-primary hover:bg-primary/5 cursor-pointer">
                <Link to="/loja/produtos">
                  Gerenciar estoque da vitrine <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Origem dos pedidos"
            description="Distribuição por método de pagamento."
          >
            {orders.length === 0 ? (
              <div className="space-y-1.5 py-0.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-1.5 text-muted-foreground">
                  <span>Pix Vestui Pay</span>
                  <span className="font-mono text-[11px]">0 pedidos</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-1.5 text-muted-foreground">
                  <span>Cartão de Crédito</span>
                  <span className="font-mono text-[11px]">0 pedidos</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-1.5 text-muted-foreground">
                  <span>WhatsApp / Balcão</span>
                  <span className="font-mono text-[11px]">0 pedidos</span>
                </div>
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
          <Button asChild variant="outline" size="sm" className="h-8 rounded-full text-xs font-medium border-border cursor-pointer">
            <Link to="/loja/pedidos">Ver todos os pedidos</Link>
          </Button>
        }
        bodyClassName="p-0"
      >
        {ultimosPedidos.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-center p-6 text-muted-foreground">
            <div className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-muted-foreground">
              <ShoppingBag className="size-4.5 opacity-40" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Nenhum pedido recebido ainda</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground max-w-sm">
                Assim que uma cliente finalizar uma compra na sua vitrine, o pedido aparecerá aqui com status e baixa automática.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-1 h-7.5 rounded-full text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
            >
              <Link to="/loja/pedidos">
                <Plus className="mr-1 size-3" /> Registrar Venda Manual
              </Link>
            </Button>
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
