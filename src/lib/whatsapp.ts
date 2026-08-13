import type { CartItem } from "./cart";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formata os itens do carrinho em uma mensagem pronta para o WhatsApp.
 * Remove espaços extras e garante encoding correto na URL.
 */
export function formatWhatsAppMessage(storeName: string, items: CartItem[], total: number): string {
  const linhas = items.map((item) => {
    const variante = [item.tamanho, item.cor].filter(Boolean).join(" · ");
    return `• ${item.nome}${variante ? ` (${variante})` : ""} × ${item.quantidade} — ${brl(item.preco * item.quantidade)}`;
  });

  const msg = [
    `Olá, ${storeName}! 👋`,
    ``,
    `Gostaria de fazer um pedido:`,
    ``,
    ...linhas,
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
) {
  // Remove tudo que não é número
  const digits = whatsapp.replace(/\D/g, "");
  // Se não começa com 55, assume Brasil
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const message = formatWhatsAppMessage(storeName, items, total);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
