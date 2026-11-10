import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HandCoins,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
  const [apenasVips, setApenasVips] = useState(false);
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
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [payMethods, setPayMethods] = useState<Record<string, string>>({});
  const [buscaFiado, setBuscaFiado] = useState("");
  const [filtroStatusFiado, setFiltroStatusFiado] = useState<"todos" | "pendente" | "vencido" | "pago">("todos");

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
      const fiadoCount = fiados.filter((c) => Number(c.paid_amount) > 0).length;

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

      const ultimaCompra =
        lastOnlineDate && lastTxDate
          ? lastOnlineDate > lastTxDate
            ? lastOnlineDate
            : lastTxDate
          : lastOnlineDate || lastTxDate || null;

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

  // Filtro de busca e VIP da Carteira de Clientes
  const clientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return clientes.filter((c) => {
      if (apenasVips && !c.vip) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        c.cidade.toLowerCase().includes(q)
      );
    });
  }, [clientes, busca, apenasVips]);

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
      setPayments({});
      setPayMethods({});
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
              className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer gap-1.5"
              onClick={openNewCustomer}
            >
              <Plus className="size-4" /> Novo cliente
            </Button>
          ) : (
            <Button
              className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer gap-1.5"
              onClick={() => setModalNovoFiado(true)}
            >
              <Plus className="size-4" /> Registrar fiado
            </Button>
          )
        }
      />

      {/* ─── VISÃO 1: CARTEIRA DE CLIENTES (QUIET LUXURY / SEM DASHBOARD INFLADO) ─── */}
      {isTabClientes ? (
        <div className="space-y-4">
          {/* Barra de Busca Limpa com Filtro VIP Discreto */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome, telefone ou cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-10 pr-9 text-sm shadow-2xs"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Button
              variant={apenasVips ? "default" : "outline"}
              size="sm"
              onClick={() => setApenasVips(!apenasVips)}
              className={cn(
                "rounded-full h-11 px-4 text-xs font-semibold gap-1.5 shrink-0 transition-all cursor-pointer",
                apenasVips
                  ? "bg-amber-500 text-amber-950 border-amber-500/30 shadow-xs hover:bg-amber-400"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Star className={cn("size-3.5", apenasVips ? "fill-amber-950" : "text-amber-500")} />
              {apenasVips ? "Mostrando apenas VIPs" : "Filtrar VIPs"}
            </Button>
          </div>

          {/* Conteúdo: Tabela Executiva Proporcional */}
          {totalClientes === 0 ? (
            <EmptyState
              icon={<UserRound className="size-8" />}
              title="Nenhuma cliente cadastrada"
              description="Cadastre suas clientes para acompanhar histórico de compras, faturamento e reativar contatos."
              action={
                <Button onClick={openNewCustomer} className="rounded-full h-10 px-5 text-xs font-semibold shadow-glow cursor-pointer gap-1.5">
                  <Plus className="size-4" /> Cadastrar primeira cliente
                </Button>
              }
            />
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
              <Search className="size-8 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Nenhuma cliente encontrada</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Tente buscar por outro termo ou remova os filtros ativos.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBusca("");
                  setApenasVips(false);
                }}
                className="mt-4 rounded-full text-xs font-semibold"
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border">
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
            </div>
          )}
        </div>
      ) : (
        /* ─── VISÃO 2: CADERNINHO DE FIADO (CONTROLE DE RECEBIMENTOS) ─── */
        <div className="space-y-4">
          {/* Métricas Essenciais de Cobrança (Apenas 2 Indicadores Compactos) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo Total a Receber</p>
                <p className="mt-1 text-xl font-bold text-foreground numeric">{brl(fiadosAbertosTotal)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fiadosAbertos.length} {fiadosAbertos.length === 1 ? "título em aberto" : "títulos em aberto"}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <HandCoins className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencidos em Atraso</p>
                <p className={cn("mt-1 text-xl font-bold numeric", fiadosVencidosTotal > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                  {brl(fiadosVencidosTotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fiadosAbertosTotal > 0
                    ? `${pct((fiadosVencidosTotal / fiadosAbertosTotal) * 100)} do saldo pendente`
                    : "Nenhum fiado em atraso"}
                </p>
              </div>
              <div className={cn("size-10 rounded-xl flex items-center justify-center", fiadosVencidosTotal > 0 ? "bg-rose-500/10 text-rose-600" : "bg-surface-muted text-muted-foreground")}>
                <AlertTriangle className="size-5" />
              </div>
            </div>
          </div>

          {/* Barra de Busca + Chips de Status do Fiado */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar fiado por cliente ou descrição..."
                value={buscaFiado}
                onChange={(e) => setBuscaFiado(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-10 pr-9 text-sm shadow-2xs"
              />
              {buscaFiado && (
                <button
                  type="button"
                  onClick={() => setBuscaFiado("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {[
                { value: "todos", label: "Todos", count: fiadosComStatus.length },
                { value: "pendente", label: "Pendentes", count: fiadosAbertos.length },
                {
                  value: "vencido",
                  label: "Em atraso",
                  count: fiadosComStatus.filter((c) => c.status === "vencido").length,
                },
                {
                  value: "pago",
                  label: "Quitados",
                  count: fiadosComStatus.filter((c) => c.status === "pago").length,
                },
              ].map((chip) => {
                const isSelected = filtroStatusFiado === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setFiltroStatusFiado(chip.value as any)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-semibold transition-all cursor-pointer text-xs",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted",
                    )}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-surface-muted text-muted-foreground",
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fichas Executivas de Fiado */}
          {fiadosFiltrados.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="size-8" />}
              title={buscaFiado || filtroStatusFiado !== "todos" ? "Nenhum fiado encontrado" : "Nenhum fiado registrado"}
              description={
                buscaFiado || filtroStatusFiado !== "todos"
                  ? "Tente alterar os filtros ou o termo de busca."
                  : "Quando vender a prazo, registre aqui para ter controle dos pagamentos e lembretes de cobrança."
              }
            />
          ) : (
            <div className="space-y-3">
              {fiadosFiltrados.map((c) => {
                const remaining = Number(c.amount) - Number(c.paid_amount);
                const customerPhone = c.customers?.phone;
                const customerName = c.customers?.name ?? "Cliente";

                return (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold text-foreground">{customerName}</p>
                          <Badge
                            className="rounded-full text-[10px] font-semibold"
                            variant={
                              c.status === "pago"
                                ? "secondary"
                                : c.status === "vencido"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {CREDIT_STATUS_LABEL[c.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-foreground/80 font-medium">
                          {c.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Compra em {formatDate(c.purchase_date)} ·{" "}
                          <strong className={c.status === "vencido" ? "text-destructive font-semibold" : ""}>
                            Vence em {formatDate(c.due_date)}
                          </strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="numeric text-lg font-bold text-foreground">
                          {brl(remaining)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Total: {brl(Number(c.amount))}
                        </p>
                      </div>
                    </div>

                    {c.status !== "pago" && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3.5">
                        {/* Pagamento Parcial / Quitação */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-28 sm:w-32">
                            <Input
                              inputMode="decimal"
                              value={payments[c.id] ?? ""}
                              onChange={(e) =>
                                setPayments((p) => ({ ...p, [c.id]: e.target.value }))
                              }
                              placeholder={brl(remaining)}
                              className="h-9 rounded-xl text-xs font-mono"
                            />
                          </div>
                          <Select
                            value={payMethods[c.id] ?? "dinheiro"}
                            onValueChange={(val) => setPayMethods((p) => ({ ...p, [c.id]: val }))}
                          >
                            <SelectTrigger className="h-9 w-26 rounded-xl text-xs font-medium shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="pix">Pix</SelectItem>
                              <SelectItem value="debito">Débito</SelectItem>
                              <SelectItem value="credito">Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 rounded-full text-xs font-semibold shadow-soft cursor-pointer whitespace-nowrap"
                            disabled={payCreditMutation.isPending}
                            onClick={() => {
                              const rawInput = (payments[c.id] ?? "").trim();
                              let valToPay = remaining;
                              if (rawInput !== "") {
                                valToPay = toNumber(rawInput);
                                if (isNaN(valToPay) || valToPay <= 0) {
                                  toast.error("Informe um valor de pagamento válido maior que zero.");
                                  return;
                                }
                                if (valToPay > remaining + 0.005) {
                                  toast.error(
                                    `O valor (${brl(valToPay)}) é maior que o saldo devedor (${brl(remaining)}).`,
                                  );
                                  return;
                                }
                              }
                              payCreditMutation.mutate({
                                credit: c,
                                value: valToPay,
                                method: payMethods[c.id] ?? "dinheiro",
                              });
                            }}
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            {payments[c.id]?.trim() ? "Receber parcial" : "Quitar total"}
                          </Button>
                        </div>

                        {/* Cobrança WhatsApp + Exclusão */}
                        <div className="flex items-center gap-2">
                          {customerPhone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                cobrarFiadoWhatsApp(
                                  customerPhone,
                                  customerName,
                                  remaining,
                                  c.due_date,
                                )
                              }
                              className="h-9 rounded-full gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                            >
                              <MessageCircle className="size-3.5" /> Cobrar via WhatsApp
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
              className="rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow cursor-pointer gap-1.5"
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
              className="rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow cursor-pointer gap-1.5"
            >
              {createCreditMutation.isPending ? "Salvando..." : "Salvar fiado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
