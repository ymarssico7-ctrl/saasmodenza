import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  CreditCard,
  Minus,
  Package,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Search,
  RotateCcw,
  Settings,
  ShoppingBag,
  TrendingUp,
  Trash2,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
      { title: "Controle de caixa — Vestui" },
      {
        name: "description",
        content: "Registre entradas e saídas da loja e acompanhe o saldo do dia e do mês.",
      },
      { property: "og:title", content: "Controle de caixa — Vestui" },
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
                <SelectTrigger className="h-12 rounded-2xl bg-card border-border/70 text-xs font-medium shadow-2xs">
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


// ── Mini Date Range Picker (Apple-level, zero deps) ─────────────────────────
function MiniDateRangePicker({
  start,
  end,
  onChange,
  onClose,
}: {
  start: string;
  end: string;
  onChange: (s: string, e: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Helper seguro para formatar "12 de set." sem desvios de fuso horário
  const formatShort = (iso: string) => {
    if (!iso) return "—";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };

  // viewYear/viewMonth controlam o mês da coluna ESQUERDA
  const [viewYear, setViewYear] = useState(() => {
    if (start) {
      const p = start.split("-");
      if (p[0]) return Number(p[0]);
    }
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (start) {
      const p = start.split("-");
      if (p[1]) return Number(p[1]) - 1;
    }
    return today.getMonth();
  });

  // Máquina de estados:
  // "idle": exibe start e end confirmados
  // "selecting": usuário clicou na 1ª data (tempStart). Range preview só existe se hoverDay !== null!
  const [phase, setPhase] = useState<"idle" | "selecting">("idle");
  const [tempStart, setTempStart] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  const rightMonth = (viewMonth + 1) % 12;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  function goLeft() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function goRight() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function getDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startPad = (firstDay + 6) % 7; // Seg = 0, Dom = 6
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  function dayStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Clique em um dia
  function handleDayClick(ds: string) {
    if (phase === "idle") {
      // 1º clique: Inicia nova seleção limpa. Nenhum dia fantasma!
      setTempStart(ds);
      setHoverDay(null);
      setPhase("selecting");
    } else {
      // 2º clique:
      if (!tempStart) {
        setTempStart(ds);
        return;
      }
      if (ds === tempStart) {
        // Clicou no mesmo dia -> Seleciona DIA ÚNICO [D, D]
        onChange(ds, ds);
        onClose();
        return;
      }
      let s = tempStart;
      let e = ds;
      if (e < s) [s, e] = [e, s];
      onChange(s, e);
      onClose();
    }
  }

  // Aplica dia único explicitamente
  function handleApplySingleDay() {
    if (tempStart) {
      onChange(tempStart, tempStart);
      onClose();
    }
  }

  // Atalhos rápidos
  function applyPreset(s: string, e: string) {
    onChange(s, e);
    onClose();
  }

  // Verifica se o dia é exatamente o início ativo
  function isStartDay(ds: string) {
    if (phase === "selecting") {
      if (!tempStart) return false;
      if (hoverDay && hoverDay < tempStart) return ds === hoverDay;
      return ds === tempStart;
    }
    const [lo] = start <= end ? [start, end] : [end, start];
    return ds === lo;
  }

  // Verifica se o dia é exatamente o término ativo
  function isEndDay(ds: string) {
    if (phase === "selecting") {
      if (!tempStart) return false;
      if (!hoverDay || hoverDay === tempStart) return false;
      if (hoverDay < tempStart) return ds === tempStart;
      return ds === hoverDay;
    }
    if (!start || !end || start === end) return false;
    const [, hi] = start <= end ? [start, end] : [end, start];
    return ds === hi;
  }

  // Verifica se o dia está DENTRO do intervalo (exclui endpoints)
  function isBetweenRange(ds: string) {
    if (phase === "selecting") {
      // Durante seleção, SÓ destaca se houver hover ativo e diferente de tempStart
      if (!tempStart || !hoverDay || hoverDay === tempStart) return false;
      const [lo, hi] = tempStart <= hoverDay ? [tempStart, hoverDay] : [hoverDay, tempStart];
      return ds > lo && ds < hi;
    }
    // Estado idle: destaca entre start e end confirmados
    if (!start || !end || start === end) return false;
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    return ds > lo && ds < hi;
  }



  // Textos para o cabeçalho dinâmico
  const headerStartText = phase === "selecting"
    ? (hoverDay && tempStart && hoverDay < tempStart ? formatShort(hoverDay) : formatShort(tempStart ?? ""))
    : formatShort(start);

  const headerEndText = phase === "selecting"
    ? (hoverDay && tempStart
        ? (hoverDay > tempStart ? formatShort(hoverDay) : formatShort(tempStart))
        : "Selecione o fim...")
    : formatShort(end);

  const sevenDaysAgoStr = () => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  };
  const firstOfMonthStr = () => todayStr.slice(0, 8) + "01";

  return (
    <div
      className="absolute left-0 top-full z-30 mt-1.5 rounded-2xl border border-border/70 bg-card shadow-xl animate-in fade-in-50 zoom-in-95 p-5 w-[320px] sm:w-[580px] max-w-[calc(100vw-32px)]"
      onMouseLeave={() => phase === "selecting" && setHoverDay(null)}
    >
      {/* Cabeçalho Reativo Dinâmico */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 text-[11px]">
          <span className={phase === "selecting" ? "font-bold text-foreground underline underline-offset-4 decoration-primary" : "font-semibold text-foreground"}>
            {headerStartText}
          </span>
          <span className="text-muted-foreground/40 font-normal">→</span>
          <span className={phase === "selecting" && !hoverDay ? "text-muted-foreground/60 italic" : "font-semibold text-foreground"}>
            {headerEndText}
          </span>
          {phase === "selecting" && (
            <span className="ml-1.5 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary animate-in fade-in-50">
              {hoverDay ? "Clique para confirmar" : "Clique no dia final"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg p-1 hover:bg-surface-muted transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Grids mensais com setas inline nos títulos */}
      <div className="flex gap-6 mb-3">
        {/* Mês ESQUERDO com seta ‹ no título (e seta › apenas no mobile) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goLeft}
              className="rounded-xl p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-[11px] font-bold text-foreground">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goRight}
              className="sm:hidden rounded-xl p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <div className="hidden sm:block size-5" /> {/* spacer para alinhar título ao centro no desktop */}
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["S","T","Q","Q","S","S","D"].map((l, i) => (
              <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground/60 py-0.5">
                {l}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {getDays(viewYear, viewMonth).map((d, i) => {
              if (!d) return <div key={`lpad-${i}`} className="h-8 w-8" />;
              const ds = dayStr(viewYear, viewMonth, d);
              const isS = isStartDay(ds);
              const isE = isEndDay(ds);
              const isMid = isBetweenRange(ds);
              const isT = ds === todayStr;
              const hasRange = phase === "selecting" ? (tempStart && hoverDay && tempStart !== hoverDay) : (start && end && start !== end);
              const rangeBg = isMid
                ? "bg-foreground/[0.07]"
                : isS && hasRange
                ? "bg-gradient-to-r from-transparent 50% to-foreground/[0.07] 50%"
                : isE && hasRange
                ? "bg-gradient-to-l from-transparent 50% to-foreground/[0.07] 50%"
                : "";
              return (
                <div
                  key={ds}
                  className={`relative flex items-center justify-center h-8 w-full ${rangeBg}`}
                  onMouseEnter={() => phase === "selecting" && setHoverDay(ds)}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(ds)}
                    className={[
                      "relative flex flex-col items-center justify-center size-8 rounded-full text-[11px] transition-all cursor-pointer select-none z-10",
                      isS || isE ? "bg-foreground text-background font-bold shadow-xs scale-105"
                        : isMid ? "text-foreground font-medium hover:bg-foreground/15"
                        : "text-foreground hover:bg-surface-muted",
                    ].join(" ")}
                  >
                    <span>{d}</span>
                    {isT && !isS && !isE && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary/80" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divisor */}
        <div className="hidden sm:block w-px bg-border/40 self-stretch" />

        {/* Mês DIREITO com seta › no título (oculto no mobile) */}
        <div className="hidden sm:block flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="size-5" /> {/* spacer */}
            <span className="text-[11px] font-bold text-foreground">
              {monthNames[rightMonth]} {rightYear}
            </span>
            <button
              type="button"
              onClick={goRight}
              className="rounded-xl p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["S","T","Q","Q","S","S","D"].map((l, i) => (
              <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground/60 py-0.5">
                {l}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {getDays(rightYear, rightMonth).map((d, i) => {
              if (!d) return <div key={`rpad-${i}`} className="h-8 w-8" />;
              const ds = dayStr(rightYear, rightMonth, d);
              const isS = isStartDay(ds);
              const isE = isEndDay(ds);
              const isMid = isBetweenRange(ds);
              const isT = ds === todayStr;
              const hasRange = phase === "selecting" ? (tempStart && hoverDay && tempStart !== hoverDay) : (start && end && start !== end);
              const rangeBg = isMid
                ? "bg-foreground/[0.07]"
                : isS && hasRange
                ? "bg-gradient-to-r from-transparent 50% to-foreground/[0.07] 50%"
                : isE && hasRange
                ? "bg-gradient-to-l from-transparent 50% to-foreground/[0.07] 50%"
                : "";
              return (
                <div
                  key={ds}
                  className={`relative flex items-center justify-center h-8 w-full ${rangeBg}`}
                  onMouseEnter={() => phase === "selecting" && setHoverDay(ds)}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(ds)}
                    className={[
                      "relative flex flex-col items-center justify-center size-8 rounded-full text-[11px] transition-all cursor-pointer select-none z-10",
                      isS || isE ? "bg-foreground text-background font-bold shadow-xs scale-105"
                        : isMid ? "text-foreground font-medium hover:bg-foreground/15"
                        : "text-foreground hover:bg-surface-muted",
                    ].join(" ")}
                  >
                    <span>{d}</span>
                    {isT && !isS && !isE && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary/80" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rodapé com Atalhos e Ação Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/40">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/60 mr-0.5">Atalhos:</span>
          <button
            type="button"
            onClick={() => applyPreset(todayStr, todayStr)}
            className="rounded-lg border border-border/60 bg-surface-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-muted cursor-pointer transition-colors"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => applyPreset(sevenDaysAgoStr(), todayStr)}
            className="rounded-lg border border-border/60 bg-surface-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-muted cursor-pointer transition-colors"
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => applyPreset(firstOfMonthStr(), todayStr)}
            className="rounded-lg border border-border/60 bg-surface-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-muted cursor-pointer transition-colors"
          >
            Este mês
          </button>
        </div>

        {/* Botão contextual: se está selecionando, permite aplicar apenas aquele dia */}
        {phase === "selecting" && tempStart && (
          <button
            type="button"
            onClick={handleApplySingleDay}
            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 cursor-pointer transition-colors animate-in fade-in-50"
          >
            Apenas este dia
          </button>
        )}
      </div>
    </div>
  );
}

// ── Constantes estáticas de base ────────────────────────────────────────────
const baseEntryCategories = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
const baseExitCategories = EXIT_CATEGORIES as readonly { value: string; label: string }[];
const basePaymentMethods = PAYMENT_METHODS as readonly { value: string; label: string }[];

// ── Componente principal Caixa ──────────────────────────────────────────────
function Caixa() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { storeId } = useStore();
  const pendingOrdersCount = useMemo(() => {
    if (!storeId) return 0;
    try {
      const raw = localStorage.getItem(`vestui_orders_${storeId}`);
      if (!raw) return 0;
      const orders: { status?: string }[] = JSON.parse(raw);
      return orders.filter((o) => o.status === "novo").length;
    } catch {
      return 0;
    }
  }, [storeId]);
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

  type SaleBasketItem = {
    id: string;
    productId?: string;
    productName: string;
    size?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deductStock: boolean;
  };

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [kind, setKind] = useState<"entrada" | "saida">("entrada");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("venda_produto");
  const [method, setMethod] = useState("pix");
  const [cashReceived, setCashReceived] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Conexão Inteligente com Estoque & Quantidade
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductSize, setSelectedProductSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [basket, setBasket] = useState<SaleBasketItem[]>([]);
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

  // ── Gestão Temporal & Busca Spotlight no Extrato ──────────────────────────
  const [extratoSearch, setExtratoSearch] = useState("");
  const [extratoKind, setExtratoKind] = useState<"todos" | "entrada" | "saida">("todos");
  const [monthOffset, setMonthOffset] = useState(0);
  const [periodMode, setPeriodMode] = useState<"month" | "custom">("month");
  const [customRangeStart, setCustomRangeStart] = useState(() => todayISO().slice(0, 8) + "01");
  const [customRangeEnd, setCustomRangeEnd] = useState(todayISO());
  const [showExtratoSearchPopover, setShowExtratoSearchPopover] = useState(false);
  const [activeFilterChip, setActiveFilterChip] = useState<string | null>(null);
  const extratoSearchInputRef = useRef<HTMLInputElement>(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

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

  // ── Seleção e Adição Fluida de Produtos ───────────────────────────────────
  const handleSelectProduct = (product: InventoryItem) => {
    const sizes = (product.sizes ?? {}) as Record<string, number>;
    const entries = Object.entries(sizes);
    const firstAvailable = entries.find(([, q]) => q > 0)?.[0] ?? entries[0]?.[0] ?? "";

    const priceToUse = isEntrada
      ? product.selling_price
      : (product.cost_price && product.cost_price > 0 ? product.cost_price : product.selling_price);

    // Se já estiver no modo multi-itens (basket ativo)
    if (basket.length > 0 && isEntrada) {
      const existingIdx = basket.findIndex(
        (i) => i.productId === product.id && i.size === firstAvailable,
      );

      let updatedBasket: SaleBasketItem[] = [];
      if (existingIdx >= 0) {
        updatedBasket = basket.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const newQ = item.quantity + 1;
          const newTot = Number((item.unitPrice * newQ).toFixed(2));
          return { ...item, quantity: newQ, totalPrice: newTot };
        });
        toast.success(`+1 un. de "${product.name}" somada à venda!`);
      } else {
        const newItem: SaleBasketItem = {
          id: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          productId: product.id,
          productName: product.name,
          size: firstAvailable,
          quantity: 1,
          unitPrice: priceToUse,
          totalPrice: priceToUse,
          deductStock: true,
        };
        updatedBasket = [...basket, newItem];
        toast.success(`"${product.name}" adicionada à venda!`);
      }

      setBasket(updatedBasket);
      const newTotal = updatedBasket.reduce((sum, i) => sum + i.totalPrice, 0);
      setAmount(String(Number(newTotal.toFixed(2))).replace(".", ","));
      setDescription("");
      setShowProductPopover(false);
      return;
    }

    // Modo Venda Simples inicial (1 peça)
    setSelectedProductId(product.id);
    setDescription(product.name);
    setSelectedProductSize(firstAvailable);
    setUnitPrice(priceToUse);
    setQuantity(1);

    if (priceToUse > 0) {
      setAmount(String(priceToUse).replace(".", ","));
    } else {
      setAmount("");
    }
    setShowProductPopover(false);
  };

  // ── Iniciar Multi-itens com 1 Clique ──────────────────────────────────────
  const handleStartMultiItem = () => {
    if (!description.trim() && !selectedProduct) {
      toast.warning("Selecione a primeira peça antes de adicionar mais");
      return;
    }
    const currentPrice = grossAmount > 0 ? grossAmount : unitPrice > 0 ? unitPrice : 0;
    if (currentPrice <= 0) {
      toast.warning("Informe o valor da peça antes de adicionar mais");
      return;
    }

    const firstItem: SaleBasketItem = {
      id: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      productId: selectedProductId ?? undefined,
      productName: description.trim() || selectedProduct?.name || "Peça",
      size: selectedProductSize || undefined,
      quantity,
      unitPrice: unitPrice > 0 ? unitPrice : currentPrice / quantity,
      totalPrice: currentPrice,
      deductStock: !!selectedProductId && deductStock,
    };

    setBasket([firstItem]);
    setAmount(String(Number(currentPrice.toFixed(2))).replace(".", ","));
    setDescription("");
    setSelectedProductId(null);
    setSelectedProductSize("");
    setQuantity(1);
    setUnitPrice(0);
    setShowProductPopover(true);
    toast.info("Primeira peça adicionada. Selecione a próxima para somar!");
  };

  // ── Ajuste de Quantidade ──────────────────────────────────────────────────
  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    setQuantity(newQty);
    if (unitPrice > 0) {
      setAmount(String(Number((unitPrice * newQty).toFixed(2))).replace(".", ","));
    } else if (grossAmount > 0) {
      const prevQty = quantity > 0 ? quantity : 1;
      const inferredUnit = grossAmount / prevQty;
      setAmount(String(Number((inferredUnit * newQty).toFixed(2))).replace(".", ","));
    }
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

  // ── Cálculos de Valor, Desconto e Quantidade Total ─────────────────────────
  const grossAmount = toNumber(amount);
  const discountNum = toNumber(discountValue);

  const totalPieces = useMemo(() => {
    if (basket.length > 0) {
      return basket.reduce((acc, item) => acc + item.quantity, 0);
    }
    return grossAmount > 0 ? quantity : 0;
  }, [basket, grossAmount, quantity]);

  const calculatedDiscount = useMemo(() => {
    if (grossAmount <= 0 || discountNum <= 0) return 0;
    if (discountType === "pct") {
      return Number(((grossAmount * Math.min(discountNum, 100)) / 100).toFixed(2));
    }
    return Math.min(discountNum, grossAmount);
  }, [grossAmount, discountNum, discountType]);

  const netAmount = Math.max(grossAmount - calculatedDiscount, 0);

  // ── Handlers da Sacola Multi-itens ─────────────────────────────────────────
  const handleRemoveFromBasket = (id: string) => {
    setBasket((prev) => {
      const remaining = prev.filter((i) => i.id !== id);
      if (remaining.length === 0) {
        setAmount("");
        setDescription("");
        setSelectedProductId(null);
        setSelectedProductSize("");
        setQuantity(1);
        setUnitPrice(0);
      } else {
        const newTotal = remaining.reduce((sum, i) => sum + i.totalPrice, 0);
        setAmount(String(Number(newTotal.toFixed(2))).replace(".", ","));
      }
      return remaining;
    });
  };

  const handleUpdateBasketQty = (id: string, delta: number) => {
    setBasket((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.quantity + delta);
        const newTotal = Number((item.unitPrice * newQty).toFixed(2));
        return { ...item, quantity: newQty, totalPrice: newTotal };
      });
      const newTotal = updated.reduce((sum, i) => sum + i.totalPrice, 0);
      setAmount(String(Number(newTotal.toFixed(2))).replace(".", ","));
      return updated;
    });
  };

  // ── Listas combinadas (padrão + custom) ──────────────────────────────────

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
    setQuantity(1);
    setUnitPrice(0);
    setBasket([]);
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
  const todayEntries = sumBy(todayTxs, "entrada");
  const todayExits = sumBy(todayTxs, "saida");
  const pluralize = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

  // ── Vendas Online aguardando compensação D+1 BACEN ────────────────────────
  // Calcula data de compensação D+1 (próximo dia útil) dado um occurred_on
  const calcD1Date = (occurredOn: string): string => {
    const d = new Date(occurredOn + "T12:00:00");
    const dow = d.getDay(); // 0=Dom, 6=Sáb
    const offset = dow === 5 ? 3 : dow === 6 ? 2 : dow === 0 ? 2 : 1;
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  // Vendas online cuja data de compensação D+1 ainda não chegou (pendentes)
  const onlinePendingTxs = monthTxs.filter(
    (t) => t.kind === "entrada" && t.category === "venda_online" && calcD1Date(t.occurred_on) > today,
  );
  const onlinePendingD1 = onlinePendingTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  // ── Mutações ──────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: async () => {
      // Monta a lista completa de itens: itens da sacola ou item único ativo
      const allItems: SaleBasketItem[] =
        basket.length > 0
          ? basket
          : (description.trim() || selectedProductId) && grossAmount > 0
          ? [
              {
                id: "active-item",
                productId: selectedProductId ?? undefined,
                productName: description.trim() || selectedProduct?.name || "Peça",
                size: selectedProductSize || undefined,
                quantity,
                unitPrice: unitPrice > 0 ? unitPrice : grossAmount / quantity,
                totalPrice: grossAmount,
                deductStock: !!selectedProductId && deductStock,
              },
            ]
          : [];

      if (allItems.length === 0) {
        throw new Error(isEntrada ? "Informe ao menos uma peça para registrar a venda" : "Descreva o motivo da saída");
      }
      if (grossAmount > 0 && calculatedDiscount >= grossAmount) {
        throw new Error(
          `O desconto (${brl(calculatedDiscount)}) não pode ser igual ou maior que o valor bruto (${brl(grossAmount)}). Reduza o desconto para lançar.`,
        );
      }
      if (netAmount <= 0) throw new Error("Informe um valor maior que zero");

      // Monta a descrição final
      const activeCustId = isFiado ? fiadoCustomerId : selectedCustomerId;
      const linkedCustomer = customers.find((c) => c.id === activeCustId);

      let finalDescription = "";
      if (allItems.length > 1) {
        const piecesCount = allItems.reduce((acc, i) => acc + i.quantity, 0);
        const summary = allItems
          .map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.productName}${i.size ? ` [Tam: ${i.size}]` : ""}`)
          .join(", ");
        finalDescription = `Venda (${piecesCount} peças): ${summary}`;
      } else {
        const single = allItems[0];
        finalDescription = single.productName;
        if (single.size && !finalDescription.toLowerCase().includes(single.size.toLowerCase())) {
          finalDescription += ` [Tam: ${single.size}]`;
        }
        if (single.quantity > 1) {
          finalDescription += ` (${single.quantity} un.)`;
        }
      }

      if (linkedCustomer && !finalDescription.toLowerCase().includes(linkedCustomer.name.toLowerCase())) {
        finalDescription += ` [Cliente: ${linkedCustomer.name}]`;
      }
      if (calculatedDiscount > 0) {
        finalDescription += ` [Desconto: ${brl(calculatedDiscount)}]`;
      }

      // Baixa/Acréscimo automático de estoque de cada item
      for (const item of allItems) {
        if (item.productId && item.deductStock) {
          let delta = -item.quantity;
          if (!isEntrada) {
            if (category === "estorno_devolucao" || category === "compra_estoque") {
              delta = item.quantity;
            } else if (category === "perda_avaria") {
              delta = -item.quantity;
            } else {
              delta = -item.quantity;
            }
          }
          await adjustInventoryStock(storeId, item.productId, delta, item.size || undefined);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });

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
      const allCount = basket.length + (description.trim() ? 1 : 0);
      const msg = allCount > 1
        ? isFiado
          ? `Venda a prazo (${totalPieces} peças) registrada na aba Fiado e estoque baixado!`
          : `Venda de ${totalPieces} peças registrada e estoque atualizado!`
        : selectedProductId && deductStock
        ? isFiado
          ? "Venda a prazo registrada na aba Fiado e peça baixada do estoque!"
          : `Lançamento registrado e estoque ${category === "estorno_devolucao" || category === "compra_estoque" ? `atualizado (+${quantity} un.)` : `atualizado (−${quantity} un.)`}!`
        : isFiado
        ? "Venda a prazo registrada na aba Fiado!"
        : "Lançamento registrado com sucesso";

      toast.success(msg);
      setBasket([]);
      setDescription("");
      setAmount("");
      setQuantity(1);
      setUnitPrice(0);
      setShowDiscount(false);
      setDiscountValue("");
      setSelectedProductId(null);
      setSelectedProductSize("");
      setSelectedCustomerId("");
      setCustomerSearch("");
      setDeductStock(true);
      setFiadoCustomerId("");
      setFiadoDueDate(todayISO());
      setCashReceived("");
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

      // Caso 2: peça de grade com múltiplos tamanhos, mas nenhum chip de tamanho foi clicado
      if (!selectedProductSize && sizeKeys.length > 1 && !(sizeKeys.length === 1 && sizeKeys[0] === "Único")) {
        toast.warning("Selecione o tamanho da peça vendida antes de lançar para baixar o estoque corretamente.");
        return;
      }

      // Caso 3: peça de Tamanho Único com estoque total zerado (sem chips de grade)
      if (!selectedProductSize && (sizeKeys.length === 0)) {
        setConfirmZeroStockOpen(true);
        return;
      }
      if (!selectedProductSize && sizeKeys.length > 0) {
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
    mutationFn: async (t: Transaction) => {
      // Extrai tamanho da descrição: "[Tam: M]"
      const sizeMatch = t.description.match(/\[Tam:\s*([^\]]+)\]/);
      const extractedSize = sizeMatch?.[1]?.trim();

      // Limpa TODOS os annotations [xxx: yyy] para obter o nome base do produto
      const cleanName = t.description
        .replace(/\s*\[[^\]]*\]/g, "")
        .trim()
        .toLowerCase();

      const linkedProduct = inventoryItems.find(
        (p) => p.name.toLowerCase() === cleanName,
      );

      if (linkedProduct) {
        // Reverte o delta original: entrada (venda) era -1 → reverter é +1
        let reverseDelta = 0;
        if (t.kind === "entrada") {
          reverseDelta = 1; // venda revertida: devolve 1 unidade ao estoque
        } else if (
          t.category === "estorno_devolucao" ||
          t.category === "compra_estoque"
        ) {
          reverseDelta = -1; // devolução/compra revertida: retira 1 unidade
        } else if (t.category === "perda_avaria") {
          reverseDelta = 1; // perda revertida: devolve 1 unidade ao estoque
        } else {
          reverseDelta = 1; // saída genérica com produto: devolve 1 unidade
        }

        if (reverseDelta !== 0) {
          await adjustInventoryStock(
            storeId,
            linkedProduct.id,
            reverseDelta,
            extractedSize ?? undefined,
          );
        }
      }

      await deleteTransaction(storeId, t.id);
      return linkedProduct
        ? { name: linkedProduct.name, size: extractedSize }
        : null;
    },
    onSuccess: (result) => {
      if (result) {
        const sizeLabel = result.size ? ` (${result.size})` : "";
        toast.success(
          `Lançamento excluído e 1 un. de "${result.name}"${sizeLabel} devolvida ao estoque`,
        );
      } else {
        toast.success("Lançamento excluído");
      }
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Helpers de label & foto de produto no extrato ─────────────────────────
  const resolveCategory = useCallback(
    (t: Transaction) => {
      const allEntries = [...baseEntryCategories, ...customOpts.entryCategories];
      const allExits = [...baseExitCategories, ...customOpts.exitCategories];
      const pool = t.kind === "entrada" ? allEntries : allExits;
      return pool.find((c) => c.value === t.category)?.label ?? t.category;
    },
    [customOpts],
  );

  const resolvePayment = useCallback(
    (t: Transaction) => {
      const allPay = [...basePaymentMethods, ...customOpts.paymentMethods];
      return (
        allPay.find((c) => c.value === t.payment_method)?.label ??
        labelOf(basePaymentMethods, t.payment_method)
      );
    },
    [customOpts],
  );

  const resolveLinkedProduct = (t: Transaction) => {
    const cleanDesc = t.description
      .replace(/\s*\[[^\]]*\]/g, "")
      .trim()
      .toLowerCase();
    return inventoryItems.find((p) => p.name.toLowerCase() === cleanDesc) ?? null;
  };

  // ── Período Ativo do Extrato (Navegável / Personalizável) ─────────────────
  const extratoMonth = useMemo(() => monthStart(monthOffset), [monthOffset]);

  const currentPeriodTxs = useMemo(() => {
    if (periodMode === "custom") {
      return txs.filter((t) => t.occurred_on >= customRangeStart && t.occurred_on <= customRangeEnd);
    }
    return txs.filter((t) => t.occurred_on.slice(0, 7) === extratoMonth.slice(0, 7));
  }, [txs, periodMode, extratoMonth, customRangeStart, customRangeEnd]);

  // ── Dados para o Menu Spotlight de Busca Rápida ───────────────────────────
  const spotlightOptions = useMemo(() => {
    const productsSet = new Set<string>();
    const matchedCustomers: { id: string; name: string }[] = [];
    const seenCustomerIds = new Set<string>();

    for (const t of currentPeriodTxs) {
      if (t.description) {
        const clean = t.description.replace(/\s*\[Desconto:.*\]/, "").trim();
        productsSet.add(clean);
      }
    }

    // Detecta clientes que aparecem nas transações do período via busca textual
    for (const customer of customers) {
      if (seenCustomerIds.has(customer.id)) continue;
      const nameLower = customer.name.toLowerCase();
      const found = currentPeriodTxs.some(
        (t) => t.description.toLowerCase().includes(nameLower)
      );
      if (found) {
        matchedCustomers.push({ id: customer.id, name: customer.name });
        seenCustomerIds.add(customer.id);
        if (matchedCustomers.length >= 6) break;
      }
    }

    return {
      methods: [
        { label: "Pix", value: "pix" },
        { label: "Cartão de Crédito", value: "cartao_credito" },
        { label: "Cartão de Débito", value: "cartao_debito" },
        { label: "Dinheiro", value: "dinheiro" },
        { label: "Fiado", value: "fiado" },
      ],
      categories: [
        { label: "Venda Balcão", value: "venda_produto" },
        { label: "Venda Online", value: "venda_online" },
        { label: "Compra Estoque", value: "compra_estoque" },
        { label: "Despesas / Custos", value: "despesa" },
      ],
      recentProducts: Array.from(productsSet).slice(0, 5),
      recentCustomers: matchedCustomers,
    };
  }, [currentPeriodTxs, customers]);

  // ── Extrato Filtrado e Buscado Instantaneamente ───────────────────────────
  const filteredMonthTxs = useMemo(() => {
    return currentPeriodTxs.filter((t) => {
      const matchesKind = extratoKind === "todos" || t.kind === extratoKind;
      if (!matchesKind) return false;

      // Se houver chip de filtro ativo
      if (activeFilterChip) {
        const qChip = activeFilterChip.toLowerCase();
        const payVal = t.payment_method?.toLowerCase() ?? "";
        const catVal = t.category?.toLowerCase() ?? "";
        const descVal = t.description.toLowerCase();
        const chipMatch =
          payVal === qChip ||
          catVal === qChip ||
          descVal.includes(qChip) ||
          resolvePayment(t).toLowerCase() === qChip ||
          resolveCategory(t).toLowerCase() === qChip;
        if (!chipMatch) return false;
      }

      if (!extratoSearch.trim()) return true;
      const q = extratoSearch.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(q);
      const catMatch = resolveCategory(t).toLowerCase().includes(q);
      const payMatch = resolvePayment(t).toLowerCase().includes(q);
      return descMatch || catMatch || payMatch;
    });
  }, [currentPeriodTxs, extratoKind, extratoSearch, activeFilterChip, resolveCategory, resolvePayment]);

  // ── Resumo Financeiro Executivo do Período Ativo (Padrão Apple Ledger) ────
  const periodSummary = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const t of currentPeriodTxs) {
      if (t.kind === "entrada") entradas += Number(t.amount);
      else saidas += Number(t.amount);
    }
    return {
      entradas,
      saidas,
      liquido: entradas - saidas,
      count: currentPeriodTxs.length,
    };
  }, [currentPeriodTxs]);

  // ── Agrupamento Inteligente por Dia para Fechamento Diário de Caixa ──────
  const groupedTxsByDate = useMemo(() => {
    const groups: { date: string; label: string; txs: Transaction[]; total: number }[] = [];
    const map = new Map<string, Transaction[]>();

    for (const t of filteredMonthTxs) {
      const d = t.occurred_on;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }

    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    const todayStr = todayISO();
    const yesterdayStr = yesterdayISO();

    for (const d of sortedDates) {
      const txs = map.get(d)!;
      let label = "";
      if (d === todayStr) {
        label = "Hoje";
      } else if (d === yesterdayStr) {
        label = "Ontem";
      } else {
        const [y, m, day] = d.split("-").map(Number);
        const dateObj = new Date(y ?? 2026, (m || 1) - 1, day || 1);
        const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        label = `${weekdays[dateObj.getDay()]}, ${day} de ${months[(m || 1) - 1]}`;
      }

      const total = txs.reduce((acc, t) => acc + (t.kind === "entrada" ? Number(t.amount) : -Number(t.amount)), 0);
      groups.push({ date: d, label, txs, total });
    }

    return groups;
  }, [filteredMonthTxs]);

  // Ativa scroll interno apenas se a quantidade de lançamentos exceder o viewport confortável do card
  const isScrollable = filteredMonthTxs.length > 7;

  // ── Render ────────────────────────────────────────────────────────────────
  const accentClass = isEntrada
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
  const btnClass = isEntrada
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-rose-600 hover:bg-rose-700 text-white";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas da Loja"
        title="Balcão & PDV"
        description="Registre cada venda física e despesas da sua loja. O saldo se atualiza na hora."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground/80 shadow-2xs backdrop-blur-xs">
            <span className="size-1.5 rounded-full bg-emerald-600/70 dark:bg-emerald-400/70" />
            <span>Caixa Aberto</span>
          </div>
        }
      />

      {/* ── Cockpit de KPIs Executivo (Design Minimalista, Leve e Direto) ──── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Saldo de Hoje */}
        <div className="group relative p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Saldo de hoje
            </span>
            <div className="flex size-7 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground border border-border/60">
              <Wallet className="size-3.5" strokeWidth={1.75} />
            </div>
          </div>
          <div className="my-2">
            <h3 className={`numeric text-2xl font-bold tracking-tight ${
              todayBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            }`}>
              {brl(todayBalance)}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Saldo em gaveta
          </p>
        </div>

        {/* Card 2: Entradas do Mês */}
        <div className="group relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Entradas do mês
            </span>
            <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </div>
          </div>
          <div className="my-2">
            <h3 className="numeric text-2xl font-bold tracking-tight text-foreground">
              {brl(revenue)}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Faturamento da loja
          </p>
        </div>

        {/* Card 3: Saídas do Mês */}
        <div className="group relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Saídas do mês
            </span>
            <div className="flex size-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <ArrowDownRight className="size-3.5" strokeWidth={1.75} />
            </div>
          </div>
          <div className="my-2">
            <h3 className={`numeric text-2xl font-bold tracking-tight ${
              expenses > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            }`}>
              {expenses > 0 ? `− ${brl(expenses)}` : brl(0)}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Despesas operacionais
          </p>
        </div>

        {/* Card 4: Resultado do Mês */}
        <div className="group relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-2xs hover:border-border hover:shadow-soft transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Resultado do mês
            </span>
            <div className={`flex size-7 items-center justify-center rounded-xl border ${
              revenue - expenses >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}>
              <TrendingUp className="size-3.5" strokeWidth={1.75} />
            </div>
          </div>
          <div className="my-2">
            <h3 className={`numeric text-2xl font-bold tracking-tight ${
              revenue - expenses > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : revenue - expenses < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}>
              {revenue - expenses > 0 ? "+ " : revenue - expenses < 0 ? "− " : ""}
              {brl(Math.abs(revenue - expenses))}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            {revenue > 0 ? (
              <span>
                Margem líquida: <strong className="font-semibold text-foreground/80">{((revenue - expenses) / revenue * 100).toFixed(1).replace(".", ",")}%</strong>
              </span>
            ) : (
              "Líquido acumulado"
            )}
          </p>
        </div>
      </div>

      {/* ── Banner de Previsão D+1 (aparece apenas quando há vendas online pendentes) ── */}
      {onlinePendingD1 > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft/30 px-4 py-3">
          <div className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {brl(onlinePendingD1)} em trânsito via Vestui Pay
            </p>
            <p className="text-[11px] text-muted-foreground">
              Vendas online aguardando compensação D+1 BACEN. O depósito cai automaticamente no próximo dia útil às 07:00.
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
            D+1 BACEN
          </span>
        </div>
      )}

      {/* ── Formulário de Novo Lançamento (Código Autêntico Original Restaurado) ── */}
      <section className="panel p-5 sm:p-7 border border-border/70 shadow-soft overflow-hidden">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Novo lançamento</h2>

        {/* Segmented Control — Entrada / Saída */}
        <div className="mt-4 inline-flex items-center rounded-2xl bg-surface-muted/80 p-1 border border-border/50 shadow-2xs">
          <button
            type="button"
            onClick={() => handleKindChange("entrada")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isEntrada
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-2 rounded-full ${isEntrada ? "bg-emerald-500 shadow-xs" : "bg-muted-foreground/40"}`} />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => handleKindChange("saida")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              !isEntrada
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-2 rounded-full ${!isEntrada ? "bg-rose-500 shadow-xs" : "bg-muted-foreground/40"}`} />
            Saída
          </button>
        </div>

        {/* Grid de Campos */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={isEntrada ? "Produto / Peça" : "Motivo da saída / Despesa"} className="relative lg:col-span-2">
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
                className="h-12 rounded-2xl pr-10 bg-card border-border/70 text-sm shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              {selectedProduct ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId(null);
                    setSelectedProductSize("");
                    setDescription("");
                    setAmount("");
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
            <div className="space-y-2">
              <div className="relative">
                {/* Badge de sinal — fundo semântico colorido */}
                <span
                  className={`absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-black leading-none select-none ${
                    isEntrada
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {isEntrada ? "+" : "−"}
                </span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Digite o valor…"
                  className={`h-12 rounded-2xl pl-10 font-mono font-bold text-lg tracking-tight bg-card border-border/70 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:font-sans placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground/50 ${
                    basket.length > 0 ? "pr-24" : "pr-4"
                  }`}
                />
                {basket.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold select-none pointer-events-none">
                    <ShoppingBag className="size-3" />
                    {totalPieces} {totalPieces === 1 ? "peça" : "peças"}
                  </span>
                )}
              </div>

              {/* Ações rápidas sob o valor: Desconto e Quantidade */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Chip de Desconto — ação clara, não texto fantasma */}
                <button
                  type="button"
                  onClick={() => setShowDiscount(!showDiscount)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer select-none ${
                    showDiscount || calculatedDiscount > 0
                      ? "border-amber-400/70 bg-amber-50 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/50 dark:hover:bg-amber-900/40"
                      : "border-dashed border-border/80 bg-transparent text-muted-foreground hover:border-amber-400/60 hover:bg-amber-50/40 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:text-amber-400"
                  }`}
                >
                  <Percent className="size-3 shrink-0" />
                  <span>
                    {showDiscount
                      ? "Ocultar desconto"
                      : isEntrada
                      ? "Desconto / promoção"
                      : "Desconto obtido"}
                  </span>
                  {calculatedDiscount > 0 && (
                    <span className="font-black font-mono ml-0.5">
                      −{brl(calculatedDiscount)}
                    </span>
                  )}
                </button>

                {/* Stepper de Quantidade (Apple Segmented Stepper Pill) — só em modo unitário */}
                {isEntrada && basket.length === 0 && (
                  <div
                    className={`inline-flex items-center rounded-full border p-0.5 shadow-2xs transition-all ${
                      quantity > 1
                        ? "border-primary/40 bg-primary-soft/30 ring-1 ring-primary/20"
                        : "border-border/70 bg-surface-muted/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-2xs active:scale-90 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                      title="Diminuir quantidade"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="size-3" />
                    </button>

                    <div className="flex items-center justify-center px-2 min-w-11 select-none">
                      <span
                        className={`font-mono text-xs font-bold tracking-tight ${
                          quantity > 1 ? "text-primary font-black" : "text-foreground"
                        }`}
                      >
                        {quantity}
                        <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground/80">
                          un.
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-2xs active:scale-90 cursor-pointer"
                      title="Aumentar quantidade"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Field>

          {/* ── Multi-itens: sacola fluida (Apenas em Entrada) ── */}
          {isEntrada && (
            <div className="sm:col-span-2 lg:col-span-3 -mt-1 mb-1">

              {/* Gatilho "+ Adicionar outra peça" — visível só em modo unitário com peça selecionada */}
              {basket.length === 0 && (description.trim() || selectedProductId) && (
                <button
                  type="button"
                  onClick={handleStartMultiItem}
                  disabled={grossAmount <= 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-transparent hover:bg-primary/8 text-primary/80 hover:text-primary px-3 py-1 text-xs font-semibold transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                >
                  <ShoppingBag className="size-3" />
                  <span>+ Adicionar outra peça nesta venda</span>
                </button>
              )}

              {/* Lista da sacola — aparece quando basket está ativo */}
              {basket.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-surface-muted/30 p-3 space-y-1.5 animate-in fade-in-50">
                  {/* Header minimalista */}
                  <div className="flex items-center gap-1.5 pb-1">
                    <ShoppingBag className="size-3.5 text-primary/70" />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {totalPieces} {totalPieces === 1 ? "peça" : "peças"} nesta venda
                    </span>
                  </div>

                  {/* Rows dos itens */}
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {basket.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-card border border-border/60 px-3 py-2 shadow-2xs text-xs"
                      >
                        {/* Nome + Tamanho */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground truncate">{item.productName}</span>
                            {item.size && (
                              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {item.size}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.quantity > 1
                              ? `${item.quantity} × ${brl(item.unitPrice)}`
                              : brl(item.unitPrice)}
                          </p>
                        </div>

                        {/* Stepper de Qtd + Preço + Remover */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center rounded-lg border border-border/60 bg-surface-muted/60 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateBasketQty(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                              title="Diminuir quantidade"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-5 text-center font-mono text-xs font-bold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateBasketQty(item.id, 1)}
                              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              title="Aumentar quantidade"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>

                          <span className="font-mono font-semibold text-foreground w-16 text-right">
                            {brl(item.totalPrice)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromBasket(item.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors cursor-pointer"
                            title="Remover desta venda"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hint para adicionar mais — seleciona no campo acima */}
                  <p className="text-[11px] text-muted-foreground/70 pt-0.5">
                    Selecione outra peça no campo acima para adicionar à venda.
                  </p>
                </div>
              )}
            </div>
          )}

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
              <SelectTrigger className="h-12 rounded-2xl bg-card border-border/70 text-xs font-medium shadow-2xs">
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
              <SelectTrigger className="h-12 rounded-2xl bg-card border-border/70 text-xs font-medium shadow-2xs">
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

          {/* Data com atalhos "Hoje" / "Ontem" / Outra data */}
          <Field label="Data">
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                {(["hoje", "ontem", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDateMode(m)}
                    className={`flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                      dateMode === m
                        ? isEntrada
                          ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-2xs"
                          : "border-rose-600/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold shadow-2xs"
                        : "border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground shadow-2xs"
                    }`}
                  >
                    {m === "custom" ? (
                      <><CalendarDays className="size-3.5" /> Outra</>
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
                    className="h-10 rounded-xl text-xs font-medium bg-card"
                  />
                  {customDate > todayISO() && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      ⚠️ Data futura: este lançamento entrará no fluxo de {customDate.slice(0, 7)}.
                    </p>
                  )}
                </div>
              )}
              {dateMode !== "custom" && (
                <p className="text-[11px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                  <Clock className="size-3 opacity-60" />
                  {(() => {
                    const dStr = dateMode === "hoje" ? todayISO() : yesterdayISO();
                    const [y, m, d] = dStr.split("-").map(Number);
                    const dateObj = new Date(y ?? 2026, (m || 1) - 1, d || 1);
                    const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
                    return `${weekdays[dateObj.getDay()]}, ${d} de ${months[(m || 1) - 1]}`;
                  })()}
                </p>
              )}
            </div>
          </Field>

          {/* Cliente / Favorecido (Busca Spotlight / Autocomplete Apple Level — Exibido no grid superior APENAS se não for Fiado) */}
          {!isFiado && (
            <Field
              label={isEntrada ? "Cliente (Opcional)" : "Favorecido / Fornecedor (Opcional)"}
              className="relative sm:col-span-2 lg:col-span-3"
            >
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
                      : "Ex: Fornecedor de tecidos, eletricista, proprietário, prestador…"
                  }
                  className="h-12 rounded-2xl pr-10 bg-card border-border/70 text-sm shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20"
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

              {/* Menu Dropdown Autocomplete de Clientes / Favorecidos */}
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
                          {isEntrada ? `👤 Clientes Encontradas (${matchingCustomers.length})` : `👤 Favorecidos Encontrados (${matchingCustomers.length})`}
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

                    {/* Atalho Inteligente para Cadastrar Nova Cliente / Favorecido */}
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
                        ? isEntrada
                          ? `Cadastrar "${customerSearch.trim()}" na base de clientes`
                          : `Cadastrar "${customerSearch.trim()}" na base`
                        : isEntrada
                        ? "Cadastrar nova cliente…"
                        : "Cadastrar novo favorecido/fornecedor…"}
                    </button>
                  </div>
                </>
              )}
            </Field>
          )}
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
                      ? `Dar baixa no estoque (−${quantity} un.)`
                      : category === "perda_avaria"
                      ? `Dar baixa por perda/avaria no estoque (−${quantity} un.)`
                      : `Adicionar ao estoque (+${quantity} un.)`}
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
                        {(sizesRecord[selectedProductSize] ?? 0) >= quantity ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {sizesRecord[selectedProductSize]} un. disponíveis no tamanho {selectedProductSize}
                          </span>
                        ) : (sizesRecord[selectedProductSize] ?? 0) > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            ⚠️ Apenas {sizesRecord[selectedProductSize]} un. no tamanho {selectedProductSize} (solicitadas: {quantity} un.)
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

        {/* ── Barra de Ação Inferior (Ergonomia Fitts + Bilateral Balance) ── */}
        <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border/40 pt-5">
          {/* Total da Operação à Esquerda — sem card/borda desnecessária */}
          <div className="flex flex-col justify-center gap-0.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 leading-none">
              Total da operação
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-mono text-2xl font-black leading-none tracking-tight ${
                  netAmount > 0
                    ? isEntrada
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground/50"
                }`}
              >
                {brl(netAmount)}
              </span>
              {calculatedDiscount > 0 && (
                <span className="text-xs text-muted-foreground/60 line-through font-mono">
                  {brl(grossAmount)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70 font-medium leading-none mt-1">
              Via {resolvePayment({ payment_method: method } as any)}
              {isEntrada && totalPieces > 0 ? ` · ${totalPieces} ${totalPieces === 1 ? "peça" : "peças"}` : ""}
              {selectedCustomer ? ` · ${selectedCustomer.name}` : ""}
            </p>
          </div>

          {/* Botão de Envio à Direita */}
          <Button
            className={`h-12 rounded-2xl px-8 text-sm font-bold tracking-tight transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 w-full sm:w-auto ${
              isEntrada
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
            }`}
            disabled={create.isPending || netAmount <= 0}
            onClick={handleTriggerSubmit}
          >
            {create.isPending ? (
              "Registrando..."
            ) : (
              <>
                {isEntrada ? <Plus className="size-4" /> : <Minus className="size-4" />}
                <span>
                  {isEntrada
                    ? totalPieces > 1
                      ? `Registrar entrada (${totalPieces} peças)`
                      : "Registrar entrada"
                    : "Registrar saída"}
                </span>
              </>
            )}
          </Button>
        </div>

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


      {/* ── Extrato do mês (Organização Administrativa e Financeira Apple Wallet) ── */}
      <section className="panel p-5 sm:p-6 lg:p-7 border border-border/70 shadow-soft">
        {/* Cabeçalho do Extrato com Navegação de Data & Ações Executivas (Padrão Apple) */}
        <div className="flex flex-col gap-4 border-b border-border/50 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Lado Esquerdo: Navegação de Mês, Título e Métricas do Extrato */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {periodMode === "month" && (
                  <button
                    type="button"
                    onClick={() => setMonthOffset((prev) => prev - 1)}
                    className="flex size-7 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all cursor-pointer shadow-2xs"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                )}

                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {periodMode === "custom"
                    ? "Lançamentos no Período Personalizado"
                    : `Lançamentos de ${monthLabel(extratoMonth)}`}
                </h2>

                {periodMode === "month" && (
                  <button
                    type="button"
                    onClick={() => setMonthOffset((prev) => prev + 1)}
                    className="flex size-7 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all cursor-pointer shadow-2xs"
                    title="Próximo mês"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                )}

                <span className="rounded-full bg-surface-muted border border-border/60 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs ml-1">
                  {filteredMonthTxs.length} {filteredMonthTxs.length === 1 ? "registro" : "registros"}
                </span>

                {monthOffset !== 0 && periodMode === "month" && (
                  <button
                    type="button"
                    onClick={() => setMonthOffset(0)}
                    className="text-[11px] font-semibold text-primary hover:underline ml-1 cursor-pointer transition-all"
                  >
                    Mês atual
                  </button>
                )}
              </div>

              {/* Subtítulo Financeiro Completo com Fechamento e Saldo do Período */}
              <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Histórico financeiro com fechamento e conciliação diária de caixa</span>
                <span className="text-muted-foreground/40 font-normal">•</span>
                <span>
                  Saldo no período:{" "}
                  <strong
                    className={
                      periodSummary.liquido > 0
                        ? "font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                        : periodSummary.liquido < 0
                        ? "font-bold text-rose-600 dark:text-rose-400 font-mono"
                        : "font-medium text-muted-foreground font-mono"
                    }
                  >
                    {periodSummary.liquido > 0 ? "+ " : ""}
                    {brl(periodSummary.liquido)}
                  </strong>
                </span>
              </p>
            </div>

            {/* Lado Direito: Botão Explícito "Personalizar Data" (Padrão Apple) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPeriodMode(periodMode === "month" ? "custom" : "month")}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  periodMode === "custom"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span>{periodMode === "custom" ? "Voltar ao Mês" : "Personalizar Data"}</span>
              </button>
            </div>
          </div>

          {/* Gaveta de Filtro de Data Customizado — Mini Dual Calendar Picker */}
          {periodMode === "custom" && (
            <div className="relative flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface-muted/40 p-3 text-xs animate-in fade-in-50">
              {/* Pílula trigger que abre o dual calendar */}
              <button
                type="button"
                onClick={() => setShowDateRangePicker((v) => !v)}
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                  showDateRangePicker
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-foreground hover:border-primary/30 hover:bg-primary/5",
                ].join(" ")}
              >
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span>
                  {customRangeStart
                    ? new Date(customRangeStart + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
                    : "—"}
                </span>
                <span className="text-muted-foreground/50 font-normal">→</span>
                <span>
                  {customRangeEnd
                    ? new Date(customRangeEnd + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
                    : "—"}
                </span>
                <ChevronDown
                  className={[
                    "size-3 text-muted-foreground transition-transform duration-200",
                    showDateRangePicker ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {/* Overlay invisível para fechar */}
              {showDateRangePicker && (
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowDateRangePicker(false)}
                />
              )}

              {/* Componente de calendário duplo */}
              {showDateRangePicker && (
                <div className="absolute left-0 top-full z-30 mt-1.5">
                  <MiniDateRangePicker
                    start={customRangeStart}
                    end={customRangeEnd}
                    onChange={(s, e) => {
                      setCustomRangeStart(s);
                      setCustomRangeEnd(e);
                    }}
                    onClose={() => setShowDateRangePicker(false)}
                  />
                </div>
              )}

              {/* Atalhos rápidos (sempre visíveis na gaveta) */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCustomRangeStart(todayISO());
                    setCustomRangeEnd(todayISO());
                    setShowDateRangePicker(false);
                  }}
                  className="rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    now.setDate(now.getDate() - 7);
                    setCustomRangeStart(now.toISOString().slice(0, 10));
                    setCustomRangeEnd(todayISO());
                    setShowDateRangePicker(false);
                  }}
                  className="rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRangeStart(todayISO().slice(0, 8) + "01");
                    setCustomRangeEnd(todayISO());
                    setShowDateRangePicker(false);
                  }}
                  className="rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                >
                  Este mês
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4">
          {/* Barra de Filtros Rápidos (Todos/Entradas/Saídas) e Busca Spotlight */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Segmented Control Tipo de Lançamento */}
            <div className="inline-flex rounded-2xl bg-surface-muted/80 p-1 text-xs font-medium border border-border/50 gap-0.5 shadow-2xs">
              {(["todos", "entrada", "saida"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExtratoKind(k)}
                  className={`rounded-xl px-3.5 py-1.5 transition-all cursor-pointer ${
                    extratoKind === k
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k === "todos" ? "Todos" : k === "entrada" ? "Entradas" : "Saídas"}
                </button>
              ))}
            </div>

            {/* Busca Spotlight Inteligente com Popover (Menu como na Imagem 3) */}
            <div className="relative flex-1 sm:flex-initial flex items-center gap-2">
              {/* Chip de Filtro Rápido Ativo */}
              {activeFilterChip && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary animate-in fade-in-50">
                  <span>{activeFilterChip}</span>
                  <button
                    type="button"
                    onClick={() => setActiveFilterChip(null)}
                    className="hover:opacity-75 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  ref={extratoSearchInputRef}
                  value={extratoSearch}
                  onFocus={() => setShowExtratoSearchPopover(true)}
                  onChange={(e) => {
                    setExtratoSearch(e.target.value);
                    setShowExtratoSearchPopover(true);
                  }}
                  placeholder="Buscar no extrato..."
                  className="h-9 rounded-2xl pl-9 pr-8 text-xs bg-card border border-border/70 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full"
                />
                {extratoSearch && (
                  <button
                    type="button"
                    onClick={() => setExtratoSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Menu Popover Spotlight da Lupa (Estilo Imagem 3 / Apple Spotlight) */}
              {showExtratoSearchPopover && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExtratoSearchPopover(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-80 sm:w-96 rounded-2xl border border-border/70 bg-card p-3 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Filter className="size-3" />
                        Filtros Rápidos no Extrato
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowExtratoSearchPopover(false)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* Grupo 1: Formas de Pagamento */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1.5">
                        💳 Forma de Pagamento
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {spotlightOptions.methods.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => {
                              setActiveFilterChip(m.label);
                              setExtratoSearch("");
                              setShowExtratoSearchPopover(false);
                            }}
                            className="rounded-xl border border-border/60 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all cursor-pointer shadow-2xs"
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grupo 2: Categorias */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1.5">
                        🏷️ Categorias
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {spotlightOptions.categories.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              setActiveFilterChip(c.label);
                              setExtratoSearch("");
                              setShowExtratoSearchPopover(false);
                            }}
                            className="rounded-xl border border-border/60 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all cursor-pointer shadow-2xs"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grupo 3: Peças recentes movimentadas */}
                    {spotlightOptions.recentProducts.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1.5">
                          📦 Peças Movimentadas no Período
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {spotlightOptions.recentProducts.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setExtratoSearch(p);
                                setActiveFilterChip(null);
                                setShowExtratoSearchPopover(false);
                              }}
                              className="rounded-xl border border-border/60 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all cursor-pointer shadow-2xs truncate max-w-full"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grupo 4: Clientes do período */}
                    {spotlightOptions.recentCustomers.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1.5">
                          👤 Clientes no Período
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {spotlightOptions.recentCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setExtratoSearch(c.name);
                                setActiveFilterChip(null);
                                setShowExtratoSearchPopover(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all cursor-pointer shadow-2xs"
                            >
                              <User className="size-3 shrink-0" />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Listagem ou Empty States */}
        {currentPeriodTxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-2xs text-muted-foreground/80 mb-3.5">
              <Wallet className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {periodMode === "custom"
                ? "Nenhum lançamento no período selecionado"
                : `Nenhum lançamento em ${monthLabel(extratoMonth)}`}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Assim que você registrar uma venda física ou despesa no balcão acima, o extrato com fechamento diário será gerado automaticamente aqui.
            </p>
          </div>
        ) : filteredMonthTxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-2xs text-muted-foreground/80 mb-3.5">
              <Search className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Nenhum lançamento encontrado</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Nenhum resultado corresponde à busca "${extratoSearch || activeFilterChip}". Tente outro termo ou limpe os filtros.
            </p>
            {(extratoSearch || activeFilterChip) && (
              <button
                type="button"
                onClick={() => {
                  setExtratoSearch("");
                  setActiveFilterChip(null);
                }}
                className="mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            )}
          </div>
        ) : (
          <div
            className={`mt-6 space-y-6 ${
              isScrollable
                ? "max-h-[540px] overflow-y-auto scrollbar-apple pr-2 -mr-2"
                : ""
            }`}
          >
            {groupedTxsByDate.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Cabeçalho do Dia (Fechamento Diário de Caixa) - Sticky apenas quando há scroll */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs border border-border/40 shadow-2xs ${
                    isScrollable
                      ? "sticky top-0 z-10 bg-card/90 backdrop-blur-md"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{group.label}</span>
                    <span className="text-[11px] text-muted-foreground">({group.txs.length} {group.txs.length === 1 ? "operação" : "operações"})</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Saldo do dia:</span>
                    <span className={group.total >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {group.total >= 0 ? "+" : ""}{brl(group.total)}
                    </span>
                  </div>
                </div>

                {/* Itens do Dia em Card Integrado */}
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden shadow-2xs">
                  {group.txs.map((t) => {
                    const linkedProd = resolveLinkedProduct(t);
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center justify-between gap-4 p-3.5 hover:bg-surface-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {linkedProd?.image_url ? (
                            <img
                              src={linkedProd.image_url}
                              alt={t.description}
                              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs border border-border/50"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted border border-border/50 text-muted-foreground">
                              <Package className="h-4 w-4" strokeWidth={1.75} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground leading-tight">
                              {t.description}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="rounded-lg text-[10px] font-medium py-0 px-2 border-border/50"
                              >
                                {t.category === "venda_online" ? "🌐 Venda Online" : resolveCategory(t)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="rounded-lg text-[10px] font-medium py-0 px-2 border-border/60"
                              >
                                {resolvePayment(t)}
                              </Badge>
                              {t.category === "venda_online" && (
                                calcD1Date(t.occurred_on) > today ? (
                                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.2 text-[10px] font-semibold text-amber-700">
                                    ⏳ D+1
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                                    🟢 Liquidado
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p
                              className={`font-mono text-sm font-bold ${
                                t.kind === "entrada"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {t.kind === "entrada" ? "+" : "−"} {brl(Number(t.amount))}
                            </p>
                          </div>
                          <ConfirmDelete
                            onConfirm={() => remove.mutate(t)}
                            icon={
                              <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-2xs">
                                <Trash2 className="size-5" />
                              </div>
                            }
                            title="Excluir lançamento?"
                            description={(() => {
                              const cleanDesc = t.description.replace(/\s*\[[^\]]*\]/g, "").trim();
                              const sizeMatch = t.description.match(/\[Tam:\s*([^\]]+)\]/);
                              const extractedSize = sizeMatch?.[1]?.trim();
                              const isEntry = t.kind === "entrada";

                              return (
                                <div className="space-y-3 pt-1 text-left">
                                  <p className="text-xs text-muted-foreground">
                                    Este registro financeiro será removido permanentemente do seu extrato e saldo diário.
                                  </p>

                                  {/* Card Resumo do Lançamento */}
                                  <div className="rounded-2xl border border-border/70 bg-surface-muted/50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {linkedProd?.image_url ? (
                                          <img
                                            src={linkedProd.image_url}
                                            alt={cleanDesc}
                                            className="size-10 shrink-0 rounded-xl object-cover border border-border/60 shadow-2xs"
                                          />
                                        ) : (
                                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground">
                                            <Package className="size-5" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-foreground truncate">
                                            {cleanDesc || t.description}
                                          </p>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                            {extractedSize && (
                                              <span className="rounded-md bg-card border border-border/70 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-foreground">
                                                Tam: {extractedSize}
                                              </span>
                                            )}
                                            <span>•</span>
                                            <span>{resolveCategory(t)}</span>
                                            <span>•</span>
                                            <span>{resolvePayment(t)}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span
                                          className={`font-mono text-xs font-bold ${
                                            isEntry
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : "text-rose-600 dark:text-rose-400"
                                          }`}
                                        >
                                          {isEntry ? "+" : "−"} {brl(Number(t.amount))}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Callout Visual de Ajuste no Estoque */}
                                    {linkedProd && (
                                      <div
                                        className={`mt-2.5 flex items-center gap-2 rounded-xl p-2.5 text-xs ${
                                          isEntry || t.category === "perda_avaria"
                                            ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                            : "border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                        }`}
                                      >
                                        <RotateCcw className="size-4 shrink-0" />
                                        <p className="font-medium text-[11px] leading-tight">
                                          {isEntry || t.category === "perda_avaria" ? (
                                            <>
                                              <strong>+1 unidade</strong> retornará ao estoque automaticamente.
                                            </>
                                          ) : (
                                            <>
                                              <strong>−1 unidade</strong> será estornada do estoque.
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            confirmLabel={
                              <span className="flex items-center gap-1.5">
                                <Trash2 className="size-3.5" />
                                Excluir lançamento
                              </span>
                            }
                            cancelLabel="Manter lançamento"
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {isScrollable && (
              <p className="text-center text-[11px] font-medium text-muted-foreground/60 pt-2 pb-1 select-none">
                Fim dos lançamentos deste período ({filteredMonthTxs.length} registros)
              </p>
            )}
          </div>
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
