import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Calculator, Check, Layers, Minus, MoreHorizontal, Package, Pencil, Plus, RotateCcw, Search, Settings2, Shirt, Sparkles, Store, Tag, Trash2, TrendingUp, Wallet, X } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Skeleton } from "@/components/ui/skeleton";
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
    tab: search["tab"] === "categorias" ? "categorias" : "pecas",
    ...(typeof search["cat"] === "string" ? { cat: search["cat"] } : {}),
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
  const { data: items = [], isLoading } = useQuery(inventoryQuery());
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
  const [newPieceOpen, setNewPieceOpen] = useState(false);

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

  const outOfStockCount = useMemo(() => {
    return items.filter((i) => {
      const s = (i.sizes ?? {}) as Sizes;
      const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
      return units <= 0;
    }).length;
  }, [items]);

  const handleUseSampleAsTemplate = () => {
    setName("Vestido Midi Linho Cru");
    setCategory("vestido");
    setColor("Cru / Areia");
    setSupplier("Confecção Própria");
    setCost("65.00");
    setPrice("179.90");
    setGradeMode("grade");
    setSizes({ PP: 1, P: 2, M: 3, G: 2, GG: 1 });
    setNewPieceOpen(true);
    toast.success("Modelo carregado no formulário!", {
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

  const avgCost = totalUnits > 0 ? stockValue / totalUnits : 0;
  const markupPct = stockValue > 0 ? ((potential - stockValue) / stockValue) * 100 : 0;
  const activeRatio = items.length > 0 ? Math.round(((items.length - outOfStockCount) / items.length) * 100) : 100;

  const inventoryCopy = useMemo(() => {
    const itemUnits = items.map((i) => {
      const s = (i.sizes ?? {}) as Sizes;
      return Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
    });
    const activeModels = itemUnits.filter((u) => u > 0).length;
    const isSingleUnitsOnly = totalUnits > 0 && activeModels > 0 && itemUnits.filter((u) => u > 0).every((u) => u === 1);

    // ── 1. Métrica Física (Total de Unidades)
    let unitsSubtitle = "distribuídas no catálogo";
    if (items.length === 0) {
      unitsSubtitle = "cadastre sua primeira peça";
    } else if (totalUnits === 0) {
      unitsSubtitle = `todos os ${items.length} ${items.length === 1 ? "modelo está esgotado" : "modelos estão esgotados"}`;
    } else if (items.length === 1) {
      unitsSubtitle = totalUnits === 1 ? "peça única cadastrada" : "todas no mesmo modelo";
    } else if (isSingleUnitsOnly) {
      if (outOfStockCount > 0) {
        unitsSubtitle = `${activeModels} ${activeModels === 1 ? "peça exclusiva" : "peças exclusivas"} · ${outOfStockCount} esgotado`;
      } else {
        unitsSubtitle = `1 un. por modelo (${items.length} peças exclusivas)`;
      }
    } else if (outOfStockCount > 0) {
      if (activeModels === 1) {
        unitsSubtitle = `concentradas em 1 modelo · ${outOfStockCount} esgotado`;
      } else {
        unitsSubtitle = `${activeModels} modelos com estoque · ${outOfStockCount} ${outOfStockCount === 1 ? "esgotado" : "esgotados"}`;
      }
    } else {
      unitsSubtitle = `distribuídas em ${items.length} modelos ativos`;
    }

    // ── 2. Métrica de Custo (Capital Investido)
    let costSubtitle = `custo médio de ${brl(avgCost)}/un.`;
    if (totalUnits === 0 && stockValue === 0) {
      costSubtitle = "sem capital alocado no momento";
    } else if (totalUnits > 0 && stockValue === 0) {
      costSubtitle = "custo de compra não preenchido";
    } else if (totalUnits === 1) {
      costSubtitle = "custo desta unidade";
    }

    // ── 3. Métrica de Retorno (Potencial de Venda)
    let potentialSubtitleNode: React.ReactNode = "previsão de faturamento futuro";
    if (potential > 0 && stockValue > 0) {
      const profit = potential - stockValue;
      if (profit > 0) {
        potentialSubtitleNode = (
          <>
            lucro projetado de <strong className="font-semibold text-foreground">{brl(profit)}</strong>
            <span className="text-emerald-700/80 dark:text-emerald-400 font-medium ml-1">
              (+{markupPct.toFixed(0)}%)
            </span>
          </>
        );
      } else if (profit === 0) {
        potentialSubtitleNode = "preço de venda igual ao custo (0%)";
      } else {
        potentialSubtitleNode = (
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            atenção: venda abaixo do custo ({markupPct.toFixed(0)}%)
          </span>
        );
      }
    } else if (potential > 0 && stockValue === 0) {
      potentialSubtitleNode = "previsão bruta (custos não informados)";
    }

    return {
      unitsSubtitle,
      costSubtitle,
      potentialSubtitleNode,
    };
  }, [items, totalUnits, stockValue, potential, avgCost, markupPct, outOfStockCount]);

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
      setNewPieceOpen(false);
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque & Catálogo"
        title={activeTab === "categorias" ? "Coleções & Categorias" : "Gestão de Estoque e Peças"}
        description={
          activeTab === "categorias"
            ? "Organize as categorias das suas peças para facilitar filtros, estoque e vitrine."
            : "Controle de numeração, grade, capital investido e rentabilidade por peça."
        }
        action={
          <div className="flex items-center gap-2.5">
            {activeTab === "categorias" ? (
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-border bg-card px-3.5 text-xs font-semibold text-foreground/80 shadow-2xs hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Link to="/estoque" search={{ tab: "pecas" }}>
                  <Shirt className="mr-2 size-3.5 text-primary" />
                  Ver Estoque
                </Link>
              </Button>
            ) : (
              <>
                {vitrineAtiva && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-xl border-border bg-card px-3.5 text-xs font-semibold text-foreground/80 shadow-2xs hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Link to="/loja/produtos">
                      <Store className="mr-2 size-3.5 text-primary" />
                      Catálogo Vitrine
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    setName("");
                    setColor("");
                    setCost("");
                    setPrice("");
                    setPhotoUrl("");
                    setSizes({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
                    setSingleSizeQty("");
                    setGradeMode("grade");
                    setNewPieceOpen(true);
                  }}
                  className="h-10 rounded-xl bg-primary text-primary-foreground font-semibold px-4 text-xs shadow-soft hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="size-4" />
                  <span>Nova Peça</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ── Tabs Programáticas (Sem abas redundantes concorrendo com a Sidebar) ────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        {/* ══ ABA: Peças em Estoque ══════════════════════════════════════════ */}
        <TabsContent value="pecas" className="mt-0 space-y-4">

          {/* ── 1. Barra Executiva Unificada (Apple Bento Strip — Superfície Contínua de Alto Padrão) ── */}
          <div className="rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">

              {/* Métrica 1: Volume Físico */}
              <div className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total de Unidades
                  </span>
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Package className="size-3.5" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  ) : (
                    <>
                      <span className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        {totalUnits}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {totalUnits === 1 ? "peça" : "peças"}
                      </span>
                    </>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-32 rounded mt-2" />
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {inventoryCopy.unitsSubtitle}
                  </p>
                )}
              </div>

              {/* Métrica 2: Capital Investido (Sóbrio / Contábil) */}
              <div className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Capital Investido
                  </span>
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Wallet className="size-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  {isLoading ? (
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  ) : (
                    <span className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {brl(stockValue)}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-36 rounded mt-2" />
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {inventoryCopy.costSubtitle}
                  </p>
                )}
              </div>

              {/* Métrica 3: Potencial de Venda & Margem (Retorno Positivo Esmeralda) */}
              <div className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Potencial de Venda
                  </span>
                  <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <TrendingUp className="size-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  {isLoading ? (
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  ) : (
                    <span className="numeric text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {brl(potential)}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-40 rounded mt-2" />
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {inventoryCopy.potentialSubtitleNode}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* ── 2. Painel do Catálogo & Grade (Superfície Contínua com Cabeçalho Explícito) ── */}
          <section className="panel overflow-hidden border border-border/70 shadow-soft p-0 bg-card">

        {/* ── Barra de Comando: Filtros Inteligentes & Busca Rápida ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-card">
          {/* Segmented Filter Pills (Shopify Polaris style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {/* Todas */}
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-secondary text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <span>Todas as peças</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                statusFilter === "all" ? "bg-card text-foreground" : "bg-surface-muted text-muted-foreground"
              )}>
                {items.length}
              </span>
            </button>

            {/* Disponíveis */}
            <button
              type="button"
              onClick={() => setStatusFilter("in_stock")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "in_stock"
                  ? "bg-secondary text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <span>Disponíveis</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                statusFilter === "in_stock" ? "bg-card text-foreground" : "bg-surface-muted text-muted-foreground"
              )}>
                {items.length - outOfStockCount}
              </span>
            </button>

            {/* Esgotadas (Harmônico — Dot Semântico & Tratamento Simétrico) */}
            {outOfStockCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === "out_of_stock" ? "all" : "out_of_stock"))}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === "out_of_stock"
                    ? "bg-secondary text-foreground shadow-2xs font-bold border border-rose-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Esgotadas</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors",
                  statusFilter === "out_of_stock"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : "bg-surface-muted text-muted-foreground"
                )}>
                  {outOfStockCount}
                </span>
              </button>
            )}
          </div>

          {/* Busca & Filtro de Categoria */}
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por peça, cor ou marca…"
                  className="h-9 pl-8 pr-7 text-xs rounded-xl bg-surface-muted/40 border-border hover:border-foreground/25 transition-colors"
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
                <SelectTrigger className="h-9 w-auto gap-1.5 rounded-xl border-border bg-surface-muted/40 px-3 text-xs font-medium text-foreground/80 hover:border-foreground/25">
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
            </div>
          )}
        </div>

        {isLoading ? (
          /* ── Skeleton Shimmer: 3 linhas enquanto os dados carregam ── */
          <ul className="divide-y divide-border/40 px-5">
            {[0, 1, 2].map((n) => (
              <li key={n} className="flex items-center gap-3.5 py-4">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                </div>
                <Skeleton className="h-5 w-20 rounded ml-auto shrink-0" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Modo Playground · Peça de Demonstração
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Veja como o Vestui organiza fotos, grade e calcula lucros e margens
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] rounded-full border-primary/30 bg-primary/10 text-primary"
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
                      <span className="font-semibold text-success">
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
          <div className="py-14 px-4 text-center space-y-3">
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
          <>
            {/* ── Cabeçalho da Tabela — Alinhamento Matemático & Clareza Mental ── */}
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_80px] items-center gap-4 px-5 py-2.5 bg-surface-muted/30 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
              <span>Peça &amp; Identificação</span>
              <span>Estoque &amp; Grade</span>
              <span className="text-right">Preço &amp; Rentabilidade</span>
              <span className="text-right">Ações</span>
            </div>

            <ul className="divide-y divide-border/40">
              {filteredItems.map((i) => {
                const s = (i.sizes ?? {}) as Sizes;
                const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
                const availableSizes = Object.entries(s).filter(([_, qty]) => Number(qty || 0) > 0);

                return (
                  <li
                    key={i.id}
                    className="flex flex-col sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_80px] items-start sm:items-center justify-between gap-3 sm:gap-4 px-5 py-3.5 hover:bg-secondary/35 transition-colors duration-150"
                  >
                    {/* Coluna 1: Miniatura + Identificação */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl overflow-hidden bg-surface-muted border border-border/50 shrink-0 flex items-center justify-center transition-all",
                          units <= 0 && "opacity-75 grayscale-[25%]",
                        )}
                      >
                        {i.photo_url ? (
                          <img src={i.photo_url} alt={i.name} width={44} height={44} className="size-full object-cover" loading="lazy" />
                        ) : (
                          <Shirt className="size-4 text-muted-foreground/35" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{i.name}</p>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span>{getCategoryLabel(storeCategories, i.category)}</span>
                          {i.color && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{i.color}</span>
                            </>
                          )}
                          {i.supplier && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-muted-foreground/70 truncate">{i.supplier}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Grade & Situação Física (Alinhada perfeitamente sob o header) */}
                    <div className="min-w-0 flex items-center">
                      {units <= 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold h-6">
                            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                            Esgotado
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">0 un. disponíveis</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {availableSizes.map(([size, qty]) => (
                            <span
                              key={size}
                              className="inline-flex items-center gap-1 rounded-lg bg-secondary/80 border border-border/60 px-2 text-[11px] font-semibold text-foreground/80 h-6"
                            >
                              <span>{size}</span>
                              <span className="text-muted-foreground/40 font-normal">·</span>
                              <span className="font-bold text-foreground">{qty}</span>
                            </span>
                          ))}
                          <span className="text-xs font-medium text-muted-foreground ml-1">
                            · {units} {units === 1 ? "peça" : "peças"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Coluna 3: Preço de Venda & Margem (Alinhado à direita sob o header) */}
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <p className="numeric text-sm sm:text-base font-bold text-foreground">{brl(Number(i.sale_price))}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        custo {brl(Number(i.cost_price))}
                        {Number(i.sale_price) > 0 && Number(i.cost_price) > 0 && (
                          <span className="text-emerald-700/80 dark:text-emerald-400 font-medium">
                            {" "}· {(((Number(i.sale_price) - Number(i.cost_price)) / Number(i.sale_price)) * 100).toFixed(0)}% margem
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Coluna 4: Ações (Limpo, sem caixa cinza pesada) */}
                    <div className="flex items-center justify-end gap-1 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(i)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

        </TabsContent>

        {/* ══ ABA: Categorias do Catálogo ════════════════════════════════════ */}
        <TabsContent value="categorias" className="mt-6">
          <section className="panel p-6 sm:p-7 space-y-6">
            {/* Header com resumo + menu ··· */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Categorias do Catálogo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  As categorias são universais — usadas no estoque, na vitrine e nos filtros de toda a plataforma.
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-muted shrink-0 cursor-pointer"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={handleRestoreDefaults}
                    disabled={isSavingCats}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 text-muted-foreground" />
                    Restaurar padrões de moda
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Linha de resumo de categorias */}
            {storeCategories.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex size-1.5 rounded-full bg-border" />
                  {storeCategories.length} {storeCategories.length === 1 ? "categoria" : "categorias"}
                </span>
                {(() => {
                  const comPecas = storeCategories.filter(c => (categoryCounts.get(c.slug) ?? categoryCounts.get(c.id) ?? 0) > 0).length;
                  const vazias = storeCategories.length - comPecas;
                  return (
                    <>
                      {comPecas > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex size-1.5 rounded-full bg-primary" />
                          {comPecas} {comPecas === 1 ? "com peças" : "com peças"}
                        </span>
                      )}
                      {vazias > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/30" />
                          {vazias} {vazias === 1 ? "vazia" : "vazias"}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Adicionar nova categoria */}
            <div className="flex items-center gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                placeholder="Ex: Fitness, Festas, Plus Size, Casual…"
                className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors text-sm"
              />
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || isSavingCats}
                className="h-11 rounded-full px-5 text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
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
                  const hasItems = count > 0;
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "rounded-2xl border bg-card p-4 shadow-2xs transition-all duration-200 flex flex-col gap-3",
                        hasItems
                          ? "border-l-2 border-l-primary border-border/70 hover:border-border hover:shadow-soft"
                          : "border-border/50 bg-surface-muted/40 hover:border-border/70"
                      )}
                    >
                      {isEditing ? (
                        /* ── modo edição inline ── */
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
                        /* ── modo visualização ── */
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate leading-snug">{cat.name}</p>
                            {/* Badge de contagem semântico */}
                            <div className="mt-1.5">
                              {hasItems ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  {count} {count === 1 ? "peça" : "peças"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/60">
                                  Nenhuma peça
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Menu ··· com ações */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                              >
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                className="gap-2 text-xs cursor-pointer"
                                onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                              >
                                <Pencil className="size-3 text-muted-foreground" />
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <ConfirmDelete
                                onConfirm={() => handleDeleteCategory(cat.id)}
                                description={count > 0
                                  ? `"${cat.name}" tem ${count} peça${count > 1 ? "s" : ""} e não pode ser excluída.`
                                  : `A categoria "${cat.name}" será removida permanentemente.`
                                }
                                trigger={
                                  <DropdownMenuItem
                                    className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    disabled={count > 0}
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="size-3" />
                                    {count > 0 ? "Não pode excluir" : "Excluir"}
                                  </DropdownMenuItem>
                                }
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {/* Link discreto para filtrar no estoque */}
                      {!isEditing && (
                        hasItems ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryFilter(cat.slug);
                              handleTabChange("pecas");
                            }}
                            className="self-start flex items-center gap-1 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Search className="size-3" />
                            Ver {count} {count === 1 ? "peça" : "peças"} no estoque →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryFilter(cat.slug);
                              handleTabChange("pecas");
                            }}
                            className="self-start flex items-center gap-1 text-[11px] font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                          >
                            <Plus className="size-3" />
                            Adicionar primeira peça →
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

      </Tabs>

      {/* ── Sheet de Cadastro de Nova Peça (Padrão Shopify / Apple) ───── */}
      <Sheet open={newPieceOpen} onOpenChange={setNewPieceOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between gap-3 pr-6">
              <SheetTitle>Cadastrar Nova Peça</SheetTitle>
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
                      toast.success(`Valores importados de "${p.name}"! 💡`, {
                        description: `Custo: ${brl(r.realCost)} · Venda: ${brl(r.suggestedPrice)}`,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-auto gap-1 rounded-xl border-border bg-card px-2.5 text-[11px] font-semibold text-primary shadow-xs hover:bg-primary/5 transition-colors">
                    <Calculator className="size-3" /> Puxar Precificação
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
                          {p.name} ({brl(r.suggestedPrice)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <SheetDescription>
              Adicione fotos, categoria, valores e quantidade por tamanho da sua peça.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5 px-1 pb-10">
            {/* Foto + Dados */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-full sm:w-36 shrink-0 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground/90 tracking-tight">
                  Foto da peça
                </Label>
                <div className="w-full max-w-[144px]">
                  <ImageUploader
                    currentUrl={photoUrl || null}
                    bucket="product-photos"
                    folder="inventory"
                    onUploaded={setPhotoUrl}
                    placeholder="Adicionar foto"
                    aspect="portrait"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60 leading-tight">
                  JPG ou PNG (3:4)
                </p>
              </div>

              <div className="flex-1 w-full space-y-3.5">
                <Field label="Nome da peça">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Vestido midi linho"
                    className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Categoria">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 transition-colors">
                        <SelectValue placeholder="Selecione..." />
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
                            + Gerenciar categorias...
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Cor">
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ex: Off-white, Preto"
                      className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                    />
                  </Field>
                </div>

                <Field label="Fornecedor (Opcional)">
                  <SupplierCombobox
                    value={supplier}
                    onChange={setSupplier}
                  />
                </Field>
              </div>
            </div>

            {/* Custo & Preço */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <Field label="Custo da peça (R$)">
                <Input
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
                />
              </Field>

              <Field label="Preço de venda (R$)">
                <Input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors font-mono"
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
                    <span className="text-muted-foreground font-medium">Rentabilidade por peça:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Margem: {brl(margemReais)} ({margemPct.toFixed(1)}%)
                      {markup ? ` · Markup: ${markup}x` : ""}
                    </span>
                  </div>
                  {abaixoCusto ? (
                    <div className="rounded-lg bg-destructive/15 p-2 text-[11px] font-medium text-destructive leading-relaxed">
                      ⚠️ Preço de venda menor que o custo. Prejuízo de {brl(costNum - priceNum)} por peça.
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Grade de tamanhos */}
            <div className="pt-3 border-t border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-foreground/90 tracking-tight">Grade de tamanhos</Label>
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
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {SIZE_GRID.map((s) => {
                    const currentQty = Number(sizes[s] ?? 0);
                    return (
                      <div
                        key={s}
                        className="rounded-2xl border border-border/70 bg-card p-2 text-center space-y-1.5 shadow-2xs hover:border-border transition-colors"
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
                <div className="mt-3 rounded-2xl border border-border/70 bg-card p-4 space-y-3">
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
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl font-semibold border-border hover:bg-secondary cursor-pointer"
                onClick={() => setNewPieceOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-1.5"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? (
                  "Cadastrando..."
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>Adicionar ao Estoque</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
