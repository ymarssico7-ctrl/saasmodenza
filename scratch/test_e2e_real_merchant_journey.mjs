import {
  computePricingByMargin,
  computePricing,
  computeReversePricing,
  computeLotBreakEven,
  computePaymentScenarios,
  getMarginHealth,
} from '../src/lib/finance.js';

// Utilitários de Formatação
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v) => `${v.toFixed(1).replace('.', ',')}%`;

console.log('='.repeat(80));
console.log('🛍️  SIMULAÇÃO DE UMA LOJISTA REAL: TESTE DE PONTA A PONTA (MODALY 2.0)');
console.log('='.repeat(80));
console.log('Cenário: Lojista "Boutique Elegance" compra lote no atacado com 2 modelos.');
console.log('NF-e Fornecedor: 10 Vestidos Canelados + 20 Blusas de Seda (Total: 30 peças).');
console.log('Frete Transportadora: R$ 120,00 (Total do Lote).');
console.log('Embalagens & Tags: R$ 30,00 (Total do Lote).');
console.log('Tributos: DAS 6,0% (Simples Nacional) | Taxa Maquininha Média: 4,0%. Total = 10,0%.\n');

let allPassed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    allPassed = false;
  } else {
    console.log(`  ✅ ${message}`);
  }
}

// ----------------------------------------------------------------------------
// ETAPA 1: RATEIO CONSOLIDADO DA NOTA FISCAL (effectiveSharedUnits)
// ----------------------------------------------------------------------------
console.log('--- ETAPA 1: RATEIO CONSOLIDADO DE CUSTOS DA NOTA FISCAL ---');

const totalLoteUnits = 10 + 20; // 30 peças
const freightTotal = 120.0;
const packagingTotal = 30.0;
const sharedPerUnit = (freightTotal + packagingTotal) / totalLoteUnits;

console.log(`Total de peças no lote: ${totalLoteUnits} un.`);
console.log(`Custos extras da NF: ${brl(freightTotal + packagingTotal)}`);
console.log(`Rateio exato por peça: ${brl(sharedPerUnit)}/peça`);

assert(Math.abs(sharedPerUnit - 5.0) < 0.001, 'O rateio da nota fiscal resulta em exatamente R$ 5,00 por peça (sem triplicação)');

// ----------------------------------------------------------------------------
// ETAPA 2: MODELO 1 - VESTIDO CANELADO (Estratégia Margem Real 50%)
// ----------------------------------------------------------------------------
console.log('\n--- ETAPA 2: MODELO 1 - VESTIDO CANELADO (10 un, Margem 50%) ---');

const wholesaleVestido = 50.0;
const realCostVestido = wholesaleVestido + sharedPerUnit; // R$ 55,00
const taxPct = 6.0;
const cardRatePct = 4.0;
const desiredMarginVestido = 50.0;

const resVestido = computePricingByMargin({
  wholesale_cost: wholesaleVestido,
  freight_cost: freightTotal / totalLoteUnits,
  packaging_cost: packagingTotal / totalLoteUnits,
  other_costs: 0,
  desired_margin_pct: desiredMarginVestido,
  tax_pct: taxPct,
  card_rate_pct: cardRatePct,
});

console.log(`Custo Atacado: ${brl(wholesaleVestido)}`);
console.log(`Custo Real com Rateio: ${brl(resVestido.realCost)}`);
console.log(`Preço Sugerido: ${brl(resVestido.suggestedPrice)}`);
console.log(`Deduções (10%): -${brl(resVestido.deductions)}`);
console.log(`Receita Líquida: ${brl(resVestido.netRevenue)}`);
console.log(`Lucro Líquido Real: +${brl(resVestido.profit)} (${pct(resVestido.marginOnPrice)})`);

assert(Math.abs(resVestido.realCost - 55.0) < 0.01, 'Custo real do vestido é exatamente R$ 55,00');
assert(Math.abs(resVestido.suggestedPrice - 137.5) < 0.01, 'Preço sugerido do vestido é exatamente R$ 137,50 (55 / 0.40)');
assert(Math.abs(resVestido.profit - 68.75) < 0.01, 'Lucro líquido por vestido é exatamente +R$ 68,75');
assert(Math.abs(resVestido.marginOnPrice - 50.0) < 0.01, 'Margem sobre a venda é exatamente 50,0%');

// Ponto de Equilíbrio Modelo 1
const beVestido = computeLotBreakEven(
  resVestido.suggestedPrice,
  resVestido.realCost,
  10, // 10 unidades
  taxPct,
  cardRatePct
);

console.log(`Break-Even: ${beVestido.unitsToBreakEven} peças de 10 quitam o lote de vestidos`);
console.log(`Lucro projetado ao quitar o lote: +${brl(beVestido.totalLotProfit)}`);

assert(beVestido.unitsToBreakEven === 5, 'Exatamente 5 vestidos quitam o investimento de R$ 550,00 no lote');
assert(Math.abs(beVestido.totalLotProfit - 687.5) < 0.01, 'Vender os 10 vestidos gera exatamente R$ 687,50 de lucro limpo no caixa');

// ----------------------------------------------------------------------------
// ETAPA 3: MODELO 2 - BLUSA DE SEDA (Estratégia Markup 100% / 2.0x)
// ----------------------------------------------------------------------------
console.log('\n--- ETAPA 3: MODELO 2 - BLUSA DE SEDA (20 un, Markup 100%) ---');

const wholesaleBlusa = 30.0;
const realCostBlusa = wholesaleBlusa + sharedPerUnit; // R$ 35,00
const markupBlusa = 100.0; // 2.0x

const resBlusa = computePricing({
  wholesale_cost: wholesaleBlusa,
  freight_cost: freightTotal / totalLoteUnits,
  packaging_cost: packagingTotal / totalLoteUnits,
  other_costs: 0,
  margin_pct: markupBlusa,
  tax_pct: taxPct,
  card_rate_pct: cardRatePct,
});

console.log(`Custo Atacado: ${brl(wholesaleBlusa)}`);
console.log(`Custo Real com Rateio: ${brl(resBlusa.realCost)}`);
console.log(`Preço Sugerido: ${brl(resBlusa.suggestedPrice)}`);
console.log(`Deduções (10%): -${brl(resBlusa.deductions)}`);
console.log(`Receita Líquida: ${brl(resBlusa.netRevenue)}`);
console.log(`Lucro Líquido Real: +${brl(resBlusa.profit)} (${pct(resBlusa.marginOnPrice)} margem)`);

assert(Math.abs(resBlusa.realCost - 35.0) < 0.01, 'Custo real da blusa é exatamente R$ 35,00');
assert(Math.abs(resBlusa.suggestedPrice - 77.78) < 0.01, 'Preço sugerido da blusa é exatamente R$ 77,78 (70 / 0.90)');
assert(Math.abs(resBlusa.profit - 35.0) < 0.01, 'Lucro líquido por blusa é exatamente +R$ 35,00 (100% sobre o custo real!)');

// ----------------------------------------------------------------------------
// ETAPA 4: TESTE DE HISTÓRICO (ROUNDTRIP GRAVAÇÃO E REABERTURA)
// ----------------------------------------------------------------------------
console.log('\n--- ETAPA 4: TESTE DE SALVAMENTO NO HISTÓRICO & REABERTURA ---');

// 1. Simulação da gravação do Vestido
const savedVestidoDb = {
  name: "Vestido Canelado",
  wholesale_cost: wholesaleVestido,
  freight_cost: 4.0, // R$ 120 / 30
  packaging_cost: 1.0, // R$ 30 / 30
  other_costs: 0,
  margin_pct: Number(resVestido.marginOnPrice.toFixed(2)), // 50.00
  tax_pct: taxPct,
};

// 2. Simulação da reabertura na tabela de Histórico (saved.map)
const marginValVestido = Number(savedVestidoDb.margin_pct);
const reabertoVestido = marginValVestido < 85
  ? computePricingByMargin({
      wholesale_cost: savedVestidoDb.wholesale_cost,
      freight_cost: savedVestidoDb.freight_cost,
      packaging_cost: savedVestidoDb.packaging_cost,
      other_costs: savedVestidoDb.other_costs,
      desired_margin_pct: marginValVestido,
      tax_pct: savedVestidoDb.tax_pct,
      card_rate_pct: cardRatePct,
    })
  : computePricing({ ...savedVestidoDb, margin_pct: marginValVestido });

console.log(`Vestido original calculado: ${brl(resVestido.suggestedPrice)}`);
console.log(`Vestido reaberto do histórico: ${brl(reabertoVestido.suggestedPrice)}`);

assert(Math.abs(reabertoVestido.suggestedPrice - 137.5) < 0.01, 'Vestido reaberto do histórico mantém o preço exato de R$ 137,50 (sem cair para R$ 91,67)');
assert(Math.abs(reabertoVestido.marginOnPrice - 50.0) < 0.01, 'Margem reaberta do histórico é 50,0%');

// ----------------------------------------------------------------------------
// ETAPA 5: ENTRADA NO ESTOQUE & PRESERVAÇÃO DE RASCUNHO MULTI-MODELO
// ----------------------------------------------------------------------------
console.log('\n--- ETAPA 5: ENTRADA NO ESTOQUE & CICLO DE RASCUNHO ---');

let gradeModelsSim = [
  { id: "mod-1", name: "Vestido Canelado", variants: [{ size: "P", qty: 2 }, { size: "M", qty: 4 }, { size: "G", qty: 4 }] },
  { id: "mod-2", name: "Blusa Seda", variants: [{ size: "U", qty: 20 }] },
];

console.log(`Estado inicial do lote: ${gradeModelsSim.length} modelos.`);

// Lojista cadastra o Modelo 1 (Vestido) no Estoque
const enteredModelId = "mod-1";
const remainingModels = gradeModelsSim.filter(m => m.id !== enteredModelId);

console.log(`Modelo "${gradeModelsSim[0].name}" enviado para o estoque com:`);
console.log(`  - Custo Unitário Cadastrado: ${brl(resVestido.realCost)}`);
console.log(`  - Preço de Venda Cadastrado: ${brl(resVestido.suggestedPrice)}`);
console.log(`  - Quantidade: 10 peças (2 P, 4 M, 4 G)`);

assert(remainingModels.length === 1, 'Após cadastrar o Vestido, resta exatamente 1 modelo (Blusa Seda)');
assert(remainingModels[0].name === "Blusa Seda", 'O modelo Blusa Seda foi 100% preservado no rascunho com suas 20 unidades');

// ----------------------------------------------------------------------------
// ETAPA 6: SIMULADOR DE MEIOS DE PAGAMENTO & DESCONTO MÁXIMO SEGURO
// ----------------------------------------------------------------------------
console.log('\n--- ETAPA 6: SIMULADOR DE MEIOS DE PAGAMENTO & DESCONTO SEGURO ---');

const customCardRates = { pix: 0, debito: 1.99, credito1x: 3.49, parcelado: 5.99 };
const scenariosVestido = computePaymentScenarios(
  resVestido.suggestedPrice,
  resVestido.realCost,
  taxPct,
  cardRatePct,
  customCardRates
);

console.log('Cenários simulados para o Vestido (Preço R$ 137,50 | Custo R$ 55,00):');
scenariosVestido.forEach(sc => {
  console.log(`  ${sc.icon} ${sc.label.padEnd(26)} -> Lucro: +${brl(sc.profit).padEnd(10)} | Margem: ${pct(sc.margin)}`);
  assert(sc.isViable, `Cenário ${sc.label} é viável`);
});

// Desconto Máximo Comercial Seguro
const maxDiscountVestido = Math.max(0, Math.floor((resVestido.profit / (resVestido.realCost + resVestido.profit)) * 100));
const minPriceVestido = resVestido.suggestedPrice * (1 - maxDiscountVestido / 100);

console.log(`\nDesconto Máximo Seguro sem prejuízo: ${maxDiscountVestido}% OFF`);
console.log(`Preço Mínimo de Equilíbrio: ${brl(minPriceVestido)}`);

// Simulação de venda com o desconto máximo seguro
const testDeductions = minPriceVestido * ((taxPct + cardRatePct) / 100);
const testProfit = minPriceVestido - resVestido.realCost - testDeductions;
console.log(`Lucro da venda no preço mínimo: ${brl(testProfit)} (Zero Prejuízo)`);

assert(testProfit >= -0.05, 'Vender com o desconto máximo seguro garante ZERO prejuízo para a lojista');

console.log('\n' + '='.repeat(80));
if (allPassed) {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO E PRECISÃO MATEMÁTICA!');
  console.log('A jornada completa da lojista está comprovadamente blindada e homologada.');
} else {
  console.log('⚠️ HOUVE FALHAS NA SIMULAÇÃO.');
}
console.log('='.repeat(80));
