// ─── Hook Central de Acesso por Plano ──────────────────────────────────────
// Este hook é a ÚNICA fonte de verdade sobre o que o cliente pode acessar.
// Qualquer componente ou rota deve consultá-lo para decidir o que renderizar.

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
  // Campos do sistema de planos
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
  | "subscribed"; // assinante ativo do mensal

export type AccessInfo = {
  hasGestao: boolean;
  hasLoja: boolean;
  trialStatus: TrialStatus;
  daysLeftInTrial: number | null;
  isTrialUrgent: boolean; // últimos 7 dias
  isShouldShowTrialModal: boolean;
};

export function useAccess(profile: Profile | null | undefined): AccessInfo {
  const now = new Date();

  if (!profile) {
    return {
      hasGestao: false,
      hasLoja: false,
      trialStatus: "not_offered",
      daysLeftInTrial: null,
      isTrialUrgent: false,
      isShouldShowTrialModal: false,
    };
  }

  // ── Gestão: disponível se o plano anual estiver ativo ─────────────────────
  const planExpiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const hasGestao = !!profile.plan && (planExpiresAt ? planExpiresAt > now : true); // sem data = não expirado

  // ── Trial ─────────────────────────────────────────────────────────────────
  const trialExpiresAt = profile.store_trial_expires_at
    ? new Date(profile.store_trial_expires_at)
    : null;
  const trialAtivo =
    profile.store_trial_accepted === true && trialExpiresAt !== null && trialExpiresAt > now;

  // Dias restantes no trial
  let daysLeftInTrial: number | null = null;
  if (trialAtivo && trialExpiresAt) {
    const diffMs = trialExpiresAt.getTime() - now.getTime();
    daysLeftInTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // ── Assinatura mensal ─────────────────────────────────────────────────────
  const subExpiresAt = profile.store_subscription_expires_at
    ? new Date(profile.store_subscription_expires_at)
    : null;
  const assinanteAtivo =
    profile.store_subscription_active === true && subExpiresAt !== null && subExpiresAt > now;

  // ── Acesso à Loja ─────────────────────────────────────────────────────────
  const hasLoja = trialAtivo || assinanteAtivo;

  // ── Estado do Trial ───────────────────────────────────────────────────────
  let trialStatus: TrialStatus;

  if (assinanteAtivo) {
    trialStatus = "subscribed";
  } else if (profile.store_trial_accepted === null || profile.store_trial_accepted === undefined) {
    trialStatus = "not_offered";
  } else if (profile.store_trial_accepted === false) {
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
