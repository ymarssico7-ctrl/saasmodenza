/**
 * custom-options.ts
 *
 * Gerencia categorias e formas de pagamento personalizadas por loja (storeId).
 * Persiste no localStorage isolado por loja e emite eventos para sincronização
 * em tempo real entre componentes — tanto na mesma aba (CustomEvent) quanto
 * em outras abas abertas do navegador (storage event nativo).
 */

export type CustomOption = {
  value: string;
  label: string;
  custom: true;
  rate?: number;
};

export type CustomColorOption = {
  value: string;
  label: string;
  hex?: string | undefined;
  custom: true;
};

export type CustomSizeOption = {
  value: string;
  label: string;
  custom: true;
};

type CustomOptionsStore = {
  entryCategories: CustomOption[];
  exitCategories: CustomOption[];
  paymentMethods: CustomOption[];
  customColors: CustomColorOption[];
  customSizes: CustomSizeOption[];
};

const DEFAULT: CustomOptionsStore = {
  entryCategories: [],
  exitCategories: [],
  paymentMethods: [],
  customColors: [],
  customSizes: [],
};

function key(storeId: string) {
  return `vestui_custom_options_${storeId}`;
}

function legacyKey(storeId: string) {
  return `modaly_custom_options_${storeId}`;
}

function ancestralKey(storeId: string) {
  return `vestuli_custom_options_${storeId}`;
}

export function getCustomOptions(storeId: string): CustomOptionsStore {
  if (!storeId || typeof localStorage === "undefined") return DEFAULT;
  try {
    const raw =
      localStorage.getItem(key(storeId)) ||
      localStorage.getItem(legacyKey(storeId)) ||
      localStorage.getItem(ancestralKey(storeId));
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      entryCategories: parsed.entryCategories ?? [],
      exitCategories: parsed.exitCategories ?? [],
      paymentMethods: parsed.paymentMethods ?? [],
      customColors: parsed.customColors ?? [],
      customSizes: parsed.customSizes ?? [],
    } as CustomOptionsStore;
  } catch {
    return DEFAULT;
  }
}

function saveCustomOptions(storeId: string, data: CustomOptionsStore) {
  if (!storeId || typeof localStorage === "undefined") return;
  const storageKey = key(storeId);
  const serialized = JSON.stringify(data);
  localStorage.setItem(storageKey, serialized);
  try {
    // Notifica componentes na mesma aba (CustomEvent)
    window.dispatchEvent(new CustomEvent("custom-options-changed", { detail: { storeId } }));
    // Notifica outras abas abertas no navegador (storage event nativo)
    // O navegador só dispara "storage" em outras abas automaticamente.
    // Para forçar o mesmo comportamento na aba atual de forma consistente,
    // usamos o CustomEvent acima. Outras abas recebem o evento nativo.
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

export function addCustomPaymentMethod(storeId: string, label: string, rate: number = 0): CustomOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_pay_${Date.now()}`;
  const option: CustomOption = { value, label: label.trim(), custom: true, rate };
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
  newRate?: number,
) {
  const opts = getCustomOptions(storeId);
  opts[kind] = (opts[kind] as any[]).map((o) => {
    if (o.value !== value) return o;
    const updated = { ...o, label: newLabel.trim() };
    if (newRate !== undefined) updated.rate = newRate;
    return updated;
  });
  saveCustomOptions(storeId, opts);
}

export function addCustomColor(storeId: string, label: string, hex?: string): CustomColorOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_color_${Date.now()}`;
  const option: CustomColorOption = {
    value,
    label: label.trim(),
    ...(hex?.trim() ? { hex: hex.trim() } : {}),
    custom: true,
  };
  opts.customColors = [...opts.customColors, option];
  saveCustomOptions(storeId, opts);
  return option;
}

export function addCustomSize(storeId: string, label: string): CustomSizeOption {
  const opts = getCustomOptions(storeId);
  const value = `custom_size_${Date.now()}`;
  const option: CustomSizeOption = {
    value,
    label: label.trim().toUpperCase(),
    custom: true,
  };
  opts.customSizes = [...opts.customSizes, option];
  saveCustomOptions(storeId, opts);
  return option;
}

export function removeCustomColor(storeId: string, value: string) {
  const opts = getCustomOptions(storeId);
  opts.customColors = opts.customColors.filter((o) => o.value !== value);
  saveCustomOptions(storeId, opts);
}

export function removeCustomSize(storeId: string, value: string) {
  const opts = getCustomOptions(storeId);
  opts.customSizes = opts.customSizes.filter((o) => o.value !== value);
  saveCustomOptions(storeId, opts);
}

export function updateCustomColor(
  storeId: string,
  value: string,
  newLabel: string,
  newHex?: string,
) {
  const opts = getCustomOptions(storeId);
  opts.customColors = opts.customColors.map((o) => {
    if (o.value !== value) return o;
    const updated: CustomColorOption = { ...o, label: newLabel.trim() };
    if (newHex !== undefined) {
      if (newHex.trim()) updated.hex = newHex.trim();
      else delete updated.hex;
    }
    return updated;
  });
  saveCustomOptions(storeId, opts);
}

export function updateCustomSize(
  storeId: string,
  value: string,
  newLabel: string,
) {
  const opts = getCustomOptions(storeId);
  opts.customSizes = opts.customSizes.map((o) => {
    if (o.value !== value) return o;
    return { ...o, label: newLabel.trim().toUpperCase() };
  });
  saveCustomOptions(storeId, opts);
}

export type { CustomOptionsStore };
