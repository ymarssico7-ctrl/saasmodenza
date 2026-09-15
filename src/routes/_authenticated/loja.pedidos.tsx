import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  MessageCircle,
  PackageSearch,
  Trash2,
  Truck,
  X,
  ExternalLink,
  RefreshCw,
  CreditCard,
  QrCode,
  CheckCircle2,
  Settings,
  Store,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { inventoryQuery } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

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
import { calculateOrderNet } from "@/lib/fees";
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
      { title: "Pedidos da loja — Vestui" },
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
  return `vestui_orders_${storeId}`;
}

function legacyPedidosKey(storeId: string) {
  return `vestuli_orders_${storeId}`;
}

type CustomerAddressObj = {
  rua?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  complemento?: string;
  cidade?: string;
};

function PedidosPage() {
  const { storeId, store } = useStore();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<StatusPedido | "todos">("todos");
  const [data, setData] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [pedidoConfirmarSemEstoque, setPedidoConfirmarSemEstoque] = useState<Pedido | null>(null);
  const [pedidoComPecaExcluida, setPedidoComPecaExcluida] = useState<{ pedido: Pedido; nomes: string[] } | null>(null);

  // Consulta reativa ao estoque da loja
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const inventoryItems = rawInventory as unknown as Array<{
    id: string;
    name: string;
    sizes: Record<string, number> | null;
  }>;

  // Consulta reativa aos pedidos gravados no Supabase
  const { data: dbOrders = [], refetch: recarregarPedidos } = useQuery({
    queryKey: ["orders", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erro ao buscar pedidos no Supabase:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!storeId,
  });

  // Supabase Realtime: escuta novos pedidos ou atualizações em tempo real
  useEffect(() => {
    if (!storeId) return;

    /** Som de notificação via Web Audio API (sem assets externos) */
    function playNotificationSound() {
      try {
        const ctx = new AudioContext();
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
        gainNode.connect(ctx.destination);
        [440, 554, 660].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.15);
        });
      } catch { /* Safari / permissão negada: ignora silenciosamente */ }
    }

    const channel = supabase
      .channel(`orders_realtime_${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });

          // Notificação apenas em novos pedidos (INSERT)
          if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            const numero = (row["numero"] as string | undefined) ?? "#--";
            const pagamento = (row["payment_method"] as string | undefined) ?? "";
            const metodosLabel: Record<string, string> = {
              pix: "Pix",
              cartao: "Cartão",
              dinheiro: "Dinheiro",
              boleto: "Boleto",
            };
            const metodoLabel = metodosLabel[pagamento] ?? pagamento;

            playNotificationSound();
            toast.success(`🛍️ Novo Pedido ${numero} recebido!`, {
              description: metodoLabel ? `Forma de pagamento: ${metodoLabel}` : "Acesse os pedidos para ver detalhes.",
              duration: 6000,
              action: {
                label: "Ver agora",
                onClick: () => setAberto(row["id"] as string),
              },
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Consulta o saldo atual de um produto e tamanho
  const getItemStock = (produtoId: string, tamanho: string): number | null => {
    const prod = inventoryItems.find((p) => p.id === produtoId);
    if (!prod || !prod.sizes) return null;
    return prod.sizes[tamanho] ?? 0;
  };

  // Mapeia os pedidos do Supabase e mescla com cache local se houver
  const lista = useMemo(() => {
    const doBanco: Pedido[] = dbOrders.map((row) => {
      const addr =
        typeof row.customer_address === "object" && row.customer_address
          ? (row.customer_address as CustomerAddressObj)
          : {};
      const enderecoFormatado =
        [
          addr.rua,
          addr.numero && `nº ${addr.numero}`,
          addr.bairro,
          addr.cep && `CEP ${addr.cep}`,
          addr.complemento,
        ]
          .filter(Boolean)
          .join(", ") ||
        (typeof row.customer_address === "string" ? row.customer_address : "");

      const itens = Array.isArray(row.items)
        ? (row.items as Array<{
            produtoId: string;
            nome: string;
            tamanho: string;
            cor: string;
            qtd: number;
            preco: number;
          }>)
        : [];

      const metodoPagamento =
        row.payment_method === "pix"
          ? "Pix"
          : row.payment_method === "cartao"
          ? "Cartão de crédito"
          : "Dinheiro na entrega";

      return {
        id: row.id,
        numero: row.numero || `#${row.id.slice(0, 6)}`,
        cliente: row.customer_name || "Cliente",
        telefone: row.customer_phone || "",
        email: row.customer_email || undefined,
        cidade: addr.bairro || "",
        criadoEm: row.created_at,
        status: (row.status || "novo") as StatusPedido,
        origem: "Checkout" as const,
        pagamento: metodoPagamento,
        entrega: row.frete_tipo || "Entrega",
        endereco: enderecoFormatado,
        rastreio: row.tracking_code || undefined,
        frete: Number(row.frete_valor || 0),
        desconto: Number(row.desconto || 0),
        cupom: row.cupom || undefined,
        taxaOperadora: Number(row.payment_fee || 0),
        valorLiquido: Number(
          row.net_amount ||
            Math.max(Number(row.total || 0) - Number(row.payment_fee || 0), 0),
        ),
        itens,
      };
    });

    if (!storeId) return doBanco;
    try {
      const stored =
        localStorage.getItem(pedidosKey(storeId)) ||
        localStorage.getItem(legacyPedidosKey(storeId));
      if (!stored) return doBanco;
      const locais = JSON.parse(stored) as Pedido[];
      const idsBanco = new Set(doBanco.map((p) => p.id));
      const apenasLocais = locais.filter((p) => !idsBanco.has(p.id));
      return [...doBanco, ...apenasLocais];
    } catch {
      return doBanco;
    }
  }, [dbOrders, storeId]);

  // Persiste cache local como fallback
  const persistir = (novaLista: Pedido[]) => {
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

  const executarAvancoStatus = async (pedido: Pedido) => {
    const atual = fluxoStatus.indexOf(pedido.status as (typeof fluxoStatus)[number]);
    if (atual < 0 || atual >= fluxoStatus.length - 1) return;
    const proximo = fluxoStatus[atual + 1]!;

    // 1) Atualiza no Supabase
    try {
      const payload: { status: StatusPedido; payment_status?: string } = {
        status: proximo,
      };
      if (proximo === "confirmado") {
        payload.payment_status = "pago";
      }
      await supabase
        .from("orders")
        .update(payload)
        .eq("id", pedido.id);
      void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
    } catch (err) {
      console.error("Erro ao atualizar status no Supabase:", err);
    }

    // 2) Cache local
    const novaLista = lista.map((p) =>
      p.id === pedido.id ? { ...p, status: proximo as StatusPedido } : p,
    );
    persistir(novaLista);

    // 3) Se novo -> confirmado: baixa estoque e lança no caixa
    if (pedido.status === "novo" && proximo === "confirmado") {
      if (pedido.itens?.length) {
        const deducoes = pedido.itens.map((item) =>
          adjustInventoryStock(storeId, item.produtoId, -item.qtd, item.tamanho),
        );
        void Promise.all(deducoes).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["inventory"] });
        });
      }

      const bruto = totalPedido(pedido);
      const { net: valorLiquido } = calculateOrderNet(bruto, pedido.pagamento);

      void insertTransaction({
        storeId,
        kind: "entrada",
        description: `Venda online — Pedido ${pedido.numero} (${pedido.cliente})`,
        amount: valorLiquido,
        category: "venda_online",
        payment_method: mapPedidoPaymentMethod(pedido.pagamento),
        occurred_on: new Date().toISOString().slice(0, 10),
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      });

      toast.success("Pedido confirmado! ✅", {
        description: `Estoque baixado e R$ ${valorLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} lançado no Caixa (líquido).`,
        duration: 5000,
      });
    } else {
      toast.success(`Status atualizado para "${statusPedidoLabel[proximo]}"`, {
        description: `Pedido ${pedido.numero} — ${pedido.cliente}`,
      });
    }
  };

  const tentarAvancarStatus = (pedido: Pedido) => {
    const atual = fluxoStatus.indexOf(pedido.status as (typeof fluxoStatus)[number]);
    const proximo = fluxoStatus[atual + 1];
    // Se for confirmação de pedido novo, valida requisitos
    if (pedido.status === "novo" && proximo === "confirmado" && pedido.itens?.length) {
      // 1) Verifica se algum produto foi excluído do catálogo de estoque
      const pecasExcluidas = pedido.itens
        .filter((it) => !inventoryItems.find((inv) => inv.id === it.produtoId))
        .map((it) => it.nome ?? it.produtoId);
      if (pecasExcluidas.length > 0) {
        setPedidoComPecaExcluida({ pedido, nomes: pecasExcluidas });
        return;
      }

      // 2) Verifica se há falta de estoque na grade
      const temFalta = pedido.itens.some((it) => {
        const st = getItemStock(it.produtoId, it.tamanho);
        return st !== null && st < it.qtd;
      });
      if (temFalta) {
        setPedidoConfirmarSemEstoque(pedido);
        return;
      }
    }
    void executarAvancoStatus(pedido);
    setAberto(null);
  };

  const cancelar = async (id: string) => {
    const pedido = lista.find((p) => p.id === id);
    if (!pedido) return;
    const statusAnterior = pedido.status;

    // 1) Atualiza no Supabase
    try {
      await supabase
        .from("orders")
        .update({
          status: "cancelado",
          payment_status: "cancelado",
        })
        .eq("id", id);
      void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
    } catch (err) {
      console.error("Erro ao cancelar no Supabase:", err);
    }

    // 2) Cache local
    const novaLista = lista.map((p) =>
      p.id === id ? { ...p, status: "cancelado" as StatusPedido } : p,
    );
    persistir(novaLista);
    setAberto(null);

    // 3) Se o pedido já havia baixado estoque, estorna
    if (statusAnterior !== "novo" && statusAnterior !== "cancelado") {
      if (pedido.itens?.length) {
        void restoreOrderStock(storeId, pedido.itens).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["inventory"] });
        });
      }
      const bruto = totalPedido(pedido);
      const { net: valorLiquido } = calculateOrderNet(bruto, pedido.pagamento);
      if (valorLiquido > 0) {
        void insertTransaction({
          storeId,
          kind: "saida",
          description: `Estorno de pedido online cancelado — Pedido ${pedido.numero} (${pedido.cliente})`,
          amount: valorLiquido,
          category: "estorno_devolucao",
          payment_method: mapPedidoPaymentMethod(pedido.pagamento),
          occurred_on: new Date().toISOString().slice(0, 10),
        }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
        });
      }
      toast.error(`Pedido ${pedido.numero} cancelado: estoque devolvido e estorno de ${brl(valorLiquido)} lançado no Caixa.`);
    } else {
      toast.info(`Pedido ${pedido.numero} cancelado sem impacto no caixa.`);
    }
  };

  const excluirPedido = async (id: string) => {
    const pedido = lista.find((p) => p.id === id);
    try {
      await supabase.from("orders").delete().eq("id", id);
      void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
    } catch (err) {
      console.error("Erro ao excluir do Supabase:", err);
    }
    const novaLista = lista.filter((p) => p.id !== id);
    persistir(novaLista);
    setAberto(null);
    toast.success("Pedido excluído do histórico", {
      description: pedido ? `Pedido ${pedido.numero} removido.` : undefined,
    });
  };

  const salvarRastreio = async (pedidoId: string) => {
    if (!codigoRastreio.trim()) {
      toast.error("Informe o código de rastreio.");
      return;
    }
    const cod = codigoRastreio.trim().toUpperCase();

    try {
      await supabase
        .from("orders")
        .update({ tracking_code: cod })
        .eq("id", pedidoId);
      void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
    } catch (err) {
      console.error("Erro ao salvar rastreio no Supabase:", err);
    }

    const novaLista = lista.map((p) =>
      p.id === pedidoId ? { ...p, rastreio: cod } : p,
    );
    persistir(novaLista);
    setCodigoRastreio("");
    toast.success("Código de rastreio salvo!", {
      description: `Código: ${cod}`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas da Loja"
        title="Pedidos da Vitrine & Insta"
        description="Todo pedido confirmado baixa o estoque automaticamente e registra a entrada no seu caixa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void recarregarPedidos();
                toast.success("Pedidos atualizados em tempo real!");
              }}
              className="h-10 rounded-full border-border bg-card text-xs font-semibold"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Sincronizar
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 rounded-full border-border bg-card text-xs font-semibold"
            >
              <Link to="/loja/produtos">
                <Store className="mr-2 h-3.5 w-3.5 text-primary" /> Catálogo da Vitrine
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 rounded-full border-border bg-card text-xs font-semibold"
            >
              <Link to="/loja/configuracao">
                <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Configurar Vitrine
              </Link>
            </Button>
          </div>
        }
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
                onClick={() => { setAberto(p.id); setCodigoRastreio(""); }}
                onKeyDown={(e) => e.key === "Enter" && (setAberto(p.id), setCodigoRastreio(""))}
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
                  {pedidoAberto.itens.map((item, i) => {
                    const currentStock = getItemStock(item.produtoId, item.tamanho);
                    return (
                      <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium truncate">{item.nome}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              Tam. {item.tamanho} · {item.cor} · Qtd. {item.qtd}
                            </p>
                            {currentStock !== null && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  currentStock >= item.qtd
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : currentStock > 0
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold"
                                }`}
                              >
                                {currentStock >= item.qtd
                                  ? `✓ ${currentStock} un. em estoque`
                                  : currentStock > 0
                                  ? `⚠️ Apenas ${currentStock} un. em estoque`
                                  : "❌ Esgotado na grade"}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="num-display font-semibold shrink-0">{brl(item.preco * item.qtd)}</p>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex flex-col gap-1.5 border-t border-border/70 pt-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal das peças</span>
                    <span className="num-display">
                      {brl(pedidoAberto.itens.reduce((a, i) => a + i.preco * i.qtd, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete ({pedidoAberto.entrega})</span>
                    <span className="num-display">
                      {pedidoAberto.frete > 0 ? `+ ${brl(pedidoAberto.frete)}` : "Grátis"}
                    </span>
                  </div>
                  {pedidoAberto.desconto > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cupom {pedidoAberto.cupom}</span>
                      <span className="num-display text-success">
                        − {brl(pedidoAberto.desconto)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold border-t border-border/40 pt-1.5">
                    <span>Total pago pela cliente</span>
                    <span className="num-display font-bold">{brl(totalPedido(pedidoAberto))}</span>
                  </div>

                  {/* Extrato contábil transparente */}
                  <div className="mt-2 rounded-xl border border-border/80 bg-secondary/40 p-3 space-y-1 text-xs">
                    <p className="font-semibold text-foreground">Extrato líquido da venda</p>
                    {pedidoAberto.taxaOperadora !== undefined && pedidoAberto.taxaOperadora > 0 ? (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxa operadora de cartão (3,5%)</span>
                          <span className="text-destructive font-medium">− {brl(pedidoAberto.taxaOperadora)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-2 mt-1">
                          <span>Líquido a receber na conta</span>
                          <span>{brl(pedidoAberto.valorLiquido ?? Math.max(totalPedido(pedidoAberto) - pedidoAberto.taxaOperadora, 0))}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          A taxa é descontada da venda pela operadora de cartão. Custo Vestui: R$ 0,00.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxa de processamento ({pedidoAberto.pagamento})</span>
                          <span className="text-emerald-600 font-medium">R$ 0,00 (Grátis)</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-2 mt-1">
                          <span>Líquido a receber na conta</span>
                          <span>{brl(totalPedido(pedidoAberto))}</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-0.5">
                          ✓ Venda direta com 100% do valor limpo para sua loja.
                        </p>
                      </>
                    )}
                    <div className="pt-2 border-t border-border/60 flex justify-end">
                      <Link
                        to="/loja/recebimentos"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Ver liquidação no Vestui Pay →
                      </Link>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Entrega & Rastreio */}
              <SectionCard title="Entrega" bodyClassName="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="font-medium">{pedidoAberto.entrega}</p>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground leading-relaxed">{pedidoAberto.endereco}</p>

                  {pedidoAberto.rastreio ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                        <span className="text-xs text-muted-foreground">Cód. rastreio</span>
                        <span className="num-display text-xs font-bold font-mono text-primary">
                          {pedidoAberto.rastreio}
                        </span>
                      </div>
                      {pedidoAberto.telefone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full rounded-xl text-xs font-semibold text-green-700 border-green-200 bg-green-50 hover:bg-green-100 flex items-center justify-center gap-1.5"
                          onClick={() => {
                            const phoneDigits = pedidoAberto.telefone.replace(/\D/g, "");
                            const phone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
                            const msg = `Olá, ${pedidoAberto.cliente}! 👋\n\nSeu pedido *${pedidoAberto.numero}* foi enviado! 📦\n\nCódigo de rastreamento: *${pedidoAberto.rastreio}*\n\nAcompanhe nos Correios:\nhttps://rastreamento.correios.com.br/app/index.php?codigo=${pedidoAberto.rastreio}`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Avisar rastreio no WhatsApp da cliente
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1.5">
                      <Input
                        placeholder="Inserir código de rastreio (ex: BR849201773BR)"
                        value={codigoRastreio}
                        onChange={(e) => setCodigoRastreio(e.target.value)}
                        className="h-10 rounded-xl text-xs font-mono uppercase"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full rounded-xl text-xs font-semibold"
                        onClick={() => void salvarRastreio(pedidoAberto.id)}
                      >
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
                    className="gradient-primary h-11 rounded-full shadow-glow cursor-pointer"
                    onClick={() => tentarAvancarStatus(pedidoAberto)}
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
                    const rastreioInfo = pedidoAberto.rastreio
                      ? ` Código de rastreio: ${pedidoAberto.rastreio}.`
                      : "";
                    const msg = `Olá, ${pedidoAberto.cliente}! Aqui é da ${nomeLoja}. Seu pedido ${pedidoAberto.numero} está ${statusPedidoLabel[pedidoAberto.status].toLowerCase()}.${rastreioInfo} Qualquer dúvida estamos à disposição! 💜`;
                    const digits = (pedidoAberto.telefone || "").replace(/\D/g, "");
                    const encoded = encodeURIComponent(msg);
                    if (digits.length >= 8) {
                      const phone = digits.startsWith("55") ? digits : `55${digits}`;
                      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank", "noopener,noreferrer");
                    } else {
                      window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Avisar no WhatsApp
                </Button>

                {pedidoAberto.status !== "cancelado" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-full text-danger hover:bg-danger-soft hover:text-danger cursor-pointer"
                      >
                        <X className="mr-2 h-4 w-4" /> Cancelar pedido
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar pedido {pedidoAberto.numero}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {pedidoAberto.status === "novo" ? (
                            "Este pedido ainda não foi confirmado, portanto não alterou seu estoque nem registrou entradas no caixa. Ele será marcado como cancelado sem nenhum impacto financeiro."
                          ) : (
                            <>
                              Como este pedido já foi confirmado, o estoque dos itens será devolvido à grade e o valor de{" "}
                              <strong className="font-semibold text-foreground">{brl(totalPedido(pedidoAberto))}</strong> será registrado como estorno no Caixa.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger text-danger-foreground hover:bg-danger/90"
                          onClick={() => cancelar(pedidoAberto.id)}
                        >
                          Sim, cancelar pedido
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir pedido cancelado
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pedido {pedidoAberto.numero}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este pedido já está cancelado e será removido permanentemente do seu histórico.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => excluirPedido(pedidoAberto.id)}
                        >
                          Sim, excluir do histórico
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      {/* ── Diálogo Guardrail de Confirmação com Estoque Insuficiente ────────── */}
      <AlertDialog
        open={pedidoConfirmarSemEstoque !== null}
        onOpenChange={(o) => !o && setPedidoConfirmarSemEstoque(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-display text-base">
              <span>⚠️ Atenção ao estoque da peça</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  Um ou mais itens do pedido <strong>{pedidoConfirmarSemEstoque?.numero}</strong> estão com saldo insuficiente no estoque físico da loja:
                </p>
                <ul className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1.5 text-foreground">
                  {pedidoConfirmarSemEstoque?.itens.map((it, idx) => {
                    const st = getItemStock(it.produtoId, it.tamanho);
                    const isShortage = st !== null && st < it.qtd;
                    return (
                      <li key={idx} className="flex justify-between items-center gap-2">
                        <span className="truncate">{it.nome} (Tam. {it.tamanho} • {it.qtd} un.)</span>
                        <span className={isShortage ? "text-rose-600 dark:text-rose-400 font-semibold shrink-0" : "text-muted-foreground shrink-0"}>
                          {st === null ? "—" : st <= 0 ? "Esgotado (0 un.)" : `${st} un. em estoque`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs">
                  Deseja confirmar o pedido e registrar a entrada de <strong>{pedidoConfirmarSemEstoque ? brl(totalPedido(pedidoConfirmarSemEstoque)) : ""}</strong> no Caixa mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full">Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer"
              onClick={() => {
                if (pedidoConfirmarSemEstoque) {
                  executarAvancoStatus(pedidoConfirmarSemEstoque);
                  setPedidoConfirmarSemEstoque(null);
                  setAberto(null);
                }
              }}
            >
              Confirmar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Diálogo Guardrail de Peças Excluídas do Catálogo ──────────────── */}
      <AlertDialog
        open={pedidoComPecaExcluida !== null}
        onOpenChange={(o) => !o && setPedidoComPecaExcluida(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-display text-base">
              <span>⚠️ Peças removidas do catálogo</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  As seguintes peças do pedido <strong>{pedidoComPecaExcluida?.pedido.numero}</strong> foram
                  removidas do estoque e não existem mais no catálogo:
                </p>
                <ul className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1.5 text-foreground">
                  {pedidoComPecaExcluida?.nomes.map((nome, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-destructive">✕</span>
                      <span>{nome}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs">
                  A baixa de estoque dessas peças será ignorada. O valor do pedido será lançado normalmente no Caixa.
                  Deseja confirmar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full">Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
              onClick={() => {
                if (pedidoComPecaExcluida) {
                  executarAvancoStatus(pedidoComPecaExcluida.pedido);
                  setPedidoComPecaExcluida(null);
                  setAberto(null);
                }
              }}
            >
              Confirmar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
