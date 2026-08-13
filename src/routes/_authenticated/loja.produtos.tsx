import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  EyeOff,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { inventoryQuery } from "@/lib/db";
import { INVENTORY_CATEGORIES, labelOf } from "@/lib/finance";
import {
  mergeInventoryWithShowcase,
  patchShowcaseConfig,
  swapShowcaseOrder,
  getAutoPublish,
  setAutoPublish,
  type ShowcaseProduct,
} from "@/lib/showcase-store";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/produtos")({
  head: () => ({
    meta: [
      { title: "Vitrine — Modaly" },
      {
        name: "description",
        content:
          "Ative peças na vitrine, defina destaques, ordem de exibição e crie promoções sem alterar o preço base do estoque.",
      },
    ],
  }),
  component: ProdutosPage,
});

const seteDias = (iso: string) => {
  const dias = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return dias <= 7;
};

function ProdutosPage() {
  // ── Data ──────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const { data: rawItems = [], isLoading } = useQuery(inventoryQuery());
  const [showcaseVersion, setShowcaseVersion] = useState(0);

  // Re-render when showcase configs change (other tabs or local mutations)
  useEffect(() => {
    const handler = () => setShowcaseVersion((v) => v + 1);
    window.addEventListener("showcase-config-changed", handler);
    return () => window.removeEventListener("showcase-config-changed", handler);
  }, []);

  const produtos = useMemo(
    () => mergeInventoryWithShowcase(rawItems as Parameters<typeof mergeInventoryWithShowcase>[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawItems, showcaseVersion],
  );

  // ── UI State ──────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [autoPublicar, setAutoPublicarState] = useState(getAutoPublish);
  const [promocaoId, setPromocaoId] = useState<string | null>(null);
  const [promocaoPreco, setPromocaoPreco] = useState("");
  const [promocaoInicio, setPromocaoInicio] = useState("");
  const [promocaoFim, setPromocaoFim] = useState("");

  // Estado do modal de Fotos da Vitrine
  const [vitrineFotosId, setVitrineFotosId] = useState<string | null>(null);
  const [vitrineFotosTemp, setVitrineFotosTemp] = useState<string[]>([]);
  const [novaFotoUrl, setNovaFotoUrl] = useState("");

  // ── Derived ───────────────────────────────────────────────────────
  const categoriasDisponiveis = useMemo(() => {
    const vals = Array.from(new Set(rawItems.map((i) => i.category)));
    return vals.map((v) => ({ value: v, label: labelOf(INVENTORY_CATEGORIES, v) }));
  }, [rawItems]);

  const visiveis = useMemo(
    () =>
      produtos.filter(
        (p) =>
          (categoria === "todas" || p.category === categoria) &&
          p.name.toLowerCase().includes(busca.toLowerCase()),
      ),
    [produtos, busca, categoria],
  );

  const emPromocaoProduto = produtos.find((p) => p.id === promocaoId) ?? null;

  // ── Actions ───────────────────────────────────────────────────────
  const alternar = (id: string, campo: "ativo" | "destaque" | "precoOculto") => {
    const alvo = produtos.find((p) => p.id === id);
    if (!alvo) return;
    patchShowcaseConfig(id, { [campo]: !alvo.showcase[campo] });
    setShowcaseVersion((v) => v + 1);
    const mensagens = {
      ativo: alvo.showcase.ativo ? "Peça ocultada da vitrine" : "Peça publicada na vitrine",
      destaque: alvo.showcase.destaque ? "Destaque removido" : "Peça marcada como destaque",
      precoOculto: alvo.showcase.precoOculto
        ? "Preço visível na vitrine"
        : "Preço oculto — cliente negocia pelo WhatsApp",
    };
    toast.success(mensagens[campo], { description: alvo.name });
  };

  const mover = (id: string, direcao: -1 | 1) => {
    const idx = visiveis.findIndex((p) => p.id === id);
    const destino = idx + direcao;
    if (idx < 0 || destino < 0 || destino >= visiveis.length) return;
    swapShowcaseOrder(id, visiveis[destino]!.id);
    setShowcaseVersion((v) => v + 1);
    toast.success("Ordem da vitrine atualizada");
  };

  const handleToggleAutoPublicar = (v: boolean) => {
    setAutoPublish(v);
    setAutoPublicarState(v);
    toast.success(v ? "Publicação automática ativada" : "Publicação automática desativada");
  };

  const salvarPromocao = () => {
    if (!promocaoId) return;
    const preco = parseFloat(promocaoPreco.replace(",", "."));
    patchShowcaseConfig(promocaoId, {
      ...(Number.isFinite(preco) ? { precoPromocional: preco } : {}),
      ...(promocaoInicio ? { promocaoInicio } : {}),
      ...(promocaoFim ? { promocaoFim } : {}),
    });
    setShowcaseVersion((v) => v + 1);
    setPromocaoId(null);
    toast.success("Promoção salva", {
      description: emPromocaoProduto?.name,
    });
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  // Abre o modal de fotos para o produto selecionado
  const abrirFotos = (p: ShowcaseProduct) => {
    setVitrineFotosId(p.id);
    setVitrineFotosTemp([...p.vitrineFotos]);
    setNovaFotoUrl("");
  };

  const adicionarFoto = () => {
    const url = novaFotoUrl.trim();
    if (!url) return;
    // Evita duplicatas
    if (vitrineFotosTemp.includes(url)) {
      toast.error("Essa URL já foi adicionada.");
      return;
    }
    setVitrineFotosTemp((prev) => [...prev, url]);
    setNovaFotoUrl("");
  };

  const removerFoto = (url: string) => {
    setVitrineFotosTemp((prev) => prev.filter((f) => f !== url));
  };

  const salvarFotosVitrine = () => {
    if (!vitrineFotosId) return;
    const produto = produtos.find((p) => p.id === vitrineFotosId);
    patchShowcaseConfig(vitrineFotosId, { vitrineFotos: vitrineFotosTemp });
    setShowcaseVersion((v) => v + 1);
    setVitrineFotosId(null);
    toast.success("Fotos da vitrine salvas!", {
      description:
        vitrineFotosTemp.length === 0
          ? `${produto?.name ?? "Produto"} voltou a usar a foto do estoque.`
          : `${vitrineFotosTemp.length} foto${vitrineFotosTemp.length > 1 ? "s" : ""} premium adicionada${vitrineFotosTemp.length > 1 ? "s" : ""} para ${produto?.name ?? "o produto"}.`,
    });
  };

  const emFotosProduto = produtos.find((p) => p.id === vitrineFotosId) ?? null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <PlanGuard
      requires="digital"
      featureName="Vitrine Online"
      featureDescription="Gerencie quais peças aparecem na sua loja online. Disponível no Plano Digital."
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Vitrine"
          title="Produtos na loja"
          description="Preço e estoque vêm da gestão. Aqui você decide o que aparece, em que ordem e com qual promoção."
          actions={
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
              <Switch
                id="auto-publicar"
                checked={autoPublicar}
                onCheckedChange={handleToggleAutoPublicar}
              />
              <Label htmlFor="auto-publicar" className="text-xs text-muted-foreground">
                Publicar automaticamente ao cadastrar no estoque
              </Label>
            </div>
          }
        />

        {/* Barra de busca + categorias */}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar peça pelo nome"
              className="h-11 rounded-full border-border bg-card pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoria("todas")}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200",
                categoria === "todas"
                  ? "gradient-primary border-transparent text-primary-foreground shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Todas
            </button>
            {categoriasDisponiveis.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoria(c.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200",
                  categoria === c.value
                    ? "gradient-primary border-transparent text-primary-foreground shadow-glow"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <SectionCard bodyClassName="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : visiveis.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-7 w-7" />}
              title="Nenhuma peça encontrada"
              description={
                rawItems.length === 0
                  ? "Cadastre suas primeiras peças no Estoque (Gestão) e elas aparecerão aqui automaticamente."
                  : "Tente outro nome ou troque a categoria para ver as peças cadastradas."
              }
              action={
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setBusca("");
                    setCategoria("todas");
                  }}
                >
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {visiveis.map((p, idx) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 px-4 py-4 transition-colors duration-200 hover:bg-secondary/40 sm:px-5"
                >
                  {/* Thumbnail: prefere foto da vitrine, fallback para foto do estoque */}
                  <button
                    type="button"
                    title="Gerenciar fotos da vitrine"
                    onClick={() => abrirFotos(p)}
                    className="group/thumb relative shrink-0 cursor-pointer"
                  >
                    {p.fotoEfetiva ? (
                      <img
                        src={p.fotoEfetiva}
                        alt={p.name}
                        loading="lazy"
                        width={640}
                        height={800}
                        className="h-20 w-16 rounded-xl object-cover transition-opacity group-hover/thumb:opacity-80"
                      />
                    ) : (
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl transition-colors group-hover/thumb:bg-secondary/60">
                        👗
                      </div>
                    )}
                    {/* Badge: indica se a foto é da vitrine (premium) ou do estoque (básica) */}
                    {p.vitrineFotos.length > 0 ? (
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow">
                        {p.vitrineFotos.length}
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 left-0 right-0 mx-auto w-fit rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground shadow">
                        Básica
                      </span>
                    )}
                    {/* Overlay: ícone de câmera no hover */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/0 transition-colors group-hover/thumb:bg-foreground/30">
                      <Camera className="h-4 w-4 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100" />
                    </div>
                  </button>

                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        {seteDias(p.created_at) ? <Tag tone="primary">Novidade</Tag> : null}
                        {p.totalEstoque === 0 ? (
                          <Tag tone="danger">Esgotado</Tag>
                        ) : p.totalEstoque < 3 ? (
                          <Tag tone="warning">Últimas unidades</Tag>
                        ) : null}
                        {p.showcase.destaque ? <Tag tone="success">Destaque</Tag> : null}
                        {p.showcase.precoOculto ? (
                          <Tag>
                            <EyeOff className="mr-1 h-3 w-3" /> Preço oculto
                          </Tag>
                        ) : null}
                        {p.emPromocao ? <Tag tone="warning">Em promoção</Tag> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelOf(INVENTORY_CATEGORIES, p.category)}
                        {p.color ? ` · ${p.color}` : ""}
                        {" · estoque "}
                        {p.totalEstoque}
                      </p>
                      <p className="num-display mt-1.5 text-sm font-semibold">
                        {p.emPromocao && p.showcase.precoPromocional ? (
                          <>
                            <span className="mr-2 text-xs font-normal text-muted-foreground line-through">
                              {brl(p.sale_price)}
                            </span>
                            {brl(p.precoEfetivo)}
                          </>
                        ) : (
                          brl(p.sale_price)
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Ordenação */}
                      <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={idx === 0}
                          onClick={() => mover(p.id, -1)}
                          aria-label="Subir na vitrine"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={idx === visiveis.length - 1}
                          onClick={() => mover(p.id, 1)}
                          aria-label="Descer na vitrine"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Destaque */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alternar(p.id, "destaque")}
                        aria-label="Marcar como destaque"
                        className={cn(
                          "h-9 w-9 rounded-full",
                          p.showcase.destaque && "text-warning",
                        )}
                      >
                        <Star className={cn("h-4 w-4", p.showcase.destaque && "fill-current")} />
                      </Button>
                      {/* Promoção */}
                      <Button
                        variant="outline"
                        className="h-9 rounded-full text-xs"
                        onClick={() => {
                          setPromocaoId(p.id);
                          setPromocaoPreco(
                            p.showcase.precoPromocional ? String(p.showcase.precoPromocional) : "",
                          );
                          setPromocaoInicio(p.showcase.promocaoInicio ?? "");
                          setPromocaoFim(p.showcase.promocaoFim ?? "");
                        }}
                      >
                        <TagIcon className="mr-1.5 h-3.5 w-3.5" /> Promoção
                      </Button>

                      {/* Fotos da Vitrine */}
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 rounded-full text-xs",
                          p.vitrineFotos.length > 0 && "border-primary/40 text-primary",
                        )}
                        onClick={() => abrirFotos(p)}
                      >
                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                        {p.vitrineFotos.length > 0
                          ? `${p.vitrineFotos.length} foto${p.vitrineFotos.length > 1 ? "s" : ""}`
                          : "Fotos"}
                      </Button>

                      {/* Ocultar preço */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alternar(p.id, "precoOculto")}
                        aria-label="Ocultar preço e negociar no WhatsApp"
                        className={cn(
                          "h-9 w-9 rounded-full",
                          p.showcase.precoOculto && "text-accent-foreground",
                        )}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>

                      {/* Toggle visível */}
                      <div className="ml-1 flex items-center gap-2">
                        <Switch
                          checked={p.showcase.ativo}
                          onCheckedChange={() => alternar(p.id, "ativo")}
                        />
                        <span className="text-xs text-muted-foreground">
                          {p.showcase.ativo ? "Na vitrine" : "Oculta"}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Sheet de Promoção */}
        <Sheet open={emPromocaoProduto !== null} onOpenChange={(o) => !o && setPromocaoId(null)}>
          <SheetContent className="w-full sm:max-w-md">
            {emPromocaoProduto ? (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle>Criar promoção</SheetTitle>
                  <SheetDescription>
                    O preço base do estoque continua intacto. A vitrine mostra o valor promocional
                    com o original riscado.
                  </SheetDescription>
                </SheetHeader>

                <form
                  className="space-y-4 px-4 pb-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    salvarPromocao();
                  }}
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
                    {emPromocaoProduto.fotoEfetiva ? (
                      <img
                        src={emPromocaoProduto.fotoEfetiva}
                        alt={emPromocaoProduto.name}
                        loading="lazy"
                        width={640}
                        height={800}
                        className="h-16 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-secondary text-2xl">
                        👗
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{emPromocaoProduto.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Preço base {brl(emPromocaoProduto.sale_price)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Preço promocional (R$)
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={promocaoPreco}
                      onChange={(e) => setPromocaoPreco(e.target.value)}
                      placeholder={String((emPromocaoProduto.sale_price * 0.85).toFixed(2))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Início</Label>
                      <Input
                        type="date"
                        value={promocaoInicio}
                        onChange={(e) => setPromocaoInicio(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Fim</Label>
                      <Input
                        type="date"
                        value={promocaoFim}
                        onChange={(e) => setPromocaoFim(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="gradient-primary w-full rounded-xl shadow-glow">
                    Salvar promoção
                  </Button>
                </form>
              </>
            ) : null}
          </SheetContent>
        </Sheet>

        {/* Sheet de Fotos da Vitrine */}
        <Sheet open={vitrineFotosId !== null} onOpenChange={(o) => !o && setVitrineFotosId(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            {emFotosProduto ? (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Fotos da Vitrine
                  </SheetTitle>
                  <SheetDescription>
                    Adicione fotos profissionais que serão exibidas{" "}
                    <strong>exclusivamente na loja online</strong>. A foto do estoque continua
                    intacta.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-5 px-4 pb-8">
                  {/* Preview da foto atual do estoque */}
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
                    {emFotosProduto.photo_url ? (
                      <img
                        src={emFotosProduto.photo_url}
                        alt={emFotosProduto.name}
                        loading="lazy"
                        width={640}
                        height={800}
                        className="h-14 w-11 rounded-lg object-cover opacity-60"
                      />
                    ) : (
                      <div className="flex h-14 w-11 items-center justify-center rounded-lg bg-secondary text-xl opacity-60">
                        👗
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{emFotosProduto.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {emFotosProduto.photo_url
                          ? "Foto básica do estoque (será substituída abaixo)"
                          : "Sem foto no estoque"}
                      </p>
                    </div>
                  </div>

                  {/* Galeria de fotos premium */}
                  {vitrineFotosTemp.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Fotos da Vitrine ({vitrineFotosTemp.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {vitrineFotosTemp.map((url, i) => (
                          <div key={url} className="group relative">
                            <img
                              src={url}
                              alt={`Foto ${i + 1}`}
                              loading="lazy"
                              className="aspect-[3/4] w-full rounded-xl object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  `https://placehold.co/120x160/f5f5f5/999?text=Erro`;
                              }}
                            />
                            {i === 0 && (
                              <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                                Capa
                              </span>
                            )}
                            {i === 1 && (
                              <span className="absolute left-1 top-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                                Hover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removerFoto(url)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
                              aria-label="Remover foto"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A 1ª foto é a capa. A 2ª aparece no hover (passa o mouse por cima) nos
                        templates que suportam.
                      </p>
                    </div>
                  )}

                  {/* Input de nova URL */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Adicionar foto por URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        value={novaFotoUrl}
                        onChange={(e) => setNovaFotoUrl(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && (e.preventDefault(), adicionarFoto())
                        }
                        placeholder="https://exemplo.com/foto.jpg"
                        className="h-11 flex-1 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={adicionarFoto}
                        disabled={!novaFotoUrl.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cole a URL de uma foto hospedada online. Recomendamos fotos com fundo limpo,
                      boa iluminação e proporção 3:4 (ex: 600x800px).
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-2">
                    {vitrineFotosTemp.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl text-xs text-destructive hover:text-destructive"
                        onClick={() => setVitrineFotosTemp([])}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover todas
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="gradient-primary flex-1 rounded-xl shadow-glow"
                      onClick={salvarFotosVitrine}
                    >
                      Salvar fotos
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </PlanGuard>
  );
}
