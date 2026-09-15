import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
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
import { ClientesTabs } from "@/components/clientes-tabs";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { insertCustomer, deleteCustomer } from "@/lib/mutations";
import { type Transaction } from "@/lib/finance";
import { totalPedido, type Pedido } from "@/data/loja";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes & CRM — Vestui" },
      {
        name: "description",
        content: "Gestão completa de clientes: compras no balcão e online, fiado pendente, VIPs e contato no WhatsApp.",
      },
    ],
  }),
  component: Clientes,
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

function dataBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function Clientes() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: customersData = [] } = useQuery(customersQuery());
  const { data: creditsData = [] } = useQuery(creditsQuery());
  const { data: rawTxs = [] } = useQuery(transactionsQuery());
  const txs = rawTxs as unknown as Transaction[];

  const [busca, setBusca] = useState("");
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [orders, setOrders] = useState<Pedido[]>([]);

  // Carrega pedidos da vitrine online para integrar LTV
  useEffect(() => {
    if (!storeId) return;
    try {
      const raw =
        localStorage.getItem(`vestui_orders_${storeId}`) ||
        localStorage.getItem(`vestui_orders_${storeId}`);
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
      const fiados = creditsData.filter((c) => c.customer_id === customer.id);
      const fiadoPaid = fiados.reduce((acc, c) => acc + Number(c.paid_amount), 0);
      const saldoDevedor = fiados.reduce((acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)), 0);
      const fiadoCount = fiados.filter((c) => Number(c.paid_amount) > 0).length;

      // 3. Vendas diretas no caixa (físico)
      const directTxs = txs.filter((t) => {
        if (t.kind !== "entrada" || t.category !== "venda_produto") return false;
        if (t.payment_method === "fiado" || t.description.toLowerCase().startsWith("recebimento fiado")) {
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
          ? lastOnlineDate > lastTxDate ? lastOnlineDate : lastTxDate
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
  }, [customersData, creditsData, txs, orders]);

  // Filtro de busca
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        c.cidade.toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  // Métricas do topo
  const totalClientes = clientes.length;
  const totalVIPs = clientes.filter((c) => c.vip).length;
  const totalFiadoPendente = clientes.reduce((acc, c) => acc + c.saldoDevedor, 0);

  // Mutações
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome do cliente.");
      await insertCustomer(storeId, name.trim(), phone.trim() || null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setName("");
      setPhone("");
      setCity("");
      setModalNovoAberto(false);
      toast.success("Cliente cadastrado com sucesso! 🎉");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
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

  const abrirWhatsApp = (telefone: string, nomeCliente: string) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão do Negócio"
        title="Clientes & CRM"
        description="Acompanhe o valor gerado por cada cliente, fiado pendente, status VIP e converse com 1 clique no WhatsApp."
        action={
          <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
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
                  onClick={() => setModalNovoAberto(false)}
                  className="rounded-full"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="rounded-full shadow-glow"
                >
                  {createMutation.isPending ? "Salvando..." : "Cadastrar cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <ClientesTabs pendingCreditsCount={clientes.filter((c) => c.saldoDevedor > 0).length} />

      {/* Cards de Métricas do CRM */}
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
          hint={totalFiadoPendente > 0 ? "Aguardando quitação" : "Nenhum fiado em aberto"}
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
      {filtrados.length === 0 ? (
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
            {filtrados.map((c) => (
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          <AlertCircle className="size-2.5" /> Deve {brl(c.saldoDevedor)}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.telefone || "Sem telefone"} {c.cidade ? `· ${c.cidade}` : ""}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground font-semibold">{brl(c.totalGasto)}</strong> comprados
                      </span>
                      <span>·</span>
                      <span>
                        <strong className="text-foreground font-semibold">{c.totalPedidos}</strong> {c.totalPedidos === 1 ? "pedido" : "pedidos"}
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
                  {c.telefone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirWhatsApp(c.telefone, c.nome)}
                      className="h-9 rounded-full gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                    >
                      <MessageCircle className="size-3.5" />
                      WhatsApp
                    </Button>
                  )}

                  <ConfirmDelete
                    title="Excluir cliente?"
                    description={`Deseja remover ${c.nome}? Todo o histórico de compras e fiado associados serão desvinculados.`}
                    onConfirm={() => deleteMutation.mutate(c.id)}
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
    </div>
  );
}
