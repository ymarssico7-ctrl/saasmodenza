/**
 * showcase-store.ts
 *
 * Camada de persistência para configurações da Vitrine Online.
 *
 * ARQUITETURA:
 *   - O "backstage" (dados reais: nome, preço, grade, custo) vive no Supabase → `inventory_items`.
 *   - O "palco" (visibilidade, destaque, preço promocional, ordem) vive aqui no localStorage.
 *   - Ao exibir a vitrine, fazemos o merge: dados do banco + configs deste store.
 *
 * COMPATIBILIDADE:
 *   - Funciona em modo Demo (sem autenticação Supabase).
 *   - Funciona em modo Autenticado — o `userId` isola os dados por conta.
 *   - Zero migrations de banco necessárias.
 */

const STORAGE_KEY = "vestuli_showcase_configs_v1";
const LEGACY_STORAGE_KEY = "modaly_showcase_configs_v1";
const AUTO_PUBLISH_KEY = "vestuli_showcase_auto_publish";
const LEGACY_AUTO_PUBLISH_KEY = "modaly_showcase_auto_publish";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ShowcaseItemConfig = {
  /** Produto visível na vitrine. Padrão: false */
  ativo: boolean;
  /** Produto exibido em destaque na home. Padrão: false */
  destaque: boolean;
  /** Esconde o preço — cliente deve negociar via WhatsApp. Padrão: false */
  precoOculto: boolean;
  /** Preço promocional (exibido com o original riscado). Opcional. */
  precoPromocional?: number;
  /** Início da promoção (ISO string). */
  promocaoInicio?: string;
  /** Fim da promoção (ISO string). */
  promocaoFim?: string;
  /** Posição de ordenação na vitrine (menor = mais no topo). */
  ordem: number;
  /** Timestamp da última atualização. */
  updatedAt: string;
  /**
   * Galeria de fotos premium exclusiva da vitrine.
   * Se preenchida, substitui a foto básica do estoque nos templates da loja.
   * Primeira foto = capa; segunda foto = hover (se o template suportar).
   */
  vitrineFotos?: string[];
};

export type ShowcaseConfigMap = Record<string, ShowcaseItemConfig>;

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const SHOWCASE_ITEM_DEFAULTS: Omit<ShowcaseItemConfig, "ordem" | "updatedAt"> = {
  ativo: false,
  destaque: false,
  precoOculto: false,
};

// ─── Leitura / Escrita ────────────────────────────────────────────────────────

/** Carrega o mapa completo de configurações do localStorage. */
export function loadShowcaseConfigs(): ShowcaseConfigMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Retorna a configuração de vitrine de um produto específico.
 * Se não existir, retorna os valores padrão.
 */
export function getShowcaseConfig(itemId: string): ShowcaseItemConfig {
  const map = loadShowcaseConfigs();
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
 */
export function patchShowcaseConfig(
  itemId: string,
  patch: Partial<ShowcaseItemConfig>,
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
  return updated;
}

/**
 * Verifica se há algum produto ativo na vitrine.
 * Usado para detectar se o usuário já fez o onboarding da loja.
 */
export function hasAnyActiveProduct(): boolean {
  const map = loadShowcaseConfigs();
  return Object.values(map).some((c) => c.ativo);
}

/**
 * Ativa todos os produtos da lista na vitrine (usado no Onboarding "Aha! Moment").
 * Produtos já configurados têm apenas o `ativo` ativado; as outras configs são preservadas.
 */
export function bulkActivateAll(itemIds: string[]): void {
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
}

/**
 * Reordena dois produtos na vitrine, trocando as posições.
 */
export function swapShowcaseOrder(idA: string, idB: string): void {
  const map = loadShowcaseConfigs();
  const a = map[idA] ?? getShowcaseConfig(idA);
  const b = map[idB] ?? getShowcaseConfig(idB);
  const tempOrdem = a.ordem;
  map[idA] = { ...a, ordem: b.ordem, updatedAt: new Date().toISOString() };
  map[idB] = { ...b, ordem: tempOrdem, updatedAt: new Date().toISOString() };
  saveShowcaseConfigs(map);
}

// ─── Auto-publish ─────────────────────────────────────────────────────────────

/** Lê a flag de publicação automática do localStorage. */
export function getAutoPublish(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(AUTO_PUBLISH_KEY) ?? localStorage.getItem(LEGACY_AUTO_PUBLISH_KEY);
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
  if (!config.promocaoInicio || !config.promocaoFim || !config.precoPromocional) return false;
  const now = Date.now();
  const inicio = new Date(config.promocaoInicio).getTime();
  const fimStr = config.promocaoFim.includes("T")
    ? config.promocaoFim
    : `${config.promocaoFim}T23:59:59.999`;
  const fim = new Date(fimStr).getTime();
  return now >= inicio && now <= fim;
}

/** Calcula o total em estoque de um item (soma todos os tamanhos) */
export function calcTotalEstoque(sizes: Record<string, number> | unknown): number {
  if (!sizes || typeof sizes !== "object") return 0;
  return Object.values(sizes as Record<string, number>).reduce(
    (acc, val) => acc + Number(val || 0),
    0,
  );
}

/**
 * Combina um item do inventário com sua configuração de vitrine.
 * Retorna um ShowcaseProduct completo e pronto para renderização.
 */
export function mergeWithShowcase(item: InventoryItem): ShowcaseProduct {
  const showcase = getShowcaseConfig(item.id);
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
export function mergeInventoryWithShowcase(items: InventoryItem[]): ShowcaseProduct[] {
  return items.map(mergeWithShowcase).sort((a, b) => a.showcase.ordem - b.showcase.ordem);
}
