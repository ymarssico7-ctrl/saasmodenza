/**
 * pricing-settings.ts
 *
 * Gerenciamento e persistência das configurações de taxas de cartão,
 * alíquotas de impostos (DAS/Simples) e margens padrão da loja (storeId).
 * Sincronizado com localStorage e Supabase stores.metadata.
 */

import { supabase } from "@/integrations/supabase/client";

export const PRICING_SETTINGS_EVENT = "vestui-pricing-settings-changed";

export type CardRates = {
  pix: number;
  debito: number;
  credito1x: number;
  parcelado: number;
};

export type TaxPresets = {
  mei: number;
  simplesF1: number;
  simplesF2: number;
  simplesF3: number;
};

export type PricingSettings = {
  defaultTax: number;
  defaultCardRate: number;
  defaultMargin: number;
  cardRates: CardRates;
  taxPresets: TaxPresets;
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  defaultTax: 6.0,
  defaultCardRate: 3.5,
  defaultMargin: 50,
  cardRates: {
    pix: 0,
    debito: 1.5,
    credito1x: 3.2,
    parcelado: 5.5,
  },
  taxPresets: {
    mei: 0,
    simplesF1: 4.0,
    simplesF2: 7.0,
    simplesF3: 10.0,
  },
};

export function getPricingSettings(storeId?: string): PricingSettings {
  if (typeof localStorage === "undefined") return DEFAULT_PRICING_SETTINGS;
  const key = storeId ? `vestui_pricing_settings_${storeId}` : "vestui_pricing_settings_default";
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PRICING_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      defaultTax: typeof parsed.defaultTax === "number" ? parsed.defaultTax : DEFAULT_PRICING_SETTINGS.defaultTax,
      defaultCardRate: typeof parsed.defaultCardRate === "number" ? parsed.defaultCardRate : DEFAULT_PRICING_SETTINGS.defaultCardRate,
      defaultMargin: typeof parsed.defaultMargin === "number" ? parsed.defaultMargin : DEFAULT_PRICING_SETTINGS.defaultMargin,
      cardRates: {
        ...DEFAULT_PRICING_SETTINGS.cardRates,
        ...(parsed.cardRates ?? {}),
      },
      taxPresets: {
        ...DEFAULT_PRICING_SETTINGS.taxPresets,
        ...(parsed.taxPresets ?? {}),
      },
    };
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

export async function savePricingSettings(storeId: string, settings: PricingSettings): Promise<void> {
  if (typeof localStorage !== "undefined") {
    const key = storeId ? `vestui_pricing_settings_${storeId}` : "vestui_pricing_settings_default";
    localStorage.setItem(key, JSON.stringify(settings));
    window.dispatchEvent(new Event(PRICING_SETTINGS_EVENT));
  }

  // Tenta persistir no Supabase se houver storeId válido
  if (storeId && storeId !== "00000000-0000-0000-0000-000000000000") {
    try {
      const { data: storeData } = await supabase
        .from("stores")
        .select("metadata")
        .eq("id", storeId)
        .maybeSingle();

      const currentMeta = (storeData?.metadata && typeof storeData.metadata === "object"
        ? storeData.metadata
        : {}) as Record<string, unknown>;

      await supabase
        .from("stores")
        .update({
          metadata: {
            ...currentMeta,
            pricing_settings: settings,
          },
        })
        .eq("id", storeId);
    } catch {
      // Falha silenciosa em caso de conexão offline
    }
  }
}
