import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Camera, Copy, MessageCircle, Receipt, Rocket, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { inventoryQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { hasAnyActiveProduct, bulkActivateAll } from "@/lib/showcase-store";
import { PageHeader } from "@/components/loja/page-header";
import { KpiCard } from "@/components/loja/kpi-card";
import { SectionCard } from "@/components/loja/section-card";
import { StatusBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { brl, brlCompact } from "@/lib/format";
import { totalPedido, type Pedido } from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/")({
  head: () => ({
    meta: [
      { title: "Loja Online — Modenza" },
      { name: "description", content: "Acompanhe vendas do mes, pedidos recebidos, ticket medio e a origem dos pedidos da sua loja online." },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const { data: profile } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const primeiroNome = (profile?.owner_name || store?.name || "Lojista").split(" ")[0] ?? "Lojista";
  const subdominio = store?.slug ? `${store.slug}.modenza.com.br` : `minhaloja.modenza.com.br`;

  const copiarLink = () => {
    void navigator.clipboard?.writeText(`https://${subdominio}`);
    toast.success("Link da loja copiado", { description: "Cole no Instagram, WhatsApp ou TikTok." });
  };

  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    if (!storeId) return;
    try {
      const raw = localStorage.getItem(`modaly_orders_${storeId}`);
      setPedidos(raw ? (JSON.parse(raw) as Pedido[]) : []);
    } catch { setPedidos([]); }
  }, [storeId]);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const pedidosMes = useMemo(
    () => pedidos.filter((p) => p.status !== "cancelado" && p.criadoEm.slice(0, 7) === thisMonth),
    [pedidos, thisMonth],
  );

  const vendasMes = useMemo(() => pedidosMes.reduce((acc, p) => acc + totalPedido(p), 0), [pedidosMes]);
  const totalPedidosMes = pedidosMes.length;
  const ticketMedio = totalPedidosMes > 0 ? vendasMes / totalPedidosMes : 0;

  const melhorProduto = useMemo(() => {
    const contagem: Record<string, { nome: string; qtd: number }> = {};
    for (const p of pedidosMes) {
      for (const item of p.itens) {
        if (!contagem[item.produtoId]) contagem[item.produtoId] = { nome: item.nome, qtd: 0 };
        contagem[item.produtoId]!.qtd += item.qtd;
      }
    }
    return Object.values(contagem).sort((a, b) => b.qtd - a.qtd)[0] ?? null;
  }, [pedidosMes]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (7 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map((day) => ({
      dia: day.slice(8),
      vendas: pedidos
        .filter((p) => p.status !== "cancelado" && p.criadoEm.startsWith(day))
        .reduce((acc, p) => acc + totalPedido(p), 0),
    }));
  }, [pedidos]);

  const esgotados = 0;
  const ultimasUnidades = 0;

  const { data: inventoryItems = [] } = useQuery(inventoryQuery());
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
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
      `${inventoryItems.length} ${inventoryItems.length === 1 ? "peca publicada" : "pecas publicadas"} na vitrine!`,
      { description: 'Acesse "Produtos" para personalizar a ordem e destaques.' },
    );
  };

  const ultimosPedidos = useMemo(
    () => [...pedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5),
    [pedidos],
  );

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary-soft via-primary-soft/60 to-transparent p-6 shadow-glow">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">Sua loja esta pronta para decolar!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Encontramos <span className="font-semibold text-foreground">{inventoryItems.length} {inventoryItems.length === 1 ? "peca" : "pecas"}</span> no seu estoque de gestao. Publique tudo na vitrine com um clique.
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                  <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Dica de ouro:</span> Boas fotos vendem mais. Apos publicar, acesse <span className="font-semibold">Produtos na Loja</span> para subir fotos profissionais.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setShowOnboarding(false)}>Agora nao</Button>
              <Button size="sm" className="gradient-primary rounded-full text-xs shadow-glow" onClick={ativarTodasNaVitrine}>Publicar na Vitrine</Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Loja online"
        title={`Bom te ver, ${primeiroNome}`}
        description={`Sua vitrine esta no ar em ${subdominio}. Tudo que voce cadastra no estoque aparece aqui automaticamente.`}
        actions={
          <>
            <Button variant="outline" onClick={copiarLink} className="h-10 rounded-full border-border bg-card text-sm">
              <Copy className="mr-2 h-4 w-4" /> Copiar link
            </Button>
            <Button asChild className="gradient-primary h-10 rounded-full text-sm shadow-glow">
              <Link to="/loja/produtos"><Sparkles className="mr-2 h-4 w-4" /> Gerenciar vitrine</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard accent label="Vendas no mes" value={vendasMes} format={brl} hint={totalPedidosMes > 0 ? `${totalPedidosMes} pedido${totalPedidosMes > 1 ? "s" : ""} confirmado${totalPedidosMes > 1 ? "s" : ""}` : "Nenhuma venda ainda"} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Pedidos recebidos" value={totalPedidosMes} format={(n) => Math.round(n).toString()} hint={totalPedidosMes === 0 ? "Nenhum pedido ainda" : "Este mes"} icon={<ShoppingBag className="h-4 w-4" />} />
        <KpiCard label="Ticket medio" value={ticketMedio} format={brl} hint={ticketMedio > 0 ? "Valor medio por pedido" : "—"} icon={<Receipt className="h-4 w-4" />} />
        <KpiCard label="Peca mais vendida" value={0} format={() => melhorProduto?.nome ?? "—"} hint={melhorProduto ? `${melhorProduto.qtd} unid. vendidas` : "Nenhum item vendido"} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Vendas dos ultimos 8 dias" description="Valores confirmados que ja entraram no caixa da gestao." bodyClassName="px-2 pb-4 pt-5 sm:px-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => brlCompact(v)} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-popover)", color: "var(--color-popover-foreground)", boxShadow: "var(--shadow-lifted)", fontSize: 12 }} />
                <Area type="monotone" dataKey="vendas" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#fillVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Origem dos pedidos" description="Como suas clientes estao comprando.">
            {pedidos.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Nenhum pedido registrado ainda.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {(["WhatsApp", "Checkout"] as const).map((origem) => {
                  const count = pedidos.filter((p) => p.origem === origem).length;
                  if (count === 0) return null;
                  return (
                    <div key={origem} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                      <span className="text-muted-foreground">{origem}</span>
                      <span className="num-display font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Atencao no estoque" description="Reflete direto na vitrine.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-warning-soft px-3 py-2.5">
                <span className="text-muted-foreground">Ultimas unidades</span>
                <span className="num-display font-semibold">{ultimasUnidades} pecas</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-danger-soft px-3 py-2.5">
                <span className="text-muted-foreground">Esgotadas na vitrine</span>
                <span className="num-display font-semibold">{esgotados} pecas</span>
              </div>
              <Button asChild variant="ghost" className="h-9 w-full rounded-xl text-xs">
                <Link to="/loja/produtos">Revisar produtos <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Ultimos pedidos"
        description="Pedido aceito baixa do estoque e registra entrada no caixa automaticamente."
        actions={<Button asChild variant="ghost" className="h-9 rounded-full text-xs"><Link to="/loja/pedidos">Ver todos</Link></Button>}
        bodyClassName="p-0"
      >
        {ultimosPedidos.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShoppingBag className="h-8 w-8 opacity-30" />
            <p>Nenhum pedido recebido ainda.</p>
            <p className="text-xs">Seus pedidos da loja online aparecerao aqui.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ultimosPedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.cliente}</p>
                  <p className="text-xs text-muted-foreground">{p.numero} · {p.criadoEm.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={p.status} />
                  <span className="num-display text-sm font-semibold">{brl(totalPedido(p))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Conectado com a gestao" description="Nada de cadastro em dobro.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { t: "Peca cadastrada no estoque", d: "Publica na vitrine automaticamente." },
            { t: "Venda confirmada", d: "Baixa o estoque na hora." },
            { t: "Pedido aceito", d: "Registra entrada no caixa." },
            { t: "Estoque zerado", d: "Vira Esgotado na vitrine." },
          ].map((item) => (
            <div key={item.t} className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-sm font-semibold">{item.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-xs text-accent-foreground">
          <MessageCircle className="h-4 w-4 shrink-0" />
          Clientes recebem atualizacao de status por WhatsApp sem voce digitar nada.
        </div>
      </SectionCard>
    </div>
  );
}