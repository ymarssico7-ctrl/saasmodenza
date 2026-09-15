// ─── Hook Central de Acesso (Modelo Unificado) ─────────────────────────────
// O Vestui é um produto único. Um plano libera 100% do sistema.
// hasGestao e hasLoja são aliases retrocompatíveis de isActive.

import type { Store } from "@/lib/store-context";

export type Profile = {
  id: string;
  store_name?: string | null;
  owner_name?: string | null;
  city?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  prolabore_target?: number | null;
  plan?: string | null;
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
  /** Verdade única: true se o sistema está liberado por qualquer mecanismo */
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

  if (!profile && !store) {
    return {
      isActive: false,
      hasGestao: false,
      hasLoja: false,
      trialStatus: "not_offered",
      daysLeftInTrial: null,
      isTrialUrgent: false,
      isShouldShowTrialModal: false,
    };
  }

  // ── Plano ─────────────────────────────────────────────────────────────────
  const rawPlan = store?.plan || profile?.plan;
  const rawPlanExpires = store?.plan_expires_at || profile?.plan_expires_at;
  const planExpiresAt = rawPlanExpires ? new Date(rawPlanExpires) : null;
  const planAtivo = !!rawPlan && (planExpiresAt ? planExpiresAt > now : true);

  // ── Trial ──────────────────────────────────────────────────────────────────
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

  // ── Acesso Unificado — Um plano cobre TUDO ────────────────────────────────
  const isActive = planAtivo || trialAtivo || assinanteAtivo;

  // ── Estado do Trial ───────────────────────────────────────────────────────
  let trialStatus: TrialStatus;
  if (assinanteAtivo || planAtivo) {
    trialStatus = "subscribed";
  } else if (storeTrialAccepted === null || storeTrialAccepted === undefined) {
    trialStatus = "not_offered";
  } else if (storeTrialAccepted === false) {
    trialStatus = "declined";
  } else if (trialAtivo) {
    trialStatus = "active";
  } else {
    trialStatus = "expired";
  }

  // Modal de trial: mostra para qualquer novo usuário sem plano ainda
  const isShouldShowTrialModal = trialStatus === "not_offered";

  return {
    isActive,
    hasGestao: isActive,
    hasLoja: isActive,
    trialStatus,
    daysLeftInTrial,
    isTrialUrgent: daysLeftInTrial !== null && daysLeftInTrial <= 7,
    isShouldShowTrialModal,
  };
}
