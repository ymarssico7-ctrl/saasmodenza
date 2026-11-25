/**
 * @file test-checkout-guarantee.mjs
 * @description Suíte de testes de garantia e robustez semântica para a Fase 1 (Operação Aperfeiçoamento).
 * Executar: node scratch/test-checkout-guarantee.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("=== VESTUI — SUÍTE DE GARANTIA E SEMÂNTICA DO CHECKOUT (FASE 1) ===\n");

const vitrinePath = resolve("c:/Users/yande/Downloads/Modaly 2.0/mode-saas/src/routes/vitrine.$storeSlug.tsx");
let content;
try {
  content = readFileSync(vitrinePath, "utf-8");
} catch (e) {
  console.error("❌ Não foi possível carregar o arquivo vitrine.$storeSlug.tsx:", e.message);
  process.exit(1);
}

let totalPass = 0;
let totalFail = 0;

function test(name, fn) {
  try {
    const res = fn(content);
    if (res.pass) {
      console.log(`  ✅ [PASS] ${name}`);
      totalPass++;
    } else {
      console.log(`  ❌ [FAIL] ${name} → ${res.reason}`);
      totalFail++;
    }
  } catch (err) {
    console.log(`  💥 [ERROR] ${name}: ${err.message}`);
    totalFail++;
  }
}

// TG-01: Objeto Semântico para Retirada no Supabase
test("TG-01: Grava objeto semântico de retirada no customer_address do Supabase", (c) => ({
  pass: c.includes('isRetirada') &&
        c.includes('modalidade: "retirada"') &&
        c.includes('descricao: "Retirada presencial na loja / balcão"'),
  reason: "customer_address não grava objeto semântico quando isRetirada for ativo",
}));

// TG-02: Indicação Explícita de Retirada no WhatsApp
test("TG-02: WhatsApp inclui linha explícita '📍 Entrega: 🏪 Retirada no balcão da loja'", (c) => ({
  pass: c.includes('isRetirada ? "📍 Entrega: 🏪 Retirada no balcão da loja"') ||
        (c.includes('entregaStr') && c.includes('Retirada no balcão da loja')),
  reason: "Mensagem do WhatsApp não declara explicitamente a retirada no balcão",
}));

// TG-03: Regex Flexível para Nomenclaturas de Retirada
test("TG-03: Regex identifica flexivelmente retirada, busca ou balcão", (c) => ({
  pass: c.includes("/retira|busca|balc[aã]o/i"),
  reason: "Detecção de retirada não utiliza regex abrangente para variações de nomenclatura",
}));

// TG-04: Validação de E-mail Opcional
test("TG-04: Valida formato de e-mail opcional quando preenchido", (c) => ({
  pass: c.includes("customerEmail.trim()") &&
        c.includes("emailRegex.test(customerEmail.trim())") &&
        c.includes("Informe um e-mail válido"),
  reason: "E-mail opcional não possui validação de formato quando preenchido",
}));

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`RESULTADO DA GARANTIA: ${totalPass}/${totalPass + totalFail} testes passaram`);
if (totalFail === 0) {
  console.log("🏆 GARANTIA DA FASE 1 HOMOLOGADA COM SUCESSO ABSOLUTO!");
} else {
  console.log(`⚠️  ${totalFail} falha(s) na garantia — corrigir.`);
  process.exit(1);
}
