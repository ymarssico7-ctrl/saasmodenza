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
  Search,
  Copy,
  Plus,
  Clock,
  ArrowUpRight,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  UserRound,
  Phone,
  MapPin,
  Receipt,
  Layers,
  ShoppingBag,
  Globe,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { inventoryQuery } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

import { PageHeader } from "@/components/loja/page-header";
import { StatusBadge, Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { notifySimOrdersChanged } from "@/lib/sim-orders";
import { brl, brlCompact } from "@/lib/format";
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
      { title: "Pedidos & Vendas Online — Modaly" },
      {
        name: "description",
        content:
          "Central de pedidos da vitrine online e WhatsApp: aprove pedidos, baixe estoque automaticamente e acompanhe entregas com padrão Shopify.",
      },
    ],
  }),
  component: PedidosPage,
});

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

const ABAS_STATUS: { valor: StatusPedido | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "novo", label: "A Confirmar" },
  { valor: "confirmado", label: "Confirmados" },
  { valor: "em_separacao", label: "Em Separação" },
  { valor: "enviado", label: "A Caminho" },
  { valor: "entregue", label: "Entregues" },
  { valor: "cancelado", label: "Cancelados" },
];

function formatOrderDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const hoje = new Date();
    const isHoje = d.toDateString() === hoje.toDateString();
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (isHoje) return `Hoje às ${hora}`;
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return `Ontem às ${hora}`;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function OrderStatusStepper({ status }: { status: StatusPedido }) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive font-medium">
        <X className="size-4 shrink-0" />
        <span>Este pedido foi cancelado e não gerou movimentação financeira ativa ou teve estoque estornado.</span>
      </div>
    );
  }

  const steps: { key: StatusPedido; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "novo", label: "Recebido", icon: Clock },
    { key: "confirmado", label: "Confirmado", icon: CheckCircle2 },
    { key: "em_separacao", label: "Separação", icon: Layers },
    { key: "enviado", label: "A caminho", icon: Truck },
    { key: "entregue", label: "Entregue", icon: Check },
  ];

  const orderFlow: StatusPedido[] = ["novo", "confirmado", "em_separacao", "enviado", "entregue"];
  const currentIndex = orderFlow.indexOf(status);

  return (
    <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Linha do tempo da entrega
      </p>
      <div className="relative flex items-center justify-between">
        {/* Linha de fundo cinza */}
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-border -translate-y-1/2 z-0" />
        {/* Linha de progresso ativa */}
        <div
          className="absolute left-4 top-4 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
          style={{
            width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : "0%",
            maxWidth: "calc(100% - 32px)",
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = currentIndex > idx || status === "entregue";
          const isCurrent = currentIndex === idx;
          const IconComponent = step.icon;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-all duration-200 text-xs",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-glow scale-110"
                    : isCompleted
                    ? "border-primary bg-primary/20 text-primary font-bold"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <IconComponent className="size-3.5" />
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10.5px] font-medium whitespace-nowrap",
                  isCurrent
                    ? "text-primary font-bold"
                    : isCompleted
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isPedidoSimulado(p: Pedido | null | undefined): boolean {
  if (!p) return false;
  return (
    Boolean(p.isSimulacao) ||
    p.id.startsWith("demo_") ||
    p.id.startsWith("teste_") ||
    p.cliente.toLowerCase().includes("demonstração") ||
    p.cliente.toLowerCase().includes("demonstracao")
  );
}

function PedidosPage() {
  const { storeId, store } = useStore();
  const queryClient = useQueryClient();

  // Estados de Filtros e Busca (Padrão Shopify IndexTable)
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "hoje" | "7dias" | "mes" | "data_custom">("todos");
  const [filtroData, setFiltroData] = useState("");

  const [aberto, setAberto] = useState<string | null>(null);
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [versaoLocal, setVersaoLocal] = useState(0);
  const POR_PAGINA = 10;
  const [pedidoConfirmarSemEstoque, setPedidoConfirmarSemEstoque] = useState<Pedido | null>(null);
  const [pedidoComPecaExcluida, setPedidoComPecaExcluida] = useState<{ pedido: Pedido; nomes: string[] } | null>(null);

  // Consulta reativa ao estoque da loja
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const inventoryItems = rawInventory as unknown as Array<{
    id: string;
    name: string;
    photo_url?: string | null;
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
      } catch {
        /* Safari / permissão negada: ignora silenciosamente */
      }
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
              description: metodoLabel ? `Forma de pagamento: ${metodoLabel}` : "Acesse os pedidos para conferir.",
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

  const getItemStock = (produtoId: string, tamanho: string): number | null => {
    const prod = inventoryItems.find((p) => p.id === produtoId);
    if (!prod || !prod.sizes) return null;
    return prod.sizes[tamanho] ?? 0;
  };

  const getProductPhoto = (produtoId: string): string | null => {
    const prod = inventoryItems.find((p) => p.id === produtoId);
    return prod?.photo_url ?? null;
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
  }, [dbOrders, storeId, versaoLocal]);

  const persistir = (novaLista: Pedido[]) => {
    localStorage.setItem(pedidosKey(storeId), JSON.stringify(novaLista));
    notifySimOrdersChanged();
    setVersaoLocal((v) => v + 1);
  };

  // KPIs Dinâmicos de Alto Nível (Shopify Cockpit Operacional)
  const novosCount = useMemo(() => lista.filter((p) => p.status === "novo").length, [lista]);
  const separacaoCount = useMemo(
    () => lista.filter((p) => p.status === "confirmado" || p.status === "em_separacao").length,
    [lista],
  );
  const enviadosCount = useMemo(() => lista.filter((p) => p.status === "enviado").length, [lista]);

  // Filtros aplicados de busca e status
  const visiveis = useMemo(() => {
    return lista.filter((p) => {
      // 1. Filtro por status de aba
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;

      // 2. Filtro por método de pagamento
      if (filtroPagamento !== "todos") {
        const pag = p.pagamento.toLowerCase();
        if (filtroPagamento === "pix" && !pag.includes("pix")) return false;
        if (filtroPagamento === "cartao" && !pag.includes("cartão") && !pag.includes("cartao") && !pag.includes("crédito"))
          return false;
        if (filtroPagamento === "dinheiro" && !pag.includes("dinheiro")) return false;
      }

      // 3. Filtro por período
      if (filtroPeriodo === "hoje") {
        const hojeStr = new Date().toISOString().slice(0, 10);
        if (p.criadoEm.slice(0, 10) !== hojeStr) return false;
      } else if (filtroPeriodo === "7dias") {
        const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        if (p.criadoEm.slice(0, 10) < seteDiasAtras) return false;
      } else if (filtroPeriodo === "mes") {
        const mesAtual = new Date().toISOString().slice(0, 7);
        if (p.criadoEm.slice(0, 7) !== mesAtual) return false;
      } else if (filtroPeriodo === "data_custom" && filtroData) {
        if (p.criadoEm.slice(0, 10) !== filtroData) return false;
      }

      // 4. Busca textual universal (nome, telefone, número do pedido ou item)
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateNome = p.cliente.toLowerCase().includes(termo);
        const bateNumero = p.numero.toLowerCase().includes(termo);
        const bateTelefone = p.telefone.replace(/\D/g, "").includes(termo.replace(/\D/g, ""));
        const bateItem = p.itens.some((it) => it.nome.toLowerCase().includes(termo));
        if (!bateNome && !bateNumero && !bateTelefone && !bateItem) return false;
      }

      return true;
    });
  }, [lista, filtroStatus, filtroPagamento, filtroPeriodo, filtroData, busca]);

  // Paginação: voltar para página 1 ao alterar qualquer filtro
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroStatus, filtroPagamento, filtroPeriodo, filtroData, busca]);

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaFinal = Math.min(paginaAtual, totalPaginas);
  const visivelsPagina = visiveis.slice((paginaFinal - 1) * POR_PAGINA, paginaFinal * POR_PAGINA);

  const pedidoAberto = lista.find((p) => p.id === aberto) ?? null;

  // Ações de fluxo e avanço de status
  const executarAvancoStatus = async (pedido: Pedido) => {
    const atual = fluxoStatus.indexOf(pedido.status as (typeof fluxoStatus)[number]);
    if (atual < 0 || atual >= fluxoStatus.length - 1) return;
    const proximo = fluxoStatus[atual + 1]!;

    const isSimulacao = isPedidoSimulado(pedido);

    if (!isSimulacao) {
      try {
        const payload: { status: StatusPedido; payment_status?: string } = {
          status: proximo,
        };
        if (proximo === "confirmado") {
          payload.payment_status = "pago";
        }
        await supabase.from("orders").update(payload).eq("id", pedido.id);
        void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
      } catch (err) {
        console.error("Erro ao atualizar status no Supabase:", err);
      }
    }

    const novaLista = lista.map((p) => (p.id === pedido.id ? { ...p, status: proximo as StatusPedido } : p));
    persistir(novaLista);

    if (pedido.status === "novo" && proximo === "confirmado") {
      if (isSimulacao) {
        toast.success("🧪 [Simulação] Pedido aprovado!", {
          description: "Fluxo simulado: em uma venda real, a peça seria baixada e o valor lançado no Caixa.",
          duration: 5000,
        });
        return;
      }

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
      toast.success(
        isSimulacao
          ? `🧪 [Simulação] Status avançado para "${statusPedidoLabel[proximo]}"`
          : `Status atualizado para "${statusPedidoLabel[proximo]}"`,
        {
          description: `Pedido ${pedido.numero} — ${pedido.cliente}`,
        },
      );
    }
  };

  const tentarAvancarStatus = (pedido: Pedido) => {
    // 🧪 Modo Simulação: avanço 100% livre sem travar em estoque do BD
    if (isPedidoSimulado(pedido)) {
      void executarAvancoStatus(pedido);
      setAberto(null);
      return;
    }

    const atual = fluxoStatus.indexOf(pedido.status as (typeof fluxoStatus)[number]);
    const proximo = fluxoStatus[atual + 1];
    if (pedido.status === "novo" && proximo === "confirmado" && pedido.itens?.length) {
      const pecasExcluidas = pedido.itens
        .filter((it) => !inventoryItems.find((inv) => inv.id === it.produtoId))
        .map((it) => it.nome ?? it.produtoId);
      if (pecasExcluidas.length > 0) {
        setPedidoComPecaExcluida({ pedido, nomes: pecasExcluidas });
        return;
      }

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
    const isSimulacao = isPedidoSimulado(pedido);

    if (!isSimulacao) {
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
    }

    const novaLista = lista.map((p) => (p.id === id ? { ...p, status: "cancelado" as StatusPedido } : p));
    persistir(novaLista);
    setAberto(null);

    if (isSimulacao) {
      toast.info(`🧪 [Simulação] Pedido ${pedido.numero} cancelado (sem impacto no banco).`);
      return;
    }

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
    const isSimulacao = isPedidoSimulado(pedido);

    if (!isSimulacao) {
      try {
        await supabase.from("orders").delete().eq("id", id);
        void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
      } catch (err) {
        console.error("Erro ao excluir do Supabase:", err);
      }
    }
    const novaLista = lista.filter((p) => p.id !== id);
    persistir(novaLista);
    setAberto(null);
    toast.success("Pedido excluído do histórico", {
      description: pedido ? `Pedido ${pedido.numero} removido instantaneamente.` : undefined,
    });
  };

  const salvarRastreio = async (pedidoId: string) => {
    if (!codigoRastreio.trim()) {
      toast.error("Informe o código de rastreio.");
      return;
    }
    const cod = codigoRastreio.trim().toUpperCase();
    const pedido = lista.find((p) => p.id === pedidoId);
    const isSimulacao = isPedidoSimulado(pedido);

    if (!isSimulacao) {
      try {
        await supabase.from("orders").update({ tracking_code: cod }).eq("id", pedidoId);
        void queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
      } catch (err) {
        console.error("Erro ao salvar rastreio no Supabase:", err);
      }
    }

    const novaLista = lista.map((p) => (p.id === pedidoId ? { ...p, rastreio: cod } : p));
    persistir(novaLista);
    setCodigoRastreio("");
    toast.success("Código de rastreio salvo!", { description: `Código: ${cod}` });
  };

  const avisarWhatsApp = (pedido: Pedido, tipo?: "padrao" | "rastreio") => {
    const nomeLoja = store?.name ?? "nossa loja";
    const statusTexto = statusPedidoLabel[pedido.status].toLowerCase();
    let msg = "";

    if (tipo === "rastreio" && pedido.rastreio) {
      msg = `Olá, ${pedido.cliente}! 👋\n\nSeu pedido *${pedido.numero}* na *${nomeLoja}* já foi despachado e está a caminho! 📦💨\n\nCódigo de rastreamento: *${pedido.rastreio}*\n\nAcompanhe nos Correios:\nhttps://rastreamento.correios.com.br/app/index.php?codigo=${pedido.rastreio}\n\nQualquer dúvida estamos à disposição! 💜`;
    } else {
      msg = `Olá, ${pedido.cliente}! 👋\n\nAqui é da *${nomeLoja}*. Passando para avisar que seu pedido *${pedido.numero}* está *${statusTexto}*! ✨\n\nTotal: ${brl(totalPedido(pedido))}\n${pedido.rastreio ? `Rastreio: ${pedido.rastreio}\n` : ""}Qualquer dúvida estamos à disposição! 💜`;
    }

    const phoneDigits = (pedido.telefone || "").replace(/\D/g, "");
    const encoded = encodeURIComponent(msg);
    if (phoneDigits.length >= 8) {
      const phone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank", "noopener,noreferrer");
    }
  };

  const copiarEnderecoEtiqueta = (p: Pedido) => {
    const texto = `DESTINATÁRIO:\n${p.cliente}\n${p.endereco}\nTel: ${p.telefone}`;
    navigator.clipboard.writeText(texto);
    toast.success("Endereço copiado para etiqueta!", {
      description: "Pronto para colar nos Correios ou Melhor Envio.",
    });
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    await recarregarPedidos();
    setTimeout(() => setSincronizando(false), 500);
    toast.success("Pedidos sincronizados em tempo real!");
  };

  // Simular Pedido de Teste (Onboarding / Demonstração)
  const gerarPedidoTeste = () => {
    const numero = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const itemExemplo = inventoryItems[0]
      ? {
          produtoId: inventoryItems[0].id,
          nome: inventoryItems[0].name,
          tamanho: Object.keys(inventoryItems[0].sizes || {})[0] || "M",
          cor: "Padrão",
          qtd: 1,
          preco: 189.9,
        }
      : {
          produtoId: "demo-item",
          nome: "Vestido Midi Floral",
          tamanho: "M",
          cor: "Estampa Exclusiva",
          qtd: 1,
          preco: 229.9,
        };

    const novoPedido: Pedido = {
      id: `demo_${Date.now()}`,
      numero,
      cliente: "Mariana Alvarenga",
      telefone: "(31) 99876-5432",
      email: "mariana.alvarenga@email.com",
      cidade: "Belo Horizonte",
      criadoEm: new Date().toISOString(),
      status: "novo",
      origem: "Checkout",
      pagamento: "Pix",
      entrega: "Entrega expressa",
      endereco: "Rua Fernandes Tourinho, 480 — Savassi, Belo Horizonte/MG, CEP 30112-000",
      frete: 14.0,
      desconto: 0,
      taxaOperadora: 0,
      valorLiquido: itemExemplo.preco * itemExemplo.qtd + 14.0,
      itens: [itemExemplo],
      isSimulacao: true,
    };

    const novaLista = [novoPedido, ...lista];
    persistir(novaLista);
    toast.success(`Pedido de teste ${numero} criado! 🎉`, {
      description: "Clique sobre ele na lista para testar a aprovação, baixa de estoque e o aviso WhatsApp.",
    });
  };

  const vitrineUrl = store?.slug ? `https://${store.slug}.modaly.com.br` : "/vitrine";

  return (
    <div className="space-y-4">
      {/* ── PageHeader Calmo (Apple / Linear Standard) ─────────────────────────── */}
      <PageHeader
        eyebrow="Vendas Online"
        title="Pedidos"
        description="Acompanhe e despache os pedidos da sua vitrine online e WhatsApp com tranquilidade."
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 sm:h-9.5 rounded-full border-border/80 bg-card px-3.5 text-xs font-medium hover:bg-secondary text-foreground shadow-2xs transition-all"
            >
              <a href={vitrineUrl} target="_blank" rel="noreferrer">
                <Globe className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                <span>Ver Vitrine</span>
                <ExternalLink className="ml-1 h-3 w-3 opacity-40" />
              </a>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 sm:h-9.5 w-9 sm:w-9.5 rounded-full border-border/80 bg-card p-0 text-xs font-semibold hover:bg-secondary text-foreground shadow-2xs cursor-pointer"
                  title="Mais opções e ações"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Mais opções</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-lifted">
                <DropdownMenuItem
                  onClick={handleSincronizar}
                  className="cursor-pointer rounded-xl text-xs py-2"
                >
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", sincronizando && "animate-spin text-primary")} />
                  <span>Sincronizar pedidos</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs py-2">
                  <Link to="/loja/produtos">
                    <Store className="mr-2 h-3.5 w-3.5 text-primary" />
                    <span>Gerenciar catálogo</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs py-2">
                  <Link to="/loja/configuracao">
                    <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Configurações da loja</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={gerarPedidoTeste}
                  className="cursor-pointer rounded-xl text-xs py-2 text-primary focus:text-primary font-medium"
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  <span>Simular pedido de teste</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ── Container de Gestão Calmo: Abas + Busca + Tabela de Pedidos ───────── */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        {/* Abas Superiores Segmentadas (Apple / Linear Standard com Micro-Pílulas) */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 sm:p-2.5 border-b border-border/70 bg-secondary/15">
          {ABAS_STATUS.map((tab, idx) => {
            const active = filtroStatus === tab.valor;
            const count =
              tab.valor === "todos"
                ? lista.length
                : lista.filter((p) => p.status === tab.valor).length;
            const isSeparation = idx === 5; // antes de "Entregues"

            return (
              <div key={tab.valor} className="flex items-center shrink-0">
                {isSeparation && (
                  <div className="h-4 w-px bg-border/60 mx-1.5 hidden sm:block shrink-0" />
                )}
                <button
                  onClick={() => setFiltroStatus(tab.valor)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                    active
                      ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10.5px] num-display transition-colors",
                      count > 0 && tab.valor === "novo"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold"
                        : count > 0
                        ? "bg-primary/10 text-primary font-bold"
                        : "bg-secondary/70 text-muted-foreground/60 font-medium",
                    )}
                  >
                    {count}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Barra de Filtros Integrada (Alinhamento em Linha Única) */}
        <div className="p-3 sm:p-3.5 border-b border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Buscar por cliente, pedido (#1042) ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 sm:h-9.5 pl-9 pr-8 text-xs rounded-xl bg-secondary/30 border-border/70 hover:border-border focus:bg-background transition-all w-full"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filtro de Pagamento */}
            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger className="h-9 sm:h-9.5 min-w-[165px] w-auto px-3.5 text-xs rounded-xl bg-secondary/30 border-border/70 hover:border-border shrink-0">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lifted">
                <SelectItem value="todos">Todos pagamentos</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao">Cartão de crédito</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Período */}
            <Select
              value={filtroPeriodo}
              onValueChange={(val: "todos" | "hoje" | "7dias" | "mes" | "data_custom") => {
                setFiltroPeriodo(val);
                if (val !== "data_custom") setFiltroData("");
              }}
            >
              <SelectTrigger className="h-9 sm:h-9.5 min-w-[160px] w-auto px-3.5 text-xs rounded-xl bg-secondary/30 border-border/70 hover:border-border shrink-0">
                <CalendarDays className="size-3.5 mr-1.5 text-muted-foreground/60 shrink-0" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lifted">
                <SelectItem value="todos">Todo o período</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="data_custom">Data específica...</SelectItem>
              </SelectContent>
            </Select>

            {/* Input de Data Personalizada */}
            {filtroPeriodo === "data_custom" && (
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="h-9 sm:h-9.5 w-auto text-xs rounded-xl bg-secondary/30 border-border/70 shrink-0 animate-in fade-in zoom-in-95 duration-150"
                title="Escolha a data do pedido"
              />
            )}

            {/* Limpar filtros se houver algum ativo */}
            {(busca ||
              filtroPagamento !== "todos" ||
              filtroPeriodo !== "todos" ||
              filtroStatus !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBusca("");
                  setFiltroPagamento("todos");
                  setFiltroPeriodo("todos");
                  setFiltroData("");
                  setFiltroStatus("todos");
                }}
                className="h-9 sm:h-9.5 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl shrink-0"
              >
                <X className="size-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabela de Pedidos / Empty State Zen ───────────────────────────── */}
        {visiveis.length === 0 ? (
          <div className="py-12 px-4 sm:py-16 sm:px-6 text-center">
            {lista.length === 0 ? (
              <div className="max-w-sm mx-auto space-y-4">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground/80">
                  <PackageSearch className="size-6 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Tudo em dia por aqui</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sua vitrine está ativa. Novos pedidos feitos no site ou WhatsApp aparecerão aqui para você despachar.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(vitrineUrl);
                      toast.success("Link da vitrine copiado!", {
                        description: "Cole no seu Instagram ou envie pelo WhatsApp.",
                      });
                    }}
                    className="h-9 rounded-full border-border/80 bg-card text-xs font-medium hover:bg-secondary text-foreground shadow-2xs"
                  >
                    <Copy className="mr-1.5 size-3.5 opacity-60" /> Copiar link da vitrine
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={gerarPedidoTeste}
                    className="h-9 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="mr-1.5 size-3.5 text-primary" /> Simular pedido
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-sm mx-auto space-y-3">
                <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground/80">
                  <Filter className="size-5 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Nenhum pedido encontrado</h3>
                <p className="text-xs text-muted-foreground">
                  Tente alterar os filtros selecionados ou a busca textual.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBusca("");
                    setFiltroPagamento("todos");
                    setFiltroPeriodo("todos");
                    setFiltroData("");
                    setFiltroStatus("todos");
                  }}
                  className="rounded-full text-xs h-8"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* ── IndexTable Header (Shopify Polaris 6-Colunas — Alinhamento Sub-pixel) ── */}
            <div className="hidden md:grid md:grid-cols-[135px_1.4fr_1.2fr_1.1fr_110px_56px] items-center gap-4 px-5 py-2.5 border-b border-border/50 bg-secondary/15 text-[11px] font-medium text-muted-foreground/70 tracking-wide">
              <span>Pedido</span>
              <span>Cliente</span>
              <span>Itens</span>
              <span>Pagamento</span>
              <span className="text-right">Total</span>
              <span className="sr-only">Ações</span>
            </div>

            <ul className="divide-y divide-border/60">
              {visivelsPagina.map((p) => {
                const primeiraFoto = p.itens[0]?.produtoId ? getProductPhoto(p.itens[0].produtoId) : null;
                const totalQtd = p.itens.reduce((acc, it) => acc + it.qtd, 0);
                const nomeClienteLimpo = p.cliente.replace(/\s*\(Demonstração\)/gi, "").trim();

                return (
                  <li
                    key={p.id}
                    onClick={() => {
                      setAberto(p.id);
                      setCodigoRastreio("");
                    }}
                    className="group relative grid grid-cols-1 md:grid-cols-[135px_1.4fr_1.2fr_1.1fr_110px_56px] items-start md:items-center gap-3 md:gap-4 p-3.5 sm:px-5 transition-all duration-150 hover:bg-surface-muted/60 cursor-pointer"
                  >
                    {/* Col 1: Pedido (Miniatura + Número + Badge Status) */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {primeiraFoto ? (
                        <img
                          src={primeiraFoto}
                          alt={p.itens[0]?.nome ?? "Produto"}
                          loading="lazy"
                          className="aspect-square size-10 shrink-0 rounded-xl object-cover border border-border/80 shadow-2xs"
                        />
                      ) : (
                        <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground border border-border/70">
                          <ShoppingBag className="size-4 stroke-[1.6]" />
                        </div>
                      )}

                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="num-display text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {p.numero}
                          </span>
                          {isPedidoSimulado(p) && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              🧪 Simulação
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Cliente (Nome + Data / Origem) */}
                    <div className="min-w-0 pl-[3.25rem] md:pl-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {nomeClienteLimpo}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                        <span>{formatOrderDate(p.criadoEm)}</span>
                        <span>•</span>
                        <span>{p.origem === "WhatsApp" ? "WhatsApp" : "Vitrine"}</span>
                      </p>
                    </div>

                    {/* Col 3: Peças & Composição */}
                    <div className="min-w-0 pl-[3.25rem] md:pl-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {p.itens[0] ? `${p.itens[0].qtd}x ${p.itens[0].nome}` : "Nenhum item"}
                        {p.itens.length > 1
                          ? ` +${p.itens.length - 1} ${p.itens.length === 2 ? "outro" : "outros"}`
                          : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {p.itens[0]?.tamanho ? `Tam: ${p.itens[0].tamanho}` : ""}
                        {p.itens[0]?.tamanho && p.itens[0]?.cor ? " • " : ""}
                        {p.itens[0]?.cor ? `Cor: ${p.itens[0].cor}` : ""}
                        {` • ${totalQtd} ${totalQtd === 1 ? "peça" : "peças"}`}
                      </p>
                    </div>

                    {/* Col 4: Forma & Status de Pagamento */}
                    <div className="min-w-0 pl-[3.25rem] md:pl-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        {p.pagamento.toLowerCase().includes("pix") ? (
                          <QrCode className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <CreditCard className="size-3.5 text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate">{p.pagamento}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            p.status === "novo" ? "bg-amber-500" : "bg-emerald-500",
                          )}
                        />
                        <span className="truncate">
                          {p.status === "novo" ? "Aguardando confirmação" : "Confirmado"}
                        </span>
                      </p>
                    </div>

                    {/* Col 5: Total Financeiro (Cravado exatamente abaixo do cabeçalho Total) */}
                    <div className="text-left md:text-right pl-[3.25rem] md:pl-0">
                      <p className="num-display text-sm font-bold text-foreground">
                        {brl(totalPedido(p))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.frete > 0 ? `+ ${brl(p.frete)} frete` : "Frete grátis"}
                      </p>
                    </div>

                    {/* Col 6: Ações Rápidas (WhatsApp + Chevron isolados de Total) */}
                    <div className="flex items-center justify-end gap-0.5 pl-[3.25rem] md:pl-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="Enviar mensagem no WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          avisarWhatsApp(p, p.rastreio ? "rastreio" : "padrao");
                        }}
                      >
                        <MessageCircle className="size-4" />
                      </Button>
                      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* ── Rodapé da Tabela: Contagem + Paginação ── */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border/50 bg-secondary/15">
              <p className="text-[11px] text-muted-foreground">
                Exibindo{" "}
                <span className="font-semibold text-foreground">
                  {visiveis.length === 0
                    ? 0
                    : `${(paginaFinal - 1) * POR_PAGINA + 1}–${Math.min(paginaFinal * POR_PAGINA, visiveis.length)}`}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{visiveis.length}</span>{" "}
                {visiveis.length === 1 ? "pedido" : "pedidos"}
              </p>

              {totalPaginas > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaFinal <= 1}
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    className="h-7 px-3 text-xs rounded-lg border-border/70 bg-card disabled:opacity-40"
                  >
                    Anterior
                  </Button>
                  <span className="text-[11px] text-muted-foreground px-1 num-display">
                    {paginaFinal} / {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaFinal >= totalPaginas}
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    className="h-7 px-3 text-xs rounded-lg border-border/70 bg-card disabled:opacity-40"
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sheet / Drawer de Detalhes do Pedido (Padrão Shopify Polaris) ────── */}
      <Sheet open={pedidoAberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        {pedidoAberto ? (
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 border-l border-border bg-card">
            {/* Cabeçalho do Drawer */}
            <div className="p-6 pr-12 border-b border-border bg-secondary/15">
              <SheetHeader className="text-left space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="num-display text-xl font-bold tracking-tight text-foreground">
                      {pedidoAberto.numero}
                    </span>
                    <StatusBadge status={pedidoAberto.status} />
                    {isPedidoSimulado(pedidoAberto) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        🧪 Simulação
                      </span>
                    )}
                  </div>
                  <Tag tone={pedidoAberto.origem === "WhatsApp" ? "success" : "primary"}>
                    {pedidoAberto.origem === "WhatsApp" ? "WhatsApp" : "Vitrine Online"}
                  </Tag>
                </div>
                <SheetDescription className="text-xs text-muted-foreground">
                  Recebido em {dateTimeBR(pedidoAberto.criadoEm)}
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="space-y-5 p-6">
              {isPedidoSimulado(pedidoAberto) && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <Sparkles className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Modo de Prática / Simulação Ativo</p>
                    <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                      Você pode avançar todo o fluxo livremente. Este pedido de teste não altera o estoque físico nem registra entradas no seu Caixa real.
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Stepper Visual do Ciclo do Pedido */}
              <OrderStatusStepper status={pedidoAberto.status} />

              {/* 2. Card do Cliente & Contato Rápido */}
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <UserRound className="size-3.5 text-primary" />
                    <span>Dados da Cliente</span>
                  </div>
                  {pedidoAberto.telefone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => avisarWhatsApp(pedidoAberto, pedidoAberto.rastreio ? "rastreio" : "padrao")}
                      className="h-8 rounded-full text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                    >
                      <MessageCircle className="size-3.5" /> Chamar WhatsApp
                    </Button>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground text-sm">{pedidoAberto.cliente}</p>
                  {pedidoAberto.telefone && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3 text-muted-foreground" />
                      {pedidoAberto.telefone}
                    </p>
                  )}
                  {pedidoAberto.email && <p className="text-muted-foreground">{pedidoAberto.email}</p>}
                </div>

                {/* Endereço de Entrega */}
                {pedidoAberto.endereco && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{pedidoAberto.endereco}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copiarEnderecoEtiqueta(pedidoAberto)}
                        className="h-7 px-2 text-[11px] rounded-lg shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                        title="Copiar endereço formatado para etiqueta dos Correios"
                      >
                        <Copy className="size-3" /> Copiar etiqueta
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Itens do Pedido com Verificação de Estoque Físico */}
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag className="size-3.5 text-primary" />
                    <span>Peças do Pedido ({pedidoAberto.itens.length})</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Valor total</span>
                </div>

                <ul className="divide-y divide-border/60">
                  {pedidoAberto.itens.map((item, i) => {
                    const currentStock = getItemStock(item.produtoId, item.tamanho);
                    const photo = getProductPhoto(item.produtoId);

                    return (
                      <li key={i} className="flex items-center justify-between py-3 text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {photo ? (
                            <img
                              src={photo}
                              alt={item.nome}
                              className="size-12 shrink-0 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm">
                              👗
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{item.nome}</p>
                            <p className="text-muted-foreground text-[11px]">
                              Tam. {item.tamanho} • {item.cor} • Qtd: {item.qtd}
                            </p>
                            {currentStock !== null && (
                              <div className="mt-1">
                                <span
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                                    currentStock >= item.qtd
                                      ? "bg-success-soft text-success border-success/20"
                                      : currentStock > 0
                                      ? "bg-warning-soft text-warning border-warning/20 font-semibold"
                                      : "bg-danger-soft text-danger border-destructive/20 font-semibold",
                                  )}
                                >
                                  {currentStock >= item.qtd
                                    ? `✓ ${currentStock} un. em estoque`
                                    : currentStock > 0
                                    ? `⚠️ Apenas ${currentStock} un. em estoque`
                                    : "❌ Esgotado na grade"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="num-display font-bold text-foreground shrink-0 text-sm">
                          {brl(item.preco * item.qtd)}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {/* Subtotais & Descontos */}
                <div className="space-y-1.5 pt-3 border-t border-border/60 text-xs">
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
                      <span>Cupom de desconto ({pedidoAberto.cupom ?? "Promoção"})</span>
                      <span className="num-display text-success">− {brl(pedidoAberto.desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/60">
                    <span>Total pago pela cliente</span>
                    <span className="num-display text-base text-primary">{brl(totalPedido(pedidoAberto))}</span>
                  </div>
                </div>

                {/* Extrato Contábil Transparente */}
                <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-1 text-xs">
                  <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Extrato Líquido no Caixa
                  </p>
                  {pedidoAberto.taxaOperadora !== undefined && pedidoAberto.taxaOperadora > 0 ? (
                    <>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Taxa de processamento de cartão (3,5%)</span>
                        <span className="text-destructive font-medium">− {brl(pedidoAberto.taxaOperadora)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-2 mt-1">
                        <span>Líquido a receber na conta</span>
                        <span>
                          {brl(
                            pedidoAberto.valorLiquido ??
                              Math.max(totalPedido(pedidoAberto) - pedidoAberto.taxaOperadora, 0),
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Taxa de processamento ({pedidoAberto.pagamento})</span>
                        <span className="text-emerald-600 font-medium">R$ 0,00 (Grátis)</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-2 mt-1">
                        <span>Líquido a receber no Caixa</span>
                        <span>{brl(totalPedido(pedidoAberto))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 4. Logística, Envio & Rastreio */}
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Truck className="size-3.5 text-primary" />
                    <span>Envio & Rastreamento</span>
                  </span>
                  <Tag>{pedidoAberto.entrega}</Tag>
                </div>

                {pedidoAberto.rastreio ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5">
                      <span className="text-xs text-muted-foreground">Código de rastreio:</span>
                      <a
                        href={`https://rastreamento.correios.com.br/app/index.php?codigo=${pedidoAberto.rastreio}`}
                        target="_blank"
                        rel="noreferrer"
                        className="num-display text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        {pedidoAberto.rastreio}
                        <ExternalLink className="size-3 opacity-60" />
                      </a>
                    </div>
                    {pedidoAberto.telefone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => avisarWhatsApp(pedidoAberto, "rastreio")}
                        className="h-9 w-full rounded-xl text-xs font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 gap-1.5"
                      >
                        <MessageCircle className="size-3.5" /> Avisar rastreio no WhatsApp da cliente
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Inserir código de rastreio (ex: BR849201773BR)"
                        value={codigoRastreio}
                        onChange={(e) => setCodigoRastreio(e.target.value)}
                        className="h-9 rounded-xl text-xs font-mono uppercase"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void salvarRastreio(pedidoAberto.id)}
                        className="h-9 rounded-xl text-xs font-semibold shrink-0"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Ações de Avanço e Gerenciamento */}
              <div className="pt-2 flex flex-col gap-2.5">
                {pedidoAberto.status !== "entregue" && pedidoAberto.status !== "cancelado" ? (
                  <Button
                    className="gradient-primary h-11 rounded-full shadow-glow font-semibold cursor-pointer"
                    onClick={() => tentarAvancarStatus(pedidoAberto)}
                  >
                    {pedidoAberto.status === "novo" ? (
                      <>
                        <CheckCircle2 className="size-4 mr-2" /> Aprovar Pedido & Baixar Estoque
                      </>
                    ) : (
                      <>
                        Avançar para "
                        {
                          statusPedidoLabel[
                            fluxoStatus[
                              fluxoStatus.indexOf(pedidoAberto.status as (typeof fluxoStatus)[number]) + 1
                            ] ?? pedidoAberto.status
                          ]
                        }
                        "
                      </>
                    )}
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  className="h-10 rounded-full text-xs font-semibold"
                  onClick={() => avisarWhatsApp(pedidoAberto, "padrao")}
                >
                  <MessageCircle className="mr-2 size-4 text-emerald-500" /> Notificar status no WhatsApp
                </Button>

                {pedidoAberto.status !== "cancelado" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-10 rounded-full text-xs text-danger hover:bg-danger-soft hover:text-danger cursor-pointer"
                      >
                        <X className="mr-1.5 size-3.5" /> Cancelar pedido
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar pedido {pedidoAberto.numero}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {pedidoAberto.status === "novo" ? (
                            "Este pedido ainda não foi confirmado, portanto não alterou seu estoque nem registrou entradas no caixa. Ele será marcado como cancelado sem nenhum impacto financeiro."
                          ) : (
                            <>
                              Como este pedido já foi confirmado, o estoque dos itens será devolvido à grade física e o valor de{" "}
                              <strong className="font-semibold text-foreground">{brl(totalPedido(pedidoAberto))}</strong> será registrado como estorno no Caixa.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-full bg-danger text-danger-foreground hover:bg-danger/90 cursor-pointer"
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
                        className="h-10 rounded-full text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="mr-1.5 size-3.5" /> Excluir pedido cancelado do histórico
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pedido {pedidoAberto.numero}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este pedido já está cancelado e será removido permanentemente do seu histórico.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
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
                        <span className="truncate">
                          {it.nome} (Tam. {it.tamanho} • {it.qtd} un.)
                        </span>
                        <span
                          className={
                            isShortage
                              ? "text-rose-600 dark:text-rose-400 font-semibold shrink-0"
                              : "text-muted-foreground shrink-0"
                          }
                        >
                          {st === null ? "—" : st <= 0 ? "Esgotado (0 un.)" : `${st} un. em estoque`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs">
                  Deseja confirmar o pedido e registrar a entrada de{" "}
                  <strong>{pedidoConfirmarSemEstoque ? brl(totalPedido(pedidoConfirmarSemEstoque)) : ""}</strong> no Caixa mesmo assim?
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
