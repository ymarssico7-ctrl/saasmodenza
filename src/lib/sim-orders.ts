// Utilitário centralizado para mesclar pedidos simulados (localStorage) com os
// pedidos reais do Supabase. Isso permite que a simulação reflita em todo o
// sistema sem jamais poluir o banco de dados.

export const SIM_ORDERS_KEY = (storeId: string) =>
  `vestui_orders_v2_${storeId}`;

// Evento customizado disparado quando um pedido simulado é criado/removido
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
 * Mescla pedidos reais do Supabase com pedidos simulados do localStorage.
 * Pedidos simulados recebem `isSimulacao: true` para que cada módulo possa
 * sinalizar visualmente que aquele dado é de treino.
 */
export function mergeSimOrders<T extends { id: string }>(
  supabaseOrders: T[],
  storeId: string,
): (T & { isSimulacao?: boolean })[] {
  if (typeof window === "undefined") return supabaseOrders;
  try {
    const raw = window.localStorage.getItem(SIM_ORDERS_KEY(storeId));
    if (!raw) return supabaseOrders;
    const locals = JSON.parse(raw) as RawSimOrder[];
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
 * Dispara o evento de mudança nos pedidos simulados para a aba atual.
 * Chamar após salvar no localStorage.
 */
export function notifySimOrdersChanged() {
  window.dispatchEvent(new Event(SIM_ORDERS_EVENT));
}
