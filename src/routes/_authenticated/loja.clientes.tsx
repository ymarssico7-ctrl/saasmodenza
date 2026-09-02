import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Search, ShoppingBag, Star, Users } from "lucide-react";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { customersQuery, creditsQuery, transactionsQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { totalPedido, type Pedido } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes da Loja — Vestuli" },
      {
        name: "description",
        content: "Visualize o histórico de compras, frequência e ticket médio das suas clientes.",
      },
    ],
  }),
  component: ClientesLojaPage,
});

// Tipo derivado de clientes reais
type ClienteLoja = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  totalGasto: number;
  totalPedidos: number;
  ultimaCompra: string | null;
  vip: boolean;
};

function dataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function ClientesLojaPage() {
  const { storeId } = useStore();
  const [busca, setBusca] = useState("");
  const { data: customersData = [] } = useQuery(customersQuery());
  const { data: creditsData = [] } = useQuery(creditsQuery());
  const { data: transactionsData = [] } = useQuery(transactionsQuery());
  const [orders, setOrders] = useState<Pedido[]>([]);

  useEffect(() => {
    if (!storeId) return;
    try {
      const raw =
        localStorage.getItem(`vestuli_orders_${storeId}`) ||
        localStorage.getItem(`modaly_orders_${storeId}`);
      setOrders(raw ? (JSON.parse(raw) as Pedido[]) : []);
    } catch {
      setOrders([]);
    }
  }, [storeId]);

  // Deriva estatísticas de clientes unificando pedidos online, caixa e fiado
  const clientesBase = useMemo<ClienteLoja[]>(() => {
    const map = new Map<string, ClienteLoja>();

    for (const customer of customersData) {
      const norm = (customer.name ?? "").toLowerCase().trim();
      const phoneNorm = (customer.phone ?? "").replace(/\D/g, "");

      // 1. Pedidos online da vitrine
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

      // 2. Fiados quitados vinculados ao customerId
      const fiados = creditsData.filter((c) => c.customer_id === customer.id);
      const fiadoPaid = fiados.reduce((acc, c) => acc + Number(c.paid_amount), 0);
      const fiadoCount = fiados.filter((c) => Number(c.paid_amount) > 0).length;

      // 3. Vendas diretas no caixa atribuídas ao cliente
      const directTxs = transactionsData.filter((t) => {
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

      // 4. Estornos atribuídos ao cliente
      const refunds = transactionsData
        .filter((t) => {
          if (t.kind !== "saida" || t.category !== "estorno_devolucao") return false;
          const desc = t.description.toLowerCase();
          return (
            norm &&
            (desc.includes(`[cliente: ${norm}]`) ||
              desc.includes(`(${norm})`) ||
              (norm.length >= 3 && desc.includes(norm)))
          );
        })
        .reduce((acc, t) => acc + Number(t.amount), 0);

      // 5. Data mais recente entre transações físicas e pedidos online
      let lastTxDate: string | null = null;
      for (const t of directTxs) {
        if (!lastTxDate || t.occurred_on > lastTxDate) lastTxDate = t.occurred_on;
      }

      const ultimaCompra =
        lastOnlineDate && lastTxDate
          ? lastOnlineDate > lastTxDate ? lastOnlineDate : lastTxDate
          : lastOnlineDate || lastTxDate || null;

      const totalGasto = Math.max(onlineTotal + directTotal + fiadoPaid - refunds, 0);
      const totalPedidos = onlineCount + directCount + fiadoCount;

      map.set(customer.id, {
        id: customer.id,
        nome: customer.name ?? "Cliente sem nome",
        telefone: customer.phone ?? "",
        cidade: ((customer as Record<string, unknown>)["city"] as string) ?? "",
        totalGasto,
        totalPedidos,
        ultimaCompra,
        vip: false,
      });
    }

    const list = Array.from(map.values());
    list.sort((a, b) => b.totalGasto - a.totalGasto);

    // Top 25% viram VIP
    const vipCutoff = Math.ceil(list.length * 0.25);
    list.forEach((c, i) => {
      c.vip = i < vipCutoff && c.totalGasto > 0;
    });

    return list;
  }, [customersData, creditsData, transactionsData, orders]);

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientesBase;
    const q = busca.toLowerCase();
    return clientesBase.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.cidade.toLowerCase().includes(q) ||
        c.telefone.includes(q),
    );
  }, [busca, clientesBase]);

  const totalGastoGeral = clientesBase.reduce((a, c) => a + c.totalGasto, 0);
  const totalPedidosGeral = clientesBase.reduce((a, c) => a + c.totalPedidos, 0);
  const ticketMedioGeral = totalPedidosGeral > 0 ? totalGastoGeral / totalPedidosGeral : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Acompanhe quem está comprando mais, com que frequência e quanto gasta na sua loja."
      />

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total de clientes",
            value: customersData.length.toString(),
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Total em compras",
            value: brl(totalGastoGeral),
            icon: <ShoppingBag className="h-4 w-4" />,
          },
          {
            label: "Ticket médio",
            value: brl(ticketMedioGeral),
            icon: <Star className="h-4 w-4" />,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card flex items-center gap-4 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
              {kpi.icon}
            </div>
            <div>
              <p className="num-display text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de clientes */}
      <SectionCard
        title="Lista de clientes"
        description="Clientes cadastrados na sua loja. VIPs são as top 25% em valor gasto."
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou telefone…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 w-[240px] rounded-full pl-9 text-sm"
            />
          </div>
        }
        bodyClassName="p-0"
      >
        {clientesFiltrados.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={busca ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada ainda"}
            description={
              busca
                ? "Tente buscar por um nome ou cidade diferente."
                : "Cadastre clientes na gestão para vê-los aparecer aqui."
            }
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {clientesFiltrados.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{c.nome}</span>
                    {c.vip && <Tag tone="warning">⭐ VIP</Tag>}
                    {c.cidade && <Tag tone="neutral">{c.cidade}</Tag>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.totalPedidos} {c.totalPedidos === 1 ? "compra" : "compras"}
                    {c.ultimaCompra ? ` · Última ${dataBR(c.ultimaCompra)}` : ""}
                    {c.telefone ? ` · ${c.telefone}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num-display text-sm font-semibold">{brl(c.totalGasto)}</p>
                  {c.telefone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 rounded-full text-xs"
                      onClick={() => {
                        const digits = (c.telefone ?? "").replace(/\D/g, "");
                        const msg = encodeURIComponent(
                          `Olá, ${c.nome.split(" ")[0]}! 👋 Passando para avisar as novidades da loja 💜`,
                        );
                        if (digits.length >= 8) {
                          const phone = digits.startsWith("55") ? digits : `55${digits}`;
                          window.open(
                            `https://wa.me/${phone}?text=${msg}`,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        } else {
                          window.open(
                            `https://api.whatsapp.com/send?text=${msg}`,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                      }}
                    >
                      <MessageCircle className="mr-1 h-3 w-3" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
