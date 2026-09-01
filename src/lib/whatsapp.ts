import type { CartItem } from "./cart";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type CupomInfo = { codigo: string; desconto: number };
type FreteInfo = { label: string; valor: number };

/**
 * Formata os itens do carrinho em uma mensagem pronta para o WhatsApp.
 * Se um cupom ou frete foi aplicado, inclui o detalhamento discriminado.
 */
export function formatWhatsAppMessage(
  storeName: string,
  items: CartItem[],
  total: number,
  cupom?: CupomInfo,
  frete?: FreteInfo,
): string {
  const linhas = items.map((item) => {
    const variante = [item.tamanho, item.cor].filter(Boolean).join(" · ");
    return `• ${item.nome}${variante ? ` (${variante})` : ""} × ${item.quantidade} — ${brl(item.preco * item.quantidade)}`;
  });

  const subtotal = items.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  // Garante que o desconto reportado nunca ultrapasse o subtotal real
  const descontoLimitado = cupom ? Math.min(cupom.desconto, subtotal) : 0;

  const linhasResumo: string[] = [];
  if (cupom || frete) {
    linhasResumo.push(``, `Subtotal: ${brl(subtotal)}`);
    if (cupom) {
      linhasResumo.push(`Desconto (${cupom.codigo}): −${brl(descontoLimitado)}`);
    }
    if (frete) {
      linhasResumo.push(`Entrega (${frete.label}): ${frete.valor === 0 ? "Grátis" : `+ ${brl(frete.valor)}`}`);
    }
  }

  const msg = [
    `Olá, ${storeName}! 👋`,
    ``,
    `Gostaria de fazer um pedido:`,
    ``,
    ...linhas,
    ...linhasResumo,
    ``,
    `━━━━━━━━━━━━━━━`,
    `*Total: ${brl(total)}*`,
    ``,
    `Aguardo o retorno sobre disponibilidade e forma de pagamento 🙏`,
  ].join("\n");

  return msg;
}

/**
 * Abre o WhatsApp com a mensagem pré-preenchida.
 * whatsapp: pode ser "(31) 99812-4477" ou "5531998124477" — normaliza automaticamente.
 */
export function openWhatsAppCheckout(
  whatsapp: string,
  storeName: string,
  items: CartItem[],
  total: number,
  cupom?: CupomInfo,
  frete?: FreteInfo,
) {
  // Remove tudo que não é número
  const digits = whatsapp.replace(/\D/g, "");
  // Se não começa com 55, assume Brasil
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const message = formatWhatsAppMessage(storeName, items, total, cupom, frete);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
