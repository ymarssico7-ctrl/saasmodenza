// ─── Hook Central de Acesso (Modelo Multi-Planos: Free, Lote e Store) ──────
// Free: Precificação até 3 lotes/mês (sem etiquetas, sem histórico persistido)
// Lote (R$ 19,90): Lotes ilimitados + Etiquetas PDF + Histórico + Simulador
// Store (R$ 97,00): Tudo acima + Vitrine Online + Estoque Unificado + PDV Balcão

import type { Store } from "@/lib/store-context";

export type PlanTier = "free" | "lote" | "store";

export type Profile = {
  id: string;
  store_name?: string | null;
  owner_name?: string | null;
  city?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  prolabore_target?: number | null;
  plan?: string | null;
  plan_tier?: string | null;
  plan_expires_at?: string | null;
  onboarding_done?: boolean | null;
  store_trial_offered_at?: string | null;
  store_trial_accepted?: boolean | null;
  store_trial_expires_at?: string | null;
  store_subscription_active?: boolean | null;
  store_subscription_expires_at?: string | null;
};

export type TrialStatus =
  | "not_offered"
  | "active"
  | "declined"
  | "expired"
  | "subscribed";

export type AccessInfo = {
  /** Nível do plano ativo: 'free', 'lote' (R$ 19,90) ou 'store' (R$ 97) */
  tier: PlanTier;
  isFree: boolean;
  isLote: boolean;
  isStore: boolean;

  /** Permissões Granulares */
  canUsePricing: boolean;
  canPrintLabels: boolean;
  canUnlimitedBatches: boolean;
  canSaveHistory: boolean;
  canSimulateDiscounts: boolean;
  canAccessStorefront: boolean;
  canAccessPOS: boolean;
  canAccessConditional: boolean;
  freeBatchesLimit: number;

  /** Verdade única retrocompatível: true se tem qualquer plano pago ou trial */
  isActive: boolean;
  /** Alias retrocompatível de isActive */
  hasGestao: boolean;
  /** Alias retrocompatível de isActive */
  hasLoja: boolean;

  trialStatus: TrialStatus;
  daysLeftInTrial: number | null;
  isTrialUrgent: boolean;
  isShouldShowTrialModal: boolean;
};

export function useAccess(
  profile: Profile | null | undefined,
  store?: Store | null | undefined,
): AccessInfo {
  const now = new Date();

  const emptyAccess: AccessInfo = {
    tier: "free",
    isFree: true,
    isLote: false,
    isStore: false,
    canUsePricing: true,
    canPrintLabels: false,
    canUnlimitedBatches: false,
    canSaveHistory: false,
    canSimulateDiscounts: false,
    canAccessStorefront: false,
    canAccessPOS: false,
    canAccessConditional: false,
    freeBatchesLimit: 3,
    isActive: false,
    hasGestao: false,
    hasLoja: false,
    trialStatus: "not_offered",
    daysLeftInTrial: null,
    isTrialUrgent: false,
    isShouldShowTrialModal: false,
  };

  if (!profile && !store) {
    return emptyAccess;
  }

  // ── Identificação do Plano ────────────────────────────────────────────────
  const rawPlan = (store?.plan || profile?.plan || "").toLowerCase();
  const rawTier = (profile?.plan_tier || "").toLowerCase();
  const rawPlanExpires = store?.plan_expires_at || profile?.plan_expires_at;
  const planExpiresAt = rawPlanExpires ? new Date(rawPlanExpires) : null;
  const planAtivo = !!rawPlan && (planExpiresAt ? planExpiresAt > now : true);

  // ── Trial da Loja Online ───────────────────────────────────────────────────
  const storeTrialAccepted = store?.store_trial_accepted ?? profile?.store_trial_accepted;
  const storeTrialExpires = store?.store_trial_expires_at ?? profile?.store_trial_expires_at;
  const trialExpiresAt = storeTrialExpires ? new Date(storeTrialExpires) : null;
  const trialAtivo =
    storeTrialAccepted === true && trialExpiresAt !== null && trialExpiresAt > now;

  let daysLeftInTrial: number | null = null;
  if (trialAtivo && trialExpiresAt) {
    const diffMs = trialExpiresAt.getTime() - now.getTime();
    daysLeftInTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // ── Assinatura ativa ──────────────────────────────────────────────────────
  const storeSubActive = store?.store_subscription_active ?? profile?.store_subscription_active;
  const storeSubExpires = store?.store_subscription_expires_at ?? profile?.store_subscription_expires_at;
  const subExpiresAt = storeSubExpires ? new Date(storeSubExpires) : null;
  const assinanteAtivo =
    storeSubActive === true && (subExpiresAt !== null ? subExpiresAt > now : true);

  // ── Resolução do Tier (Free, Lote ou Store) ────────────────────────────────
  // PRECEDÊNCIA EXPLÍCITA: Se o plano for explicitamente "free", é Gratuito sem exceção!
  let tier: PlanTier = "free";

  if (rawPlan === "free" || rawPlan === "gratuito" || rawTier === "free") {
    tier = "free";
  } else if (rawPlan === "lote" || rawPlan === "vestui_lote" || rawTier === "lote") {
    tier = "lote";
  } else if (
    trialAtivo ||
    assinanteAtivo ||
    rawTier === "store" ||
    rawPlan === "store" ||
    rawPlan === "gestao_anual" ||
    rawPlan === "digital" ||
    rawPlan === "completo" ||
    rawPlan === "pro"
  ) {
    tier = "store";
  } else {
    tier = "free";
  }

  const isFree = tier === "free";
  const isLote = tier === "lote";
  const isStore = tier === "store";

  const isActive = isStore || isLote;

  // ── Estado do Trial ───────────────────────────────────────────────────────
  let trialStatus: TrialStatus;
  if (isStore && (assinanteAtivo || planAtivo)) {
    trialStatus = "subscribed";
  } else if (isFree) {
    trialStatus = "not_offered";
  } else if (storeTrialAccepted === null || storeTrialAccepted === undefined) {
    trialStatus = "not_offered";
  } else if (storeTrialAccepted === false) {
    trialStatus = "declined";
  } else if (trialAtivo) {
    trialStatus = "active";
  } else {
    trialStatus = "expired";
  }

  // Desativado modal legado intrusivo de trial para priorizar os 3 planos oficiais
  const isShouldShowTrialModal = false;

  return {
    tier,
    isFree,
    isLote,
    isStore,

    // Permissões
    canUsePricing: true,
    canPrintLabels: isLote || isStore,
    canUnlimitedBatches: isLote || isStore,
    canSaveHistory: isLote || isStore,
    canSimulateDiscounts: isLote || isStore,
    canAccessStorefront: isStore,
    canAccessPOS: isStore,
    canAccessConditional: isStore,
    freeBatchesLimit: 3,

    // Compatibilidade retroativa
    isActive,
    hasGestao: true, // Precificação sempre liberada
    hasLoja: isStore,

    trialStatus,
    daysLeftInTrial,
    isTrialUrgent: daysLeftInTrial !== null && daysLeftInTrial <= 7,
    isShouldShowTrialModal,
  };
}
