import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Search,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  User,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  insertCustomer,
} from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Controle de caixa — Vestuli" },
      {
        name: "description",
        content: "Registre entradas e saídas da loja e acompanhe o saldo do dia e do mês.",
      },
      { property: "og:title", content: "Controle de caixa — Vestuli" },
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

// ── Dialog de Cadastro Rápido de Cliente (Apple Level) ─────────────────────
function QuickCustomerDialog({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: (name: string, phone: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onConfirm(name, phone);
    setName("");
    setPhone("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-5 w-5 text-primary" />
            Cadastrar Nova Cliente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Nome da Cliente</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ana Maria Silva"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">WhatsApp / Telefone (opcional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-8888"
              className="h-11 rounded-xl font-mono"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="rounded-full font-semibold" disabled={!name.trim()} onClick={handleSubmit}>
            Salvar e Selecionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

// ── Componente principal Caixa ──────────────────────────────────────────────
function Caixa() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  const [selectedProductSize, setSelectedProductSize] = useState<string>("");
  const [deductStock, setDeductStock] = useState(true);
  const [showProductPopover, setShowProductPopover] = useState(false);
  const [confirmZeroStockOpen, setConfirmZeroStockOpen] = useState(false);

  // Navegação por Teclado Desktop (produto)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  // Painel Sutil de Desconto / Promoção
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"flat" | "pct">("flat");
  const [discountValue, setDiscountValue] = useState("");

  // Data com atalhos: "hoje" | "ontem" | "custom"
  const [dateMode, setDateMode] = useState<"hoje" | "ontem" | "custom">("hoje");
  const [customDate, setCustomDate] = useState(todayISO());
  const date = dateMode === "hoje" ? todayISO() : dateMode === "ontem" ? yesterdayISO() : customDate;

  // Fiado & Cliente ─────────────────────────────────────────────────────────
  const [fiadoCustomerId, setFiadoCustomerId] = useState("");
  const [fiadoDueDate, setFiadoDueDate] = useState(todayISO());
  // Spotlight Autocomplete de Cliente
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerPopover, setShowCustomerPopover] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(-1);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Busca e Filtros no Extrato
  const [extratoSearch, setExtratoSearch] = useState("");
  const [extratoKind, setExtratoKind] = useState<"todos" | "entrada" | "saida">("todos");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const matchingCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))
      .slice(0, 8);
  }, [customers, customerSearch]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch("");
    setShowCustomerPopover(false);
    setCustomerHighlight(-1);
    if (isFiado) setFiadoCustomerId(c.id);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setFiadoCustomerId("");
    setCustomerSearch("");
    setShowCustomerPopover(false);
  };

  const handleKeyDownCustomer = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = matchingCustomers.length + 1; // +1 para "Cadastrar novo"
    if (!showCustomerPopover) {
      if (e.key === "ArrowDown") { setShowCustomerPopover(true); setCustomerHighlight(0); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setCustomerHighlight((p) => (p < total - 1 ? p + 1 : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCustomerHighlight((p) => (p > 0 ? p - 1 : total - 1)); }
    else if (e.key === "Escape") { setShowCustomerPopover(false); setCustomerHighlight(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (customerHighlight >= 0 && customerHighlight < matchingCustomers.length) {
        const c = matchingCustomers[customerHighlight];
        if (c) handleSelectCustomer(c);
      } else if (customerHighlight === matchingCustomers.length) {
        setAddCustomerOpen(true);
        setShowCustomerPopover(false);
      }
    }
  };

  // Dialogs de criação rápida
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);

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
    return Object.values(sizes).reduce((acc, n) => acc + (Math.round(toNumber(n)) || 0), 0);
  };

  // ── Puxar valor automático incondicional ao selecionar produto ────────────
  const handleSelectProduct = (product: InventoryItem) => {
    setSelectedProductId(product.id);
    setDescription(product.name);

    const sizes = (product.sizes ?? {}) as Record<string, number>;
    const entries = Object.entries(sizes);
    const firstAvailable = entries.find(([, q]) => q > 0)?.[0] ?? entries[0]?.[0] ?? "";
    setSelectedProductSize(firstAvailable);

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
    if (category === "estorno_devolucao") return "Ex: Devolução de vestido tamanho M por estorno Pix…";
    if (category === "perda_avaria") return "Ex: Peça rasgada/manchada no provador ou furto…";
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
        title: "Novas Peças (Compra)",
        desc: "Investimento para trazer mais roupas e novidades para a loja.",
        style: "border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-400",
      };
    }
    if (category === "estorno_devolucao") {
      return {
        icon: "🔄",
        title: "Estorno / Devolução de Cliente",
        desc: "Devolve o valor à cliente e retorna a peça intacta ao estoque de venda (+1 un.).",
        style: "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400",
      };
    }
    if (category === "perda_avaria") {
      return {
        icon: "⚠️",
        title: "Perda / Avaria de Estoque",
        desc: "Registra o prejuízo da peça danificada/furtada e dá baixa no estoque (-1 un.).",
        style: "border-rose-200 bg-rose-50/50 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-400",
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
    setSelectedProductSize("");
    // Fix 7: reseta o cliente para não vazar cliente de fiado numa saída
    handleClearCustomer();
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

  const handleCreateCustomer = async (name: string, phone: string) => {
    try {
      const res = await insertCustomer(storeId, name, phone);
      const newId = (res as { id?: string })?.id ?? "";
      toast.success(`Cliente "${name}" cadastrada com sucesso!`);
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (newId) {
        setSelectedCustomerId(newId);
        if (isFiado) setFiadoCustomerId(newId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente");
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
  // Fix 2: calcula estornos para exibir hint transparente no card de Entradas
  const monthRefunds = monthTxs
    .filter((t) => t.kind === "saida" && t.category === "estorno_devolucao")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const todayBalance = sumBy(todayTxs, "entrada") - sumBy(todayTxs, "saida");

  // ── Mutações ──────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Descreva o lançamento");
      if (grossAmount > 0 && calculatedDiscount >= grossAmount) {
        throw new Error(
          `O desconto (${brl(calculatedDiscount)}) não pode ser igual ou maior que o valor bruto (${brl(grossAmount)}). Reduza o desconto para lançar.`,
        );
      }
      if (netAmount <= 0) throw new Error("Informe um valor maior que zero");

      // Monta a descrição final (acrescentando cliente e nota de desconto se houver)
      let finalDescription = description.trim();
      const activeCustId = isFiado ? fiadoCustomerId : selectedCustomerId;
      const linkedCustomer = customers.find((c) => c.id === activeCustId);
      if (linkedCustomer && !finalDescription.toLowerCase().includes(linkedCustomer.name.toLowerCase())) {
        finalDescription += ` [Cliente: ${linkedCustomer.name}]`;
      }
      if (calculatedDiscount > 0) {
        finalDescription += ` [Desconto: ${brl(calculatedDiscount)}]`;
      }
      if (selectedProductId && selectedProductSize && !finalDescription.toLowerCase().includes(selectedProductSize.toLowerCase())) {
        finalDescription += ` [Tam: ${selectedProductSize}]`;
      }

      // Baixa/Acréscimo automático de estoque se vinculado a produto do estoque
      if (selectedProductId && deductStock) {
        let delta = -1;
        if (isEntrada) {
          delta = -1; // Venda de produto: sai 1 un do estoque
        } else if (category === "estorno_devolucao" || category === "compra_estoque") {
          delta = 1; // Devolução de cliente ou nova compra: entra 1 un no estoque
        } else if (category === "perda_avaria") {
          delta = -1; // Peça avariada ou perdida: baixa 1 un do estoque
        } else {
          delta = -1; // Padrão para saídas com peça vinculada
        }

        // Passa o tamanho exato selecionado
        await adjustInventoryStock(storeId, selectedProductId, delta, selectedProductSize || undefined);
        void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }

      if (isFiado) {
        if (!fiadoCustomerId) throw new Error("Selecione o cliente para registrar o fiado");
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
          ? "Venda a prazo registrada na aba Fiado e peça baixada do estoque!"
          : `Lançamento registrado e estoque ${category === "estorno_devolucao" || category === "compra_estoque" ? "atualizado (+1 un.)" : "atualizado (-1 un.)"}!`
        : isFiado
        ? "Venda a prazo registrada na aba Fiado!"
        : "Lançamento registrado";

      toast.success(msg);
      setDescription("");
      setAmount("");
      setShowDiscount(false);
      setDiscountValue("");
      setSelectedProductId(null);
      setSelectedProductSize("");
      setSelectedCustomerId("");
      setDeductStock(true);
      setFiadoCustomerId("");
      setFiadoDueDate(todayISO());
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (isFiado) void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleTriggerSubmit = () => {
    if (isEntrada && deductStock && selectedProduct) {
      const sizesRecord = (selectedProduct.sizes ?? {}) as Record<string, number>;
      const sizeKeys = Object.keys(sizesRecord);

      // Caso 1: peça tem grade normal e tamanho selecionado com estoque zerado
      if (selectedProductSize && sizeKeys.length > 0) {
        const qtyInSize = Number(sizesRecord[selectedProductSize] ?? 0);
        if (qtyInSize <= 0) {
          setConfirmZeroStockOpen(true);
          return;
        }
      }

      // Caso 2: peça de Tamanho Único com estoque total zerado (sem chips de grade)
      if (!selectedProductSize && (sizeKeys.length === 0)) {
        // Nenhum tamanho cadastrado — estoque totalmente zerado
        setConfirmZeroStockOpen(true);
        return;
      }
      if (!selectedProductSize && sizeKeys.length > 0) {
        // Peça com tamanhos mas nenhum chip selecionado — verifica estoque total
        const totalQty = Object.values(sizesRecord).reduce((a, b) => a + Number(b || 0), 0);
        if (totalQty <= 0) {
          setConfirmZeroStockOpen(true);
          return;
        }
      }
    }
    create.mutate();
  };

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTransaction(storeId, id),
    onSuccess: () => {
      toast.success("Lançamento excluído");
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
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

  // ── Extrato Filtrado e Buscado Instantaneamente ───────────────────────────
  const filteredMonthTxs = useMemo(() => {
    return monthTxs.filter((t) => {
      const matchesKind = extratoKind === "todos" || t.kind === extratoKind;
      if (!matchesKind) return false;
      if (!extratoSearch.trim()) return true;
      const q = extratoSearch.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(q);
      const catMatch = resolveCategory(t).toLowerCase().includes(q);
      const payMatch = resolvePayment(t).toLowerCase().includes(q);
      return descMatch || catMatch || payMatch;
    });
  }, [monthTxs, extratoKind, extratoSearch, customOpts]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Entradas do mês"
          value={brl(revenue)}
          tone="positive"
          icon={<ArrowUpRight className="size-4" />}
          hint={
            monthRefunds > 0
              ? `Receita líquida: ${brl(revenue - monthRefunds)} após ${brl(monthRefunds)} em estornos`
              : `${monthTxs.filter((t) => t.kind === "entrada").length} entrada${monthTxs.filter((t) => t.kind === "entrada").length !== 1 ? "s" : ""} confirmada${monthTxs.filter((t) => t.kind === "entrada").length !== 1 ? "s" : ""} no mês`
          }
        />
        <StatCard
          label="Total de saídas"
          value={brl(expenses)}
          tone="negative"
          icon={<ArrowDownRight className="size-4" />}
          hint={
            monthRefunds > 0
              ? `Despesas operacionais: ${brl(expenses - monthRefunds)} (${brl(monthRefunds)} em estornos)`
              : `${monthTxs.filter((t) => t.kind === "saida").length} despesa${monthTxs.filter((t) => t.kind === "saida").length !== 1 ? "s" : ""} registrada${monthTxs.filter((t) => t.kind === "saida").length !== 1 ? "s" : ""} no mês`
          }
        />
        <StatCard
          label="Saldo de hoje"
          value={brl(todayBalance)}
          tone={todayBalance >= 0 ? "primary" : "negative"}
          icon={<Wallet className="size-4" />}
          hint={`${todayTxs.length} lançamento${todayTxs.length !== 1 ? "s" : ""} hoje`}
        />
        <StatCard
          label="Resultado do mês"
          value={brl(revenue - expenses)}
          tone={revenue - expenses >= 0 ? "positive" : "negative"}
          icon={revenue - expenses >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          hint={revenue > 0 ? `Margem ${((revenue - expenses) / revenue * 100).toFixed(1).replace(".", ",")}%` : "Sem receita no mês"}
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

          {/* Categoria com "+ Nova categoria" e "⚙️ Gerenciar nas Configurações" */}
          <Field label="Categoria">
            <Select
              value={category}
              onValueChange={(v) => {
                if (v === "__add_new__") { setAddCatOpen(true); return; }
                if (v === "__manage_cat__") {
                  void navigate({ to: "/configuracoes" });
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
                  Gerenciar categorias em Configurações…
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Forma de Pagamento com "+ Nova forma" e "⚙️ Gerenciar nas Configurações" */}
          <Field label="Forma de pagamento">
            <Select
              value={method}
              onValueChange={(v) => {
                if (v === "__add_pay__") { setAddPayOpen(true); return; }
                if (v === "__manage_pay__") {
                  void navigate({ to: "/configuracoes" });
                  return;
                }
                setMethod(v);
                if (v === "fiado" && selectedCustomerId) {
                  setFiadoCustomerId(selectedCustomerId);
                }
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
                  Gerenciar pagamentos em Configurações…
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Cliente (Busca Spotlight / Autocomplete Apple Level — Exibido no grid superior APENAS se não for Fiado) */}
          {!isFiado && (
            <Field label="Cliente (Opcional)" className="relative">
              <div className="relative">
                <Input
                  ref={customerInputRef}
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onFocus={() => {
                    if (!selectedCustomer) setShowCustomerPopover(true);
                  }}
                  onKeyDown={handleKeyDownCustomer}
                  onChange={(e) => {
                    if (selectedCustomer) handleClearCustomer();
                    setCustomerSearch(e.target.value);
                    setShowCustomerPopover(true);
                  }}
                  placeholder={
                    isEntrada
                      ? "Digite o nome ou telefone da cliente…"
                      : "Digite o nome ou telefone para estorno/devolução…"
                  }
                  className="h-11 rounded-xl pr-9"
                />
                {selectedCustomer ? (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                )}
              </div>

              {/* Menu Dropdown Autocomplete de Clientes */}
              {showCustomerPopover && !selectedCustomer && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCustomerPopover(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
                    {matchingCustomers.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          👤 Clientes Encontradas ({matchingCustomers.length})
                        </div>
                        {matchingCustomers.map((c, idx) => {
                          const isHighlighted = idx === customerHighlight;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                                isHighlighted
                                  ? "bg-primary/10 border border-primary/30 text-primary shadow-sm"
                                  : "hover:bg-primary-soft/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium leading-tight">{c.name}</p>
                                  {c.phone && <p className="text-[11px] font-mono text-muted-foreground">{c.phone}</p>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        <div className="my-1.5 h-px bg-border" />
                      </>
                    ) : null}

                    {/* Atalho Inteligente para Cadastrar Nova Cliente */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerPopover(false);
                        setAddCustomerOpen(true);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-primary transition-all hover:bg-primary-soft/50 ${
                        customerHighlight === matchingCustomers.length ? "bg-primary/10" : ""
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {customerSearch.trim()
                        ? `Cadastrar "${customerSearch.trim()}" na base`
                        : "Cadastrar nova cliente…"}
                    </button>
                  </div>
                </>
              )}
            </Field>
          )}

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
                <div className="space-y-1.5">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                  {customDate > todayISO() && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      ⚠️ Data futura selecionada: este lançamento entrará no fluxo de caixa de {customDate.slice(0, 7)}.
                    </p>
                  )}
                </div>
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

            {grossAmount > 0 && calculatedDiscount >= grossAmount && (
              <div className="mt-3 rounded-xl bg-destructive/15 p-2.5 text-xs font-medium text-destructive">
                ⚠️ O desconto ({brl(calculatedDiscount)}) zera ou supera o valor bruto ({brl(grossAmount)}). Reduza o desconto para lançar.
              </div>
            )}
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
          <div className="mt-4 flex flex-col gap-3.5 rounded-2xl border border-primary/20 bg-primary-soft/30 p-4 animate-in fade-in-50 slide-in-from-top-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      {calcTotalStock(selectedProduct)} un. no total
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Peça vinculada do Estoque • Categoria: {selectedProduct.category}
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
                      : category === "perda_avaria"
                      ? "Dar baixa por perda/avaria no estoque (-1 un.)"
                      : "Adicionar ao estoque (+1 un.)"}
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    setSelectedProductId(null);
                    setSelectedProductSize("");
                    setDescription("");
                  }}
                >
                  Desvincular
                </Button>
              </div>
            </div>

            {/* Seletor de Tamanho da Peça (Apple UI Chips) */}
            {(() => {
              const sizesRecord = (selectedProduct.sizes ?? {}) as Record<string, number>;
              const entries = Object.entries(sizesRecord);
              if (entries.length === 0 || (entries.length === 1 && entries[0]?.[0] === "Único")) return null;
              return (
                <div className="border-t border-primary/15 pt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-foreground">
                      Tamanho da peça movimentada:
                    </span>
                    {selectedProductSize && (
                      <span className="text-[10px]">
                        {(sizesRecord[selectedProductSize] ?? 0) > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {sizesRecord[selectedProductSize]} un. disponíveis no tamanho {selectedProductSize}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            ⚠️ Tamanho {selectedProductSize} está esgotado
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entries.map(([sz, qty]) => {
                      const isSelected = selectedProductSize === sz;
                      const isZero = qty <= 0;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedProductSize(sz)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                              : isZero
                              ? "border border-border bg-card/60 text-muted-foreground/70 hover:border-primary/40"
                              : "border border-border bg-card text-foreground hover:border-primary/50 shadow-2xs"
                          }`}
                        >
                          <span>{sz}</span>
                          <span
                            className={`text-[10px] ${
                              isSelected ? "text-primary-foreground/85 font-normal" : "text-muted-foreground"
                            }`}
                          >
                            ({qty} un.)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Seção Fiado (Card Autoritativo e Único com Spotlight + Vencimento) ─────────────── */}
        {isFiado && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-800/40 dark:bg-amber-950/30 animate-in fade-in-50 slide-in-from-top-2">
            <p className="mb-3.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
              📋 Dados do Fiado — será registrado automaticamente na aba Fiado
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente (Obrigatório para Fiado)" className="relative">
                <div className="relative">
                  <Input
                    ref={customerInputRef}
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onFocus={() => {
                      if (!selectedCustomer) setShowCustomerPopover(true);
                    }}
                    onKeyDown={handleKeyDownCustomer}
                    onChange={(e) => {
                      if (selectedCustomer) handleClearCustomer();
                      setCustomerSearch(e.target.value);
                      setShowCustomerPopover(true);
                    }}
                    placeholder="Selecione ou busque a cliente pelo nome/telefone…"
                    className="h-11 rounded-xl pr-9 bg-white dark:bg-card"
                  />
                  {selectedCustomer ? (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown Autocomplete no Fiado */}
                {showCustomerPopover && !selectedCustomer && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCustomerPopover(false)}
                    />
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-amber-200 bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
                      {matchingCustomers.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            👤 Clientes Encontradas ({matchingCustomers.length})
                          </div>
                          {matchingCustomers.map((c, idx) => {
                            const isHighlighted = idx === customerHighlight;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectCustomer(c)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                                  isHighlighted
                                    ? "bg-amber-100 border border-amber-300 text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-200"
                                    : "hover:bg-primary-soft/50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-bold dark:bg-amber-800 dark:text-amber-100">
                                    {c.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium leading-tight">{c.name}</p>
                                    {c.phone && <p className="text-[11px] font-mono text-muted-foreground">{c.phone}</p>}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          <div className="my-1.5 h-px bg-border" />
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerPopover(false);
                          setAddCustomerOpen(true);
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-primary transition-all hover:bg-primary-soft/50 ${
                          customerHighlight === matchingCustomers.length ? "bg-primary/10" : ""
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        {customerSearch.trim()
                          ? `Cadastrar "${customerSearch.trim()}" na base`
                          : "Cadastrar nova cliente…"}
                      </button>
                    </div>
                  </>
                )}
              </Field>

              <Field label="Vencimento do fiado">
                <Input
                  type="date"
                  value={fiadoDueDate}
                  onChange={(e) => setFiadoDueDate(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-card"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Botão de envio com cor dinâmica ─────────────────────────── */}
        <Button
          className={`mt-6 h-11 rounded-full px-6 font-semibold transition-colors cursor-pointer ${btnClass}`}
          disabled={create.isPending}
          onClick={handleTriggerSubmit}
        >
          {isEntrada ? <Plus className="size-4" /> : <Minus className="size-4" />}
          {isEntrada ? "Registrar entrada" : "Registrar saída"}
        </Button>

        {/* ── Diálogo Guardrail de Venda com Estoque Zerado (Apple UX) ───────── */}
        <AlertDialog open={confirmZeroStockOpen} onOpenChange={setConfirmZeroStockOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Peça esgotada no estoque</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedProductSize ? (
                  <>
                    O tamanho <strong className="font-semibold text-foreground">{selectedProductSize}</strong> de{" "}
                    <strong className="font-semibold text-foreground">{selectedProduct?.name}</strong> consta com{" "}
                    <strong className="font-semibold text-destructive">0 unidades</strong> no estoque.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-foreground">{selectedProduct?.name}</strong> está com{" "}
                    <strong className="font-semibold text-destructive">estoque zerado</strong>.
                  </>
                )}
                <br />
                <br />
                Deseja registrar a venda no caixa mesmo assim? O estoque permanecerá zerado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                {selectedProductSize ? "Trocar tamanho" : "Cancelar"}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                onClick={() => {
                  setConfirmZeroStockOpen(false);
                  create.mutate();
                }}
              >
                Sim, confirmar venda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* ── Extrato do mês ───────────────────────────────────────────────── */}
      <section className="panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              Lançamentos de {monthLabel(month).toLowerCase()}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredMonthTxs.length} {filteredMonthTxs.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros rápidos: Todos / Entradas / Saídas */}
            <div className="inline-flex rounded-full bg-surface-muted p-1 text-xs font-semibold">
              {(["todos", "entrada", "saida"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExtratoKind(k)}
                  className={`rounded-full px-3 py-1 transition-all ${
                    extratoKind === k
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k === "todos" ? "Todos" : k === "entrada" ? "Entradas" : "Saídas"}
                </button>
              ))}
            </div>

            {/* Input de Busca Instantânea */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={extratoSearch}
                onChange={(e) => setExtratoSearch(e.target.value)}
                placeholder="Buscar por cliente, peça…"
                className="h-8 rounded-full pl-8 pr-3 text-xs bg-card"
              />
              {extratoSearch && (
                <button
                  type="button"
                  onClick={() => setExtratoSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {monthTxs.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Wallet className="size-6" />}
            title="Nenhum lançamento neste mês"
            description="Registre a primeira venda ou despesa para acompanhar o caixa em tempo real."
          />
        ) : filteredMonthTxs.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Search className="size-6" />}
            title="Nenhum lançamento encontrado"
            description={`Nenhum resultado corresponde à busca "${extratoSearch}". Tente outro termo ou limpe o filtro.`}
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {filteredMonthTxs.map((t) => {
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
      <QuickCustomerDialog
        open={addCustomerOpen}
        onConfirm={handleCreateCustomer}
        onClose={() => setAddCustomerOpen(false)}
      />
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
