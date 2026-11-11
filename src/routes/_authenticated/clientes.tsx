import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { creditsQuery, customersQuery, transactionsQuery } from "@/lib/db";
import { brl, formatDate, pct, todayISO, toNumber } from "@/lib/format";
import { CREDIT_STATUS_LABEL, creditStatus, type Transaction } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import {
  insertCustomer,
  updateCustomer,
  deleteCustomer,
  insertCredit,
  deleteCredit,
  recordCreditPayment,
} from "@/lib/mutations";
import { totalPedido, type Pedido } from "@/data/loja";
import { cn } from "@/lib/utils";
import { SIM_ORDERS_KEY, SIM_ORDERS_EVENT } from "@/lib/sim-orders";
import { isFiadoAtivo, getFiadoConfig, FIADO_SETTINGS_EVENT } from "@/lib/fiado-settings";

type ClientesSearch = {
  tab?: "clientes" | "fiado";
};

export const Route = createFileRoute("/_authenticated/clientes")({
  validateSearch: (search: Record<string, unknown>): ClientesSearch => ({
    tab: search["tab"] === "fiado" ? "fiado" : "clientes",
  }),
  head: () => ({
    meta: [
      { title: "Carteira de Clientes — Vestui" },
      {
        name: "description",
        content: "Gestão completa de clientes: histórico de compras, LTV e contato rápido no WhatsApp.",
      },
    ],
  }),
  component: ClientesPage,
});

type ClienteCompleto = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  totalGasto: number;
  totalPedidos: number;
  saldoDevedor: number;
  ultimaCompra: string | null;
  vip: boolean;
};

type CreditRow = {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  paid_amount: number;
  purchase_date: string;
  due_date: string;
  customers?: { id: string; name: string; phone: string | null } | null;
};

function dataBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function maskPhone(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

function ClientesPage() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [fiadoAtivo, setFiadoAtivo] = useState(() => isFiadoAtivo(storeId));
  const activeTab: "clientes" | "fiado" = useMemo(() => {
    if (!fiadoAtivo) return "clientes";
    return search.tab === "fiado" ? "fiado" : "clientes";
  }, [fiadoAtivo, search.tab]);

  useEffect(() => {
    setFiadoAtivo(isFiadoAtivo(storeId));
    const handleFiadoChanged = () => {
      const ativo = isFiadoAtivo(storeId);
      setFiadoAtivo(ativo);
      if (!ativo && search.tab === "fiado") {
        void navigate({ search: { tab: "clientes" } });
      }
    };
    window.addEventListener(FIADO_SETTINGS_EVENT, handleFiadoChanged);
    window.addEventListener("storage", handleFiadoChanged);
    return () => {
      window.removeEventListener(FIADO_SETTINGS_EVENT, handleFiadoChanged);
      window.removeEventListener("storage", handleFiadoChanged);
    };
  }, [storeId, search.tab, navigate]);

  const handleTabChange = (t: "clientes" | "fiado") => {
    void navigate({ search: { tab: t } });
  };

  // Queries
  const { data: customersData = [] } = useQuery(customersQuery());
  const { data: rawCredits = [] } = useQuery(creditsQuery());
  const credits = rawCredits as unknown as CreditRow[];
  const { data: rawTxs = [] } = useQuery(transactionsQuery());
  const txs = rawTxs as unknown as Transaction[];

  // Estados Clientes & Modal
  const [busca, setBusca] = useState("");
  const [filtroClientes, setFiltroClientes] = useState<"todos" | "vips" | "devedores">("todos");
  const [modalCliente, setModalCliente] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orders, setOrders] = useState<Pedido[]>([]);

  // Estados Fiado
  const today = todayISO();
  const [modalNovoFiado, setModalNovoFiado] = useState(false);
  const [fiadoCustomerId, setFiadoCustomerId] = useState("");
  const [fiadoDescription, setFiadoDescription] = useState("");
  const [fiadoAmount, setFiadoAmount] = useState("");
  const [fiadoPurchase, setFiadoPurchase] = useState(today);
  const [fiadoDue, setFiadoDue] = useState(today);
  const [buscaFiado, setBuscaFiado] = useState("");
  const [filtroStatusFiado, setFiltroStatusFiado] = useState<"todos" | "pendente" | "vencido" | "pago">("todos");

  // Modal de Baixa Rápida (Quick Pay)
  const [quickPayCredit, setQuickPayCredit] = useState<(CreditRow & { status: string }) | null>(null);
  const [quickPayValue, setQuickPayValue] = useState("");
  const [quickPayMethod, setQuickPayMethod] = useState("dinheiro");

  // Carrega pedidos da vitrine online para integrar LTV de forma reativa (0ms)
  useEffect(() => {
    if (!storeId) return;
    const carregar = () => {
      try {
        const raw = localStorage.getItem(SIM_ORDERS_KEY(storeId));
        const parsed = raw ? (JSON.parse(raw) as Pedido[]) : [];
        setOrders(parsed.map((p) => ({ ...p, isSimulacao: true })));
      } catch {
        setOrders([]);
      }
    };

    carregar();

    const onStorage = (e: StorageEvent) => {
      if (e.key === SIM_ORDERS_KEY(storeId)) carregar();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SIM_ORDERS_EVENT, carregar);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SIM_ORDERS_EVENT, carregar);
    };
  }, [storeId]);

  // Deriva o perfil completo unificado de cada cliente
  const clientes = useMemo<ClienteCompleto[]>(() => {
    const list: ClienteCompleto[] = [];

    for (const customer of customersData) {
      const norm = (customer.name ?? "").toLowerCase().trim();
      const phoneNorm = (customer.phone ?? "").replace(/\D/g, "");

      // 1. Pedidos online
      const customerOrders = orders.filter((p) => {
        if (p.status === "cancelado") return false;
        const pNome = (p.cliente || "").toLowerCase().trim();
        const pTel = (p.telefone || "").replace(/\D/g, "");
        return (norm && pNome === norm) || (phoneNorm && pTel && pTel === phoneNorm);
      });

      const onlineTotal = customerOrders.reduce((acc, p) => acc + totalPedido(p), 0);
      const onlineCount = customerOrders.length;
      let lastOnlineDate: string | null = null;
      for (const p of customerOrders) {
        const d = p.criadoEm.slice(0, 10);
        if (!lastOnlineDate || d > lastOnlineDate) lastOnlineDate = d;
      }

      // 2. Fiados do cliente
      const fiados = credits.filter((c) => c.customer_id === customer.id);
      const fiadoPaid = fiados.reduce((acc, c) => acc + Number(c.paid_amount), 0);
      const saldoDevedor = fiados.reduce(
        (acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)),
        0,
      );
      const fiadoCount = fiados.length;
      let lastFiadoDate: string | null = null;
      for (const c of fiados) {
        const d = (c.purchase_date || "").slice(0, 10);
        if (d && (!lastFiadoDate || d > lastFiadoDate)) lastFiadoDate = d;
      }

      // 3. Vendas diretas no caixa (físico) - Blindagem estrita contra colisões de substring
      const directTxs = txs.filter((t) => {
        if (t.kind !== "entrada" || t.category !== "venda_produto") return false;
        if (
          t.payment_method === "fiado" ||
          t.description.toLowerCase().startsWith("recebimento fiado")
        ) {
          return false;
        }
        const desc = t.description.toLowerCase();
        if (!norm) return false;
        if (desc.includes(`[cliente: ${norm}]`) || desc.includes(`(${norm})`)) {
          return true;
        }
        try {
          const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`\\b${escaped}\\b`, "i");
          return regex.test(desc);
        } catch {
          return false;
        }
      });

      const directTotal = directTxs.reduce((acc, t) => acc + Number(t.amount), 0);
      const directCount = directTxs.length;

      // 4. Data mais recente de compra
      let lastTxDate: string | null = null;
      for (const t of directTxs) {
        if (!lastTxDate || t.occurred_on > lastTxDate) lastTxDate = t.occurred_on;
      }

      const allDates = [lastOnlineDate, lastTxDate, lastFiadoDate].filter(Boolean) as string[];
      allDates.sort();
      const ultimaCompra: string | null = allDates.length > 0 ? (allDates[allDates.length - 1] ?? null) : null;

      const totalGasto = Math.max(onlineTotal + directTotal + fiadoPaid, 0);
      const totalPedidos = onlineCount + directCount + fiadoCount;

      list.push({
        id: customer.id,
        nome: customer.name ?? "Cliente sem nome",
        telefone: customer.phone ?? "",
        cidade: ((customer as Record<string, unknown>)["city"] as string) ?? "",
        totalGasto,
        totalPedidos,
        saldoDevedor,
        ultimaCompra,
        vip: totalGasto >= 500, // Critério consistente de VIP pelo LTV de compras
      });
    }

    return list.sort((a, b) => b.totalGasto - a.totalGasto);
  }, [customersData, credits, txs, orders]);

  // Filtro de busca e segmentos da Carteira de Clientes
  const clientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return clientes.filter((c) => {
      if (filtroClientes === "vips" && !c.vip) return false;
      if (filtroClientes === "devedores" && c.saldoDevedor <= 0) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        c.cidade.toLowerCase().includes(q)
      );
    });
  }, [clientes, busca, filtroClientes]);

  const totalClientes = clientes.length;

  // Cálculos do Fiado
  const fiadosComStatus = useMemo(() => {
    return credits.map((c) => ({
      ...c,
      status: creditStatus(
        { amount: Number(c.amount), paid_amount: Number(c.paid_amount), due_date: c.due_date },
        today,
      ),
    }));
  }, [credits, today]);

  const fiadosAbertos = fiadosComStatus.filter((c) => c.status !== "pago");
  const fiadosAbertosTotal = fiadosAbertos.reduce(
    (acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)),
    0,
  );
  const fiadosVencidosTotal = fiadosAbertos
    .filter((c) => c.status === "vencido")
    .reduce((acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)), 0);
  const fiadosRecebidosTotal = fiadosComStatus.reduce((acc, c) => acc + Number(c.paid_amount), 0);

  // Filtro de Fiados por Status e Busca
  const fiadosFiltrados = useMemo(() => {
    const q = buscaFiado.toLowerCase().trim();
    return fiadosComStatus.filter((c) => {
      if (filtroStatusFiado === "pendente" && c.status === "pago") return false;
      if (filtroStatusFiado === "vencido" && c.status !== "vencido") return false;
      if (filtroStatusFiado === "pago" && c.status !== "pago") return false;

      if (!q) return true;
      return (
        (c.customers?.name ?? "").toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.customers?.phone ?? "").includes(q)
      );
    });
  }, [fiadosComStatus, buscaFiado, filtroStatusFiado]);

  // Ações de Modal Cliente
  const openNewCustomer = () => {
    setEditingCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setModalCliente(true);
  };

  const openEditCustomer = (c: ClienteCompleto) => {
    setEditingCustomer({ id: c.id, name: c.nome, phone: c.telefone });
    setCustomerName(c.nome);
    setCustomerPhone(maskPhone(c.telefone));
    setModalCliente(true);
  };

  const openEditCustomerById = (customerId: string, fallbackName?: string) => {
    const found = clientes.find((item) => item.id === customerId);
    if (found) {
      openEditCustomer(found);
    } else {
      setEditingCustomer({ id: customerId, name: fallbackName ?? "", phone: "" });
      setCustomerName(fallbackName ?? "");
      setCustomerPhone("");
      setModalCliente(true);
    }
  };

  const closeCustomerModal = () => {
    setModalCliente(false);
    setEditingCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
  };

  // Mutações Cliente
  const saveCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error("Informe o nome do cliente.");
      const finalPhone = customerPhone.trim() || null;
      if (editingCustomer) {
        await updateCustomer(storeId, editingCustomer.id, customerName.trim(), finalPhone);
      } else {
        await insertCustomer(storeId, customerName.trim(), finalPhone);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeCustomerModal();
      toast.success(
        editingCustomer
          ? "Cliente atualizado com sucesso!"
          : "Cliente cadastrado com sucesso!"
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteCustomer(storeId, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast.success("Cliente removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutações Fiado
  const createCreditMutation = useMutation({
    mutationFn: async () => {
      const value = toNumber(fiadoAmount);
      if (!fiadoCustomerId) throw new Error("Escolha um cliente");
      if (!fiadoDescription.trim()) throw new Error("Descreva as peças do fiado");
      if (value <= 0) throw new Error("Informe um valor maior que zero");
      return insertCredit({
        storeId,
        customer_id: fiadoCustomerId,
        description: fiadoDescription.trim(),
        amount: value,
        purchase_date: fiadoPurchase,
        due_date: fiadoDue,
      });
    },
    onSuccess: () => {
      toast.success("Fiado registrado com sucesso!");
      setFiadoDescription("");
      setFiadoAmount("");
      setFiadoCustomerId("");
      setModalNovoFiado(false);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payCreditMutation = useMutation({
    mutationFn: async ({ credit, value, method }: { credit: CreditRow; value: number; method?: string }) => {
      if (value <= 0) throw new Error("Informe o valor recebido");
      const remaining = Number(credit.amount) - Number(credit.paid_amount);
      if (value > remaining + 0.005) throw new Error("Valor maior que o saldo devedor");
      return recordCreditPayment({
        storeId,
        creditId: credit.id,
        amount: value,
        currentPaidAmount: Number(credit.paid_amount),
        customerName: credit.customers?.name,
        paymentMethod: method || "dinheiro",
      });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado e lançado no caixa!");
      setQuickPayCredit(null);
      setQuickPayValue("");
      setQuickPayMethod("dinheiro");
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["credit_payments"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCreditMutation = useMutation({
    mutationFn: async (id: string) => deleteCredit(storeId, id),
    onSuccess: () => {
      toast.success("Fiado excluído.");
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mensagens do WhatsApp
  const abrirWhatsAppCliente = (telefone: string, nomeCliente: string) => {
    const digitos = telefone.replace(/\D/g, "");
    if (!digitos || digitos.length < 10) {
      toast.error("Telefone inválido para abertura de WhatsApp.");
      return;
    }
    const telFormatado = digitos.length <= 11 ? `55${digitos}` : digitos;
    const msg = encodeURIComponent(
      `Olá ${nomeCliente}! Tudo bem? Passando para te desejar uma ótima semana e avisar que chegaram novidades lindas na nossa coleção!`,
    );
    window.open(`https://wa.me/${telFormatado}?text=${msg}`, "_blank");
  };

  const cobrarFiadoWhatsApp = (
    telefone: string,
    nomeCliente: string,
    valor: number,
    vencimento: string,
  ) => {
    const digitos = telefone.replace(/\D/g, "");
    if (!digitos || digitos.length < 10) {
      toast.error("Telefone inválido para envio de cobrança.");
      return;
    }
    const telFormatado = digitos.length <= 11 ? `55${digitos}` : digitos;
    const config = getFiadoConfig(storeId);
    let texto = config.mensagemCobrancaTemplate || "";
    if (texto) {
      texto = texto
        .replace(/\{nome\}/g, nomeCliente)
        .replace(/\{valor\}/g, brl(valor))
        .replace(/\{vencimento\}/g, formatDate(vencimento))
        .replace(/\{loja\}/g, "nossa loja")
        .replace(/\{descricao\}/g, "peças adquiridas");
    } else {
      texto = `Olá ${nomeCliente}! Tudo bem? Passando para lembrar com carinho do seu fiado de ${brl(valor)} na loja com vencimento em ${formatDate(vencimento)}. Se precisar da chave Pix para facilitar o acerto, é só me pedir aqui!`;
    }
    const msg = encodeURIComponent(texto);
    window.open(`https://wa.me/${telFormatado}?text=${msg}`, "_blank");
  };

  const isTabClientes = activeTab === "clientes";

  return (
    <div className="space-y-6">
      {/* Page Header Minimalista & Contextual (Zero Alternadores Duplicados) */}
      <PageHeader
        eyebrow={isTabClientes ? "Vendas & Relacionamento" : "Controle Financeiro"}
        title={
          isTabClientes
            ? `Carteira de Clientes ${totalClientes > 0 ? `(${totalClientes})` : ""}`
            : `Caderninho de Fiado ${fiadosAbertos.length > 0 ? `(${fiadosAbertos.length})` : ""}`
        }
        description={
          isTabClientes
            ? "Histórico de compras, valor acumulado (LTV) e contato direto via WhatsApp."
            : "Controle de vendas a prazo, títulos em aberto, vencimentos e cobrança via WhatsApp."
        }
        action={
          isTabClientes ? (
            <Button
              className="gradient-primary h-10 rounded-full px-5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
              onClick={openNewCustomer}
            >
              <Plus className="size-4" /> Novo cliente
            </Button>
          ) : (
            <Button
              className="gradient-primary h-10 rounded-full px-5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
              onClick={() => setModalNovoFiado(true)}
            >
              <Plus className="size-4" /> Registrar fiado
            </Button>
          )
        }
      />

      {/* ─── VISÃO 1: CARTEIRA DE CLIENTES (CONTAINER UNIFICADO DE GESTÃO) ─── */}
      {isTabClientes ? (
        <div className="space-y-4">
          {totalClientes === 0 ? (
            <EmptyState
              icon={<UserRound className="size-8" />}
              title="Nenhuma cliente cadastrada"
              description="Cadastre suas clientes para acompanhar histórico de compras, faturamento e reativar contatos."
              action={
                <Button
                  onClick={openNewCustomer}
                  className="gradient-primary rounded-full h-10 px-5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
                >
                  <Plus className="size-4" /> Cadastrar primeira cliente
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
              {/* Abas Superiores Integradas (Padrão Apple / Linear de loja.pedidos.tsx) */}
              <div className="flex items-center gap-1 overflow-x-auto p-2 sm:p-2.5 border-b border-border/70 bg-secondary/15">
                {[
                  { valor: "todos", label: "Todas as clientes", count: totalClientes },
                  { valor: "vips", label: "VIPs", count: clientes.filter((c) => c.vip).length, isVip: true },
                  ...(fiadoAtivo
                    ? [{ valor: "devedores", label: "Com Débito no Fiado", count: clientes.filter((c) => c.saldoDevedor > 0).length, isWarning: true }]
                    : []),
                ].map((tab) => {
                  const active = filtroClientes === tab.valor;
                  return (
                    <button
                      key={tab.valor}
                      type="button"
                      onClick={() => setFiltroClientes(tab.valor as any)}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                        active
                          ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10.5px] num-display transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-bold"
                            : tab.isVip && tab.count > 0
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                              : tab.isWarning && tab.count > 0
                                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold"
                                : "bg-secondary/70 text-muted-foreground/60 font-medium"
                        )}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barra de Filtros Embutida (Linha Única Conectada) */}
              <div className="p-3 sm:p-3.5 border-b border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card">
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    placeholder="Buscar cliente por nome, WhatsApp ou cidade..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="h-9 sm:h-9.5 pl-9 pr-8 text-xs rounded-xl bg-secondary/30 border-border/70 hover:border-border focus:bg-background transition-all w-full"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {filtroClientes !== "todos" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiltroClientes("todos")}
                    className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>

              {/* Conteúdo da Tabela ou Estado Vazio Filtrado */}
              {clientesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Search className="size-8 text-muted-foreground/50 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">Nenhuma cliente encontrada</h3>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Tente buscar por outro termo ou limpe os filtros ativos.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusca("");
                      setFiltroClientes("todos");
                    }}
                    className="mt-4 rounded-xl text-xs font-semibold"
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border select-none">
                    <tr>
                      <th className="py-3 px-4 w-[34%]">Cliente / Perfil</th>
                      <th className="py-3 px-4 w-[24%]">Contato &amp; WhatsApp</th>
                      <th className="py-3 px-4 w-[20%]">Histórico &amp; LTV</th>
                      <th className="py-3 px-4 w-[12%]">Situação</th>
                      <th className="py-3 px-4 w-[10%] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {clientesFiltrados.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-muted/40 transition-colors">
                        {/* Coluna 1: Cliente / Perfil */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold border",
                                c.vip
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-surface-muted text-foreground border-border",
                              )}
                            >
                              {initials(c.nome)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-foreground text-sm truncate" title={c.nome}>
                                  {c.nome}
                                </p>
                                {c.vip && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    <Star className="size-2.5 fill-amber-500 text-amber-500" /> VIP
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {c.cidade ? c.cidade : "Cliente cadastrada"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Coluna 2: Contato & WhatsApp */}
                        <td className="py-3 px-4">
                          {c.telefone ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground text-xs font-mono">
                                {maskPhone(c.telefone)}
                              </p>
                              <button
                                type="button"
                                onClick={() => abrirWhatsAppCliente(c.telefone, c.nome)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                              >
                                <MessageCircle className="size-3" />
                                Conversar no WhatsApp
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditCustomer(c)}
                              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer"
                              title="Cadastrar telefone"
                            >
                              + Cadastrar WhatsApp
                            </button>
                          )}
                        </td>

                        {/* Coluna 3: Histórico & LTV */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-foreground text-xs numeric">
                              {brl(c.totalGasto)}
                            </p>
                            <p className="text-[11px] text-muted-foreground numeric">
                              {c.totalPedidos} {c.totalPedidos === 1 ? "pedido" : "pedidos"}
                              {c.ultimaCompra && ` · ${dataBR(c.ultimaCompra)}`}
                            </p>
                          </div>
                        </td>

                        {/* Coluna 4: Situação do Fiado */}
                        <td className="py-3 px-4">
                          {fiadoAtivo ? (
                            c.saldoDevedor > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuscaFiado(c.nome);
                                  handleTabChange("fiado");
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                title="Ver títulos de fiado"
                              >
                                <AlertCircle className="size-2.5" />
                                Deve <span className="numeric font-bold">{brl(c.saldoDevedor)}</span> →
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="size-3" />
                                Em dia
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground/50 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Coluna 5: Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.telefone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirWhatsAppCliente(c.telefone, c.nome)}
                                className="size-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="size-3.5" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => openEditCustomer(c)}
                              title="Editar cliente"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            {c.saldoDevedor > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-full text-muted-foreground/40 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                                aria-label="Cliente com fiado pendente não pode ser excluída"
                                onClick={() => {
                                  toast.warning(
                                    `Não é possível remover ${c.nome} porque ela possui ${brl(c.saldoDevedor)} em fiados pendentes. Quite os débitos no Caderninho de Fiado antes de excluir.`,
                                    { duration: 5000 },
                                  );
                                }}
                              >
                                <Trash2 className="size-3.5 opacity-50" />
                              </Button>
                            ) : (
                              <ConfirmDelete
                                title="Excluir cliente?"
                                description={`Deseja remover ${c.nome}? O histórico de compras desta cliente será desvinculado.`}
                                onConfirm={() => deleteCustomerMutation.mutate(c.id)}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                    aria-label="Excluir cliente"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      ) : (
        /* ─── VISÃO 2: CADERNINHO DE FIADO (CONTAINER UNIFICADO DE GESTÃO) ─── */
        <div className="space-y-4">
          {fiadosComStatus.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="size-8" />}
              title="Nenhum fiado registrado"
              description="Quando vender a prazo no balcão, registre aqui para ter controle dos pagamentos, datas e cobrança via WhatsApp."
              action={
                <Button
                  onClick={() => setModalNovoFiado(true)}
                  className="gradient-primary rounded-full h-10 px-5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
                >
                  <Plus className="size-4" /> Registrar primeiro fiado
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
              {/* Abas Superiores Integradas com Resumo Financeiro Discreto */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 border-b border-border/70 bg-secondary/15">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { valor: "todos", label: "Todos os fiados", count: fiadosComStatus.length },
                    { valor: "pendente", label: "Pendentes", count: fiadosAbertos.length },
                    { valor: "vencido", label: "Em Atraso", count: fiadosComStatus.filter((c) => c.status === "vencido").length, isDanger: true },
                    { valor: "pago", label: "Quitados", count: fiadosComStatus.filter((c) => c.status === "pago").length, isSuccess: true },
                  ].map((tab) => {
                    const active = filtroStatusFiado === tab.valor;
                    return (
                      <button
                        key={tab.valor}
                        type="button"
                        onClick={() => setFiltroStatusFiado(tab.valor as any)}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                          active
                            ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10.5px] num-display transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-bold"
                              : tab.isDanger && tab.count > 0
                                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold"
                                : tab.isSuccess && tab.count > 0
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                                  : "bg-secondary/70 text-muted-foreground/60 font-medium"
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Resumo Financeiro no Canto da Linha de Abas */}
                <div className="flex items-center gap-3 px-2 text-xs shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">A Receber:</span>
                    <span className="font-bold text-foreground numeric">{brl(fiadosAbertosTotal)}</span>
                  </div>
                  {fiadosVencidosTotal > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Atrasado:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 numeric">{brl(fiadosVencidosTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Filtros Embutida */}
              <div className="p-3 sm:p-3.5 border-b border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card">
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    placeholder="Buscar fiado por cliente, peças levadas ou telefone..."
                    value={buscaFiado}
                    onChange={(e) => setBuscaFiado(e.target.value)}
                    className="h-9 sm:h-9.5 pl-9 pr-8 text-xs rounded-xl bg-secondary/30 border-border/70 hover:border-border focus:bg-background transition-all w-full"
                  />
                  {buscaFiado && (
                    <button
                      type="button"
                      onClick={() => setBuscaFiado("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {filtroStatusFiado !== "todos" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiltroStatusFiado("todos")}
                    className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  >
                    Mostrar todos
                  </Button>
                )}
              </div>

              {/* Tabela Executiva: Livro-Razão de Fiados */}
              {fiadosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Search className="size-8 text-muted-foreground/50 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">Nenhum fiado encontrado</h3>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Tente alterar os termos da busca ou mudar o filtro selecionado.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBuscaFiado("");
                      setFiltroStatusFiado("todos");
                    }}
                    className="mt-4 rounded-xl text-xs font-semibold"
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border select-none">
                    <tr>
                      <th className="py-3 px-4 w-[22%]">Cliente</th>
                      <th className="py-3 px-4 w-[26%]">Peças / Descrição</th>
                      <th className="py-3 px-4 w-[20%]">Vencimento</th>
                      <th className="py-3 px-4 w-[16%]">Valor Original</th>
                      <th className="py-3 px-4 w-[8%]">Status</th>
                      <th className="py-3 px-4 w-[8%] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {fiadosFiltrados.map((c) => {
                      const remaining = Math.max(Number(c.amount) - Number(c.paid_amount), 0);
                      const customerPhone = c.customers?.phone;
                      const customerName = c.customers?.name ?? "Cliente";
                      const cleanDescription =
                        c.description.replace(/\[Cliente:\s*[^\]]+\]/gi, "").trim() || c.description;
                      const isOverdue = c.status === "vencido";
                      const isPaid = c.status === "pago";

                      // Calcula dias de diferença para indicador temporal
                      const dueDate = new Date(c.due_date + "T00:00:00");
                      const todayDate = new Date(today + "T00:00:00");
                      const diffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / 86400000);

                      return (
                        <tr key={c.id} className={cn("transition-colors", isOverdue ? "hover:bg-rose-500/5" : "hover:bg-surface-muted/40")}>

                          {/* Coluna 1: Cliente */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold border",
                                isOverdue
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : isPaid
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-surface-muted text-foreground border-border"
                              )}>
                                {initials(customerName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate" title={customerName}>
                                  {customerName}
                                </p>
                                {customerPhone ? (
                                  <button
                                    type="button"
                                    onClick={() => abrirWhatsAppCliente(customerPhone, customerName)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline cursor-pointer"
                                  >
                                    <MessageCircle className="size-2.5" />
                                    {maskPhone(customerPhone)}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openEditCustomerById(c.customer_id, customerName)}
                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors cursor-pointer group"
                                    title="Cadastrar WhatsApp da cliente"
                                  >
                                    <span className="underline decoration-dotted underline-offset-2">Sem WhatsApp</span>
                                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">+ Cadastrar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 2: Peças */}
                          <td className="py-3.5 px-4">
                            <p className="text-xs text-foreground font-medium leading-relaxed line-clamp-2" title={cleanDescription}>
                              {cleanDescription}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Compra: {dataBR(c.purchase_date)}
                            </p>
                          </td>

                          {/* Coluna 3: Vencimento & Indicador Temporal */}
                          <td className="py-3.5 px-4">
                            <p className={cn("text-xs font-semibold", isOverdue ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                              {dataBR(c.due_date)}
                            </p>
                            <p className={cn("text-[11px] mt-0.5 font-medium", isOverdue ? "text-rose-500" : isPaid ? "text-emerald-600" : diffDays === 0 ? "text-amber-600" : "text-muted-foreground")}>
                              {isPaid
                                ? "Liquidado"
                                : isOverdue
                                  ? `Venceu há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dia" : "dias"}`
                                  : diffDays === 0
                                    ? "Vence hoje"
                                    : `Vence em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`}
                            </p>
                          </td>

                          {/* Coluna 4: Valor Original & Saldo */}
                          <td className="py-3.5 px-4">
                            <p className="text-xs font-bold text-foreground numeric">
                              {brl(Number(c.amount))}
                            </p>
                            {!isPaid && (
                              <p className={cn("text-[11px] mt-0.5 numeric font-semibold", isOverdue ? "text-rose-500" : "text-muted-foreground")}>
                                Saldo: {brl(remaining)}
                              </p>
                            )}
                            {isPaid && (
                              <p className="text-[11px] mt-0.5 text-emerald-600 font-semibold">
                                Quitado ✓
                              </p>
                            )}
                          </td>

                          {/* Coluna 5: Status Badge */}
                          <td className="py-3.5 px-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : isOverdue
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                            )}>
                              {CREDIT_STATUS_LABEL[c.status]}
                            </span>
                          </td>

                          {/* Coluna 6: Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isPaid && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-muted cursor-pointer"
                                  title="Registrar pagamento"
                                  onClick={() => {
                                    setQuickPayCredit(c);
                                    setQuickPayValue("");
                                    setQuickPayMethod("dinheiro");
                                  }}
                                >
                                  <HandCoins className="size-3.5" />
                                </Button>
                              )}
                              {customerPhone && !isPaid && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                  title="Cobrar via WhatsApp"
                                  onClick={() => cobrarFiadoWhatsApp(customerPhone, customerName, remaining, c.due_date)}
                                >
                                  <MessageCircle className="size-3.5" />
                                </Button>
                              )}
                              <ConfirmDelete
                                onConfirm={() => deleteCreditMutation.mutate(c.id)}
                                description="O fiado e os pagamentos lançados no caixa serão removidos permanentemente."
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                    aria-label="Excluir fiado"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ─── MODAL: BAIXA RÁPIDA DE FIADO (QUICK PAY ZERO-SCROLL) ─── */}
      <Dialog open={!!quickPayCredit} onOpenChange={(v) => { if (!v) { setQuickPayCredit(null); setQuickPayValue(""); setQuickPayMethod("dinheiro"); } }}>
        <DialogContent className="rounded-3xl border-border bg-card mx-4 sm:mx-auto sm:max-w-sm p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <HandCoins className="size-4 text-muted-foreground" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {quickPayCredit?.customers?.name ?? "Cliente"} · {quickPayCredit?.description ? (quickPayCredit.description.replace(/\[Cliente:\s*[^\]]+\]/gi, "").trim() || quickPayCredit.description) : ""}
            </DialogDescription>
          </DialogHeader>

          {quickPayCredit && (() => {
            const remaining = Math.max(Number(quickPayCredit.amount) - Number(quickPayCredit.paid_amount), 0);
            const isPartial = quickPayValue.trim() !== "" && toNumber(quickPayValue) < remaining;
            return (
              <div className="space-y-4 py-2">
                {/* Resumo do Saldo */}
                <div className="flex items-center justify-between rounded-2xl bg-surface-muted/60 border border-border px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saldo a Receber</p>
                    <p className="text-xl font-bold text-foreground numeric mt-0.5">{brl(remaining)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Vencimento</p>
                    <p className={cn("text-sm font-semibold mt-0.5", quickPayCredit.status === "vencido" ? "text-rose-600" : "text-foreground")}>
                      {dataBR(quickPayCredit.due_date)}
                    </p>
                  </div>
                </div>

                {/* Botão de Quitação Total Rápida */}
                <button
                  type="button"
                  onClick={() => setQuickPayValue("")}
                  className={cn(
                    "w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer",
                    quickPayValue.trim() === ""
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card text-foreground hover:bg-surface-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    Quitar Total
                  </span>
                  <span className="numeric font-bold">{brl(remaining)}</span>
                </button>

                {/* Valor Personalizado (Recebimento Parcial) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Ou informe valor parcial
                  </Label>
                  <Input
                    inputMode="decimal"
                    placeholder={`Máx. ${brl(remaining)}`}
                    value={quickPayValue}
                    onChange={(e) => setQuickPayValue(e.target.value)}
                    className="rounded-xl h-10 text-sm font-mono"
                  />
                  {isPartial && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      Pagamento parcial: saldo restante será {brl(remaining - toNumber(quickPayValue))}
                    </p>
                  )}
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Forma de Pagamento</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["dinheiro", "pix", "debito", "credito"] as const).map((method) => {
                      const labels: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setQuickPayMethod(method)}
                          className={cn(
                            "rounded-xl border py-2 text-xs font-semibold transition-all cursor-pointer",
                            quickPayMethod === method
                              ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                          )}
                        >
                          {labels[method]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => { setQuickPayCredit(null); setQuickPayValue(""); setQuickPayMethod("dinheiro"); }}
              className="rounded-full h-9.5 px-5 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              disabled={payCreditMutation.isPending || !quickPayCredit}
              onClick={() => {
                if (!quickPayCredit) return;
                const remaining = Math.max(Number(quickPayCredit.amount) - Number(quickPayCredit.paid_amount), 0);
                const rawInput = quickPayValue.trim();
                let valToPay = remaining;
                if (rawInput !== "") {
                  valToPay = toNumber(rawInput);
                  if (isNaN(valToPay) || valToPay <= 0) {
                    toast.error("Informe um valor de pagamento válido.");
                    return;
                  }
                  if (valToPay > remaining + 0.005) {
                    toast.error(`O valor (${brl(valToPay)}) é maior que o saldo devedor (${brl(remaining)}).`);
                    return;
                  }
                }
                payCreditMutation.mutate({ credit: quickPayCredit, value: valToPay, method: quickPayMethod });
              }}
              className="gradient-primary text-primary-foreground rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow hover:opacity-95 cursor-pointer gap-1.5"
            >
              {payCreditMutation.isPending
                ? "Registrando..."
                : quickPayValue.trim()
                  ? `Receber ${brl(toNumber(quickPayValue))}`
                  : "Quitar Total"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL UNIFICADO: CADASTRAR & EDITAR CLIENTE (ZERO-SCROLL) ──────── */}
      <Dialog open={modalCliente} onOpenChange={(v) => !v && closeCustomerModal()}>
        <DialogContent className="rounded-3xl border-border bg-card mx-4 sm:mx-auto sm:max-w-md p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingCustomer ? "Editar cliente" : "Cadastrar novo cliente"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingCustomer
                ? "Atualize o nome e WhatsApp para histórico de compras e contato rápido."
                : "Adicione os dados para registrar vendas e fidelizar no WhatsApp."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-nome" className="text-xs font-semibold text-foreground">
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-nome"
                placeholder="Ex: Mariana Silveira"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-tel" className="text-xs font-semibold text-foreground">
                WhatsApp / Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="c-tel"
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                className="rounded-xl h-10 text-sm font-medium"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              onClick={closeCustomerModal}
              className="rounded-full h-9.5 px-5 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveCustomerMutation.mutate()}
              disabled={saveCustomerMutation.isPending}
              className="gradient-primary text-primary-foreground rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow hover:opacity-95 cursor-pointer gap-1.5"
            >
              {saveCustomerMutation.isPending
                ? "Salvando..."
                : editingCustomer
                  ? "Salvar alterações"
                  : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: REGISTRAR NOVO FIADO (ZERO-SCROLL) ───────────────────────── */}
      <Dialog open={modalNovoFiado} onOpenChange={setModalNovoFiado}>
        <DialogContent className="rounded-3xl border-border bg-card mx-4 sm:mx-auto sm:max-w-md p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold text-foreground">Registrar novo fiado</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Lance as peças levadas a prazo para controle com data e cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Select value={fiadoCustomerId} onValueChange={setFiadoCustomerId}>
                <SelectTrigger className="rounded-xl h-9.5 text-sm">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="max-h-64 rounded-2xl border-border bg-card">
                  {customersData.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Descrição das peças / compra <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: 2 blusas caneladas + 1 calça jeans"
                value={fiadoDescription}
                onChange={(e) => setFiadoDescription(e.target.value)}
                className="rounded-xl h-9.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Valor Total (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 280,00"
                value={fiadoAmount}
                onChange={(e) => setFiadoAmount(e.target.value)}
                className="rounded-xl h-9.5 text-sm font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Data da compra</Label>
                <Input
                  type="date"
                  value={fiadoPurchase}
                  onChange={(e) => setFiadoPurchase(e.target.value)}
                  className="rounded-xl h-9.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Vencimento</Label>
                <Input
                  type="date"
                  value={fiadoDue}
                  onChange={(e) => setFiadoDue(e.target.value)}
                  className="rounded-xl h-9.5 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setModalNovoFiado(false)}
              className="rounded-full h-9.5 px-5 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createCreditMutation.mutate()}
              disabled={createCreditMutation.isPending}
              className="gradient-primary text-primary-foreground rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow hover:opacity-95 cursor-pointer gap-1.5"
            >
              {createCreditMutation.isPending ? "Salvando..." : "Salvar fiado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
