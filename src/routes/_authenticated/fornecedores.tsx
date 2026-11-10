import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Copy,
  CopyCheck,
  CreditCard,
  ExternalLink,
  FileText,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
import { suppliersQuery, inventoryQuery, type SupplierRow } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import {
  insertSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/mutations";
import {
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
          "Gerencie suas confecções parceiras, chaves Pix e contatos rápidos para reposição de estoque.",
      },
    ],
  }),
  component: Fornecedores,
});

type PixType = "cnpj" | "telefone" | "email" | "aleatoria";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function calcTotalStock(item: { sizes?: unknown }): number {
  const s = (typeof item.sizes === "object" && item.sizes !== null ? item.sizes : {}) as Record<string, number>;
  return Object.values(s).reduce((acc, q) => acc + (Math.round(Number(q)) || 0), 0);
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
  totalModelos: number;
  totalPecas: number;
  pixKey: string;
  pixType: PixType;
  cleanNotes: string;
};

const BLANK_FORM = {
  name: "",
  category: "",
  phone: "",
  cnpj: "",
  pixType: "cnpj" as PixType,
  pixKey: "",
  notes: "",
};

function Fornecedores() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { storeId } = useStore();

  const { data: suppliers = [] } = useQuery(suppliersQuery());
  const { data: inventoryItems = [] } = useQuery(inventoryQuery());

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Cruza fornecedores com peças do estoque de forma leve e direta
  const fornecedores = useMemo<SupplierStats[]>(() => {
    return suppliers.map((s) => {
      const nameLower = s.name.toLowerCase().trim();
      const matched = inventoryItems.filter((i) => {
        if (!i.supplier) return false;
        const sup = i.supplier.toLowerCase().trim();
        return sup === nameLower || sup === s.id;
      });

      const totalModelos = matched.length;
      const totalPecas = matched.reduce((acc, item) => acc + calcTotalStock(item), 0);
      const { pixKey, pixType, cleanNotes } = parseSupplierNotes(s.notes);

      return {
        ...s,
        totalModelos,
        totalPecas,
        pixKey,
        pixType,
        cleanNotes,
      };
    });
  }, [suppliers, inventoryItems]);

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

  const totalFornecedores = fornecedores.length;

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
        // Ordena primeiro quem tem mais peças vinculadas no estoque, depois por nome
        if (b.totalPecas !== a.totalPecas) return b.totalPecas - a.totalPecas;
        return a.name.localeCompare(b.name);
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
      const finalCategory = form.category.trim() || null;

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
        description="Gerencie suas confecções parceiras, chaves Pix e contatos rápidos para reposição de estoque."
        action={
          <Button
            className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer gap-1.5"
            onClick={openNew}
          >
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        }
      />

      {/* Toolbar: Busca + Alternador de Visualização (Exibidos apenas quando houver fornecedores) */}
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
          </div>

          {/* Chips Dinâmicos: Exibidos APENAS para categorias que realmente possuem fornecedores */}
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
            Cadastre suas confecções e parceiros para organizar contatos no WhatsApp, chaves Pix e vincular às peças do seu estoque.
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
      ) : (
        /* VISUALIZAÇÃO EM TABELA — Padrão definitivo para Fornecedores */
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Fornecedor / Razão</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4">Contato &amp; Pix</th>
                  <th className="py-3 px-4 text-right">Produtos no Estoque</th>
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
                        {f.totalModelos > 0 ? (
                          <div>
                            <p className="font-semibold text-foreground numeric">
                              {f.totalModelos} {f.totalModelos === 1 ? "modelo" : "modelos"}
                            </p>
                            <p className="text-[10px] text-muted-foreground numeric">
                              {f.totalPecas} {f.totalPecas === 1 ? "peça" : "peças"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">Nenhum produto</span>
                        )}
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
                            description={`Deseja remover "${f.name}"? As peças do estoque permanecerão salvas.`}
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

      {/* Dialog de Cadastro & Edição de Fornecedor — Padrão Vestui / Quiet Luxury (Zero-Scroll) */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="rounded-3xl border-border bg-card mx-4 sm:mx-auto sm:max-w-xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold text-foreground">
              {editTarget ? "Editar fornecedor" : "Cadastrar novo fornecedor"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editTarget
                ? "Atualize os dados comerciais, contatos e chave Pix para pedidos."
                : "Preencha os dados do parceiro para organizar contatos e reposições."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-1">
            {/* Linha 1: Nome da Confecção / Fornecedor */}
            <div className="space-y-1.5">
              <Label htmlFor="s-name" className="text-xs font-semibold text-foreground">
                Nome da confecção ou fornecedor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="s-name"
                placeholder="Ex: Confecções Bella, Fábrica Sul..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl h-9.5 text-sm"
              />
            </div>

            {/* Linha 1: Segmento da Loja */}
            <div className="space-y-1.5">
              <Label htmlFor="s-category" className="text-xs font-semibold text-foreground">
                Segmento
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="s-category" className="rounded-xl h-9.5 text-sm">
                  <SelectValue placeholder="Selecione o segmento..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card">
                  {storeCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">
                      {c.label}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border/60 p-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        closeDialog();
                        void navigate({ to: "/configuracoes", search: { tab: "catalogo" } });
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors cursor-pointer font-medium"
                    >
                      <span>Gerenciar segmentos</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2: WhatsApp / Telefone */}
            <div className="space-y-1.5">
              <Label htmlFor="s-phone" className="text-xs font-semibold text-foreground">
                WhatsApp / Telefone
              </Label>
              <Input
                id="s-phone"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))
                }
                className="rounded-xl h-9.5 text-sm font-medium"
              />
            </div>

            {/* Linha 2: CNPJ ou CPF */}
            <div className="space-y-1.5">
              <Label htmlFor="s-cnpj" className="text-xs font-semibold text-foreground">
                CNPJ ou CPF <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="s-cnpj"
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cnpj: maskCnpjCpf(e.target.value) }))
                }
                className="rounded-xl h-9.5 text-sm font-mono"
              />
            </div>

            {/* Linha 3: Tipo de Chave Pix */}
            <div className="space-y-1.5">
              <Label htmlFor="s-pixtype" className="text-xs font-semibold text-foreground">
                Tipo de Chave Pix
              </Label>
              <Select
                value={form.pixType}
                onValueChange={(v: PixType) => setForm((f) => ({ ...f, pixType: v }))}
              >
                <SelectTrigger id="s-pixtype" className="rounded-xl h-9.5 text-sm">
                  <SelectValue placeholder="Tipo de chave..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card">
                  <SelectItem value="cnpj" className="text-sm">CNPJ / CPF</SelectItem>
                  <SelectItem value="telefone" className="text-sm">Celular</SelectItem>
                  <SelectItem value="email" className="text-sm">E-mail</SelectItem>
                  <SelectItem value="aleatoria" className="text-sm">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 3: Chave Pix para Pagamento */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="s-pixkey" className="text-xs font-semibold text-foreground">
                  Chave Pix para Pagamento
                </Label>
                {form.pixType === "cnpj" &&
                  form.cnpj.trim() !== "" &&
                  form.pixKey.trim() !== form.cnpj.trim() && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pixKey: f.cnpj }))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      title="Copiar CNPJ cadastrado para este campo"
                    >
                      <CopyCheck className="size-3" />
                      Usar CNPJ acima
                    </button>
                  )}
              </div>
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
                className="rounded-xl h-9.5 text-sm font-mono"
              />
            </div>

            {/* Linha 4: Condições Comerciais e Observações (Largura Total) */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="s-notes" className="text-xs font-semibold text-foreground">
                Condições comerciais &amp; Observações <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="s-notes"
                placeholder="Ex: Pedido mínimo de 6 peças, entrega em 15 dias, falar com Fernanda..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl h-9.5 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              onClick={closeDialog}
              className="rounded-full h-9.5 px-5 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full h-9.5 px-6 text-xs font-semibold shadow-glow cursor-pointer gap-1.5"
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
