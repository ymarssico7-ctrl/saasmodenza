import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log("=== INICIANDO AUDITORIA E TESTE DE ENGENHARIA DE SOFTWARE VESTUI ===");

const basePath = "c:/Users/yande/Downloads/Modaly 2.0/mode-saas/src";

function auditFile(relPath, tests) {
  const fullPath = resolve(basePath, relPath);
  const content = readFileSync(fullPath, 'utf-8');
  console.log(`\n📄 Auditando: ${relPath}`);
  for (const { name, fn } of tests) {
    try {
      const res = fn(content);
      if (res.pass) {
        console.log(`  ✅ [PASS] ${name}`);
      } else {
        console.log(`  ❌ [FAIL] ${name} -> ${res.reason}`);
      }
    } catch (e) {
      console.log(`  💥 [ERROR] ${name}: ${e.message}`);
    }
  }
}

// 1. Auditoria do Schema
auditFile("lib/theme-engine/schema.ts", [
  {
    name: "HeroSettings possui campo para link/ação do botão",
    fn: (c) => {
      const hasLink = c.includes("buttonLink") || c.includes("buttonAction");
      return { pass: hasLink, reason: "HeroSettings NÃO tem buttonLink/buttonAction definido" };
    }
  },
  {
    name: "CategoryBarSettings possui suporte a categorias dinâmicas/imagens",
    fn: (c) => {
      const hasItems = c.includes("CategoryBarSettings") && (c.includes("items") || c.includes("categories"));
      return { pass: hasItems, reason: "CategoryBarSettings só tem 'enabled: boolean', sem itens nem customização" };
    }
  },
  {
    name: "PromotionalBannerSettings possui suporte a link de destino",
    fn: (c) => {
      const hasLink = c.includes("PromotionalBannerSettings") && (c.includes("buttonLink") || c.includes("linkUrl"));
      return { pass: hasLink, reason: "PromotionalBannerSettings não permite configurar destino do botão" };
    }
  }
]);

// 2. Auditoria do Template 02 (Atelie Minimalist)
auditFile("components/theme/templates/template-02-store.tsx", [
  {
    name: "Hero Section não possui link hardcoded #vitrine",
    fn: (c) => {
      // Procura se o hero usa #vitrine cravado
      const hasHardcodedHeroLink = /case "hero":[\s\S]*?href="#vitrine"/.test(c);
      return { pass: !hasHardcodedHeroLink, reason: "Hero Section tem href='#vitrine' cravado no código" };
    }
  },
  {
    name: "Category Bar não possui categorias hardcoded 'Feminino/Masculino/Acessórios/Novidades'",
    fn: (c) => {
      const hasHardcodedCats = c.includes('label: "Feminino"') && c.includes('label: "Masculino"');
      return { pass: !hasHardcodedCats, reason: "Categorias fixas 'Feminino/Masculino' cravadas em vez de usar categorias reais" };
    }
  },
  {
    name: "ImageTextSplit não possui link vazio href='#'",
    fn: (c) => {
      const hasEmptyLink = c.includes('href="#"');
      return { pass: !hasEmptyLink, reason: "ImageTextSplit possui botão com link vazio href='#'" };
    }
  },
  {
    name: "Suporte a modo de interação vs edição",
    fn: (c) => {
      const hasInteractionMode = c.includes("interactiveMode") || c.includes("previewMode === 'interactive'");
      return { pass: hasInteractionMode, reason: "Não há modo de teste interativo, todo clique é bloqueado por onClickCapture" };
    }
  }
]);

// 3. Auditoria do Template 01 (Atelier Nove)
auditFile("components/theme/templates/template-01-store.tsx", [
  {
    name: "Hero Section do Template 01 usa link dinâmico",
    fn: (c) => {
      const hasHardcoded = c.includes('href="#produtos"') || c.includes('href="#vitrine"');
      return { pass: !hasHardcoded, reason: "Template 01 tem link fixo para catálogo" };
    }
  }
]);

// 4. Auditoria do Section Inspector
auditFile("components/theme/builder/section-inspector.tsx", [
  {
    name: "HeroInspector possui campo para escolher o destino do botão",
    fn: (c) => {
      const hasButtonLinkField = c.includes("Destino do Botão") || c.includes("buttonLink");
      return { pass: hasButtonLinkField, reason: "HeroInspector não tem campo para configurar link/ação do botão" };
    }
  },
  {
    name: "CategoryBarInspector possui controles reais de categorias",
    fn: (c) => {
      const hasCatControls = c.includes("CategoryBarInspector") && !c.includes("As categorias são geradas automaticamente");
      return { pass: hasCatControls, reason: "CategoryBarInspector exibe apenas texto estático sem nenhum controle" };
    }
  }
]);

// 5. Auditoria do SectionPreviewWrapper
auditFile("components/theme/builder/section-preview-wrapper.tsx", [
  {
    name: "Permite cliques em botões e CTAs quando em modo de teste/interação",
    fn: (c) => {
      const allowsInteraction = c.includes("interactive") || !c.includes("e.preventDefault()");
      return { pass: allowsInteraction, reason: "onClickCapture bloqueia 100% dos cliques em links e botões" };
    }
  }
]);

console.log("\n=== FIM DA AUDITORIA DE ENGENHARIA ===");
