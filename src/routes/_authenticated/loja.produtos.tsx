import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, EyeOff, Search, Sparkles, Star, Tag as TagIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { dateBR, loja, produtos as produtosBase, type Produto } from "@/data/loja";
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

const categorias = ["Todas", "Blusas", "Calças", "Vestidos", "Saias", "Acessórios"] as const;

const seteDias = (iso: string) => {
  const dias = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return dias <= 7;
};

function ProdutosPage() {
  const [lista, setLista] = useState<Produto[]>(produtosBase);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<(typeof categorias)[number]>("Todas");
  const [autoPublicar, setAutoPublicar] = useState(loja.publicarAutomaticamente);
  const [promocao, setPromocao] = useState<string | null>(null);

  const visiveis = useMemo(
    () =>
      lista.filter(
        (p) =>
          (categoria === "Todas" || p.categoria === categoria) &&
          p.nome.toLowerCase().includes(busca.toLowerCase()),
      ),
    [lista, busca, categoria],
  );

  const emPromocao = lista.find((p) => p.id === promocao) ?? null;

  const alternar = (id: string, campo: "ativo" | "destaque" | "precoOculto") => {
    setLista((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: !p[campo] } : p)));
    const alvo = lista.find((p) => p.id === id);
    const mensagens = {
      ativo: alvo?.ativo ? "Peça ocultada da vitrine" : "Peça publicada na vitrine",
      destaque: alvo?.destaque ? "Destaque removido" : "Peça marcada como destaque",
      precoOculto: alvo?.precoOculto ? "Preço visível na vitrine" : "Preço oculto, compra pelo WhatsApp",
    };
    toast.success(mensagens[campo], { description: alvo?.nome });
  };

  const mover = (id: string, direcao: -1 | 1) => {
    setLista((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const destino = idx + direcao;
      if (idx < 0 || destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      const atual = copia[idx]!;
      const outro = copia[destino]!;
      copia[idx] = outro;
      copia[destino] = atual;
      return copia;
    });
    toast.success("Ordem da vitrine atualizada");
  };

  return (
    <PlanGuard requires="digital" featureName="Vitrine Online" featureDescription="Gerencie quais peças aparecem na sua loja online. Disponível no Plano Digital.">
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
                onCheckedChange={(v) => {
                  setAutoPublicar(v);
                  toast.success(v ? "Publicação automática ativada" : "Publicação automática desativada");
                }}
              />
              <Label htmlFor="auto-publicar" className="text-xs text-muted-foreground">
                Publicar automaticamente ao cadastrar no estoque
              </Label>
            </div>
          }
        />

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
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200",
                  categoria === c
                    ? "gradient-primary border-transparent text-primary-foreground shadow-glow"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <SectionCard bodyClassName="p-0">
          {visiveis.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-7 w-7" />}
              title="Nenhuma peça encontrada"
              description="Tente outro nome ou troque a categoria para ver as peças cadastradas."
              action={
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setBusca("");
                    setCategoria("Todas");
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
                  <img
                    src={p.imagem}
                    alt={p.nome}
                    loading="lazy"
                    width={640}
                    height={800}
                    className="h-20 w-16 shrink-0 rounded-xl object-cover"
                  />

                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{p.nome}</p>
                        {seteDias(p.criadoEm) ? <Tag tone="primary">Novidade</Tag> : null}
                        {p.estoque === 0 ? (
                          <Tag tone="danger">Esgotado</Tag>
                        ) : p.estoque < 3 ? (
                          <Tag tone="warning">Últimas unidades</Tag>
                        ) : null}
                        {p.destaque ? <Tag tone="success">Destaque</Tag> : null}
                        {p.precoOculto ? (
                          <Tag>
                            <EyeOff className="mr-1 h-3 w-3" /> Preço oculto
                          </Tag>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.categoria} · {p.tamanhos.join(" / ")} · {p.cores.join(", ")} · estoque{" "}
                        {p.estoque} · cadastrada em {dateBR(p.criadoEm)}
                      </p>
                      <p className="num-display mt-1.5 text-sm font-semibold">
                        {p.precoPromocional ? (
                          <>
                            <span className="mr-2 text-xs font-normal text-muted-foreground line-through">
                              {brl(p.preco)}
                            </span>
                            {brl(p.precoPromocional)}
                          </>
                        ) : (
                          brl(p.preco)
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
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

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alternar(p.id, "destaque")}
                        aria-label="Marcar como destaque"
                        className={cn("h-9 w-9 rounded-full", p.destaque && "text-warning")}
                      >
                        <Star className={cn("h-4 w-4", p.destaque && "fill-current")} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alternar(p.id, "precoOculto")}
                        aria-label="Ocultar preço e negociar no WhatsApp"
                        className={cn("h-9 w-9 rounded-full", p.precoOculto && "text-accent-foreground")}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        className="h-9 rounded-full text-xs"
                        onClick={() => setPromocao(p.id)}
                      >
                        <TagIcon className="mr-1.5 h-3.5 w-3.5" /> Promoção
                      </Button>

                      <div className="ml-1 flex items-center gap-2">
                        <Switch checked={p.ativo} onCheckedChange={() => alternar(p.id, "ativo")} />
                        <span className="text-xs text-muted-foreground">
                          {p.ativo ? "Na vitrine" : "Oculta"}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <Sheet open={emPromocao !== null} onOpenChange={(o) => !o && setPromocao(null)}>
          <SheetContent className="w-full sm:max-w-md">
            {emPromocao ? (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle>Criar promoção</SheetTitle>
                  <SheetDescription>
                    O preço base do estoque continua intacto. A vitrine mostra o valor promocional com o
                    original riscado.
                  </SheetDescription>
                </SheetHeader>

                <form
                  className="space-y-4 px-4 pb-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPromocao(null);
                    toast.success("Promoção agendada", { description: emPromocao.nome });
                  }}
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
                    <img
                      src={emPromocao.imagem}
                      alt={emPromocao.nome}
                      loading="lazy"
                      width={640}
                      height={800}
                      className="h-16 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{emPromocao.nome}</p>
                      <p className="text-xs text-muted-foreground">Preço base {brl(emPromocao.preco)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Preço original</Label>
                    <Input defaultValue={emPromocao.preco.toFixed(2)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Preço promocional</Label>
                    <Input
                      defaultValue={(emPromocao.precoPromocional ?? emPromocao.preco * 0.85).toFixed(2)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Início</Label>
                      <Input type="date" defaultValue={emPromocao.promocaoInicio ?? "2026-08-05"} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Fim</Label>
                      <Input type="date" defaultValue={emPromocao.promocaoFim ?? "2026-08-20"} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Aplicar em</Label>
                    <Select defaultValue="peca">
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peca">Somente esta peça</SelectItem>
                        <SelectItem value="categoria">Toda a categoria {emPromocao.categoria}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="gradient-primary h-11 w-full rounded-xl shadow-glow">
                    Salvar promoção
                  </Button>
                </form>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </PlanGuard>
  );
}
