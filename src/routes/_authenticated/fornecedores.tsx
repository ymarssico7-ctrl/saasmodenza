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
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
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
      { title: "Fornecedores de Mercadoria — Vestui" },
      {
        name: "description",
        content:
          "Cadastre suas confecções e fornecedores parceiros, acompanhe compras e mantenha contato direto.",
      },
    ],
  }),
  component: Fornecedores,
});

// Categorias de fornecedor para moda — apenas parceiros comerciais reais
const SUPPLIER_CATEGORIES = [
  { value: "compra_estoque", label: "Confecção / Roupas" },
  { value: "calcado_fornecedor", label: "Calçados" },
  { value: "acessorio_fornecedor", label: "Acessórios" },
  { value: "embalagem", label: "Embalagens & Etiquetas" },
  { value: "tecido_aviamento", label: "Tecidos & Aviamentos" },
  { value: "frete", label: "Frete / Logística" },
  { value: "outro_fornecedor", label: "Outro" },
];

function categoryLabel(value: string | null): string {
  if (!value) return "Geral";
  return SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function categoryColor(value: string | null): string {
  switch (value) {
    case "compra_estoque":
      return "bg-primary/10 text-primary border-primary/20";
    case "calcado_fornecedor":
      return "bg-amber-500/10 text-amber-600 border-amber-400/20";
    case "acessorio_fornecedor":
      return "bg-violet-500/10 text-violet-600 border-violet-400/20";
    case "embalagem":
      return "bg-teal-500/10 text-teal-600 border-teal-400/20";
    case "tecido_aviamento":
      return "bg-rose-500/10 text-rose-600 border-rose-400/20";
    case "frete":
      return "bg-sky-500/10 text-sky-600 border-sky-400/20";
    default:
      return "bg-surface-muted text-muted-foreground border-border";
  }
}

function dataBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Mês atual no formato YYYY-MM
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type SupplierStats = SupplierRow & {
  totalGasto: number;
  gastoMes: number;
  ultimoGasto: string | null;
  countTxs: number;
};

const BLANK_FORM = {
  name: "",
  category: "" as string,
  phone: "",
  cnpj: "",
  notes: "",
};

function Fornecedores() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();

  const { data: suppliers = [] } = useQuery(suppliersQuery());
  const { data: rawTxs = [] } = useQuery(transactionsQuery());

  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

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

      return {
        ...s,
        totalGasto,
        gastoMes,
        ultimoGasto,
        countTxs: txs.length,
      };
    });
  }, [suppliers, rawTxs, mes]);

  // Métricas do topo
  const totalFornecedores = fornecedores.length;
  const gastoTotalMes = fornecedores.reduce((acc, f) => acc + f.gastoMes, 0);
  const topFornecedor = [...fornecedores].sort(
    (a, b) => b.gastoMes - a.gastoMes,
  )[0];
  const categoriaTop = (() => {
    const acc: Record<string, number> = {};
    (rawTxs as any[]).forEach((t) => {
      if (t.kind !== "saida" || !(t.occurred_on ?? "").startsWith(mes)) return;
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
    });
    const sorted = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? categoryLabel(sorted[0][0]) : "—";
  })();

  // Filtro de busca
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return fornecedores.sort((a, b) => b.totalGasto - a.totalGasto);
    return fornecedores
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.phone ?? "").includes(q) ||
          (f.cnpj ?? "").includes(q) ||
          categoryLabel(f.category).toLowerCase().includes(q),
      )
      .sort((a, b) => b.totalGasto - a.totalGasto);
  }, [fornecedores, busca]);

  // Dialog helpers
  function openNew() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setDialogOpen(true);
  }

  function openEdit(s: SupplierRow) {
    setEditTarget(s);
    setForm({
      name: s.name,
      category: s.category ?? "",
      phone: s.phone ?? "",
      cnpj: s.cnpj ?? "",
      notes: s.notes ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(BLANK_FORM);
  }

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do fornecedor.");
      if (editTarget) {
        await updateSupplier({
          storeId,
          id: editTarget.id,
          name: form.name.trim(),
          category: form.category || null,
          phone: form.phone.trim() || null,
          cnpj: form.cnpj.trim() || null,
          notes: form.notes.trim() || null,
        });
      } else {
        await insertSupplier({
          storeId,
          name: form.name.trim(),
          category: form.category || null,
          phone: form.phone.trim() || null,
          cnpj: form.cnpj.trim() || null,
          notes: form.notes.trim() || null,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      closeDialog();
      toast.success(
        editTarget
          ? "Fornecedor atualizado! ✅"
          : "Fornecedor cadastrado! 🎉",
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
      toast.error("Fornecedor sem telefone cadastrado.");
      return;
    }
    const tel = digits.length <= 11 ? `55${digits}` : digits;
    const msg = encodeURIComponent(
      `Olá ${nome}! Gostaria de verificar disponibilidade de produtos. Pode me atender?`,
    );
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo & Compras"
        title="Fornecedores de Mercadoria"
        description="Cadastre confecções e parceiros, acompanhe compras por fornecedor e mantenha contato direto pelo WhatsApp."
        action={
          <Button
            className="h-10 rounded-full px-5 text-sm font-semibold shadow-glow cursor-pointer"
            onClick={openNew}
          >
            <Plus className="size-4 mr-1.5" /> Novo fornecedor
          </Button>
        }
      />

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de fornecedores"
          value={String(totalFornecedores)}
          hint={`${suppliers.length} parceiro${suppliers.length !== 1 ? "s" : ""} cadastrado${suppliers.length !== 1 ? "s" : ""}`}
          icon={<Truck className="size-4" />}
        />
        <StatCard
          label="Gasto este mês"
          value={brl(gastoTotalMes)}
          tone={gastoTotalMes > 0 ? "warning" : "default"}
          hint="Saídas registradas no mês atual"
          icon={<TrendingDown className="size-4" />}
        />
        <StatCard
          label="Maior gasto do mês"
          value={topFornecedor ? brl(topFornecedor.gastoMes) : "R$ 0,00"}
          hint={topFornecedor ? topFornecedor.name : "Nenhum gasto registrado"}
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="Categoria + cara"
          value={categoriaTop}
          hint="Categoria de gasto com maior volume no mês"
          icon={<ShoppingCart className="size-4" />}
        />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, CNPJ ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 rounded-full border-border bg-card pl-10 pr-4 text-sm"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title={
            busca ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"
          }
          description={
            busca
              ? "Tente buscar por outro termo ou limpe o campo de busca."
              : "Cadastre seus fornecedores para acompanhar gastos e manter contatos organizados."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <ul className="divide-y divide-border/60">
            {filtrados.map((f) => (
              <li
                key={f.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-muted/50"
              >
                {/* Avatar + Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold border",
                      categoryColor(f.category),
                    )}
                  >
                    {initials(f.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {f.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold rounded-full border px-2 py-0.5",
                          categoryColor(f.category),
                        )}
                      >
                        {categoryLabel(f.category)}
                      </Badge>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.phone || "Sem telefone"}
                      {f.cnpj ? ` · ${f.cnpj}` : ""}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground font-semibold">
                          {brl(f.totalGasto)}
                        </strong>{" "}
                        gasto total
                      </span>
                      <span>·</span>
                      <span>
                        <strong className="text-foreground font-semibold">
                          {f.countTxs}
                        </strong>{" "}
                        {f.countTxs === 1 ? "transação" : "transações"}
                      </span>
                      {f.ultimoGasto && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Último gasto em {dataBR(f.ultimoGasto)}
                          </span>
                        </>
                      )}
                      {f.gastoMes > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600 font-semibold">
                            {brl(f.gastoMes)} este mês
                          </span>
                        </>
                      )}
                    </div>

                    {f.notes && (
                      <p className="mt-1.5 text-xs text-muted-foreground/70 italic truncate max-w-xs">
                        {f.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {f.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirWhatsApp(f.phone!, f.name)}
                      className="h-9 rounded-full gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                    >
                      <Phone className="size-3.5" />
                      Contato
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Editar fornecedor"
                    onClick={() => openEdit(f)}
                  >
                    <Pencil className="size-4" />
                  </Button>

                  <ConfirmDelete
                    title="Excluir fornecedor?"
                    description={`Deseja remover "${f.name}"? Os registros de saída associados permanecerão no histórico.`}
                    onConfirm={() => deleteMutation.mutate(f.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                        aria-label="Excluir fornecedor"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dialog Novo / Editar Fornecedor */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar fornecedor" : "Novo fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Atualize os dados do fornecedor."
                : "Cadastre um fornecedor para registrar gastos e manter o contato organizado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="s-name">
                Nome do fornecedor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="s-name"
                placeholder="Ex: Distribuidora Moda Sul"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label htmlFor="s-category">Categoria padrão</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger id="s-category" className="rounded-xl">
                  <SelectValue placeholder="Selecione uma categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">WhatsApp / Telefone</Label>
              <Input
                id="s-phone"
                placeholder="(31) 99876-5432"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label htmlFor="s-cnpj">CNPJ / CPF</Label>
              <Input
                id="s-cnpj"
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cnpj: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="s-notes">Observações</Label>
              <Textarea
                id="s-notes"
                placeholder="Condições de pagamento, prazo de entrega, contato preferencial..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full shadow-glow"
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
