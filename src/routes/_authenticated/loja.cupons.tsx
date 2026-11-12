import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Percent,
  DollarSign,
  Search,
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

// Modelos prontos de cupons (sugestões discretas em linha única para boutiques)
const TEMPLATES_CUPOM = [
  {
    codigo: "PRIMEIRACOMPRA",
    tipo: "percentual" as const,
    valor: "10",
    limite: "100",
    label: "+ Boas-Vindas · 10% OFF",
  },
  {
    codigo: "FRETEGRATIS",
    tipo: "fixo" as const,
    valor: "20",
    limite: "50",
    label: "+ Frete Cortesia · R$ 20 OFF",
  },
  {
    codigo: "CLIENTEVIP",
    tipo: "percentual" as const,
    valor: "15",
    limite: "30",
    label: "+ Cliente VIP · 15% OFF",
  },
  {
    codigo: "LIQUIDA20",
    tipo: "percentual" as const,
    valor: "20",
    limite: "50",
    label: "+ Giro de Estoque · 20% OFF",
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
    toast.success("Código copiado!", { description: `Cupom ${codigo} pronto para colar.` });
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

      {/* ─── CONTAINER UNIFICADO MONOLÍTICO DE GESTÃO (PADRÃO VESTUI) ─── */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        {lista.length === 0 ? (
          /* ── ESTADO VAZIO EDITORIAL & SOFISTICADO (SEM BLOCOS PESADOS) ── */
          <div className="p-8 sm:p-14 text-center">
            <div className="relative mx-auto size-14 mb-4">
              <div className="gradient-primary absolute inset-0 rounded-2xl opacity-15 blur-xl" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-xs">
                <Ticket className="size-7" />
              </div>
            </div>

            <h3 className="text-base font-bold text-foreground">Nenhum cupom ativo no momento</h3>
            <p className="mt-1.5 max-w-sm mx-auto text-xs text-muted-foreground leading-relaxed">
              Crie campanhas exclusivas para aumentar as vendas, encantar suas clientes e recuperar carrinhos na vitrine.
            </p>

            <div className="mt-5 flex justify-center">
              <Button
                onClick={abrirModalNovo}
                className="gradient-primary h-9.5 rounded-full px-5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-1.5"
              >
                <Plus className="size-3.5" /> Criar primeiro cupom
              </Button>
            </div>

            {/* Linha Minimalista de Sugestões em 1 Toque (Sem Caixas ou Quadrados) */}
            <div className="mt-8 pt-6 border-t border-border/40 max-w-xl mx-auto">
              <p className="text-[11px] font-medium text-muted-foreground/80 mb-3">
                Ou inicie com um modelo pronto de boutique (1 toque):
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {TEMPLATES_CUPOM.map((tpl) => (
                  <button
                    key={tpl.codigo}
                    type="button"
                    onClick={() => aplicarTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-secondary/40 transition-all cursor-pointer font-medium"
                  >
                    <Sparkles className="size-3 text-primary" />
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── TABELA EXECUTIVA DE CUPONS (PADRÃO STRIPE / LINEAR) ── */
          <div>
            {/* Abas Integradas de Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 border-b border-border/70 bg-secondary/15">
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { valor: "todos", label: "Todas as campanhas", count: lista.length },
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

              {/* Métrica de Resumos no Topo */}
              <div className="flex items-center gap-3 px-2 text-xs shrink-0">
                <span className="text-[11px] text-muted-foreground">Total de Resgates:</span>
                <span className="font-bold text-foreground numeric">{métricas.usosTotal} vendas</span>
              </div>
            </div>

            {/* Barra de Busca Embutida */}
            <div className="p-3 border-b border-border/60 bg-secondary/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por código (ex: PRIMAVERA) ou valor do desconto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-foreground font-medium"
                />
              </div>
            </div>

            {/* Tabela de Dados */}
            <div className="overflow-x-auto">
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
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border select-none">
                    <tr>
                      <th className="py-3 px-4 w-[24%]">Código Promocional</th>
                      <th className="py-3 px-4 w-[18%]">Desconto</th>
                      <th className="py-3 px-4 w-[20%]">Validade & Regras</th>
                      <th className="py-3 px-4 w-[18%]">Uso da Campanha</th>
                      <th className="py-3 px-4 w-[10%]">Status</th>
                      <th className="py-3 px-4 w-[10%] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cuponsFiltrados.map((c) => {
                      const uso = c.limite ? Math.min(Math.round((c.usos / c.limite) * 100), 100) : 0;
                      const expirado = c.validade
                        ? new Date(`${c.validade.slice(0, 10)}T23:59:59.999`).getTime() < Date.now()
                        : false;
                      const limiteAtingido = Boolean(c.limite && c.usos >= c.limite);
                      const isCopied = copiedCode === c.codigo;

                      return (
                        <tr key={c.id} className="hover:bg-surface-muted/40 transition-colors">
                          {/* Coluna 1: Código */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-dashed border-primary/30 flex items-center gap-1.5 select-all">
                                <Ticket className="size-3" />
                                {c.codigo}
                              </span>
                              <button
                                type="button"
                                onClick={() => copiarCodigo(c.codigo)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                                title="Copiar código"
                              >
                                {isCopied ? (
                                  <Check className="size-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Coluna 2: Desconto */}
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground text-xs numeric">
                              {c.tipo === "percentual" ? `${c.valor}% OFF` : `${brl(c.valor)} OFF`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {c.tipo === "percentual" ? "Percentual na peça" : "Valor fixo no pedido"}
                            </p>
                          </td>

                          {/* Coluna 3: Validade */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <Clock className="size-3 text-muted-foreground" />
                              <span>{c.validade ? dateBR(c.validade) : "Sem expiração"}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {c.limite ? `Limite de ${c.limite} usos` : "Usos ilimitados"}
                            </p>
                          </td>

                          {/* Coluna 4: Resgates */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="num-display font-semibold text-foreground">
                                {c.usos} {c.limite ? `/ ${c.limite}` : "usos"}
                              </span>
                              {c.limite ? (
                                <span className="text-[10px] text-muted-foreground">{uso}%</span>
                              ) : null}
                            </div>
                            <Progress
                              value={c.limite ? uso : 0}
                              className={cn("h-1.5", uso >= 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary")}
                            />
                          </td>

                          {/* Coluna 5: Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
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
                              <div>
                                {(() => {
                                  if (expirado) return <Tag tone="danger">Expirado</Tag>;
                                  if (limiteAtingido) return <Tag tone="danger">Esgotado</Tag>;
                                  if (c.ativo) return <Tag tone="success">Ativo</Tag>;
                                  return <Tag>Pausado</Tag>;
                                })()}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 6: Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                title="Divulgar cupom no WhatsApp"
                                onClick={() => compartilharWhatsApp(c)}
                              >
                                <MessageCircle className="size-3.5" />
                              </Button>
                              <ConfirmDelete
                                onConfirm={() => excluirCupom(c.id, c.codigo)}
                                title="Excluir cupom?"
                                description={`O cupom "${c.codigo}" será excluído permanentemente.`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                    aria-label="Excluir cupom"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── NOTA DE TRANSPARÊNCIA CONTÁBIL INTEGRADA (RODAPÉ DO CONTAINER) ── */}
        <div className="border-t border-border/40 bg-secondary/15 px-5 py-3 flex items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-semibold text-foreground">Transparência Contábil:</span> Os descontos são lançados como abatimento na entrada do Caixa, preservando o custo de aquisição e a margem real de cada peça no estoque.
          </p>
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
