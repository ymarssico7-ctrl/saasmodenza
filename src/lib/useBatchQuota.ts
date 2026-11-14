import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pricingsQuery, profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";

export interface BatchQuotaInfo {
  tier: "free" | "lote" | "store";
  isFree: boolean;
  batchesThisMonth: number;
  limit: number;
  remaining: number;
  isQuotaReached: boolean;
  canCreateBatch: boolean;
}

export function useBatchQuota(): BatchQuotaInfo {
  const { data: profile } = useQuery(profileQuery());
  const { store } = useStore();
  const access = useAccess(profile, store);
  const { data: pricings = [] } = useQuery(pricingsQuery());

  return useMemo(() => {
    if (!access.isFree) {
      return {
        tier: access.tier,
        isFree: false,
        batchesThisMonth: pricings.length,
        limit: Infinity,
        remaining: Infinity,
        isQuotaReached: false,
        canCreateBatch: true,
      };
    }

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

    const limit = access.freeBatchesLimit || 3;
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
