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
  Receipt,
  Share2,
  ShoppingBag,
  Tag,
  Truck,
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

  // ── Privacidade de Balcão (Ocultar Saldos) ──────────────────────────────────
  const [ocultarSaldos, setOcultarSaldos] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem("vestui_privacy_mode") === "true";
  });

  useEffect(() => {
    const handlePrivacyChange = () => {
      setOcultarSaldos(localStorage.getItem("vestui_privacy_mode") === "true");
    };
    window.addEventListener("vestui_privacy_changed", handlePrivacyChange);
    return () => window.removeEventListener("vestui_privacy_changed", handlePrivacyChange);
  }, []);

  const togglePrivacidade = () => {
    const nextVal = !ocultarSaldos;
    setOcultarSaldos(nextVal);
    localStorage.setItem("vestui_privacy_mode", String(nextVal));
    window.dispatchEvent(new Event("vestui_privacy_changed"));
    toast.info(nextVal ? "Modo Privacidade Ativado" : "Modo Privacidade Desativado", {
      description: nextVal ? "Valores monetários ocultados para proteção no balcão." : "Valores visíveis.",
    });
  };

  const mascaraSaldo = (valor: number) => {
    return ocultarSaldos ? "R$ ••••••" : brl(valor);
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
      description: `${vitrineDisplay} (pronto para colocar na Bio do Instagram ou WhatsApp)`,
    });
  };

  const compartilharWhatsApp = () => {
    if (!vitrineUrl) {
      toast.error("Configure o link da sua loja nas Configurações");
      return;
    }
    const texto = encodeURIComponent(
      `Olá! Conheça as peças da nossa vitrine online com compra rápida e segura: ${vitrineUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, "_blank");
    toast.success("Abrindo WhatsApp com link da vitrine...");
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

  const vendasMesLiquido = useMemo(() => {
    return pedidosMes.reduce((acc, p) => {
      const bruto = Number(p.total) || 0;
      const fee =
        typeof p.payment_fee === "number"
          ? p.payment_fee
          : typeof p.payment_fee === "string" && p.payment_fee.trim() !== ""
            ? Number(p.payment_fee)
            : p.gateway_charge_id
              ? 0.99
              : 0;
      return acc + Math.max(0, bruto - fee);
    }, 0);
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
      .reduce((acc, p) => {
        const bruto = Number(p.total) || 0;
        const fee =
          typeof p.payment_fee === "number"
            ? p.payment_fee
            : typeof p.payment_fee === "string" && p.payment_fee.trim() !== ""
              ? Number(p.payment_fee)
              : p.gateway_charge_id
                ? 0.99
                : 0;
        return acc + Math.max(0, bruto - fee);
      }, 0);
  }, [asaasLiveBalance, orders, hojeStr]);

  const saldoRetidoD1 = useMemo(() => {
    if (asaasLiveBalance && typeof asaasLiveBalance.pending === "number") {
      return asaasLiveBalance.pending;
    }
    // Fallback: pedidos pagos hoje que compensam no próximo dia útil (D+1)
    return orders
      .filter((p) => isPedidoPago(p) && p.created_at.startsWith(hojeStr))
      .reduce((acc, p) => {
        const bruto = Number(p.total) || 0;
        const fee =
          typeof p.payment_fee === "number"
            ? p.payment_fee
            : typeof p.payment_fee === "string" && p.payment_fee.trim() !== ""
              ? Number(p.payment_fee)
              : p.gateway_charge_id
                ? 0.99
                : 0;
        return acc + Math.max(0, bruto - fee);
      }, 0);
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

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header Limpo, Calibrado e com Modo Privacidade (Padrão Apple) ─────── */}
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
          {/* Botão de Privacidade de Balcão */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePrivacidade}
            title={ocultarSaldos ? "Exibir valores na tela" : "Ocultar valores para privacidade"}
            className="h-8 gap-1.5 rounded-full border-border bg-card px-3 text-xs font-medium cursor-pointer transition-all hover:bg-secondary"
          >
            {ocultarSaldos ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">{ocultarSaldos ? "Mostrar Saldos" : "Ocultar Saldos"}</span>
          </Button>

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
        </div>
      </div>

      {/* ── 4 KPIs Estratégicos & Financeiros (Conectados ao Supabase & Asaas) ──── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Vendas no Mês (Bruto com Líquido no Hint) */}
        <KpiCard
          accent
          label="Vendas no mês"
          value={vendasMesBruto}
          format={(v) => mascaraSaldo(v)}
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

        {/* KPI 2: Saldo Disponível para Saque / Repasse (Com Link direto para Recebimentos) */}
        <Link to="/loja/recebimentos" className="group block focus:outline-none">
          <KpiCard
            label="Saldo Disponível"
            value={saldoDisponivel}
            format={(v) => mascaraSaldo(v)}
            hint={
              payAccount?.status === "ativa"
                ? "Liberado na Subconta Asaas →"
                : "Disponível para movimentação →"
            }
            icon={<Banknote className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110" />}
          />
        </Link>

        {/* KPI 3: Repasse em Custódia D+1 (Compensação BACEN por dia útil com Link direto) */}
        <Link to="/loja/recebimentos" className="group block focus:outline-none">
          <KpiCard
            label={labelRepasseD1}
            value={saldoRetidoD1}
            format={(v) => mascaraSaldo(v)}
            hint={hintRepasseD1}
            icon={<Clock className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-110" />}
          />
        </Link>

        {/* KPI 4: Pedidos Recebidos & Ticket Médio (Contador sempre legível no balcão) */}
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

      {/* ── Grid Principal 65 / 35 — Operação & Cockpit ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* ── Coluna Esquerda: Faturamento Gráfico + Pedidos (65%) ────────────── */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Gráfico de Vendas */}
          <SectionCard
            title={`Faturamento — Últimos ${periodoDias} dias`}
            description="Receitas confirmadas via Pix, Cartão ou pedidos na vitrine."
            actions={
              <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPeriodoDias(7)}
                  className={`rounded-full px-3 py-1 font-medium transition-all cursor-pointer ${
                    periodoDias === 7
                      ? "bg-card text-foreground shadow-xs"
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
                      ? "bg-card text-foreground shadow-xs"
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
              <div className="flex h-[200px] flex-col items-center justify-center gap-2.5 text-center p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/70 text-muted-foreground">
                  <ShoppingBag className="h-5 w-5 opacity-40" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Nenhuma venda nos últimos {periodoDias} dias
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    As vendas confirmadas aparecem aqui em tempo real. Divulgue sua vitrine para acelerar as primeiras compras!
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[230px] w-full">
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
                      stroke="var(--color-chart-1)"
                      strokeWidth={2.5}
                      fill="url(#fillVendas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {/* Últimos Pedidos Recebidos */}
          <SectionCard
            title="Últimos pedidos recebidos"
            description="Pedidos confirmados sincronizam o estoque e entram no caixa automaticamente."
            actions={
              <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-xs font-medium border-border cursor-pointer">
                <Link to="/loja/pedidos">
                  Ver todos {orders.length > 0 && <span className="ml-1 text-[11px] text-muted-foreground font-mono">({orders.length})</span>}
                </Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {ultimosPedidos.length === 0 ? (
              <div className="flex h-28 flex-col items-center justify-center gap-1.5 text-center p-4">
                <p className="text-sm font-medium text-foreground">Nenhum pedido recebido ainda</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Assim que uma cliente finalizar o checkout ou enviar o pedido pela vitrine, ele entrará aqui instantaneamente.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
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

        {/* ── Coluna Direita: Ações do Dia, Estoque & Ações Rápidas (35%) ─────────── */}
        <div className="flex flex-col gap-4">

          {/* 1. CARD: Ações do Dia & Despacho (Fulfillment Operacional) */}
          <SectionCard
            title="Ações do Dia & Despacho"
            description="Pedidos que exigem separação e envio imediato."
          >
            <div className="space-y-3">
              {pedidosPendentesAcao.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/25">
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

                  <Button asChild size="sm" className="h-8 w-full rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs">
                    <Link to="/loja/pedidos">
                      <Truck className="mr-1.5 h-3.5 w-3.5" /> Ir para separação e envio
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/15 text-center">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Tudo despachado!</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Nenhum pedido pendente de separação ou embalagem no momento.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 2. Saúde do Estoque & Peça Mais Vendida Integrada */}
          <SectionCard
            title="Estoque & Catálogo"
            description="Status do estoque e produto mais desejado."
          >
            <div className="space-y-2.5 text-sm">
              {/* Peça mais vendida do mês em destaque no Estoque */}
              {melhorProduto && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/60 p-2.5 border border-border">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Top Vendas do Mês</p>
                    <p className="truncate text-xs font-semibold text-foreground">{melhorProduto.nome}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold font-mono text-foreground border border-border">
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
                  <span className="font-medium text-rose-700 dark:text-rose-400">
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

          {/* 3. CARD: Ações Rápidas da Loja (Substitui o card estático por cockpit de atalhos) */}
          <SectionCard
            title="Ações Rápidas"
            description="Atalhos frequentes para a rotina da sua loja."
          >
            <div className="grid grid-cols-2 gap-2">
              {/* 1. Nova Peça */}
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col items-start gap-1.5 rounded-2xl border-border bg-card p-3 text-left hover:bg-secondary/60 transition-all cursor-pointer group"
              >
                <Link to="/loja/produtos">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Nova Peça</p>
                    <p className="text-[10px] text-muted-foreground">Adicionar ao catálogo</p>
                  </div>
                </Link>
              </Button>

              {/* 2. Criar Cupom */}
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col items-start gap-1.5 rounded-2xl border-border bg-card p-3 text-left hover:bg-secondary/60 transition-all cursor-pointer group"
              >
                <Link to="/loja/cupons">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Criar Cupom</p>
                    <p className="text-[10px] text-muted-foreground">Promover vendas</p>
                  </div>
                </Link>
              </Button>

              {/* 3. Divulgar WhatsApp */}
              <Button
                type="button"
                variant="outline"
                onClick={compartilharWhatsApp}
                className="h-auto flex-col items-start gap-1.5 rounded-2xl border-border bg-card p-3 text-left hover:bg-secondary/60 transition-all cursor-pointer group"
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Divulgar</p>
                  <p className="text-[10px] text-muted-foreground">Enviar no WhatsApp</p>
                </div>
              </Button>

              {/* 4. Extrato Vestui Pay */}
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col items-start gap-1.5 rounded-2xl border-border bg-card p-3 text-left hover:bg-secondary/60 transition-all cursor-pointer group"
              >
                <Link to="/loja/recebimentos">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Extrato Pay</p>
                    <p className="text-[10px] text-muted-foreground">Repasses e saldo</p>
                  </div>
                </Link>
              </Button>
            </div>
          </SectionCard>

        </div>

      </div>
    </div>
  );
}
