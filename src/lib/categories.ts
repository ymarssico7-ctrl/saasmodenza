/**
 * Módulo de Categorias Dinâmicas da Loja (Nível Shopify)
 * 
 * Permite que a lojista crie, edite, renomeie, ordene e remova categorias
 * com persistência sincronizada no Supabase (stores.metadata.categories)
 * e cache local instantâneo (localStorage).
 */

import { slugify } from "./format";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_STORE } from "./store-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "./store-context";

const isDemoStore = (storeId: string) => storeId === DEMO_STORE.id;

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order?: number;
};

export const DEFAULT_STORE_CATEGORIES: StoreCategory[] = [
  { id: "vestido", name: "Vestido", slug: "vestido", order: 1 },
  { id: "blusa", name: "Blusa & Camisa", slug: "blusa", order: 2 },
  { id: "calca", name: "Calça & Jeans", slug: "calca", order: 3 },
  { id: "saia", name: "Saia", slug: "saia", order: 4 },
  { id: "conjunto", name: "Conjunto", slug: "conjunto", order: 5 },
  { id: "casaco", name: "Casaco & Jaqueta", slug: "casaco", order: 6 },
  { id: "calcado", name: "Calçados & Sapatos", slug: "calcado", order: 7 },
  { id: "bolsa", name: "Bolsas & Malas", slug: "bolsa", order: 8 },
  { id: "moda_praia", name: "Moda Praia", slug: "moda_praia", order: 9 },
  { id: "acessorio", name: "Acessório", slug: "acessorio", order: 10 },
  { id: "outro", name: "Outro", slug: "outro", order: 11 },
];

export function getLocalCategories(storeId: string): StoreCategory[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`modaly_categories_${storeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erro ao ler categorias locais:", e);
  }
  return null;
}

export function setLocalCategories(storeId: string, categories: StoreCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`modaly_categories_${storeId}`, JSON.stringify(categories));
  } catch (e) {
    console.error("Erro ao salvar categorias locais:", e);
  }
}

export function parseStoreCategories(
  storeMetadata?: Record<string, unknown> | null,
  storeId = "default"
): StoreCategory[] {
  // 1. Tenta carregar do metadata da loja (Supabase)
  if (storeMetadata && typeof storeMetadata === "object") {
    const cats = (storeMetadata as Record<string, unknown>).categories;
    if (Array.isArray(cats) && cats.length > 0) {
      return cats as StoreCategory[];
    }
  }
  // 2. Tenta carregar do cache local
  const local = getLocalCategories(storeId);
  if (local && local.length > 0) return local;

  // 3. Fallback para as categorias padrão de moda
  return DEFAULT_STORE_CATEGORIES;
}

export async function saveStoreCategories(
  storeId: string,
  categories: StoreCategory[],
  currentMetadata?: Record<string, unknown> | null
): Promise<void> {
  // Salva no cache local imediatamente para zero latência
  setLocalCategories(storeId, categories);

  if (isDemoStore(storeId)) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("categories-changed", { detail: categories }));
    }
    return;
  }

  const baseMeta = (currentMetadata && typeof currentMetadata === "object" ? currentMetadata : {}) as Record<string, unknown>;
  const updatedMeta = {
    ...baseMeta,
    categories,
  };

  try {
    const { error } = await supabase.from("stores").update({ metadata: updatedMeta }).eq("id", storeId);
    if (error) {
      console.warn("Não foi possível salvar categorias no Supabase, mantido em cache local:", error.message);
    }
  } catch (err) {
    console.warn("Exceção ao salvar categorias:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("categories-changed", { detail: categories }));
  }
}

/**
 * Retorna o nome formatado e amigável da categoria (ex: "vestido" -> "Vestido")
 */
export function getCategoryLabel(
  categories: StoreCategory[],
  categoryValue: string | null | undefined
): string {
  if (!categoryValue) return "—";
  const val = categoryValue.toLowerCase().trim();
  const found = categories.find(
    (c) => c.slug.toLowerCase() === val || c.id.toLowerCase() === val || c.name.toLowerCase() === val
  );
  if (found) return found.name;

  // Capitalização de fallback para não quebrar peças antigas
  return categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1);
}

/**
 * Cria slug único normalizado para a categoria
 */
export function createCategorySlug(name: string, existingSlugs: string[]): string {
  const base = slugify(name) || "categoria";
  let slug = base;
  let counter = 2;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

/**
 * Hook React para ler e alterar categorias dinâmicas da loja
 */
export function useStoreCategories() {
  const { store, storeId } = useStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["store_categories", storeId, store?.metadata],
    queryFn: () => parseStoreCategories(store?.metadata, storeId),
    initialData: () => parseStoreCategories(store?.metadata, storeId),
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (nextCategories: StoreCategory[]) => {
      await saveStoreCategories(storeId, nextCategories, store?.metadata);
      return nextCategories;
    },
    onSuccess: (nextCats) => {
      queryClient.setQueryData(["store_categories", storeId, store?.metadata], nextCats);
      void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      void queryClient.invalidateQueries({ queryKey: ["store_categories"] });
    },
  });

  return {
    categories: query.data ?? DEFAULT_STORE_CATEGORIES,
    isLoading: query.isLoading,
    saveCategories: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
