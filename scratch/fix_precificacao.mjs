import fs from 'node:fs';

const filePath = 'c:/Users/yande/Downloads/Modaly 2.0/mode-saas/src/routes/_authenticated/precificacao.tsx';
let file = fs.readFileSync(filePath, 'utf8');

// 1. Corrige duplicatas no draft
file = file.replace(/mode,\r?\n\s+strategy,\r?\n\s+strategy,/g, 'mode,\n          strategy,');
file = file.replace(/mode,\r?\n\s+strategy,\r?\n\s+strategy,\r?\n\s+name,/g, 'mode,\n    strategy,\n    name,');

// 2. Adiciona strategy na interface de LivePricingSummaryPanel
file = file.replace(
  /mode:\s*PricingMode;(\r?\n\s*)onEntry:\s*\(\)\s*=>\s*void;/,
  'mode: PricingMode;$1strategy?: PricingStrategy | "direct_price" | string;$1onEntry: () => void;'
);

// 3. Passa strategy em <LivePricingSummaryPanel
file = file.replace(
  /mode=\{mode\}(\r?\n\s*)onEntry=\{openEntryForCurrent\}/,
  'mode={mode}$1strategy={strategy}$1onEntry={openEntryForCurrent}'
);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Precificacao successfully patched!');
