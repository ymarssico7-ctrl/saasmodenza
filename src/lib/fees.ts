/**
 * src/lib/fees.ts
 * Motor Central de Taxas e Take-Rates — Vestui Pay & Plataforma
 *
 * PREPARADO PARA O PAINEL SUPREMO DE ADMIN:
 * Centraliza a matemática de custos de provedor (banco), margem/spread da plataforma e taxa final da lojista.
 */

export interface PlatformFeeConfig {
  // Pix
  pixBaseCost: number;       // Custo no atacado do banco (ex: R$ 0,79)
  pixPlatformMarkup: number; // Margem de lucro do Vestui (ex: R$ 0,20)
  pixTotalFee: number;       // Taxa final cobrada da lojista (ex: R$ 0,99)

  // Cartão de Crédito
  creditBaseCostPercent: number;       // Custo banco (ex: 2,50%)
  creditPlatformMarkupPercent: number; // Margem Vestui (ex: 1,00%)
  creditTotalPercent: number;          // Taxa final lojista (ex: 3,50%)
}

// Configuração padrão da plataforma (pode ser sobrescrita pelo Painel Supremo)
export const DEFAULT_PLATFORM_FEES: PlatformFeeConfig = {
  pixBaseCost: 0.79,
  pixPlatformMarkup: 0.20,
  pixTotalFee: 0.99,

  creditBaseCostPercent: 0.025,
  creditPlatformMarkupPercent: 0.010,
  creditTotalPercent: 0.035,
};

/**
 * Calcula a taxa total do gateway e o valor líquido real de qualquer pedido ou transação.
 * Suporta fallback inteligente e respeita taxas já gravadas no pedido (payment_fee).
 */
export function calculateOrderNet(
  total: number,
  paymentMethod: string,
  existingFee?: number | string | null,
  config: PlatformFeeConfig = DEFAULT_PLATFORM_FEES,
): { fee: number; net: number; netAmount: number; platformMarkup: number } {
  const bruto = Math.max(0, Number(total) || 0);

  // Se o pedido já possui payment_fee explícito gravado no banco, respeita o valor histórico
  if (typeof existingFee === "number" && !isNaN(existingFee)) {
    const fee = Math.max(0, existingFee);
    const net = Math.max(0, bruto - fee);
    return {
      fee,
      net,
      netAmount: net,
      platformMarkup: config.pixPlatformMarkup,
    };
  }
  if (typeof existingFee === "string" && existingFee.trim() !== "" && !isNaN(Number(existingFee))) {
    const fee = Math.max(0, Number(existingFee));
    const net = Math.max(0, bruto - fee);
    return {
      fee,
      net,
      netAmount: net,
      platformMarkup: config.pixPlatformMarkup,
    };
  }

  const method = (paymentMethod || "").toLowerCase();
  if (method === "pix") {
    const fee = config.pixTotalFee;
    const net = Math.max(0, bruto - fee);
    return {
      fee,
      net,
      netAmount: net,
      platformMarkup: config.pixPlatformMarkup,
    };
  }

  if (method.includes("cart") || method.includes("credit")) {
    const fee = Number((bruto * config.creditTotalPercent).toFixed(2));
    const markup = Number((bruto * config.creditPlatformMarkupPercent).toFixed(2));
    const net = Math.max(0, bruto - fee);
    return {
      fee,
      net,
      netAmount: net,
      platformMarkup: markup,
    };
  }

  // Métodos diretos sem taxa de gateway (dinheiro físico, fiado direto, etc.)
  return { fee: 0, net: bruto, netAmount: bruto, platformMarkup: 0 };
}
