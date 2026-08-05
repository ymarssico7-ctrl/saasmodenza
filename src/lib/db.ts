import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthEnd, monthStart } from "./format";

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      // TEMPORARY BYPASS
      return {
        id: "mock-id",
        store_name: "Loja Demo",
        owner_name: "Visitante",
        plan: "crescimento",
        onboarding_done: true
      };
    },
  });

export const transactionsQuery = (month?: string) =>
  queryOptions({
    queryKey: ["transactions", month ?? "all"],
    queryFn: async () => {
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
    queryFn: async () => {
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
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const creditsQuery = () =>
  queryOptions({
    queryKey: ["credits"],
    queryFn: async () => {
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
    queryFn: async () => {
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
    queryFn: async () => {
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
    queryFn: async () => {
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
    queryFn: async () => {
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Sessão expirada. Entre novamente.");
  return uid;
}
