/** Regras de negócio puras: precificação, totais e projeções. */

// ── Tipos de Precificação ─────────────────────────────────────────────────────

export type PricingInput = {
  wholesale_cost: number;
  freight_cost: number;
  packaging_cost: number;
  other_costs: number;
  margin_pct: number;
  tax_pct: number;
  card_rate_pct?: number;
};

export type PricingResult = {
  realCost: number;
  minPrice: number;
  suggestedPrice: number;
  profit: number;
  /** Margem real sobre o preço de venda (Gross Margin %). Ex: 40% → R$0,40 de cada R$1,00 é lucro líquido. */
  marginOnPrice: number;
  /** Markup sobre o custo (%). Ex: 80% → preço é 80% maior que o custo total. */
  markupOnCost: number;
};

// ── Status de Saúde da Margem ─────────────────────────────────────────────────

export type MarginHealth = {
  status: "danger" | "warning" | "healthy" | "premium";
  label: string;
  description: string;
  color: string;
  emoji: string;
};

export function getMarginHealth(marginPct: number): MarginHealth {
  if (marginPct < 25) {
    return {
      status: "danger",
      label: "Zona de Risco",
      description:
        "Margem perigosa! Qualquer desconto, frete grátis ou taxa de maquininha colocará esta peça no prejuízo.",
      color: "text-destructive",
      emoji: "🔴",
    };
  }
  if (marginPct < 40) {
    return {
      status: "warning",
      label: "Zona de Atenção",
      description:
        "Margem moderada. Cobre seus custos, mas deixa pouca folga para promoções e despesas fixas da loja.",
      color: "text-warning",
      emoji: "🟡",
    };
  }
  if (marginPct < 66) {
    return {
      status: "healthy",
      label: "Margem Saudável",
      description:
        "Margem ideal para moda! Paga custos fixos, dá lucro e ainda suporta liquidações de até 20% sem prejuízo.",
      color: "text-success",
      emoji: "🟢",
    };
  }
  return {
    status: "premium",
    label: "Alta Lucratividade",
    description:
      "Excelente! Margem premium para peças exclusivas ou autorais com alto valor percebido.",
    color: "text-primary",
    emoji: "💎",
  };
}

// ── Modo 1: Markup sobre o Custo (com proteção de impostos e taxas) ──────────
/**
 * P = (Custo × (1 + Markup)) / (1 - Imposto - TaxaCartão)
 * Lucro = P - Custo - P×(Imposto + TaxaCartão)
 */
export function computePricing(input: PricingInput): PricingResult {
  const realCost =
    num(input.wholesale_cost) +
    num(input.freight_cost) +
    num(input.packaging_cost) +
    num(input.other_costs);

  const taxRate = Math.min(Math.max(num(input.tax_pct), 0), 50) / 100;
  const cardRate = Math.min(Math.max(num(input.card_rate_pct ?? 0), 0), 30) / 100;
  const markup = Math.max(num(input.margin_pct), 0) / 100;
  const totalDeductionRate = taxRate + cardRate;
  const divisor = Math.max(1 - totalDeductionRate, 0.01);

  const minPrice = realCost / divisor;
  const suggestedPrice = (realCost * (1 + markup)) / divisor;
  const deductions = suggestedPrice * totalDeductionRate;
  const profit = suggestedPrice - realCost - deductions;

  return {
    realCost,
    minPrice,
    suggestedPrice,
    profit,
    marginOnPrice: suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0,
    markupOnCost: realCost > 0 ? (profit / realCost) * 100 : 0,
  };
}

// ── Modo 2: Margem Real sobre a Venda (Gross Margin) ─────────────────────────
/**
 * Calcula o preço de venda ideal para que uma % exata do faturamento bruto
 * seja lucro líquido no caixa, descontando impostos + taxas.
 *
 * FÓRMULA CORRETA:
 *   P = C / (1 - D - M)
 *   onde D = taxRate + cardRate, M = desiredMargin
 *
 * Exemplo: Custo R$ 50, Imposto 6%, Taxa cartão 4%, Margem 40%
 *   P = 50 / (1 - 0.06 - 0.04 - 0.40) = 50 / 0.50 = R$ 100,00
 *   Lucro = 100 × 0.40 = R$ 40,00 (exatamente 40%)
 */
export type MarginPricingInput = {
  wholesale_cost: number;
  freight_cost: number;
  packaging_cost: number;
  other_costs: number;
  desired_margin_pct: number; // % que o lojista quer de lucro líquido sobre a venda
  tax_pct: number;
  card_rate_pct?: number; // taxa da maquininha/meio de pagamento (opcional)
};

export type FullPricingResult = PricingResult & {
  deductions: number;          // R$ de impostos + taxas
  netRevenue: number;          // receita líquida após deduções
  marginHealth: MarginHealth;  // diagnóstico de saúde
};

export function computePricingByMargin(input: MarginPricingInput): FullPricingResult {
  const realCost =
    num(input.wholesale_cost) +
    num(input.freight_cost) +
    num(input.packaging_cost) +
    num(input.other_costs);

  const taxRate = Math.min(Math.max(num(input.tax_pct), 0), 50) / 100;
  const cardRate = Math.min(Math.max(num(input.card_rate_pct ?? 0), 0), 30) / 100;
  const desiredMargin = Math.min(Math.max(num(input.desired_margin_pct), 0), 90) / 100;

  // Divisor nunca pode ser ≤ 0
  const divisor = Math.max(1 - taxRate - cardRate - desiredMargin, 0.01);

  const suggestedPrice = realCost / divisor;
  const deductions = suggestedPrice * (taxRate + cardRate);
  const profit = suggestedPrice * desiredMargin;
  const netRevenue = suggestedPrice - deductions;
  const minPrice = realCost / Math.max(1 - taxRate - cardRate, 0.01);

  return {
    realCost,
    minPrice,
    suggestedPrice,
    profit,
    deductions,
    netRevenue,
    marginOnPrice: suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0,
    markupOnCost: realCost > 0 ? (profit / realCost) * 100 : 0,
    marginHealth: getMarginHealth(desiredMargin * 100),
  };
}

// ── Modo 3: Precificação Reversa (dado o preço, calcular margem) ──────────────
/**
 * O lojista define o preço de etiqueta (ex: R$ 89,90) e o sistema
 * faz a engenharia reversa completa de margem, markup e lucro líquido.
 */
export type ReversePricingInput = {
  wholesale_cost: number;
  freight_cost: number;
  packaging_cost: number;
  other_costs: number;
  sale_price: number;  // preço de etiqueta definido pelo lojista
  tax_pct: number;
  card_rate_pct?: number;
};

export type ReversePricingResult = {
  realCost: number;
  salePrice: number;
  deductions: number;
  profit: number;
  marginOnPrice: number;
  markupOnCost: number;
  isViable: boolean;  // se o preço cobre pelo menos o custo real
  marginHealth: MarginHealth;
};

export function computeReversePricing(input: ReversePricingInput): ReversePricingResult {
  const realCost =
    num(input.wholesale_cost) +
    num(input.freight_cost) +
    num(input.packaging_cost) +
    num(input.other_costs);

  const salePrice = Math.max(num(input.sale_price), 0);
  const taxRate = Math.min(Math.max(num(input.tax_pct), 0), 50) / 100;
  const cardRate = Math.min(Math.max(num(input.card_rate_pct ?? 0), 0), 30) / 100;

  const deductions = salePrice * (taxRate + cardRate);
  const profit = salePrice - realCost - deductions;
  const marginOnPrice = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  const markupOnCost = realCost > 0 ? (profit / realCost) * 100 : 0;

  return {
    realCost,
    salePrice,
    deductions,
    profit,
    marginOnPrice,
    markupOnCost,
    isViable: profit >= 0,
    marginHealth: getMarginHealth(marginOnPrice),
  };
}

// ── Cenários de Pagamento (Simulador de Perdas) ───────────────────────────────

export type PaymentScenario = {
  label: string;
  icon: string;
  rate: number;   // taxa total do meio de pagamento (%)
  profit: number;
  margin: number;
  netAmount: number;
  isViable: boolean;
};

export function computePaymentScenarios(
  salePrice: number,
  realCost: number,
  taxPct: number,
): PaymentScenario[] {
  const taxRate = Math.min(taxPct, 50) / 100;

  const scenarios = [
    { label: "Pix / Dinheiro", icon: "💸", rate: 0 },
    { label: "Cartão Débito (1.5%)", icon: "💳", rate: 1.5 },
    { label: "Cartão Crédito (3.3%)", icon: "💳", rate: 3.3 },
    { label: "Parcelado 3x (4.5%)", icon: "📅", rate: 4.5 },
    { label: "Parcelado 6x (6.9%)", icon: "📅", rate: 6.9 },
    { label: "10% OFF (Promoção)", icon: "🏷️", rate: 0, discountPct: 10 },
    { label: "20% OFF (Liquidação)", icon: "🔥", rate: 0, discountPct: 20 },
  ] as Array<{ label: string; icon: string; rate: number; discountPct?: number }>;

  return scenarios.map(({ label, icon, rate, discountPct }) => {
    const effectivePrice = discountPct ? salePrice * (1 - discountPct / 100) : salePrice;
    const deductions = effectivePrice * (taxRate + rate / 100);
    const profit = effectivePrice - realCost - deductions;
    const margin = effectivePrice > 0 ? (profit / effectivePrice) * 100 : 0;
    return {
      label,
      icon,
      rate: discountPct ?? rate,
      profit,
      margin,
      netAmount: effectivePrice - deductions,
      isViable: profit >= 0,
    };
  });
}

// ── Ponto de Cobertura do Lote (Sell-Through Break-Even) ─────────────────────

export type LotBreakEven = {
  totalLotCost: number;         // custo total do lote (atacado + operacionais)
  totalUnits: number;           // total de peças do lote
  avgNetPricePerUnit: number;   // preço líquido médio por peça (após impostos/taxas)
  unitsToBreakEven: number;     // quantas peças precisa vender para pagar o lote
  breakEvenPct: number;         // % do lote que precisa ser vendido
  profitOnRemainder: number;    // receita líquida pura gerada após quitar o lote
  totalLotProfit: number;       // lucro líquido final se vender 100% do lote
};

export function computeLotBreakEven(
  avgSalePrice: number,
  avgRealCost: number,
  totalUnits: number,
  taxPct: number,
  cardRatePct = 0,
): LotBreakEven {
  const taxRate = Math.min(taxPct, 50) / 100;
  const cardRate = Math.min(cardRatePct, 30) / 100;
  const totalLotCost = avgRealCost * totalUnits;
  const avgNetPricePerUnit = avgSalePrice * (1 - taxRate - cardRate);
  const unitsToBreakEven = avgNetPricePerUnit > 0
    ? Math.ceil(totalLotCost / avgNetPricePerUnit)
    : totalUnits;

  const remainingUnits = Math.max(totalUnits - unitsToBreakEven, 0);
  const profitOnRemainder = remainingUnits * avgNetPricePerUnit;
  const totalNetRevenue = totalUnits * avgNetPricePerUnit;
  const totalLotProfit = Math.max(totalNetRevenue - totalLotCost, 0);
  const breakEvenPct = totalUnits > 0 ? (unitsToBreakEven / totalUnits) * 100 : 100;

  return {
    totalLotCost,
    totalUnits,
    avgNetPricePerUnit,
    unitsToBreakEven: Math.min(unitsToBreakEven, totalUnits),
    breakEvenPct,
    profitOnRemainder,
    totalLotProfit,
  };
}


export type Transaction = {
  id: string;
  kind: "entrada" | "saida";
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  occurred_on: string;
};

export function sumBy(items: Transaction[], kind: "entrada" | "saida") {
  return items.filter((t) => t.kind === kind).reduce((acc, t) => acc + num(t.amount), 0);
}

/**
 * Categorias de saída que são DEDUÇÕES DA RECEITA BRUTA (devoluções de cliente),
 * e NÃO despesas operacionais (OPEX). Devem ser separadas no DRE.
 * Norma: CPC 00 / IFRS 15 — devoluções reduzem a receita, não aumentam o custo.
 */
export const REFUND_CATEGORIES = new Set(["estorno_devolucao"]);

/**
 * Soma saídas excluindo as categorias informadas.
 * Usado no DRE para separar OPEX de deduções de receita.
 */
export function sumByExcluding(
  items: Transaction[],
  kind: "entrada" | "saida",
  excludeCategories: Set<string>,
): number {
  return items
    .filter((t) => t.kind === kind && !excludeCategories.has(t.category))
    .reduce((acc, t) => acc + num(t.amount), 0);
}

/**
 * Soma apenas as categorias informadas (ex: só estornos de clientes).
 */
export function sumByCategories(
  items: Transaction[],
  kind: "entrada" | "saida",
  categories: Set<string>,
): number {
  return items
    .filter((t) => t.kind === kind && categories.has(t.category))
    .reduce((acc, t) => acc + num(t.amount), 0);
}

export type CreditStatus = "pago" | "a_vencer" | "vencido";

export function creditStatus(
  credit: { amount: number; paid_amount: number; due_date: string },
  todayISO: string,
): CreditStatus {
  if (num(credit.paid_amount) >= num(credit.amount) - 0.005) return "pago";
  return credit.due_date < todayISO ? "vencido" : "a_vencer";
}

export const CREDIT_STATUS_LABEL: Record<CreditStatus, string> = {
  pago: "Pago",
  a_vencer: "A vencer",
  vencido: "Vencido",
};

/** Projeção linear do faturamento até o fim do mês. */
export function projectMonth(currentRevenue: number, dayOfMonth: number, daysInMonth: number) {
  if (dayOfMonth <= 0) return currentRevenue;
  return (currentRevenue / dayOfMonth) * daysInMonth;
}

export function variation(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Formata subtexto explicativo e preciso sobre a variação vs mês anterior. */
export function formatVariationHint(current: number, previous: number): string {
  if (previous <= 0) {
    if (current > 0) return "Sem vendas no mês anterior";
    return "Sem faturamento no período";
  }
  const v = ((current - previous) / previous) * 100;
  const signal = v >= 0 ? "+" : "";
  return `${signal}${v.toFixed(1)}% vs. mês anterior`;
}

export const ENTRY_CATEGORIES = [
  { value: "venda_produto", label: "Venda de produto" },
  { value: "outro", label: "Outro" },
] as const;

export const EXIT_CATEGORIES = [
  { value: "compra_estoque", label: "Compra de estoque" },
  { value: "estorno_devolucao", label: "Estorno / Devolução de cliente" },
  { value: "perda_avaria", label: "Perda / Avaria / Prejuízo de estoque" },
  { value: "aluguel", label: "Aluguel" },
  { value: "frete", label: "Frete" },
  { value: "marketing", label: "Marketing" },
  { value: "prolabore", label: "Pró-labore" },
  { value: "outro", label: "Outro" },
] as const;

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Cartão débito" },
  { value: "credito", label: "Cartão crédito" },
  { value: "fiado", label: "Fiado" },
] as const;

export const INVENTORY_CATEGORIES = [
  { value: "vestido", label: "Vestido" },
  { value: "blusa", label: "Blusa" },
  { value: "calca", label: "Calça" },
  { value: "saia", label: "Saia" },
  { value: "conjunto", label: "Conjunto" },
  { value: "acessorio", label: "Acessório" },
  { value: "outro", label: "Outro" },
] as const;

export const SIZE_GRID = ["PP", "P", "M", "G", "GG"] as const;

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
