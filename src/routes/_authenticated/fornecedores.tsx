import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  TrendingDown,
  Receipt,
  Calendar,
  Copy,
  Check,
  LayoutGrid,
  List,
  Sparkles,
  X,
  CreditCard,
  FileText,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores & Confecções - Vestui" },
      {
        name: "description",
        content:
          "Cadastre suas confecções e parceiros, gerencie chaves Pix e acompanhe o histórico de reposições em um só lugar.",
      },
    ],
  }),
  component: Fornecedores,
});

// Categorias voltadas especificamente para o ecossistema de moda
const SUPPLIER_CATEGORIES = [
  {
    value: "compra_estoque",
    label: "Confecção / Roupas",
    shortLabel: "Confecção",
    icon: "👗",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    avatarClass: "bg-primary/15 text-primary border-primary/30",
  },
  {
    value: "calcado_fornecedor",
    label: "Calçados & Bolsas",
    shortLabel: "Calçados",
    icon: "👠",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    avatarClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    value: "acessorio_fornecedor",
    label: "Acessórios & Bijuterias",
    shortLabel: "Acessórios",
    icon: "💍",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    avatarClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    value: "embalagem",
    label: "Embalagens & Sacolas",
    shortLabel: "Embalagens",
    icon: "🛍️",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    avatarClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    value: "tecido_aviamento",
    label: "Tecidos & Aviamentos",
    shortLabel: "Tecidos",
    icon: "🧵",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    avatarClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  {
    value: "frete",
    label: "Frete & Logística",
    shortLabel: "Frete",
    icon: "🚚",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    avatarClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  {
    value: "outro_fornecedor",
    label: "Outros Parceiros",
    shortLabel: "Outros",
    icon: "🏭",
    badgeClass: "bg-muted text-muted-foreground border-border",
    avatarClass: "bg-muted text-foreground border-border",
  },
] as const;

type PixType = "cnpj" | "telefone" | "email" | "aleatoria";

function getCategoryInfo(value: string | null) {
  return (
    SUPPLIER_CATEGORIES.find((c) => c.value === value) ?? {
      value: "outro_fornecedor",
      label: value || "Parceiro Geral",
      shortLabel: value || "Geral",
      icon: "🏭",
      badgeClass: "bg-muted text-muted-foreground border-border",
      avatarClass: "bg-muted text-foreground border-border",
    }
  );
}

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

// Máscaras automáticas
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

// Parser e formatador para Chave Pix persistida em notes (compatibilidade total e retroativa)
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
  category: "" as string,
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

  // Contagem por categoria para os chips de filtro rápido
  const countsPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    fornecedores.forEach((f) => {
      const cat = f.category || "outro_fornecedor";
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [fornecedores]);

  // Métricas de topo com rótulos e matemática precisos
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
    return sorted[0] ? getCategoryInfo(sorted[0][0]).label : "-";
  }, [rawTxs, mes]);

  // Filtro composto: busca por texto + chip de categoria
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return fornecedores
      .filter((f) => {
        // Filtro por segmento
        if (categoriaFiltro !== "todos") {
          const matchCat = f.category === categoriaFiltro;
          if (!matchCat) return false;
        }

        // Filtro textual
        if (!q) return true;
        const catInfo = getCategoryInfo(f.category);
        return (
          f.name.toLowerCase().includes(q) ||
          (f.phone ?? "").includes(q) ||
          (f.cnpj ?? "").includes(q) ||
          f.pixKey.toLowerCase().includes(q) ||
          catInfo.label.toLowerCase().includes(q) ||
          f.cleanNotes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Ordena primeiro por quem teve compras no mês, depois por total geral
        if (b.gastoMes !== a.gastoMes) return b.gastoMes - a.gastoMes;
        return b.totalGasto - a.totalGasto;
      });
  }, [fornecedores, busca, categoriaFiltro]);

  // Ações de diálogo
  function openNew(prefillCategory?: string) {
    setEditTarget(null);
    setForm({
      ...BLANK_FORM,
      category: prefillCategory ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(s: SupplierStats) {
    setEditTarget(s);
    setForm({
      name: s.name,
      category: s.category ?? "",
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
        toast.success("Chave Pix copiada para a área de transferência!");
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

      if (editTarget) {
        await updateSupplier({
          storeId,
          id: editTarget.id,
          name: form.name.trim(),
          category: form.category || null,
          phone: form.phone.trim() || null,
          cnpj: form.cnpj.trim() || null,
          notes: packedNotes || null,
        });
      } else {
        await insertSupplier({
          storeId,
          name: form.name.trim(),
          category: form.category || null,
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
        editTarget
          ? "Fornecedor atualizado com sucesso!"
          : "Fornecedor cadastrado com sucesso!"
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
      `Olá ${nome}! Estou entrando em contato da loja para verificar disponibilidade de pedidos e reposição.`,
    );
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header com estilo executivo */}
      <PageHeader
        eyebrow="Catálogo & Compras"
        title="Fornecedores de Mercadoria"
        description="Gerencie suas confecções parceiras, chaves Pix para pagamento ágil e acompanhe os custos de reposição da sua loja."
        action={
          <Button
            className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer gap-1.5"
            onClick={() => openNew()}
          >
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        }
      />

      {/* Bento Grid de Métricas Principais */}
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
          hint={`Total pago a fornecedores em ${getMonthNameBR()}`}
          icon={<TrendingDown className="size-4" />}
        />
        <StatCard
          label="Maior Compra do Mês"
          value={topFornecedor && topFornecedor.gastoMes > 0 ? brl(topFornecedor.gastoMes) : "R$ 0,00"}
          hint={
            topFornecedor && topFornecedor.gastoMes > 0
              ? `${topFornecedor.name}`
              : "Sem compras no mês atual"
          }
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="Principal Custo de Estoque"
          value={categoriaTop}
          hint="Categoria de compra com maior volume no mês"
          icon={<ShoppingCart className="size-4" />}
        />
      </div>

      {/* Barra de Filtros, Chips de Categoria & Alternador de Visão */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por confecção, telefone, CNPJ, chave Pix..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 rounded-full border-border bg-card pl-10 pr-9 text-sm shadow-2xs"
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

          {/* Alternador de Visualização (Grade / Lista) */}
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

        {/* Chips de Categorias de Moda (scroll horizontal elegante) */}
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

          {SUPPLIER_CATEGORIES.map((cat) => {
            const count = countsPorCategoria[cat.value] ?? 0;
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
                <span>{cat.icon}</span>
                <span>{cat.shortLabel}</span>
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal: Empty State vs Cards Bento vs Tabela */}
      {fornecedores.length === 0 ? (
        /* Empty State acolhedor para lojistas de moda */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center shadow-soft">
          <div className="relative mb-5 flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-soft">
            <Building2 className="size-8" />
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-3" />
            </span>
          </div>

          <h3 className="text-lg font-bold text-foreground">
            Nenhuma confecção ou parceiro cadastrado
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Cadastre suas fábricas parceiras, chaves Pix para pagamento imediato e acompanhe todo o histórico de compras e reposições de estoque em um único lugar.
          </p>

          <Button
            size="lg"
            onClick={() => openNew()}
            className="mt-6 h-11 rounded-full px-6 font-semibold shadow-glow cursor-pointer gap-2"
          >
            <Plus className="size-4" /> Cadastrar primeiro fornecedor
          </Button>

          {/* Atalhos Rápidos para Categorias Comuns de Moda */}
          <div className="mt-8 pt-6 border-t border-border/60 w-full max-w-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Sugestões de início rápido:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => openNew("compra_estoque")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card hover:bg-surface-muted transition-all cursor-pointer text-center group"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👗</span>
                <span className="text-xs font-semibold text-foreground">Confecção</span>
                <span className="text-[10px] text-muted-foreground">Roupas</span>
              </button>

              <button
                type="button"
                onClick={() => openNew("calcado_fornecedor")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card hover:bg-surface-muted transition-all cursor-pointer text-center group"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👠</span>
                <span className="text-xs font-semibold text-foreground">Calçados</span>
                <span className="text-[10px] text-muted-foreground">Fábricas</span>
              </button>

              <button
                type="button"
                onClick={() => openNew("embalagem")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card hover:bg-surface-muted transition-all cursor-pointer text-center group"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🛍️</span>
                <span className="text-xs font-semibold text-foreground">Embalagens</span>
                <span className="text-[10px] text-muted-foreground">Sacolas/Tags</span>
              </button>

              <button
                type="button"
                onClick={() => openNew("frete")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card hover:bg-surface-muted transition-all cursor-pointer text-center group"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🚚</span>
                <span className="text-xs font-semibold text-foreground">Frete</span>
                <span className="text-[10px] text-muted-foreground">Logística</span>
              </button>
            </div>
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        /* Empty State para busca sem resultados */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
          <Search className="size-8 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold text-foreground">
            Nenhum fornecedor encontrado
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Nenhum parceiro corresponde à sua busca ou filtro de segmento atual.
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
        /* VISUALIZAÇÃO EM BENTO GRID DE CARDS */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((f) => {
            const cat = getCategoryInfo(f.category);
            const isPixCopied = copiedPixId === f.id;

            return (
              <div
                key={f.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                {/* Topo do Card: Avatar, Nome, Categoria e Ações */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold border shadow-2xs",
                          cat.avatarClass,
                        )}
                      >
                        {initials(f.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-sm tracking-tight truncate" title={f.name}>
                          {f.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-1 text-[10px] font-semibold rounded-full border px-2 py-0.2 gap-1",
                            cat.badgeClass,
                          )}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.shortLabel}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Botões de Ação do Card (Editar e Excluir) */}
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

                  {/* Informações de Contato e Fiscais */}
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {f.phone ? (
                      <p className="flex items-center gap-1.5 font-medium text-foreground/80">
                        <Phone className="size-3 text-muted-foreground shrink-0" />
                        <span>{f.phone}</span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-muted-foreground/60 italic">
                        <Phone className="size-3 shrink-0" />
                        <span>Sem telefone cadastrado</span>
                      </p>
                    )}

                    {f.cnpj && (
                      <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <FileText className="size-3 shrink-0" />
                        <span>{f.cnpj}</span>
                      </p>
                    )}
                  </div>

                  {/* Chave Pix em Destaque com Cópia Rápida */}
                  {f.pixKey ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-surface-muted/60 border border-border/60 px-3 py-2 text-xs">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <CreditCard className="size-3 text-primary shrink-0" />
                          Pix:
                        </span>
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
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}

                  {/* Observações / Notas do Fornecedor */}
                  {f.cleanNotes && (
                    <p className="mt-2.5 text-xs text-muted-foreground/80 italic line-clamp-2 bg-surface-muted/30 rounded-xl p-2 border border-border/40">
                      "{f.cleanNotes}"
                    </p>
                  )}
                </div>

                {/* Rodapé do Card: Métricas Financeiras & Botão WhatsApp */}
                <div className="mt-5 pt-4 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="rounded-xl bg-surface-muted/40 p-2">
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

                    <div className="rounded-xl bg-surface-muted/40 p-2">
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
                        {f.ultimoGasto ? `Última: ${dataBR(f.ultimoGasto)}` : "Sem reposição"}
                      </p>
                    </div>
                  </div>

                  {/* Botão de WhatsApp */}
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
                      className="w-full h-9 rounded-full text-xs text-muted-foreground/60"
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
              <thead className="bg-surface-muted/70 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Fornecedor / Razão</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4">Contato & Pix</th>
                  <th className="py-3 px-4 text-right">No Mês</th>
                  <th className="py-3 px-4 text-right">Gasto Histórico</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtrados.map((f) => {
                  const cat = getCategoryInfo(f.category);
                  const isPixCopied = copiedPixId === f.id;

                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-surface-muted/40 transition-colors"
                    >
                      {/* Nome e Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold border",
                              cat.avatarClass,
                            )}
                          >
                            {initials(f.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {f.name}
                            </p>
                            {f.cnpj && (
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {f.cnpj}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Segmento */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold rounded-full border px-2 py-0.5 gap-1",
                            cat.badgeClass,
                          )}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.shortLabel}</span>
                        </Badge>
                      </td>

                      {/* Contato & Pix */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="text-foreground font-medium">
                            {f.phone || "Sem telefone"}
                          </p>
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

                      {/* No Mês */}
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

                      {/* Gasto Total */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-semibold text-foreground numeric">
                          {brl(f.totalGasto)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.countTxs} {f.countTxs === 1 ? "pedido" : "pedidos"}
                        </p>
                      </td>

                      {/* Ações */}
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
                ? "Atualize os dados comerciais, chaves de pagamento e contatos da sua fábrica parceira."
                : "Cadastre confecções, calçados e embalagens para ter controle de reposições e pagamentos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Seção 1: Identificação & Segmento */}
            <div className="rounded-2xl border border-border/60 bg-surface-muted/20 p-3.5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                1. Identificação & Contato
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
                {/* Categoria */}
                <div className="space-y-1">
                  <Label htmlFor="s-category" className="text-xs font-medium">
                    Segmento / Categoria
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger id="s-category" className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Selecione o segmento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          <span className="mr-1.5">{c.icon}</span>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Telefone / WhatsApp com Máscara */}
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

              {/* CNPJ / CPF com Máscara */}
              <div className="space-y-1">
                <Label htmlFor="s-cnpj" className="text-xs font-medium">
                  CNPJ ou CPF da empresa
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
                2. Pagamento & Chave Pix
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
                  Condições comerciais & Observações
                </Label>
                <Textarea
                  id="s-notes"
                  placeholder="Prazo médio de produção/entrega, valor de pedido mínimo no atacado, forma de envio..."
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
