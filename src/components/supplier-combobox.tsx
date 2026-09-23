import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Truck, X, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { suppliersQuery, type SupplierRow } from "@/lib/db";
import { insertSupplier } from "@/lib/mutations";
import { useStore } from "@/lib/store-context";

interface SupplierComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Fornecedores adicionais encontrados no histórico do estoque */
  extraSuggestions?: string[];
}

export function SupplierCombobox({
  value,
  onChange,
  placeholder = "Selecione ou busque um parceiro...",
  className,
  disabled = false,
  extraSuggestions = [],
}: SupplierComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const { storeId } = useStore();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery(suppliersQuery());

  // Combina fornecedores cadastrados na tabela 'suppliers' com sugestões históricas
  const allSupplierNames = React.useMemo(() => {
    const set = new Map<string, SupplierRow | null>();
    for (const s of suppliers) {
      if (s.name) {
        set.set(s.name.trim().toLowerCase(), s);
      }
    }
    for (const extra of extraSuggestions) {
      if (extra && !set.has(extra.trim().toLowerCase())) {
        set.set(extra.trim().toLowerCase(), null);
      }
    }
    return Array.from(set.entries()).map(([_, supplier]) => supplier);
  }, [suppliers, extraSuggestions]);

  // Checa se o texto digitado já existe exatamente
  const exactMatch = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return allSupplierNames.some((s) => s?.name?.trim().toLowerCase() === term);
  }, [search, allSupplierNames]);

  const handleSelect = (supplierName: string) => {
    onChange(supplierName);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    const nameToCreate = search.trim();
    if (!nameToCreate) return;

    try {
      setIsCreating(true);
      await insertSupplier({
        storeId,
        name: nameToCreate,
      });

      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onChange(nameToCreate);
      setOpen(false);
      setSearch("");
      toast.success(`Fornecedor "${nameToCreate}" cadastrado e selecionado!`);
    } catch (err: any) {
      console.error("Erro ao cadastrar fornecedor:", err);
      // Mesmo com erro de rede ou tabela, atribui o nome para não travar o fluxo do lojista
      onChange(nameToCreate);
      setOpen(false);
      setSearch("");
      toast.info(`Fornecedor definido como "${nameToCreate}".`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-border bg-card px-3.5 text-sm font-normal shadow-2xs hover:bg-muted/40 hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Truck className="size-4 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{value || placeholder}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Limpar fornecedor"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] sm:w-[380px] p-0 rounded-2xl border-border/80 bg-popover shadow-lift"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Buscar parceiro ou digitar novo..."
            value={search}
            onValueChange={setSearch}
            className="h-11 text-xs sm:text-sm"
          />
          <CommandList className="max-h-[260px] p-1.5">
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Carregando parceiros...
              </div>
            )}

            {!isLoading && allSupplierNames.length === 0 && !search.trim() && (
              <div className="py-5 text-center px-4">
                <Truck className="size-6 text-muted-foreground/40 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-foreground">Nenhum parceiro cadastrado</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Digite o nome da confecção ou fabricante acima para cadastrar instantaneamente.
                </p>
              </div>
            )}

            <CommandEmpty className="py-3 px-3 text-center">
              <p className="text-xs text-muted-foreground">Nenhum parceiro encontrado com esse nome.</p>
            </CommandEmpty>

            {/* Ação rápida: Cadastrar Novo Fornecedor quando o usuário digita algo inédito */}
            {search.trim().length > 0 && !exactMatch && (
              <div className="p-1 border-b border-border/60 mb-1">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCreateNew}
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary px-3 py-2 text-xs font-semibold transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {isCreating ? (
                      <Loader2 className="size-3.5 animate-spin shrink-0" />
                    ) : (
                      <Plus className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      Cadastrar novo parceiro: <strong className="underline decoration-primary/40">"{search.trim()}"</strong>
                    </span>
                  </span>
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shrink-0">
                    Criar
                  </span>
                </button>
              </div>
            )}

            {allSupplierNames.length > 0 && (
              <CommandGroup heading="Fornecedores Cadastrados">
                {allSupplierNames.map((s, idx) => {
                  const name = s?.name || "";
                  if (!name) return null;
                  const isSelected = value.trim().toLowerCase() === name.trim().toLowerCase();

                  return (
                    <CommandItem
                      key={s?.id || `sup-${idx}-${name}`}
                      value={name}
                      onSelect={() => handleSelect(name)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs cursor-pointer hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="size-6 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 text-muted-foreground">
                          <Truck className="size-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">{name}</p>
                          {s?.category && (
                            <p className="text-[10px] text-muted-foreground truncate">{s.category}</p>
                          )}
                        </div>
                      </div>

                      {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          <CommandSeparator />

          <div className="p-2 bg-surface-muted/40 flex items-center justify-between text-[11px] text-muted-foreground px-3">
            <span>Gestão completa</span>
            <Link
              to="/fornecedores"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              onClick={() => setOpen(false)}
            >
              Fornecedores & Gastos
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
