/**
 * showcase-store.ts
 *
 * Camada de persistência para configurações da Vitrine Online do VESTUI.
 *
 * ARQUITETURA HÍBRIDA (NUVEM + CACHE):
 *   - O "backstage" (dados reais: nome, preço, grade, fotos, custo) vive no Supabase → `inventory_items`.
 *   - O "palco" (visibilidade, destaque, preço promocional, fotos vitrine, ordem) é sincronizado
 *     diretamente no Supabase → `stores.metadata.showcaseConfigs` para persistência entre dispositivos.
 *   - O localStorage atua como cache instantâneo e offline para navegação fluida da lojista.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "vestui_showcase_configs_v1";
const LEGACY_STORAGE_KEY = "modaly_showcase_configs_v1";
const ANCESTRAL_STORAGE_KEY = "vestuli_showcase_configs_v1";
const AUTO_PUBLISH_KEY = "vestui_showcase_auto_publish";
const LEGACY_AUTO_PUBLISH_KEY = "modaly_showcase_auto_publish";
const ANCESTRAL_AUTO_PUBLISH_KEY = "vestuli_showcase_auto_publish";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ShowcaseItemConfig = {
  /** Produto visível na vitrine. Padrão: false */
  ativo: boolean;
  /** Produto exibido em destaque na home. Padrão: false */
  destaque: boolean;
  /** Esconde o preço — cliente deve negociar via WhatsApp. Padrão: false */
  precoOculto: boolean;
  /** Preço promocional (exibido com o original riscado). Opcional. */
  precoPromocional?: number | undefined;
  /** Início da promoção (ISO string). */
  promocaoInicio?: string | undefined;
  /** Fim da promoção (ISO string). */
  promocaoFim?: string | undefined;
  /** Posição de ordenação na vitrine (menor = mais no topo). */
  ordem: number;
  /** Timestamp da última atualização. */
  updatedAt: string;
  /**
   * Galeria de fotos premium exclusiva da vitrine.
   * Se preenchida, substitui a foto básica do estoque nos templates da loja.
   * Primeira foto = capa; segunda foto = hover (se o template suportar).
   */
  vitrineFotos?: string[] | undefined;
};

export type ShowcaseConfigMap = Record<string, ShowcaseItemConfig>;

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const SHOWCASE_ITEM_DEFAULTS: Omit<ShowcaseItemConfig, "ordem" | "updatedAt"> = {
  ativo: true,
  destaque: false,
  precoOculto: false,
};

// ─── Leitura / Escrita ────────────────────────────────────────────────────────

/** Carrega o mapa completo de configurações do localStorage. */
export function loadShowcaseConfigs(): ShowcaseConfigMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY) ||
      localStorage.getItem(ANCESTRAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ShowcaseConfigMap;
  } catch {
    return {};
  }
}

/** Salva o mapa completo de configurações no localStorage. */
function saveShowcaseConfigs(map: ShowcaseConfigMap): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  // Notifica outras abas/componentes que escutam o evento
  try {
    window.dispatchEvent(new CustomEvent("showcase-config-changed", { detail: map }));
  } catch {
    // SSR / Node: ignorar
  }
}

// ─── API Pública & Sincronização na Nuvem ──────────────────────────────────────

/**
 * Sincroniza o mapa de configurações da vitrine no Supabase (stores.metadata.showcaseConfigs).
 * Garante que alterações feitas em qualquer dispositivo fiquem disponíveis para todos os clientes.
 */
export async function syncShowcaseToCloud(
  storeId?: string | null,
  customMap?: ShowcaseConfigMap,
): Promise<boolean> {
  const map = customMap ?? loadShowcaseConfigs();
  let targetStoreId = storeId;

  if (!targetStoreId && typeof localStorage !== "undefined") {
    try {
      const activeStoreRaw =
        localStorage.getItem("vestui_active_store_id") ||
        localStorage.getItem("vestuli_active_store_id");
      if (activeStoreRaw) targetStoreId = activeStoreRaw;
    } catch {
      // ignore
    }
  }

  try {
    if (!targetStoreId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return false;

      const { data: storeData } = await supabase
        .from("stores")
        .select("id, metadata")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!storeData?.id) return false;
      targetStoreId = storeData.id;
      const currentMeta = (storeData.metadata as Record<string, unknown> | null) || {};

      await supabase
        .from("stores")
        .update({
          metadata: {
            ...currentMeta,
            showcaseConfigs: map,
          } as never,
        })
        .eq("id", targetStoreId);
      return true;
    }

    const { data: storeData } = await supabase
      .from("stores")
      .select("metadata")
      .eq("id", targetStoreId)
      .maybeSingle();

    const currentMeta = (storeData?.metadata as Record<string, unknown> | null) || {};
    await supabase
      .from("stores")
      .update({
        metadata: {
          ...currentMeta,
          showcaseConfigs: map,
        } as never,
      })
      .eq("id", targetStoreId);
    return true;
  } catch (err) {
    console.error("Falha ao sincronizar showcaseConfigs no Supabase:", err);
    return false;
  }
}

/**
 * Retorna a configuração de vitrine de um produto específico.
 * Se fornecido `remoteMap`, prioriza os dados oficiais da nuvem.
 */
export function getShowcaseConfig(
  itemId: string,
  remoteMap?: ShowcaseConfigMap | null,
): ShowcaseItemConfig {
  const map =
    remoteMap && Object.keys(remoteMap).length > 0 ? remoteMap : loadShowcaseConfigs();
  const existing = map[itemId];
  if (existing) return existing;
  const allConfigs = Object.values(map);
  const maxOrdem = allConfigs.length > 0 ? Math.max(...allConfigs.map((c) => c.ordem)) : -1;
  return {
    ...SHOWCASE_ITEM_DEFAULTS,
    ordem: maxOrdem + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Atualiza parcialmente a configuração de vitrine de um produto.
 * Salva no localStorage e persiste atômica e assincronamente no Supabase.
 */
export function patchShowcaseConfig(
  itemId: string,
  patch: Partial<ShowcaseItemConfig>,
  storeId?: string | null,
): ShowcaseItemConfig {
  const map = loadShowcaseConfigs();
  const current = map[itemId] ?? getShowcaseConfig(itemId);
  const updated: ShowcaseItemConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  map[itemId] = updated;
  saveShowcaseConfigs(map);

  // Sincroniza em nuvem no Supabase de forma imediata e resiliente
  void syncShowcaseToCloud(storeId, map);

  return updated;
}

/**
 * Verifica se há algum produto ativo na vitrine.
 * Usado para detectar se o usuário já fez o onboarding da loja.
 */
export function hasAnyActiveProduct(remoteMap?: ShowcaseConfigMap | null): boolean {
  const map =
    remoteMap && Object.keys(remoteMap).length > 0 ? remoteMap : loadShowcaseConfigs();
  return Object.values(map).some((c) => c.ativo);
}

/**
 * Ativa todos os produtos da lista na vitrine (usado no Onboarding "Aha! Moment").
 * Salva no cache local e persiste na nuvem.
 */
export function bulkActivateAll(itemIds: string[], storeId?: string | null): void {
  const map = loadShowcaseConfigs();
  itemIds.forEach((id, index) => {
    const current = map[id] ?? {
      ...SHOWCASE_ITEM_DEFAULTS,
      ordem: index,
      updatedAt: new Date().toISOString(),
    };
    map[id] = {
      ...current,
      ativo: true,
      ordem: current.ordem,
      updatedAt: new Date().toISOString(),
    };
  });
  saveShowcaseConfigs(map);
  void syncShowcaseToCloud(storeId, map);
}

/**
 * Reordena dois produtos na vitrine, trocando as posições.
 */
export function swapShowcaseOrder(idA: string, idB: string, storeId?: string | null): void {
  const map = loadShowcaseConfigs();
  const a = map[idA] ?? getShowcaseConfig(idA);
  const b = map[idB] ?? getShowcaseConfig(idB);
  const tempOrdem = a.ordem;
  map[idA] = { ...a, ordem: b.ordem, updatedAt: new Date().toISOString() };
  map[idB] = { ...b, ordem: tempOrdem, updatedAt: new Date().toISOString() };
  saveShowcaseConfigs(map);
  void syncShowcaseToCloud(storeId, map);
}

// ─── Auto-publish ─────────────────────────────────────────────────────────────

/** Lê a flag de publicação automática do localStorage. */
export function getAutoPublish(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw =
    localStorage.getItem(AUTO_PUBLISH_KEY) ??
    localStorage.getItem(LEGACY_AUTO_PUBLISH_KEY) ??
    localStorage.getItem(ANCESTRAL_AUTO_PUBLISH_KEY);
  if (raw === null) return true; // padrão: ativado
  try {
    return JSON.parse(raw) as boolean;
  } catch {
    return true;
  }
}

/** Salva a flag de publicação automática. */
export function setAutoPublish(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AUTO_PUBLISH_KEY, JSON.stringify(value));
}

// ─── Adapter: Inventário (Supabase) + Showcase Config → Produto da Vitrine ────

/** Tipo do item retornado pela inventoryQuery() */
export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  cost_price: number;
  sale_price: number;
  sizes: Record<string, number>;
  photo_url: string | null;
  sold_this_month: number;
  supplier: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

/** Produto unificado: dados do banco + configurações de vitrine */
export type ShowcaseProduct = InventoryItem & {
  showcase: ShowcaseItemConfig;
  /** Estoque total (soma de todos os tamanhos) */
  totalEstoque: number;
  /** Preço efetivo de venda (considera promoção ativa) */
  precoEfetivo: number;
  /** Se há promoção ativa agora */
  emPromocao: boolean;
  /**
   * Foto efetiva a usar nos templates.
   * Prioridade: vitrineFotos[0] > photo_url (foto básica do estoque) > null.
   */
  fotoEfetiva: string | null;
  /**
   * Galeria completa de fotos da vitrine (para carrosséis e hover).
   * Vazia se nenhuma foto premium foi cadastrada.
   */
  vitrineFotos: string[];
};

/** Verifica se a promoção do produto está ativa no momento atual */
function isPromocaoAtiva(config: ShowcaseItemConfig): boolean {
  if (!config.precoPromocional || config.precoPromocional <= 0) return false;
  const now = Date.now();
  if (config.promocaoInicio) {
    const inicioStr = config.promocaoInicio.includes("T")
      ? config.promocaoInicio
      : `${config.promocaoInicio}T00:00:00`;
    if (now < new Date(inicioStr).getTime()) return false;
  }
  if (config.promocaoFim) {
    const fimStr = config.promocaoFim.includes("T")
      ? config.promocaoFim
      : `${config.promocaoFim}T23:59:59.999`;
    if (now > new Date(fimStr).getTime()) return false;
  }
  return true;
}

/** Calcula o total em estoque de um item (soma todos os tamanhos) */
export function calcTotalEstoque(sizes: Record<string, number> | unknown): number {
  if (!sizes || typeof sizes !== "object") return 0;
  return Object.values(sizes as Record<string, number>).reduce(
    (acc, val) =>
      acc +
      (Math.round(typeof val === "number" ? val : parseFloat(String(val).replace(",", "."))) || 0),
    0,
  );
}

/**
 * Combina um item do inventário com sua configuração de vitrine.
 * Se fornecido `remoteMap`, honra os dados da nuvem prioritariamente.
 * Retorna um ShowcaseProduct completo e pronto para renderização.
 */
export function mergeWithShowcase(
  item: InventoryItem,
  remoteMap?: ShowcaseConfigMap | null,
): ShowcaseProduct {
  const showcase = getShowcaseConfig(item.id, remoteMap);
  const emPromocao = isPromocaoAtiva(showcase);
  const totalEstoque = calcTotalEstoque(item.sizes as Record<string, number>);
  const precoEfetivo =
    emPromocao && showcase.precoPromocional ? showcase.precoPromocional : item.sale_price;

  // Galeria premium da vitrine (sobrescreve a foto básica do estoque)
  const vitrineFotos = showcase.vitrineFotos ?? [];
  const fotoEfetiva = vitrineFotos[0] ?? item.photo_url;

  return {
    ...item,
    showcase,
    totalEstoque,
    precoEfetivo,
    emPromocao,
    fotoEfetiva,
    vitrineFotos,
  };
}

/**
 * Combina uma lista de itens do inventário com suas configurações de vitrine,
 * ordenados pela posição definida na vitrine.
 */
export function mergeInventoryWithShowcase(
  items: InventoryItem[],
  remoteMap?: ShowcaseConfigMap | null,
): ShowcaseProduct[] {
  return items
    .map((item) => mergeWithShowcase(item, remoteMap))
    .sort((a, b) => a.showcase.ordem - b.showcase.ordem);
}
