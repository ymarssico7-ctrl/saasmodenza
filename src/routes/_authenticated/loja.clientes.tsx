import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Search, ShoppingBag, Star, Users } from "lucide-react";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { pedidos, totalPedido } from "@/data/loja";

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

// Derive client data from orders
type ClienteLoja = {
  nome: string;
  telefone: string;
  cidade: string;
  totalGasto: number;
  totalPedidos: number;
  ultimaCompra: string;
  vip: boolean;
};

function buildClientes(): ClienteLoja[] {
  const map = new Map<string, ClienteLoja>();
  for (const pedido of pedidos) {
    const existing = map.get(pedido.cliente);
    const valor = totalPedido(pedido);
    if (existing) {
      existing.totalGasto += valor;
      existing.totalPedidos += 1;
      if (pedido.criadoEm > existing.ultimaCompra) {
        existing.ultimaCompra = pedido.criadoEm;
      }
    } else {
      map.set(pedido.cliente, {
        nome: pedido.cliente,
        telefone: pedido.telefone,
        cidade: pedido.cidade,
        totalGasto: valor,
        totalPedidos: 1,
        ultimaCompra: pedido.criadoEm,
        vip: false,
      });
    }
  }
  const list = Array.from(map.values());
  // Mark top 25% as VIP
  list.sort((a, b) => b.totalGasto - a.totalGasto);
  const vipCutoff = Math.ceil(list.length * 0.25);
  list.forEach((c, i) => {
    c.vip = i < vipCutoff;
  });
  return list;
}

const clientesBase = buildClientes();

function dataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function ClientesLojaPage() {
  const [busca, setBusca] = useState("");

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientesBase;
    const q = busca.toLowerCase();
    return clientesBase.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.cidade.toLowerCase().includes(q) ||
        c.telefone.includes(q),
    );
  }, [busca]);

  const totalGastoGeral = clientesBase.reduce((a, c) => a + c.totalGasto, 0);
  const ticketMedioGeral =
    clientesBase.length > 0
      ? totalGastoGeral / clientesBase.reduce((a, c) => a + c.totalPedidos, 0)
      : 0;

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
              value: clientesBase.length.toString(),
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
            <div
              key={kpi.label}
              className="surface-card flex items-center gap-4 p-5"
            >
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
          description="Ordenados por total gasto. Clientes VIP são as top 25%."
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
              title="Nenhuma cliente encontrada"
              description="Tente buscar por um nome ou cidade diferente."
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {clientesFiltrados.map((c) => (
                <li
                  key={c.nome}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{c.nome}</span>
                      {c.vip && (
                        <Tag tone="warning">⭐ VIP</Tag>
                      )}
                      <Tag tone="neutral">{c.cidade}</Tag>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.totalPedidos} {c.totalPedidos === 1 ? "pedido" : "pedidos"} ·{" "}
                      Última compra {dataBR(c.ultimaCompra)} · {c.telefone}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num-display text-sm font-semibold">
                      {brl(c.totalGasto)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 rounded-full text-xs"
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `Olá, ${c.nome.split(" ")[0]}! 👋 Passando para avisar as novidades da loja 💜`,
                        );
                        window.open(`https://wa.me/55${c.telefone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                      }}
                    >
                      <MessageCircle className="mr-1 h-3 w-3" />
                      WhatsApp
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
  );
}

