import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Calculator, Minus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ImageUploader } from "@/components/ui/image-uploader";
import { inventoryQuery, pricingsQuery } from "@/lib/db";
import { brl, toNumber } from "@/lib/format";
import { INVENTORY_CATEGORIES, SIZE_GRID, labelOf, computePricing } from "@/lib/finance";
import { getAutoPublish, patchShowcaseConfig } from "@/lib/showcase-store";
import { useStore } from "@/lib/store-context";
import { insertInventoryItem, deleteInventoryItem, updateInventoryItem } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque por grade — Vestuli" },
      {
        name: "description",
        content: "Controle peças, tamanhos, custo e preço de venda do estoque da sua loja.",
      },
      { property: "og:title", content: "Estoque por grade — Vestuli" },
      {
        property: "og:description",
        content: "Peças e tamanhos organizados, com valor total em estoque.",
      },
    ],
  }),
  component: Estoque,
});

type Sizes = Record<string, number>;

function Estoque() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: items = [] } = useQuery(inventoryQuery());
  const { data: pricings = [] } = useQuery(pricingsQuery());

  const [name, setName] = useState("");
  const [category, setCategory] = useState("vestido");
  const [color, setColor] = useState("");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<Sizes>({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
  const [photoUrl, setPhotoUrl] = useState("");
  const [gradeMode, setGradeMode] = useState<"grade" | "unico">("grade");
  const [singleSizeQty, setSingleSizeQty] = useState("");

  const handleUseSampleAsTemplate = () => {
    setName("Vestido Midi Linho Cru");
    setCategory("vestido");
    setColor("Cru / Areia");
    setSupplier("Confecção Própria");
    setCost("65.00");
    setPrice("179.90");
    setGradeMode("grade");
    setSizes({ PP: 1, P: 2, M: 3, G: 2, GG: 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Modelo carregado no formulário acima!", {
      description: "Edite o nome, fotos e valores para a sua peça real.",
    });
  };

  const totalUnits = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    return acc + Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
  }, 0);
  const stockValue = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
    const cost = toNumber(i.cost_price);
    return acc + (isNaN(cost) ? 0 : units * cost);
  }, 0);
  const potential = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
    const salePrice = toNumber(i.sale_price);
    return acc + (isNaN(salePrice) ? 0 : units * salePrice);
  }, 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome da peça");
      const salePriceNum = toNumber(price);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        throw new Error("Informe um preço de venda válido (maior que zero)");
      }
      const costNum = toNumber(cost);
      if (isNaN(costNum) || costNum < 0) {
        throw new Error("Informe um custo de aquisição válido");
      }

      let finalSizes: Sizes = sizes;
      if (gradeMode === "unico") {
        const qty = Math.max(1, Math.round(toNumber(singleSizeQty)) || 1);
        finalSizes = { "Único": qty };
      }

      return insertInventoryItem({
        storeId,
        name: name.trim(),
        category,
        color: color.trim() || null,
        supplier: supplier.trim() || null,
        cost_price: costNum,
        sale_price: salePriceNum,
        sizes: finalSizes,
        photo_url: photoUrl || null,
      });
    },
    onSuccess: (newId) => {
      toast.success("Peça adicionada ao estoque");
      setName("");
      setColor("");
      setCost("");
      setPrice("");
      setPhotoUrl("");
      setSizes({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
      setSingleSizeQty("");
      setGradeMode("grade");
      // Auto-publicar na vitrine se a flag estiver ativa
      if (newId && getAutoPublish()) {
        patchShowcaseConfig(newId, { ativo: true });
        toast.info("Peça publicada automaticamente na vitrine", {
          description: "Você pode ajustar a visibilidade em Loja → Produtos.",
          duration: 4000,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteInventoryItem(storeId, id),
    onSuccess: () => {
      toast.success("Peça removida");
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Edição e Ajuste de Grade (Apple UX) ──────────────────────────────────
  const [editingItem, setEditingItem] = useState<(typeof items)[0] | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("vestido");
  const [editColor, setEditColor] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editGradeMode, setEditGradeMode] = useState<"grade" | "unico">("grade");
  const [editSizes, setEditSizes] = useState<Sizes>({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  const startEditing = (i: (typeof items)[0]) => {
    setEditingItem(i);
    setEditName(i.name);
    setEditCategory(i.category);
    setEditColor(i.color ?? "");
    setEditSupplier(i.supplier ?? "");
    setEditCost(String(i.cost_price).replace(".", ","));
    setEditPrice(String(i.sale_price).replace(".", ","));
    const s = (i.sizes ?? {}) as Sizes;
    const isUnico = "Único" in s || (Object.keys(s).length === 1 && Object.keys(s)[0] === "Único");
    if (isUnico) {
      setEditGradeMode("unico");
      setEditSizes({ "Único": Number(s["Único"] ?? 0) });
    } else {
      setEditGradeMode("grade");
      const keys = Object.keys(s);
      if (keys.length > 0 && !keys.some((k) => (SIZE_GRID as readonly string[]).includes(k))) {
        const customSizes: Sizes = {};
        for (const k of keys) {
          customSizes[k] = Number(s[k] ?? 0);
        }
        setEditSizes(customSizes);
      } else {
        setEditSizes({
          PP: Number(s["PP"] ?? 0),
          P: Number(s["P"] ?? 0),
          M: Number(s["M"] ?? 0),
          G: Number(s["G"] ?? 0),
          GG: Number(s["GG"] ?? 0),
        });
      }
    }
    setEditPhotoUrl(i.photo_url ?? "");
  };

  const update = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      if (!editName.trim()) throw new Error("Informe o nome da peça");
      const salePriceNum = toNumber(editPrice);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        throw new Error("Informe um preço de venda válido (maior que zero)");
      }
      const costNum = toNumber(editCost);
      if (isNaN(costNum) || costNum < 0) {
        throw new Error("Informe um custo de aquisição válido");
      }
      return updateInventoryItem({
        storeId,
        id: editingItem.id,
        name: editName.trim(),
        category: editCategory,
        color: editColor.trim() || null,
        supplier: editSupplier.trim() || null,
        cost_price: costNum,
        sale_price: salePriceNum,
        sizes: editSizes,
        photo_url: editPhotoUrl || null,
      });
    },
    onSuccess: () => {
      toast.success("Peça e grade atualizadas! ✨");
      setEditingItem(null);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Estoque"
        title="Suas peças, tamanho por tamanho"
        description="Saiba quanto você tem parado em estoque e quanto isso pode virar em vendas."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Peças em estoque"
          value={String(totalUnits)}
          icon={<Boxes className="size-4" />}
          tone="primary"
          hint={`${items.length} modelo${items.length !== 1 ? "s" : ""} cadastrado${items.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Valor investido"
          value={brl(stockValue)}
          hint={totalUnits > 0 ? `Custo médio: ${brl(stockValue / totalUnits)} / peça` : "Sem peças em estoque"}
        />
        <StatCard
          label="Potencial de venda"
          value={brl(potential)}
          tone="positive"
          hint={
            potential > 0 && stockValue >= 0
              ? `Lucro potencial de ${brl(potential - stockValue)} (${potential > 0 ? ((((potential - stockValue) / potential) * 100).toFixed(1)) : "0"}% de margem)`
              : "Cadastre peças com custo e preço"
          }
        />
      </div>

      <section className="panel p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Nova peça</h2>
            <p className="text-xs text-muted-foreground">
              Cadastre a peça com fotos, categoria e quantidade por tamanho.
            </p>
          </div>
          {pricings.length > 0 && (
            <Select
              value=""
              onValueChange={(pricingId) => {
                const p = pricings.find((item) => item.id === pricingId);
                if (p) {
                  const r = computePricing({
                    wholesale_cost: Number(p.wholesale_cost),
                    freight_cost: Number(p.freight_cost),
                    packaging_cost: Number(p.packaging_cost),
                    other_costs: Number(p.other_costs),
                    margin_pct: Number(p.margin_pct),
                    tax_pct: Number(p.tax_pct),
                    card_rate_pct: 3.5,
                  });
                  setName(p.name);
                  setCost(r.realCost.toFixed(2).replace(".", ","));
                  setPrice(r.suggestedPrice.toFixed(2).replace(".", ","));
                  toast.success(`Valores importados da precificação "${p.name}"! 💡`, {
                    description: `Custo: ${brl(r.realCost)} · Venda: ${brl(r.suggestedPrice)}`,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs font-semibold text-primary shadow-xs hover:border-primary">
                <Calculator className="size-3.5" /> Puxar da Precificação
              </SelectTrigger>
              <SelectContent>
                {pricings.map((p) => {
                  const r = computePricing({
                    wholesale_cost: Number(p.wholesale_cost),
                    freight_cost: Number(p.freight_cost),
                    packaging_cost: Number(p.packaging_cost),
                    other_costs: Number(p.other_costs),
                    margin_pct: Number(p.margin_pct),
                    tax_pct: Number(p.tax_pct),
                    card_rate_pct: 3.5,
                  });
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Venda: {brl(r.suggestedPrice)})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vestido midi linho"
            />
          </Field>
          <Field label="Categoria">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cor">
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Off-white"
            />
          </Field>
          <Field label="Fornecedor">
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Bras Moda"
            />
          </Field>
          <Field label="Custo (R$)">
            <Input
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="59,90"
            />
          </Field>
          <Field label="Preço de venda (R$)">
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="169,90"
            />
          </Field>
        </div>

        {(() => {
          const costNum = toNumber(cost);
          const priceNum = toNumber(price);
          if (isNaN(costNum) || isNaN(priceNum) || priceNum <= 0) return null;
          const margemReais = priceNum - costNum;
          const margemPct = (margemReais / priceNum) * 100;
          const markup = costNum > 0 ? (priceNum / costNum).toFixed(2) : null;
          const abaixoCusto = costNum > 0 && priceNum < costNum;

          return (
            <div className="mt-4 space-y-1.5 rounded-2xl bg-secondary/50 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Rentabilidade projetada por peça:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Margem Bruta: {brl(margemReais)} ({margemPct.toFixed(1)}%)
                  {markup ? ` · Markup: ${markup}x` : ""}
                </span>
              </div>
              {abaixoCusto ? (
                <div className="rounded-xl bg-destructive/15 p-2 text-[11px] font-medium text-destructive leading-relaxed">
                  ⚠️ Preço de venda menor que o custo de aquisição. Venda com prejuízo direto de {brl(costNum - priceNum)} por peça.
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* ── Foto da peça ── */}
        <div className="mt-6">
          <Label className="text-xs font-semibold text-muted-foreground">
            Foto da peça (opcional)
          </Label>
          <div className="mt-3">
            <ImageUploader
              currentUrl={photoUrl || null}
              bucket="product-photos"
              folder="inventory"
              onUploaded={setPhotoUrl}
              placeholder="Clique para adicionar foto"
              aspect="portrait"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">Grade de tamanhos</Label>
            <div className="flex rounded-full border border-border bg-card p-0.5 text-xs font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => setGradeMode("grade")}
                className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                  gradeMode === "grade"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Grade P / M / G
              </button>
              <button
                type="button"
                onClick={() => setGradeMode("unico")}
                className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                  gradeMode === "unico"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tamanho Único
              </button>
            </div>
          </div>

          {gradeMode === "grade" ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {SIZE_GRID.map((s) => (
                <div key={s} className="w-20">
                  <p className="text-center text-xs font-semibold text-muted-foreground">{s}</p>
                  <Input
                    className="mt-1.5 text-center"
                    inputMode="numeric"
                    placeholder="0"
                    value={sizes[s] ? String(sizes[s]) : ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const num = val === "" ? 0 : Math.max(0, Math.round(toNumber(val)));
                      setSizes((p) => ({ ...p, [s]: isNaN(num) ? 0 : num }));
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 max-w-xs space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Quantidade em estoque (Tamanho Único)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={singleSizeQty}
                onChange={(e) => setSingleSizeQty(e.target.value)}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Ideal para bolsas, carteiras, cintos, brincos, batas e peças sem variação de tamanho.
              </p>
            </div>
          )}
        </div>

        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> Adicionar ao estoque
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Peças cadastradas</h2>
        {items.length === 0 ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-card to-card p-5 sm:p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Modo Playground · Peça de Demonstração
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Veja como o Modaly organiza fotos, grade e calcula lucros e margens
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] rounded-full border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                >
                  Não afeta seu caixa real
                </Badge>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-card border border-border/70 p-4 shadow-2xs">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Vestido Midi Linho Cru</p>
                    <Badge variant="secondary" className="text-[10px] rounded-full">
                      Exemplo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vestido · Cru / Areia · Confecção Própria · 9 unidades no total
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      PP · 1
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      P · 2
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      M · 3
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      G · 2
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      GG · 1
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 shrink-0 md:text-right">
                  <div>
                    <p className="numeric text-base font-semibold text-primary">R$ 179,90</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      custo R$ 65,00 ·{" "}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        lucro R$ 114,90 (64%)
                      </span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleUseSampleAsTemplate}
                    size="sm"
                    className="rounded-full gradient-primary shadow-glow text-xs font-semibold px-4 cursor-pointer"
                  >
                    <Sparkles className="mr-1.5 size-3.5" /> Usar como modelo
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground text-center">
                💡 Toque em <strong>"Usar como modelo"</strong> para carregar estes dados no formulário acima e apenas personalizar para sua peça real, ou preencha do zero.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {items.map((i) => {
              const s = (i.sizes ?? {}) as Sizes;
              const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
              return (
                <li key={i.id} className="rounded-3xl bg-surface-muted p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelOf(INVENTORY_CATEGORIES, i.category)}
                        {i.color ? ` · ${i.color}` : ""}
                        {i.supplier ? ` · ${i.supplier}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(() => {
                          const sizeEntries = Object.entries(s);
                          if (sizeEntries.length === 0) {
                            return SIZE_GRID.map((size) => (
                              <Badge
                                key={size}
                                variant="outline"
                                className="rounded-full text-[10px] font-semibold opacity-50"
                              >
                                {size} · 0
                              </Badge>
                            ));
                          }
                          return sizeEntries.map(([size, qty]) => {
                            const q = Number(qty || 0);
                            return (
                              <Badge
                                key={size}
                                variant="outline"
                                className={`rounded-full text-[10px] font-semibold ${
                                  q <= 0 ? "opacity-50 line-through border-dashed" : "border-border"
                                }`}
                              >
                                {size} · {q}
                              </Badge>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="numeric text-sm font-semibold text-primary">
                          {brl(Number(i.sale_price))}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          custo {brl(Number(i.cost_price))}
                          {Number(i.sale_price) > 0 && Number(i.cost_price) > 0
                            ? ` · margem ${brl(Number(i.sale_price) - Number(i.cost_price))} (${(((Number(i.sale_price) - Number(i.cost_price)) / Number(i.sale_price)) * 100).toFixed(0)}%)`
                            : ""}
                          {" "}· {units} un.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(i)}
                        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                        title="Editar peça e grade"
                        aria-label={`Editar ${i.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDelete
                        onConfirm={() => remove.mutate(i.id)}
                        description={`"${i.name}" será removida do estoque.`}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Sheet de Edição e Ajuste de Grade (Apple UX) ───────────────── */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Editar Peça & Grade</SheetTitle>
            <SheetDescription>
              Ajuste as quantidades por tamanho, custo e preço de venda.
            </SheetDescription>
          </SheetHeader>

          {editingItem && (
            <div className="mt-6 space-y-5 px-1 pb-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome da peça">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Vestido midi linho"
                  />
                </Field>
                <Field label="Categoria">
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cor">
                  <Input
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="Off-white"
                  />
                </Field>
                <Field label="Fornecedor">
                  <Input
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    placeholder="Bras Moda"
                  />
                </Field>
                <Field label="Custo (R$)">
                  <Input
                    inputMode="decimal"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    placeholder="59,90"
                  />
                </Field>
                <Field label="Preço de venda (R$)">
                  <Input
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="169,90"
                  />
                </Field>
              </div>

              {/* Indicador de Margem em Tempo Real */}
              {(() => {
                const costNum = toNumber(editCost);
                const priceNum = toNumber(editPrice);
                if (isNaN(costNum) || isNaN(priceNum) || priceNum <= 0) return null;
                const margemReais = priceNum - costNum;
                const margemPct = (margemReais / priceNum) * 100;
                const markup = costNum > 0 ? (priceNum / costNum).toFixed(2) : null;
                const abaixoCusto = costNum > 0 && priceNum < costNum;

                return (
                  <div className="rounded-2xl bg-secondary/50 p-3.5 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground">Rentabilidade atualizada:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Margem: {brl(margemReais)} ({margemPct.toFixed(1)}%)
                        {markup ? ` · Markup: ${markup}x` : ""}
                      </span>
                    </div>
                    {abaixoCusto && (
                      <div className="rounded-xl bg-destructive/15 p-2 text-[11px] font-medium text-destructive">
                        ⚠️ Preço de venda menor que o custo. Prejuízo de {brl(costNum - priceNum)} por peça.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Foto da Peça */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Foto da peça</Label>
                <div className="mt-2">
                  <ImageUploader
                    currentUrl={editPhotoUrl || null}
                    bucket="product-photos"
                    folder="inventory"
                    onUploaded={setEditPhotoUrl}
                    placeholder="Clique para alterar foto"
                    aspect="portrait"
                  />
                </div>
              </div>

              {/* Grade de Tamanhos — suporte dinâmico a Grade P/M/G e Tamanho Único */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Grade de tamanhos</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Total: {Object.values(editSizes).reduce((acc, q) => acc + (Number(q) || 0), 0)} un.
                    </span>
                    <div className="flex rounded-full border border-border bg-card p-0.5 text-xs font-medium shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditGradeMode("grade");
                          setEditSizes({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
                        }}
                        className={`rounded-full px-2.5 py-0.5 transition-all cursor-pointer ${
                          editGradeMode === "grade"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Grade
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditGradeMode("unico");
                          const prev = editSizes["Único"] ?? 1;
                          setEditSizes({ "Único": Number(prev) });
                        }}
                        className={`rounded-full px-2.5 py-0.5 transition-all cursor-pointer ${
                          editGradeMode === "unico"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Único
                      </button>
                    </div>
                  </div>
                </div>

                {editGradeMode === "grade" ? (
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {SIZE_GRID.map((s) => {
                      const currentQty = Number(editSizes[s] ?? 0);
                      return (
                        <div key={s} className="rounded-2xl border border-border bg-card p-2 text-center space-y-1.5">
                          <p className="text-xs font-bold text-foreground">{s}</p>
                          <Input
                            inputMode="numeric"
                            className="h-8 text-center text-xs font-semibold p-1"
                            value={currentQty > 0 ? String(currentQty) : ""}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              const num = val === "" ? 0 : Math.max(0, Math.round(toNumber(val)));
                              setEditSizes((prev) => ({ ...prev, [s]: isNaN(num) ? 0 : num }));
                            }}
                          />
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-6 rounded-full"
                              disabled={currentQty <= 0}
                              onClick={() =>
                                setEditSizes((prev) => ({ ...prev, [s]: Math.max(0, currentQty - 1) }))
                              }
                            >
                              <Minus className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-6 rounded-full"
                              onClick={() =>
                                setEditSizes((prev) => ({ ...prev, [s]: currentQty + 1 }))
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Ideal para bolsas, cintos, brincos, acessórios e peças sem variação de tamanho.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button" variant="outline" size="icon"
                        className="size-9 rounded-full shrink-0"
                        disabled={(editSizes["Único"] ?? 0) <= 0}
                        onClick={() => setEditSizes({ "Único": Math.max(0, (editSizes["Único"] ?? 0) - 1) })}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        className="h-10 text-center font-bold text-lg"
                        value={String(editSizes["Único"] ?? 0)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          setEditSizes({ "Único": n });
                        }}
                      />
                      <Button
                        type="button" variant="outline" size="icon"
                        className="size-9 rounded-full shrink-0"
                        onClick={() => setEditSizes({ "Único": (editSizes["Único"] ?? 0) + 1 })}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-full font-semibold"
                  onClick={() => setEditingItem(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-11 rounded-full font-semibold"
                  disabled={update.isPending}
                  onClick={() => update.mutate()}
                >
                  Salvar alterações
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
