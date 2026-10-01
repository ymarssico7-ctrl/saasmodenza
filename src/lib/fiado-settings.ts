/**
 * fiado-settings.ts
 *
 * Gerenciamento e persistência das configurações do "Modo Fiado" (Caderninho de Vendas a Prazo)
 * por loja (storeId), com reatividade em tempo real entre abas e componentes.
 */

export const FIADO_SETTINGS_EVENT = "vestui-fiado-settings-changed";

export type FiadoConfig = {
  ativo: boolean;
  diasVencimentoPadrao: number;
  mensagemCobrancaTemplate: string;
};

const DEFAULT_FIADO_CONFIG: FiadoConfig = {
  ativo: true,
  diasVencimentoPadrao: 30,
  mensagemCobrancaTemplate:
    "Olá, {nome}! Tudo bem? Passando para lembrar com carinho da sua compra no valor de {valor} na {loja}, referente a: {descricao}. Se precisar da chave Pix ou combinar uma data, estamos à disposição!",
};

export function getFiadoConfig(storeId: string): FiadoConfig {
  if (typeof localStorage === "undefined" || !storeId) return DEFAULT_FIADO_CONFIG;
  try {
    const raw = localStorage.getItem(`vestui_fiado_config_${storeId}`);
    if (!raw) {
      // Se não houver configuração salva, verifica o business model da loja
      const businessModel = localStorage.getItem(`vestui_business_model_${storeId}`);
      // Lojas 100% online iniciam com fiado desativado; física e híbrida com fiado ativado
      const defaultAtivo = businessModel !== "online";
      return { ...DEFAULT_FIADO_CONFIG, ativo: defaultAtivo };
    }
    return { ...DEFAULT_FIADO_CONFIG, ...JSON.parse(raw) } as FiadoConfig;
  } catch {
    return DEFAULT_FIADO_CONFIG;
  }
}

export function isFiadoAtivo(storeId: string): boolean {
  if (typeof localStorage === "undefined" || !storeId) return true;
  try {
    const explicit = localStorage.getItem(`vestui_fiado_ativo_${storeId}`);
    if (explicit !== null) return explicit === "true";
    return getFiadoConfig(storeId).ativo;
  } catch {
    return true;
  }
}

export function setFiadoAtivo(storeId: string, ativo: boolean): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`vestui_fiado_ativo_${storeId}`, String(ativo));
  const current = getFiadoConfig(storeId);
  const updated: FiadoConfig = { ...current, ativo };
  saveFiadoConfig(storeId, updated);
}

export function saveFiadoConfig(storeId: string, config: FiadoConfig): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`vestui_fiado_config_${storeId}`, JSON.stringify(config));
  localStorage.setItem(`vestui_fiado_ativo_${storeId}`, String(config.ativo));
  try {
    window.dispatchEvent(
      new CustomEvent(FIADO_SETTINGS_EVENT, { detail: { storeId, config } }),
    );
  } catch {
    // SSR / Node environment
  }
}
