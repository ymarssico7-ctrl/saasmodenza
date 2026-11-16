// ─── Hook Central de Acesso — Plataforma Modular Vestui OS ──────────────────
//
// ARQUITETURA: "Entitlement-Driven Platform" (Plataforma de Habilitação Progressiva)
//
// TIER DEFINITIONS:
//  free  (R$ 0):      Catálogo Gratuito — até 15 produtos, PDV básico, 3 lotes/mês, vitrine catálogo
//  pro   (R$ 19,90):  Vestui Pro        — até 60 produtos, PDV completo, lotes ilimitados, vitrine com sacola
//  store (R$ 97,00):  Vestui Store      — produtos ilimitados, tudo do Pro + condicional, multi-vendedor, DRE, white-label
//
// PRINCÍPIO: Uma única base de código para todos os planos.
//            O que varia é a capacidade operacional (cotas) e módulos de alta complexidade.
//
// LEGADO: "lote" é alias de "pro" para manter retrocompatibilidade com clientes existentes.
//
// REGRA DE SEGURANÇA: Nunca confie apenas no frontend!
//   As cotas (maxProducts, maxMonthlyBatches) são reforçadas também no banco de dados
//   via triggers PostgreSQL/RLS em supabase/migrations.

import type { Store } from "@/lib/store-context";

// ── Tipos de Plano ────────────────────────────────────────────────────────────
/** "lote" é alias retrocompatível de "pro" */
export type PlanTier = "free" | "lote" | "pro" | "store";

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

// ── Limites de Capacidade por Plano (PLAN_LIMITS) ─────────────────────────────
// Esta é a FONTE DA VERDADE para todos os limites.
// Sempre consumir esta constante — nunca hardcodar valores no código das rotas/componentes.
export interface PlanLimits {
  /** Número máximo de produtos ativos no catálogo */
  maxProducts: number;
  /** Número máximo de lotes de precificação por mês */
  maxMonthlyBatches: number;
  /** Número máximo de membros na equipe (vendedoras) */
  maxTeamMembers: number;
  /** Permite sacola multi-itens na vitrine online */
  hasMultiItemCart: boolean;
  /** Permite impressão de etiquetas térmicas PDF */
  hasThermalLabels: boolean;
  /** Permite Caderninho de Fiado Digital com Cobrança WhatsApp */
  hasFiado: boolean;
  /** @deprecated use hasFiado */
  hasConditionalSale?: boolean;
  /** Permite acesso à Frente de Caixa (PDV de Balcão) */
  hasPOS: boolean;
  /** Permite Dashboard Financeiro completo (DRE, Faturamento, Saídas, Pró-labore) */
  hasFinancialDashboard: boolean;
  /** Permite configuração e visualização de Pró-labore da Dona */
  hasProlabore: boolean;
  /** Permite DRE, CMV e Fluxo de Caixa Avançado */
  hasAdvancedDRE: boolean;
  /** Sincronização de estoque entre PDV e Vitrine em tempo real */
  hasRealtimeInventorySync: boolean;
  /** Remove a marca Vestui do rodapé da vitrine (White-label) */
  hasWhiteLabel: boolean;
  /** Permite configurar entrega/frete personalizado na vitrine */
  hasDeliveryConfig: boolean;
  /** Lista de IDs de templates liberados na galeria */
  allowedTemplates: Array<"template-01" | "template-02" | "catalogo-express">;
}

export const PLAN_LIMITS: Record<"free" | "pro" | "store", PlanLimits> = {
  free: {
    maxProducts: 10,
    maxMonthlyBatches: 1,
    maxTeamMembers: 1,
    hasMultiItemCart: false,
    hasThermalLabels: false,
    hasFiado: false,
    hasConditionalSale: false,
    hasPOS: false,
    hasFinancialDashboard: false,
    hasProlabore: false,
    hasAdvancedDRE: false,
    hasRealtimeInventorySync: false,
    hasWhiteLabel: false,
    hasDeliveryConfig: false,
    allowedTemplates: ["catalogo-express"],
  },
  pro: {
    maxProducts: 60,
    maxMonthlyBatches: Infinity,
    maxTeamMembers: 1,
    hasMultiItemCart: true,
    hasThermalLabels: true,
    hasFiado: false,
    hasConditionalSale: false,
    hasPOS: true,
    hasFinancialDashboard: false,
    hasProlabore: false,
    hasAdvancedDRE: false,
    hasRealtimeInventorySync: false,
    hasWhiteLabel: false,
    hasDeliveryConfig: true,
    allowedTemplates: ["catalogo-express", "template-01"],
  },
  store: {
    maxProducts: Infinity,
    maxMonthlyBatches: Infinity,
    maxTeamMembers: Infinity,
    hasMultiItemCart: true,
    hasThermalLabels: true,
    hasFiado: true,
    hasConditionalSale: true,
    hasPOS: true,
    hasFinancialDashboard: true,
    hasProlabore: true,
    hasAdvancedDRE: true,
    hasRealtimeInventorySync: true,
    hasWhiteLabel: true,
    hasDeliveryConfig: true,
    allowedTemplates: ["catalogo-express", "template-01", "template-02"],
  },
};

// ── Tipo de Acesso Retornado pelo Hook ────────────────────────────────────────
export type AccessInfo = {
  /** Nível canônico do plano: 'free', 'pro' ou 'store' */
  tier: "free" | "pro" | "store";

  // Verificações de tier (use sempre estes booleanos, nunca compare tier diretamente)
  isFree: boolean;
  isPro: boolean;
  isStore: boolean;

  /**
   * @deprecated use `isPro` em vez de `isLote`
   * Mantido para retrocompatibilidade com componentes existentes
   */
  isLote: boolean;

  /** Limites de capacidade do plano corrente — consume PLAN_LIMITS diretamente */
  limits: PlanLimits;

  // ── Permissões Legadas (retrocompatibilidade) ─────────────────────────────
  /** @deprecated use `limits.maxMonthlyBatches` */
  canUsePricing: boolean;
  /** @deprecated use `limits.hasThermalLabels` */
  canPrintLabels: boolean;
  /** @deprecated use `limits.maxMonthlyBatches === Infinity` */
  canUnlimitedBatches: boolean;
  /** @deprecated use `isPro || isStore` */
  canSaveHistory: boolean;
  /** @deprecated use `isPro || isStore` */
  canSimulateDiscounts: boolean;
  /** @deprecated use `limits.maxProducts` */
  canAccessStorefront: boolean;
  /** @deprecated use `isPro || isStore` */
  canAccessPOS: boolean;
  /** Permite acesso ao Caderninho de Fiado Digital com Cobrança WhatsApp */
  canAccessFiado: boolean;
  /** @deprecated use `canAccessFiado` */
  canAccessConditional: boolean;
  /** Permite acesso à Frente de Caixa (PDV de Balcão) */
  canUsePOS: boolean;
  /** Permite visualização do Dashboard Financeiro (DRE, Faturamento, Pró-labore) */
  canSeeFinancialDashboard: boolean;
  /** Permite configuração e visualização de Pró-labore da Dona */
  canUseProlabore: boolean;
  /** @deprecated use `limits.maxMonthlyBatches` */
  freeBatchesLimit: number;

  /** true se tem qualquer plano pago (pro ou store) ou trial ativo */
  isActive: boolean;
  /** @deprecated alias de isActive */
  hasGestao: boolean;
  /** @deprecated alias de isStore */
  hasLoja: boolean;

  // ── Estado do Trial ───────────────────────────────────────────────────────
  trialStatus: TrialStatus;
  daysLeftInTrial: number | null;
  isTrialUrgent: boolean;
  isShouldShowTrialModal: boolean;
};

// ── Hook Principal ────────────────────────────────────────────────────────────
export function useAccess(
  profile: Profile | null | undefined,
  store?: Store | null | undefined,
): AccessInfo {
  const now = new Date();

  const emptyAccess: AccessInfo = {
    tier: "free",
    isFree: true,
    isPro: false,
    isStore: false,
    isLote: false,
    limits: PLAN_LIMITS.free,
    canUsePricing: true,
    canPrintLabels: false,
    canUnlimitedBatches: false,
    canSaveHistory: false,
    canSimulateDiscounts: false,
    canAccessStorefront: false,
    canAccessPOS: false,
    canAccessConditional: false,
    freeBatchesLimit: PLAN_LIMITS.free.maxMonthlyBatches,
    canUsePOS: false,
    canSeeFinancialDashboard: false,
    canUseProlabore: false,
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

  // ── Resolução do Tier Canônico ────────────────────────────────────────────
  // PRECEDÊNCIA EXPLÍCITA: free > pro/lote > store
  // "lote" é alias retrocompatível de "pro"
  let tier: "free" | "pro" | "store" = "free";

  if (rawPlan === "free" || rawPlan === "gratuito" || rawTier === "free") {
    tier = "free";
  } else if (
    rawPlan === "pro" ||
    rawPlan === "lote" ||
    rawPlan === "vestui_lote" ||
    rawPlan === "vestui_pro" ||
    rawTier === "lote" ||
    rawTier === "pro"
  ) {
    tier = "pro";
  } else if (
    trialAtivo ||
    assinanteAtivo ||
    rawTier === "store" ||
    rawPlan === "store" ||
    rawPlan === "gestao_anual" ||
    rawPlan === "digital" ||
    rawPlan === "completo"
  ) {
    tier = "store";
  } else {
    tier = "free";
  }

  const isFree = tier === "free";
  const isPro = tier === "pro";
  const isStore = tier === "store";
  const isLote = isPro; // alias retrocompatível

  const isActive = isPro || isStore;
  const limits = PLAN_LIMITS[tier];

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

  // Modal legado de trial desativado — sistema usa modais de crescimento (upsell positivo)
  const isShouldShowTrialModal = false;

  return {
    tier,
    isFree,
    isPro,
    isStore,
    isLote, // retrocompatível

    limits,

    // ── Permissões Legadas (retrocompatibilidade com componentes existentes) ──
    canUsePricing: true,
    canPrintLabels: limits.hasThermalLabels,
    canUnlimitedBatches: limits.maxMonthlyBatches === Infinity,
    canSaveHistory: isPro || isStore,
    canSimulateDiscounts: isPro || isStore,
    canAccessStorefront: isPro || isStore,
    canAccessPOS: isPro || isStore,
    canAccessFiado: limits.hasFiado,
    canAccessConditional: limits.hasFiado,
    freeBatchesLimit: isFree ? limits.maxMonthlyBatches : Infinity,

    // ── Novas permissões modulares (Arquitetura Híbrida de Valor) ──────────
    canUsePOS: limits.hasPOS,
    canSeeFinancialDashboard: limits.hasFinancialDashboard,
    canUseProlabore: limits.hasProlabore,

    // Compatibilidade retroativa
    isActive,
    hasGestao: true, // Precificação sempre liberada em todos os planos
    hasLoja: isStore,

    trialStatus,
    daysLeftInTrial,
    isTrialUrgent: daysLeftInTrial !== null && daysLeftInTrial <= 7,
    isShouldShowTrialModal,
  };
}

// ── Helpers Utilitários (uso em componentes e guards) ─────────────────────────

/**
 * Verifica se um template está liberado para o tier corrente.
 * Use nos componentes da galeria de templates.
 */
export function isTemplateAllowed(
  templateId: string,
  limits: PlanLimits,
): boolean {
  return (limits.allowedTemplates as string[]).includes(templateId);
}

/**
 * Verifica se o usuário atingiu ou ultrapassou a cota de produtos.
 */
export function isProductQuotaReached(
  currentCount: number,
  limits: PlanLimits,
): boolean {
  if (limits.maxProducts === Infinity) return false;
  return currentCount >= limits.maxProducts;
}

/**
 * Retorna a porcentagem de uso da cota de produtos (0–100).
 * Retorna 0 quando o plano é ilimitado.
 */
export function productQuotaPercent(
  currentCount: number,
  limits: PlanLimits,
): number {
  if (limits.maxProducts === Infinity) return 0;
  return Math.min(100, Math.round((currentCount / limits.maxProducts) * 100));
}
