// Utilitário centralizado para gerenciamento e sincronização otimista (0ms)
// de pedidos simulados e locais com o Supabase.

export const SIM_ORDERS_KEY = (storeId: string) =>
  `vestui_orders_v2_${storeId}`;

export const LEGACY_ORDERS_KEY = (storeId: string) =>
  `vestui_orders_${storeId}`;

export const ANCESTRAL_ORDERS_KEY = (storeId: string) =>
  `vestuli_orders_${storeId}`;

// Evento customizado disparado quando um pedido é criado/atualizado/removido
// na MESMA aba (window.storage event não funciona para a aba emissora).
export const SIM_ORDERS_EVENT = "sim-orders-changed";

export type RawSimOrder = {
  id: string;
  status?: string;
  total?: number;
  created_at?: string;
  criadoEm?: string;
  isSimulacao?: boolean;
  itens?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
  items?: Array<{ produtoId?: string; nome?: string; qtd?: number; preco?: number }>;
  [key: string]: unknown;
};

/**
 * Lê pedidos gravados no localStorage com suporte a migração automática de chaves legadas.
 */
export function loadStoredOrders<T = RawSimOrder>(storeId: string): T[] {
  if (typeof window === "undefined" || !storeId) return [];
  try {
    const raw =
      window.localStorage.getItem(SIM_ORDERS_KEY(storeId)) ||
      window.localStorage.getItem(LEGACY_ORDERS_KEY(storeId)) ||
      window.localStorage.getItem(ANCESTRAL_ORDERS_KEY(storeId));
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

/**
 * Grava pedidos no localStorage de forma síncrona (0ms) e propaga evento de sincronização.
 * Atualiza tanto a chave v2 quanto a chave legada para compatibilidade retroativa total.
 */
export function saveStoredOrders<T>(storeId: string, orders: T[]): void {
  if (typeof window === "undefined" || !storeId) return;
  try {
    const json = JSON.stringify(orders);
    window.localStorage.setItem(SIM_ORDERS_KEY(storeId), json);
    window.localStorage.setItem(LEGACY_ORDERS_KEY(storeId), json);
    notifySimOrdersChanged();
  } catch (err) {
    console.error("Erro ao salvar pedidos no localStorage:", err);
  }
}

/**
 * Mescla pedidos reais do Supabase com pedidos simulados do localStorage.
 * Pedidos simulados recebem `isSimulacao: true` para que cada módulo possa
 * sinalizar visualmente que aquele dado é de treino.
 */
export function mergeSimOrders<T extends { id: string }>(
  supabaseOrders: T[],
  storeId: string,
): (T & { isSimulacao?: boolean })[] {
  if (typeof window === "undefined" || !storeId) return supabaseOrders;
  try {
    const locals = loadStoredOrders<RawSimOrder>(storeId);
    if (!locals.length) return supabaseOrders;
    const dbIds = new Set(supabaseOrders.map((o) => o.id));
    const simOnly = locals
      .filter((o) => !dbIds.has(o.id))
      .map((o) => ({ ...o, isSimulacao: true }) as T & { isSimulacao: boolean });
    return [...supabaseOrders, ...simOnly];
  } catch {
    return supabaseOrders;
  }
}

/**
 * Dispara o evento de mudança nos pedidos para a aba atual.
 */
export function notifySimOrdersChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SIM_ORDERS_EVENT));
  }
}
