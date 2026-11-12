import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Tag as TagIcon,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Percent,
  DollarSign,
  Flame,
  Crown,
  Truck,
  Search,
  CheckCircle2,
  Clock,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { Tag } from "@/components/loja/badges";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brl, toNumber } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { dateBR, type Cupom } from "@/data/loja";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/loja/cupons")({
  head: () => ({
    meta: [
      { title: "Cupons de desconto — Vestui" },
      {
        name: "description",
        content: "Crie cupons em percentual ou valor fixo, com validade e limite de uso.",
      },
    ],
  }),
  component: CuponsPage,
});

function cuponsKey(storeId: string) {
  return `vestui_cupons_${storeId}`;
}

function legacyCuponsKey(storeId: string) {
  return `vestuli_cupons_${storeId}`;
}

// Modelos prontos de cupons pensados para o varejo de moda feminina e infantil
const TEMPLATES_CUPOM = [
  {
    codigo: "PRIMEIRACOMPRA",
    tipo: "percentual" as const,
    valor: "10",
    limite: "100",
    titulo: "Primeira Compra",
    subtitulo: "10% OFF para atrair clientes novas da vitrine",
    icon: Sparkles,
    badge: "Boas-vindas",
    tone: "bg-primary/10 text-primary border-primary/20",
  },
  {
    codigo: "FRETEGRATIS",
    tipo: "fixo" as const,
    valor: "20",
    limite: "50",
    titulo: "Frete Cortesia",
    subtitulo: "R$ 20,00 de desconto no frete para fechar pedidos",
    icon: Truck,
    badge: "Envio",
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    codigo: "CLIENTEVIP",
    tipo: "percentual" as const,
    valor: "15",
    limite: "30",
    titulo: "Clube VIP",
    subtitulo: "15% OFF exclusivo para fidelizar melhores clientes",
    icon: Crown,
    badge: "Fidelidade",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    codigo: "LIQUIDA20",
    tipo: "percentual" as const,
    valor: "20",
    limite: "50",
    titulo: "Queima de Estoque",
    subtitulo: "20% OFF para acelerar o giro de peças paradas",
    icon: Flame,
    badge: "Giro Rápido",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
];

function CuponsPage() {
  const { storeId, store } = useStore();
  const [lista, setLista] = useState<Cupom[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filtros e busca
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "pausados" | "expirados">("todos");
  const [busca, setBusca] = useState("");

  // Form state
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoTipo, setNovoTipo] = useState<"percentual" | "fixo">("percentual");
  const [novoValor, setNovoValor] = useState("10");
  const [novaValidade, setNovaValidade] = useState("");
  const [novoLimite, setNovoLimite] = useState("50");

  // Carrega cupons isolados por loja
  useEffect(() => {
    if (!storeId) return;
    try {
      const stored =
        localStorage.getItem(cuponsKey(storeId)) ||
        localStorage.getItem(legacyCuponsKey(storeId));
      setLista(stored ? (JSON.parse(stored) as Cupom[]) : []);
    } catch {
      setLista([]);
    }
  }, [storeId]);

  const persistir = (novaLista: Cupom[]) => {
    setLista(novaLista);
    localStorage.setItem(cuponsKey(storeId), JSON.stringify(novaLista));
  };

  const excluirCupom = (id: string, codigo: string) => {
    persistir(lista.filter((x) => x.id !== id));
    toast.success("Cupom removido", { description: `O cupom ${codigo} foi excluído.` });
  };

  const abrirModalNovo = () => {
    setNovoCodigo("");
    setNovoTipo("percentual");
    setNovoValor("10");
    setNovaValidade("");
    setNovoLimite("50");
    setModalAberto(true);
  };

  const aplicarTemplate = (tpl: typeof TEMPLATES_CUPOM[0]) => {
    setNovoCodigo(tpl.codigo);
    setNovoTipo(tpl.tipo);
    setNovoValor(tpl.valor);
    setNovoLimite(tpl.limite);
    setNovaValidade("");
    setModalAberto(true);
  };

  const copiarCodigo = (codigo: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codigo);
    }
    setCopiedCode(codigo);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Código copiado!", { description: `Cupom ${codigo} copiado para a área de transferência.` });
  };

  const compartilharWhatsApp = (c: Cupom) => {
    const lojaNome = store?.name || "nossa loja";
    const desc = c.tipo === "percentual" ? `${c.valor}% de desconto` : `${brl(c.valor)} de desconto`;
    const linkVitrine = store?.slug ? `https://${store.slug}.vestui.com.br` : "";
    const texto = `🛍️ *Presente especial da ${lojaNome}!* \n\nUse o cupom *${c.codigo}* e garanta *${desc}* no seu pedido!${linkVitrine ? `\n\nAcesse nossa vitrine e aproveite: ${linkVitrine}` : ""}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const criarCupom = (e: React.FormEvent) => {
    e.preventDefault();
    const codigoFormatado = novoCodigo.trim().toUpperCase();
    if (!codigoFormatado) {
      toast.error("Informe um código para o cupom.");
      return;
    }
    // Impede códigos duplicados
    if (lista.some((c) => c.codigo === codigoFormatado)) {
      toast.error("Já existe um cupom com este código.", {
        description: "Escolha um código diferente.",
      });
      return;
    }
    // Validação de data expirada: não permite criar cupom com validade no passado
    if (novaValidade) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataValidade = new Date(novaValidade + "T00:00:00");
      if (dataValidade < hoje) {
        toast.error("A validade não pode ser uma data passada.", {
          description: "Escolha uma data igual ou posterior a hoje.",
        });
        return;
      }
    }
    const valNum = toNumber(novoValor);
    if (isNaN(valNum) || valNum <= 0) {
      toast.error("Informe um valor de desconto válido maior que zero.");
      return;
    }
    if (novoTipo === "percentual" && valNum > 100) {
      toast.error("O desconto percentual não pode ser superior a 100%.", {
        description: "Defina um percentual entre 1% e 100%.",
      });
      return;
    }
    const limiteNum = Math.round(toNumber(novoLimite));
    const cupom: Cupom = {
      id: crypto.randomUUID(),
      codigo: codigoFormatado,
      tipo: novoTipo,
      valor: Math.round(valNum * 100) / 100,
      usos: 0,
      ativo: true,
      ...(limiteNum > 0 ? { limite: limiteNum } : {}),
      ...(novaValidade ? { validade: novaValidade } : {}),
    };
    persistir([cupom, ...lista]);
    setModalAberto(false);
    toast.success("Cupom criado e pronto para usar!", { description: cupom.codigo });
  };

  // ── Métricas Executivas ──────────────────────────────────────────────────
  const métricas = useMemo(() => {
    const total = lista.length;
    let ativos = 0;
    let usosTotal = 0;

    for (const c of lista) {
      usosTotal += c.usos || 0;
      const expirado = c.validade
        ? new Date(`${c.validade.slice(0, 10)}T23:59:59.999`).getTime() < Date.now()
        : false;
      const esgotado = Boolean(c.limite && c.usos >= c.limite);
      if (c.ativo && !expirado && !esgotado) {
        ativos++;
      }
    }

    return { total, ativos, usosTotal };
  }, [lista]);

  // ── Filtragem de Cupons ──────────────────────────────────────────────────
  const cuponsFiltrados = useMemo(() => {
    return lista.filter((c) => {
      const expirado = c.validade
        ? new Date(`${c.validade.slice(0, 10)}T23:59:59.999`).getTime() < Date.now()
        : false;
      const esgotado = Boolean(c.limite && c.usos >= c.limite);

      // Filtro de status por aba
      if (filtroStatus === "ativos" && (!c.ativo || expirado || esgotado)) return false;
      if (filtroStatus === "pausados" && (c.ativo || expirado || esgotado)) return false;
      if (filtroStatus === "expirados" && !expirado && !esgotado) return false;

      // Filtro de busca
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return (
        c.codigo.toLowerCase().includes(q) ||
        String(c.valor).includes(q) ||
        (c.tipo === "percentual" ? `${c.valor}%` : `r$ ${c.valor}`).includes(q)
      );
    });
  }, [lista, filtroStatus, busca]);

  return (
    <div className="space-y-6">
      {/* ─── CABEÇALHO PADRÃO VESTUI QUIET LUXURY ─── */}
      <PageHeader
        eyebrow="Crescimento & Vendas"
        title="Cupons de Desconto"
        description="Ative campanhas promocionais com cupons fixos ou percentuais para impulsionar suas vendas."
        actions={
          <Button
            onClick={abrirModalNovo}
            className="gradient-primary h-10 rounded-full px-5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
          >
            <Plus className="size-4" /> Novo cupom
          </Button>
        }
      />

      {/* ─── CARDS DE MÉTRICAS EXECUTIVAS ─── */}
      {lista.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cupons Ativos</span>
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Ticket className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground num-display">
              {métricas.ativos} <span className="text-xs font-normal text-muted-foreground">/ {métricas.total}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Disponíveis para uso na vitrine</p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total de Resgates</span>
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground num-display">{métricas.usosTotal}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Vendas fechadas com desconto</p>
          </div>

          <div className="col-span-2 md:col-span-1 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status Geral</span>
              <div className="size-7 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
                <Sparkles className="size-3.5 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {métricas.ativos > 0 ? "Campanhas ativas" : "Nenhum ativo"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {métricas.ativos > 0 ? "Divulgue seus cupons no WhatsApp" : "Crie ou ative um cupom para vender mais"}
            </p>
          </div>
        </div>
      )}

      {/* ─── CORPO PRINCIPAL: EMPTY STATE OU CONTAINER UNIFICADO ─── */}
      {lista.length === 0 ? (
        <div className="space-y-6">
          {/* Empty State Principal */}
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center shadow-soft relative">
            <div className="relative mx-auto size-16 mb-5">
              <div className="gradient-primary absolute inset-0 rounded-2xl opacity-20 blur-xl" />
              <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-xs">
                <Ticket className="size-8" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum cupom criado ainda</h3>
            <p className="mt-1.5 max-w-md mx-auto text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Crie cupons promocionais para encantar suas clientes, recuperar carrinhos e acelerar as vendas da sua vitrine online.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={abrirModalNovo}
                className="gradient-primary h-10 rounded-full px-6 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
              >
                <Plus className="size-4" /> Criar primeiro cupom
              </Button>
            </div>
          </div>

          {/* Seção de Templates Rápidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Ou comece com um modelo pronto de moda (1 toque)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Clique para preencher automaticamente com as campanhas mais lucrativas para boutiques:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TEMPLATES_CUPOM.map((tpl) => {
                const IconComponent = tpl.icon;
                return (
                  <button
                    key={tpl.codigo}
                    type="button"
                    onClick={() => aplicarTemplate(tpl)}
                    className="flex flex-col text-left rounded-2xl border border-border/80 bg-card p-4 hover:border-primary/50 hover:bg-surface-muted/40 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border", tpl.tone)}>
                        {tpl.badge}
                      </span>
                      <IconComponent className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="mt-3">
                      <p className="font-mono text-xs font-bold text-foreground tracking-wider group-hover:text-primary transition-colors">
                        {tpl.codigo}
                      </p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{tpl.titulo}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-1">{tpl.subtitulo}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-primary font-semibold">
                      <span>Usar modelo</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ─── CONTAINER UNIFICADO DE GESTÃO DE CUPONS ─── */
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
          {/* Abas de Filtro de Status Integradas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 border-b border-border/70 bg-secondary/15">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { valor: "todos", label: "Todos os cupons", count: lista.length },
                { valor: "ativos", label: "Ativos", count: métricas.ativos, isSuccess: true },
                {
                  valor: "pausados",
                  label: "Pausados",
                  count: lista.filter((c) => !c.ativo).length,
                },
                {
                  valor: "expirados",
                  label: "Expirados / Esgotados",
                  count: lista.filter((c) => {
                    const exp = c.validade
                      ? new Date(`${c.validade.slice(0, 10)}T23:59:59.999`).getTime() < Date.now()
                      : false;
                    const esg = Boolean(c.limite && c.usos >= c.limite);
                    return exp || esg;
                  }).length,
                  isDanger: true,
                },
              ].map((tab) => {
                const active = filtroStatus === tab.valor;
                return (
                  <button
                    key={tab.valor}
                    type="button"
                    onClick={() => setFiltroStatus(tab.valor as any)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                      active
                        ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10.5px] num-display transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-bold"
                          : tab.isDanger && tab.count > 0
                            ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold"
                            : tab.isSuccess && tab.count > 0
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                              : "bg-secondary/70 text-muted-foreground/60 font-medium"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de Busca Embutida */}
          <div className="p-3 border-b border-border/60 bg-secondary/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código (ex: PRIMAVERA) ou valor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-foreground font-medium"
              />
            </div>
          </div>

          {/* Grid de Cards Estilo Voucher de Grife */}
          <div className="p-4 sm:p-5">
            {cuponsFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <Ticket className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Nenhum cupom encontrado com os filtros aplicados.</p>
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca("")}
                    className="mt-2 text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cuponsFiltrados.map((c) => {
                  const uso = c.limite ? Math.min(Math.round((c.usos / c.limite) * 100), 100) : 0;
                  const expirado = c.validade
                    ? new Date(`${c.validade.slice(0, 10)}T23:59:59.999`).getTime() < Date.now()
                    : false;
                  const limiteAtingido = Boolean(c.limite && c.usos >= c.limite);
                  const isCopied = copiedCode === c.codigo;

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all bg-card shadow-xs relative overflow-hidden group",
                        expirado || limiteAtingido
                          ? "border-border/60 opacity-80"
                          : c.ativo
                            ? "border-border/80 hover:border-primary/50 hover:shadow-soft"
                            : "border-border/50 bg-secondary/10"
                      )}
                    >
                      <div>
                        {/* Linha Superior: Voucher Badge & Ações Rápidas */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold tracking-wider px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-dashed border-primary/30 flex items-center gap-1.5 select-all">
                              <Ticket className="size-3" />
                              {c.codigo}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={c.ativo}
                              aria-label={`Ativar ou pausar cupom ${c.codigo}`}
                              onCheckedChange={(v) => {
                                persistir(lista.map((x) => (x.id === c.id ? { ...x, ativo: v } : x)));
                                toast.success(v ? "Cupom ativado" : "Cupom pausado", {
                                  description: c.codigo,
                                });
                              }}
                            />
                            <ConfirmDelete
                              onConfirm={() => excluirCupom(c.id, c.codigo)}
                              title="Excluir cupom?"
                              description={`O cupom "${c.codigo}" será excluído permanentemente e clientes não poderão mais utilizá-lo na vitrine.`}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                  title="Excluir cupom"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              }
                            />
                          </div>
                        </div>

                        {/* Valor e Regras */}
                        <div className="mt-3.5">
                          <p className="text-xl font-bold text-foreground num-display">
                            {c.tipo === "percentual" ? `${c.valor}% OFF` : `${brl(c.valor)} OFF`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.tipo === "percentual"
                              ? "Desconto percentual no valor das peças"
                              : "Desconto em valor fixo no subtotal"}
                          </p>
                        </div>

                        {/* Detalhes de Validade & Status */}
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3 text-muted-foreground/70" />
                            <span>{c.validade ? `Válido até ${dateBR(c.validade)}` : "Sem data de expiração"}</span>
                          </div>

                          <div>
                            {(() => {
                              if (expirado) return <Tag tone="danger">Expirado</Tag>;
                              if (limiteAtingido) return <Tag tone="danger">Esgotado</Tag>;
                              if (c.ativo) return <Tag tone="success">Ativo</Tag>;
                              return <Tag>Pausado</Tag>;
                            })()}
                          </div>
                        </div>

                        {/* Barra de Progresso de Resgates */}
                        <div className="mt-3.5 pt-3 border-t border-border/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-muted-foreground font-medium">Uso da campanha</span>
                            <span className="num-display font-semibold text-xs text-foreground">
                              {c.usos} {c.limite ? `/ ${c.limite} (${uso}%)` : "resgates"}
                            </span>
                          </div>
                          <Progress
                            value={c.limite ? uso : 0}
                            className={cn(
                              "mt-1.5 h-1.5",
                              uso >= 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary"
                            )}
                          />
                        </div>
                      </div>

                      {/* Footer do Card com Botões Rápidos de Venda */}
                      <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => copiarCodigo(c.codigo)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                          title="Copiar código para colar no WhatsApp ou Direct"
                        >
                          {isCopied ? (
                            <>
                              <Check className="size-3 text-emerald-600" />
                              <span className="text-emerald-600">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 text-muted-foreground" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => compartilharWhatsApp(c)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          title="Compartilhar mensagem pronta no WhatsApp"
                        >
                          <MessageCircle className="size-3" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── INSIGHT CARD: GESTÃO & CONTABILIDADE NO CAIXA ─── */}
      <div className="rounded-3xl border border-border/80 bg-secondary/15 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Como o cupom entra no caixa</h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              O desconto aparece discriminado no resumo de cada pedido e é registrado como abatimento no Caixa no momento da venda. O preço de custo e a margem base de cada peça no estoque permanecem 100% protegidos.
            </p>
          </div>
        </div>
      </div>

      {/* ─── MODAL CENTRALIZADO ZERO-SCROLL: NOVO CUPOM ─── */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="rounded-3xl border-border bg-card mx-4 sm:mx-auto sm:max-w-md p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Ticket className="size-4 text-primary" />
              Novo Cupom de Desconto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina o código, o valor promocional e as regras de limite.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={criarCupom} className="space-y-4 py-2">
            {/* Campo 1: Código do Cupom */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Código do Cupom <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: PRIMAVERA10"
                className="h-10 rounded-xl font-mono text-sm uppercase font-semibold"
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                required
              />
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <span className="text-[10.5px] text-muted-foreground">Sugestões:</span>
                {["PRIMEIRA10", "FRETEGRATIS", "VIP15", "LIQUIDA"].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNovoCodigo(sug)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-border bg-card hover:bg-surface-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo 2: Seletor Segmentado de Tipo & Valor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Tipo de Desconto</Label>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/30 p-1">
                  <button
                    type="button"
                    onClick={() => setNovoTipo("percentual")}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
                      novoTipo === "percentual"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Percent className="size-3" />
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoTipo("fixo")}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
                      novoTipo === "fixo"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <DollarSign className="size-3" />
                    R$
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {novoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="h-10 rounded-xl font-mono text-sm font-semibold"
                  type="number"
                  min="1"
                  max={novoTipo === "percentual" ? 100 : undefined}
                  required
                />
              </div>
            </div>

            {/* Campo 3: Validade & Limite de Uso */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Validade (Opcional)</Label>
                <Input
                  type="date"
                  value={novaValidade}
                  onChange={(e) => setNovaValidade(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Limite de Usos</Label>
                <Input
                  value={novoLimite}
                  onChange={(e) => setNovoLimite(e.target.value)}
                  className="h-10 rounded-xl text-xs font-mono"
                  type="number"
                  min="1"
                  placeholder="Ex: 50"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                className="rounded-full h-9.5 px-5 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-primary rounded-full h-9.5 px-6 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer"
              >
                Criar cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
