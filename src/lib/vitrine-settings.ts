/**
 * vitrine-settings.ts
 *
 * Persistência local isolada por storeId para as configurações de estilo, redes sociais e políticas
 * da Vitrine Online (que não pertencem ao schema padrão do banco de dados).
 */

export type VitrineSettings = {
  descricao: string;
  corPrincipal: string;
  boasVindas: string;
  politicaTroca: string;
  mostrarEstoque: boolean;
  instagram: string;
  estado: string;
};

const DEFAULT_SETTINGS: VitrineSettings = {
  descricao: "Moda feminina autoral, peças selecionadas à mão.",
  corPrincipal: "#3A3AF0",
  boasVindas: "Oi! Que bom te ver por aqui. Qualquer dúvida, me chama no WhatsApp 💜",
  politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
  mostrarEstoque: false,
  instagram: "",
  estado: "",
};

export function getVitrineSettings(storeId: string): VitrineSettings {
  if (typeof localStorage === "undefined" || !storeId) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(`modaly_vitrine_settings_${storeId}`);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as VitrineSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveVitrineSettings(storeId: string, settings: VitrineSettings): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`modaly_vitrine_settings_${storeId}`, JSON.stringify(settings));
  try {
    window.dispatchEvent(new CustomEvent("vitrine-settings-changed", { detail: { storeId, settings } }));
  } catch {
    // SSR / Node: ignore
  }
}
