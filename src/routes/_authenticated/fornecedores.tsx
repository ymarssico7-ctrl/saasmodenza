import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  TrendingDown,
  Truck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { suppliersQuery, type SupplierRow } from "@/lib/db";
import { transactionsQuery } from "@/lib/db";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import {
  insertSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/mutations";
import {
  getCustomOptions,
  getSupplierCategories,
  type CustomOption,
} from "@/lib/custom-options";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores de Mercadoria - Vestui" },
      {
        name: "description",
        content:
          "Cadastre suas confecções e parceiros, gerencie chaves Pix e acompanhe o histórico de reposições em um só lugar.",
      },
    ],
  }),
  component: Fornecedores,
});

type PixType = "cnpj" | "telefone" | "email" | "aleatoria";

function dataBR(iso: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthNameBR() {
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return months[new Date().getMonth()];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Máscaras automáticas limpas
function maskPhone(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

function maskCnpjCpf(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 14);
  if (!d) return "";
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

// Parser e formatador para Chave Pix em notes (retrocompatível, seguro e sem migração rígida)
function parseSupplierNotes(rawNotes: string | null | undefined): {
  pixKey: string;
  pixType: PixType;
  cleanNotes: string;
} {
  if (!rawNotes) return { pixKey: "", pixType: "cnpj", cleanNotes: "" };
  const match = rawNotes.match(/^\[PIX:([a-z_]+):([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return {
      pixType: (match[1] as PixType) || "cnpj",
      pixKey: match[2]?.trim() || "",
      cleanNotes: match[3]?.trim() || "",
    };
  }
  return { pixKey: "", pixType: "cnpj", cleanNotes: rawNotes.trim() };
}

function formatSupplierNotes(pixType: PixType, pixKey: string, cleanNotes: string): string {
  const key = pixKey.trim();
  const notes = cleanNotes.trim();
  if (key) {
    const tag = `[PIX:${pixType}:${key}]`;
    return notes ? `${tag}\n${notes}` : tag;
  }
  return notes;
}

type SupplierStats = SupplierRow & {
  totalGasto: number;
  gastoMes: number;
  ultimoGasto: string | null;
  countTxs: number;
  pixKey: string;
  pixType: PixType;
  cleanNotes: string;
};

const BLANK_FORM = {
  name: "",
  category: "",
  customCategory: "",
  phone: "",
  cnpj: "",
  pixType: "cnpj" as PixType,
  pixKey: "",
  notes: "",
};

function Fornecedores() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();

  const { data: suppliers = [] } = useQuery(suppliersQuery());
  const { data: rawTxs = [] } = useQuery(transactionsQuery());

  // Categorias dinâmicas da loja (sincronizadas com Configurações)
  const [storeCategories, setStoreCategories] = useState<CustomOption[]>(() =>
    getSupplierCategories(storeId)
  );

  const refreshCategories = useCallback(() => {
    setStoreCategories(getSupplierCategories(storeId));
  }, [storeId]);

  useEffect(() => {
    window.addEventListener("custom-options-changed", refreshCategories);
    return () => window.removeEventListener("custom-options-changed", refreshCategories);
  }, [refreshCategories]);

  // Helper para obter o label amigável de uma categoria
  const getCategoryLabel = useCallback(
    (catValue: string | null | undefined) => {
      if (!catValue) return "Geral";
      const found = storeCategories.find(
        (c) => c.value === catValue || c.label.toLowerCase() === catValue.toLowerCase()
      );
      if (found) return found.label;
      return catValue;
    },
    [storeCategories]
  );

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Cruza fornecedores com transações de saída
  const mes = currentMonth();
  const fornecedores = useMemo<SupplierStats[]>(() => {
    return suppliers.map((s) => {
      const nameLower = s.name.toLowerCase();
      const txs = (rawTxs as any[]).filter((t) => {
        if (t.kind !== "saida") return false;
        const desc: string = (t.description ?? "").toLowerCase();
        return (
          desc.includes(`[favorecido: ${nameLower}]`) ||
          desc.includes(`[fornecedor: ${nameLower}]`)
        );
      });

      const totalGasto = txs.reduce((acc, t) => acc + Number(t.amount), 0);
      const gastoMes = txs
        .filter((t) => (t.occurred_on ?? "").startsWith(mes))
        .reduce((acc, t) => acc + Number(t.amount), 0);

      let ultimoGasto: string | null = null;
      for (const t of txs) {
        if (!ultimoGasto || t.occurred_on > ultimoGasto)
          ultimoGasto = t.occurred_on;
      }

      const { pixKey, pixType, cleanNotes } = parseSupplierNotes(s.notes);

      return {
        ...s,
        totalGasto,
        gastoMes,
        ultimoGasto,
        countTxs: txs.length,
        pixKey,
        pixType,
        cleanNotes,
      };
    });
  }, [suppliers, rawTxs, mes]);

  // Lista dinâmica de categorias que REALMENTE POSSUEM fornecedores cadastrados
  const activeCategoriesWithCount = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();

    fornecedores.forEach((f) => {
      const rawCat = f.category || "geral";
      const label = getCategoryLabel(f.category);
      const existing = map.get(rawCat);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(rawCat, { label, count: 1 });
      }
    });

    return Array.from(map.entries()).map(([value, info]) => ({
      value,
      label: info.label,
      count: info.count,
    }));
  }, [fornecedores, getCategoryLabel]);

  // Métricas do topo
  const totalFornecedores = fornecedores.length;
  const fornecedoresAtivosMes = fornecedores.filter((f) => f.gastoMes > 0).length;
  const gastoTotalMes = fornecedores.reduce((acc, f) => acc + f.gastoMes, 0);
  const topFornecedor = useMemo(() => {
    return [...fornecedores].sort((a, b) => b.gastoMes - a.gastoMes)[0] ?? null;
  }, [fornecedores]);

  const categoriaTop = useMemo(() => {
    const acc: Record<string, number> = {};
    (rawTxs as any[]).forEach((t) => {
      if (t.kind !== "saida" || !(t.occurred_on ?? "").startsWith(mes)) return;
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
    });
    const sorted = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? getCategoryLabel(sorted[0][0]) : "-";
  }, [rawTxs, mes, getCategoryLabel]);

  // Filtro de busca
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return fornecedores
      .filter((f) => {
        // Filtro por segmento ativo
        if (categoriaFiltro !== "todos") {
          const matchCat = (f.category || "geral") === categoriaFiltro;
          if (!matchCat) return false;
        }

        // Filtro textual
        if (!q) return true;
        const catLabel = getCategoryLabel(f.category).toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          (f.phone ?? "").includes(q) ||
          (f.cnpj ?? "").includes(q) ||
          f.pixKey.toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          f.cleanNotes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.gastoMes !== a.gastoMes) return b.gastoMes - a.gastoMes;
        return b.totalGasto - a.totalGasto;
      });
  }, [fornecedores, busca, categoriaFiltro, getCategoryLabel]);

  // Ações de diálogo
  function openNew() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setDialogOpen(true);
  }

  function openEdit(s: SupplierStats) {
    setEditTarget(s);
    // Verifica se a categoria é uma das existentes ou se é customizada
    const isKnown = storeCategories.some((c) => c.value === s.category || c.label === s.category);
    setForm({
      name: s.name,
      category: isKnown ? (s.category ?? "") : s.category ? "custom" : "",
      customCategory: isKnown ? "" : (s.category ?? ""),
      phone: s.phone ?? "",
      cnpj: s.cnpj ?? "",
      pixType: s.pixType,
      pixKey: s.pixKey,
      notes: s.cleanNotes,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(BLANK_FORM);
  }

  // Copiar chave Pix
  function copyPixKey(id: string, key: string) {
    if (!key) return;
    navigator.clipboard.writeText(key).then(
      () => {
        setCopiedPixId(id);
        toast.success("Chave Pix copiada!");
        setTimeout(() => setCopiedPixId(null), 2500);
      },
      () => {
        toast.error("Não foi possível copiar a chave Pix.");
      }
    );
  }

  // Mutações
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do fornecedor ou fábrica.");

      const packedNotes = formatSupplierNotes(form.pixType, form.pixKey, form.notes);

      // Resolve a categoria final (se selecionou "custom", usa o texto digitado)
      let finalCategory: string | null = null;
      if (form.category === "custom") {
        finalCategory = form.customCategory.trim() || null;
      } else if (form.category.trim()) {
        finalCategory = form.category.trim();
      }

      if (editTarget) {
        await updateSupplier({
          storeId,
          id: editTarget.id,
          name: form.name.trim(),
          category: finalCategory,
          phone: form.phone.trim() || null,
          cnpj: form.cnpj.trim() || null,
          notes: packedNotes || null,
        });
      } else {
        await insertSupplier({
          storeId,
          name: form.name.trim(),
          category: finalCategory,
          phone: form.phone.trim() || null,
          cnpj: form.cnpj.trim() || null,
          notes: packedNotes || null,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      closeDialog();
      toast.success(
        editTarget ? "Fornecedor atualizado com sucesso!" : "Fornecedor cadastrado com sucesso!"
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteSupplier(storeId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const abrirWhatsApp = (phone: string, nome: string) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      toast.error("Fornecedor sem telefone ou WhatsApp cadastrado.");
      return;
    }
    const tel = digits.length <= 11 ? `55${digits}` : digits;
    const msg = encodeURIComponent(
      `Olá ${nome}! Estou entrando em contato da loja para verificar disponibilidade de pedidos e reposição.`
    );
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Page Header padrão Vestui */}
      <PageHeader
        eyebrow="Catálogo & Compras"
        title="Fornecedores de Mercadoria"
        description="Gerencie suas confecções parceiras, chaves Pix e acompanhe o histórico de reposições da sua loja."
        action={
          <Button
            className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer gap-1.5"
            onClick={openNew}
          >
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        }
      />

      {/* Métricas Principais (StatCards no padrão discreto e elegante) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de Parceiros"
          value={String(totalFornecedores)}
          hint={
            totalFornecedores === 0
              ? "Nenhum parceiro cadastrado"
              : fornecedoresAtivosMes > 0
                ? `${fornecedoresAtivosMes} ativo${fornecedoresAtivosMes > 1 ? "s" : ""} com compras em ${getMonthNameBR()}`
                : `${totalFornecedores} parceiro${totalFornecedores !== 1 ? "s" : ""} cadastrado${totalFornecedores !== 1 ? "s" : ""}`
          }
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Compras no Mês"
          value={brl(gastoTotalMes)}
          tone={gastoTotalMes > 0 ? "warning" : "default"}
          hint={`Saídas registradas em ${getMonthNameBR()}`}
          icon={<TrendingDown className="size-4" />}
        />
        <StatCard
          label="Maior Compra do Mês"
          value={topFornecedor && topFornecedor.gastoMes > 0 ? brl(topFornecedor.gastoMes) : "R$ 0,00"}
          hint={
            topFornecedor && topFornecedor.gastoMes > 0
              ? topFornecedor.name
              : "Sem compras no mês atual"
          }
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="Principal Custo de Estoque"
          value={categoriaTop}
          hint="Categoria de maior volume no mês"
          icon={<ShoppingCart className="size-4" />}
        />
      </div>

      {/* Toolbar: Busca + Alternador de Visualização (e Chips apenas se houver fornecedores) */}
      {totalFornecedores > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, CNPJ, Pix ou segmento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-10 pr-9 text-sm"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Alternador de Visualização (Cards vs Tabela) */}
            <div className="flex items-center self-end sm:self-auto rounded-full border border-border bg-card p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-3.5" />
                Tabela
              </button>
            </div>
          </div>

          {/* Chips Dinâmicos: Exibidos APENAS para categorias com fornecedores cadastrados */}
          {activeCategoriesWithCount.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setCategoriaFiltro("todos")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold transition-all cursor-pointer",
                  categoriaFiltro === "todos"
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                )}
              >
                <span>Todos</span>
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    categoriaFiltro === "todos"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-muted text-muted-foreground"
                  )}
                >
                  {totalFornecedores}
                </span>
              </button>

              {activeCategoriesWithCount.map((cat) => {
                const isSelected = categoriaFiltro === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat.value)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-surface-muted text-muted-foreground"
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: Empty State Executivo vs Bento Grid vs Tabela */}
      {totalFornecedores === 0 ? (
        /* Empty State Executivo e Minimalista no Padrão Vestui */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground border border-border">
            <Building2 className="size-6" />
          </div>

          <h3 className="text-base font-semibold text-foreground">
            Nenhum fornecedor cadastrado
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Cadastre suas confecções e parceiros para acompanhar compras, registrar chaves Pix e manter contato rápido pelo WhatsApp.
          </p>

          <Button
            onClick={openNew}
            className="mt-5 h-10 rounded-full px-5 text-xs font-semibold shadow-glow cursor-pointer gap-1.5"
          >
            <Plus className="size-4" /> Cadastrar primeiro fornecedor
          </Button>
        </div>
      ) : filtrados.length === 0 ? (
        /* Estado de busca sem resultados */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
          <Search className="size-8 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            Nenhum fornecedor encontrado
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Tente buscar por outro termo ou limpe o campo de busca.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBusca("");
              setCategoriaFiltro("todos");
            }}
            className="mt-4 rounded-full text-xs font-semibold"
          >
            Limpar filtros de busca
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* VISUALIZAÇÃO EM CARDS EXECUTIVOS (QUIET LUXURY) */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((f) => {
            const catLabel = getCategoryLabel(f.category);
            const isPixCopied = copiedPixId === f.id;

            return (
              <div
                key={f.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  {/* Topo do Card: Avatar, Nome, Segmento e Ações */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold border border-border bg-surface-muted text-foreground">
                        {initials(f.name)}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className="font-semibold text-foreground text-sm tracking-tight truncate"
                          title={f.name}
                        >
                          {f.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] font-medium rounded-full border border-border bg-surface-muted/60 text-muted-foreground px-2 py-0.5"
                        >
                          {catLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Editar fornecedor"
                        onClick={() => openEdit(f)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      <ConfirmDelete
                        title="Excluir fornecedor?"
                        description={`Deseja remover "${f.name}"? Os registros financeiros históricos permanecerão salvos no caixa.`}
                        onConfirm={() => deleteMutation.mutate(f.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                            aria-label="Excluir fornecedor"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </div>

                  {/* Informações de Contato e CNPJ */}
                  <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                    {f.phone ? (
                      <p className="flex items-center gap-1.5 font-medium text-foreground/80">
                        <Phone className="size-3 text-muted-foreground shrink-0" />
                        <span>{f.phone}</span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-muted-foreground/60 italic">
                        <Phone className="size-3 shrink-0" />
                        <span>Sem telefone</span>
                      </p>
                    )}

                    {f.cnpj && (
                      <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <FileText className="size-3 shrink-0" />
                        <span>{f.cnpj}</span>
                      </p>
                    )}
                  </div>

                  {/* Chave Pix com Cópia Rápida */}
                  {f.pixKey && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-surface-muted/50 border border-border/60 px-3 py-2 text-xs">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <CreditCard className="size-3 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground truncate" title={f.pixKey}>
                          {f.pixKey}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPixKey(f.id, f.pixKey)}
                        className={cn(
                          "h-7 rounded-full px-2.5 text-[11px] font-semibold gap-1 shrink-0 transition-colors cursor-pointer",
                          isPixCopied
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "hover:bg-card text-foreground"
                        )}
                      >
                        {isPixCopied ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Observações / Notas */}
                  {f.cleanNotes && (
                    <p className="mt-2.5 text-xs text-muted-foreground/80 italic line-clamp-2 bg-surface-muted/30 rounded-xl p-2 border border-border/40">
                      "{f.cleanNotes}"
                    </p>
                  )}
                </div>

                {/* Rodapé: Métricas Financeiras & Contato */}
                <div className="mt-5 pt-4 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="rounded-xl bg-surface-muted/30 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Gasto Total
                      </p>
                      <p className="font-bold text-foreground numeric text-sm">
                        {brl(f.totalGasto)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.countTxs} {f.countTxs === 1 ? "compra" : "compras"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-surface-muted/30 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Neste Mês
                      </p>
                      <p
                        className={cn(
                          "font-bold numeric text-sm",
                          f.gastoMes > 0 ? "text-warning-foreground font-extrabold" : "text-muted-foreground"
                        )}
                      >
                        {brl(f.gastoMes)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.ultimoGasto ? `Última: ${dataBR(f.ultimoGasto)}` : "Sem compras"}
                      </p>
                    </div>
                  </div>

                  {f.phone ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirWhatsApp(f.phone!, f.name)}
                      className="w-full h-9 rounded-full gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/20 cursor-pointer shadow-2xs"
                    >
                      <Phone className="size-3.5" />
                      Conversar no WhatsApp
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="w-full h-9 rounded-full text-xs text-muted-foreground/50"
                    >
                      Sem telefone para contato
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA COMPACTA (LISTA) */
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Fornecedor / Razão</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4">Contato &amp; Pix</th>
                  <th className="py-3 px-4 text-right">No Mês</th>
                  <th className="py-3 px-4 text-right">Gasto Histórico</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtrados.map((f) => {
                  const catLabel = getCategoryLabel(f.category);
                  const isPixCopied = copiedPixId === f.id;

                  return (
                    <tr key={f.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold border border-border bg-surface-muted text-foreground">
                            {initials(f.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{f.name}</p>
                            {f.cnpj && (
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {f.cnpj}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium rounded-full border border-border bg-surface-muted/60 text-muted-foreground px-2 py-0.5"
                        >
                          {catLabel}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="text-foreground font-medium">{f.phone || "Sem telefone"}</p>
                          {f.pixKey && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground bg-surface-muted px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                                Pix: {f.pixKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyPixKey(f.id, f.pixKey)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Copiar chave Pix"
                              >
                                {isPixCopied ? (
                                  <Check className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={cn(
                            "font-bold numeric",
                            f.gastoMes > 0 ? "text-warning-foreground" : "text-muted-foreground"
                          )}
                        >
                          {brl(f.gastoMes)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <p className="font-semibold text-foreground numeric">
                          {brl(f.totalGasto)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.countTxs} {f.countTxs === 1 ? "pedido" : "pedidos"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {f.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirWhatsApp(f.phone!, f.name)}
                              className="size-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <Phone className="size-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => openEdit(f)}
                            title="Editar fornecedor"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <ConfirmDelete
                            title="Excluir fornecedor?"
                            description={`Deseja remover "${f.name}"? Os registros financeiros históricos permanecerão salvos no caixa.`}
                            onConfirm={() => deleteMutation.mutate(f.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                                title="Excluir fornecedor"
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
          </div>
        </div>
      )}

      {/* Dialog Modernizado de Cadastro & Edição de Fornecedor */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editTarget ? "Editar fornecedor" : "Cadastrar novo fornecedor"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editTarget
                ? "Atualize os dados comerciais, chaves de pagamento e contatos do parceiro."
                : "Cadastre fábricas, confecções e parceiros para controle de compras e pagamentos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Seção 1: Identificação & Contato */}
            <div className="rounded-2xl border border-border/60 bg-surface-muted/20 p-3.5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                1. Identificação &amp; Segmento
              </p>

              {/* Nome */}
              <div className="space-y-1">
                <Label htmlFor="s-name" className="text-xs font-medium">
                  Nome da confecção ou fornecedor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="s-name"
                  placeholder="Ex: Confecções Moda Sul, Fábrica Bella..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Segmento / Categoria */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="s-category" className="text-xs font-medium">
                      Segmento da loja
                    </Label>
                    <Link
                      to="/configuracoes"
                      search={{ tab: "catalogo" }}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                    >
                      <span>Gerenciar</span>
                      <ExternalLink className="size-2.5" />
                    </Link>
                  </div>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger id="s-category" className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Selecione ou crie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {storeCategories.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-xs font-semibold text-primary">
                        + Digitar outro segmento...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Telefone com Máscara */}
                <div className="space-y-1">
                  <Label htmlFor="s-phone" className="text-xs font-medium">
                    WhatsApp / Telefone
                  </Label>
                  <Input
                    id="s-phone"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))
                    }
                    className="rounded-xl h-10 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Campo para Categoria Customizada se selecionou "+ Digitar outro segmento..." */}
              {form.category === "custom" && (
                <div className="space-y-1">
                  <Label htmlFor="s-customcat" className="text-xs font-medium text-primary">
                    Nome do segmento personalizado
                  </Label>
                  <Input
                    id="s-customcat"
                    placeholder="Ex: Moda Praia, Jeans Atacado, Sacolas..."
                    value={form.customCategory}
                    onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                    className="rounded-xl h-10 text-xs"
                    autoFocus
                  />
                </div>
              )}

              {/* CNPJ / CPF com Máscara */}
              <div className="space-y-1">
                <Label htmlFor="s-cnpj" className="text-xs font-medium">
                  CNPJ ou CPF (opcional)
                </Label>
                <Input
                  id="s-cnpj"
                  placeholder="00.000.000/0001-00"
                  value={form.cnpj}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cnpj: maskCnpjCpf(e.target.value) }))
                  }
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            </div>

            {/* Seção 2: Pagamentos & Chave Pix */}
            <div className="rounded-2xl border border-border/60 bg-surface-muted/20 p-3.5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary" />
                2. Pagamento &amp; Chave Pix
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Tipo de Chave Pix */}
                <div className="space-y-1">
                  <Label htmlFor="s-pixtype" className="text-xs font-medium">
                    Tipo de Chave
                  </Label>
                  <Select
                    value={form.pixType}
                    onValueChange={(v: PixType) => setForm((f) => ({ ...f, pixType: v }))}
                  >
                    <SelectTrigger id="s-pixtype" className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnpj" className="text-xs">CNPJ / CPF</SelectItem>
                      <SelectItem value="telefone" className="text-xs">Celular</SelectItem>
                      <SelectItem value="email" className="text-xs">E-mail</SelectItem>
                      <SelectItem value="aleatoria" className="text-xs">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Chave Pix */}
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="s-pixkey" className="text-xs font-medium">
                    Chave Pix para Pagamento
                  </Label>
                  <Input
                    id="s-pixkey"
                    placeholder={
                      form.pixType === "cnpj"
                        ? "00.000.000/0001-00"
                        : form.pixType === "telefone"
                          ? "(00) 00000-0000"
                          : form.pixType === "email"
                            ? "financeiro@fornecedor.com.br"
                            : "Chave aleatória EVP"
                    }
                    value={form.pixKey}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pixKey:
                          form.pixType === "telefone"
                            ? maskPhone(e.target.value)
                            : form.pixType === "cnpj" && e.target.value.replace(/\D/g, "").length <= 14
                              ? maskCnpjCpf(e.target.value)
                              : e.target.value,
                      }))
                    }
                    className="rounded-xl h-10 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Observações Comerciais */}
              <div className="space-y-1">
                <Label htmlFor="s-notes" className="text-xs font-medium">
                  Condições comerciais &amp; Observações
                </Label>
                <Textarea
                  id="s-notes"
                  placeholder="Prazo médio de entrega, pedido mínimo, contato preferencial..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="rounded-xl resize-none text-xs"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDialog}
              className="rounded-full h-10 px-5 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full h-10 px-6 text-xs font-semibold shadow-glow cursor-pointer gap-1.5"
            >
              {saveMutation.isPending
                ? "Salvando..."
                : editTarget
                  ? "Salvar alterações"
                  : "Cadastrar fornecedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
