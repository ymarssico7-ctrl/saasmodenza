/**
 * vitrine-settings.ts
 *
 * Persistência local isolada por storeId para as configurações de estilo, redes sociais e políticas
 * da Vitrine Online (que não pertencem ao schema padrão do banco de dados).
 */

export type VitrineSettings = {
  ativa: boolean;
  descricao: string;
  corPrincipal: string;
  boasVindas: string;
  politicaTroca: string;
  mostrarEstoque: boolean;
  instagram: string;
  estado: string;
  logoUrl?: string;
  capaUrl?: string;
  chavePix?: string;
  tipoChavePix?: "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";
  titularPix?: string;
};

const DEFAULT_SETTINGS: VitrineSettings = {
  ativa: false,
  descricao: "",
  corPrincipal: "#3A3AF0",
  boasVindas: "",
  politicaTroca: "",
  mostrarEstoque: false,
  instagram: "",
  estado: "",
  logoUrl: "",
  capaUrl: "",
  chavePix: "",
  tipoChavePix: "cpf",
  titularPix: "",
};

export function getVitrineSettings(storeId: string): VitrineSettings {
  if (typeof localStorage === "undefined" || !storeId) return DEFAULT_SETTINGS;
  try {
    const raw =
      localStorage.getItem(`vestui_vitrine_settings_${storeId}`) ||
      localStorage.getItem(`modaly_vitrine_settings_${storeId}`) ||
      localStorage.getItem(`vestuli_vitrine_settings_${storeId}`);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as VitrineSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function isVitrineAtiva(
  storeId: string,
  storeMetadata?: Record<string, unknown> | null,
): boolean {
  if (typeof localStorage !== "undefined" && storeId) {
    try {
      const explicit = localStorage.getItem(`vestui_vitrine_ativa_${storeId}`);
      if (explicit !== null) return explicit === "true";
      const settings = getVitrineSettings(storeId);
      if (typeof settings.ativa === "boolean") return settings.ativa;
    } catch {
      // Fallback
    }
  }
  if (storeMetadata && typeof storeMetadata === "object") {
    const metaSettings = (storeMetadata as Record<string, any>)["vitrineSettings"];
    if (metaSettings && typeof metaSettings["ativa"] === "boolean") return metaSettings["ativa"];
    if (typeof (storeMetadata as Record<string, any>)["vitrine_ativa"] === "boolean") {
      return (storeMetadata as Record<string, any>)["vitrine_ativa"];
    }
  }
  return false;
}

export type BusinessModel = "fisica" | "hibrida" | "online";

export function getBusinessModel(
  storeId: string,
  storeMetadata?: Record<string, unknown> | null,
): BusinessModel {
  if (typeof localStorage !== "undefined" && storeId) {
    try {
      const explicit = localStorage.getItem(`vestui_business_model_${storeId}`);
      if (explicit === "fisica" || explicit === "hibrida" || explicit === "online") {
        return explicit;
      }
    } catch {
      // Fallback
    }
  }
  if (storeMetadata && typeof storeMetadata === "object") {
    const metaModel = (storeMetadata as Record<string, any>)["business_model"];
    if (metaModel === "fisica" || metaModel === "hibrida" || metaModel === "online") {
      return metaModel;
    }
  }
  return isVitrineAtiva(storeId, storeMetadata) ? "hibrida" : "fisica";
}

export function setBusinessModel(storeId: string, model: BusinessModel): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`vestui_business_model_${storeId}`, model);
  const ativa = model !== "fisica";
  localStorage.setItem(`vestui_vitrine_ativa_${storeId}`, String(ativa));
  const current = getVitrineSettings(storeId);
  const updated: VitrineSettings = { ...current, ativa };
  saveVitrineSettings(storeId, updated);
  try {
    window.dispatchEvent(
      new CustomEvent("business-model-changed", { detail: { storeId, model } }),
    );
    window.dispatchEvent(new Event("vitrine-settings-changed"));
  } catch {
    // SSR / Node: ignore
  }
}

export function setVitrineAtiva(storeId: string, ativa: boolean): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`vestui_vitrine_ativa_${storeId}`, String(ativa));
  const current = getVitrineSettings(storeId);
  const updated: VitrineSettings = { ...current, ativa };
  saveVitrineSettings(storeId, updated);

  try {
    const currentModel = localStorage.getItem(`vestui_business_model_${storeId}`);
    if (!ativa) {
      localStorage.setItem(`vestui_business_model_${storeId}`, "fisica");
    } else if (currentModel !== "online") {
      localStorage.setItem(`vestui_business_model_${storeId}`, "hibrida");
    }
    window.dispatchEvent(new Event("business-model-changed"));
  } catch {
    // Silencia erros
  }
}

export function saveVitrineSettings(storeId: string, settings: VitrineSettings): void {
  if (typeof localStorage === "undefined" || !storeId) return;
  localStorage.setItem(`vestui_vitrine_settings_${storeId}`, JSON.stringify(settings));
  try {
    window.dispatchEvent(
      new CustomEvent("vitrine-settings-changed", { detail: { storeId, settings } }),
    );
  } catch {
    // SSR / Node: ignore
  }
}

