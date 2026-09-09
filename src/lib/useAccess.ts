// ─── Hook Central de Acesso por Plano ──────────────────────────────────────
// Este hook é a ÚNICA fonte de verdade sobre o que o cliente pode acessar.
// Consulta prioritariamente a tabela `stores` (onde reside a assinatura e o trial)
// e mantém fallback para `profile` para total resiliência e suporte a modo demo.

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
  // Campos legados mantidos para compatibilidade retroativa
  store_trial_offered_at?: string | null;
  store_trial_accepted?: boolean | null;
  store_trial_expires_at?: string | null;
  store_subscription_active?: boolean | null;
  store_subscription_expires_at?: string | null;
};

export type TrialStatus =
  | "not_offered" // ainda não foi oferecido (mostrar modal)
  | "active" // trial ativo e no prazo
  | "declined" // recusou o trial
  | "expired" // aceitou mas expirou sem assinar
  | "subscribed"; // assinante ativo do mensal ou anual

export type AccessInfo = {
  hasGestao: boolean;
  hasLoja: boolean;
  trialStatus: TrialStatus;
  daysLeftInTrial: number | null;
  isTrialUrgent: boolean; // últimos 7 dias
  isShouldShowTrialModal: boolean;
};

export function useAccess(
  profile: Profile | null | undefined,
  store?: Store | null | undefined,
): AccessInfo {
  const now = new Date();

  if (!profile && !store) {
    return {
      hasGestao: false,
      hasLoja: false,
      trialStatus: "not_offered",
      daysLeftInTrial: null,
      isTrialUrgent: false,
      isShouldShowTrialModal: false,
    };
  }

  // ── Gestão: disponível se o plano estiver ativo ─────────────────────────
  const rawPlan = store?.plan || profile?.plan;
  const rawPlanExpires = store?.plan_expires_at || profile?.plan_expires_at;
  const planExpiresAt = rawPlanExpires ? new Date(rawPlanExpires) : null;
  const hasGestao = !!rawPlan && (planExpiresAt ? planExpiresAt > now : true);

  // ── Trial ─────────────────────────────────────────────────────────────────
  const storeTrialAccepted = store?.store_trial_accepted ?? profile?.store_trial_accepted;
  const storeTrialExpires = store?.store_trial_expires_at ?? profile?.store_trial_expires_at;
  const trialExpiresAt = storeTrialExpires ? new Date(storeTrialExpires) : null;
  const trialAtivo =
    storeTrialAccepted === true && trialExpiresAt !== null && trialExpiresAt > now;

  // Dias restantes no trial
  let daysLeftInTrial: number | null = null;
  if (trialAtivo && trialExpiresAt) {
    const diffMs = trialExpiresAt.getTime() - now.getTime();
    daysLeftInTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // ── Assinatura ativa (Digital ou Anual) ───────────────────────────────────
  const storeSubActive = store?.store_subscription_active ?? profile?.store_subscription_active;
  const storeSubExpires = store?.store_subscription_expires_at ?? profile?.store_subscription_expires_at;
  const subExpiresAt = storeSubExpires ? new Date(storeSubExpires) : null;
  const assinanteAtivo =
    storeSubActive === true && (subExpiresAt !== null ? subExpiresAt > now : true);

  // ── Acesso à Loja ─────────────────────────────────────────────────────────
  const hasLoja = trialAtivo || assinanteAtivo;

  // ── Estado do Trial ───────────────────────────────────────────────────────
  let trialStatus: TrialStatus;

  if (assinanteAtivo) {
    trialStatus = "subscribed";
  } else if (storeTrialAccepted === null || storeTrialAccepted === undefined) {
    trialStatus = "not_offered";
  } else if (storeTrialAccepted === false) {
    trialStatus = "declined";
  } else if (trialAtivo) {
    trialStatus = "active";
  } else {
    trialStatus = "expired"; // aceitou, mas venceu sem assinar
  }

  // Mostra modal se o cliente nunca foi perguntado ainda
  const isShouldShowTrialModal = trialStatus === "not_offered" && hasGestao;

  return {
    hasGestao,
    hasLoja,
    trialStatus,
    daysLeftInTrial,
    isTrialUrgent: daysLeftInTrial !== null && daysLeftInTrial <= 7,
    isShouldShowTrialModal,
  };
}
