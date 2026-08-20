/** Regras de negócio puras: precificação, totais e projeções. */

export type PricingInput = {
  wholesale_cost: number;
  freight_cost: number;
  packaging_cost: number;
  other_costs: number;
  margin_pct: number;
  tax_pct: number;
};

export type PricingResult = {
  realCost: number;
  minPrice: number;
  suggestedPrice: number;
  profit: number;
  /** Margem real sobre o preço de venda (Gross Margin %). Ex: 30% significa que R$0,30 de cada R$1,00 vendido é lucro. */
  marginOnPrice: number;
  /** Markup sobre o custo (%). Ex: 80% significa que o preço de venda é 80% maior que o custo total. */
  markupOnCost: number;
};

/**
 * Custo real = atacado + frete rateado + embalagem + outros.
 * Preço mínimo = custo real ajustado pelo imposto (empata).
 * Preço sugerido = custo real × (1 + markup), também ajustado pelo imposto.
 *
 * ATENÇÃO FINANCEIRA:
 *  - O slider "Margem desejada" aplica Markup sobre o custo (não Margem sobre a venda).
 *  - `marginOnPrice` devolve a Margem Bruta Real sobre o preço de venda (Gross Margin).
 *  - `markupOnCost` devolve o multiplicador de custo (ex: 80% = preço 80% acima do custo).
 *  - As duas grandezas são sempre exibidas lado a lado para transparência.
 */
export function computePricing(input: PricingInput): PricingResult {
  const realCost =
    num(input.wholesale_cost) +
    num(input.freight_cost) +
    num(input.packaging_cost) +
    num(input.other_costs);

  // Imposto máximo limitado a 95% para evitar divisão por zero:
  // se taxRate == 1, o denominador (1 - taxRate) seria 0 → Infinity.
  const taxRate = Math.min(Math.max(num(input.tax_pct), 0), 95) / 100;
  const markup = Math.max(num(input.margin_pct), 0) / 100;

  // Garante que (1 - taxRate) nunca seja zero
  const divisor = Math.max(1 - taxRate, 0.01);

  const minPrice = realCost / divisor;
  const suggestedPrice = (realCost * (1 + markup)) / divisor;
  const profit = suggestedPrice - realCost - suggestedPrice * taxRate;

  return {
    realCost,
    minPrice,
    suggestedPrice,
    profit,
    // Margem Bruta Real sobre a Venda (Gross Margin): quanto do preço final é lucro
    marginOnPrice: suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0,
    // Markup sobre o Custo: quanto o preço sobe em relação ao custo total
    markupOnCost: realCost > 0 ? (profit / realCost) * 100 : 0,
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
