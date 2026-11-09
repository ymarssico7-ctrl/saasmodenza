import fs from 'fs';
import path from 'path';

const filePath = path.resolve('mode-saas/src/routes/_authenticated/precificacao.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalHasCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

console.log('Original content length:', content.length);

// ====================================================================
// 1. maxMarginSafe em escopo do componente
// ====================================================================
const targetActiveCardLabel = `  const activeCardLabel = useMemo(() => {
    const match = cardPresets.find((p) => Math.abs(p.value - cardRate) < 0.05);
    return match ? match.shortLabel : "Manual";
  }, [cardPresets, cardRate]);`;

const replacementActiveCardLabel = `  const activeCardLabel = useMemo(() => {
    const match = cardPresets.find((p) => Math.abs(p.value - cardRate) < 0.05);
    return match ? match.shortLabel : "Manual";
  }, [cardPresets, cardRate]);

  // Limite seguro dinâmico para margem sobre a venda (evita divisor <= 0)
  const maxMarginSafe = useMemo(() => {
    return Math.max(10, Math.floor(100 - (tax || 0) - (cardRate || 0) - 2));
  }, [tax, cardRate]);`;

if (!content.includes(targetActiveCardLabel)) {
  throw new Error('targetActiveCardLabel not found');
}
content = content.replace(targetActiveCardLabel, replacementActiveCardLabel);
console.log('1. maxMarginSafe posicionado no escopo do componente.');

// ====================================================================
// 2. Break-Even no Modo Rápido (summaryPrices)
// ====================================================================
const targetRapidaBe = `    if (mode === "rapida") {
      const wholes = toNumber(wholesale);
      const units = actualLotUnits > 0 ? actualLotUnits : 1;
      const sharedPerUnit =
        resolvePerUnit(freight, freightMode, units) +
        resolvePerUnit(packaging, packagingMode, units) +
        resolvePerUnit(other, otherMode, units);
      const deductionsPerUnit = singleResult.deductions;
      const netRevPerUnit = singleResult.netRevenue;
      const be = netRevPerUnit > 0 && singleResult.realCost > 0
        ? Math.ceil(singleResult.realCost / netRevPerUnit)
        : 1;
      const isBreakEvenReachable = singleResult.profit > 0 && be <= units;

      const totalWholesale = wholes * units;
      const totalSharedCosts = sharedPerUnit * units;
      const totalInvestment = singleResult.realCost * units;
      const totalRevenue = singleResult.suggestedPrice * units;
      const totalProfit = singleResult.profit * units;
      const totalDeductions = deductionsPerUnit * units;`;

const replacementRapidaBe = `    if (mode === "rapida") {
      const wholes = toNumber(wholesale);
      const units = actualLotUnits > 0 ? actualLotUnits : 1;
      const sharedPerUnit =
        resolvePerUnit(freight, freightMode, units) +
        resolvePerUnit(packaging, packagingMode, units) +
        resolvePerUnit(other, otherMode, units);
      const deductionsPerUnit = singleResult.deductions;
      const netRevPerUnit = singleResult.netRevenue;
      const totalWholesale = wholes * units;
      const totalSharedCosts = sharedPerUnit * units;
      const totalInvestment = singleResult.realCost * units;
      const totalRevenue = singleResult.suggestedPrice * units;
      const totalProfit = singleResult.profit * units;
      const totalDeductions = deductionsPerUnit * units;

      const be = netRevPerUnit > 0 && totalInvestment > 0
        ? Math.ceil(totalInvestment / netRevPerUnit)
        : 1;
      const isBreakEvenReachable = singleResult.profit > 0 && be <= units;`;

if (!content.includes(targetRapidaBe)) {
  throw new Error('targetRapidaBe not found');
}
content = content.replace(targetRapidaBe, replacementRapidaBe);
console.log('2. Break-Even do Modo Rápido corrigido para usar totalInvestment.');

// ====================================================================
// 3. Simulador de Meios de Pagamento sincronizado com cardRates da loja
// ====================================================================
const targetPaymentScenarios = `  // ── Simulador de Meios de Pagamento & Perdas ───────────────────────
  const paymentScenarios = useMemo(() => {
    return computePaymentScenarios(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      tax,
      cardRate,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, tax, cardRate]);`;

const replacementPaymentScenarios = `  // ── Simulador de Meios de Pagamento & Perdas ───────────────────────
  const paymentScenarios = useMemo(() => {
    return computePaymentScenarios(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      tax,
      cardRate,
      pricingSettings.cardRates,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, tax, cardRate, pricingSettings.cardRates]);`;

if (!content.includes(targetPaymentScenarios)) {
  throw new Error('targetPaymentScenarios not found');
}
content = content.replace(targetPaymentScenarios, replacementPaymentScenarios);
console.log('3. Simulador de Meios de Pagamento sincronizado com pricingSettings.cardRates.');

// ====================================================================
// 4. Assistente de Rateio: blindagem contra dupla diluição
// ====================================================================
const targetRateioAssistant = `  const openRateioAssistant = (target: "freight" | "packaging" | "other") => {
    setRateioTarget(target);
    setRateioTotal("");
    setRateioPieces(actualLotUnits > 0 ? String(actualLotUnits) : "20");
  };

  const applyRateio = () => {
    if (!rateioTarget) return;
    const total = toNumber(rateioTotal);
    const pieces = Math.max(1, Number(rateioPieces) || 1);
    if (total <= 0) {
      toast.error("Informe um valor total maior que zero");
      return;
    }
    const perUnit = total / pieces;
    const formatted = perUnit.toFixed(2).replace(".", ",");

    if (rateioTarget === "freight") {
      setFreight(formatted);
      toast.success(\`Frete rateado: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    } else if (rateioTarget === "packaging") {
      setPackaging(formatted);
      toast.success(\`Embalagem rateada: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    } else if (rateioTarget === "other") {
      setOther(formatted);
      toast.success(\`Outros custos rateados: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    }
    setRateioTarget(null);
  };`;

const replacementRateioAssistant = `  const openRateioAssistant = (target: "freight" | "packaging" | "other") => {
    setRateioTarget(target);
    setRateioTotal("");
    setRateioPieces(effectiveSharedUnits > 0 ? String(effectiveSharedUnits) : (actualLotUnits > 0 ? String(actualLotUnits) : "20"));
  };

  const applyRateio = () => {
    if (!rateioTarget) return;
    const total = toNumber(rateioTotal);
    const pieces = Math.max(1, Number(rateioPieces) || 1);
    if (total <= 0) {
      toast.error("Informe um valor total maior que zero");
      return;
    }
    const perUnit = total / pieces;
    const formatted = perUnit.toFixed(2).replace(".", ",");

    if (rateioTarget === "freight") {
      setFreight(formatted);
      setFreightMode("per_unit");
      toast.success(\`Frete rateado: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    } else if (rateioTarget === "packaging") {
      setPackaging(formatted);
      setPackagingMode("per_unit");
      toast.success(\`Embalagem rateada: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    } else if (rateioTarget === "other") {
      setOther(formatted);
      setOtherMode("per_unit");
      toast.success(\`Outros custos rateados: R$ \${formatted}/peça (R$ \${total.toFixed(2)} ÷ \${pieces} un.)\`);
    }
    setRateioTarget(null);
  };`;

if (!content.includes(targetRateioAssistant)) {
  throw new Error('targetRateioAssistant not found');
}
content = content.replace(targetRateioAssistant, replacementRateioAssistant);
console.log('4. Assistente de rateio blindado contra dupla diluição.');

// ====================================================================
// 5. Preservação de modelos no confirmEntryMutation.onSuccess
// ====================================================================
const targetConfirmSuccess = `    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEntrySheetOpen(false);
      resetPricingModel(true);

      // Auto-publicar na vitrine se a flag estiver ativa (sincronizado com estoque.tsx)
      if (res?.firstId && getAutoPublish()) {
        patchShowcaseConfig(res.firstId, { ativo: true });
        toast.info("Peça publicada automaticamente na vitrine", {
          description: "Você pode ajustar a visibilidade em Loja → Produtos.",
          duration: 4000,
        });
      }

      if (res && res.count > 1) {
        toast.success(\`Grade de \${res.count} cores cadastrada no Estoque! 📦\`, {
          description: \`\${entryTotalUnits} unidades registradas individualmente por cor.\`,
        });
      } else {
        toast.success("Peça cadastrada no Estoque com sucesso! 📦", {
          description: \`\${entryTotalUnits} unidades registradas na grade.\`,
        });
      }
    },`;

const replacementConfirmSuccess = `    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEntrySheetOpen(false);

      if (mode === "grade" && gradeModels.length > 1) {
        // Remove apenas o modelo que acabou de ser cadastrado no estoque
        const remainingModels = gradeModels.filter((m) => m.id !== activeModelId);
        setGradeModels(remainingModels);
        const nextModel = remainingModels[0]!;
        isSwitchingModelRef.current = true;
        setActiveModelId(nextModel.id);
        setName(nextModel.name);
        setCategory(nextModel.category);
        setBaseWholesaleGrade(nextModel.baseWholesale);
        setVariants(nextModel.variants);
        setActiveColors(nextModel.activeColors);
        if (nextModel.strategyMode) setStrategy(nextModel.strategyMode);
        if (nextModel.marginStr) setDesiredMargin(toNumber(nextModel.marginStr) || 50);
        if (nextModel.markupStr) setMarkup(toNumber(nextModel.markupStr) || 100);
        if (nextModel.directPrice !== undefined) setDirectSalePrice(nextModel.directPrice);
        setTimeout(() => {
          isSwitchingModelRef.current = false;
        }, 50);
        toast.success(\`Peça cadastrada no Estoque! 📦 Restam \${remainingModels.length} modelo(s) no lote.\`, {
          description: \`Avançando para "\${nextModel.name || "Próximo modelo"}".\`,
        });
      } else {
        // Se era peça única ou o último modelo do lote, limpa o modelo e o rascunho
        resetPricingModel(true);
      }

      // Auto-publicar na vitrine se a flag estiver ativa (sincronizado com estoque.tsx)
      if (res?.firstId && getAutoPublish()) {
        patchShowcaseConfig(res.firstId, { ativo: true });
        toast.info("Peça publicada automaticamente na vitrine", {
          description: "Você pode ajustar a visibilidade em Loja → Produtos.",
          duration: 4000,
        });
      }

      if (res && res.count > 1) {
        toast.success(\`Grade de \${res.count} cores cadastrada no Estoque! 📦\`, {
          description: \`\${entryTotalUnits} unidades registradas individualmente por cor.\`,
        });
      } else if (mode !== "grade" || gradeModels.length <= 1) {
        toast.success("Peça cadastrada no Estoque com sucesso! 📦", {
          description: \`\${entryTotalUnits} unidades registradas na grade.\`,
        });
      }
    },`;

if (!content.includes(targetConfirmSuccess)) {
  throw new Error('targetConfirmSuccess not found');
}
content = content.replace(targetConfirmSuccess, replacementConfirmSuccess);
console.log('5. Preservação de modelos pendentes no cadastro de estoque aplicada.');

// ====================================================================
// 6. Travamento de maxMarginSafe nos seletores de margem e tabela
// ====================================================================
// 6.1 computePriceForVariantMargin
const targetCompPriceMargin = `  const computePriceForVariantMargin = (wholesaleCost: number, targetMargin: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (targetMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };`;

const replacementCompPriceMargin = `  const computePriceForVariantMargin = (wholesaleCost: number, targetMargin: number): number => {
    const safeMargin = Math.min(targetMargin, maxMarginSafe);
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (safeMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };`;

if (!content.includes(targetCompPriceMargin)) {
  throw new Error('targetCompPriceMargin not found');
}
content = content.replace(targetCompPriceMargin, replacementCompPriceMargin);

// 6.2 Redefinição interna em linha ~5460 de maxMarginSafe (reutilizar existente)
const targetInnerMaxMargin = `const maxMarginSafe = Math.max(10, Math.floor(100 - tax - cardRate - 2));`;
if (content.includes(targetInnerMaxMargin)) {
  content = content.replace(targetInnerMaxMargin, `// maxMarginSafe gerenciado no escopo do componente`);
}

// 6.3 Botão +5% de margem no seletor inline (linha ~7005)
const targetBtnIncrementMargin = `                                onClick={() => {
                                  const next = Math.min(95, desiredMargin + 5);
                                  setDesiredMargin(next);
                                  setMatrixGlobalMarginStr(String(next));
                                }}`;

const replacementBtnIncrementMargin = `                                onClick={() => {
                                  const next = Math.min(maxMarginSafe, desiredMargin + 5);
                                  setDesiredMargin(next);
                                  setMatrixGlobalMarginStr(String(next));
                                }}`;

if (!content.includes(targetBtnIncrementMargin)) {
  throw new Error('targetBtnIncrementMargin not found');
}
content = content.replace(targetBtnIncrementMargin, replacementBtnIncrementMargin);

// 6.4 SmartTableNumericInput na tabela de margem (max 99.9 -> max maxMarginSafe)
const targetTableMarginInput = `                                        min={1}
                                        max={99.9}
                                        step={1}`;

const replacementTableMarginInput = `                                        min={1}
                                        max={maxMarginSafe}
                                        step={1}`;

if (!content.includes(targetTableMarginInput)) {
  throw new Error('targetTableMarginInput not found');
}
content = content.replace(targetTableMarginInput, replacementTableMarginInput);
console.log('6. Travamento de maxMarginSafe aplicado na tabela e controles inline.');

// Restaurar CRLF se o arquivo original possuía
if (originalHasCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Arquivo precificacao.tsx atualizado com sucesso! Tamanho:', content.length);
