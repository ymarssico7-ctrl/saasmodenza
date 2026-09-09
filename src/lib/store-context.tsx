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
import { slugify } from "@/lib/format";

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
  slug: "loja-demo",
  city: "São Paulo",
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

      // Not authenticated → return demo store (com suporte a dados locais do Onboarding)
      if (!user) {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          try {
            const raw = localStorage.getItem("demo_active_store");
            if (raw) {
              const parsed = JSON.parse(raw);
              return { ...DEMO_STORE, ...parsed };
            }
          } catch {
            // fallback para DEMO_STORE
          }
        }
        return DEMO_STORE;
      }

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);

      // ── CASO 1: Usuário autenticado mas sem loja (inicialização inteligente com dados do perfil) ──
      if (!data) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("store_name, city, phone")
          .eq("id", user.id)
          .maybeSingle();

        const initialName = profileData?.store_name?.trim() || "Minha Loja";
        const baseSlug = slugify(initialName);
        let uniqueSlug = baseSlug;
        let attempt = 0;
        while (true) {
          const { data: existing } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", uniqueSlug)
            .maybeSingle();
          if (!existing) break;
          attempt++;
          uniqueSlug = `${baseSlug}-${attempt}`;
        }

        const now = new Date();
        const trialExpires = new Date(now);
        trialExpires.setDate(trialExpires.getDate() + 7);

        const { data: created, error: createErr } = await supabase
          .from("stores")
          .insert({
            owner_id: user.id,
            name: initialName,
            slug: uniqueSlug,
            city: profileData?.city ?? null,
            phone: profileData?.phone ?? null,
            store_trial_offered_at: now.toISOString(),
            store_trial_accepted: true,
            store_trial_expires_at: trialExpires.toISOString(),
          })
          .select()
          .single();

        if (createErr) throw new Error(createErr.message);
        return created as Store;
      }

      // ── CASO 2: Autocura (Self-Healing) — Loja existe no banco mas está sem slug ──
      if (!data.slug || !data.slug.trim()) {
        const baseSlug = slugify(data.name || "loja");
        let uniqueSlug = baseSlug;
        let attempt = 0;
        while (true) {
          const { data: existing } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", uniqueSlug)
            .neq("id", data.id)
            .maybeSingle();
          if (!existing) break;
          attempt++;
          uniqueSlug = `${baseSlug}-${attempt}`;
        }

        // Persiste o slug curado no banco
        await supabase
          .from("stores")
          .update({ slug: uniqueSlug })
          .eq("id", data.id);

        data.slug = uniqueSlug;
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
