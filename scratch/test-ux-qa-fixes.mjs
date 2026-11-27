/**
 * @file test-ux-qa-fixes.mjs
 * @description Suíte de verificação das correções da Auditoria Independente QA, Dev e UX/UI.
 * Executar: node scratch/test-ux-qa-fixes.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("=== VESTUI — VERIFICAÇÃO DAS CORREÇÕES QA/DEV/UX ===\n");

const root = "c:/Users/yande/Downloads/Modaly 2.0/mode-saas";
const vitrine = readFileSync(resolve(root, "src/routes/vitrine.$storeSlug.tsx"), "utf-8");
const whatsapp = readFileSync(resolve(root, "src/lib/whatsapp.ts"), "utf-8");
const format = readFileSync(resolve(root, "src/lib/format.ts"), "utf-8");
const template01 = readFileSync(resolve(root, "src/components/theme/templates/template-01-store.tsx"), "utf-8");
const integracoes = readFileSync(resolve(root, "src/routes/_authenticated/loja.integracoes.tsx"), "utf-8");
const onboarding = readFileSync(resolve(root, "src/routes/_authenticated/onboarding.tsx"), "utf-8");

let totalPass = 0;
let totalFail = 0;

function test(name, pass, reason) {
  if (pass) {
    console.log(`  ✅ [PASS] ${name}`);
    totalPass++;
  } else {
    console.log(`  ❌ [FAIL] ${name} → ${reason}`);
    totalFail++;
  }
}

// BUG-01: Dados financeiros internos ocultos do comprador no Cartão
test(
  "BUG-01: Detalhamento financeiro interno removido do checkout do comprador",
  !vitrine.includes("Detalhamento financeiro") && !vitrine.includes("Líquido para a loja"),
  "Texto financeiro interno ainda visível ao comprador em vitrine.$storeSlug.tsx",
);

// BUG-02: Ordem da mensagem WhatsApp com extraLines antes da despedida
const extraIdx = whatsapp.indexOf("extraLines");
const aguardoIdx = whatsapp.indexOf("Aguardo o retorno");
test(
  "BUG-02: formatWhatsAppMessage aceita extraLines antes da linha final",
  extraIdx !== -1 && aguardoIdx !== -1 && extraIdx < aguardoIdx && !vitrine.includes("msgExtra"),
  "extraLines ausente ou posicionado após despedida / msgExtra legado ainda presente",
);

// BUG-03: QuickAdd com auto-seleção e toast.error quando sem tamanho
test(
  "BUG-03: QuickAdd em Template-01 valida tamanho selecionado com toast.error",
  template01.includes('toast.error("Selecione um tamanho') || template01.includes("Selecione um tamanho"),
  "Feedback de erro ao adicionar sem tamanho não encontrado em template-01-store.tsx",
);

// BUG-04 & BUG-11: Grid estático (sem interpolação dinâmica quebrada no Tailwind JIT) + empty state de categoria
test(
  "BUG-04 & BUG-11: Grid desktop usa mapa estático e exibe estado vazio para categoria sem produtos",
  !template01.includes("lg:grid-cols-${") && template01.includes("Ver todas as peças"),
  "Interpolação dinâmica lg:grid-cols-${} ou ausência de estado vazio em template-01-store.tsx",
);

// BUG-05: Auto-preenchimento ViaCEP no checkout
test(
  "BUG-05: Auto-preenchimento ViaCEP implementado no checkout",
  vitrine.includes("viacep.com.br/ws/") && vitrine.includes("setCustomerRua") && vitrine.includes("setCustomerBairro"),
  "Chamada ViaCEP não encontrada em vitrine.$storeSlug.tsx",
);

// BUG-06 & BUG-10: Máscaras compartilhadas de Telefone e CEP
test(
  "BUG-06 & BUG-10: Máscaras formatPhoneBr e formatCepBr aplicadas no checkout e onboarding",
  format.includes("export function formatPhoneBr") &&
    format.includes("export function formatCepBr") &&
    vitrine.includes("formatPhoneBr(") &&
    vitrine.includes("formatCepBr(") &&
    onboarding.includes("formatPhoneBr("),
  "Helpers de máscara ou seus usos no checkout/onboarding não encontrados",
);

// BUG-07: Aviso na tabela de medidas genérica
test(
  "BUG-07: Tabela de medidas exibe aviso claro de referência geral",
  vitrine.includes("Tabela de referência geral. Consulte a loja para medidas específicas"),
  "Aviso de referência geral ausente na tabela de medidas",
);

// BUG-08: Integração WhatsApp sem status falso de API Business conectada por padrão
test(
  "BUG-08: Integração WhatsApp ajustada para Link Direto com conectado: false por padrão",
  integracoes.includes('nome: "WhatsApp (Link Direto)"') &&
    /id:\s*"whatsapp"[\s\S]*?conectado:\s*false/.test(integracoes),
  "Integração WhatsApp ainda está hardcoded como conectada por padrão ou como Business API",
);

// BUG-09: Política de troca configurada exibida no rodapé da vitrine
test(
  "BUG-09: Política de troca real da vitrineSettings utilizada no rodapé",
  vitrine.includes("vitrineSettings.politicaTroca?.trim()"),
  "Rodapé ainda ignora vitrineSettings.politicaTroca",
);

// BUG-12 & MEL-05: Ortografia e acentuação corretas
test(
  "BUG-12 & MEL-05: Textos sem acento ('Gratis', 'nao configurou') corrigidos",
  vitrine.includes("Esta loja não configurou o WhatsApp. Seu pedido será copiado.") &&
    !vitrine.includes('"Gratis"') &&
    vitrine.includes('"Grátis"'),
  "Ainda existem ocorrências sem acento de 'Gratis' ou aviso do WhatsApp",
);

// MEL-01 & MEL-02: Transparência em parcelamento e badge de troca
test(
  "MEL-01 & MEL-02: Parcelamento com ressalva '*sujeito à disponibilidade' e badge 'Política de Troca'",
  vitrine.includes("*sujeito à disponibilidade") &&
    vitrine.includes("Política de Troca") &&
    !vitrine.includes("1ª Troca Grátis"),
  "Ressalva de parcelamento ou ajuste do trust badge não encontrados",
);

console.log("\n" + "─".repeat(60));
console.log(`RESULTADO QA/DEV/UX: ${totalPass}/${totalPass + totalFail} verificações passaram`);
if (totalFail > 0) {
  console.log(`⚠️  ${totalFail} falha(s) encontrada(s).`);
  process.exit(1);
}
console.log("🏆 TODAS AS CORREÇÕES DA AUDITORIA VERIFICADAS COM SUCESSO!");
