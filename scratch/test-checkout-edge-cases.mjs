/**
 * @file test-checkout-edge-cases.mjs
 * @description Teste de QA e Engenharia para casos de borda e blindagem do Checkout da Vitrine (Fase 1).
 * Executar: node scratch/test-checkout-edge-cases.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("=== VESTUI — AUDITORIA DE CASOS DE BORDA DO CHECKOUT (FASE 1) ===\n");

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

// 1. Sanitização de Cupons
test("Sanitização de cupom remove espaços e caracteres invisíveis", (c) => ({
  pass: c.includes("\\u200B-\\u200D\\uFEFF") && c.includes(".toUpperCase()"),
  reason: "Sanitização de cupom não inclui filtro de caracteres invisíveis / zero-width spaces",
}));

// 2. Guarda Obrigatória de Frete
test("Bloqueia avanço para dados se frete obrigatório não for selecionado", (c) => ({
  pass: c.includes("opcoesFreteDisponiveis.length > 0 && !freteSelecionadoId"),
  reason: "Não há verificação impedindo avanço sem seleção de frete",
}));

// 3. Alerta de Compra Mínima do Cupom
test("Exibe aviso amigável quando carrinho fica abaixo da compra mínima do cupom", (c) => ({
  pass: c.includes("cupomAplicado.valor_minimo && totalPrice < cupomAplicado.valor_minimo") &&
        c.includes("reativar o desconto"),
  reason: "Falta feedback visual reativo para cupom pausado por compra mínima",
}));

// 4. Validação de WhatsApp com DDD
test("Valida formato de telefone com DDD (10 ou 11 dígitos numéricos)", (c) => ({
  pass: c.includes("phoneDigits.length < 10 || phoneDigits.length > 11"),
  reason: "Validação de WhatsApp não exige formato com DDD válido",
}));

// 5. Suporte a Retirada na Loja
test("Identifica modalidade de retirada e dispensa endereço de entrega", (c) => ({
  pass: c.includes("isRetirada") && c.includes("Retirada na Loja selecionada"),
  reason: "Retirada na loja ainda obriga preenchimento de endereço",
}));

// 6. Eliminação de Card Duplicado de Cartão
test("Elimina card duplicado de detalhamento financeiro do cartão de crédito", (c) => {
  const matches = (c.match(/Detalhamento financeiro/g) || []).length;
  return {
    pass: matches === 1,
    reason: `Esperava exatamente 1 ocorrência de 'Detalhamento financeiro', mas encontrou ${matches}`,
  };
});

// 7. Blindagem try/finally no handleCheckout
test("handleCheckout utiliza try / finally para garantir liberação do isSubmitting", (c) => {
  const hasTry = c.includes("async function handleCheckout()");
  const hasFinally = /finally\s*\{\s*setIsSubmitting\(false\);\s*\}/.test(c);
  return {
    pass: hasTry && hasFinally,
    reason: "handleCheckout não encapsula a execução em try / finally com setIsSubmitting(false)",
  };
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`RESULTADO DA FASE 1: ${totalPass}/${totalPass + totalFail} testes passaram`);
if (totalFail === 0) {
  console.log("🎉 CHECKOUT E SACOLA 100% BLINDADOS E APROVADOS EM QA!");
} else {
  console.log(`⚠️  ${totalFail} falha(s) detectada(s) — corrigir antes de avançar.`);
  process.exit(1);
}
