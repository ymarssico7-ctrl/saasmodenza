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
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  X,
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
  type CustomOption,
} from "@/lib/custom-options";
import { useStore } from "@/lib/store-context";
import { insertTransaction, deleteTransaction, insertCredit, adjustInventoryStock } from "@/lib/mutations";

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

// ── Dialog de criação rápida ─────────────────────────────────────────────────
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

// ── Componente principal ─────────────────────────────────────────────────────
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
    cost_price: number | null;
    image_url: string | null;
    sizes: Record<string, number> | null;
  };
  const inventoryItems = rawInventory as unknown as InventoryItem[];

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

  const calcTotalStock = (item: InventoryItem) => {
    const sizes = item.sizes ?? {};
    return Object.values(sizes).reduce((acc, n) => acc + Number(n), 0);
  };

  const handleSelectProduct = (product: InventoryItem) => {
    setSelectedProductId(product.id);
    setDescription(product.name);
    const priceToUse = kind === "entrada"
      ? product.selling_price
      : product.cost_price ?? product.selling_price;
    if (priceToUse > 0) setAmount(String(priceToUse).replace(".", ","));
    setShowProductPopover(false);
  };

  // Data com atalhos: "hoje" | "ontem" | "custom"
  const [dateMode, setDateMode] = useState<"hoje" | "ontem" | "custom">("hoje");
  const [customDate, setCustomDate] = useState(todayISO());
  const date = dateMode === "hoje" ? todayISO() : dateMode === "ontem" ? yesterdayISO() : customDate;

  // Fiado
  const [fiadoCustomerId, setFiadoCustomerId] = useState("");
  const [fiadoDueDate, setFiadoDueDate] = useState(todayISO());

  // Dialogs de criação rápida
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addPayOpen, setAddPayOpen] = useState(false);

  const isFiado = method === "fiado" && kind === "entrada";

  // ── Listas combinadas (padrão + custom) ──────────────────────────────────
  const baseEntryCategories = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
  const baseExitCategories = EXIT_CATEGORIES as readonly { value: string; label: string }[];
  const basePaymentMethods = PAYMENT_METHODS as readonly { value: string; label: string }[];

  const categories: { value: string; label: string }[] =
    kind === "entrada"
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
  };

  // ── Handlers de criação rápida ────────────────────────────────────────────
  const handleAddCategory = (label: string) => {
    const opt: CustomOption =
      kind === "entrada"
        ? addCustomEntry(storeId, label)
        : addCustomExit(storeId, label);
    setCategory(opt.value);
  };

  const handleAddPayment = (label: string) => {
    const opt = addCustomPaymentMethod(storeId, label);
    setMethod(opt.value);
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
      const value = toNumber(amount);
      if (!description.trim()) throw new Error("Descreva o lançamento");
      if (value <= 0) throw new Error("Informe um valor maior que zero");

      // Baixa/Acréscimo automático de estoque se vinculado a produto do estoque
      if (selectedProductId && deductStock) {
        const delta = kind === "entrada" ? -1 : 1;
        await adjustInventoryStock(storeId, selectedProductId, delta);
        void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }

      if (isFiado) {
        if (!fiadoCustomerId) throw new Error("Selecione o cliente para registrar o fiado");
        await insertTransaction({
          storeId,
          kind,
          description: description.trim(),
          amount: value,
          category,
          payment_method: "fiado",
          occurred_on: date,
        });
        await insertCredit({
          storeId,
          customer_id: fiadoCustomerId,
          description: description.trim(),
          amount: value,
          purchase_date: date,
          due_date: fiadoDueDate,
        });
        return;
      }

      return insertTransaction({
        storeId,
        kind,
        description: description.trim(),
        amount: value,
        category,
        payment_method: method,
        occurred_on: date,
      });
    },
    onSuccess: () => {
      const msg = selectedProductId && deductStock
        ? isFiado
          ? "Fiado registrado e estoque atualizado!"
          : `Lançamento registrado e estoque ${kind === "entrada" ? "atualizado (-1 un.)" : "atualizado (+1 un.)"}!`
        : isFiado
        ? "Fiado registrado no caixa e na aba Fiado!"
        : "Lançamento registrado";

      toast.success(msg);
      setDescription("");
      setAmount("");
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

  // ── Helpers de label ──────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  const isEntrada = kind === "entrada";
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
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSelectedProductId(null);
                  setShowProductPopover(true);
                }}
                placeholder={isEntrada ? "Digite ou selecione uma peça do estoque…" : "Aluguel da loja ou peça do estoque"}
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

            {/* Menu Dropdown de Produtos do Estoque */}
            {showProductPopover && matchingProducts.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProductPopover(false)}
                />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    📦 Produtos no Estoque ({matchingProducts.length})
                  </div>
                  {matchingProducts.map((p) => {
                    const st = calcTotalStock(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-soft/50"
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
                </div>
              </>
            )}
          </Field>

          <Field label="Valor (R$)">
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
          </Field>

          {/* Categoria com "+ Nova categoria" */}
          <Field label="Categoria">
            <Select
              value={category}
              onValueChange={(v) => {
                if (v === "__add_new__") { setAddCatOpen(true); return; }
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
              </SelectContent>
            </Select>
          </Field>

          {/* Forma de Pagamento com "+ Nova forma" */}
          <Field label="Forma de pagamento">
            <Select
              value={method}
              onValueChange={(v) => {
                if (v === "__add_pay__") { setAddPayOpen(true); return; }
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
                  Peça vinculada do Estoque da loja
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
            {monthTxs.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
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
                <div className="flex shrink-0 items-center gap-2">
                  <p
                    className={`numeric text-sm font-semibold ${
                      t.kind === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
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
            ))}
          </ul>
        )}
      </section>

      {/* ── Dialogs de criação rápida ─────────────────────────────────── */}
      <QuickAddDialog
        open={addCatOpen}
        title={`Nova categoria de ${kind === "entrada" ? "entrada" : "saída"}`}
        placeholder={kind === "entrada" ? "Ex: Comissão de vendedora" : "Ex: Sacolas & Embalagens"}
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
