import fs from 'fs';
import path from 'path';

const filePath = path.resolve('mode-saas/src/routes/_authenticated/precificacao.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalHasCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

console.log('Original content length:', content.length);

// ====================================================================
// 1. Gravação no Histórico: persistir Margem Real Efetiva (marginOnPrice)
// ====================================================================
const targetGradeSave = `          const modelStrategy = m.strategyMode || strategy;
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
          });`;

const replacementGradeSave = `          const itemPricing = calculateItem(wholesaleNum);
          const effectiveMarginToSave = itemPricing.marginOnPrice > 0
            ? Number(itemPricing.marginOnPrice.toFixed(2))
            : (toNumber(m.marginStr) || desiredMargin);

          await insertPricing({
            storeId,
            name: pieceName,
            wholesale_cost: wholesaleNum > 0 ? wholesaleNum : 1,
            freight_cost: resolvePerUnit(freight, freightMode, effectiveSharedUnits),
            packaging_cost: resolvePerUnit(packaging, packagingMode, effectiveSharedUnits),
            other_costs: resolvePerUnit(other, otherMode, effectiveSharedUnits),
            margin_pct: effectiveMarginToSave,
            tax_pct: tax,
          });`;

if (!content.includes(targetGradeSave)) {
  throw new Error('targetGradeSave not found');
}
content = content.replace(targetGradeSave, replacementGradeSave);

const targetRapidaSave = `      await insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: resolvePerUnit(freight, freightMode, effectiveSharedUnits),
        packaging_cost: resolvePerUnit(packaging, packagingMode, effectiveSharedUnits),
        other_costs: resolvePerUnit(other, otherMode, effectiveSharedUnits),
        margin_pct: strategy === "markup" ? markup : desiredMargin,
        tax_pct: tax,
      });`;

const replacementRapidaSave = `      const effectiveMarginToSave = singleResult.marginOnPrice > 0
        ? Number(singleResult.marginOnPrice.toFixed(2))
        : (strategy === "markup" ? markup : desiredMargin);

      await insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: resolvePerUnit(freight, freightMode, effectiveSharedUnits),
        packaging_cost: resolvePerUnit(packaging, packagingMode, effectiveSharedUnits),
        other_costs: resolvePerUnit(other, otherMode, effectiveSharedUnits),
        margin_pct: effectiveMarginToSave,
        tax_pct: tax,
      });`;

if (!content.includes(targetRapidaSave)) {
  throw new Error('targetRapidaSave not found');
}
content = content.replace(targetRapidaSave, replacementRapidaSave);
console.log('1. Gravação no histórico atualizada para persistir Margem Real Efetiva.');

// ====================================================================
// 2. Leitura no Histórico (saved.map): usar computePricingByMargin
// ====================================================================
const targetSavedMap = `                    {saved.map((p) => {
                      const r = computePricing({
                        wholesale_cost: Number(p.wholesale_cost),
                        freight_cost: Number(p.freight_cost),
                        packaging_cost: Number(p.packaging_cost),
                        other_costs: Number(p.other_costs),
                        margin_pct: Number(p.margin_pct),
                        tax_pct: Number(p.tax_pct),
                        card_rate_pct: cardRate,
                      });`;

const replacementSavedMap = `                    {saved.map((p) => {
                      const marginVal = Number(p.margin_pct);
                      const r = marginVal < 85
                        ? computePricingByMargin({
                            wholesale_cost: Number(p.wholesale_cost),
                            freight_cost: Number(p.freight_cost),
                            packaging_cost: Number(p.packaging_cost),
                            other_costs: Number(p.other_costs),
                            desired_margin_pct: marginVal,
                            tax_pct: Number(p.tax_pct),
                            card_rate_pct: cardRate,
                          })
                        : computePricing({
                            wholesale_cost: Number(p.wholesale_cost),
                            freight_cost: Number(p.freight_cost),
                            packaging_cost: Number(p.packaging_cost),
                            other_costs: Number(p.other_costs),
                            margin_pct: marginVal,
                            tax_pct: Number(p.tax_pct),
                            card_rate_pct: cardRate,
                          });`;

if (!content.includes(targetSavedMap)) {
  throw new Error('targetSavedMap not found');
}
content = content.replace(targetSavedMap, replacementSavedMap);
console.log('2. Leitura no histórico atualizada para usar computePricingByMargin.');

// ====================================================================
// 3. Multiplicador de Markup Médio Praticado (linha ~6350)
// ====================================================================
const targetMarkupDisplay = `                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Markup médio praticado:</span>
                        <span className="font-bold text-foreground numeric">
                          {summaryPrices.avgMarkup > 0 ? \`\${(1 + summaryPrices.avgMarkup / 100).toFixed(2)}x\` : "0.00x"}
                        </span>
                      </div>`;

const replacementMarkupDisplay = `                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Markup médio praticado:</span>
                        <span className="font-bold text-foreground numeric">
                          {summaryPrices.avgCost > 0 && summaryPrices.avgSuggested > 0
                            ? \`\${(summaryPrices.avgSuggested / summaryPrices.avgCost).toFixed(2)}x\`
                            : "—"}
                        </span>
                      </div>`;

if (!content.includes(targetMarkupDisplay)) {
  throw new Error('targetMarkupDisplay not found');
}
content = content.replace(targetMarkupDisplay, replacementMarkupDisplay);
console.log('3. Multiplicador de markup médio praticado corrigido para (preço / custo).');

// ====================================================================
// 4. Decomposição da DRE e Margem de Segurança / Desconto Seguro
// ====================================================================
const targetDreBlock = `                        {/* DRE */}
                        <div className="rounded-xl border border-border/60 bg-background/90 overflow-hidden shadow-2xs">
                          <div className="grid grid-cols-[1fr_auto_auto] items-center text-[11px] font-medium text-muted-foreground py-2 px-3 bg-secondary/25 border-b border-border/50">
                            <span>Componente</span>
                            <span className="text-right pr-6 sm:pr-8">Valor</span>
                            <span className="text-right w-14">%</span>
                          </div>
                          {[
                            { dot: "bg-slate-400", label: "Custo da Peça", note: "Preço atacado", val: cost, pctVal: costPct },
                            { dot: "bg-amber-400", label: \`Imposto DAS (\${tax.toFixed(1)}%)\`, note: "Simples Nacional", val: taxes, pctVal: taxPct },
                            { dot: "bg-sky-400", label: \`Taxa de Cartão (\${cardRate.toFixed(1)}%)\`, note: "Maquininha", val: cardFees, pctVal: cardPct },
                          ].map((row) => (
                            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={\`size-2 rounded-full \${row.dot} shrink-0\`} />
                                <span className="font-medium text-foreground">{row.label}</span>
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">· {row.note}</span>
                              </div>
                              <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(row.val)}</span>
                              <span className="numeric text-muted-foreground text-right w-14">{Math.round(row.pctVal)}%</span>
                            </div>
                          ))}
                          <div className={cn("grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs font-semibold", profit < 0 ? "bg-rose-500/10 text-rose-800 dark:text-rose-300" : "bg-emerald-500/8 text-emerald-900 dark:text-emerald-300")}>
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full shrink-0", profit < 0 ? "bg-rose-500" : "bg-emerald-500")} />
                              <span className="font-bold">Lucro Líquido Real</span>
                              <span className="text-[11px] opacity-75 hidden sm:inline">· Sobra limpa por peça</span>
                            </div>
                            <span className={cn("numeric font-bold text-sm text-right pr-6 sm:pr-8", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {profit > 0 ? \`+\${brl(profit)}\` : brl(profit)}
                            </span>
                            <span className={cn("numeric font-semibold text-right w-14", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {Math.round(profitPct)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ponto de Equilíbrio */}
                  {actualLotUnits > 1 && (
                    <div className="rounded-xl bg-secondary/40 p-3.5 text-xs text-muted-foreground leading-relaxed border border-border/60">
                      Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}). {lotBreakEven.totalLotProfit >= 0 ? (
                        Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? (
                          <>As outras <strong className="text-foreground">{Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} peças</strong> geram <strong className="text-success">+{brl(lotBreakEven.profitOnRemainder)}</strong> líquidos no seu caixa.</>
                        ) : "Lote quitado com margem saudável."
                      ) : (
                        <span className="text-destructive font-semibold">Atenção: este preço resulta em prejuízo previsto de {brl(Math.abs(lotBreakEven.totalLotProfit))} no lote.</span>
                      )}
                    </div>
                  )}`;

const replacementDreBlock = `                        {/* DRE */}
                        <div className="rounded-xl border border-border/60 bg-background/90 overflow-hidden shadow-2xs">
                          <div className="grid grid-cols-[1fr_auto_auto] items-center text-[11px] font-medium text-muted-foreground py-2 px-3 bg-secondary/25 border-b border-border/50">
                            <span>Componente</span>
                            <span className="text-right pr-6 sm:pr-8">Valor</span>
                            <span className="text-right w-14">%</span>
                          </div>
                          {[
                            ...(summaryPrices.avgSharedCost > 0
                              ? [
                                  { dot: "bg-slate-400", label: "Custo de Compra", note: "Preço atacado fornecedor", val: summaryPrices.avgWholesale, pctVal: total > 0 ? (summaryPrices.avgWholesale / total) * 100 : 0 },
                                  { dot: "bg-indigo-400", label: "Custos Extras", note: "Frete e rateios", val: summaryPrices.avgSharedCost, pctVal: total > 0 ? (summaryPrices.avgSharedCost / total) * 100 : 0 },
                                ]
                              : [
                                  { dot: "bg-slate-400", label: "Custo da Peça", note: "Preço atacado", val: cost, pctVal: costPct },
                                ]),
                            { dot: "bg-amber-400", label: \`Imposto DAS (\${tax.toFixed(1)}%)\`, note: "Simples Nacional", val: taxes, pctVal: taxPct },
                            { dot: "bg-sky-400", label: \`Taxa de Cartão (\${cardRate.toFixed(1)}%)\`, note: "Maquininha", val: cardFees, pctVal: cardPct },
                          ].map((row) => (
                            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={\`size-2 rounded-full \${row.dot} shrink-0\`} />
                                <span className="font-medium text-foreground">{row.label}</span>
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">· {row.note}</span>
                              </div>
                              <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(row.val)}</span>
                              <span className="numeric text-muted-foreground text-right w-14">{Math.round(row.pctVal)}%</span>
                            </div>
                          ))}
                          <div className={cn("grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs font-semibold", profit < 0 ? "bg-rose-500/10 text-rose-800 dark:text-rose-300" : "bg-emerald-500/8 text-emerald-900 dark:text-emerald-300")}>
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full shrink-0", profit < 0 ? "bg-rose-500" : "bg-emerald-500")} />
                              <span className="font-bold">Lucro Líquido Real</span>
                              <span className="text-[11px] opacity-75 hidden sm:inline">· Sobra limpa por peça</span>
                            </div>
                            <span className={cn("numeric font-bold text-sm text-right pr-6 sm:pr-8", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {profit > 0 ? \`+\${brl(profit)}\` : brl(profit)}
                            </span>
                            <span className={cn("numeric font-semibold text-right w-14", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {Math.round(profitPct)}%
                            </span>
                          </div>
                        </div>

                        {/* Margem de Segurança / Desconto Máximo Comercial Seguro */}
                        {summaryPrices.avgCost > 0 && profit > 0 && (() => {
                          const maxSafeDiscountPct = Math.max(0, Math.floor((profit / (summaryPrices.avgCost + profit)) * 100));
                          const minSafePrice = total * (1 - maxSafeDiscountPct / 100);
                          return (
                            <div className="flex items-center justify-between text-[11px] bg-secondary/35 rounded-xl px-3 py-2 border border-border/50 text-muted-foreground">
                              <span>🛡️ <strong>Margem de segurança:</strong> Preço mínimo <strong className="text-foreground">{brl(minSafePrice)}</strong></span>
                              <span className="font-bold text-foreground bg-secondary px-2 py-0.5 rounded-md">Até {maxSafeDiscountPct}% OFF seguro</span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Ponto de Equilíbrio */}
                  {actualLotUnits > 1 && (
                    <div className="rounded-xl bg-secondary/40 p-3.5 text-xs text-muted-foreground leading-relaxed border border-border/60">
                      Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}). {lotBreakEven.totalLotProfit >= 0 ? (
                        Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? (
                          <>As outras <strong className="text-foreground">{Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} peças</strong> completam o lucro líquido total de <strong className="text-success">+{brl(lotBreakEven.profitOnRemainder)}</strong> no seu caixa.</>
                        ) : "Lote quitado com margem saudável."
                      ) : (
                        <span className="text-destructive font-semibold">Atenção: este preço resulta em prejuízo previsto de {brl(Math.abs(lotBreakEven.totalLotProfit))} no lote.</span>
                      )}
                    </div>
                  )}`;

if (!content.includes(targetDreBlock)) {
  throw new Error('targetDreBlock not found');
}
content = content.replace(targetDreBlock, replacementDreBlock);
console.log('4. Decomposição da DRE, Desconto Seguro e mensagem de Break-Even atualizadas.');

// ====================================================================
// 5. Indicador de Desconto Seguro em PricingSummaryCard (lateral)
// ====================================================================
const targetPricingSummaryCardDre = `          {suggestedPrice > 0 && (
            <div className="flex items-center justify-between text-xs font-bold text-success pt-1 border-t border-border/40">
              <span>Lucro líquido/un.</span>
              <span className="num-display">
                +{brl(profitPerUnit)} ({pct(effectiveMargin)})
              </span>
            </div>
          )}
        </div>`;

const replacementPricingSummaryCardDre = `          {suggestedPrice > 0 && (
            <div className="flex items-center justify-between text-xs font-bold text-success pt-1 border-t border-border/40">
              <span>Lucro líquido/un.</span>
              <span className="num-display">
                +{brl(profitPerUnit)} ({pct(effectiveMargin)})
              </span>
            </div>
          )}
          {suggestedPrice > 0 && profitPerUnit > 0 && totalUnitCost > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span title="Desconto comercial máximo permitido sem tirar dinheiro do bolso">Desconto máx. seguro</span>
              <span className="num-display font-medium text-foreground">
                até {Math.max(0, Math.floor((profitPerUnit / (totalUnitCost + profitPerUnit)) * 100))}% OFF
              </span>
            </div>
          )}
        </div>`;

if (!content.includes(targetPricingSummaryCardDre)) {
  throw new Error('targetPricingSummaryCardDre not found');
}
content = content.replace(targetPricingSummaryCardDre, replacementPricingSummaryCardDre);
console.log('5. Indicador de desconto comercial seguro adicionado ao PricingSummaryCard.');

// Restaurar CRLF se o original possuía
if (originalHasCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Arquivo precificacao.tsx atualizado com sucesso! Tamanho final:', content.length);
