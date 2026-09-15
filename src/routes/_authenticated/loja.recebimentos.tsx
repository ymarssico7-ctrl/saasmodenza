import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  HandCoins,
  HelpCircle,
  Info,
  Lock,
  MessageCircle,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import { insertProlabore } from "@/lib/mutations";
import { monthStart } from "@/lib/format";
import { transactionsQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/loja/recebimentos")({
  head: () => ({
    meta: [
      { title: "Recebimentos — Vestui Pay" },
      {
        name: "description",
        content:
          "Centro financeiro da sua loja: acompanhe saldo em tempo real, liquidações D+1 e extrato com comprovantes BACEN.",
      },
    ],
  }),
  component: RecebimentosPage,
});

function brl(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Tipos ────────────────────────────────────────────────────────────────────
type OrderRecord = {
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
  gateway_charge_id?: string | null;
  metadata?: Record<string, unknown>;
};

function RecebimentosPage() {
  const { storeId } = useStore();
  const queryClient = useQueryClient();
  const [filtroMetodo, setFiltroMetodo] = useState<"todos" | "pix" | "cartao">("todos");
  const [busca, setBusca] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<OrderRecord | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // ── Consulta transações para idempotência do Pró-labore ────────────────────
  const { data: allTxs = [] } = useQuery(transactionsQuery());
  const txsList = allTxs as Array<{ category: string; description: string }>;

  const isProlaboreDestinado = (orderNumero: string) => {
    return txsList.some(
      (t) => t.category === "prolabore" && t.description.includes(orderNumero),
    );
  };

  // ── Estado do Modal de Pró-labore ──────────────────────────────────────────
  const [prolaboreOrder, setProlaboreOrder] = useState<OrderRecord | null>(null);

  const prolaboreMutation = useMutation({
    mutationFn: async (order: OrderRecord) => {
      const taxa =
        typeof order.payment_fee === "number"
          ? order.payment_fee
          : typeof order.payment_fee === "string" && order.payment_fee.trim() !== ""
            ? Number(order.payment_fee)
            : order.gateway_charge_id
              ? 0.99
              : 0;
      const liquido = Math.max(0, Number(order.total) - taxa);
      const month = monthStart(0);
      // Registra no módulo de Pró-labore E Caixa com descrição rastreável única (atômico)
      await insertProlabore(
        storeId,
        month,
        liquido,
        `Pró-labore — Repasse Vestui Pay Pedido ${order.numero}`,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["prolabore"] });
      toast.success("Pró-labore registrado com sucesso! 🎉", {
        description: "A retirada foi lançada no seu histórico de pró-labore e deduzida do Caixa.",
        duration: 5000,
      });
      setProlaboreOrder(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar pró-labore.");
    },
  });

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
      description: nextVal ? "Valores monetários ocultados na tela." : "Valores visíveis.",
    });
  };

  const mascaraSaldo = (valor: number) => {
    return ocultarSaldos ? "R$ ••••••" : brl(valor);
  };

  // ── 1. Busca status da subconta Vestui Pay no banco local ──────────────────
  const {
    data: payAccount,
    refetch: refetchAccount,
    isRefetching: isRefetchingAccount,
  } = useQuery({
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
  const {
    data: asaasLiveBalance,
    refetch: refetchAsaasBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
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

  // ── 3. Busca lista de pedidos para conciliação e extrato ──────────────────
  const {
    data: orders = [],
    refetch: refetchOrders,
    isRefetching: isRefetchingOrders,
  } = useQuery({
    queryKey: ["vestui-pay-orders-ledger", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrderRecord[];
    },
    enabled: !!storeId,
  });

  const isSyncing = isRefetchingAccount || isRefetchingBalance || isRefetchingOrders;

  const handleRefresh = async () => {
    await Promise.all([refetchAccount(), refetchAsaasBalance(), refetchOrders()]);
    toast.success("Financeiro sincronizado", {
      description: "Saldo oficial do Asaas e transações atualizados em tempo real.",
    });
  };

  // ── Cálculos Financeiros ───────────────────────────────────────────────────
  const isPayAtivo = payAccount?.status === "ativa";
  const pedidosPagos = orders.filter((o) => o.payment_status === "pago");

  // Total processado geral
  const totalProcessado = pedidosPagos.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Total de taxas descontadas (Pix próprio não cobra taxa de gateway; Asaas cobra 0.99)
  const totalTaxas = pedidosPagos.reduce(
    (acc, o) => {
      const taxa =
        typeof o.payment_fee === "number"
          ? o.payment_fee
          : typeof o.payment_fee === "string" && o.payment_fee.trim() !== ""
            ? Number(o.payment_fee)
            : o.gateway_charge_id
              ? 0.99
              : 0;
      return acc + taxa;
    },
    0,
  );

  const totalLiquidoCalculado = totalProcessado > 0 ? totalProcessado - totalTaxas : 0;

  // Se a API do Asaas retornou saldo real, usamos ele como verdade absoluta;
  // senão fazemos fallback para o cálculo seguro local.
  const saldoDisponivelReal =
    asaasLiveBalance && typeof asaasLiveBalance.balance === "number"
      ? asaasLiveBalance.balance
      : totalLiquidoCalculado;

  const agora = new Date();
  const pedidosHoje = pedidosPagos.filter((o) => {
    const dataPedido = new Date(o.created_at);
    return dataPedido.toDateString() === agora.toDateString();
  });

  const saldoRetidoD1 =
    asaasLiveBalance && typeof asaasLiveBalance.pending === "number"
      ? asaasLiveBalance.pending
      : pedidosHoje.reduce((acc, o) => {
          const bruto = Number(o.total) || 0;
          const fee =
            typeof o.payment_fee === "number"
              ? o.payment_fee
              : typeof o.payment_fee === "string" && o.payment_fee.trim() !== ""
                ? Number(o.payment_fee)
                : o.gateway_charge_id
                  ? 0.99
                  : 0;
          return acc + (Number(o.net_amount) || Math.max(0, bruto - fee));
        }, 0);

  // Filtro de Transações
  const transacoesFiltradas = orders.filter((o) => {
    const matchMetodo =
      filtroMetodo === "todos"
        ? true
        : filtroMetodo === "pix"
          ? o.payment_method === "pix"
          : o.payment_method === "cartao" || o.payment_method === "credit_card";
    const matchBusca =
      !busca ||
      o.numero.toLowerCase().includes(busca.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(busca.toLowerCase());
    return matchMetodo && matchBusca;
  });

  // Dados bancários cadastrados
  const kyc = (payAccount?.kyc_data || {}) as Record<string, string>;
  const bancoPreview = kyc["bankCode"]
    ? `Banco ${kyc["bankCode"]} • Ag ${kyc["agency"] || "0001"} • CC ${kyc["account"] || "••••"}`
    : "Conta bancária vinculada";

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(texto);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // ── Próximos 6 Dias de Liquidação Bancária BACEN (Regra de Dias Úteis) ──────
  const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const diaSemanaHoje = agora.getDay(); // 0=Dom, 5=Sex, 6=Sáb
  // Compensação D+1 bancária BACEN ocorre no próximo dia útil
  const offsetCompensacao = diaSemanaHoje === 5 ? 3 : diaSemanaHoje === 6 ? 2 : diaSemanaHoje === 0 ? 2 : 1;
  const textoProximaLiquidacao = diaSemanaHoje === 5 ? "Segunda às 07:00" : diaSemanaHoje === 6 ? "Segunda às 07:00" : "Amanhã às 07:00";

  const calendarioProjecao = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const isHoje = i === 0;
    const isDiaCompensacao = i === offsetCompensacao;
    const diaNome = isHoje ? "Hoje" : i === 1 ? "Amanhã" : diasDaSemana[d.getDay()];
    const diaNum = d.getDate();
    // Vendas de hoje caem no próximo dia útil D+1
    const valorDia = isDiaCompensacao ? saldoRetidoD1 : 0;
    return { diaNome, diaNum, valorDia, isDiaCompensacao, isHoje };
  });

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Fintech & Repasses"
          title="Recebimentos"
          description="Centro financeiro Vestui Pay: saldo em tempo real, liquidações D+1 e conciliação BACEN."
        />
        <div className="flex items-center gap-2">
          {/* Botão de Privacidade estilo Apple */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePrivacidade}
            title={ocultarSaldos ? "Exibir valores na tela" : "Ocultar valores para privacidade"}
            className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-xs transition-all hover:bg-zinc-50"
          >
            {ocultarSaldos ? <EyeOff className="h-3.5 w-3.5 text-zinc-500" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
            <span className="hidden sm:inline">{ocultarSaldos ? "Mostrar Saldos" : "Ocultar Saldos"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isSyncing}
            className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-xs transition-all hover:bg-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
            Sincronizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Relatório Financeiro", { description: "O extrato consolidado em CSV/PDF estará disponível no fechamento do ciclo." })}
            className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-xs transition-all hover:bg-zinc-50"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ── Aviso se Vestui Pay estiver inativo ─────────────────────────────── */}
      {!isPayAtivo && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-zinc-900">
                  Ative o Vestui Pay para receber no Pix Dinâmico e Cartão
                </p>
                <p className="text-xs leading-relaxed text-zinc-600 max-w-xl">
                  Sua loja online ganha checkout profissional no padrão Shopify, confirmação automática via BACEN em 3 segundos e repasse D+1 direto na sua conta bancária.
                </p>
              </div>
            </div>
            <Link to="/loja/integracoes">
              <Button className="shrink-0 gap-2 rounded-full bg-emerald-600 px-5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700">
                <Zap className="h-3.5 w-3.5" /> Ativar em 2 minutos
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── BENTO GRID (Apple Card & Financial Bento) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Card 1: THE VESTUI PLATINUM CARD (7 Colunas) */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 p-7 text-white shadow-2xl shadow-zinc-950/20 ring-1 ring-white/10 lg:col-span-7 min-h-[280px]">
          {/* Luzes difusas de fundo */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          {/* Top: Logo, Chip Holográfico e Status */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-white/90">Vestui Pay</p>
                <p className="text-[10px] text-white/50 font-mono tracking-tight">Platinum Merchant</p>
              </div>
            </div>

            {/* Chip Holográfico SVG Realista */}
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md ring-1 ${
                isPayAtivo
                  ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30"
                  : "bg-amber-500/20 text-amber-300 ring-amber-400/30"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isPayAtivo ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isPayAtivo ? "Operação Ativa" : "Aguardando Ativação"}
              </span>

              {/* Microchip Dourado com trilhas de circuito */}
              <div className="relative h-7 w-9 rounded-md bg-gradient-to-tr from-amber-300/40 via-amber-200/70 to-amber-400/30 border border-amber-200/50 p-1 flex items-center justify-center shadow-xs">
                <div className="h-full w-full border border-amber-300/40 rounded-xs flex flex-col justify-between py-0.5">
                  <div className="h-px bg-amber-400/50 w-full" />
                  <div className="h-px bg-amber-400/50 w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Saldo Disponível */}
          <div className="relative z-10 my-6 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                Saldo Disponível na Subconta
              </p>
              <button
                onClick={togglePrivacidade}
                className="text-white/40 hover:text-white/80 transition-colors p-0.5 rounded-sm"
              >
                {ocultarSaldos ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                {mascaraSaldo(saldoDisponivelReal)}
              </h2>
            </div>

            {saldoRetidoD1 > 0 && (
              <p className="text-[11px] text-emerald-400/90 flex items-center gap-1.5 pt-1 font-medium">
                <Clock className="h-3.5 w-3.5 inline text-emerald-400 shrink-0" />
                + {mascaraSaldo(saldoRetidoD1)} em liquidação D+1 (compensação matinal)
              </p>
            )}
          </div>

          {/* Bottom: Conta Bancária e Ações Rápidas */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-white/50" />
              <span className="font-mono text-[11px]">{bancoPreview}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/loja/integracoes">
                <button className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[11px] font-medium backdrop-blur-md transition-all">
                  Configurar Conta
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: CALENDÁRIO SEMANAL DE REPASSES D+1 (5 Colunas) */}
        <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs lg:col-span-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                Agenda de Repasses D+1
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Bancário BACEN
              </span>
            </div>

            {/* Pílulas dos Próximos Dias */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-zinc-400">Previsão semanal de depósitos automáticos:</p>
              <div className="grid grid-cols-6 gap-1.5">
                {calendarioProjecao.map((dia) => (
                  <div
                    key={dia.diaNome}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all ${
                      dia.isDiaCompensacao && dia.valorDia > 0
                        ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900"
                        : dia.isHoje
                          ? "bg-zinc-100 border-zinc-200 text-zinc-900"
                          : "bg-zinc-50/50 border-zinc-100 text-zinc-500"
                    }`}
                  >
                    <span className="text-[10px] font-semibold">{dia.diaNome}</span>
                    <span className="text-xs font-bold font-mono my-0.5">{dia.diaNum}</span>
                    <span className="text-[9px] font-mono text-emerald-700 font-semibold truncate max-w-full">
                      {dia.valorDia > 0 ? (ocultarSaldos ? "•••" : brl(dia.valorDia)) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Próxima Liquidação */}
            <div className="rounded-2xl bg-zinc-50/80 p-3.5 border border-zinc-100 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Próximo repasse programado:</span>
                <span className="font-bold text-zinc-900">{textoProximaLiquidacao}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Valor em compensação:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">{mascaraSaldo(saldoRetidoD1)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Custódia regulada pelo BACEN
            </span>
            <span className="font-mono">Taxa Pix: R$ 0,99</span>
          </div>
        </div>
      </div>

      {/* ── PIPELINE DE LIQUIDAÇÃO (Paz Mental da Lojista) ─────────────────── */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-wide uppercase text-zinc-500">
            Esteira de Liquidação em Tempo Real
          </p>
          <span className="text-[11px] text-zinc-400">Como seu faturamento se move com 100% de segurança</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              step: "01",
              title: "Venda no Checkout",
              desc: "Cliente escaneia o QR Code dinâmico na sua vitrine.",
              icon: Zap,
              active: true,
            },
            {
              step: "02",
              title: "BACEN Confirma",
              desc: "Webhook recebe o pagamento instantaneamente em 3s.",
              icon: CheckCircle2,
              active: true,
            },
            {
              step: "03",
              title: "Custódia D+1",
              desc: "O saldo fica protegido na sua subconta Asaas.",
              icon: Lock,
              active: true,
            },
            {
              step: "04",
              title: "Na sua Conta Bancária",
              desc: "Depósito automático via Pix/TED no dia seguinte.",
              icon: Building2,
              active: isPayAtivo,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl bg-zinc-50/70 border border-zinc-100 p-4 transition-all hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-white shadow-2xs border border-zinc-200/60 text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-zinc-400">{item.step}</span>
                </div>
                <p className="text-xs font-bold text-zinc-900">{item.title}</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EXTRATO DETALHADO (Ledger Interativo) ──────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white shadow-xs overflow-hidden">
        {/* Header do Extrato com Filtros */}
        <div className="p-6 border-b border-zinc-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Extrato de Vendas & Liquidações</h3>
              <p className="text-xs text-zinc-500">
                Histórico de entradas com detalhamento centavo por centavo e comprovantes BACEN.
              </p>
            </div>

            {/* Segmented Control iOS Style */}
            <div className="flex items-center rounded-2xl bg-zinc-100 p-1 self-start sm:self-auto">
              {[
                { id: "todos", label: "Todas" },
                { id: "pix", label: "Pix Dinâmico" },
                { id: "cartao", label: "Cartão" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFiltroMetodo(tab.id as "todos" | "pix" | "cartao")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    filtroMetodo === tab.id
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nº do pedido ou cliente..."
              className="h-9 pl-9 text-xs rounded-xl bg-zinc-50/80 border-zinc-200"
            />
          </div>
        </div>

        {/* Tabela de Transações */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-400 font-medium">
                <th className="px-6 py-3">Transação</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3 text-right">Valor Bruto</th>
                <th className="px-6 py-3 text-right">Taxa Asaas</th>
                <th className="px-6 py-3 text-right">Valor Líquido</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-700 text-sm">Nenhuma transação encontrada</p>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          Quando uma cliente concluir um pedido via Pix no checkout, a confirmação bancária aparecerá aqui instantaneamente.
                        </p>
                      </div>
                      {/* Simulador de Economia Zero-State */}
                      <div className="mt-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 max-w-md text-left text-xs space-y-1.5">
                        <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          Simulador de Economia da Vestui Pay
                        </p>
                        <p className="text-emerald-700">
                          Em <strong>R$ 5.000</strong> em vendas Pix: você paga apenas <strong>R$ 0,99</strong> por transação, economizando até <strong>R$ 140/mês</strong> em comparação com taxas de 2,99% de maquininhas físicas!
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                transacoesFiltradas.map((order) => {
                  const isPago = order.payment_status === "pago";
                  const taxa =
                    typeof order.payment_fee === "number"
                      ? order.payment_fee
                      : typeof order.payment_fee === "string" && order.payment_fee.trim() !== ""
                        ? Number(order.payment_fee)
                        : order.gateway_charge_id
                          ? 0.99
                          : 0;
                  const bruto = Number(order.total) || 0;
                  const liquido = isPago ? Math.max(0, bruto - taxa) : bruto;
                  const isPix = order.payment_method === "pix";
                  const dataFormatada = new Date(order.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setPedidoSelecionado(order)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                            isPago ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {isPago ? <ArrowDownRight className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 font-mono group-hover:text-emerald-600 transition-colors">
                              {order.numero}
                            </span>
                            <p className="text-[10px] text-zinc-400">{dataFormatada}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-zinc-800">{order.customer_name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{order.customer_phone}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                          {isPix ? <Zap className="h-3 w-3 text-emerald-600" /> : <Banknote className="h-3 w-3 text-zinc-500" />}
                          {isPix ? "Pix Dinâmico" : "Cartão"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-medium text-zinc-700">
                        {mascaraSaldo(bruto)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-zinc-400">
                        {isPago ? `- ${brl(taxa)}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-700">
                        {isPago ? mascaraSaldo(liquido) : mascaraSaldo(bruto)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          isPago
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : order.payment_status === "pendente"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                              : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {isPago ? "Pago" : order.payment_status === "pendente" ? "Aguardando Pix" : order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPago && (
                            isProlaboreDestinado(order.numero) ? (
                              <span
                                className="rounded-lg p-1 text-emerald-600 bg-emerald-50 cursor-default"
                                title="Este repasse já foi destinado ao Pró-labore da sócia"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProlaboreOrder(order);
                                }}
                                className="rounded-lg p-1 text-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                                title="Destinar este repasse ao Pró-labore pessoal"
                              >
                                <HandCoins className="h-4 w-4" />
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPedidoSelecionado(order);
                            }}
                            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                            title="Ver comprovante da transação"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DE CONFIRMAÇÃO DE PRÓ-LABORE ─────────────────────────────── */}
      {prolaboreOrder && (() => {
        const taxa =
          typeof prolaboreOrder.payment_fee === "number"
            ? prolaboreOrder.payment_fee
            : typeof prolaboreOrder.payment_fee === "string" && prolaboreOrder.payment_fee.trim() !== ""
              ? Number(prolaboreOrder.payment_fee)
              : prolaboreOrder.gateway_charge_id
                ? 0.99
                : 0;
        const liquido = Math.max(0, Number(prolaboreOrder.total) - taxa);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Destinar ao Pró-labore</h4>
                  <p className="text-[11px] text-zinc-400">Pedido {prolaboreOrder.numero} · {prolaboreOrder.customer_name}</p>
                </div>
                <button
                  onClick={() => setProlaboreOrder(null)}
                  className="ml-auto rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Valor */}
              <div className="text-center py-2 space-y-1">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Valor Líquido da Retirada</p>
                <h3 className="text-3xl font-extrabold text-violet-700 font-mono">{brl(liquido)}</h3>
                <p className="text-[11px] text-zinc-400">
                  (Bruto {brl(Number(prolaboreOrder.total))} − Taxa {brl(taxa)})
                </p>
              </div>

              {/* Explicação */}
              <div className="rounded-2xl bg-violet-50/60 border border-violet-100 p-4 text-xs text-violet-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  O que vai acontecer:
                </p>
                <ul className="space-y-1 text-violet-700 list-disc list-inside">
                  <li>Valor registrado no seu histórico de <strong>Pró-labore</strong></li>
                  <li>Meta mensal de retirada da sócia atualizada</li>
                  <li>Saída lançada no <strong>Caixa da Gestão</strong> (categoria: pró-labore)</li>
                </ul>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-9 text-xs"
                  onClick={() => setProlaboreOrder(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-xl h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={prolaboreMutation.isPending}
                  onClick={() => prolaboreMutation.mutate(prolaboreOrder)}
                >
                  <HandCoins className="h-3.5 w-3.5 mr-1.5" />
                  {prolaboreMutation.isPending ? "Registrando..." : "Confirmar Pró-labore"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL / DRAWER DE DETALHES DA TRANSAÇÃO (Apple Sheet Style) ─────── */}
      {pedidoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header com Fechar */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Comprovante de Liquidação</h4>
                  <p className="text-[10px] text-zinc-400 font-mono">Pedido {pedidoSelecionado.numero}</p>
                </div>
              </div>
              <button
                onClick={() => setPedidoSelecionado(null)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const taxaPedido =
                typeof pedidoSelecionado.payment_fee === "number"
                  ? pedidoSelecionado.payment_fee
                  : typeof pedidoSelecionado.payment_fee === "string" && pedidoSelecionado.payment_fee.trim() !== ""
                    ? Number(pedidoSelecionado.payment_fee)
                    : pedidoSelecionado.gateway_charge_id
                      ? 0.99
                      : 0;
              const liquidoPedido =
                pedidoSelecionado.payment_status === "pago"
                  ? Math.max(0, Number(pedidoSelecionado.total) - taxaPedido)
                  : Number(pedidoSelecionado.total);

              return (
                <>
                  {/* Valor Display Grande */}
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Valor Líquido Creditado</p>
                    <h3 className="text-3xl font-extrabold text-emerald-700 font-mono">
                      {brl(liquidoPedido)}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Confirmado via BACEN
                    </span>
                  </div>

                  {/* Discriminação Centavo por Centavo */}
                  <div className="rounded-2xl bg-zinc-50 p-4 border border-zinc-100 space-y-2.5 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Valor pago pela cliente (Bruto):</span>
                      <span className="font-mono font-bold text-zinc-900">{brl(Number(pedidoSelecionado.total))}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>{taxaPedido > 0 ? "Tarifa Pix Asaas / Gateway:" : "Pix Direto Lojista (Sem Tarifa):"}</span>
                      <span className="font-mono text-zinc-500">{taxaPedido > 0 ? `- ${brl(taxaPedido)}` : "R$ 0,00"}</span>
                    </div>
                    <div className="h-px bg-zinc-200/80 my-1" />
                    <div className="flex justify-between font-bold text-zinc-900">
                      <span>Total Líquido da Lojista:</span>
                      <span className="font-mono text-emerald-700">
                        {brl(liquidoPedido)}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Metadados e IDs Técnicos */}
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-medium text-zinc-800">{pedidoSelecionado.customer_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Telefone:</span>
                <span className="font-mono text-zinc-800">{pedidoSelecionado.customer_phone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Data e Hora:</span>
                <span className="text-zinc-700">
                  {new Date(pedidoSelecionado.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {pedidoSelecionado.gateway_charge_id && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">ID Asaas:</span>
                  <button
                    onClick={() => copiarTexto(pedidoSelecionado.gateway_charge_id!, "ID da transação")}
                    className="flex items-center gap-1 font-mono text-emerald-700 hover:underline"
                  >
                    {pedidoSelecionado.gateway_charge_id.slice(0, 14)}...
                    {copiadoId === pedidoSelecionado.gateway_charge_id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Ações do Comprovante */}
            <div className="flex gap-2 pt-2">
              <Link to="/loja/pedidos" className="flex-1">
                <Button variant="outline" className="w-full text-xs gap-1.5 rounded-xl h-9">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver Pedido
                </Button>
              </Link>
              <Button
                onClick={() => window.print()}
                className="flex-1 text-xs gap-1.5 rounded-xl h-9 bg-zinc-900 hover:bg-zinc-800 text-white"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
