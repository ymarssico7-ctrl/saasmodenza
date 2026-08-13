import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Search, ShoppingBag, Star, Users } from "lucide-react";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { customersQuery, transactionsQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/loja/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes da Loja — Modenza" },
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
  const [busca, setBusca] = useState("");
  const { data: customersData = [] } = useQuery(customersQuery());
  const { data: transactionsData = [] } = useQuery(transactionsQuery());

  // Deriva estatísticas de clientes a partir das transações reais
  const clientesBase = useMemo<ClienteLoja[]>(() => {
    const map = new Map<string, ClienteLoja>();

    for (const customer of customersData) {
      map.set(customer.id, {
        id: customer.id,
        nome: customer.name ?? "Cliente sem nome",
        telefone: customer.phone ?? "",
        cidade: ((customer as Record<string, unknown>)["city"] as string) ?? "",
        totalGasto: 0,
        totalPedidos: 0,
        ultimaCompra: null,
        vip: false,
      });
    }

    // Acumula transações de entrada por cliente
    for (const tx of transactionsData) {
      const customerId = (tx as Record<string, unknown>)["customer_id"] as string | undefined;
      if (!customerId) continue;
      const existing = map.get(customerId);
      if (!existing) continue;

      const amount = Number(tx.amount ?? 0);
      if (amount > 0) {
        existing.totalGasto += amount;
        existing.totalPedidos += 1;
        if (!existing.ultimaCompra || tx.occurred_on > existing.ultimaCompra) {
          existing.ultimaCompra = tx.occurred_on;
        }
      }
    }

    const list = Array.from(map.values()).filter(
      (c) => c.totalPedidos > 0 || customersData.length > 0,
    );
    list.sort((a, b) => b.totalGasto - a.totalGasto);

    // Top 25% viram VIP
    const vipCutoff = Math.ceil(list.length * 0.25);
    list.forEach((c, i) => {
      c.vip = i < vipCutoff && c.totalGasto > 0;
    });

    return list;
  }, [customersData, transactionsData]);

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
                        const msg = encodeURIComponent(
                          `Olá, ${c.nome.split(" ")[0]}! 👋 Passando para avisar as novidades da loja 💜`,
                        );
                        window.open(
                          `https://wa.me/55${c.telefone.replace(/\D/g, "")}?text=${msg}`,
                          "_blank",
                        );
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
