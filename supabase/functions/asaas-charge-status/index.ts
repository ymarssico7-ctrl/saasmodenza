/**
 * asaas-charge-status/index.ts
 * Edge Function — Vestui Pay
 *
 * Polling de status da cobrança Pix.
 * Chamado pela vitrine a cada 4 segundos enquanto aguarda confirmação.
 *
 * Segurança:
 *   - Valida que o chargeId pertence ao storeId (cross-store protection)
 *   - Nunca expõe a API Key da lojista
 *
 * Query params: ?chargeId=xxx&storeId=yyy
 *
 * Response:
 *   { status: 'PENDING'|'RECEIVED'|'CONFIRMED'|'OVERDUE'|'CANCELLED' }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD_URL    = "https://api.asaas.com/v3";
const IS_SANDBOX        = Deno.env.get("ASAAS_SANDBOX") !== "false";
const ASAAS_BASE        = IS_SANDBOX ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const url      = new URL(req.url);
    const chargeId = url.searchParams.get("chargeId");
    const storeId  = url.searchParams.get("storeId");

    if (!chargeId || !storeId) {
      return json({ error: "chargeId e storeId são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Segurança: verifica que o chargeId pertence ao storeId informado
    //    Previne que alguém consulte cobranças de outras lojas
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, store_id")
      .eq("gateway_charge_id", chargeId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!order) {
      return json({ error: "Cobrança não encontrada para esta loja" }, 404);
    }

    // 2. Se o webhook já processou e atualizou o status no DB, retorna sem chamar a Asaas
    //    (evita chamada redundante ao gateway)
    if (order.payment_status === "pago") {
      return json({ status: "CONFIRMED", local: true });
    }
    if (order.payment_status === "cancelado") {
      return json({ status: "CANCELLED", local: true });
    }

    // 3. Busca a API Key da subconta
    const { data: paymentAccount } = await supabase
      .from("store_payment_accounts")
      .select("api_key_ref, status")
      .eq("store_id", storeId)
      .eq("status", "ativa")
      .maybeSingle();

    const apiKey = IS_SANDBOX
      ? Deno.env.get("ASAAS_PLATFORM_KEY")!
      : paymentAccount?.api_key_ref ?? Deno.env.get("ASAAS_PLATFORM_KEY")!;

    // 4. Consulta status na Asaas
    const asaasRes = await fetch(`${ASAAS_BASE}/payments/${chargeId}`, {
      headers: {
        "access_token": apiKey,
        "User-Agent":   "Vestui-Pay/1.0",
      },
    });

    if (!asaasRes.ok) {
      return json({ status: "PENDING" }); // Falha silenciosa — vitrine continua polling
    }

    const charge = await asaasRes.json() as { status: string };

    // 5. Se a Asaas já mostra RECEIVED/CONFIRMED mas o webhook ainda não chegou,
    //    atualiza o pedido diretamente (fallback de consistência)
    if (charge.status === "RECEIVED" || charge.status === "CONFIRMED") {
      await supabase.rpc("confirm_order_and_deduct_stock", { p_order_id: order.id });
    }

    return json({ status: charge.status });

  } catch (err) {
    console.error("asaas-charge-status error:", err);
    return json({ status: "PENDING" }); // Falha silenciosa
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
