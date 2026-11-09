import fs from 'fs';
import path from 'path';

const filePath = path.resolve('mode-saas/src/routes/_authenticated/precificacao.tsx');
let rawCode = fs.readFileSync(filePath, 'utf8');
const isCRLF = rawCode.includes('\r\n');
let code = rawCode.replace(/\r\n/g, '\n');

console.log('Original length:', code.length, 'isCRLF:', isCRLF);

// 1. calculateItem: add netRevenue to return type and all branch returns
const oldCalcSig = `    return (
      wholesaleCost: number,
      customSalePriceStr?: string,
    ): {
      realCost: number;
      suggestedPrice: number;
      profit: number;
      marginOnPrice: number;
      markupOnCost: number;
      deductions: number;
      isCustomPrice: boolean;
      marginHealth: MarginHealth;
    } => {`;

const newCalcSig = `    return (
      wholesaleCost: number,
      customSalePriceStr?: string,
    ): {
      realCost: number;
      suggestedPrice: number;
      profit: number;
      marginOnPrice: number;
      markupOnCost: number;
      deductions: number;
      netRevenue: number;
      isCustomPrice: boolean;
      marginHealth: MarginHealth;
    } => {`;

if (!code.includes(oldCalcSig)) {
  console.error('Target 1 (calculateItem signature) not found!');
} else {
  code = code.replace(oldCalcSig, newCalcSig);
  console.log('Fix 1a applied: calculateItem signature');
}

const oldCalcTargetPriceZero = `        if (targetPrice <= 0) {
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
        }`;

const newCalcTargetPriceZero = `        if (targetPrice <= 0) {
          return {
            realCost,
            suggestedPrice: 0,
            profit: 0,
            marginOnPrice: 0,
            markupOnCost: 0,
            deductions: 0,
            netRevenue: 0,
            isCustomPrice: hasCustomPrice,
            marginHealth: "good" as MarginHealth,
          };
        }`;

if (!code.includes(oldCalcTargetPriceZero)) {
  console.error('Target 1b (calculateItem targetPrice <= 0) not found!');
} else {
  code = code.replace(oldCalcTargetPriceZero, newCalcTargetPriceZero);
  console.log('Fix 1b applied: calculateItem targetPrice <= 0');
}

const oldCalcReverseReturn = `        return {
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: hasCustomPrice,
          marginHealth: res.marginHealth,
        };`;

const newCalcReverseReturn = `        return {
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          netRevenue: res.netRevenue,
          isCustomPrice: hasCustomPrice,
          marginHealth: res.marginHealth,
        };`;

if (!code.includes(oldCalcReverseReturn)) {
  console.error('Target 1c (calculateItem reverse return) not found!');
} else {
  code = code.replace(oldCalcReverseReturn, newCalcReverseReturn);
  console.log('Fix 1c applied: calculateItem reverse return');
}

const oldCalcMarginReturn = `        return {
          realCost: res.realCost,
          suggestedPrice: res.suggestedPrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: false,
          marginHealth: res.marginHealth,
        };`;

const newCalcMarginReturn = `        return {
          realCost: res.realCost,
          suggestedPrice: res.suggestedPrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          netRevenue: res.netRevenue,
          isCustomPrice: false,
          marginHealth: res.marginHealth,
        };`;

if (!code.includes(oldCalcMarginReturn)) {
  console.error('Target 1d (calculateItem margin return) not found!');
} else {
  code = code.replace(oldCalcMarginReturn, newCalcMarginReturn);
  console.log('Fix 1d applied: calculateItem margin return');
}

const oldCalcMarkupReturn = `      return {
        realCost: res.realCost,
        suggestedPrice: res.suggestedPrice,
        profit: res.profit,
        marginOnPrice: res.marginOnPrice,
        markupOnCost: res.markupOnCost,
        deductions: totalDeductions,
        isCustomPrice: false,
        marginHealth: getMarginHealth(res.marginOnPrice),
      };`;

const newCalcMarkupReturn = `      return {
        realCost: res.realCost,
        suggestedPrice: res.suggestedPrice,
        profit: res.profit,
        marginOnPrice: res.marginOnPrice,
        markupOnCost: res.markupOnCost,
        deductions: totalDeductions,
        netRevenue: res.suggestedPrice - totalDeductions,
        isCustomPrice: false,
        marginHealth: getMarginHealth(res.marginOnPrice),
      };`;

if (!code.includes(oldCalcMarkupReturn)) {
  console.error('Target 1e (calculateItem markup return) not found!');
} else {
  code = code.replace(oldCalcMarkupReturn, newCalcMarkupReturn);
  console.log('Fix 1e applied: calculateItem markup return');
}

// 2. variantResults: direct_price targetPrice <= 0 guard
const oldVariantDirect = `      } else {
        // direct_price: usa customSalePrice individual (isolado) ou preço fixo global
        const hasExplicitManualPrice =
          gradePricingMode === "isolated" &&
          v.customSalePrice !== undefined && v.customSalePrice !== "" &&
          toNumber(v.customSalePrice) > 0;
        const targetPriceStr = hasExplicitManualPrice ? v.customSalePrice : directSalePrice;
        const res = computeReversePricing({
          wholesale_cost: wholesaleNum,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          sale_price: toNumber(targetPriceStr),
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          ...v, qty, wholesaleNum,
          isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: hasExplicitManualPrice,
          marginHealth: res.marginHealth,
        };
      }`;

const newVariantDirect = `      } else {
        // direct_price: usa customSalePrice individual (isolado) ou preço fixo global
        const hasExplicitManualPrice =
          gradePricingMode === "isolated" &&
          v.customSalePrice !== undefined && v.customSalePrice !== "" &&
          toNumber(v.customSalePrice) > 0;
        const targetPriceStr = hasExplicitManualPrice ? v.customSalePrice : directSalePrice;
        const targetPriceNum = toNumber(targetPriceStr);
        if (targetPriceNum <= 0) {
          return {
            ...v, qty, wholesaleNum,
            isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
            realCost: wholesaleNum + freightNum + packagingNum + otherNum,
            suggestedPrice: 0,
            profit: 0,
            marginOnPrice: 0,
            markupOnCost: 0,
            deductions: 0,
            isCustomPrice: hasExplicitManualPrice,
            marginHealth: "good" as MarginHealth,
          };
        }
        const res = computeReversePricing({
          wholesale_cost: wholesaleNum,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          sale_price: targetPriceNum,
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          ...v, qty, wholesaleNum,
          isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: hasExplicitManualPrice,
          marginHealth: res.marginHealth,
        };
      }`;

if (!code.includes(oldVariantDirect)) {
  console.error('Target 2 (variantResults direct_price) not found!');
} else {
  code = code.replace(oldVariantDirect, newVariantDirect);
  console.log('Fix 2 applied: variantResults direct_price guard');
}

// 3. summaryPrices: neutral states for empty cost or price
const oldSummaryEmptyValid = `    const valid = variantResults.filter((i) => i.wholesaleNum > 0);
    if (!valid.length) {
      if (actualLotUnits === 0 && !toNumber(baseWholesaleGrade)) {
        return {
          minSuggested: 0,
          maxSuggested: 0,
          avgSuggested: 0,
          avgProfit: 0,
          avgCost: 0,
          avgMargin: 0,
          avgMarkup: 0,
          totalRevenue: 0,
          totalInvestment: 0,
          totalProfit: 0,
          marginHealth: getMarginHealth(0),
          hasMultiple: false,
          totalWholesale: 0,
          totalSharedCosts: 0,
          totalDeductions: 0,
          breakEvenUnits: 0,
          avgWholesale: 0,
          avgSharedCost: 0,
          avgDeduction: 0,
        };
      }`;

const newSummaryEmptyValid = `    const valid = variantResults.filter((i) => i.wholesaleNum > 0);
    if (!valid.length) {
      if (!toNumber(baseWholesaleGrade) && !variants.some((v) => toNumber(v.wholesaleCost) > 0)) {
        return {
          minSuggested: 0,
          maxSuggested: 0,
          avgSuggested: 0,
          avgProfit: 0,
          avgCost: 0,
          avgMargin: 0,
          avgMarkup: 0,
          totalRevenue: 0,
          totalInvestment: 0,
          totalProfit: 0,
          marginHealth: {
            status: "healthy",
            label: "Aguardando Custo",
            description: "Informe o custo no atacado para projetar o preço.",
            color: "text-muted-foreground",
            emoji: "⏳",
          },
          hasMultiple: false,
          totalWholesale: 0,
          totalSharedCosts: 0,
          totalDeductions: 0,
          breakEvenUnits: 0,
          isBreakEvenReachable: false,
          avgWholesale: 0,
          avgSharedCost: 0,
          avgDeduction: 0,
        };
      }`;

if (!code.includes(oldSummaryEmptyValid)) {
  console.error('Target 3a (summaryPrices empty valid) not found!');
} else {
  code = code.replace(oldSummaryEmptyValid, newSummaryEmptyValid);
  console.log('Fix 3a applied: summaryPrices empty valid');
}

const oldSummaryHealthValid = `      marginHealth: getMarginHealth(avgMarg),
      hasMultiple: valid.length > 1 && Math.abs(minP - maxP) > 0.05,`;

const newSummaryHealthValid = `      marginHealth: avgP > 0
        ? getMarginHealth(avgMarg)
        : {
            status: "healthy",
            label: "Aguardando Preço",
            description: "Defina o preço de venda para calcular a margem líquida.",
            color: "text-muted-foreground",
            emoji: "⏳",
          },
      hasMultiple: valid.length > 1 && Math.abs(minP - maxP) > 0.05,`;

if (!code.includes(oldSummaryHealthValid)) {
  console.error('Target 3b (summaryPrices health valid) not found!');
} else {
  code = code.replace(oldSummaryHealthValid, newSummaryHealthValid);
  console.log('Fix 3b applied: summaryPrices health valid');
}

// 4. Quick Mode Break-even: render only when avgSuggested > 0
const oldQuickBe = `{/* Ponto de Equilíbrio */}
                  {actualLotUnits > 1 && (`;

const newQuickBe = `{/* Ponto de Equilíbrio */}
                  {actualLotUnits > 1 && summaryPrices.avgSuggested > 0 && (`;

if (!code.includes(oldQuickBe)) {
  console.error('Target 4 (Quick Mode Break-even guard) not found!');
} else {
  code = code.replace(oldQuickBe, newQuickBe);
  console.log('Fix 4 applied: Quick Mode Break-even guard');
}

let finalCode = isCRLF ? code.replace(/\n/g, '\r\n') : code;
fs.writeFileSync(filePath, finalCode, 'utf8');
console.log('Saved successfully! New length:', finalCode.length);
