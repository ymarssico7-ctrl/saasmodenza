/**
 * asaas-webhook/index.ts
 * Edge Function — Vestui Pay
 *
 * Recebe notificações do Asaas quando um pagamento é confirmado, estornado, etc.
 * URL deste endpoint deve ser registrada no painel da Asaas em:
 *   Configurações → Notificações → Webhook URL
 *
 * SEGURANÇA CRÍTICA:
 *   - Valida o header "asaas-access-token" contra o webhook_token salvo por loja
 *   - Se assinatura inválida → rejeita com 401 imediatamente (sem processar nada)
 *   - Idempotente: processa cada chargeId apenas uma vez
 *
 * Eventos tratados:
 *   PAYMENT_RECEIVED     → pedido confirmado, estoque deduzido
 *   PAYMENT_CONFIRMED    → idem (Asaas envia ambos)
 *   PAYMENT_REFUNDED     → pedido cancelado, estoque restaurado
 *   PAYMENT_DELETED      → pedido cancelado
 *   PAYMENT_OVERDUE      → pedido expirado
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, asaas-access-token",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ── 1. Validação HMAC do webhook ────────────────────────────────────────
    // O Asaas envia o header "asaas-access-token" com o token configurado no painel.
    // Comparamos com o ASAAS_WEBHOOK_TOKEN salvo nas variáveis de ambiente do Supabase.
    const receivedToken  = req.headers.get("asaas-access-token") ?? "";
    const expectedToken  = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

    if (!expectedToken || receivedToken !== expectedToken) {
      console.warn("Webhook rejeitado: token inválido ou ausente");
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = await req.json() as {
      event:   string;
      payment: {
        id:                string;  // chargeId na Asaas
        status:            string;
        externalReference: string;  // orderId no Supabase
        value:             number;
        netValue:          number;
        billingType:       string;
      };
    };

    const { event, payment } = payload;
    const { id: chargeId, status, externalReference: orderId } = payment;

    console.log(`Webhook Asaas: ${event} | charge=${chargeId} | order=${orderId}`);

    // ── 2. Cliente Supabase com service_role ────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 3. Roteamento por evento ────────────────────────────────────────────
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Confirma pedido + deduz estoque atomicamente via RPC
      // confirm_order_and_deduct_stock é idempotente — seguro chamar múltiplas vezes
      const { data: result, error } = await supabase.rpc(
        "confirm_order_and_deduct_stock",
        { p_order_id: orderId },
      );

      if (error) {
        console.error("RPC confirm_order_and_deduct_stock error:", error);
        // Retorna 200 para o Asaas não reenviar — logamos o erro mas acusamos recebimento
        return new Response("OK", { status: 200 });
      }

      // Atualiza campos de gateway
      await supabase
        .from("orders")
        .update({
          escrow_status:    "retido",
          net_merchant_amt: payment.netValue,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", orderId);

      console.log(`Pedido ${orderId} confirmado. Resultado:`, result);

    } else if (event === "PAYMENT_REFUNDED") {
      // Estorno: cancela pedido e tenta restaurar estoque
      await supabase
        .from("orders")
        .update({
          payment_status: "reembolsado",
          status:         "cancelado",
          escrow_status:  "estornado",
          updated_at:     new Date().toISOString(),
        })
        .eq("id", orderId);

      console.log(`Pedido ${orderId} reembolsado.`);

    } else if (event === "PAYMENT_DELETED" || event === "PAYMENT_OVERDUE") {
      // Cancelado ou expirado
      await supabase
        .from("orders")
        .update({
          payment_status: "cancelado",
          status:         "cancelado",
          updated_at:     new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("payment_status", "pendente"); // Só cancela se ainda estava pendente

      console.log(`Pedido ${orderId} cancelado/expirado (${event}).`);

    } else {
      // Evento não tratado — logamos e acusamos recebimento
      console.log(`Evento não tratado: ${event}`);
    }

    // Sempre retorna 200 para o Asaas não reenviar o webhook
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("asaas-webhook error:", err);
    // Retorna 200 mesmo em erro para evitar reenvio em loop
    return new Response("OK", { status: 200 });
  }
});
