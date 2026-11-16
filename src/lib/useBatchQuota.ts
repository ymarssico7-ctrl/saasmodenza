import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pricingsQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";

export interface BatchQuotaInfo {
  /** Tier canônico do plano corrente */
  tier: "free" | "pro" | "store";
  /** true apenas se for plano gratuito */
  isFree: boolean;
  /** Quantos lotes foram criados no mês corrente */
  batchesThisMonth: number;
  /** Limite mensal de lotes conforme o plano (Infinity para Pro/Store) */
  limit: number;
  /** Lotes restantes disponíveis (Infinity para Pro/Store) */
  remaining: number;
  /** true quando batchesThisMonth >= limit */
  isQuotaReached: boolean;
  /** true quando pode criar mais lotes */
  canCreateBatch: boolean;
}

export function useBatchQuota(): BatchQuotaInfo {
  const { data: profile } = useQuery(profileQuery());
  const { store } = useStore();
  const access = useAccess(profile, store);
  const { data: pricings = [] } = useQuery(pricingsQuery());

  return useMemo(() => {
    // Pro e Store: cotas ilimitadas — não precisa contar
    if (!access.isFree) {
      return {
        tier: access.tier === "store" ? "store" : "pro",
        isFree: false,
        batchesThisMonth: pricings.length,
        limit: Infinity,
        remaining: Infinity,
        isQuotaReached: false,
        canCreateBatch: true,
      };
    }

    // Plano Free: conta apenas os lotes do mês corrente
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const batchesThisMonth = pricings.filter((p) => {
      if (!p.created_at) return false;
      const createdAt = new Date(p.created_at);
      return (
        createdAt.getMonth() === currentMonth &&
        createdAt.getFullYear() === currentYear
      );
    }).length;

    // Usa PLAN_LIMITS como fonte da verdade (via access.limits)
    const limit = access.limits.maxMonthlyBatches;
    const remaining = Math.max(0, limit - batchesThisMonth);
    const isQuotaReached = batchesThisMonth >= limit;

    return {
      tier: "free",
      isFree: true,
      batchesThisMonth,
      limit,
      remaining,
      isQuotaReached,
      canCreateBatch: !isQuotaReached,
    };
  }, [access, pricings]);
}
