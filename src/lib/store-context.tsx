/**
 * StoreContext — Multi-Tenant store resolver
 *
 * Provides the `activeStore` (the store the signed-in user owns or belongs to)
 * and the `storeId` shorthand to every component in the tree.
 *
 * Architecture:
 *   auth.user → stores (owner_id) → activeStore.id (storeId)
 *
 * Usage:
 *   const { storeId, store } = useStore();
 */

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  plan: string;
  plan_expires_at: string | null;
  plan_renewal_date: string | null;
  onboarding_done: boolean;
  prolabore_target: number;
  store_subscription_active: boolean;
  store_subscription_expires_at: string | null;
  store_trial_offered_at: string | null;
  store_trial_accepted: boolean | null;
  store_trial_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The demo store used when the user is not authenticated. */
const DEMO_STORE_ID = "00000000-0000-0000-0000-000000000000";

export const DEMO_STORE: Store = {
  id: DEMO_STORE_ID,
  owner_id: DEMO_STORE_ID,
  name: "Loja Demo",
  slug: null,
  city: null,
  phone: null,
  logo_url: null,
  plan: "gestao_anual",
  plan_expires_at: "2027-08-05",
  plan_renewal_date: "2027-08-05",
  onboarding_done: true,
  prolabore_target: 0,
  store_subscription_active: false,
  store_subscription_expires_at: null,
  store_trial_offered_at: null,
  store_trial_accepted: null,
  store_trial_expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------
export const storeQuery = () =>
  queryOptions<Store>({
    queryKey: ["active_store"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      // Not authenticated → return the demo store (no DB call)
      if (!user) return DEMO_STORE;

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);

      // User exists but store hasn't been created yet (race condition on sign-up)
      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from("stores")
          .insert({ owner_id: user.id, name: "Minha Loja" })
          .select()
          .single();
        if (createErr) throw new Error(createErr.message);
        return created as Store;
      }

      return data as Store;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
type StoreCtx = {
  store: Store;
  storeId: string;
  isDemoMode: boolean;
  isLoading: boolean;
};

const StoreContext = createContext<StoreCtx>({
  store: DEMO_STORE,
  storeId: DEMO_STORE_ID,
  isDemoMode: true,
  isLoading: true,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: store = DEMO_STORE, isLoading } = useQuery(storeQuery());

  const value: StoreCtx = {
    store,
    storeId: store.id,
    isDemoMode: store.id === DEMO_STORE_ID,
    isLoading,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Hook to access the active store from any component. */
export function useStore() {
  return useContext(StoreContext);
}
