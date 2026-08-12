/**
 * mutations.ts — Unified data mutation layer (Multi-Tenant aware)
 *
 * All write operations (insert / update / delete) pass through this file.
 * Each function:
 *   1. Receives a `storeId` (from StoreContext via `useStore().storeId`).
 *   2. In DEMO mode (storeId === DEMO_STORE_ID), persists to localStorage.
 *   3. In REAL mode, writes to Supabase with the store_id FK.
 *
 * This keeps every UI component completely clean — no direct supabase calls,
 * no manual `isAuthenticated()` guards spread across 12 files.
 */

import { supabase } from "@/integrations/supabase/client";
import { DEMO_STORE } from "@/lib/store-context";
import { todayISO } from "@/lib/format";

const isDemoStore = (storeId: string) => storeId === DEMO_STORE.id;

// ============================================================
// LOCAL STORAGE HELPERS (Demo Mode)
// ============================================================
type AnyRecord = Record<string, unknown>;

function localGet(table: string): AnyRecord[] {
  try {
    return JSON.parse(localStorage.getItem(`demo_${table}`) ?? "[]") as AnyRecord[];
  } catch {
    return [];
  }
}

function localSet(table: string, rows: AnyRecord[]) {
  localStorage.setItem(`demo_${table}`, JSON.stringify(rows));
}

function localInsert(table: string, row: AnyRecord): AnyRecord {
  const rows = localGet(table);
  const newRow: AnyRecord = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...row,
  };
  localSet(table, [...rows, newRow]);
  return newRow;
}

function localDelete(table: string, id: string) {
  const rows = localGet(table);
  localSet(table, rows.filter((r) => r["id"] !== id));
}

function localUpdate(table: string, id: string, patch: AnyRecord) {
  const rows = localGet(table);
  localSet(
    table,
    rows.map((r) => (r["id"] === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r)),
  );
}

// ============================================================
// INVENTORY ITEMS
// ============================================================
export type InventoryInsert = {
  storeId: string;
  name: string;
  category: string;
  color?: string | null;
  supplier?: string | null;
  cost_price: number;
  sale_price: number;
  sizes: Record<string, number>;
};

export async function insertInventoryItem(input: InventoryInsert): Promise<string> {
  if (isDemoStore(input.storeId)) {
    const row = localInsert("inventory_items", {
      store_id: input.storeId,
      user_id: input.storeId, // compat
      name: input.name,
      category: input.category,
      color: input.color ?? null,
      supplier: input.supplier ?? null,
      cost_price: input.cost_price,
      sale_price: input.sale_price,
      sizes: input.sizes,
      photo_url: null,
      sold_this_month: 0,
    });
    return (row["id"] ?? "") as string;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      store_id: input.storeId,
      user_id: input.storeId, // kept for backward-compat until user_id column is dropped
      name: input.name,
      category: input.category,
      color: input.color ?? null,
      supplier: input.supplier ?? null,
      cost_price: input.cost_price,
      sale_price: input.sale_price,
      sizes: input.sizes,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteInventoryItem(storeId: string, id: string) {
  if (isDemoStore(storeId)) {
    localDelete("inventory_items", id);
    return;
  }
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// TRANSACTIONS (Caixa)
// ============================================================
export type TransactionInsert = {
  storeId: string;
  kind: "entrada" | "saida";
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  occurred_on: string;
};

export async function insertTransaction(input: TransactionInsert) {
  if (isDemoStore(input.storeId)) {
    localInsert("transactions", {
      store_id: input.storeId,
      user_id: input.storeId,
      kind: input.kind,
      description: input.description,
      amount: input.amount,
      category: input.category,
      payment_method: input.payment_method,
      occurred_on: input.occurred_on,
    });
    return;
  }

  const { error } = await supabase.from("transactions").insert({
    store_id: input.storeId,
    user_id: input.storeId,
    kind: input.kind,
    description: input.description,
    amount: input.amount,
    category: input.category,
    payment_method: input.payment_method,
    occurred_on: input.occurred_on,
  });
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("transactions", id); return; }
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// CUSTOMERS (Clientes)
// ============================================================
export async function insertCustomer(storeId: string, name: string, phone?: string | null) {
  if (isDemoStore(storeId)) {
    return localInsert("customers", { store_id: storeId, user_id: storeId, name, phone: phone ?? null });
  }
  const { data, error } = await supabase
    .from("customers")
    .insert({ store_id: storeId, user_id: storeId, name, phone: phone ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCustomer(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("customers", id); return; }
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// CREDITS (Fiado)
// ============================================================
export type CreditInsert = {
  storeId: string;
  customer_id: string;
  description: string;
  amount: number;
  purchase_date: string;
  due_date: string;
};

export async function insertCredit(input: CreditInsert) {
  if (isDemoStore(input.storeId)) {
    return localInsert("credits", { store_id: input.storeId, user_id: input.storeId, ...input, paid_amount: 0 });
  }
  const { data, error } = await supabase
    .from("credits")
    .insert({ store_id: input.storeId, user_id: input.storeId, customer_id: input.customer_id, description: input.description, amount: input.amount, purchase_date: input.purchase_date, due_date: input.due_date, paid_amount: 0 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCredit(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("credits", id); return; }
  const { error } = await supabase.from("credits").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// PRICINGS (Precificação)
// ============================================================
export type PricingInsert = {
  storeId: string;
  name: string;
  wholesale_cost: number;
  freight_cost: number;
  packaging_cost: number;
  other_costs: number;
  margin_pct: number;
  tax_pct: number;
};

export async function insertPricing(input: PricingInsert) {
  if (isDemoStore(input.storeId)) {
    return localInsert("pricings", { store_id: input.storeId, user_id: input.storeId, name: input.name, wholesale_cost: input.wholesale_cost, freight_cost: input.freight_cost, packaging_cost: input.packaging_cost, other_costs: input.other_costs, margin_pct: input.margin_pct, tax_pct: input.tax_pct });
  }
  const { error } = await supabase.from("pricings").insert({
    store_id: input.storeId, user_id: input.storeId, name: input.name,
    wholesale_cost: input.wholesale_cost, freight_cost: input.freight_cost,
    packaging_cost: input.packaging_cost, other_costs: input.other_costs,
    margin_pct: input.margin_pct, tax_pct: input.tax_pct,
  });
  if (error) throw new Error(error.message);
  return;
}

export async function deletePricing(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("pricings", id); return; }
  const { error } = await supabase.from("pricings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// GOALS (Metas)
// ============================================================
export async function upsertGoal(storeId: string, month: string, target_amount: number) {
  if (isDemoStore(storeId)) {
    const rows = localGet("goals");
    const existing = rows.find((r) => r["month"] === month && r["store_id"] === storeId);
    if (existing) localUpdate("goals", existing["id"] as string, { target_amount });
    else localInsert("goals", { store_id: storeId, user_id: storeId, month, target_amount });
    return;
  }

  // After migration runs, store_id column exists on goals — filter by it directly
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("store_id", storeId)
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("goals").update({ target_amount }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("goals").insert({ store_id: storeId, user_id: storeId, month, target_amount });
    if (error) throw new Error(error.message);
  }
}

export async function deleteGoal(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("goals", id); return; }
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// PROLABORE
// ============================================================
export async function insertProlabore(storeId: string, month: string, amount: number) {
  if (isDemoStore(storeId)) {
    localInsert("prolabore_withdrawals", { store_id: storeId, user_id: storeId, month, amount });
    // Also add to transactions demo
    localInsert("transactions", { store_id: storeId, user_id: storeId, kind: "saida", description: "Pró-labore", amount, category: "prolabore", payment_method: "transferencia", occurred_on: todayISO() });
    return;
  }

  const { error } = await supabase.from("prolabore_withdrawals").insert({ store_id: storeId, user_id: storeId, month, amount });
  if (error) throw new Error(error.message);

  const { error: txErr } = await supabase.from("transactions").insert({ store_id: storeId, user_id: storeId, kind: "saida", description: "Pró-labore", amount, category: "prolabore", payment_method: "transferencia", occurred_on: todayISO() });
  if (txErr) throw new Error(txErr.message);
}

export async function deleteProlabore(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("prolabore_withdrawals", id); return; }
  const { error } = await supabase.from("prolabore_withdrawals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// STORE MEMBERS (Equipe)
// ============================================================
export async function insertMember(storeId: string, name: string, email?: string | null, role?: string) {
  if (isDemoStore(storeId)) {
    localInsert("store_members", { store_id: storeId, user_id: storeId, name, email: email ?? null, role: role ?? "vendedora" });
    return;
  }
  const { error } = await supabase.from("store_members").insert({ store_id: storeId, user_id: storeId, name, email: email ?? null, role: role ?? "vendedora" });
  if (error) throw new Error(error.message);
}

export async function deleteMember(storeId: string, id: string) {
  if (isDemoStore(storeId)) { localDelete("store_members", id); return; }
  const { error } = await supabase.from("store_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// STORES (Lojas)
// ============================================================
export type StorePatch = {
  name?: string;
  slug?: string | null;
  city?: string | null;
  phone?: string | null;
  logo_url?: string | null;
};

export async function updateStoreDetails(storeId: string, patch: StorePatch) {
  if (isDemoStore(storeId)) {
    localUpdate("stores", storeId, patch);
    return;
  }
  const { error } = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId);
  if (error) throw new Error(error.message);
}

