import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Copy, MessageCircle, Receipt, Rocket, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { inventoryQuery } from "@/lib/db";
import { hasAnyActiveProduct, bulkActivateAll } from "@/lib/showcase-store";
import { PageHeader } from "@/components/loja/page-header";
import { KpiCard } from "@/components/loja/kpi-card";
import { SectionCard } from "@/components/loja/section-card";
import { StatusBadge, Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl, brlCompact } from "@/lib/format";
import { kpisLoja, loja, pedidos, produtos, totalPedido, vendasPorDia, dateTimeBR } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/")({
  head: () => ({
    meta: [
      { title: "Loja Online — Modenza" },
      {
        name: "description",
        content:
          "Acompanhe vendas do mês, pedidos recebidos, ticket médio e a origem dos pedidos da sua loja online.",
      },
    ],
  }),
  component: VisaoGeral,
});

const variacao = (atual: number, anterior: number) => ((atual - anterior) / anterior) * 100;

function VisaoGeral() {
  const ultimos = pedidos.slice(0, 5);
  const totalOrigem = kpisLoja.origem.reduce((a, o) => a + o.valor, 0);
  const esgotados = produtos.filter((p) => p.estoque === 0).length;
  const ultimasUnidades = produtos.filter((p) => p.estoque > 0 && p.estoque < 3).length;

  const copiarLink = () => {
    void navigator.clipboard?.writeText(`https://${loja.subdominio}`);
    toast.success("Link da loja copiado", { description: "Cole no Instagram, WhatsApp ou TikTok." });
  };

  // ── Onboarding Aha! Moment ─────────────────────────────────────────────────
  const { data: inventoryItems = [] } = useQuery(inventoryQuery());
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show banner only if there are inventory items but none active in the showcase
    if (inventoryItems.length > 0 && !hasAnyActiveProduct()) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [inventoryItems]);

  const ativarTodasNaVitrine = () => {
    bulkActivateAll(inventoryItems.map((i) => i.id));
    setShowOnboarding(false);
    toast.success(
      `${inventoryItems.length} ${inventoryItems.length === 1 ? "peça publicada" : "peças publicadas"} na vitrine! 🚀`,
      { description: "Acesse \"Produtos\" para personalizar a ordem e destaques." },
    );
  };

  return (
      <div className="space-y-6">
        {/* ── ONBOARDING: AHA MOMENT BANNER ─────────────────────────────── */}
        {showOnboarding && (
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary-soft via-primary-soft/60 to-transparent p-6 shadow-glow">
            <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Sua loja está pronta para decolar! 🚀
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Encontramos{" "}
                    <span className="font-semibold text-foreground">
                      {inventoryItems.length} {inventoryItems.length === 1 ? "peça" : "peças"}
                    </span>{" "}
                    no seu estoque de gestão. Publique tudo na vitrine com um clique.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setShowOnboarding(false)}
                >
                  Agora não
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary rounded-full text-xs shadow-glow"
                  onClick={ativarTodasNaVitrine}
                >
                  Publicar na Vitrine
                </Button>
              </div>
            </div>
          </div>
        )}

        <PageHeader
          eyebrow="Loja online"
          title={`Bom te ver, ${(loja.nome.split(" ")[0] ?? loja.nome)}`}
          description={`Sua vitrine está no ar em ${loja.subdominio}. Tudo que você cadastra no estoque aparece aqui automaticamente.`}
          actions={
            <>
              <Button
                variant="outline"
                onClick={copiarLink}
                className="h-10 rounded-full border-border bg-card text-sm"
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar link
              </Button>
              <Button asChild className="gradient-primary h-10 rounded-full text-sm shadow-glow">
                <Link to="/loja/produtos">
                  <Sparkles className="mr-2 h-4 w-4" /> Gerenciar vitrine
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            accent
            label="Vendas no mês"
            value={kpisLoja.vendasMes}
            format={brl}
            delta={variacao(kpisLoja.vendasMes, kpisLoja.vendasMesAnterior)}
            hint="vs. julho"
            icon={<Wallet className="h-4 w-4" />}
          />
          <KpiCard
            label="Pedidos recebidos"
            value={kpisLoja.pedidos}
            format={(n) => Math.round(n).toString()}
            delta={variacao(kpisLoja.pedidos, kpisLoja.pedidosMesAnterior)}
            hint="vs. julho"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <KpiCard
            label="Ticket médio"
            value={kpisLoja.ticketMedio}
            format={brl}
            delta={variacao(kpisLoja.ticketMedio, kpisLoja.ticketMedioAnterior)}
            hint="vs. julho"
            icon={<Receipt className="h-4 w-4" />}
          />
          <KpiCard
            label="Peça mais vendida"
            value={kpisLoja.produtoTopVendas}
            format={(n) => `${Math.round(n)} un.`}
            hint={kpisLoja.produtoTop}
            icon={<Sparkles className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Vendas dos últimos 8 dias"
            description="Valores confirmados que já entraram no caixa da gestão."
            bodyClassName="px-2 pb-4 pt-5 sm:px-4"
          >
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorDia} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => brlCompact(v)}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
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
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Origem dos pedidos" description="Como suas clientes estão comprando.">
              <div className="space-y-4">
                {kpisLoja.origem.map((o) => (
                  <div key={o.nome}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{o.nome}</span>
                      <span className="num-display text-muted-foreground">
                        {o.valor} · {Math.round((o.valor / totalOrigem) * 100)}%
                      </span>
                    </div>
                    <Progress value={(o.valor / totalOrigem) * 100} className="mt-2 h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Atenção no estoque" description="Reflete direto na vitrine.">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-warning-soft px-3 py-2.5">
                  <span className="text-muted-foreground">Últimas unidades</span>
                  <Tag tone="warning">{ultimasUnidades} peças</Tag>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-danger-soft px-3 py-2.5">
                  <span className="text-muted-foreground">Esgotadas na vitrine</span>
                  <Tag tone="danger">{esgotados} peças</Tag>
                </div>
                <Button asChild variant="ghost" className="h-9 w-full rounded-xl text-xs">
                  <Link to="/loja/produtos">
                    Revisar produtos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Últimos pedidos"
          description="Pedido aceito baixa do estoque e registra entrada no caixa automaticamente."
          actions={
            <Button asChild variant="ghost" className="h-9 rounded-full text-xs">
              <Link to="/loja/pedidos">Ver todos</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/70">
            {ultimos.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-secondary/50"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="num-display text-sm font-semibold">{p.numero}</span>
                    <StatusBadge status={p.status} />
                    <Tag tone={p.origem === "WhatsApp" ? "success" : "primary"}>{p.origem}</Tag>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {p.cliente} · {p.itens.length} {p.itens.length === 1 ? "item" : "itens"} ·{" "}
                    {dateTimeBR(p.criadoEm)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num-display text-sm font-semibold">{brl(totalPedido(p))}</p>
                  <p className="text-xs text-muted-foreground">{p.pagamento}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Conectado com a gestão" description="Nada de cadastro em dobro.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { t: "Peça cadastrada no estoque", d: "Publica na vitrine automaticamente." },
              { t: "Venda confirmada", d: "Baixa o estoque na hora." },
              { t: "Pedido aceito", d: "Registra entrada no caixa." },
              { t: "Estoque zerado", d: 'Vira \u201cEsgotado\u201d na vitrine.' },
            ].map((item) => (
              <div key={item.t} className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold">{item.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-xs text-accent-foreground">
            <MessageCircle className="h-4 w-4 shrink-0" />
            Clientes recebem atualização de status por WhatsApp sem você digitar nada.
          </div>
        </SectionCard>
      </div>
  );
}

