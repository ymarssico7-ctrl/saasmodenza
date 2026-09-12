import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/loja/recebimentos")({
  head: () => ({
    meta: [
      { title: "Recebimentos — Vestui Pay" },
      {
        name: "description",
        content:
          "Acompanhe suas vendas, saldo em custódia e repasses bancários em tempo real.",
      },
    ],
  }),
  component: RecebimentosPage,
});

function brl(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RecebimentosPage() {
  const { storeId } = useStore();
  const [filtroMetodo, setFiltroMetodo] = useState<"todos" | "pix" | "cartao">("todos");
  const [busca, setBusca] = useState("");

  // ── 1. Busca status da subconta Vestui Pay / Asaas ────────────────────────
  const {
    data: payAccount,
    refetch: refetchAccount,
    isRefetching,
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

  // ── 2. Busca pedidos com pagamento para compor o saldo e extrato ──────────
  const {
    data: orders = [],
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["vestui-pay-orders-ledger", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  const handleRefresh = async () => {
    await Promise.all([refetchAccount(), refetchOrders()]);
    toast.success("Dados sincronizados com o Asaas", {
      description: "Saldo e transações atualizados em tempo real.",
    });
  };

  // ── Cálculos financeiros do Dashboard ──────────────────────────────────────
  const isPayAtivo = payAccount?.status === "ativa";

  // Pedidos pagos
  const pedidosPagos = orders.filter((o) => o.payment_status === "pago");

  // Total processado geral
  const totalProcessado = pedidosPagos.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Total de taxas da plataforma/gateway
  const totalTaxas = pedidosPagos.reduce(
    (acc, o) => acc + (Number(o.payment_fee) || 0.99),
    0,
  );

  // Líquido disponível para a lojista
  const totalLiquido = totalProcessado > 0 ? totalProcessado - totalTaxas : 0;

  // Saldo em custódia (D+1) vs Saldo Liberado
  const agora = new Date();
  const pedidosHoje = pedidosPagos.filter((o) => {
    const dataPedido = new Date(o.created_at);
    return dataPedido.toDateString() === agora.toDateString();
  });
  const saldoRetidoD1 = pedidosHoje.reduce((acc, o) => acc + (Number(o.net_amount) || Number(o.total) - 0.99), 0);
  const saldoDisponivel = Math.max(0, totalLiquido - saldoRetidoD1);

  // Filtro da lista de transações
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

  // Dados bancários cadastrados (se houver no KYC)
  const kyc = (payAccount?.kyc_data || {}) as Record<string, string>;
  const bancoPreview = kyc["bankCode"]
    ? `${kyc["bankCode"]} • Ag ${kyc["agency"] || "0001"} • CC ${kyc["account"] || "••••"}`
    : "Conta bancária vinculada";

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Fintech & Repasses"
          title="Recebimentos"
          description="Acompanhe suas entradas do Vestui Pay, saldo em custódia e liquidações bancárias em D+1."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-9 gap-1.5 rounded-full border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-xs transition-all hover:bg-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-600" : ""}`} />
            Sincronizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Relatório Financeiro", { description: "O extrato em CSV/PDF estará disponível em breve." })}
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

      {/* ── BENTO GRID (Apple Style Financial Cards) ────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Card 1: THE VESTUI PLATINUM CARD (7 Colunas) */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 p-7 text-white shadow-2xl shadow-zinc-950/20 ring-1 ring-white/10 lg:col-span-7 min-h-[260px]">
          {/* Efeito de brilho de luz superior estilo Apple */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          {/* Top: Logo & Chip */}
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

            {/* Chip Holográfico */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md ring-1 ${
                isPayAtivo
                  ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30"
                  : "bg-amber-500/20 text-amber-300 ring-amber-400/30"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isPayAtivo ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isPayAtivo ? "Operação Ativa" : "Aguardando Ativação"}
              </span>
              <div className="h-6 w-8 rounded-md bg-gradient-to-tr from-amber-200/40 via-amber-100/60 to-amber-300/30 border border-amber-200/40 opacity-80" />
            </div>
          </div>

          {/* Middle: Saldo Disponível */}
          <div className="relative z-10 my-6 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-white/60">
              Saldo Disponível para Repasse
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                {brl(saldoDisponivel)}
              </h2>
            </div>
            {saldoRetidoD1 > 0 && (
              <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 pt-1">
                <Clock className="h-3 w-3 inline" />
                + {brl(saldoRetidoD1)} em liquidação D+1 (vendas de hoje)
              </p>
            )}
          </div>

          {/* Bottom: Conta Bancária e Ações */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-white/50" />
              <span className="font-mono text-[11px]">{bancoPreview}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/loja/integracoes">
                <button className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[11px] font-medium backdrop-blur-md transition-all">
                  Configurações do Pay
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: LIQUIDAÇÃO & PRÓXIMO REPASSE D+1 (5 Colunas) */}
        <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs lg:col-span-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Ciclo de Liquidação
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Regra D+1
              </span>
            </div>

            <div className="rounded-2xl bg-zinc-50/80 p-4 border border-zinc-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Próximo repasse programado:</span>
                <span className="font-bold text-zinc-900">Amanhã às 07:00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Valor em compensação:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">{brl(saldoRetidoD1)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Destino:</span>
                <span className="text-zinc-700 font-medium truncate max-w-[160px]">{bancoPreview}</span>
              </div>
            </div>

            {/* Micro KPIs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-2xs">
                <p className="text-[11px] text-zinc-500">Total Faturado</p>
                <p className="text-base font-bold text-zinc-900 font-mono mt-0.5">{brl(totalProcessado)}</p>
                <span className="text-[10px] text-emerald-600 font-medium">via Vestui Pay</span>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-2xs">
                <p className="text-[11px] text-zinc-500">Vendas Aprovadas</p>
                <p className="text-base font-bold text-zinc-900 font-mono mt-0.5">{pedidosPagos.length}</p>
                <span className="text-[10px] text-zinc-400 font-medium">100% compensadas</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
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
            Fluxo de Pagamento & Liquidação em Tempo Real
          </p>
          <span className="text-[11px] text-zinc-400">Como seu dinheiro se move</span>
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
              desc: "Transferência automática realizada no dia seguinte.",
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
                Histórico de entradas com detalhamento de taxas e valor líquido.
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
                <th className="px-6 py-3 text-right">Taxa Gateway</th>
                <th className="px-6 py-3 text-right">Valor Líquido</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-zinc-600 text-sm">Nenhuma transação encontrada</p>
                      <p className="text-xs text-zinc-400">
                        Quando você realizar vendas via Pix no checkout, elas aparecerão aqui automaticamente.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transacoesFiltradas.map((order) => {
                  const isPago = order.payment_status === "pago";
                  const taxa = Number(order.payment_fee) || 0.99;
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
                    <tr key={order.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                            isPago ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {isPago ? <ArrowDownRight className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 font-mono">{order.numero}</span>
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
                        {brl(bruto)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-zinc-400">
                        {isPago ? `- ${brl(taxa)}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-700">
                        {isPago ? brl(liquido) : brl(bruto)}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
