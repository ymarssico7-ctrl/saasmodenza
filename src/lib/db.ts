import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { monthEnd, monthStart } from "./format";

const DEMO_PROFILE_KEY = "modenza_demo_profile";

/** Lê itens do localStorage no formato usado pelo modo demo. */
function localGet<T>(table: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(`demo_${table}`) ?? "[]") as T[];
  } catch {
    return [];
  }
}

/** Retorna true se há uma sessão ativa no Supabase. Evita chamadas RLS sem autenticação. */
async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data.user?.id;
}

// Cache padronizado: dados ficam "frescos" por 5 min, na memória por 30 min.
// Isso elimina o delay/lag de refetch ao navegar entre ferramentas.
const STALE_TIME = 1000 * 60 * 5;
const GC_TIME = 1000 * 60 * 30;

const DEFAULT_DEMO_PROFILE = {
  id: "00000000-0000-0000-0000-000000000000",
  store_name: "Loja Demo",
  owner_name: "Visitante",
  plan: "gestao_anual",
  plan_expires_at: "2027-08-05",
  onboarding_done: true,
  store_trial_offered_at: null,
  store_trial_accepted: null,
  store_trial_expires_at: null,
  store_subscription_active: false,
  store_subscription_expires_at: null,
};

/**
 * Atualiza campos do perfil demo no localStorage.
 * Usado pelos componentes de mutação no modo sem login (demo/local).
 */
export function updateDemoProfile(patch: Record<string, unknown>) {
  const current = localStorage.getItem(DEMO_PROFILE_KEY);
  const base = current ? JSON.parse(current) : DEFAULT_DEMO_PROFILE;
  const updated = { ...base, ...patch };
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        // Modo demo: lê do localStorage para preservar estado entre invalidações
        const cached = localStorage.getItem(DEMO_PROFILE_KEY);
        if (cached) return JSON.parse(cached);
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(DEFAULT_DEMO_PROFILE));
        return DEFAULT_DEMO_PROFILE;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  });

export const transactionsQuery = (month?: string) =>
  queryOptions({
    queryKey: ["transactions", month ?? "all"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      // Modo demo: retorna dados do localStorage sem chamar o Supabase (evita 403/RLS)
      if (!(await hasSession())) return localGet<Tables<"transactions">>("transactions");

      let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false });
      if (month) {
        const [y, m] = month.split("-").map(Number);
        const base = new Date(Number(y), Number(m) - 1, 1);
        q = q.gte("occurred_on", monthStart(0, base)).lte("occurred_on", monthEnd(0, base));
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const pricingsQuery = () =>
  queryOptions({
    queryKey: ["pricings"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"pricings">>("pricings");
      const { data, error } = await supabase
        .from("pricings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const customersQuery = () =>
  queryOptions({
    queryKey: ["customers"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"customers">>("customers");
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const creditsQuery = () =>
  queryOptions({
    queryKey: ["credits"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"credits">>("credits");
      const { data, error } = await supabase
        .from("credits")
        .select("*, customers(id, name, phone)")
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const creditPaymentsQuery = () =>
  queryOptions({
    queryKey: ["credit_payments"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"credit_payments">>("credit_payments");
      const { data, error } = await supabase
        .from("credit_payments")
        .select("*")
        .order("paid_on", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const inventoryQuery = () =>
  queryOptions({
    queryKey: ["inventory"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"inventory_items">>("inventory_items");
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const prolaboreQuery = () =>
  queryOptions({
    queryKey: ["prolabore"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"prolabore_withdrawals">>("prolabore_withdrawals");
      const { data, error } = await supabase
        .from("prolabore_withdrawals")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const goalsQuery = () =>
  queryOptions({
    queryKey: ["goals"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"goals">>("goals");
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const membersQuery = () =>
  queryOptions({
    queryKey: ["members"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      if (!(await hasSession())) return localGet<Tables<"store_members">>("store_members");
      const { data, error } = await supabase
        .from("store_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  // Retorna um UUID zerado em modo demo/dev sem sessão ativa
  return data.user?.id ?? "00000000-0000-0000-0000-000000000000";
}

/** Retorna true se o usuário está autenticado de verdade no Supabase */
export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data.user?.id;
}
