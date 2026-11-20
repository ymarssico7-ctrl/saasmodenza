import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log("=== AUDITORIA DE TRANSIÇÕES DE ESTADO E PERSISTÊNCIA ===");

const basePath = "c:/Users/yande/Downloads/Modaly 2.0/mode-saas/src";

function checkCode(relPath, pattern, shouldExist, description) {
  const fullPath = resolve(basePath, relPath);
  const content = readFileSync(fullPath, 'utf-8');
  const exists = content.includes(pattern);
  const pass = shouldExist ? exists : !exists;
  if (pass) {
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    console.log(`  ❌ [FAIL] ${description} (Esperava ${shouldExist ? "ter" : "NÃO ter"} '${pattern}')`);
  }
}

// Verifica se os canais de preview frame batem
checkCode(
  "components/theme/builder/mobile-preview-frame.tsx",
  'const CHANNEL_NAME = "vestui_theme_preview"',
  true,
  "MobilePreviewFrame escuta o canal vestui_theme_preview"
);

checkCode(
  "routes/loja.preview-frame.tsx",
  'const CHANNEL_NAME = "vestui_theme_preview"',
  true,
  "loja.preview-frame escuta o canal vestui_theme_preview"
);

// Verifica se o MobilePreviewFrame propaga onToggleSection e onDeleteSection
checkCode(
  "components/theme/builder/theme-builder.tsx",
  "onToggleSection={(id) => dispatch({ type: \"TOGGLE_VISIBLE\", id })}",
  true,
  "theme-builder passa onToggleSection para MobilePreviewFrame"
);

// Verifica se o ImageUploadField usa Supabase Storage ou apenas Base64 no Canvas
checkCode(
  "components/theme/builder/image-upload-field.tsx",
  "supabase.storage",
  true,
  "ImageUploadField faz upload no Supabase Storage em vez de inflar localStorage com Base64"
);

// Verifica se o vitrine.$storeSlug sincroniza templateId do tema com o banco
checkCode(
  "routes/vitrine.$storeSlug.tsx",
  "activeTheme.settings.templateId = activeTemplateId",
  true,
  "Vitrine pública garante sincronização estrita de templateId"
);

console.log("=== FIM DOS TESTES DE ESTADO ===");
