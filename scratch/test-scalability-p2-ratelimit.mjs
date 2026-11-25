/**
 * test-scalability-p2-ratelimit.mjs
 * Validação automatizada do Edge Rate Limiter e Índices Multi-tenant
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
console.log(" SUITE DE TESTES: EDGE RATE LIMITING & ÍNDICES MULTI-TENANT ");
console.log("============================================================\n");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const serverPath = path.join(root, "src/server.ts");
const migrationP0Path = path.join(root, "supabase/migrations/20261125_scalability_p0_atomic_stock_indexes.sql");

const serverCode = fs.readFileSync(serverPath, "utf8");
const migrationP0 = fs.readFileSync(migrationP0Path, "utf8");

// ── Testes de Rate Limiting em server.ts ──────────────────────────────────────
test("T01 — server.ts: função checkRateLimit declarada", () => {
  assert(serverCode.includes("function checkRateLimit"), "checkRateLimit não encontrada em server.ts");
});

test("T02 — server.ts: checkRateLimit é executada antes do SSR handler", () => {
  const fetchIdx = serverCode.indexOf("async fetch(request");
  const checkIdx = serverCode.indexOf("checkRateLimit(request)", fetchIdx);
  const handlerIdx = serverCode.indexOf("getServerEntry()", fetchIdx);
  assert(fetchIdx !== -1, "async fetch não encontrado");
  assert(checkIdx > fetchIdx && checkIdx < handlerIdx, "checkRateLimit deve rodar antes de getServerEntry");
});

test("T03 — server.ts: limites diferenciados para GET (120) e Mutações (30)", () => {
  assert(serverCode.includes("isMutation ? 30 : 120"), "Limites de taxa devem diferenciar GET de mutações");
});

test("T04 — server.ts: retorna status 429 Too Many Requests com Retry-After", () => {
  assert(serverCode.includes("status: 429"), "Status 429 não retornado quando limite é atingido");
  assert(serverCode.includes('"Retry-After"'), "Falta cabeçalho Retry-After");
  assert(serverCode.includes('"Too Many Requests"'), "Payload de erro deve sinalizar Too Many Requests");
});

test("T05 — server.ts: extrai IP do cliente via headers Cloudflare (cf-connecting-ip / x-real-ip)", () => {
  assert(serverCode.includes("cf-connecting-ip"), "Falta header cf-connecting-ip");
  assert(serverCode.includes("x-forwarded-for"), "Falta header x-forwarded-for");
});

// ── Testes de Índices em migration SQL ───────────────────────────────────────
test("T06 — Migration P0: índice idx_stores_owner_id implementado para RLS", () => {
  assert(migrationP0.includes("idx_stores_owner_id"), "Índice idx_stores_owner_id não encontrado");
  assert(/ON public\.stores USING btree \(owner_id\)/i.test(migrationP0), "Índice deve ser B-Tree em owner_id");
});

test("T07 — Migration P0: índices multi-tenant essenciais preservados", () => {
  assert(migrationP0.includes("idx_stores_slug"), "Falta idx_stores_slug");
  assert(migrationP0.includes("idx_inventory_user_created"), "Falta idx_inventory_user_created");
  assert(migrationP0.includes("idx_orders_store_created"), "Falta idx_orders_store_created");
});

console.log("\n────────────────────────────────────────────────────────────");
console.log(`RESULTADO: ${passed}/${passed + failed} testes passaram`);
console.log("────────────────────────────────────────────────────────────\n");

if (failed === 0) {
  console.log("🎉 EDGE RATE LIMITER & ÍNDICES 100% VALIDADOS!\n");
  process.exit(0);
} else {
  console.error("❌ HOUVE FALHAS NA VALIDAÇÃO.\n");
  process.exit(1);
}
