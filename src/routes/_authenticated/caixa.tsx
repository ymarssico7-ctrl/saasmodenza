import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Minus,
  Package,
  Pencil,
  Percent,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { transactionsQuery, customersQuery, inventoryQuery } from "@/lib/db";
import { brl, formatDate, monthLabel, monthStart, todayISO, toNumber } from "@/lib/format";
import {
  ENTRY_CATEGORIES,
  EXIT_CATEGORIES,
  INVENTORY_CATEGORIES,
  PAYMENT_METHODS,
  labelOf,
  sumBy,
  type Transaction,
} from "@/lib/finance";
import {
  getCustomOptions,
  addCustomEntry,
  addCustomExit,
  addCustomPaymentMethod,
  removeCustomOption,
  updateCustomOption,
  type CustomOption,
  type CustomOptionsStore,
} from "@/lib/custom-options";
import { useStore } from "@/lib/store-context";
import {
  insertTransaction,
  deleteTransaction,
  insertCredit,
  adjustInventoryStock,
  quickInsertInventoryItem,
} from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Controle de caixa — Modé" },
      {
        name: "description",
        content: "Registre entradas e saídas da loja e acompanhe o saldo do dia e do mês.",
      },
      { property: "og:title", content: "Controle de caixa — Modé" },
      { property: "og:description", content: "Entradas, saídas e saldo sempre atualizados." },
    ],
  }),
  component: Caixa,
});

// ── Helpers de data ─────────────────────────────────────────────────────────
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Dialog de criação rápida de opção ────────────────────────────────────────
function QuickAddDialog({
  open,
  title,
  placeholder,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  onConfirm: (label: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setValue("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl"
          onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-full font-semibold"
            disabled={!value.trim()}
            onClick={handleConfirm}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de cadastro ultra-rápido de produto no estoque ───────────────────
function QuickProductDialog({
  open,
  initialName,
  onConfirm,
  onClose,
}: {
  open: boolean;
  initialName: string;
  onConfirm: (data: { name: string; selling_price: number; category: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("vestido");

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const selling_price = toNumber(price);
    onConfirm({ name: name.trim(), selling_price, category });
    setName("");
    setPrice("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Cadastrar Produto no Estoque
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Nome do Produto</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vestido Midi Canelado"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Preço de Venda (R$)</Label>
              <Input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="189,90"
                className="h-11 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl">
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
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-full font-semibold"
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            Salvar e Vincular ao Caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de Gerenciamento Organizado de Opções (Apple Level) ───────────────
function ManageOptionsDialog({
  open,
  storeId,
  initialTab = "entry",
  onClose,
}: {
  open: boolean;
  storeId: string;
  initialTab?: "entry" | "exit" | "pay";
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"entry" | "exit" | "pay">(initialTab);
  const [customOpts, setCustomOpts] = useState(() => getCustomOptions(storeId));
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  const refresh = useCallback(() => {
    setCustomOpts(getCustomOptions(storeId));
  }, [storeId]);

  useEffect(() => {
    window.addEventListener("custom-options-changed", refresh);
    return () => window.removeEventListener("custom-options-changed", refresh);
  }, [refresh]);

  const handleStartEdit = (value: string, label: string) => {
    setEditingValue(value);
    setEditLabel(label);
  };

  const handleSaveEdit = (kind: keyof CustomOptionsStore, value: string) => {
    if (!editLabel.trim()) return;
    updateCustomOption(storeId, kind, value, editLabel);
    setEditingValue(null);
    setEditLabel("");
    toast.success("Opção atualizada");
  };

  const handleDelete = (kind: keyof CustomOptionsStore, value: string) => {
    removeCustomOption(storeId, kind, value);
    toast.success("Opção removida");
  };

  const handleAdd = (kind: keyof CustomOptionsStore) => {
    if (!newLabel.trim()) return;
    if (kind === "entryCategories") addCustomEntry(storeId, newLabel);
    if (kind === "exitCategories") addCustomExit(storeId, newLabel);
    if (kind === "paymentMethods") addCustomPaymentMethod(storeId, newLabel);
    setNewLabel("");
    toast.success("Nova opção adicionada");
  };

  const baseEntry = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
  const baseExit = EXIT_CATEGORIES as readonly { value: string; label: string }[];
  const basePay = PAYMENT_METHODS as readonly { value: string; label: string }[];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings className="h-5 w-5 text-primary" />
            Gerenciar Categorias e Pagamentos
          </DialogTitle>
        </DialogHeader>

        {/* ── Segmented Tabs Apple Style ────────────────────────────────────── */}
        <div className="flex rounded-xl bg-surface-muted p-1 gap-1 my-2">
          <button
            type="button"
            onClick={() => setTab("entry")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              tab === "entry" ? "bg-card text-emerald-600 shadow-sm dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entradas
          </button>
          <button
            type="button"
            onClick={() => setTab("exit")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              tab === "exit" ? "bg-card text-rose-600 shadow-sm dark:text-rose-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Saídas
          </button>
          <button
            type="button"
            onClick={() => setTab("pay")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              tab === "pay" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pagamentos
          </button>
        </div>

        {/* ── Formulário de adição rápida no topo ──────────────────────────── */}
        <div className="flex gap-2 my-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={
              tab === "entry"
                ? "Nova categoria de entrada…"
                : tab === "exit"
                ? "Nova categoria de saída…"
                : "Nova forma de pagamento…"
            }
            className="h-10 rounded-xl text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const k = tab === "entry" ? "entryCategories" : tab === "exit" ? "exitCategories" : "paymentMethods";
                handleAdd(k);
              }
            }}
          />
          <Button
            size="sm"
            className="h-10 rounded-xl px-4 text-xs font-semibold"
            disabled={!newLabel.trim()}
            onClick={() => {
              const k = tab === "entry" ? "entryCategories" : tab === "exit" ? "exitCategories" : "paymentMethods";
              handleAdd(k);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>

        {/* ── Lista de Opções da Aba Ativa ──────────────────────────────────── */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 my-2">
          {/* Opções Padrão */}
          {(tab === "entry" ? baseEntry : tab === "exit" ? baseExit : basePay).map((item) => (
            <div
              key={item.value}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-2.5 px-3 text-xs"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                Padrão
              </Badge>
            </div>
          ))}

          {/* Opções Personalizadas */}
          {(tab === "entry"
            ? customOpts.entryCategories
            : tab === "exit"
            ? customOpts.exitCategories
            : customOpts.paymentMethods
          ).map((item) => {
            const kindKey = tab === "entry" ? "entryCategories" : tab === "exit" ? "exitCategories" : "paymentMethods";
            const isEditing = editingValue === item.value;

            return (
              <div
                key={item.value}
                className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/20 p-2.5 px-3 text-xs"
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-2 mr-2">
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8 rounded-lg text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(kindKey, item.value);
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => handleSaveEdit(kindKey, item.value)}
                    >
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-primary">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEdit(item.value, item.label)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => handleDelete(kindKey, item.value)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" className="w-full rounded-full font-semibold" onClick={onClose}>
            Concluído
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal Caixa ──────────────────────────────────────────────
function Caixa() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: all = [] } = useQuery(transactionsQuery());
  const { data: rawCustomers = [] } = useQuery(customersQuery());
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const txs = all as unknown as Transaction[];

  type Customer = { id: string; name: string; phone: string | null };
  const customers = rawCustomers as unknown as Customer[];

  type InventoryItem = {
    id: string;
    name: string;
    category: string;
    selling_price: number;
    sale_price?: number;
    cost_price: number | null;
    image_url: string | null;
    photo_url?: string | null;
    sizes: Record<string, number> | null;
  };

  const inventoryItems = useMemo(() => {
    const rawList = rawInventory as unknown as InventoryItem[];
    return rawList.map((item) => ({
      ...item,
      selling_price: Number(item.selling_price ?? item.sale_price ?? 0),
      image_url: item.image_url ?? item.photo_url ?? null,
    }));
  }, [rawInventory]);

  // ── Opções personalizadas ─────────────────────────────────────────────────
  const [customOpts, setCustomOpts] = useState(() => getCustomOptions(storeId));
  const refreshOpts = useCallback(() => setCustomOpts(getCustomOptions(storeId)), [storeId]);
  useEffect(() => {
    window.addEventListener("custom-options-changed", refreshOpts);
    return () => window.removeEventListener("custom-options-changed", refreshOpts);
  }, [refreshOpts]);

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [kind, setKind] = useState<"entrada" | "saida">("entrada");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("venda_produto");
  const [method, setMethod] = useState("pix");

  // Conexão Inteligente com Estoque
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [deductStock, setDeductStock] = useState(true);
  const [showProductPopover, setShowProductPopover] = useState(false);

  // Navegação por Teclado Desktop
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  // Painel Sutil de Desconto / Promoção
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"flat" | "pct">("flat");
  const [discountValue, setDiscountValue] = useState("");

  // Data com atalhos: "hoje" | "ontem" | "custom"
  const [dateMode, setDateMode] = useState<"hoje" | "ontem" | "custom">("hoje");
  const [customDate, setCustomDate] = useState(todayISO());
  const date = dateMode === "hoje" ? todayISO() : dateMode === "ontem" ? yesterdayISO() : customDate;

  // Fiado
  const [fiadoCustomerId, setFiadoCustomerId] = useState("");
  const [fiadoDueDate, setFiadoDueDate] = useState(todayISO());

  // Dialogs de criação rápida e gerenciamento
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"entry" | "exit" | "pay">("entry");

  const isFiado = method === "fiado" && kind === "entrada";
  const isEntrada = kind === "entrada";

  // ── Produto Selecionado do Estoque ────────────────────────────────────────
  const selectedProduct = useMemo(
    () => inventoryItems.find((p) => p.id === selectedProductId) ?? null,
    [inventoryItems, selectedProductId],
  );

  const matchingProducts = useMemo(() => {
    if (!description.trim()) return inventoryItems.slice(0, 8);
    const query = description.toLowerCase().trim();
    return inventoryItems
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [inventoryItems, description]);

  const hasQuickActions = description.trim().length > 0;
  const totalPopoverItems = matchingProducts.length + (hasQuickActions ? 2 : 0);

  // Reset highlight ao mudar busca
  useEffect(() => {
    setHighlightIndex(-1);
  }, [description]);

  const handleKeyDownDescription = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductPopover) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowProductPopover(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < totalPopoverItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : totalPopoverItems - 1));
    } else if (e.key === "Escape") {
      setShowProductPopover(false);
      setHighlightIndex(-1);
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < totalPopoverItems) {
        e.preventDefault();
        if (highlightIndex < matchingProducts.length) {
          const product = matchingProducts[highlightIndex];
          if (product) handleSelectProduct(product);
        } else if (highlightIndex === matchingProducts.length) {
          setShowProductPopover(false);
          setQuickProductOpen(true);
        } else if (highlightIndex === matchingProducts.length + 1) {
          setShowProductPopover(false);
        }
      }
    }
  };

  const calcTotalStock = (item: InventoryItem) => {
    const sizes = item.sizes ?? {};
    return Object.values(sizes).reduce((acc, n) => acc + Number(n), 0);
  };

  // ── Puxar valor automático incondicional ao selecionar produto ────────────
  const handleSelectProduct = (product: InventoryItem) => {
    setSelectedProductId(product.id);
    setDescription(product.name);

    // Em Entrada: puxa Preço de Venda (selling_price)
    // Em Saída: puxa Preço de Custo ao fornecedor (cost_price se > 0, senão selling_price)
    const priceToUse = isEntrada
      ? product.selling_price
      : (product.cost_price && product.cost_price > 0 ? product.cost_price : product.selling_price);

    if (priceToUse > 0) {
      setAmount(String(priceToUse).replace(".", ","));
    } else {
      setAmount("");
    }
    setShowProductPopover(false);
  };

  // ── Placeholder Inteligente da Descrição ──────────────────────────────────
  const descriptionPlaceholder = useMemo(() => {
    if (isEntrada) return "Digite ou selecione uma peça do estoque…";
    if (category === "compra_estoque") return "Ex: Lote de vestidos fornecedor Brás ou peça do estoque…";
    if (category === "aluguel") return "Ex: Aluguel da loja referência deste mês…";
    if (category === "prolabore") return "Ex: Retirada de pró-labore da sócia…";
    if (category === "marketing") return "Ex: Parceria influenciadora / Anúncios Instagram…";
    return "Ex: Material de escritório, manutenção, conta de luz…";
  }, [isEntrada, category]);

  // ── Impacto Contábil Live Feedback (Linguagem Humana & Simples Apple) ─────
  const managementImpact = useMemo(() => {
    if (isEntrada) {
      return {
        icon: "💰",
        title: "Venda / Entrada",
        desc: "Soma no faturamento e aumenta o dinheiro no caixa da loja.",
        style: "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400",
      };
    }
    if (category === "compra_estoque") {
      return {
        icon: "📦",
        title: "Novas Peças",
        desc: "Investimento para trazer mais roupas e novidades para a loja.",
        style: "border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-400",
      };
    }
    if (category === "prolabore") {
      return {
        icon: "👤",
        title: "Seu Pagamento",
        desc: "Retirada de dinheiro para o seu bolso como dona do negócio.",
        style: "border-purple-200 bg-purple-50/50 text-purple-800 dark:border-purple-800/40 dark:bg-purple-950/20 dark:text-purple-400",
      };
    }
    return {
      icon: "💸",
      title: "Custo da Loja",
      desc: "Pagamento necessário para manter sua loja aberta e funcionando.",
      style: "border-rose-200 bg-rose-50/50 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-400",
    };
  }, [isEntrada, category]);

  // ── Cálculos de Desconto / Promoção ───────────────────────────────────────
  const grossAmount = toNumber(amount);
  const discountNum = toNumber(discountValue);

  const calculatedDiscount = useMemo(() => {
    if (grossAmount <= 0 || discountNum <= 0) return 0;
    if (discountType === "pct") {
      return (grossAmount * Math.min(discountNum, 100)) / 100;
    }
    return Math.min(discountNum, grossAmount);
  }, [grossAmount, discountNum, discountType]);

  const netAmount = Math.max(grossAmount - calculatedDiscount, 0);

  // ── Listas combinadas (padrão + custom) ──────────────────────────────────
  const baseEntryCategories = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
  const baseExitCategories = EXIT_CATEGORIES as readonly { value: string; label: string }[];
  const basePaymentMethods = PAYMENT_METHODS as readonly { value: string; label: string }[];

  const categories: { value: string; label: string }[] =
    isEntrada
      ? [...baseEntryCategories, ...customOpts.entryCategories]
      : [...baseExitCategories, ...customOpts.exitCategories];

  const paymentOptions: { value: string; label: string }[] = [
    ...basePaymentMethods,
    ...customOpts.paymentMethods,
  ];

  // Ajusta category/method ao trocar kind
  const handleKindChange = (next: "entrada" | "saida") => {
    setKind(next);
    setCategory(next === "entrada" ? "venda_produto" : "compra_estoque");
    setMethod("pix");
    setSelectedProductId(null);
  };

  // ── Handlers de criação rápida ────────────────────────────────────────────
  const handleAddCategory = (label: string) => {
    const opt: CustomOption =
      isEntrada
        ? addCustomEntry(storeId, label)
        : addCustomExit(storeId, label);
    setCategory(opt.value);
  };

  const handleAddPayment = (label: string) => {
    const opt = addCustomPaymentMethod(storeId, label);
    setMethod(opt.value);
  };

  const handleQuickCreateProduct = async (data: {
    name: string;
    selling_price: number;
    category: string;
  }) => {
    try {
      const newId = await quickInsertInventoryItem({
        storeId,
        name: data.name,
        selling_price: data.selling_price,
        category: data.category,
      });
      toast.success(`Produto "${data.name}" cadastrado no estoque!`);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });

      // Auto-seleciona a nova peça criada no formulário do caixa
      setSelectedProductId(newId);
      setDescription(data.name);
      if (data.selling_price > 0) {
        setAmount(String(data.selling_price).replace(".", ","));
      }
      setDeductStock(true);
      setShowProductPopover(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto");
    }
  };

  // ── Totais ────────────────────────────────────────────────────────────────
  const month = monthStart(0);
  const monthTxs = useMemo(
    () => txs.filter((t) => t.occurred_on.slice(0, 7) === month.slice(0, 7)),
    [txs, month],
  );
  const today = todayISO();
  const todayTxs = txs.filter((t) => t.occurred_on === today);
  const revenue = sumBy(monthTxs, "entrada");
  const expenses = sumBy(monthTxs, "saida");
  const todayBalance = sumBy(todayTxs, "entrada") - sumBy(todayTxs, "saida");

  // ── Mutações ──────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Descreva o lançamento");
      if (netAmount <= 0) throw new Error("Informe um valor maior que zero");

      // Monta a descrição final (acrescentando nota de desconto se houver)
      let finalDescription = description.trim();
      if (calculatedDiscount > 0) {
        finalDescription += ` [Desconto: ${brl(calculatedDiscount)}]`;
      }

      // Baixa/Acréscimo automático de estoque se vinculado a produto do estoque
      if (selectedProductId && deductStock) {
        const delta = isEntrada ? -1 : 1;
        await adjustInventoryStock(storeId, selectedProductId, delta);
        void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }

      if (isFiado) {
        if (!fiadoCustomerId) throw new Error("Selecione o cliente para registrar o fiado");
        await insertTransaction({
          storeId,
          kind,
          description: finalDescription,
          amount: netAmount,
          category,
          payment_method: "fiado",
          occurred_on: date,
        });
        await insertCredit({
          storeId,
          customer_id: fiadoCustomerId,
          description: finalDescription,
          amount: netAmount,
          purchase_date: date,
          due_date: fiadoDueDate,
        });
        return;
      }

      return insertTransaction({
        storeId,
        kind,
        description: finalDescription,
        amount: netAmount,
        category,
        payment_method: method,
        occurred_on: date,
      });
    },
    onSuccess: () => {
      const msg = selectedProductId && deductStock
        ? isFiado
          ? "Fiado registrado e estoque atualizado!"
          : `Lançamento registrado e estoque ${isEntrada ? "atualizado (-1 un.)" : "atualizado (+1 un.)"}!`
        : isFiado
        ? "Fiado registrado no caixa e na aba Fiado!"
        : "Lançamento registrado";

      toast.success(msg);
      setDescription("");
      setAmount("");
      setShowDiscount(false);
      setDiscountValue("");
      setSelectedProductId(null);
      setDeductStock(true);
      setFiadoCustomerId("");
      setFiadoDueDate(todayISO());
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (isFiado) void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTransaction(storeId, id),
    onSuccess: () => {
      toast.success("Lançamento excluído");
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Helpers de label & foto de produto no extrato ─────────────────────────
  const resolveCategory = (t: Transaction) => {
    const allEntries = [...baseEntryCategories, ...customOpts.entryCategories];
    const allExits = [...baseExitCategories, ...customOpts.exitCategories];
    const pool = t.kind === "entrada" ? allEntries : allExits;
    return pool.find((c) => c.value === t.category)?.label ?? t.category;
  };

  const resolvePayment = (t: Transaction) => {
    const allPay = [...basePaymentMethods, ...customOpts.paymentMethods];
    return allPay.find((c) => c.value === t.payment_method)?.label
      ?? labelOf(basePaymentMethods, t.payment_method);
  };

  const resolveLinkedProduct = (t: Transaction) => {
    const cleanDesc = t.description.replace(/\s*\[Desconto:.*\]/, "").trim().toLowerCase();
    return inventoryItems.find((p) => p.name.toLowerCase() === cleanDesc) ?? null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const accentClass = isEntrada
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
  const btnClass = isEntrada
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-rose-600 hover:bg-rose-700 text-white";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Caixa"
        description="Cada venda e cada despesa no lugar certo. O saldo se atualiza na hora."
      />

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Entradas do mês"
          value={brl(revenue)}
          tone="positive"
          icon={<ArrowUpRight className="size-4" />}
        />
        <StatCard
          label="Saídas do mês"
          value={brl(expenses)}
          tone="negative"
          icon={<ArrowDownRight className="size-4" />}
        />
        <StatCard
          label="Saldo de hoje"
          value={brl(todayBalance)}
          tone={todayBalance >= 0 ? "primary" : "negative"}
          icon={<Wallet className="size-4" />}
          hint={`${todayTxs.length} lançamento${todayTxs.length !== 1 ? "s" : ""} hoje`}
        />
      </div>

      {/* ── Formulário ───────────────────────────────────────────────────── */}
      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Novo lançamento</h2>

        {/* Segmented Control — Entrada / Saída */}
        <div className="mt-5 inline-flex rounded-full bg-surface-muted p-1 gap-1">
          {(["entrada", "saida"] as const).map((k) => (
            <button
              key={k}
              onClick={() => handleKindChange(k)}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                kind === k
                  ? k === "entrada"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "entrada" ? (
                <Plus className="size-3.5" />
              ) : (
                <Minus className="size-3.5" />
              )}
              {k === "entrada" ? "Entrada" : "Saída"}
            </button>
          ))}
        </div>

        {/* Grid de Campos */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Descrição" className="relative lg:col-span-2">
            <div className="relative">
              <Input
                value={description}
                onFocus={() => setShowProductPopover(true)}
                onKeyDown={handleKeyDownDescription}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSelectedProductId(null);
                  setShowProductPopover(true);
                }}
                placeholder={descriptionPlaceholder}
                className="h-11 rounded-xl pr-9"
              />
              {selectedProduct ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId(null);
                    setDescription("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Package className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              )}
            </div>

            {/* Menu Dropdown de Produtos do Estoque com Ações Rápidas de Cadastro */}
            {showProductPopover && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProductPopover(false)}
                />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
                  {matchingProducts.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        📦 Produtos no Estoque ({matchingProducts.length})
                      </div>
                      {matchingProducts.map((p, idx) => {
                        const st = calcTotalStock(p);
                        const isHighlighted = idx === highlightIndex;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            ref={(node) => {
                              if (isHighlighted && node) {
                                node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                              }
                            }}
                            onClick={() => handleSelectProduct(p)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                              isHighlighted
                                ? "bg-primary/10 border border-primary/30 text-primary shadow-sm"
                                : "hover:bg-primary-soft/50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium leading-tight">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{p.category}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono text-xs font-semibold text-foreground">
                                {brl(isEntrada ? p.selling_price : p.cost_price ?? p.selling_price)}
                              </p>
                              <span
                                className={`inline-block text-[10px] font-medium ${
                                  st > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                                }`}
                              >
                                {st > 0 ? `${st} un. em estoque` : "Sem estoque"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <div className="my-1.5 h-px bg-border" />
                    </>
                  )}

                  {/* Ações Inteligentes de 1-Clique na Busca */}
                  {description.trim().length > 0 && (
                    <div className="space-y-1 p-1">
                      {(() => {
                        const idxOpt1 = matchingProducts.length;
                        const idxOpt2 = matchingProducts.length + 1;
                        const isHigh1 = highlightIndex === idxOpt1;
                        const isHigh2 = highlightIndex === idxOpt2;
                        return (
                          <>
                            <button
                              type="button"
                              ref={(node) => {
                                if (isHigh1 && node) {
                                  node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                                }
                              }}
                              onClick={() => {
                                setShowProductPopover(false);
                                setQuickProductOpen(true);
                              }}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-primary transition-all ${
                                isHigh1
                                  ? "bg-primary/20 ring-2 ring-primary"
                                  : "bg-primary/10 hover:bg-primary/20"
                              }`}
                            >
                              <Plus className="h-4 w-4" />
                              Cadastrar "{description.trim()}" no Estoque
                            </button>
                            <button
                              type="button"
                              ref={(node) => {
                                if (isHigh2 && node) {
                                  node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                                }
                              }}
                              onClick={() => setShowProductPopover(false)}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-all ${
                                isHigh2
                                  ? "bg-surface-muted ring-2 ring-primary/40 text-foreground font-semibold"
                                  : "hover:bg-surface-muted"
                              }`}
                            >
                              <Zap className="h-4 w-4" />
                              Lançar venda rápida de "{description.trim()}" (sem cadastrar no estoque)
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
          </Field>

          <Field label="Valor (R$)">
            <div className="space-y-1.5">
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${accentClass}`}>
                  {isEntrada ? "+" : "−"}
                </span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="189,90"
                  className="h-11 rounded-xl pl-7 font-mono"
                />
              </div>

              {/* Botão sutil de Desconto / Promoção */}
              <button
                type="button"
                onClick={() => setShowDiscount(!showDiscount)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Tag className="h-3 w-3" />
                {showDiscount
                  ? "Remover desconto"
                  : isEntrada
                  ? "+ Aplicar desconto / promoção"
                  : "+ Desconto / abatimento obtido"}
              </button>
            </div>
          </Field>

          {/* Categoria com "+ Nova categoria" e "⚙️ Gerenciar" */}
          <Field label="Categoria">
            <Select
              value={category}
              onValueChange={(v) => {
                if (v === "__add_new__") { setAddCatOpen(true); return; }
                if (v === "__manage_cat__") {
                  setManageTab(isEntrada ? "entry" : "exit");
                  setManageOpen(true);
                  return;
                }
                setCategory(v);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
                <div className="my-1 h-px bg-border" />
                <SelectItem value="__add_new__" className="text-primary font-medium">
                  <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                  Nova categoria…
                </SelectItem>
                <SelectItem value="__manage_cat__" className="text-muted-foreground font-medium">
                  <Settings className="mr-1.5 inline h-3.5 w-3.5" />
                  Gerenciar categorias…
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Forma de Pagamento com "+ Nova forma" e "⚙️ Gerenciar" */}
          <Field label="Forma de pagamento">
            <Select
              value={method}
              onValueChange={(v) => {
                if (v === "__add_pay__") { setAddPayOpen(true); return; }
                if (v === "__manage_pay__") {
                  setManageTab("pay");
                  setManageOpen(true);
                  return;
                }
                setMethod(v);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
                <div className="my-1 h-px bg-border" />
                <SelectItem value="__add_pay__" className="text-primary font-medium">
                  <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                  Nova forma de pagamento…
                </SelectItem>
                <SelectItem value="__manage_pay__" className="text-muted-foreground font-medium">
                  <Settings className="mr-1.5 inline h-3.5 w-3.5" />
                  Gerenciar pagamentos…
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Data com atalhos "Hoje" / "Ontem" / Outra data */}
          <Field label="Data">
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {(["hoje", "ontem", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDateMode(m)}
                    className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-all ${
                      dateMode === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {m === "custom" ? (
                      <><CalendarDays className="h-3.5 w-3.5" /> Outra</>
                    ) : (
                      m.charAt(0).toUpperCase() + m.slice(1)
                    )}
                  </button>
                ))}
              </div>
              {dateMode === "custom" && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              )}
              {dateMode !== "custom" && (
                <p className="text-xs text-muted-foreground">
                  {dateMode === "hoje" ? todayISO() : yesterdayISO()}
                </p>
              )}
            </div>
          </Field>
        </div>

        {/* ── Painel Expansível Sutil de Desconto / Promoção ────────────────── */}
        {showDiscount && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20 animate-in fade-in-50 slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                {isEntrada ? "🏷️ Desconto / Valor Promocional" : "🏷️ Desconto / Abatimento Obtido do Fornecedor"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDiscount(false);
                  setDiscountValue("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Tipo de desconto</Label>
                <div className="mt-1 flex rounded-xl border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-colors ${
                      discountType === "flat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    R$ Reais
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("pct")}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-colors ${
                      discountType === "pct" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    % Porcentagem
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">
                  {discountType === "flat" ? "Desconto (R$)" : "Desconto (%)"}
                </Label>
                <Input
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "flat" ? "20,00" : "15"}
                  className="mt-1 h-9 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="rounded-xl border border-amber-300/40 bg-card p-2 text-right">
                  <span className="text-[10px] text-muted-foreground">Valor final a lançar:</span>
                  <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {brl(netAmount)}
                  </p>
                  {calculatedDiscount > 0 && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">
                      {isEntrada ? "Desconto ao cliente: " : "Abatimento obtido: "}{brl(calculatedDiscount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Micro-Card de Impacto na Gestão (Apple Live Feedback) ─────────── */}
        <div className={`mt-4 flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${managementImpact.style}`}>
          <span className="text-lg">{managementImpact.icon}</span>
          <div className="text-xs">
            <span className="font-semibold">{managementImpact.title}: </span>
            <span className="opacity-90">{managementImpact.desc}</span>
          </div>
        </div>

        {/* ── Card Tátil de Conexão Inteligente com Estoque ────────────────── */}
        {selectedProduct && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-soft/30 p-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in-50 slide-in-from-top-2">
            <div className="flex items-center gap-3 min-w-0">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {selectedProduct.name}
                  </span>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {calcTotalStock(selectedProduct)} un. em estoque
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Peça vinculada do Estoque da loja • Categoria: {selectedProduct.category}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-primary/10 pt-2 sm:border-t-0 sm:pt-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="deduct-stock-switch"
                  checked={deductStock}
                  onCheckedChange={setDeductStock}
                />
                <Label htmlFor="deduct-stock-switch" className="cursor-pointer text-xs font-medium">
                  {isEntrada
                    ? "Dar baixa no estoque (-1 un.)"
                    : "Adicionar ao estoque (+1 un.)"}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedProductId(null);
                  setDescription("");
                }}
              >
                Desvincular
              </Button>
            </div>
          </div>
        )}

        {/* ── Seção Fiado ──────────────────────────────────────────────── */}
        {isFiado && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
            <p className="mb-3 text-xs font-semibold text-amber-800 dark:text-amber-400">
              📋 Dados do Fiado — será registrado automaticamente na aba Fiado
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente">
                <Select value={fiadoCustomerId} onValueChange={setFiadoCustomerId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione o cliente…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Nenhum cliente cadastrado
                      </SelectItem>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Vencimento do fiado">
                <Input
                  type="date"
                  value={fiadoDueDate}
                  onChange={(e) => setFiadoDueDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Botão de envio com cor dinâmica ─────────────────────────── */}
        <Button
          className={`mt-6 h-11 rounded-full px-6 font-semibold transition-colors ${btnClass}`}
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {isEntrada ? <Plus className="size-4" /> : <Minus className="size-4" />}
          {isEntrada ? "Registrar entrada" : "Registrar saída"}
        </Button>
      </section>

      {/* ── Extrato do mês ───────────────────────────────────────────────── */}
      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">
          Lançamentos de {monthLabel(month).toLowerCase()}
        </h2>
        {monthTxs.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Wallet className="size-6" />}
            title="Nenhum lançamento neste mês"
            description="Registre a primeira venda ou despesa para acompanhar o caixa em tempo real."
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {monthTxs.map((t) => {
              const linkedProd = resolveLinkedProduct(t);
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Imagem do Produto no Extrato */}
                    {linkedProd?.image_url ? (
                      <img
                        src={linkedProd.image_url}
                        alt={t.description}
                        className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
                        <Package className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                          {resolveCategory(t)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-[10px] font-medium">
                          {resolvePayment(t)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(t.occurred_on)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <p
                      className={`numeric text-sm font-semibold ${
                        t.kind === "entrada"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.kind === "entrada" ? "+" : "−"}
                      {brl(Number(t.amount))}
                    </p>
                    <ConfirmDelete
                      onConfirm={() => remove.mutate(t.id)}
                      description="O lançamento será removido do seu caixa."
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-muted-foreground"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Dialogs de criação rápida e gerenciamento ─────────────────── */}
      <QuickAddDialog
        open={addCatOpen}
        title={`Nova categoria de ${isEntrada ? "entrada" : "saída"}`}
        placeholder={isEntrada ? "Ex: Comissão de vendedora" : "Ex: Sacolas & Embalagens"}
        onConfirm={handleAddCategory}
        onClose={() => setAddCatOpen(false)}
      />
      <QuickAddDialog
        open={addPayOpen}
        title="Nova forma de pagamento"
        placeholder="Ex: Link Mercado Pago, Stone, Vale-presente"
        onConfirm={handleAddPayment}
        onClose={() => setAddPayOpen(false)}
      />
      <QuickProductDialog
        open={quickProductOpen}
        initialName={description}
        onConfirm={handleQuickCreateProduct}
        onClose={() => setQuickProductOpen(false)}
      />
      <ManageOptionsDialog
        open={manageOpen}
        storeId={storeId}
        initialTab={manageTab}
        onClose={() => setManageOpen(false)}
      />
    </div>
  );
}

// ── Campo de formulário ────────────────────────────────────────────────────
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
