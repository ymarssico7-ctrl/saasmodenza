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
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { creditsQuery, customersQuery, transactionsQuery } from "@/lib/db";
import { brl, formatDate, pct, todayISO, toNumber } from "@/lib/format";
import { CREDIT_STATUS_LABEL, creditStatus, type Transaction } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import {
  insertCustomer,
  deleteCustomer,
  insertCredit,
  deleteCredit,
  recordCreditPayment,
} from "@/lib/mutations";
import { totalPedido, type Pedido } from "@/data/loja";
import { cn } from "@/lib/utils";

type ClientesSearch = {
  tab?: "clientes" | "fiado";
};

export const Route = createFileRoute("/_authenticated/clientes")({
  validateSearch: (search: Record<string, unknown>): ClientesSearch => ({
    tab: search.tab === "fiado" ? "fiado" : "clientes",
  }),
  head: () => ({
    meta: [
      { title: "Clientes & Fiado — Vestui" },
      {
        name: "description",
        content: "Gestão completa de clientes: compras no balcão e online, fiado pendente, VIPs e contato no WhatsApp.",
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

function ClientesPage() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [activeTab, setActiveTab] = useState<"clientes" | "fiado">(search.tab || "clientes");

  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab);
    }
  }, [search.tab, activeTab]);

  const handleTabChange = (t: string) => {
    const newTab = t as "clientes" | "fiado";
    setActiveTab(newTab);
    void navigate({ search: { tab: newTab } });
  };

  // Queries
  const { data: customersData = [] } = useQuery(customersQuery());
  const { data: rawCredits = [] } = useQuery(creditsQuery());
  const credits = rawCredits as unknown as CreditRow[];
  const { data: rawTxs = [] } = useQuery(transactionsQuery());
  const txs = rawTxs as unknown as Transaction[];

  // Estados Clientes
  const [busca, setBusca] = useState("");
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
  const [buscaFiado, setBuscaFiado] = useState("");

  // Carrega pedidos da vitrine online para integrar LTV
  useEffect(() => {
    if (!storeId) return;
    try {
      const raw = localStorage.getItem(`vestui_orders_${storeId}`);
      setOrders(raw ? (JSON.parse(raw) as Pedido[]) : []);
    } catch {
      setOrders([]);
    }
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

      // 3. Vendas diretas no caixa (físico)
      const directTxs = txs.filter((t) => {
        if (t.kind !== "entrada" || t.category !== "venda_produto") return false;
        if (
          t.payment_method === "fiado" ||
          t.description.toLowerCase().startsWith("recebimento fiado")
        ) {
          return false;
        }
        const desc = t.description.toLowerCase();
        return (
          norm &&
          (desc.includes(`[cliente: ${norm}]`) ||
            desc.includes(`(${norm})`) ||
            (norm.length >= 3 && desc.includes(norm)))
        );
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
        vip: totalGasto >= 500 || totalPedidos >= 3,
      });
    }

    return list.sort((a, b) => b.totalGasto - a.totalGasto);
  }, [customersData, credits, txs, orders]);

  // Filtro de busca clientes
  const clientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        c.cidade.toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  // Métricas do CRM
  const totalClientes = clientes.length;
  const totalVIPs = clientes.filter((c) => c.vip).length;
  const totalFiadoPendente = clientes.reduce((acc, c) => acc + c.saldoDevedor, 0);

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

  const fiadosFiltrados = useMemo(() => {
    const q = buscaFiado.toLowerCase().trim();
    if (!q) return fiadosComStatus;
    return fiadosComStatus.filter(
      (c) =>
        (c.customers?.name ?? "").toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.customers?.phone ?? "").includes(q),
    );
  }, [fiadosComStatus, buscaFiado]);

  // Mutações Cliente
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome do cliente.");
      await insertCustomer(storeId, name.trim(), phone.trim() || null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setName("");
      setPhone("");
      setModalNovoCliente(false);
      toast.success("Cliente cadastrado com sucesso! 🎉");
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
      toast.success("Fiado registrado com sucesso! 📝");
      setFiadoDescription("");
      setFiadoAmount("");
      setModalNovoFiado(false);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payCreditMutation = useMutation({
    mutationFn: async ({ credit, value }: { credit: CreditRow; value: number }) => {
      if (value <= 0) throw new Error("Informe o valor recebido");
      const remaining = Number(credit.amount) - Number(credit.paid_amount);
      if (value > remaining + 0.005) throw new Error("Valor maior que o saldo devedor");
      return recordCreditPayment({
        storeId,
        creditId: credit.id,
        amount: value,
        currentPaidAmount: Number(credit.paid_amount),
        customerName: credit.customers?.name,
      });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado e lançado no caixa!");
      setPayments({});
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
    if (!digitos) {
      toast.error("Cliente sem telefone cadastrado.");
      return;
    }
    const telFormatado = digitos.length <= 11 ? `55${digitos}` : digitos;
    const msg = encodeURIComponent(
      `Olá ${nomeCliente}! Tudo bem? Passando para te desejar uma ótima semana e avisar que chegaram novidades lindas na nossa coleção! 💕`,
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
    if (!digitos) {
      toast.error("Cliente sem telefone cadastrado.");
      return;
    }
    const telFormatado = digitos.length <= 11 ? `55${digitos}` : digitos;
    const msg = encodeURIComponent(
      `Olá ${nomeCliente}! Tudo bem? Passando para lembrar com carinho do seu fiado de ${brl(valor)} na loja com vencimento em ${formatDate(vencimento)}. Se precisar da chave Pix para facilitar o acerto, é só me pedir aqui! 💕`,
    );
    window.open(`https://wa.me/${telFormatado}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas & Atendimento"
        title="Clientes & Fiado"
        description="Gestão unificada da carteira de clientes, histórico de compras, títulos a receber e cobrança com 1 clique no WhatsApp."
        action={
          <div className="flex items-center gap-2">
            {activeTab === "clientes" ? (
              <Dialog open={modalNovoCliente} onOpenChange={setModalNovoCliente}>
                <DialogTrigger asChild>
                  <Button className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer">
                    <Plus className="size-4 mr-1.5" /> Novo cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cadastrar cliente</DialogTitle>
                    <DialogDescription>
                      Adicione os dados para registrar vendas, fiado e fidelizar com WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-nome">Nome completo</Label>
                      <Input
                        id="c-nome"
                        placeholder="Ex: Mariana Silveira"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-tel">WhatsApp / Telefone</Label>
                      <Input
                        id="c-tel"
                        placeholder="(31) 99876-5432"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setModalNovoCliente(false)}
                      className="rounded-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createCustomerMutation.mutate()}
                      disabled={createCustomerMutation.isPending}
                      className="rounded-full shadow-glow"
                    >
                      {createCustomerMutation.isPending ? "Salvando..." : "Cadastrar cliente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={modalNovoFiado} onOpenChange={setModalNovoFiado}>
                <DialogTrigger asChild>
                  <Button className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer">
                    <Plus className="size-4 mr-1.5" /> Registrar fiado
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border-border bg-card sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar novo fiado</DialogTitle>
                    <DialogDescription>
                      Lance as peças levadas a prazo para controle com data e cobrança.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Cliente</Label>
                      <Select value={fiadoCustomerId} onValueChange={setFiadoCustomerId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 rounded-xl">
                          {customersData.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Descrição das peças / compra</Label>
                      <Input
                        placeholder="Ex: 2 blusas caneladas + 1 calça jeans wide"
                        value={fiadoDescription}
                        onChange={(e) => setFiadoDescription(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor Total (R$)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="Ex: 280,00"
                        value={fiadoAmount}
                        onChange={(e) => setFiadoAmount(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Data da compra</Label>
                        <Input
                          type="date"
                          value={fiadoPurchase}
                          onChange={(e) => setFiadoPurchase(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Vencimento</Label>
                        <Input
                          type="date"
                          value={fiadoDue}
                          onChange={(e) => setFiadoDue(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setModalNovoFiado(false)}
                      className="rounded-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createCreditMutation.mutate()}
                      disabled={createCreditMutation.isPending}
                      className="rounded-full shadow-glow"
                    >
                      {createCreditMutation.isPending ? "Salvando..." : "Salvar fiado"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Alternador de Abas: Clientes & CRM vs. Caderninho de Fiado */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="rounded-full bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="clientes" className="rounded-full px-5 text-xs font-semibold">
            <Users className="size-3.5 mr-1.5" /> Clientes & VIPs ({totalClientes})
          </TabsTrigger>
          <TabsTrigger value="fiado" className="rounded-full px-5 text-xs font-semibold">
            <HandCoins className="size-3.5 mr-1.5" /> Caderninho de Fiado
            {fiadosAbertos.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {fiadosAbertos.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA 1: CLIENTES & CRM ────────────────────────────────────────────── */}
        <TabsContent value="clientes" className="space-y-6 mt-0">
          {/* Métricas do CRM */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total de clientes"
              value={String(totalClientes)}
              hint={`${clientes.filter((c) => c.totalPedidos > 0).length} clientes já compraram`}
              icon={<Users className="size-4" />}
            />
            <StatCard
              label="Clientes VIPs"
              value={String(totalVIPs)}
              hint="Mais de R$ 500 em compras ou 3+ pedidos"
              icon={<Star className="size-4 text-warning" />}
            />
            <StatCard
              label="Fiado total pendente"
              value={brl(totalFiadoPendente)}
              tone={totalFiadoPendente > 0 ? "warning" : "default"}
              hint={totalFiadoPendente > 0 ? "Clique em 'Caderninho de Fiado' para cobrar" : "Nenhum fiado em aberto"}
              icon={<HandCoins className="size-4" />}
            />
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 rounded-full border-border bg-card pl-10 pr-4 text-sm"
            />
          </div>

          {/* Lista de Clientes */}
          {clientesFiltrados.length === 0 ? (
            <EmptyState
              icon={<UserRound className="size-8" />}
              title={busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              description={
                busca
                  ? "Tente buscar por outro termo ou limpe o campo de busca."
                  : "Cadastre seus clientes para acompanhar histórico de compras e fiado."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <ul className="divide-y divide-border/60">
                {clientesFiltrados.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-muted/50"
                  >
                    {/* Identificação do Cliente */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold",
                          c.vip
                            ? "bg-warning/15 text-warning border border-warning/30"
                            : "bg-surface-muted text-muted-foreground border border-border",
                        )}
                      >
                        {c.nome.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{c.nome}</p>
                          {c.vip && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 border border-warning/30 px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
                              <Star className="size-2.5 fill-warning text-warning" /> VIP
                            </span>
                          )}
                          {c.saldoDevedor > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBuscaFiado(c.nome);
                                handleTabChange("fiado");
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/20 cursor-pointer"
                              title="Ver fiados deste cliente"
                            >
                              <AlertCircle className="size-2.5" /> Deve {brl(c.saldoDevedor)} →
                            </button>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.telefone || "Sem telefone"} {c.cidade ? `· ${c.cidade}` : ""}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            <strong className="text-foreground font-semibold">
                              {brl(c.totalGasto)}
                            </strong>{" "}
                            comprados
                          </span>
                          <span>·</span>
                          <span>
                            <strong className="text-foreground font-semibold">
                              {c.totalPedidos}
                            </strong>{" "}
                            {c.totalPedidos === 1 ? "pedido" : "pedidos"}
                          </span>
                          {c.ultimaCompra && (
                            <>
                              <span>·</span>
                              <span>Última compra em {dataBR(c.ultimaCompra)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFiadoCustomerId(c.id);
                          setModalNovoFiado(true);
                        }}
                        className="h-9 rounded-full gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" /> Fiado
                      </Button>

                      {c.telefone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirWhatsAppCliente(c.telefone, c.nome)}
                          className="h-9 rounded-full gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                        >
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </Button>
                      )}

                      <ConfirmDelete
                        title="Excluir cliente?"
                        description={`Deseja remover ${c.nome}? Todo o histórico de compras e fiado associados serão desvinculados.`}
                        onConfirm={() => deleteCustomerMutation.mutate(c.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                            aria-label="Excluir cliente"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 2: CADERNINHO DE FIADO ────────────────────────────────────────── */}
        <TabsContent value="fiado" className="space-y-6 mt-0">
          {/* Métricas do Fiado */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total em aberto"
              value={brl(fiadosAbertosTotal)}
              tone="primary"
              icon={<Users className="size-4" />}
              hint={
                fiadosAbertos.length > 0
                  ? `${fiadosAbertos.length} ${fiadosAbertos.length === 1 ? "título ativo" : "títulos ativos"}`
                  : "Nenhum fiado em aberto"
              }
            />
            <StatCard
              label="Vencido em atraso"
              value={brl(fiadosVencidosTotal)}
              tone={fiadosVencidosTotal > 0 ? "negative" : "default"}
              icon={<AlertTriangle className="size-4" />}
              hint={
                fiadosAbertosTotal > 0
                  ? `${pct((fiadosVencidosTotal / fiadosAbertosTotal) * 100)} do saldo em atraso`
                  : "Nenhum fiado em atraso"
              }
            />
            <StatCard
              label="Já recebido no caixa"
              value={brl(fiadosRecebidosTotal)}
              tone="positive"
              icon={<CheckCircle2 className="size-4" />}
              hint={(() => {
                const paidCount = fiadosComStatus.filter((c) => c.status === "pago").length;
                const totalCount = fiadosComStatus.length;
                if (totalCount === 0) return "Nenhum título registrado";
                return `${paidCount} de ${totalCount} título${totalCount !== 1 ? "s" : ""} quitado${paidCount !== 1 ? "s" : ""}`;
              })()}
            />
          </div>

          {/* Barra de Busca de Fiados */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar fiado por cliente ou descrição das peças..."
                value={buscaFiado}
                onChange={(e) => setBuscaFiado(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-10 pr-4 text-sm"
              />
            </div>
            {buscaFiado && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBuscaFiado("")}
                className="rounded-full text-xs"
              >
                Limpar filtro
              </Button>
            )}
          </div>

          {/* Lista de Fiados */}
          {fiadosFiltrados.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="size-8" />}
              title={buscaFiado ? "Nenhum fiado encontrado" : "Nenhum fiado registrado"}
              description={
                buscaFiado
                  ? "Tente buscar por outro nome ou descrição."
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
                    className="overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold">{customerName}</p>
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
                          Total da compra: {brl(Number(c.amount))}
                        </p>
                      </div>
                    </div>

                    {c.status !== "pago" && (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                        {/* Pagamento Parcial / Quitação */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-36">
                            <Input
                              inputMode="decimal"
                              value={payments[c.id] ?? ""}
                              onChange={(e) =>
                                setPayments((p) => ({ ...p, [c.id]: e.target.value }))
                              }
                              placeholder={brl(remaining)}
                              className="h-9 rounded-xl text-xs"
                            />
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 rounded-full text-xs font-semibold shadow-soft cursor-pointer"
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
                              payCreditMutation.mutate({ credit: c, value: valToPay });
                            }}
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            {payments[c.id]?.trim() ? "Receber parcial" : "Quitar total"}
                          </Button>
                        </div>

                        {/* Botão de Cobrança amigável no WhatsApp + Exclusão */}
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
                                className="size-9 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                aria-label="Excluir fiado"
                              >
                                <Trash2 className="size-4" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
