import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MessageCircle, PackageSearch, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { StatusBadge, Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { restoreOrderStock, adjustInventoryStock, insertTransaction } from "@/lib/mutations";
import {
  fluxoStatus,
  statusPedidoLabel,
  totalPedido,
  type Pedido,
  type StatusPedido,
  dateTimeBR,
  dateBR,
} from "@/data/loja";

export const Route = createFileRoute("/_authenticated/loja/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos da loja — Vestuli" },
      {
        name: "description",
        content:
          "Acompanhe pedidos por status, atualize etapas de entrega, registre rastreio e avise a cliente por WhatsApp.",
      },
    ],
  }),
  component: PedidosPage,
});

const filtros: { valor: StatusPedido | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  ...fluxoStatus.map((s) => ({ valor: s, label: statusPedidoLabel[s] })),
  { valor: "cancelado", label: "Cancelado" },
];

function mapPedidoPaymentMethod(pagamento: string): string {
  const p = (pagamento || "").toLowerCase();
  if (p.includes("pix")) return "pix";
  if (p.includes("débito") || p.includes("debito")) return "debito";
  if (p.includes("crédito") || p.includes("credito") || p.includes("cartão") || p.includes("cartao")) return "credito";
  if (p.includes("dinheiro")) return "dinheiro";
  return "pix";
}

function pedidosKey(storeId: string) {
  return `vestuli_orders_${storeId}`;
}

function legacyPedidosKey(storeId: string) {
  return `modaly_orders_${storeId}`;
}

function PedidosPage() {
  const { storeId, store } = useStore();
  const queryClient = useQueryClient();
  const [lista, setLista] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<StatusPedido | "todos">("todos");
  const [data, setData] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  // Carrega pedidos isolados por loja do localStorage
  useEffect(() => {
    if (!storeId) return;
    try {
      const stored =
        localStorage.getItem(pedidosKey(storeId)) ||
        localStorage.getItem(legacyPedidosKey(storeId));
      if (stored) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLista(JSON.parse(stored) as any as Pedido[]);
      } else {
        setLista([]);
      }
    } catch {
      setLista([]);
    }
  }, [storeId]);

  // Persiste mudanças no localStorage
  const persistir = (novaLista: Pedido[]) => {
    setLista(novaLista);
    localStorage.setItem(pedidosKey(storeId), JSON.stringify(novaLista));
  };

  const visiveis = useMemo(
    () =>
      lista.filter(
        (p) =>
          (filtro === "todos" || p.status === filtro) &&
          (data === "" || p.criadoEm.slice(0, 10) === data),
      ),
    [lista, filtro, data],
  );

  const pedidoAberto = lista.find((p) => p.id === aberto) ?? null;

  const avancarStatus = (pedido: Pedido) => {
    const atual = fluxoStatus.indexOf(pedido.status as (typeof fluxoStatus)[number]);
    if (atual < 0 || atual >= fluxoStatus.length - 1) return;
    const proximo = fluxoStatus[atual + 1]!;
    const novaLista = lista.map((p) =>
      p.id === pedido.id ? { ...p, status: proximo as StatusPedido } : p,
    );
    persistir(novaLista);

    // ── Automação ao CONFIRMAR um pedido (novo → confirmado) ───────────────
    // Baixa as quantidades do estoque e registra a entrada no Caixa automaticamente.
    if (pedido.status === "novo" && proximo === "confirmado") {
      // 1) Baixa de Estoque: reduz 1 unidade por item (agrupado por produto)
      if (pedido.itens?.length) {
        const deducoes = pedido.itens.map((item) =>
          adjustInventoryStock(storeId, item.produtoId, -item.qtd),
        );
        void Promise.all(deducoes).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["inventory"] });
        });
      }

      // 2) Lançamento no Caixa: entrada no valor total do pedido
      const valorTotal = totalPedido(pedido);
      void insertTransaction({
        storeId,
        kind: "entrada",
        description: `Venda online — Pedido ${pedido.numero} (${pedido.cliente})`,
        amount: valorTotal,
        category: "venda_produto",
        payment_method: mapPedidoPaymentMethod(pedido.pagamento),
        occurred_on: new Date().toISOString().slice(0, 10),
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      });

      toast.success("Pedido confirmado! ✅", {
        description: `Estoque baixado e R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} lançado no Caixa.`,
        duration: 5000,
      });
    } else {
      toast.success(`Status atualizado para "${statusPedidoLabel[proximo]}"`, {
        description: `Pedido ${pedido.numero} — ${pedido.cliente}`,
      });
    }
  };


  const cancelar = (id: string) => {
    const pedido = lista.find((p) => p.id === id);
    if (!pedido) return;
    const statusAnterior = pedido.status;
    const novaLista = lista.map((p) =>
      p.id === id ? { ...p, status: "cancelado" as StatusPedido } : p,
    );
    persistir(novaLista);
    setAberto(null);

    // Se o pedido já havia sido confirmado (baixou estoque e entrou no caixa), estorna ambos
    if (statusAnterior !== "novo" && statusAnterior !== "cancelado") {
      // 1. Devolve estoque das peças
      if (pedido.itens?.length) {
        void restoreOrderStock(storeId, pedido.itens).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["inventory"] });
        });
      }
      // 2. Lança saída de estorno no Caixa
      const valorTotal = totalPedido(pedido);
      if (valorTotal > 0) {
        void insertTransaction({
          storeId,
          kind: "saida",
          description: `Estorno de pedido online cancelado — Pedido ${pedido.numero} (${pedido.cliente})`,
          amount: valorTotal,
          category: "estorno_devolucao",
          payment_method: mapPedidoPaymentMethod(pedido.pagamento),
          occurred_on: new Date().toISOString().slice(0, 10),
        }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
        });
      }
      toast.error("Pedido cancelado: estoque devolvido e estorno registrado no Caixa.");
    } else {
      toast.error("Pedido cancelado.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Loja online"
        title="Pedidos"
        description="Todo pedido aceito baixa o estoque e registra automaticamente no caixa da gestão."
      />

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200",
              filtro === f.valor
                ? "gradient-primary border-transparent text-primary-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-9 w-auto rounded-full border-border bg-card text-xs"
        />
      </div>

      <SectionCard bodyClassName="p-0">
        {visiveis.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-7 w-7" />}
            title={lista.length === 0 ? "Nenhum pedido ainda" : "Nenhum pedido encontrado"}
            description={
              lista.length === 0
                ? "Quando suas clientes fizerem pedidos pela vitrine, eles aparecerão aqui."
                : "Tente outro filtro de status ou data para ver os pedidos."
            }
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {visiveis.map((p) => (
              <li
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setAberto(p.id)}
                onKeyDown={(e) => e.key === "Enter" && setAberto(p.id)}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 py-4 transition-colors duration-200 hover:bg-secondary/50 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="num-display text-sm font-semibold">{p.numero}</span>
                    <StatusBadge status={p.status} />
                    <Tag tone={p.origem === "WhatsApp" ? "success" : "primary"}>{p.origem}</Tag>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{p.cliente}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateTimeBR(p.criadoEm)} · {p.entrega} · {p.pagamento}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num-display text-sm font-semibold">{brl(totalPedido(p))}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.itens.length} {p.itens.length === 1 ? "item" : "itens"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Sheet open={pedidoAberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        {pedidoAberto ? (
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-3">
                <span className="num-display">{pedidoAberto.numero}</span>
                <StatusBadge status={pedidoAberto.status} />
              </SheetTitle>
              <SheetDescription>
                {pedidoAberto.cliente} · {dateTimeBR(pedidoAberto.criadoEm)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              {/* Itens */}
              <SectionCard title="Itens do pedido" bodyClassName="p-3">
                <ul className="divide-y divide-border/70">
                  {pedidoAberto.itens.map((item, i) => (
                    <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Tam. {item.tamanho} · {item.cor} · Qtd. {item.qtd}
                        </p>
                      </div>
                      <p className="num-display font-semibold">{brl(item.preco * item.qtd)}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-1 border-t border-border/70 pt-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="num-display">
                      {brl(pedidoAberto.itens.reduce((a, i) => a + i.preco * i.qtd, 0))}
                    </span>
                  </div>
                  {pedidoAberto.frete > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frete</span>
                      <span className="num-display">+ {brl(pedidoAberto.frete)}</span>
                    </div>
                  )}
                  {pedidoAberto.desconto > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cupom {pedidoAberto.cupom}</span>
                      <span className="num-display text-success">
                        - {brl(pedidoAberto.desconto)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="num-display">{brl(totalPedido(pedidoAberto))}</span>
                  </div>
                </div>
              </SectionCard>

              {/* Entrega */}
              <SectionCard title="Entrega" bodyClassName="p-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p>{pedidoAberto.entrega}</p>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">{pedidoAberto.endereco}</p>
                  {pedidoAberto.rastreio ? (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2">
                      <span className="text-xs text-muted-foreground">Cód. rastreio</span>
                      <span className="num-display text-xs font-semibold">
                        {pedidoAberto.rastreio}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <Input
                        placeholder="Inserir código de rastreio"
                        className="h-10 rounded-xl text-xs"
                      />
                      <Button variant="outline" size="sm" className="h-9 w-full rounded-xl text-xs">
                        Salvar rastreio
                      </Button>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Avançar */}
              <div className="flex flex-col gap-2">
                {pedidoAberto.status !== "entregue" && pedidoAberto.status !== "cancelado" ? (
                  <Button
                    className="gradient-primary h-11 rounded-full shadow-glow"
                    onClick={() => {
                      avancarStatus(pedidoAberto);
                      setAberto(null);
                    }}
                  >
                    Marcar como "
                    {
                      statusPedidoLabel[
                        fluxoStatus[
                          fluxoStatus.indexOf(pedidoAberto.status as (typeof fluxoStatus)[number]) +
                            1
                        ] ?? pedidoAberto.status
                      ]
                    }
                    "
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => {
                    const nomeLoja = store?.name ?? "nossa loja";
                    const msg = `Olá ${pedidoAberto.cliente}! Aqui é ${nomeLoja}. Seu pedido ${pedidoAberto.numero} está ${statusPedidoLabel[pedidoAberto.status].toLowerCase()}. Qualquer dúvida estou aqui!`;
                    window.open(
                      `https://wa.me/${pedidoAberto.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
                      "_blank",
                    );
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Avisar no WhatsApp
                </Button>

                {pedidoAberto.status !== "cancelado" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-full text-danger hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="mr-2 h-4 w-4" /> Cancelar pedido
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar {pedidoAberto.numero}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O estoque dos itens será estornado e a entrada no caixa, estornada. Esta
                          ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger text-danger-foreground"
                          onClick={() => cancelar(pedidoAberto.id)}
                        >
                          Sim, cancelar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
