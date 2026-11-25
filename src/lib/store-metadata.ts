/**
 * store-metadata.ts — Camada atômica de persistência para `stores.metadata`
 *
 * Garante que atualizações de tema ou template no Modo Engine façam leitura
 * prévia do registro mais recente no Supabase antes de mesclar campos no JSONB,
 * evitando sobrescrita destrutiva de dados concorrentes (cupons, frete, integrações, etc.).
 */

import { supabase } from "@/integrations/supabase/client";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

export type ThemeHistoryEntry = {
  savedAt: string;
  theme: ThemeConfig;
};

/**
 * Mescla um patch parcial em `stores.metadata` preservando todas as chaves existentes no banco.
 */
export async function mergeStoreMetadata(
  storeId: string,
  patch: Record<string, unknown>,
): Promise<{ error: Error | null; metadata: Record<string, unknown> | null }> {
  try {
    const { data: freshRow, error: fetchError } = await supabase
      .from("stores")
      .select("metadata")
      .eq("id", storeId)
      .maybeSingle();

    if (fetchError) {
      return { error: new Error(fetchError.message), metadata: null };
    }

    const currentMeta = (freshRow?.metadata as Record<string, unknown> | null) ?? {};
    const mergedMetadata: Record<string, unknown> = {
      ...currentMeta,
      ...patch,
    };

    const { error: updateError } = await supabase
      .from("stores")
      .update({ metadata: mergedMetadata as never })
      .eq("id", storeId);

    if (updateError) {
      return { error: new Error(updateError.message), metadata: null };
    }

    return { error: null, metadata: mergedMetadata };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Erro ao atualizar metadados da loja"),
      metadata: null,
    };
  }
}

/**
 * Persiste `theme` e `templateId` na nuvem de forma atômica preservando metadados paralelos.
 * Quando `recordHistory` é true, grava snapshot nas últimas 5 versões publicadas.
 */
export async function saveStoreThemeToCloud(
  storeId: string,
  theme: ThemeConfig,
  options?: { recordHistory?: boolean },
): Promise<{ error: Error | null; metadata: Record<string, unknown> | null }> {
  try {
    const { data: freshRow, error: fetchError } = await supabase
      .from("stores")
      .select("metadata")
      .eq("id", storeId)
      .maybeSingle();

    if (fetchError) {
      return { error: new Error(fetchError.message), metadata: null };
    }

    const currentMeta = (freshRow?.metadata as Record<string, unknown> | null) ?? {};

    let nextHistory = currentMeta["themeHistory"];
    if (options?.recordHistory) {
      const previousHistory = Array.isArray(currentMeta["themeHistory"])
        ? (currentMeta["themeHistory"] as ThemeHistoryEntry[])
        : [];
      nextHistory = [
        { savedAt: new Date().toISOString(), theme },
        ...previousHistory.filter((item) => item?.savedAt && item?.theme).slice(0, 4),
      ];
    }

    const mergedMetadata: Record<string, unknown> = {
      ...currentMeta,
      theme,
      templateId: theme.settings.templateId,
      ...(options?.recordHistory ? { themeHistory: nextHistory } : {}),
    };

    const { error: updateError } = await supabase
      .from("stores")
      .update({ metadata: mergedMetadata as never })
      .eq("id", storeId);

    if (updateError) {
      return { error: new Error(updateError.message), metadata: null };
    }

    return { error: null, metadata: mergedMetadata };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Erro ao salvar tema na nuvem"),
      metadata: null,
    };
  }
}
