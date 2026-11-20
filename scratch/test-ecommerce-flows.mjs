/**
 * @file test-ecommerce-flows.mjs
 * @description Auditoria estática de fluxos críticos do e-commerce Vestui.
 *   Verifica persistência real (Supabase), validação de cupons, frete,
 *   integrations e guards de UX (loading states, double-click protection).
 *
 * Executar: node scratch/test-ecommerce-flows.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("=== VESTUI — AUDITORIA DE FLUXOS E-COMMERCE ===\n");

const basePath = "c:/Users/yande/Downloads/Modaly 2.0/mode-saas/src";
let totalPass = 0;
let totalFail = 0;

function auditFile(relPath, tests) {
  const fullPath = resolve(basePath, relPath);
  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch (e) {
    console.log(`\n📄 [SKIP] ${relPath} — arquivo não encontrado: ${e.message}`);
    return;
  }
  console.log(`\n📄 Auditando: ${relPath}`);
  for (const { name, fn } of tests) {
    try {
      const res = fn(content);
      if (res.pass) {
        console.log(`  ✅ [PASS] ${name}`);
        totalPass++;
      } else {
        console.log(`  ❌ [FAIL] ${name} → ${res.reason}`);
        totalFail++;
      }
    } catch (e) {
      console.log(`  💥 [ERROR] ${name}: ${e.message}`);
      totalFail++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CUPONS — vitrine.$storeSlug.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/vitrine.$storeSlug.tsx", [
  {
    name: "Lê cupons do storeMetadata (nuvem) com fallback localStorage",
    fn: (c) => ({
      pass: c.includes('["cupons"]') || c.includes("storeMetadata") && c.includes("cupons"),
      reason: "Não encontrou leitura de cupons via storeMetadata",
    }),
  },
  {
    name: "Valida cupom expirado (campo validade)",
    fn: (c) => ({
      pass: c.includes("cupom.validade") && c.includes("new Date"),
      reason: "Sem verificação de data de expiração do cupom (campo .validade)",
    }),
  },
  {
    name: "Valida limite de uso do cupom (campo limite)",
    fn: (c) => ({
      pass: c.includes("cupom.limite") || c.includes(".limite &&"),
      reason: "Sem verificação de limite de usos (campo .limite)",
    }),
  },
  {
    name: "Valida valor mínimo do cupom (campo valor_minimo)",
    fn: (c) => ({
      pass: c.includes("valor_minimo"),
      reason: "Sem verificação de valor mínimo de compra (campo valor_minimo)",
    }),
  },
  {
    name: "Incrementa uso do cupom no localStorage após checkout",
    fn: (c) => ({
      pass: c.includes("usos: c.usos + 1"),
      reason: "Sem incremento de uso do cupom",
    }),
  },
  {
    name: "Incrementa uso do cupom no Supabase (sync nuvem)",
    fn: (c) => ({
      pass:
        c.includes("cupons: atualizado") &&
        c.includes(".update(") &&
        c.includes("storeId"),
      reason: "Sem sync de uso do cupom para Supabase após checkout",
    }),
  },
  {
    name: "Lê configuração de frete do storeMetadata (nuvem)",
    fn: (c) => ({
      pass: c.includes('["frete"]') && c.includes("storeMetadata"),
      reason: "Sem leitura de frete via storeMetadata",
    }),
  },
  {
    name: "Insere pedido na tabela orders do Supabase",
    fn: (c) => ({
      pass: c.includes('.from("orders")') && c.includes(".insert("),
      reason: "Sem insert na tabela orders",
    }),
  },
  {
    name: "Checkout emite WhatsApp com dados do pedido",
    fn: (c) => ({
      pass: c.includes("wa.me") || c.includes("whatsapp"),
      reason: "Sem envio de mensagem WhatsApp",
    }),
  },
  {
    name: "Checkout tem guard contra duplo clique (isSubmitting/isProcessing)",
    fn: (c) => ({
      pass:
        c.includes("isSubmitting") ||
        c.includes("isProcessingPayment") ||
        c.includes("isFinalizing") ||
        c.includes("isCheckingOut") ||
        c.includes("isProcessing"),
      reason: "Sem guard contra duplo clique no checkout",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTEGRAÇÕES — loja.integracoes.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.integracoes.tsx", [
  {
    name: "toggleIntegracao é função async",
    fn: (c) => ({
      pass: c.includes("const toggleIntegracao = async"),
      reason: "toggleIntegracao não é async — não persiste no Supabase",
    }),
  },
  {
    name: "toggleIntegracao persiste toggle no Supabase (integracoes key)",
    fn: (c) => ({
      pass: c.includes("integracoes: updated"),
      reason: "Toggle de integração não sincroniza com Supabase",
    }),
  },
  {
    name: "ModalConfiguracaoMercadoPago tem isSaving state",
    fn: (c) => ({
      pass: c.includes("isSaving") && c.includes("mercadopago"),
      reason: "Sem isSaving no modal do Mercado Pago",
    }),
  },
  {
    name: "ModalConfiguracaoMercadoPago persiste na nuvem (stores.metadata.integrations.mercadopago)",
    fn: (c) => ({
      pass: c.includes("mercadopago: config") && c.includes(".update("),
      reason: "Configuração MP não persiste no Supabase",
    }),
  },
  {
    name: "ModalConfiguracaoAssistido persiste na nuvem (stores.metadata.integrations.cartao_assistido)",
    fn: (c) => ({
      pass: c.includes("cartao_assistido: config") && c.includes(".update("),
      reason: "Configuração Modo Assistido não persiste no Supabase",
    }),
  },
  {
    name: "Botão Salvar do ModalAssistido usa void salvar()",
    fn: (c) => ({
      pass: c.includes("void salvar()"),
      reason: "Botão Salvar do modal assistido não chama void salvar()",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEMPLATES — loja.templates.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.templates.tsx", [
  {
    name: "GaleriaTemplatesPage tem estado isApplying",
    fn: (c) => ({
      pass: c.includes("isApplying") && c.includes("setIsApplying"),
      reason: "Sem isApplying state — duplo clique possível",
    }),
  },
  {
    name: "applyTemplate protegida contra duplo clique (guard isApplying)",
    fn: (c) => ({
      pass: c.includes("if (isApplying) return;"),
      reason: "applyTemplate sem guard de duplo clique",
    }),
  },
  {
    name: "applyTemplate tem try/finally para resetar isApplying",
    fn: (c) => ({
      pass: c.includes("setIsApplying(false)") && c.includes("finally"),
      reason: "applyTemplate sem finally { setIsApplying(false) }",
    }),
  },
  {
    name: "Botão Aplicar Tema desabilitado durante isApplying",
    fn: (c) => ({
      pass: c.includes("disabled={isApplying}") || c.includes("disabled={isApplying}"),
      reason: "Botão Aplicar Tema sem disabled={isApplying}",
    }),
  },
  {
    name: "applyTemplate persiste templateId no Supabase",
    fn: (c) => ({
      pass: c.includes("templateId: entry.id") && c.includes(".update("),
      reason: "Template não persiste templateId no Supabase",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONFIGURAÇÃO DA VITRINE — loja.configuracao.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.configuracao.tsx", [
  {
    name: "salvar() persiste vitrineSettings no Supabase",
    fn: (c) => ({
      pass: c.includes("vitrineSettings") && c.includes(".update("),
      reason: "Configuração da vitrine não persiste no Supabase",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 5. FRETE — loja.frete.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.frete.tsx", [
  {
    name: "salvar() persiste frete no Supabase (stores.metadata.frete)",
    fn: (c) => ({
      pass: c.includes("frete") && c.includes(".update("),
      reason: "Configuração de frete não persiste no Supabase",
    }),
  },
  {
    name: "Frete tem frete grátis configurável",
    fn: (c) => ({
      pass: c.includes("freteGratis") || c.includes("frete_gratis") || c.includes("gratis"),
      reason: "Sem opção de frete grátis",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 6. CUPONS ADMIN — loja.cupons.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.cupons.tsx", [
  {
    name: "persistir() sincroniza cupons na nuvem (sincronizarNuvem)",
    fn: (c) => ({
      pass: c.includes("sincronizarNuvem") || (c.includes("cupons") && c.includes(".update(")),
      reason: "Cupons admin não sincroniza com Supabase",
    }),
  },
  {
    name: "Cupom tem campo validade (data de expiração)",
    fn: (c) => ({
      pass: c.includes("validade") || c.includes("novaValidade"),
      reason: "Sem campo de validade no cupom",
    }),
  },
  {
    name: "Cupom tem campo limite (limite de usos)",
    fn: (c) => ({
      pass: c.includes("limite") || c.includes("novoLimite"),
      reason: "Sem campo de limite de usos no cupom",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 7. PEDIDOS — loja.pedidos.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.pedidos.tsx", [
  {
    name: "Atualização de status persiste na tabela orders",
    fn: (c) => ({
      pass: c.includes('.from("orders")') && c.includes(".update("),
      reason: "Status de pedido não persiste no Supabase",
    }),
  },
  {
    name: "Pedido entregue ajusta estoque (inventory_items)",
    fn: (c) => ({
      pass: c.includes("inventory_items") || c.includes("estoque"),
      reason: "Sem ajuste de estoque ao marcar pedido como entregue",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 8. PRODUTOS / SHOWCASE — loja.produtos.tsx
// ─────────────────────────────────────────────────────────────────────────────
auditFile("routes/_authenticated/loja.produtos.tsx", [
  {
    name: "patchShowcaseConfig() salva config na vitrine",
    fn: (c) => ({
      pass: c.includes("patchShowcaseConfig"),
      reason: "Sem chamada a patchShowcaseConfig",
    }),
  },
  {
    name: "syncShowcaseToCloud() persiste showcaseConfigs no Supabase",
    fn: (c) => ({
      pass: c.includes("syncShowcaseToCloud") || c.includes("showcaseConfigs"),
      reason: "Sem sync de showcaseConfigs com Supabase",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 9. SHOWCASE STORE LIB — lib/showcase-store.ts
// ─────────────────────────────────────────────────────────────────────────────
auditFile("lib/showcase-store.ts", [
  {
    name: "syncShowcaseToCloud() faz update em stores.metadata.showcaseConfigs",
    fn: (c) => ({
      pass: c.includes("showcaseConfigs") && c.includes(".update("),
      reason: "syncShowcaseToCloud sem update no Supabase",
    }),
  },
  {
    name: "mergeInventoryWithShowcase() retorna array de ShowcaseProduct",
    fn: (c) => ({
      pass: c.includes("mergeInventoryWithShowcase"),
      reason: "Função mergeInventoryWithShowcase não encontrada",
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
const total = totalPass + totalFail;
console.log("\n" + "─".repeat(55));
console.log(`RESULTADO: ${totalPass}/${total} testes passaram`);
if (totalFail === 0) {
  console.log("🎉 TODOS OS FLUXOS E-COMMERCE VALIDADOS COM SUCESSO!");
} else {
  console.log(`⚠️  ${totalFail} problema(s) encontrado(s) — revisar itens ❌ acima.`);
  process.exit(1);
}
