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
  BadgePercent,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  PackageCheck,
  PackageSearch,
  Plus,
  Share2,
  ShoppingBag,
  Truck,
  Wallet,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inventoryQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { usePrivacyMode } from "@/lib/usePrivacyMode";
import { calculateOrderNet } from "@/lib/fees";
import { KpiCard } from "@/components/loja/kpi-card";
import { SectionCard } from "@/components/loja/section-card";
import { StatusBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brl, brlCompact, toNumber } from "@/lib/format";
import { dateBR, type StatusPedido } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Vestui" },
      {
        name: "description",
        content:
          "Centro de comando da sua loja online: acompanhe faturamento real, pedidos, repasses D+1 e estoque em tempo real.",
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
  gateway_charge_id?: string | null;
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

  // ── Privacidade de Balcão Compartilhada (Modo Balcão) ───────────────────────
  const { ocultarSaldos, togglePrivacidade, mascaraSaldo } = usePrivacyMode();

  // ── Playbook de Aceleração da Vitrine ───────────────────────────────────────
  const sid = storeId || "default";
  const [playbookDismissed, setPlaybookDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
    return localStorage.getItem(`vestui_loja_playbook_dismissed_${sid}`) === "true";
  });

  const dismissPlaybook = () => {
    setPlaybookDismissed(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`vestui_loja_playbook_dismissed_${sid}`, "true");
    }
  };

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
      description: `${vitrineDisplay} (pronto para colar na Bio do Instagram ou WhatsApp)`,
    });
  };

  // ── 1. Status da Subconta Vestui Pay ───────────────────────────────────────
  const { data: payAccount } = useQuery({
    queryKey: ["vestui-pay-account-detail", storeId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("store_payment_accounts")
        .select("status, account_id, wallet_id, kyc_data, created_at")
        .eq("store_id", storeId)
        .maybeSingle();
      return data as {
        status: string;
        account_id: string | null;
        wallet_id: string | null;
        kyc_data: Record<string, unknown> | null;
        created_at: string;
      } | null;
    },
    enabled: !!storeId,
  });

  // ── 2. Consulta Saldo Real na Edge Function (API Asaas) ────────────────────
  const { data: asaasLiveBalance } = useQuery({
    queryKey: ["vestui-pay-live-balance", storeId],
    queryFn: async () => {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl ?? "";
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !storeId) return null;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/asaas-get-balance?storeId=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as {
        hasAccount: boolean;
        status: string;
        balance: number;
        pending: number;
        transferred: number;
        updatedAt: string;
      };
    },
    enabled: !!storeId && payAccount?.status === "ativa",
    staleTime: 30_000,
  });

  // ── 3. Busca de Pedidos Nativos no Supabase ───────────────────────────────
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

  // ── 4. Consulta de Estoque ────────────────────────────────────────────────
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

  // ── 5. Métricas e KPIs Financeiros Reais ──────────────────────────────────
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

  const vendasMesBruto = useMemo(
    () => pedidosMes.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    [pedidosMes],
  );

  const getOrderNet = (p: OrderRecord) => {
    const feeOverride =
      typeof p.payment_fee === "number"
        ? p.payment_fee
        : typeof p.payment_fee === "string" && p.payment_fee.trim() !== ""
          ? Number(p.payment_fee)
          : undefined;
    const { netAmount } = calculateOrderNet(
      Number(p.total) || 0,
      p.payment_method || "pix",
      feeOverride,
    );
    return netAmount;
  };

  const vendasMesLiquido = useMemo(() => {
    return pedidosMes.reduce((acc, p) => acc + getOrderNet(p), 0);
  }, [pedidosMes]);

  const vendasMesAnterior = useMemo(
    () => pedidosMesAnterior.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    [pedidosMesAnterior],
  );

  const variacaoMes = useMemo(() => {
    if (vendasMesAnterior > 0) {
      return ((vendasMesBruto - vendasMesAnterior) / vendasMesAnterior) * 100;
    }
    return vendasMesBruto > 0 ? 100 : null;
  }, [vendasMesBruto, vendasMesAnterior]);

  const totalPedidosMes = pedidosMes.length;
  const ticketMedio = totalPedidosMes > 0 ? vendasMesBruto / totalPedidosMes : 0;

  // ── Saldo Disponível & Retido D+1 (Liquidez da Lojista) ───────────────────
  const hojeStr = now.toISOString().slice(0, 10);

  const saldoDisponivel = useMemo(() => {
    if (asaasLiveBalance && typeof asaasLiveBalance.balance === "number") {
      return asaasLiveBalance.balance;
    }
    // Fallback: soma dos pedidos pagos em dias anteriores a hoje
    return orders
      .filter((p) => isPedidoPago(p) && !p.created_at.startsWith(hojeStr))
      .reduce((acc, p) => acc + getOrderNet(p), 0);
  }, [asaasLiveBalance, orders, hojeStr]);

  const saldoRetidoD1 = useMemo(() => {
    if (asaasLiveBalance && typeof asaasLiveBalance.pending === "number") {
      return asaasLiveBalance.pending;
    }
    // Fallback: pedidos pagos hoje que compensam no próximo dia útil (D+1)
    return orders
      .filter((p) => isPedidoPago(p) && p.created_at.startsWith(hojeStr))
      .reduce((acc, p) => acc + getOrderNet(p), 0);
  }, [asaasLiveBalance, orders, hojeStr]);

  // Regra de Dias Úteis BACEN para Repasse D+1
  const diaSemanaHoje = now.getDay(); // 0=Dom, 5=Sex, 6=Sáb
  const labelRepasseD1 =
    diaSemanaHoje === 5 || diaSemanaHoje === 6 || diaSemanaHoje === 0
      ? "Repasse D+1 (Segunda)"
      : "Repasse D+1 (Amanhã)";

  const hintRepasseD1 =
    saldoRetidoD1 > 0
      ? diaSemanaHoje === 5 || diaSemanaHoje === 6 || diaSemanaHoje === 0
        ? "Compensação segunda às 07:00"
        : "Depósito automático às 07:00"
      : "Nenhum repasse retido hoje";

  // ── Pedidos que Exigem Ação Imediata (Fulfillment / Despacho) ─────────────
  const pedidosPendentesAcao = useMemo(() => {
    return orders.filter(
      (p) =>
        p.status !== "cancelado" &&
        p.status !== "entregue" &&
        p.status !== "enviado" &&
        (p.status === "confirmado" ||
          p.status === "em_separacao" ||
          p.status === "preparando" ||
          (p.status === "novo" && (p.payment_status === "pago" || p.payment_method === "pix"))),
    );
  }, [orders]);

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

  // ── 6. Gráfico de Vendas Dinâmico (7d / 30d) ──────────────────────────────
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

  const step1Done = inventoryItems.length > 0;
  const step2Done = Boolean(store?.slug);
  const step3Done = orders.length > 0;
  const playbookProgress = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const showPlaybook = !playbookDismissed && playbookProgress < 3;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Header Padrão Apple HIG & Identidade Visual Vestui ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {/* Eyebrow Nobre Padrão Vestui */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Loja Online
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bom te ver, {primeiroNome}
          </h1>

          {/* Status e Ações da Vitrine — Padrão Apple HIG (Tipografia natural + Micro-ações elegantes) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground">Vitrine ativa:</span>
              <span className="font-medium text-foreground">
                {vitrineDisplay}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copiarLink}
                title="Copiar link da vitrine"
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 text-[11px] font-medium text-foreground transition-all hover:bg-secondary/80 hover:border-border cursor-pointer shadow-2xs"
              >
                <Copy className="h-3 w-3 text-muted-foreground" />
                <span>Copiar</span>
              </button>

              {vitrinePath && (
                <a
                  href={vitrinePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir vitrine em nova aba"
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition-all hover:bg-primary/15 cursor-pointer"
                >
                  <span>Ver vitrine</span>
                  <ExternalLink className="h-3 w-3 opacity-80" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar de Ações: Padrão Vestui & Apple HIG */}
        <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
          {/* Modo Balcão com Rótulo Claro e Acessível */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={togglePrivacidade}
            title={ocultarSaldos ? "Modo Balcão ativo: clique para exibir saldos" : "Ocultar saldos para privacidade no balcão"}
            className={cn(
              "h-9 gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all shadow-2xs cursor-pointer",
              ocultarSaldos
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            {ocultarSaldos ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{ocultarSaldos ? "Saldos ocultos" : "Ocultar saldos"}</span>
          </Button>

          {/* Ação Primária Oficial Vestui: + Nova Peça (gradient-primary + shadow-glow) */}
          <Button
            asChild
            size="sm"
            className="gradient-primary h-9 gap-1.5 rounded-full px-4 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 cursor-pointer"
          >
            <Link to="/loja/produtos">
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Peça</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Playbook de Aceleração Comercial da Vitrine ── */}
      {showPlaybook && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 relative transition-all">
          <button
            type="button"
            onClick={dismissPlaybook}
            title="Dispensar guia"
            className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                  Guia de Vendas Online
                </span>
                <span className="text-xs text-muted-foreground">
                  {playbookProgress}/3 passos concluídos
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Como acelerar suas vendas na Vitrine Online
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Complete estes passos estratégicos para colocar sua vitrine para rodar e atrair os primeiros pedidos.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {/* Passo 1: Catálogo com Fotos */}
            <Link
              to="/loja/produtos"
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 border transition-all",
                step1Done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                  : "border-border/80 bg-card hover:bg-secondary/60 text-foreground",
              )}
            >
              <div className="mt-0.5">
                {step1Done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <div className="grid h-4 w-4 place-items-center rounded-full border border-primary text-[10px] font-bold text-primary">
                    1
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold">Cadastre peças com fotos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {inventoryItems.length > 0
                    ? `${inventoryItems.length} peça(s) no catálogo`
                    : "Coloque fotos atrativas"}
                </p>
              </div>
            </Link>

            {/* Passo 2: Link na Bio */}
            <button
              type="button"
              onClick={copiarLink}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 border transition-all text-left cursor-pointer",
                step2Done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                  : "border-border/80 bg-card hover:bg-secondary/60 text-foreground",
              )}
            >
              <div className="mt-0.5">
                {step2Done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <div className="grid h-4 w-4 place-items-center rounded-full border border-primary text-[10px] font-bold text-primary">
                    2
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold">Divulgue seu link</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Copie e cole na Bio do Instagram
                </p>
              </div>
            </button>

            {/* Passo 3: Primeiro Pedido */}
            <Link
              to="/loja/pedidos"
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 border transition-all",
                step3Done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                  : "border-border/80 bg-card hover:bg-secondary/60 text-foreground",
              )}
            >
              <div className="mt-0.5">
                {step3Done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <div className="grid h-4 w-4 place-items-center rounded-full border border-primary text-[10px] font-bold text-primary">
                    3
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold">Primeira venda</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {orders.length > 0
                    ? `${orders.length} pedido(s) recebido(s)`
                    : "Simule ou receba um pedido"}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── 2. 4 KPIs com Contenção Cromática & Tipografia Apple ───────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Vendas no Mês (Hero com sutil acento de borda Vestui) */}
        <KpiCard
          label="Vendas no mês"
          value={vendasMesBruto}
          format={(v) => mascaraSaldo(v)}
          className="border-l-[3px] border-l-primary/60"
          hint={
            ocultarSaldos
              ? "••••••"
              : totalPedidosMes > 0
                ? `Líq: ${brl(vendasMesLiquido)}${
                    variacaoMes !== null ? ` (${variacaoMes >= 0 ? "+" : ""}${variacaoMes.toFixed(0)}% vs ant.)` : ""
                  }`
                : "Aguardando vendas do ciclo"
          }
          icon={<Wallet className="h-4 w-4" />}
        />

        {/* KPI 2: Saldo Disponível (Com Link direto para Recebimentos) */}
        <Link to="/loja/recebimentos" className="group block focus:outline-none">
          <KpiCard
            label="Saldo Disponível"
            value={saldoDisponivel}
            format={(v) => mascaraSaldo(v)}
            hint={
              payAccount?.status === "ativa"
                ? "Liberado na Subconta Asaas ↗"
                : "Disponível para movimentação ↗"
            }
            icon={<Banknote className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110" />}
          />
        </Link>

        {/* KPI 3: Repasse D+1 (Compensação BACEN por dia útil real) */}
        <Link to="/loja/recebimentos" className="group block focus:outline-none">
          <KpiCard
            label={labelRepasseD1}
            value={saldoRetidoD1}
            format={(v) => mascaraSaldo(v)}
            hint={hintRepasseD1}
            icon={<Clock className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-110" />}
          />
        </Link>

        {/* KPI 4: Pedidos no Mês (Contador sempre visível no balcão) */}
        <KpiCard
          label="Pedidos no mês"
          value={totalPedidosMes}
          format={(n) => Math.round(n).toString()}
          hint={
            ocultarSaldos
              ? "Ticket: ••••••"
              : ticketMedio > 0
                ? `Ticket médio: ${brl(ticketMedio)}`
                : "Pronto para os primeiros pedidos"
          }
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </div>

      {/* ── 3. Bento Grid 2x2 Perfeitamente Simétrico (60% / 40%) ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">

        {/* ── Coluna Esquerda: Gráfico de Vendas + Pedidos (7 Colunas = ~60%) ──── */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Card 1: Gráfico de Faturamento */}
          <SectionCard
            title={`Faturamento — Últimos ${periodoDias} dias`}
            description="Receitas confirmadas via Pix, Cartão ou pedidos na vitrine."
            actions={
              <div className="flex items-center gap-1 rounded-full border border-border/80 bg-secondary/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPeriodoDias(7)}
                  className={`rounded-full px-3 py-1 font-medium transition-all cursor-pointer ${
                    periodoDias === 7
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  7 dias
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoDias(30)}
                  className={`rounded-full px-3 py-1 font-medium transition-all cursor-pointer ${
                    periodoDias === 30
                      ? "bg-card text-foreground shadow-2xs"
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
              <div className="flex h-[210px] flex-col items-center justify-center gap-3 text-center p-6">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Nenhuma venda nos últimos {periodoDias} dias
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Suas vendas confirmadas entrarão no gráfico em tempo real. Divulgue sua vitrine para acelerar seus pedidos!
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillVendasApple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.01} />
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
                      tickFormatter={(v: number) => (ocultarSaldos ? "••••" : brlCompact(v))}
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      formatter={(v) => [ocultarSaldos ? "R$ ••••••" : brl(Number(v)), "Vendas"]}
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
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      fill="url(#fillVendasApple)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {/* Card 2: Últimos Pedidos Recebidos */}
          <SectionCard
            title="Últimos pedidos recebidos"
            description="Pedidos confirmados sincronizam o estoque e entram no caixa automaticamente."
            actions={
              <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-xs font-medium border-border/80 cursor-pointer">
                <Link to="/loja/pedidos">
                  Ver todos {orders.length > 0 && <span className="ml-1 text-[11px] text-muted-foreground font-mono">({orders.length})</span>}
                </Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {ultimosPedidos.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2.5 text-center p-6">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground/70">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div className="max-w-sm space-y-1">
                  <p className="text-sm font-semibold text-foreground">Nenhum pedido recebido ainda</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Assim que uma cliente concluir o checkout na vitrine, o pedido aparecerá aqui com baixa automática de estoque.
                  </p>
                </div>
                {vitrinePath && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5 rounded-full mt-1"
                  >
                    <a href={vitrinePath} target="_blank" rel="noopener noreferrer">
                      Simular experiência da cliente <ArrowUpRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {ultimosPedidos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.customer_name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.numero || `#${p.id.slice(0, 6)}`} · {dateBR(p.created_at)} ·{" "}
                        {p.payment_method === "pix"
                          ? "Pix Dinâmico"
                          : p.payment_method === "cartao"
                          ? "Cartão"
                          : "Manual"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <StatusBadge status={normalizeStatus(p.status)} />
                      <span className="text-sm font-semibold font-mono text-foreground">
                        {mascaraSaldo(Number(p.total) || 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ── Coluna Direita: Despacho & Estoque (5 Colunas = ~40%) ─────────────── */}
        <div className="flex flex-col gap-4 lg:col-span-5">

          {/* Card 1: Ações do Dia & Despacho (Fulfillment Operacional) */}
          <SectionCard
            title="Ações do Dia & Despacho"
            description="Fulfillment e separação de mercadorias."
          >
            <div className="space-y-3">
              {pedidosPendentesAcao.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <PackageSearch className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {pedidosPendentesAcao.length} {pedidosPendentesAcao.length === 1 ? "pedido aguarda" : "pedidos aguardam"} envio
                        </p>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                          Prontos para separar na arara e embalar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {pedidosPendentesAcao.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{p.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.numero} · {p.frete_tipo || "Entrega"}</p>
                        </div>
                        <span className="font-semibold font-mono text-emerald-600">
                          {mascaraSaldo(Number(p.total) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button asChild size="sm" className="gradient-primary h-8 w-full rounded-xl text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 cursor-pointer">
                    <Link to="/loja/pedidos">
                      <Truck className="mr-1.5 h-3.5 w-3.5" /> Ir para separação e envio
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary/30 p-5 text-center border border-border/50">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary/70 text-muted-foreground">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Nenhum envio pendente</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs leading-relaxed">
                      Quando suas clientes concluírem compras na vitrine, você gerencia a separação e o despacho por aqui.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Card 2: Saúde do Estoque & Vitrine Integrada */}
          <SectionCard
            title="Estoque & Catálogo"
            description="Status do acervo e itens em destaque."
          >
            <div className="space-y-2.5 text-sm">
              {/* Peça mais vendida do mês em destaque */}
              {melhorProduto && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/50 p-2.5 border border-border/60">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Top Vendas</p>
                    <p className="truncate text-xs font-semibold text-foreground">{melhorProduto.nome}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold font-mono text-foreground border border-border/70">
                    {melhorProduto.qtd} un.
                  </span>
                </div>
              )}

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
                    <CheckCircle2 className="size-3 text-emerald-500" /> Tudo em ordem
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
                <span className="text-muted-foreground">Total no catálogo</span>
                <span className="font-semibold text-foreground">
                  {inventoryItems.length} {inventoryItems.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              <Button asChild variant="ghost" className="h-8 w-full rounded-xl text-xs font-medium text-primary hover:text-primary hover:bg-primary/5 cursor-pointer">
                <Link to="/loja/produtos">
                  Gerenciar catálogo <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          {/* Card 3: Atalhos Rápidos da Loja Online */}
          <SectionCard
            title="Atalhos da Loja"
            description="Ações rápidas de vendas e configuração."
          >
            <div className="grid gap-2">
              <button
                type="button"
                onClick={copiarLink}
                className="flex items-center justify-between rounded-xl bg-secondary/40 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/70 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Copy className="h-4 w-4 text-primary" />
                  <span>Copiar link da vitrine</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Instagram / Bio</span>
              </button>

              <Link
                to="/loja/cupons"
                className="flex items-center justify-between rounded-xl bg-secondary/40 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/70 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <BadgePercent className="h-4 w-4 text-emerald-600" />
                  <span>Criar cupom de desconto</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/loja/frete"
                className="flex items-center justify-between rounded-xl bg-secondary/40 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/70 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-amber-500" />
                  <span>Calibrar frete e entrega</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/loja/relatorios"
                className="flex items-center justify-between rounded-xl bg-secondary/40 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/70 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-500" />
                  <span>Relatório de vendas online</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </SectionCard>

        </div>

      </div>
    </div>
  );
}
