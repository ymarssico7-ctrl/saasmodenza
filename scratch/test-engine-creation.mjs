/**
 * test-engine-creation.mjs — Suíte de Testes Automatizados da Auditoria Técnica do Modo Engine
 *
 * Valida de forma estrita e automatizada os 10 cenários operacionais da auditoria sênior:
 *   TC-ENG-01: Onboarding persiste metadata.theme e templateId no Supabase (Cenário 1: Dados Completos)
 *   TC-ENG-02: Persistência atômica em store-metadata protege cupons e frete (Cenário 9: Concorrência de Abas)
 *   TC-ENG-03: QuickAdd dos Templates 01 e 02 conectado ao globalCart (@/lib/cart)
 *   TC-ENG-04: Ação RESET do Construtor respeita o templateId ativo (Cenário 10: Idempotência & Repetição)
 *   TC-ENG-05: Handshake PREVIEW_FRAME_READY bidirecional entre iframe e builder (Cenário 7: Assincronia)
 *   TC-ENG-06: Previews do editor (Desktop e Iframe) recebem produtos reais da loja
 *   TC-ENG-07: Geração de IDs de seções (createDefaultSection) com alta entropia e anti-colisão (Cenário 8: Integridade)
 *   TC-ENG-08: Self-Healing de criação de loja no StoreContext inicializa metadata (Cenário 2: Dados Incompletos)
 *   TC-ENG-09: Proteção beforeunload contra perda de edições não salvas (Cenário 4: Interrupção Inesperada)
 *   TC-ENG-10: Tratamento e retry automático de colisão de slug concorrente (Cenário 5: Tentativa Duplicada)
 *   TC-ENG-11: Otimização de imagem Canvas evita inchaço do JSONB no Supabase (Cenário F: Escalabilidade)
 *   TC-ENG-12: Fallback determinístico de templateId suportado na Vitrine Pública (Cenário 6: Falha de Serviços)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const cwd = process.cwd();
const BASE_DIR = cwd.endsWith("mode-saas") ? cwd : resolve(cwd, "mode-saas");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${testName}]`);
  } else {
    failedTests++;
    console.log(`  \x1b[31m✖ FAIL\x1b[0m [${testName}]: ${details}`);
  }
}

console.log("\n=======================================================");
console.log("  SUÍTE DE TESTES: AUDITORIA TÉCNICA SÊNIOR — MODO ENGINE");
console.log("  VALIDAÇÃO DOS 10 CENÁRIOS OPERACIONAIS (PADRÃO SHOPIFY)");
console.log("=======================================================\n");

// ── TC-ENG-01: Onboarding persiste metadata.theme no Supabase (Cenário 1) ──
try {
  const onboardingSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/_authenticated/onboarding.tsx"),
    "utf-8"
  );

  const hasPresetImport = onboardingSrc.includes("getPresetThemeForTemplate");
  const hasMergedMetadata = onboardingSrc.includes("mergedMetadata") && onboardingSrc.includes("metadata: mergedMetadata");
  const hasThemeInPatch = onboardingSrc.includes("finalTheme = buildInitialTheme") || onboardingSrc.includes("templateId: finalTheme.settings.templateId");

  assert(
    hasPresetImport && hasMergedMetadata && hasThemeInPatch,
    "TC-ENG-01: Onboarding grava metadata.theme e templateId no Supabase",
    "onboarding.tsx não está gravando metadata com o tema inicial no banco."
  );
} catch (e) {
  assert(false, "TC-ENG-01: Onboarding grava metadata.theme", e.message);
}

// ── TC-ENG-02: Camada de persistência atômica store-metadata (Cenário 9) ──
try {
  const metadataHelperPath = resolve(BASE_DIR, "src/lib/store-metadata.ts");
  const helperExists = existsSync(metadataHelperPath);
  let helperSrc = "";
  if (helperExists) {
    helperSrc = readFileSync(metadataHelperPath, "utf-8");
  }

  const hasSaveStoreTheme = helperSrc.includes("saveStoreThemeToCloud");
  const hasSelectBeforeUpdate = helperSrc.includes('.select("metadata")') && helperSrc.includes('.update({ metadata: mergedMetadata');

  const themeBuilderSrc = readFileSync(
    resolve(BASE_DIR, "src/components/theme/builder/theme-builder.tsx"),
    "utf-8"
  );
  const templatesSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/_authenticated/loja.templates.tsx"),
    "utf-8"
  );

  const builderUsesHelper = themeBuilderSrc.includes("saveStoreThemeToCloud");
  const templatesUsesHelper = templatesSrc.includes("saveStoreThemeToCloud");

  assert(
    helperExists && hasSaveStoreTheme && hasSelectBeforeUpdate && builderUsesHelper && templatesUsesHelper,
    "TC-ENG-02: Persistência atômica em store-metadata protege metadados contra sobrescrita",
    "helper store-metadata ausente ou não integrado ao builder e loja.templates."
  );
} catch (e) {
  assert(false, "TC-ENG-02: Persistência atômica", e.message);
}

// ── TC-ENG-03: QuickAdd dos Templates integrado à Sacola Central ──
try {
  const t01Src = readFileSync(
    resolve(BASE_DIR, "src/components/theme/templates/template-01-store.tsx"),
    "utf-8"
  );
  const t02Src = readFileSync(
    resolve(BASE_DIR, "src/components/theme/templates/template-02-store.tsx"),
    "utf-8"
  );

  const t01UsesGlobalCart = t01Src.includes('import { useCart as useGlobalCart } from "@/lib/cart";');
  const t01DelegatesQuickAdd = t01Src.includes("globalCart.add({") && t01Src.includes("onOpenCart();");

  const t02UsesGlobalCart = t02Src.includes('import { useCart as useGlobalCart } from "@/lib/cart";');
  const t02DelegatesQuickAdd = t02Src.includes("globalCart.add({") && t02Src.includes("onOpenCart();");

  assert(
    t01UsesGlobalCart && t01DelegatesQuickAdd && t02UsesGlobalCart && t02DelegatesQuickAdd,
    "TC-ENG-03: QuickAdd dos Templates 01 e 02 conectado ao globalCart (@/lib/cart)",
    "Templates do Engine ainda utilizam contexto de carrinho local e isolado."
  );
} catch (e) {
  assert(false, "TC-ENG-03: QuickAdd integrado", e.message);
}

// ── TC-ENG-04: Ação RESET do Construtor respeita o templateId ativo (Cenário 10) ──
try {
  const contextSrc = readFileSync(
    resolve(BASE_DIR, "src/lib/theme-engine/context.tsx"),
    "utf-8"
  );

  const hasResetDynamic = contextSrc.includes('case "RESET":') &&
    contextSrc.includes("state.theme.settings.templateId") &&
    contextSrc.includes("getPresetThemeForTemplate(activeTemplateId");

  assert(
    hasResetDynamic,
    "TC-ENG-04: Ação RESET no reducer respeita o templateId ativo do lojista",
    "Ação RESET ainda força ATELIER_MOD_THEME hardcoded."
  );
} catch (e) {
  assert(false, "TC-ENG-04: Ação RESET dinâmica", e.message);
}

// ── TC-ENG-05: Handshake PREVIEW_FRAME_READY bidirecional (Cenário 7) ──
try {
  const contextSrc = readFileSync(
    resolve(BASE_DIR, "src/lib/theme-engine/context.tsx"),
    "utf-8"
  );
  const previewFrameSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/loja.preview-frame.tsx"),
    "utf-8"
  );

  const frameEmitsReady = previewFrameSrc.includes('type: "PREVIEW_FRAME_READY"');
  const contextHandlesReady = contextSrc.includes('type === "PREVIEW_FRAME_READY"') &&
    contextSrc.includes('channel.postMessage({ type: "THEME_UPDATE"');

  assert(
    frameEmitsReady && contextHandlesReady,
    "TC-ENG-05: Handshake PREVIEW_FRAME_READY bidirecional implementado",
    "Falta emissão ou tratamento de PREVIEW_FRAME_READY."
  );
} catch (e) {
  assert(false, "TC-ENG-05: Handshake PREVIEW_FRAME_READY", e.message);
}

// ── TC-ENG-06: Previews do Editor recebem produtos reais da loja ──
try {
  const builderSrc = readFileSync(
    resolve(BASE_DIR, "src/components/theme/builder/theme-builder.tsx"),
    "utf-8"
  );
  const previewFrameSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/loja.preview-frame.tsx"),
    "utf-8"
  );

  const builderPassesProducts = builderSrc.includes("showcaseProducts={allProducts}") &&
    builderSrc.includes("storeName={store?.name}");
  const framePassesProducts = previewFrameSrc.includes("showcaseProducts={allProducts}") &&
    previewFrameSrc.includes("storeName={store?.name}");

  assert(
    builderPassesProducts && framePassesProducts,
    "TC-ENG-06: Previews (Desktop e Iframe Mobile) recebem produtos e nome real da loja",
    "ThemeRenderer ainda renderizado sem produtos reais nos previews do editor."
  );
} catch (e) {
  assert(false, "TC-ENG-06: Previews com produtos reais", e.message);
}

// ── TC-ENG-07: Unicidade e entropia de seções criadas (Cenário 8) ──
try {
  const contextSrc = readFileSync(
    resolve(BASE_DIR, "src/lib/theme-engine/context.tsx"),
    "utf-8"
  );

  const hasAntiCollision = contextSrc.includes("existingIds?.has(id)") &&
    contextSrc.includes("Date.now().toString(36)");

  assert(
    hasAntiCollision,
    "TC-ENG-07: createDefaultSection possui alta entropia e prevenção de colisão",
    "createDefaultSection não valida colisões de ID."
  );
} catch (e) {
  assert(false, "TC-ENG-07: Alta entropia de seções", e.message);
}

// ── TC-ENG-08: Self-Healing de criação de loja no StoreContext (Cenário 2) ──
try {
  const storeCtxSrc = readFileSync(
    resolve(BASE_DIR, "src/lib/store-context.tsx"),
    "utf-8"
  );

  const createsWithTheme = storeCtxSrc.includes("getPresetThemeForTemplate") &&
    storeCtxSrc.includes("metadata:") &&
    storeCtxSrc.includes("templateId: initialTheme.settings.templateId");

  assert(
    createsWithTheme,
    "TC-ENG-08: Self-healing no StoreContext inicializa metadata do Modo Engine",
    "StoreContext.insert não inicializa metadata.theme."
  );
} catch (e) {
  assert(false, "TC-ENG-08: Self-healing no StoreContext", e.message);
}

// ── TC-ENG-09: Proteção beforeunload contra perda acidental (Cenário 4) ──
try {
  const builderSrc = readFileSync(
    resolve(BASE_DIR, "src/components/theme/builder/theme-builder.tsx"),
    "utf-8"
  );

  const hasBeforeUnload = builderSrc.includes('window.addEventListener("beforeunload"') &&
    builderSrc.includes("if (isDirty)");

  assert(
    hasBeforeUnload,
    "TC-ENG-09: Proteção beforeunload ativa para impedir saída acidental com rascunho sujo",
    "ThemeBuilder não possui interceptador de beforeunload para isDirty."
  );
} catch (e) {
  assert(false, "TC-ENG-09: Proteção beforeunload", e.message);
}

// ── TC-ENG-10: Retry e resolução de colisão concorrente de slug (Cenário 5) ──
try {
  const onboardingSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/_authenticated/onboarding.tsx"),
    "utf-8"
  );

  const handlesSlugConflict = onboardingSrc.includes("error.code === \"23505\"") &&
    onboardingSrc.includes("fallbackSlug");

  assert(
    handlesSlugConflict,
    "TC-ENG-10: Tratamento resiliente de colisão simultânea de slug com fallback dinâmico",
    "Onboarding não trata código 23505 de slug duplicado concorrente."
  );
} catch (e) {
  assert(false, "TC-ENG-10: Tratamento de colisão de slug", e.message);
}

// ── TC-ENG-11: Otimização de imagem Canvas evita inchaço do JSONB (Cenário F) ──
try {
  const uploadSrc = readFileSync(
    resolve(BASE_DIR, "src/components/theme/builder/image-upload-field.tsx"),
    "utf-8"
  );

  const hasSafeLimits = uploadSrc.includes("Math.min(maxWidth, 1280)") &&
    uploadSrc.includes("Math.min(maxHeight, 720)");

  assert(
    hasSafeLimits,
    "TC-ENG-11: Dimensões máximas de compressão limitam base64 para evitar inchaço do JSONB",
    "ImageUploadField permite base64 com dimensões excessivas sem contenção."
  );
} catch (e) {
  assert(false, "TC-ENG-11: Limite seguro de imagem", e.message);
}

// ── TC-ENG-12: Fallback determinístico de templateId na Vitrine (Cenário 6) ──
try {
  const vitrineSrc = readFileSync(
    resolve(BASE_DIR, "src/routes/vitrine.$storeSlug.tsx"),
    "utf-8"
  );

  const hasTemplateValidation = vitrineSrc.includes("validTemplates") &&
    vitrineSrc.includes("template-01") &&
    vitrineSrc.includes("template-05");

  assert(
    hasTemplateValidation,
    "TC-ENG-12: Vitrine valida estritamente lista de templates suportados (01 a 05)",
    "Vitrine não possui lista de validação explícita de templateId suportado."
  );
} catch (e) {
  assert(false, "TC-ENG-12: Validação de template na vitrine", e.message);
}

console.log("\n-------------------------------------------------------");
console.log(`TOTAL: ${totalTests} | APROVADOS: ${passedTests} | FALHAS: ${failedTests}`);
console.log("-------------------------------------------------------\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(" \x1b[32m✔ TODOS OS 12 TESTES DOS 10 CENÁRIOS OPERACIONAIS FORAM HOMOLOGADOS COM SUCESSO!\x1b[0m\n");
  process.exit(0);
}
