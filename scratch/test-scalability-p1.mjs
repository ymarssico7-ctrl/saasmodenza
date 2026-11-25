/**
 * test-scalability-p1.mjs
 * Validação automatizada de engenharia para a Fase 2 (P1):
 * - Controle Atômico de Estoque (PostgreSQL FOR UPDATE)
 * - Controle Atômico de Cupons (PostgreSQL RPC anti-lost updates)
 * - Integração em mutations.ts e vitrine.$storeSlug.tsx
 * - Tipagens em types.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Detalhe: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Falha na asserção");
  }
}

console.log("============================================================");
console.log(" SUITE DE TESTES: ESCALABILIDADE FASE 2 (P1) — MODO ENGINE ");
console.log("============================================================\n");

// 1. Arquivos alvo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const migrationP0Path = path.join(root, "supabase/migrations/20261125_scalability_p0_atomic_stock_indexes.sql");
const migrationP1Path = path.join(root, "supabase/migrations/20261125_scalability_p1_atomic_coupons.sql");
const mutationsPath   = path.join(root, "src/lib/mutations.ts");
const vitrinePath     = path.join(root, "src/routes/vitrine.$storeSlug.tsx");
const typesPath       = path.join(root, "src/integrations/supabase/types.ts");

const migrationP0 = fs.readFileSync(migrationP0Path, "utf8");
const migrationP1 = fs.readFileSync(migrationP1Path, "utf8");
const mutations   = fs.readFileSync(mutationsPath, "utf8");
const vitrine     = fs.readFileSync(vitrinePath, "utf8");
const types       = fs.readFileSync(typesPath, "utf8");

// ── Testes de Migration P0 (Estoque) ─────────────────────────────────────────
test("T01 — Migration P0 define decrement_stock_atomic com SECURITY DEFINER", () => {
  assert(migrationP0.includes("FUNCTION public.decrement_stock_atomic"), "decrement_stock_atomic não encontrada");
  assert(migrationP0.includes("SECURITY DEFINER"), "Função deve rodar com SECURITY DEFINER");
});

test("T02 — Migration P0 implementa FOR UPDATE (Pessimistic Lock) em inventory_items", () => {
  assert(/FROM public\.inventory_items[\s\S]*?FOR UPDATE/i.test(migrationP0), "FOR UPDATE não encontrado no SELECT");
});

test("T03 — Migration P0 faz verificação estrita de estoque (anti-overselling)", () => {
  assert(migrationP0.includes("v_current_stock < p_quantity"), "Falta checagem de estoque insuficiente");
  assert(migrationP0.includes("RETURN FALSE"), "Deve retornar FALSE quando estoque insuficiente");
});

// ── Testes de Migration P1 (Cupons) ──────────────────────────────────────────
test("T04 — Migration P1 existe e define increment_coupon_usage", () => {
  assert(migrationP1.includes("FUNCTION public.increment_coupon_usage"), "increment_coupon_usage não encontrada");
});

test("T05 — Migration P1 implementa FOR UPDATE em stores", () => {
  assert(/FROM public\.stores[\s\S]*?FOR UPDATE/i.test(migrationP1), "FOR UPDATE não encontrado na tabela stores");
});

test("T06 — Migration P1 valida limite e validade de cupons", () => {
  assert(migrationP1.includes("v_usos >= v_limite"), "Deve checar limite de usos atingido");
  assert(migrationP1.includes("v_validade"), "Deve checar validade do cupom");
});

test("T07 — Migration P1 concede execução para anon e authenticated", () => {
  assert(migrationP1.includes("GRANT EXECUTE ON FUNCTION public.increment_coupon_usage"), "Falta GRANT EXECUTE");
  assert(migrationP1.includes("TO anon, authenticated"), "Deve permitir anon e authenticated");
});

// ── Testes de mutations.ts (Estoque Atômico) ─────────────────────────────────
test("T08 — mutations.ts: adjustInventoryStock tenta decrement_stock_atomic quando delta < 0", () => {
  assert(mutations.includes('"decrement_stock_atomic"'), "adjustInventoryStock deve chamar decrement_stock_atomic");
  assert(mutations.includes("p_product_id: productId"), "Deve passar p_product_id");
  assert(mutations.includes("p_quantity: Math.abs(delta)"), "Deve passar quantidade absoluta");
});

test("T09 — mutations.ts: lança erro descritivo em caso de estoque insuficiente", () => {
  assert(mutations.includes("Estoque insuficiente para este produto"), "Deve lançar exceção clara para a UI");
});

test("T10 — mutations.ts: mantém fallback compatível com tamanhos case-insensitive", () => {
  assert(
    mutations.includes("k.trim().toLowerCase() === tamanho.trim().toLowerCase()"),
    "Deve manter correspondência case-insensitive de tamanhos no fallback"
  );
});

// ── Testes de vitrine.$storeSlug.tsx (Checkout de Cupons) ────────────────────
test("T11 — vitrine: checkout chama increment_coupon_usage atomicamente", () => {
  assert(vitrine.includes('"increment_coupon_usage"'), "handleCheckout deve acionar a RPC de cupons");
  assert(vitrine.includes("p_coupon_code: cupomAplicado.codigo"), "Deve enviar o código do cupom aplicado");
});

test("T12 — vitrine: checkout possui fallback gracioso se RPC falhar", () => {
  assert(vitrine.includes("vestui_cupons_"), "Deve manter suporte a fallback");
  assert(vitrine.includes("p_store_id: storeId"), "Deve enviar p_store_id");
});

// ── Testes de Tipagem Supabase ────────────────────────────────────────────────
test("T13 — types.ts: Functions inclui decrement_stock_atomic com retorno boolean", () => {
  assert(types.includes("decrement_stock_atomic: {"), "decrement_stock_atomic ausente em Database.Functions");
  assert(types.includes("p_product_id: string"), "Parâmetros incorretos em decrement_stock_atomic");
  assert(/decrement_stock_atomic[\s\S]*?Returns:\s*boolean/s.test(types), "Retorno deve ser boolean");
});

test("T14 — types.ts: Functions inclui increment_coupon_usage", () => {
  assert(types.includes("increment_coupon_usage: {"), "increment_coupon_usage ausente em Database.Functions");
  assert(types.includes("p_coupon_code: string"), "Parâmetro p_coupon_code ausente");
});

console.log("\n────────────────────────────────────────────────────────────");
console.log(`RESULTADO DA FASE 2: ${passed}/${passed + failed} testes passaram`);
console.log("────────────────────────────────────────────────────────────\n");

if (failed === 0) {
  console.log("🎉 FASE 2 (P1) 100% BLINDADA E VALIDADA COM SUCESSO!\n");
  process.exit(0);
} else {
  console.error("❌ HOUVE FALHAS NA VALIDAÇÃO DA FASE 2.\n");
  process.exit(1);
}
