/**
 * custom-options.ts
 *
 * Gerencia categorias e formas de pagamento personalizadas por loja (storeId).
 * Persiste no localStorage isolado por loja e emite eventos para sincronização
 * em tempo real entre componentes da mesma aba.
 */

export type CustomOption = { value: string; label: string; custom: true };

type CustomOptionsStore = {
  entryCategories: CustomOption[];
  exitCategories: CustomOption[];
  paymentMethods: CustomOption[];
};

const DEFAULT: CustomOptionsStore = {
  entryCategories: [],
  exitCategories: [],
  paymentMethods: [],
};

function key(storeId: string) {
  return `modaly_custom_options_${storeId}`;
}

export function getCustomOptions(storeId: string): CustomOptionsStore {
  if (!storeId || typeof localStorage === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(key(storeId));
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) } as CustomOptionsStore;
  } catch {
    return DEFAULT;
  }
}

function saveCustomOptions(storeId: string, data: CustomOptionsStore) {
  if (!storeId || typeof localStorage === "undefined") return;
  localStorage.setItem(key(storeId), JSON.stringify(data));
  try {
    window.dispatchEvent(new CustomEvent("custom-options-changed", { detail: { storeId } }));
  } catch { /* SSR/Node: ignore */ }
}

export function addCustomEntry(storeId: string, label: string): CustomOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_entry_${Date.now()}`;
  const option: CustomOption = { value, label: label.trim(), custom: true };
  opts.entryCategories = [...opts.entryCategories, option];
  saveCustomOptions(storeId, opts);
  return option;
}

export function addCustomExit(storeId: string, label: string): CustomOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_exit_${Date.now()}`;
  const option: CustomOption = { value, label: label.trim(), custom: true };
  opts.exitCategories = [...opts.exitCategories, option];
  saveCustomOptions(storeId, opts);
  return option;
}

export function addCustomPaymentMethod(storeId: string, label: string): CustomOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_pay_${Date.now()}`;
  const option: CustomOption = { value, label: label.trim(), custom: true };
  opts.paymentMethods = [...opts.paymentMethods, option];
  saveCustomOptions(storeId, opts);
  return option;
}

export function removeCustomOption(
  storeId: string,
  kind: keyof CustomOptionsStore,
  value: string,
) {
  const opts = getCustomOptions(storeId);
  opts[kind] = opts[kind].filter((o) => o.value !== value);
  saveCustomOptions(storeId, opts);
}

export function updateCustomOption(
  storeId: string,
  kind: keyof CustomOptionsStore,
  value: string,
  newLabel: string,
) {
  const opts = getCustomOptions(storeId);
  opts[kind] = opts[kind].map((o) => (o.value === value ? { ...o, label: newLabel.trim() } : o));
  saveCustomOptions(storeId, opts);
}
export type { CustomOptionsStore };
