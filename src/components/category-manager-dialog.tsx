import * as React from "react";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  Tag,
  Boxes,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useStoreCategories,
  type StoreCategory,
  DEFAULT_STORE_CATEGORIES,
  createCategorySlug,
} from "@/lib/categories";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: Array<{ category?: string | null }>;
  onCategoryCreated?: (categorySlug: string) => void;
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  items = [],
  onCategoryCreated,
}: CategoryManagerDialogProps) {
  const { categories, saveCategories, isSaving } = useStoreCategories();

  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Mapa de contagem de peças por categoria
  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.category) {
        const catKey = item.category.toLowerCase().trim();
        counts.set(catKey, (counts.get(catKey) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const getItemCount = (cat: StoreCategory) => {
    const bySlug = categoryCounts.get(cat.slug.toLowerCase().trim()) ?? 0;
    const byId = categoryCounts.get(cat.id.toLowerCase().trim()) ?? 0;
    const byName = categoryCounts.get(cat.name.toLowerCase().trim()) ?? 0;
    return Math.max(bySlug, byId, byName);
  };

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;

    // Checa duplicidade
    const alreadyExists = categories.some(
      (c) => c.name.toLowerCase() === clean.toLowerCase()
    );
    if (alreadyExists) {
      toast.error(`A categoria "${clean}" já existe.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const existingSlugs = categories.map((c) => c.slug);
      const slug = createCategorySlug(clean, existingSlugs);

      const newCategory: StoreCategory = {
        id: slug,
        name: clean,
        slug,
        order: categories.length + 1,
      };

      const nextCategories = [...categories, newCategory];
      await saveCategories(nextCategories);

      toast.success(`Categoria "${clean}" criada com sucesso!`);
      setNewName("");
      if (onCategoryCreated) {
        onCategoryCreated(slug);
      }
    } catch (err: any) {
      toast.error("Erro ao criar categoria: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: StoreCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (id: string) => {
    const clean = editingName.trim();
    if (!clean) return;

    try {
      setIsSubmitting(true);
      const nextCategories = categories.map((c) => {
        if (c.id === id) {
          return { ...c, name: clean };
        }
        return c;
      });

      await saveCategories(nextCategories);
      toast.success(`Categoria renomeada para "${clean}".`);
      setEditingId(null);
      setEditingName("");
    } catch (err: any) {
      toast.error("Erro ao renomear: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: StoreCategory) => {
    const count = getItemCount(cat);
    if (count > 0) {
      const confirmDelete = window.confirm(
        `Atenção: Existem ${count} peça(s) no estoque com a categoria "${cat.name}".\n\nDeseja mesmo remover a categoria da lista? As peças não serão apagadas, mas perderão a tag desta categoria.`
      );
      if (!confirmDelete) return;
    }

    try {
      setIsSubmitting(true);
      const nextCategories = categories.filter((c) => c.id !== cat.id);
      await saveCategories(nextCategories);
      toast.success(`Categoria "${cat.name}" removida.`);
    } catch (err: any) {
      toast.error("Erro ao remover: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreDefaults = async () => {
    const confirmRestore = window.confirm(
      "Deseja restaurar as categorias padrão de moda feminina (Vestido, Blusa, Calça, Saia, Conjunto, Calçados, Bolsas, Acessórios, etc.)?"
    );
    if (!confirmRestore) return;

    try {
      setIsSubmitting(true);
      await saveCategories(DEFAULT_STORE_CATEGORIES);
      toast.success("Categorias restauradas para o padrão de moda!");
    } catch (err: any) {
      toast.error("Erro ao restaurar: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-3xl p-6 border-border/80 bg-background shadow-lift">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-primary font-medium text-xs tracking-wider uppercase">
            <Layers className="size-4" />
            <span>Gestão de Catálogo</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Categorias da Loja
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crie e organize as seções do seu estoque e vitrine online com total liberdade (nível Shopify).
          </DialogDescription>
        </DialogHeader>

        {/* ── Criar nova categoria ── */}
        <form onSubmit={handleAddCategory} className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Vestidos de Festa, Alfaiataria, Calçados..."
              className="pl-9 h-11 rounded-2xl bg-surface-muted/60 border-border/70 text-xs sm:text-sm focus-visible:ring-primary/20"
              disabled={isSubmitting || isSaving}
            />
          </div>
          <Button
            type="submit"
            disabled={!newName.trim() || isSubmitting || isSaving}
            className="h-11 rounded-2xl px-4 text-xs font-semibold shrink-0 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4 mr-1.5" />
                Adicionar
              </>
            )}
          </Button>
        </form>

        {/* ── Lista de Categorias ── */}
        <div className="mt-3 space-y-1 max-h-[340px] overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border/80 rounded-2xl">
              <Boxes className="size-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Nenhuma categoria cadastrada</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Crie sua primeira categoria no campo acima ou restaure os padrões.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const count = getItemCount(cat);
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-border/50 bg-card hover:bg-surface-muted/40 transition-colors text-xs"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(cat.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                        className="h-8 text-xs rounded-xl bg-background"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={!editingName.trim() || isSubmitting}
                        className="size-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="Salvar alteração"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Cancelar"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Tag className="size-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-foreground truncate block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            /{cat.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium h-5 px-2 rounded-lg bg-surface-muted text-muted-foreground border-border/60"
                        >
                          {count === 0 ? "0 peças" : count === 1 ? "1 peça" : `${count} peças`}
                        </Badge>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(cat)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                          title="Renomear categoria"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Rodapé com Restaurar Padrões ── */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRestoreDefaults}
            disabled={isSubmitting || isSaving}
            className="text-[11px] text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-xl cursor-pointer"
          >
            <RotateCcw className="size-3 mr-1.5" />
            Restaurar padrões de moda
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 rounded-xl text-xs cursor-pointer font-medium"
          >
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
