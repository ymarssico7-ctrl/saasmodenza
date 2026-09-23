import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Calculator, Check, Layers, Minus, Pencil, Plus, RotateCcw, Search, Settings2, Shirt, Sparkles, Store, Tag, Trash2, TrendingUp, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SupplierCombobox } from "@/components/supplier-combobox";
import { CategoryManagerDialog } from "@/components/category-manager-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/ui/image-uploader";
import { inventoryQuery, pricingsQuery } from "@/lib/db";
import { brl, toNumber } from "@/lib/format";
import { SIZE_GRID, computePricing } from "@/lib/finance";
import { useStoreCategories, getCategoryLabel, createCategorySlug, DEFAULT_STORE_CATEGORIES } from "@/lib/categories";
import { getAutoPublish, patchShowcaseConfig } from "@/lib/showcase-store";
import { useStore } from "@/lib/store-context";
import { insertInventoryItem, deleteInventoryItem, updateInventoryItem } from "@/lib/mutations";
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";

type EstoqueSearch = {
  tab?: "pecas" | "categorias";
  cat?: string;
};

export const Route = createFileRoute("/_authenticated/estoque")({
  validateSearch: (search: Record<string, unknown>): EstoqueSearch => ({
    tab: search.tab === "categorias" ? "categorias" : "pecas",
    cat: typeof search.cat === "string" ? search.cat : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Estoque por grade — Vestui" },
      {
        name: "description",
        content: "Controle peças, tamanhos, custo e preço de venda do estoque da sua loja.",
      },
      { property: "og:title", content: "Estoque por grade — Vestui" },
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
  const { store, storeId } = useStore();
  const vitrineAtiva = isVitrineAtiva(storeId, store?.metadata);
  const { data: items = [] } = useQuery(inventoryQuery());
  const { data: pricings = [] } = useQuery(pricingsQuery());

  // ── Categorias Dinâmicas da Loja (Nível Shopify) ──────────────────────────
  const { categories: storeCategories, saveCategories, isSaving: isSavingCats } = useStoreCategories();
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // ── Sub-abas: Peças em Estoque / Categorias do Catálogo ────────────────────
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [activeTab, setActiveTab] = useState<"pecas" | "categorias">(search.tab ?? "pecas");
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  useEffect(() => {
    if (search.tab && search.tab !== activeTab) setActiveTab(search.tab);
  }, [search.tab]);

  const handleTabChange = (val: string) => {
    const newTab = val as "pecas" | "categorias";
    setActiveTab(newTab);
    void navigate({ search: (prev) => ({ ...prev, tab: newTab }) });
  };

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.category) {
        const key = item.category.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const existingSlugs = storeCategories.map((c) => c.slug);
    const slug = createCategorySlug(trimmed, existingSlugs);
    const newCat = { id: slug, name: trimmed, slug };
    void saveCategories([...storeCategories, newCat]);
    setNewCatName("");
    toast.success(`Categoria "${trimmed}" criada com sucesso!`);
  };

  const handleRenameCategory = (id: string) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    const updated = storeCategories.map((c) =>
      c.id === id ? { ...c, name: trimmed } : c
    );
    void saveCategories(updated);
    setEditingCatId(null);
    setEditingCatName("");
    toast.success("Categoria renomeada!");
  };

  const handleDeleteCategory = (id: string) => {
    const cat = storeCategories.find((c) => c.id === id);
    const count = categoryCounts.get(cat?.slug ?? "") ?? 0;
    if (count > 0) {
      toast.error(`Não é possível excluir: ${count} peça${count > 1 ? "s" : ""} usa${count > 1 ? "m" : ""} essa categoria.`);
      return;
    }
    void saveCategories(storeCategories.filter((c) => c.id !== id));
    toast.success("Categoria removida.");
  };

  const handleRestoreDefaults = () => {
    void saveCategories(DEFAULT_STORE_CATEGORIES);
    toast.success("Categorias de moda restauradas!");
  };

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<Sizes>({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
  const [photoUrl, setPhotoUrl] = useState("");
  const [gradeMode, setGradeMode] = useState<"grade" | "unico">("grade");
  const [singleSizeQty, setSingleSizeQty] = useState("");

  // ── Filtros e Busca Rápida no Estoque (Apple UX) ──────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(search.cat ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = i.name.toLowerCase().includes(q);
        const matchColor = i.color?.toLowerCase().includes(q) ?? false;
        const matchSupplier = i.supplier?.toLowerCase().includes(q) ?? false;
        const matchCat = getCategoryLabel(storeCategories, i.category).toLowerCase().includes(q);
        if (!matchName && !matchColor && !matchSupplier && !matchCat) return false;
      }
      if (categoryFilter !== "all" && i.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all") {
        const s = (i.sizes ?? {}) as Sizes;
        const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
        if (statusFilter === "in_stock" && units <= 0) return false;
        if (statusFilter === "out_of_stock" && units > 0) return false;
      }
      return true;
    });
  }, [items, searchQuery, categoryFilter, statusFilter, storeCategories]);

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
  const [editCategory, setEditCategory] = useState("");
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
        action={
          vitrineAtiva ? (
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold text-foreground/80 shadow-2xs hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Link to="/loja/produtos">
                <Store className="mr-2 size-3.5 text-primary" />
                Catálogo da Vitrine Online
              </Link>
            </Button>
          ) : null
        }
      />

      {/* ── Cockpit de Estoque — Padrão Premium Unificado ───────────────────── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        {/* Card 1: Peças em estoque */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/50 bg-card shadow-2xs flex flex-col gap-3 hover:border-border/80 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Peças em estoque</span>
            <Boxes className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <h3 className="numeric text-3xl font-bold tracking-tight leading-none text-foreground">
            {totalUnits} <span className="text-lg font-medium text-muted-foreground">{totalUnits === 1 ? "peça" : "peças"}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground/70">
            {items.length} {items.length === 1 ? "modelo cadastrado" : "modelos cadastrados"}
          </p>
        </div>

        {/* Card 2: Valor investido */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/50 bg-card shadow-2xs flex flex-col gap-3 hover:border-border/80 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Valor investido</span>
            <Tag className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <h3 className="numeric text-3xl font-bold tracking-tight leading-none text-foreground">
            {brl(stockValue)}
          </h3>
          <p className="text-[11px] text-muted-foreground/70">
            {totalUnits > 0 ? `Custo médio: ${brl(stockValue / totalUnits)} / peça` : "Sem peças em estoque"}
          </p>
        </div>

        {/* Card 3: Potencial de venda */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/50 bg-card shadow-2xs flex flex-col gap-3 hover:border-border/80 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Potencial de venda</span>
            <TrendingUp className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <h3 className="numeric text-3xl font-bold tracking-tight leading-none text-foreground">
            {brl(potential)}
          </h3>
          <p className="text-[11px] text-muted-foreground/70">
            {potential > 0 && stockValue >= 0
              ? `Lucro potencial de ${brl(potential - stockValue)} (${((potential - stockValue) / potential * 100).toFixed(1).replace(".", ",")}% de margem)`
              : "Cadastre peças com custo e preço"}
          </p>
        </div>
      </div>

      {/* ── Sub-Abas: Peças em Estoque / Categorias do Catálogo ────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="h-10 rounded-xl bg-surface-muted/60 border border-border/60 p-1">
            <TabsTrigger value="pecas" className="rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Shirt className="mr-1.5 size-3.5" />
              Peças em Estoque
            </TabsTrigger>
            <TabsTrigger value="categorias" className="rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Layers className="mr-1.5 size-3.5" />
              Categorias do Catálogo
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {storeCategories.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══ ABA: Peças em Estoque ══════════════════════════════════════════ */}
        <TabsContent value="pecas" className="space-y-6 mt-6">

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
              <SelectTrigger className="h-9 w-auto gap-1.5 rounded-2xl border-border bg-card px-3.5 text-xs font-semibold text-primary shadow-xs hover:border-primary/40 hover:bg-primary/5 transition-colors">
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

        {/* ── Dados Principais + Foto Integrada ── */}
        <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Foto da Peça (Clean & Compacto) */}
          <div className="w-full md:w-44 shrink-0 flex flex-col gap-2">
            <Label className="text-xs font-semibold text-foreground/90 tracking-tight">
              Foto da peça (opcional)
            </Label>
            <div className="w-full max-w-[176px]">
              <ImageUploader
                currentUrl={photoUrl || null}
                bucket="product-photos"
                folder="inventory"
                onUploaded={setPhotoUrl}
                placeholder="Adicionar foto"
                aspect="portrait"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60 leading-tight">
              Formatos JPG ou PNG. Recomendado 3:4.
            </p>
          </div>

          {/* Grid de Campos */}
          <div className="flex-1 w-full space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome da peça">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Vestido midi linho"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                />
              </Field>
              <Field label="Categoria">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 transition-colors">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {storeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <div className="p-1 border-t border-border/60 mt-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCategoryManagerOpen(true);
                        }}
                        className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer text-left"
                      >
                        <Plus className="size-3.5" />
                        + Gerenciar categorias da loja...
                      </button>
                    </div>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Cor">
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ex: Off-white, Preto..."
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                />
              </Field>
              <Field label="Fornecedor (Opcional)">
                <SupplierCombobox
                  value={supplier}
                  onChange={setSupplier}
                />
              </Field>
              <Field label="Custo da peça (R$)">
                <Input
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0,00"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
                />
              </Field>
              <Field label="Preço de venda (R$)">
                <Input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
                />
              </Field>
            </div>

            {/* Rentabilidade Projetada por Peça */}
            {(() => {
              const costNum = toNumber(cost);
              const priceNum = toNumber(price);
              if (isNaN(costNum) || isNaN(priceNum) || priceNum <= 0) return null;
              const margemReais = priceNum - costNum;
              const margemPct = (margemReais / priceNum) * 100;
              const markup = costNum > 0 ? (priceNum / costNum).toFixed(2) : null;
              const abaixoCusto = costNum > 0 && priceNum < costNum;

              return (
                <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground font-medium">Rentabilidade projetada por peça:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Margem: {brl(margemReais)} ({margemPct.toFixed(1)}%)
                      {markup ? ` · Markup: ${markup}x` : ""}
                    </span>
                  </div>
                  {abaixoCusto ? (
                    <div className="rounded-lg bg-destructive/15 p-2 text-[11px] font-medium text-destructive leading-relaxed">
                      ⚠️ Preço de venda menor que o custo de aquisição. Prejuízo de {brl(costNum - priceNum)} por peça.
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Grade de Tamanhos & Botão Adicionar ── */}
        <div className="mt-7 pt-5 border-t border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-semibold text-foreground/90 tracking-tight">Grade de tamanhos</Label>
              <p className="text-[11px] text-muted-foreground">Defina a quantidade de peças disponíveis por tamanho</p>
            </div>
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
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-2xl">
              {SIZE_GRID.map((s) => {
                const currentQty = Number(sizes[s] ?? 0);
                return (
                  <div
                    key={s}
                    className="rounded-2xl border border-border/70 bg-card p-2.5 text-center space-y-1.5 shadow-2xs hover:border-border transition-colors"
                  >
                    <p className="text-xs font-bold text-foreground">{s}</p>
                    <Input
                      inputMode="numeric"
                      className="h-8 text-center text-xs font-semibold p-1 bg-surface-muted/50 border-border/60"
                      value={currentQty > 0 ? String(currentQty) : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        const num = val === "" ? 0 : Math.max(0, Math.round(toNumber(val)));
                        setSizes((prev) => ({ ...prev, [s]: isNaN(num) ? 0 : num }));
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
                          setSizes((prev) => ({ ...prev, [s]: Math.max(0, currentQty - 1) }))
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
                          setSizes((prev) => ({ ...prev, [s]: currentQty + 1 }))
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
            <div className="mt-4 max-w-sm rounded-2xl border border-border/70 bg-card p-4 space-y-3">
              <Label className="text-xs font-semibold text-foreground">Quantidade (Tamanho Único)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full shrink-0"
                  disabled={Number(singleSizeQty || 0) <= 0}
                  onClick={() =>
                    setSingleSizeQty(String(Math.max(0, Number(singleSizeQty || 0) - 1)))
                  }
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  className="h-10 text-center font-bold text-lg bg-surface-muted/50 border-border/60"
                  placeholder="0"
                  value={singleSizeQty}
                  onChange={(e) => setSingleSizeQty(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full shrink-0"
                  onClick={() =>
                    setSingleSizeQty(String(Number(singleSizeQty || 0) + 1))
                  }
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Ideal para bolsas, cintos, brincos, batas e acessórios sem variação de numeração.
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              className="h-12 rounded-2xl px-8 text-sm font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? (
                "Adicionando..."
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Adicionar ao estoque</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-7 border border-border/70 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Peças cadastradas</h2>
              <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border/60">
                {filteredItems.length} {filteredItems.length === 1 ? "peça" : "peças"}
                {items.length !== filteredItems.length ? ` (de ${items.length})` : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulte seu inventário, ajuste quantidades e acompanhe a rentabilidade.
            </p>
          </div>

          {/* Barra de Filtros e Busca Rápida */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Campo de Busca */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar peça, cor ou fornecedor…"
                  className="h-9 pl-8 pr-7 text-xs rounded-xl bg-card border-border hover:border-foreground/25 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Filtro por Categoria */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-auto gap-1.5 rounded-xl border-border bg-card px-3 text-xs font-medium text-foreground/80 hover:border-foreground/25">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {storeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Estoque */}
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-9 w-auto gap-1.5 rounded-xl border-border bg-card px-3 text-xs font-medium text-foreground/80 hover:border-foreground/25">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o estoque</SelectItem>
                  <SelectItem value="in_stock">Disponíveis</SelectItem>
                  <SelectItem value="out_of_stock">Esgotadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Gerenciar Categorias da Loja */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryManagerOpen(true)}
                className="h-9 gap-1.5 rounded-xl border-border bg-card px-3 text-xs font-semibold text-foreground/80 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer shrink-0"
              >
                <Layers className="size-3.5 text-primary" />
                <span>Categorias</span>
              </Button>
            </div>
          )}
        </div>

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
                      Veja como o Vestui organiza fotos, grade e calcula lucros e margens
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
                    <p className="numeric text-base font-semibold text-foreground">R$ 179,90</p>
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
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Nenhuma peça encontrada com os filtros selecionados.</p>
            <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou limpe os filtros para ver todo o catálogo.</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
            >
              Limpar filtros de busca
            </Button>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {filteredItems.map((i) => {
              const s = (i.sizes ?? {}) as Sizes;
              const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
              const availableSizes = Object.entries(s).filter(([_, qty]) => Number(qty || 0) > 0);

              return (
                <li
                  key={i.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Lado Esquerdo: Miniatura da Peça + Dados */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail / Foto */}
                    <div className="relative size-16 sm:size-18 rounded-xl overflow-hidden bg-surface-muted border border-border/60 shrink-0 flex items-center justify-center">
                      {i.photo_url ? (
                        <img
                          src={i.photo_url}
                          alt={i.name}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
                          <Shirt className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* Dados da Peça */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm sm:text-base font-bold text-foreground">
                        {i.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getCategoryLabel(storeCategories, i.category)}
                        {i.color ? ` · ${i.color}` : ""}
                        {i.supplier ? ` · ${i.supplier}` : ""}
                      </p>

                      {/* Grade Limpa (Apenas tamanhos positivos ou Esgotado) */}
                      {units <= 0 ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-lg border border-border/70 bg-surface-muted/90 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Esgotado
                          </span>
                          <span className="text-[11px] text-muted-foreground/70">
                            0 peças em estoque
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {availableSizes.map(([size, qty]) => (
                            <span
                              key={size}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-surface-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/85"
                            >
                              <span>{size}</span>
                              <span className="text-muted-foreground/40 font-normal">·</span>
                              <span className="font-bold text-foreground">{qty}</span>
                            </span>
                          ))}
                          <span className="text-[11px] text-muted-foreground font-medium ml-1">
                            · {units} {units === 1 ? "peça disponível" : "peças disponíveis"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lado Direito: Preço, Rentabilidade e Ações */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                    <div className="text-left sm:text-right">
                      <p className="numeric text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        {brl(Number(i.sale_price))}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Custo: {brl(Number(i.cost_price))}
                        {Number(i.sale_price) > 0 && Number(i.cost_price) > 0 ? (
                          <>
                            {" "}· Margem:{" "}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {brl(Number(i.sale_price) - Number(i.cost_price))} ({(((Number(i.sale_price) - Number(i.cost_price)) / Number(i.sale_price)) * 100).toFixed(0)}%)
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    {/* Botões de Ação Agrupados */}
                    <div className="flex items-center gap-1 border border-border/60 bg-surface-muted/50 rounded-xl p-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(i)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                        title="Editar peça e grade"
                        aria-label={`Editar ${i.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDelete
                        onConfirm={() => remove.mutate(i.id)}
                        description={`"${i.name}" será removida do estoque.`}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Excluir peça"
                          >
                            <Trash2 className="size-3.5" />
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

        </TabsContent>

        {/* ══ ABA: Categorias do Catálogo ════════════════════════════════════ */}
        <TabsContent value="categorias" className="mt-6">
          <section className="panel p-6 sm:p-7 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Categorias do Catálogo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  As categorias aqui são universais — usadas no estoque, na vitrine online e nos filtros de toda a plataforma.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestoreDefaults}
                disabled={isSavingCats}
                className="h-9 gap-1.5 rounded-xl border-border bg-card px-3 text-xs font-semibold text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all cursor-pointer shrink-0"
              >
                <RotateCcw className="size-3.5" />
                Restaurar padrões de moda
              </Button>
            </div>

            {/* Adicionar nova categoria */}
            <div className="flex items-center gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                placeholder="Nova categoria... Ex: Moda Fitness"
                className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors text-sm"
              />
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || isSavingCats}
                className="h-10 rounded-xl px-4 text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="size-3.5" />
                Adicionar
              </Button>
            </div>

            {/* Grid de categorias */}
            {storeCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-surface-muted/30 p-8 text-center space-y-2">
                <Layers className="mx-auto size-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma categoria ainda.</p>
                <p className="text-xs text-muted-foreground/70">Adicione acima ou restaure as categorias padrão de moda.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {storeCategories.map((cat) => {
                  const count = categoryCounts.get(cat.slug) ?? categoryCounts.get(cat.id) ?? 0;
                  const isEditing = editingCatId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col gap-3"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); handleRenameCategory(cat.id); }
                              if (e.key === "Escape") { setEditingCatId(null); }
                            }}
                            autoFocus
                            className="h-8 rounded-lg text-sm bg-card border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                          <Button
                            type="button"
                            size="icon"
                            className="size-8 rounded-lg shrink-0 cursor-pointer"
                            onClick={() => handleRenameCategory(cat.id)}
                            disabled={isSavingCats}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setEditingCatId(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {count > 0 ? `${count} peça${count > 1 ? "s" : ""}` : "Sem peças"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 border border-border/60 bg-surface-muted/50 rounded-xl p-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                              title="Renomear"
                              onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <ConfirmDelete
                              onConfirm={() => handleDeleteCategory(cat.id)}
                              description={count > 0
                                ? `"${cat.name}" tem ${count} peça${count > 1 ? "s" : ""} e não pode ser excluída.`
                                : `A categoria "${cat.name}" será removida permanentemente.`
                              }
                              trigger={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                  title="Excluir"
                                  disabled={count > 0}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Filtrar no estoque */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat.slug);
                            handleTabChange("pecas");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface-muted/40 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <Search className="size-3" />
                          {count > 0 ? `Ver ${count} peça${count > 1 ? "s" : ""} no estoque` : "Ver no estoque"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

      </Tabs>

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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome da peça">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Vestido midi linho"
                    className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                  />
                </Field>
                <Field label="Categoria">
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 transition-colors">
                      <SelectValue placeholder="Selecione uma categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {storeCategories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <div className="p-1 border-t border-border/60 mt-1">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCategoryManagerOpen(true);
                          }}
                          className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer text-left"
                        >
                          <Plus className="size-3.5" />
                          + Gerenciar categorias da loja...
                        </button>
                      </div>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cor">
                  <Input
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="Off-white"
                    className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                  />
                </Field>
                <Field label="Fornecedor (Opcional)">
                  <SupplierCombobox
                    value={editSupplier}
                    onChange={setEditSupplier}
                  />
                </Field>
                <Field label="Custo da peça (R$)">
                  <Input
                    inputMode="decimal"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    placeholder="59,90"
                    className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
                  />
                </Field>
                <Field label="Preço de venda (R$)">
                  <Input
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="169,90"
                    className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
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
                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Rentabilidade atualizada:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Margem: {brl(margemReais)} ({margemPct.toFixed(1)}%)
                        {markup ? ` · Markup: ${markup}x` : ""}
                      </span>
                    </div>
                    {abaixoCusto && (
                      <div className="rounded-lg bg-destructive/15 p-2 text-[11px] font-medium text-destructive">
                        ⚠️ Preço de venda menor que o custo. Prejuízo de {brl(costNum - priceNum)} por peça.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Foto da Peça */}
              <div>
                <Label className="text-xs font-semibold text-foreground/90 tracking-tight">Foto da peça</Label>
                <div className="mt-2 w-full max-w-[176px]">
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
                  <Label className="text-xs font-semibold text-foreground/90 tracking-tight">Grade de tamanhos</Label>
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
                        <div key={s} className="rounded-2xl border border-border bg-card p-2 text-center space-y-1.5 shadow-2xs">
                          <p className="text-xs font-bold text-foreground">{s}</p>
                          <Input
                            inputMode="numeric"
                            className="h-8 text-center text-xs font-semibold p-1 bg-surface-muted/50 border-border/60"
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
                  <div className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs">
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
                        className="h-10 text-center font-bold text-lg bg-surface-muted/50 border-border/60"
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

              <div className="pt-3 flex gap-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl font-semibold border-border hover:bg-secondary cursor-pointer"
                  onClick={() => setEditingItem(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
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

      {/* ── Modal de Gestão de Categorias (Nível Shopify) ── */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        items={items}
        onCategoryCreated={(slug) => {
          setCategory(slug);
          setEditCategory(slug);
        }}
      />
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/90 tracking-tight">{label}</Label>
      {children}
    </div>
  );
}
