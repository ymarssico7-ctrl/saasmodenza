/**
 * test-scalability-p0.mjs
 *
 * Suite de testes: Fase 1 — P0 Escalabilidade
 * Verifica todas as correções aplicadas no código sem precisar de rede.
 *
 * Cobertura:
 *  T01 — Vitrine: query pública não contém metadata bruto (PII guard)
 *  T02 — Vitrine: query pública usa column-filters seguros para metadata
 *  T03 — CartDrawer: pixSettingsLazy é buscado lazily (não vem da query inicial)
 *  T04 — CartDrawer: estado pixSettingsFetched evita múltiplas chamadas redundantes
 *  T05 — Pedidos: query inclui .limit(300) para proteção de memória
 *  T06 — Server.ts: função injectCacheHeaders existe
 *  T07 — Server.ts: vitrine recebe s-maxage=30 e stale-while-revalidate=120
 *  T08 — Server.ts: rotas autenticadas recebem no-store
 *  T09 — Migration SQL: função decrement_stock_atomic existe
 *  T10 — Migration SQL: FOR UPDATE (bloqueio pessimista) está presente
 *  T11 — Migration SQL: índices críticos estão criados (slug, user_id+created_at, store_id+created_at)
 *  T12 — Migration SQL: retorno FALSE quando estoque insuficiente
 *  T13 — Vitrine: staleTime definido para reduzir refetches paralelos
 *  T14 — Vitrine: gcTime definido para manter cache no cliente
 *  T15 — Pedidos: staleTime=15000 definido para multi-tabs
 *
 * Uso: node mode-saas/scratch/test-scalability-p0.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const srcVitrineFile   = readFileSync(join(root, "src/routes/vitrine.$storeSlug.tsx"), "utf-8");
const pedidosFile      = readFileSync(join(root, "src/routes/_authenticated/loja.pedidos.tsx"), "utf-8");
const serverFile       = readFileSync(join(root, "src/server.ts"), "utf-8");
const migrationFile    = readFileSync(join(root, "supabase/migrations/20261125_scalability_p0_atomic_stock_indexes.sql"), "utf-8");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message ?? "Assertion failed");
}

console.log("\n🔍 SUITE: Escalabilidade P0 — Fase 1\n");

// ─── T01-T02: Blindagem de PII na vitrine pública ───────────────────────────
console.log("📌 Bloco 1: Blindagem de PII — vitrine.$storeSlug.tsx");

test("T01 — select público NÃO usa '.select(\"...metadata...\")' como coluna inteira", () => {
  // O select bruto original: .select("id, name, phone, city, owner_id, metadata, ...")
  // deve ter sido removido. Verificamos que "metadata," não aparece mais diretamente.
  const hasRawMetadata = /\.select\(["']id.*metadata[,"].*plan/s.test(srcVitrineFile);
  assert(!hasRawMetadata, 'O campo "metadata" ainda está sendo selecionado como coluna inteira na query pública!');
});

test("T02 — select público usa column-filter granular 'metadata->theme'", () => {
  assert(
    srcVitrineFile.includes("metadata->theme"),
    'O select público não contém column-filter "metadata->theme". A query granular não foi aplicada.'
  );
});

test("T03 — CartDrawer: 'pixSettingsLazy' está declarado no estado", () => {
  assert(
    srcVitrineFile.includes("pixSettingsLazy"),
    "Estado 'pixSettingsLazy' não encontrado em vitrine.$storeSlug.tsx"
  );
});

test("T04 — CartDrawer: 'pixSettingsFetched' evita múltiplas chamadas redundantes", () => {
  assert(
    srcVitrineFile.includes("pixSettingsFetched"),
    "Estado 'pixSettingsFetched' não encontrado — risco de múltiplas chamadas à API"
  );
});

test("T05 — CartDrawer: renderização do Pix usa 'pixSettingsLazy' em vez de 'vs?.chavePix'", () => {
  // O bloco de Pix manual não deve mais usar vs?.chavePix para gerar o QR Code
  const hasSafePixKey = srcVitrineFile.includes("pixSettingsLazy?.chavePix");
  assert(hasSafePixKey, "pixSettingsLazy?.chavePix não encontrado. A chave Pix pode ainda estar sendo lida de vs?.chavePix no QR code.");
});

test("T06 — Vitrine: staleTime definido para reduzir refetches paralelos (10s)", () => {
  assert(
    srcVitrineFile.includes("staleTime: 10_000"),
    "staleTime não definido na query vitrine-store. Sem isso, múltiplas abas dispararão chamadas duplicadas."
  );
});

test("T07 — Vitrine: gcTime definido para manter cache no cliente", () => {
  assert(
    srcVitrineFile.includes("gcTime: 60_000"),
    "gcTime não definido na query vitrine-store."
  );
});

// ─── T08: Paginação de pedidos ───────────────────────────────────────────────
console.log("\n📌 Bloco 2: Paginação de Pedidos — loja.pedidos.tsx");

test("T08 — Query de pedidos inclui .limit() de proteção de memória", () => {
  assert(
    pedidosFile.includes(".limit(ORDERS_PAGE_LIMIT)"),
    "Query de pedidos não possui .limit(). Lojistas com 5.000+ pedidos consumirão memória excessiva."
  );
});

test("T09 — Constante ORDERS_PAGE_LIMIT está definida em 300", () => {
  assert(
    pedidosFile.includes("ORDERS_PAGE_LIMIT = 300"),
    "Constante ORDERS_PAGE_LIMIT não encontrada ou tem valor diferente."
  );
});

test("T10 — Pedidos: staleTime=15000 definido para eficiência em multi-tabs", () => {
  assert(
    pedidosFile.includes("staleTime: 15_000"),
    "staleTime não definido na query de pedidos."
  );
});

// ─── T11-T13: Edge Caching no servidor ──────────────────────────────────────
console.log("\n📌 Bloco 3: Edge Caching Cloudflare — server.ts");

test("T11 — server.ts: função injectCacheHeaders existe", () => {
  assert(
    serverFile.includes("function injectCacheHeaders"),
    "Função injectCacheHeaders não encontrada em server.ts"
  );
});

test("T12 — server.ts: vitrine recebe s-maxage=30 (Edge Cache CDN)", () => {
  assert(
    serverFile.includes("s-maxage=30") || serverFile.includes("s-maxage=30,"),
    "Cabeçalho s-maxage=30 não encontrado para /vitrine/* em server.ts"
  );
});

test("T13 — server.ts: vitrine recebe stale-while-revalidate=120", () => {
  assert(
    serverFile.includes("stale-while-revalidate=120"),
    "stale-while-revalidate=120 não encontrado em server.ts"
  );
});

test("T14 — server.ts: rotas autenticadas recebem no-store", () => {
  assert(
    serverFile.includes("no-store, no-cache, must-revalidate"),
    "Cabeçalho no-store não aplicado para rotas autenticadas em server.ts"
  );
});

test("T15 — server.ts: injectCacheHeaders é chamado no fluxo principal", () => {
  assert(
    serverFile.includes("injectCacheHeaders(request, normalized)"),
    "injectCacheHeaders não está sendo chamado no fetch principal de server.ts"
  );
});

// ─── T16-T20: Migration SQL ──────────────────────────────────────────────────
console.log("\n📌 Bloco 4: Migration SQL — decrement_stock_atomic + índices");

test("T16 — Migration: função decrement_stock_atomic criada", () => {
  assert(
    migrationFile.includes("decrement_stock_atomic"),
    "Função decrement_stock_atomic não encontrada na migration SQL"
  );
});

test("T17 — Migration: FOR UPDATE (bloqueio pessimista) implementado", () => {
  assert(
    migrationFile.includes("FOR UPDATE"),
    "FOR UPDATE não encontrado na migration. Sem bloqueio pessimista, race conditions ainda existem!"
  );
});

test("T18 — Migration: retorno FALSE quando estoque insuficiente", () => {
  assert(
    migrationFile.includes("RETURN FALSE"),
    "RETURN FALSE não encontrado. A função não bloqueia checkout quando estoque é insuficiente."
  );
});

test("T19 — Migration: índice em stores.slug criado", () => {
  assert(
    migrationFile.includes("idx_stores_slug"),
    "Índice idx_stores_slug não encontrado na migration."
  );
});

test("T20 — Migration: índice composto inventory_items(user_id, created_at) criado", () => {
  assert(
    migrationFile.includes("idx_inventory_user_created"),
    "Índice idx_inventory_user_created não encontrado. Queries de vitrine serão lentas com volume alto."
  );
});

test("T21 — Migration: índice orders(store_id, created_at) criado", () => {
  assert(
    migrationFile.includes("idx_orders_store_created"),
    "Índice idx_orders_store_created não encontrado. Painel de pedidos degradará com volume alto."
  );
});

test("T22 — Migration: GRANT EXECUTE para anon e authenticated", () => {
  assert(
    migrationFile.includes("GRANT EXECUTE ON FUNCTION public.decrement_stock_atomic"),
    "GRANT EXECUTE não encontrado. A RPC não estará acessível para usuários anônimos (checkout)."
  );
});

// ─── Resultado Final ─────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`📊 Resultado: ${passed + failed} testes — ✅ ${passed} PASS | ❌ ${failed} FAIL`);
console.log(`${"─".repeat(55)}\n`);

if (failed > 0) {
  process.exit(1);
}
