import fs from 'fs';
import path from 'path';

const filePath = path.resolve('mode-saas/src/routes/_authenticated/precificacao.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalizar CRLF para LF durante a substituição
const originalHasCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

console.log('Original content length:', content.length);

// ====================================================================
// AÇÃO 1: Rateio Consolidado da Nota Fiscal (effectiveSharedUnits)
// ====================================================================

// 1.1 Mover totalLoteUnits para logo após actualLotUnits e criar effectiveSharedUnits
const targetLotUnits = `  // ── Total Real de Unidades do Lote (Dinâmico e Preciso) ─────────────
  const actualLotUnits = useMemo(() => {
    if (mode !== "grade") return Math.max(1, Number(rapidaQty.replace(",", ".")) || 1);
    return variants.reduce((acc, v) => acc + (v.qty || 1), 0);
  }, [mode, variants, rapidaQty]);`;

const replacementLotUnits = `  // ── Total Real de Unidades do Lote (Dinâmico e Preciso) ─────────────
  const actualLotUnits = useMemo(() => {
    if (mode !== "grade") return Math.max(1, Number(rapidaQty.replace(",", ".")) || 1);
    return variants.reduce((acc, v) => acc + (v.qty || 1), 0);
  }, [mode, variants, rapidaQty]);

  // Total consolidado de peças de TODOS os modelos do lote (Multi-Grade)
  const totalLoteUnits = useMemo(() => {
    if (mode !== "grade") return actualLotUnits;
    return gradeModels.reduce((acc, m) => {
      const modelUnits = (m.id === activeModelId ? variants : m.variants).reduce((sum, v) => sum + (v.qty || 1), 0);
      return acc + modelUnits;
    }, 0);
  }, [gradeModels, mode, actualLotUnits, activeModelId, variants]);

  const effectiveSharedUnits = useMemo(() => {
    return totalLoteUnits > 0 ? totalLoteUnits : (actualLotUnits > 0 ? actualLotUnits : 1);
  }, [totalLoteUnits, actualLotUnits]);`;

if (!content.includes(targetLotUnits)) {
  throw new Error('targetLotUnits not found!');
}
content = content.replace(targetLotUnits, replacementLotUnits);
console.log('Passo 1.1 aplicado: actualLotUnits + totalLoteUnits + effectiveSharedUnits posicionados.');

// 1.2 Atualizar calculateItem para usar effectiveSharedUnits
const targetCalcItem = `  // ── Função Central de Cálculo de Item ──────────────────────────────
  const calculateItem = useMemo(() => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);`;

const replacementCalcItem = `  // ── Função Central de Cálculo de Item ──────────────────────────────
  const calculateItem = useMemo(() => {
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);`;

if (!content.includes(targetCalcItem)) {
  throw new Error('targetCalcItem not found!');
}
content = content.replace(targetCalcItem, replacementCalcItem);

// 1.3 Atualizar dependências de calculateItem
const targetCalcItemDeps = `}, [freight, packaging, other, freightMode, packagingMode, otherMode, actualLotUnits, strategy, desiredMargin, markup, directSalePrice, tax, cardRate]);`;
const replacementCalcItemDeps = `}, [freight, packaging, other, freightMode, packagingMode, otherMode, effectiveSharedUnits, strategy, desiredMargin, markup, directSalePrice, tax, cardRate]);`;

if (!content.includes(targetCalcItemDeps)) {
  throw new Error('targetCalcItemDeps not found!');
}
content = content.replace(targetCalcItemDeps, replacementCalcItemDeps);
console.log('Passo 1.2 e 1.3 aplicados: calculateItem usa effectiveSharedUnits.');

// 1.4 Atualizar variantResults para usar effectiveSharedUnits
const targetVariantResults = `  // ── Cálculo da Tabela Unificada de Variantes (Totalmente Reativo) ───
  const variantResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);`;

const replacementVariantResults = `  // ── Cálculo da Tabela Unificada de Variantes (Totalmente Reativo) ───
  const variantResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);`;

if (!content.includes(targetVariantResults)) {
  throw new Error('targetVariantResults not found!');
}
content = content.replace(targetVariantResults, replacementVariantResults);

// 1.5 Atualizar dependências de variantResults
const targetVariantResultsDeps = `}, [variants, baseWholesaleGrade, gradePricingMode, strategy, desiredMargin, markup, directSalePrice,
      freight, freightMode, packaging, packagingMode, other, otherMode, actualLotUnits, tax, cardRate]);`;
const replacementVariantResultsDeps = `}, [variants, baseWholesaleGrade, gradePricingMode, strategy, desiredMargin, markup, directSalePrice,
      freight, freightMode, packaging, packagingMode, other, otherMode, effectiveSharedUnits, tax, cardRate]);`;

if (!content.includes(targetVariantResultsDeps)) {
  throw new Error('targetVariantResultsDeps not found!');
}
content = content.replace(targetVariantResultsDeps, replacementVariantResultsDeps);
console.log('Passo 1.4 e 1.5 aplicados: variantResults usa effectiveSharedUnits.');

// 1.6 Atualizar variantRealCosts
const targetVariantRealCosts = `  // ── Detecção Adaptativa de Faixas de Custo Real ───────────────────
  const variantRealCosts = useMemo(() => {
    const baseShared = actualLotUnits > 0
      ? resolvePerUnit(freight, freightMode, actualLotUnits) +
        resolvePerUnit(packaging, packagingMode, actualLotUnits) +
        resolvePerUnit(other, otherMode, actualLotUnits)
      : 0;`;

const replacementVariantRealCosts = `  // ── Detecção Adaptativa de Faixas de Custo Real ───────────────────
  const variantRealCosts = useMemo(() => {
    const baseShared = effectiveSharedUnits > 0
      ? resolvePerUnit(freight, freightMode, effectiveSharedUnits) +
        resolvePerUnit(packaging, packagingMode, effectiveSharedUnits) +
        resolvePerUnit(other, otherMode, effectiveSharedUnits)
      : 0;`;

if (!content.includes(targetVariantRealCosts)) {
  throw new Error('targetVariantRealCosts not found!');
}
content = content.replace(targetVariantRealCosts, replacementVariantRealCosts);

const targetVariantRealCostsDeps = `}, [mode, variantResults, baseWholesaleGrade, freight, packaging, other, freightMode, packagingMode, otherMode, actualLotUnits]);`;
const replacementVariantRealCostsDeps = `}, [mode, variantResults, baseWholesaleGrade, freight, packaging, other, freightMode, packagingMode, otherMode, effectiveSharedUnits]);`;

if (!content.includes(targetVariantRealCostsDeps)) {
  throw new Error('targetVariantRealCostsDeps not found!');
}
content = content.replace(targetVariantRealCostsDeps, replacementVariantRealCostsDeps);
console.log('Passo 1.6 aplicado: variantRealCosts usa effectiveSharedUnits.');

// 1.7 Remover definição duplicada de totalLoteUnits da linha ~3182
const targetDuplicateTotalLoteUnits = `  // Total consolidado de peças de TODOS os modelos do lote (v74)
  const totalLoteUnits = useMemo(() => {
    if (mode !== "grade") return actualLotUnits;
    return gradeModels.reduce((acc, m) => {
      const modelUnits = (m.id === activeModelId ? variants : m.variants).reduce((sum, v) => sum + (v.qty || 1), 0);
      return acc + modelUnits;
    }, 0);
  }, [gradeModels, mode, actualLotUnits, activeModelId, variants]);`;

if (!content.includes(targetDuplicateTotalLoteUnits)) {
  throw new Error('targetDuplicateTotalLoteUnits not found!');
}
content = content.replace(targetDuplicateTotalLoteUnits, '');
console.log('Passo 1.7 aplicado: definição duplicada de totalLoteUnits removida.');

// 1.8 Atualizar computePriceForVariantMargin e computePriceForVariantMarkup
const targetVariantComputePrices = `  const computePriceForVariantMargin = (wholesaleCost: number, targetMargin: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (targetMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };

  const computePriceForVariantMarkup = (wholesaleCost: number, targetMarkup: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);`;

const replacementVariantComputePrices = `  const computePriceForVariantMargin = (wholesaleCost: number, targetMargin: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (targetMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };

  const computePriceForVariantMarkup = (wholesaleCost: number, targetMarkup: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
    const packagingNum = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
    const otherNum = resolvePerUnit(other, otherMode, effectiveSharedUnits);`;

if (!content.includes(targetVariantComputePrices)) {
  throw new Error('targetVariantComputePrices not found!');
}
content = content.replace(targetVariantComputePrices, replacementVariantComputePrices);

// 1.9 Atualizar UI card de extras (linha ~5155) e info de lote (linha ~6067)
const targetUiExtras = `          {/* ── Linha 1: Frete | Embalagem & tags | Outros ── */}
          {(() => {
            const freightVal = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const packagingVal = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const otherVal = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);`;

const replacementUiExtras = `          {/* ── Linha 1: Frete | Embalagem & tags | Outros ── */}
          {(() => {
            const freightVal = resolvePerUnit(freight, freightMode, effectiveSharedUnits);
            const packagingVal = resolvePerUnit(packaging, packagingMode, effectiveSharedUnits);
            const otherVal = resolvePerUnit(other, otherMode, effectiveSharedUnits);`;

if (!content.includes(targetUiExtras)) {
  throw new Error('targetUiExtras not found!');
}
content = content.replace(targetUiExtras, replacementUiExtras);

const targetInfoLoteExtras = `({brl(totalNoteExtras)} ÷ {actualLotUnits} un.)`;
const replacementInfoLoteExtras = `({brl(totalNoteExtras)} ÷ {effectiveSharedUnits} un.)`;
if (content.includes(targetInfoLoteExtras)) {
  content = content.replace(targetInfoLoteExtras, replacementInfoLoteExtras);
}

console.log('Passo 1.8 e 1.9 aplicados: cálculos auxiliares e UI usam effectiveSharedUnits.');

// ====================================================================
// AÇÃO 2: Isolamento de Estratégia em switchActiveModel e useEffect
// ====================================================================

// 2.1 addNewGradeModel
const targetAddNewModel = `    // 1. Snapshot do modelo ativo atual
    const currentSnapshot: GradeModel = {
      id: activeModelId,
      name,
      category,
      baseWholesale: baseWholesaleGrade,
      strategyMode: strategy,
      marginStr: desiredMargin.toString(),
      markupStr: markup.toString(),
      directPrice: "",
      variants,
      activeColors,
    };

    const nextIndex = gradeModels.length + 1;
    const newModel = createEmptyGradeModel(nextIndex);

    setGradeModels((prev) => {
      const updated = prev.map((m) => (m.id === activeModelId ? currentSnapshot : m));
      return [...updated, newModel];
    });

    isSwitchingModelRef.current = true;
    setActiveModelId(newModel.id);
    setName("");
    setBaseWholesaleGrade("");
    setVariants([]);
    setActiveColors([]);`;

const replacementAddNewModel = `    // 1. Snapshot do modelo ativo atual
    const currentSnapshot: GradeModel = {
      id: activeModelId,
      name,
      category,
      baseWholesale: baseWholesaleGrade,
      strategyMode: strategy,
      marginStr: desiredMargin.toString(),
      markupStr: markup.toString(),
      directPrice: directSalePrice,
      variants,
      activeColors,
    };

    const nextIndex = gradeModels.length + 1;
    const newModel = createEmptyGradeModel(nextIndex);

    setGradeModels((prev) => {
      const updated = prev.map((m) => (m.id === activeModelId ? currentSnapshot : m));
      return [...updated, newModel];
    });

    isSwitchingModelRef.current = true;
    setActiveModelId(newModel.id);
    setName("");
    setBaseWholesaleGrade("");
    setVariants([]);
    setActiveColors([]);
    setStrategy(newModel.strategyMode);
    setDesiredMargin(toNumber(newModel.marginStr) || 50);
    setMarkup(toNumber(newModel.markupStr) || 100);
    setDirectSalePrice(newModel.directPrice);`;

if (!content.includes(targetAddNewModel)) {
  throw new Error('targetAddNewModel not found!');
}
content = content.replace(targetAddNewModel, replacementAddNewModel);

// 2.2 switchActiveModel
const targetSwitchModel = `  const switchActiveModel = (targetId: string) => {
    if (targetId === activeModelId) return;
    const target = gradeModels.find((m) => m.id === targetId);
    if (!target) return;

    isSwitchingModelRef.current = true;
    // 1. Salvar dados do atual
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
            }
          : m
      )
    );

    // 2. Carregar dados do selecionado
    setActiveModelId(targetId);
    setName(target.name);
    setCategory(target.category);
    setBaseWholesaleGrade(target.baseWholesale);
    setVariants(target.variants);
    setActiveColors(target.activeColors);

    setTimeout(() => {
      isSwitchingModelRef.current = false;
    }, 50);
  };`;

const replacementSwitchModel = `  const switchActiveModel = (targetId: string) => {
    if (targetId === activeModelId) return;
    const target = gradeModels.find((m) => m.id === targetId);
    if (!target) return;

    isSwitchingModelRef.current = true;
    // 1. Salvar dados do atual
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
              strategyMode: strategy,
              marginStr: desiredMargin.toString(),
              markupStr: markup.toString(),
              directPrice: directSalePrice,
            }
          : m
      )
    );

    // 2. Carregar dados do selecionado
    setActiveModelId(targetId);
    setName(target.name);
    setCategory(target.category);
    setBaseWholesaleGrade(target.baseWholesale);
    setVariants(target.variants);
    setActiveColors(target.activeColors);
    if (target.strategyMode) setStrategy(target.strategyMode);
    if (target.marginStr) setDesiredMargin(toNumber(target.marginStr) || 50);
    if (target.markupStr) setMarkup(toNumber(target.markupStr) || 100);
    if (target.directPrice !== undefined) setDirectSalePrice(target.directPrice);

    setTimeout(() => {
      isSwitchingModelRef.current = false;
    }, 50);
  };`;

if (!content.includes(targetSwitchModel)) {
  throw new Error('targetSwitchModel not found!');
}
content = content.replace(targetSwitchModel, replacementSwitchModel);

// 2.3 removeGradeModel
const targetRemoveModel = `    if (gradeModels.length <= 1) {
      const fresh = createEmptyGradeModel(1);
      setGradeModels([fresh]);
      isSwitchingModelRef.current = true;
      setActiveModelId(fresh.id);
      setName("");
      setCategory("");
      setBaseWholesaleGrade("");
      setVariants([]);
      setActiveColors([]);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
      toast.success("Modelo limpo");
      return;
    }

    const remaining = gradeModels.filter((m) => m.id !== id);
    setGradeModels(remaining);

    if (activeModelId === id) {
      const next = remaining[0]!;
      isSwitchingModelRef.current = true;
      setActiveModelId(next.id);
      setName(next.name);
      setCategory(next.category);
      setBaseWholesaleGrade(next.baseWholesale);
      setVariants(next.variants);
      setActiveColors(next.activeColors);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
    }`;

const replacementRemoveModel = `    if (gradeModels.length <= 1) {
      const fresh = createEmptyGradeModel(1);
      setGradeModels([fresh]);
      isSwitchingModelRef.current = true;
      setActiveModelId(fresh.id);
      setName("");
      setCategory("");
      setBaseWholesaleGrade("");
      setVariants([]);
      setActiveColors([]);
      setStrategy(fresh.strategyMode);
      setDesiredMargin(toNumber(fresh.marginStr) || 50);
      setMarkup(toNumber(fresh.markupStr) || 100);
      setDirectSalePrice(fresh.directPrice);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
      toast.success("Modelo limpo");
      return;
    }

    const remaining = gradeModels.filter((m) => m.id !== id);
    setGradeModels(remaining);

    if (activeModelId === id) {
      const next = remaining[0]!;
      isSwitchingModelRef.current = true;
      setActiveModelId(next.id);
      setName(next.name);
      setCategory(next.category);
      setBaseWholesaleGrade(next.baseWholesale);
      setVariants(next.variants);
      setActiveColors(next.activeColors);
      if (next.strategyMode) setStrategy(next.strategyMode);
      if (next.marginStr) setDesiredMargin(toNumber(next.marginStr) || 50);
      if (next.markupStr) setMarkup(toNumber(next.markupStr) || 100);
      if (next.directPrice !== undefined) setDirectSalePrice(next.directPrice);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
    }`;

if (!content.includes(targetRemoveModel)) {
  throw new Error('targetRemoveModel not found!');
}
content = content.replace(targetRemoveModel, replacementRemoveModel);

// 2.4 useEffect de sincronização reativa
const targetSyncEffect = `  // Sincronização reativa do modelo ativo para o array gradeModels
  useEffect(() => {
    if (mode !== "grade" || !activeModelId || isSwitchingModelRef.current) return;
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
            }
          : m
      )
    );
  }, [name, category, baseWholesaleGrade, variants, activeColors, mode, activeModelId]);`;

const replacementSyncEffect = `  // Sincronização reativa do modelo ativo para o array gradeModels
  useEffect(() => {
    if (mode !== "grade" || !activeModelId || isSwitchingModelRef.current) return;
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
              strategyMode: strategy,
              marginStr: desiredMargin.toString(),
              markupStr: markup.toString(),
              directPrice: directSalePrice,
            }
          : m
      )
    );
  }, [name, category, baseWholesaleGrade, variants, activeColors, strategy, desiredMargin, markup, directSalePrice, mode, activeModelId]);`;

if (!content.includes(targetSyncEffect)) {
  throw new Error('targetSyncEffect not found!');
}
content = content.replace(targetSyncEffect, replacementSyncEffect);
console.log('Passo 2 aplicado: isolamento total de estratégia entre modelos da grade.');

// ====================================================================
// AÇÃO 3: Lucro Líquido Unitário na DRE do PricingSummaryCard
// ====================================================================
const targetDreCard = `          <div className="flex items-center justify-between text-xs font-bold text-foreground pt-1 border-t border-border/50">
            <span>Custo real</span>
            <span className="num-display">{brl(totalUnitCost > 0 ? totalUnitCost : baseWholesaleCost + sharedCostsPerUnit)}</span>
          </div>
        </div>`;

const replacementDreCard = `          <div className="flex items-center justify-between text-xs font-bold text-foreground pt-1 border-t border-border/50">
            <span>Custo real</span>
            <span className="num-display">{brl(totalUnitCost > 0 ? totalUnitCost : baseWholesaleCost + sharedCostsPerUnit)}</span>
          </div>
          {suggestedPrice > 0 && (
            <div className="flex items-center justify-between text-xs font-bold text-success pt-1 border-t border-border/40">
              <span>Lucro líquido/un.</span>
              <span className="num-display">
                +{brl(profitPerUnit)} ({pct(effectiveMargin)})
              </span>
            </div>
          )}
        </div>`;

if (!content.includes(targetDreCard)) {
  throw new Error('targetDreCard not found!');
}
content = content.replace(targetDreCard, replacementDreCard);
console.log('Passo 3 aplicado: Lucro líquido unitário inserido na DRE do PricingSummaryCard.');

// ====================================================================
// AÇÃO 4: Persistência Precisa no Histórico (insertPricing)
// ====================================================================
const targetSaveMutation = `          if (m.id === activeModelId) {
            return {
              ...m,
              name: name.trim() || m.name.trim(),
              category,
              baseWholesale: baseWholesaleGrade || m.baseWholesale,
              variants: variants.length > 0 ? variants : m.variants,
            };
          }
          return m;
        });

        // Coleta modelos que possuem nome ou variações
        const modelsWithData = synchronizedModels.filter(
          (m) => m.name.trim() || m.variants.length > 0
        );

        const listToSave = modelsWithData.length > 0 ? modelsWithData : [synchronizedModels[0]!];

        for (let i = 0; i < listToSave.length; i++) {
          const m = listToSave[i]!;
          const pieceName = m.name.trim() || \`Modelo \${i + 1}\`;
          let wholesaleNum = toNumber(m.baseWholesale);
          if (wholesaleNum <= 0 && m.variants.length > 0) {
            const firstValidCost = m.variants.find((v) => toNumber(v.wholesaleCost) > 0);
            if (firstValidCost) {
              wholesaleNum = toNumber(firstValidCost.wholesaleCost);
            }
          }

          await insertPricing({
            storeId,
            name: pieceName,
            wholesale_cost: wholesaleNum > 0 ? wholesaleNum : 1,
            freight_cost: toNumber(freight),
            packaging_cost: toNumber(packaging),
            other_costs: toNumber(other),
            margin_pct: strategy === "markup" ? markup : desiredMargin,
            tax_pct: tax,
          });
        }
        return listToSave.length;
      }

      // Modo rápido:
      const pieceName = name.trim();
      if (!pieceName) throw new Error("Dê um nome para a peça antes de salvar no histórico");

      const wholesaleNum = toNumber(wholesale);
      if (isNaN(wholesaleNum) || wholesaleNum <= 0) {
        throw new Error("Informe o custo no atacado da peça (maior que zero) antes de salvar");
      }

      await insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: toNumber(freight),
        packaging_cost: toNumber(packaging),
        other_costs: toNumber(other),
        margin_pct: strategy === "markup" ? markup : desiredMargin,
        tax_pct: tax,
      });`;

const replacementSaveMutation = `          if (m.id === activeModelId) {
            return {
              ...m,
              name: name.trim() || m.name.trim(),
              category,
              baseWholesale: baseWholesaleGrade || m.baseWholesale,
              variants: variants.length > 0 ? variants : m.variants,
              strategyMode: strategy,
              marginStr: desiredMargin.toString(),
              markupStr: markup.toString(),
              directPrice: directSalePrice,
            };
          }
          return m;
        });

        // Coleta modelos que possuem nome ou variações
        const modelsWithData = synchronizedModels.filter(
          (m) => m.name.trim() || m.variants.length > 0
        );

        const listToSave = modelsWithData.length > 0 ? modelsWithData : [synchronizedModels[0]!];

        for (let i = 0; i < listToSave.length; i++) {
          const m = listToSave[i]!;
          const pieceName = m.name.trim() || \`Modelo \${i + 1}\`;
          let wholesaleNum = toNumber(m.baseWholesale);
          if (wholesaleNum <= 0 && m.variants.length > 0) {
            const firstValidCost = m.variants.find((v) => toNumber(v.wholesaleCost) > 0);
            if (firstValidCost) {
              wholesaleNum = toNumber(firstValidCost.wholesaleCost);
            }
          }

          const modelStrategy = m.strategyMode || strategy;
          const modelMargin = toNumber(m.marginStr) || desiredMargin;
          const modelMarkup = toNumber(m.markupStr) || markup;

          await insertPricing({
            storeId,
            name: pieceName,
            wholesale_cost: wholesaleNum > 0 ? wholesaleNum : 1,
            freight_cost: resolvePerUnit(freight, freightMode, effectiveSharedUnits),
            packaging_cost: resolvePerUnit(packaging, packagingMode, effectiveSharedUnits),
            other_costs: resolvePerUnit(other, otherMode, effectiveSharedUnits),
            margin_pct: modelStrategy === "markup" ? modelMarkup : modelMargin,
            tax_pct: tax,
          });
        }
        return listToSave.length;
      }

      // Modo rápido:
      const pieceName = name.trim();
      if (!pieceName) throw new Error("Dê um nome para a peça antes de salvar no histórico");

      const wholesaleNum = toNumber(wholesale);
      if (isNaN(wholesaleNum) || wholesaleNum <= 0) {
        throw new Error("Informe o custo no atacado da peça (maior que zero) antes de salvar");
      }

      await insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: resolvePerUnit(freight, freightMode, effectiveSharedUnits),
        packaging_cost: resolvePerUnit(packaging, packagingMode, effectiveSharedUnits),
        other_costs: resolvePerUnit(other, otherMode, effectiveSharedUnits),
        margin_pct: strategy === "markup" ? markup : desiredMargin,
        tax_pct: tax,
      });`;

if (!content.includes(targetSaveMutation)) {
  throw new Error('targetSaveMutation not found!');
}
content = content.replace(targetSaveMutation, replacementSaveMutation);
console.log('Passo 4 aplicado: salvamento no histórico usa custos unitários rateados precisos.');

// Restaurar CRLF se original possuía
if (originalHasCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Arquivo atualizado com sucesso! Tamanho final:', content.length);
