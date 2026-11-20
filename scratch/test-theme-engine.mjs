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
      const hasHardcodedHeroLink = /case "hero":[\s\S]*?href="#vitrine"/.test(c);
      return { pass: !hasHardcodedHeroLink, reason: "Hero Section tem href='#vitrine' cravado no código" };
    }
  },
  {
    name: "Category Bar não possui categorias hardcoded 'Feminino/Masculino/Acessórios/Novidades'",
    fn: (c) => {
      const hasDynamicResolution = c.includes("resolvedCategories") && c.includes("distinctCategorySlugs");
      return { pass: hasDynamicResolution, reason: "Categorias fixas cravadas em vez de usar categorias dinâmicas" };
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
      const hasInteractionMode = c.includes("interactionMode");
      return { pass: hasInteractionMode, reason: "Não há suporte a interactionMode no template" };
    }
  }
]);

// 3. Auditoria do Template 01 (Atelier Nove)
auditFile("components/theme/templates/template-01-store.tsx", [
  {
    name: "Hero Section do Template 01 usa link dinâmico",
    fn: (c) => {
      const hasHardcoded = /case "hero":[\s\S]*?href="#produtos"/.test(c);
      return { pass: !hasHardcoded, reason: "Template 01 tem link fixo para catálogo" };
    }
  },
  {
    name: "Category Bar do Template 01 é dinâmica",
    fn: (c) => {
      const hasDynamic = c.includes("resolvedCategories");
      return { pass: hasDynamic, reason: "Template 01 ainda possui categorias hardcoded" };
    }
  }
]);

// 4. Auditoria do Section Inspector
auditFile("components/theme/builder/section-inspector.tsx", [
  {
    name: "HeroInspector possui campo para escolher o destino do botão",
    fn: (c) => {
      const hasButtonLinkField = c.includes("CtaActionFields") && c.includes("Ação do Botão");
      return { pass: hasButtonLinkField, reason: "HeroInspector não tem campo para configurar link/ação do botão" };
    }
  },
  {
    name: "CategoryBarInspector possui controles reais de categorias",
    fn: (c) => {
      const hasCatControls = c.includes("CategoryBarInspector") && c.includes("Categorias Personalizadas");
      return { pass: hasCatControls, reason: "CategoryBarInspector exibe apenas texto estático sem nenhum controle" };
    }
  }
]);

// 5. Auditoria do Builder & Modo Duplo
auditFile("components/theme/builder/theme-builder.tsx", [
  {
    name: "ThemeBuilder possui alternador de modo 'Personalizar' vs 'Testar Loja'",
    fn: (c) => {
      const hasModeSwitch = c.includes("Personalizar") && c.includes("Testar Loja") && c.includes("SET_INTERACTION_MODE");
      return { pass: hasModeSwitch, reason: "ThemeBuilder não possui seletor de modo duplo" };
    }
  }
]);

// 6. Auditoria do SectionPreviewWrapper
auditFile("components/theme/builder/section-preview-wrapper.tsx", [
  {
    name: "Permite bypass total quando isEditing === false",
    fn: (c) => {
      const allowsBypass = c.includes("if (!isEditing) return <>{children}</>");
      return { pass: allowsBypass, reason: "SectionPreviewWrapper não permite bypass quando não estiver editando" };
    }
  }
]);

console.log("\n=== FIM DA AUDITORIA DE ENGENHARIA ===");
