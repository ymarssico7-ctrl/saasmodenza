import fs from 'fs';
import path from 'path';

const filePath = path.resolve('mode-saas/src/routes/_authenticated/precificacao.tsx');
let rawCode = fs.readFileSync(filePath, 'utf8');
const isCRLF = rawCode.includes('\r\n');
let code = rawCode.replace(/\r\n/g, '\n');

console.log('Original length:', code.length, 'isCRLF:', isCRLF);

// 1. replicateGradeInColor: preserve inheritance and copy customMargin/customMarkup
const oldReplicateTarget = `wholesaleCost: matchingOriginal?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: matchingOriginal?.customSalePrice ?? "",
          qty,`;

const newReplicateReplacement = `wholesaleCost: matchingOriginal?.wholesaleCost ?? "",
          customSalePrice: matchingOriginal?.customSalePrice ?? "",
          customMargin: matchingOriginal?.customMargin,
          customMarkup: matchingOriginal?.customMarkup,
          qty,`;

if (!code.includes(oldReplicateTarget)) {
  console.error('Target 1 (replicateGradeInColor) not found!');
} else {
  code = code.replace(oldReplicateTarget, newReplicateReplacement);
  console.log('Fix 1 applied: replicateGradeInColor');
}

// 2. confirmEntryMutation: skip empty color groups and report accurate count
const oldEntryTarget = `for (const cg of colorGroups) {
          const colorSizes: Record<string, number> = {};
          cg.items.forEach((item) => {
            const q = item.qty && item.qty > 0 ? item.qty : 1;
            colorSizes[item.size] = (colorSizes[item.size] ?? 0) + q;
          });
          const id = await insertInventoryItem({
            storeId,
            name: entryName.trim() || "Peça sem nome",
            category: entryCategory,
            color: cg.color,
            supplier: entrySupplier.trim() || null,
            cost_price: cg.avgCost > 0 ? cg.avgCost : entryCostPrice,
            sale_price: cg.avgPrice > 0 ? cg.avgPrice : entrySalePrice,
            photo_url: entryPhotoUrl.trim() || null,
            sizes: colorSizes,
          });
          if (id) createdIds.push(id);
        }
        return { count: colorGroups.length, firstId: createdIds[0] ?? null };`;

const newEntryReplacement = `for (const cg of colorGroups) {
          if (!cg.items || cg.items.length === 0) continue;
          const colorSizes: Record<string, number> = {};
          cg.items.forEach((item) => {
            const q = item.qty && item.qty > 0 ? item.qty : 1;
            colorSizes[item.size] = (colorSizes[item.size] ?? 0) + q;
          });
          const id = await insertInventoryItem({
            storeId,
            name: entryName.trim() || "Peça sem nome",
            category: entryCategory,
            color: cg.color,
            supplier: entrySupplier.trim() || null,
            cost_price: cg.avgCost > 0 ? cg.avgCost : entryCostPrice,
            sale_price: cg.avgPrice > 0 ? cg.avgPrice : entrySalePrice,
            photo_url: entryPhotoUrl.trim() || null,
            sizes: colorSizes,
          });
          if (id) createdIds.push(id);
        }
        return { count: createdIds.length, firstId: createdIds[0] ?? null };`;

if (!code.includes(oldEntryTarget)) {
  console.error('Target 2 (confirmEntryMutation) not found!');
} else {
  code = code.replace(oldEntryTarget, newEntryReplacement);
  console.log('Fix 2 applied: confirmEntryMutation');
}

// 3. calculateItem: handle direct_price with targetPrice <= 0 cleanly
const oldCalcTarget = `      // 1. Preço de venda fixo personalizado ou estratégia direct_price
      if (hasCustomPrice || strategy === "direct_price") {
        const targetPrice = hasCustomPrice ? customPriceNum : toNumber(directSalePrice);
        const res = computeReversePricing({`;

const newCalcReplacement = `      // 1. Preço de venda fixo personalizado ou estratégia direct_price
      if (hasCustomPrice || strategy === "direct_price") {
        const targetPrice = hasCustomPrice ? customPriceNum : toNumber(directSalePrice);
        if (targetPrice <= 0) {
          return {
            realCost,
            suggestedPrice: 0,
            profit: 0,
            marginOnPrice: 0,
            markupOnCost: 0,
            deductions: 0,
            isCustomPrice: hasCustomPrice,
            marginHealth: "good" as MarginHealth,
          };
        }
        const res = computeReversePricing({`;

if (!code.includes(oldCalcTarget)) {
  console.error('Target 3 (calculateItem) not found!');
} else {
  code = code.replace(oldCalcTarget, newCalcReplacement);
  console.log('Fix 3 applied: calculateItem');
}

// 4. PricingSummaryCard: contextual message for direct_price
const oldCardTarget = `{suggestedPrice > 0 ? (
            <p className="num-display text-xl font-black text-foreground tracking-tight">
              {brl(suggestedPrice)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">
              Informe o custo para ver o preço.
            </p>
          )}`;

const newCardReplacement = `{suggestedPrice > 0 ? (
            <p className="num-display text-xl font-black text-foreground tracking-tight">
              {brl(suggestedPrice)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">
              {strategy === "direct_price" ? "Informe o preço de venda para simular." : "Informe o custo para ver o preço."}
            </p>
          )}`;

if (!code.includes(oldCardTarget)) {
  console.error('Target 4 (PricingSummaryCard) not found!');
} else {
  code = code.replace(oldCardTarget, newCardReplacement);
  console.log('Fix 4 applied: PricingSummaryCard');
}

let finalCode = isCRLF ? code.replace(/\n/g, '\r\n') : code;
fs.writeFileSync(filePath, finalCode, 'utf8');
console.log('Saved successfully! New length:', finalCode.length);
