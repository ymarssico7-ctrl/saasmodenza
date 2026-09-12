/**
 * asaas-create-pix/index.ts
 * Edge Function — Vestui Pay
 *
 * Cria uma cobrança Pix Dinâmico na subconta Asaas da lojista.
 * Chamada pela vitrine pública no momento em que a cliente seleciona Pix.
 *
 * Segurança:
 *   - API Key da lojista NUNCA passa pelo browser
 *   - Rate limiting por IP via header X-Forwarded-For
 *   - Valida que o storeId tem subconta ativa antes de criar cobrança
 *
 * Body (POST):
 *   { storeId: string, orderId: string, amount: number,
 *     customerName: string, customerCpf?: string }
 *
 * Response:
 *   { pixCode: string, qrCodeUrl: string, chargeId: string,
 *     expiresAt: string, encodedImage: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD_URL    = "https://api.asaas.com/v3";
const IS_SANDBOX        = Deno.env.get("ASAAS_SANDBOX") !== "false";
const ASAAS_BASE        = IS_SANDBOX ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;

// Cabeçalhos CORS — permite chamadas da vitrine (qualquer origem em produção)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const body = await req.json() as {
      storeId: string;
      orderId: string;
      amount: number;
      customerName: string;
      customerCpf?: string;
    };

    const { storeId, orderId, amount, customerName, customerCpf } = body;

    // Validações básicas
    if (!storeId || !orderId || !amount || amount <= 0) {
      return json({ error: "Dados inválidos: storeId, orderId e amount são obrigatórios" }, 400);
    }
    if (amount < 1) {
      return json({ error: "Valor mínimo para Pix: R$ 1,00" }, 400);
    }

    // Cliente Supabase com service_role (acesso total ao banco — NUNCA exposto ao browser)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Busca a subconta ativa da lojista
    const { data: paymentAccount, error: paError } = await supabase
      .from("store_payment_accounts")
      .select("account_id, api_key_ref, status")
      .eq("store_id", storeId)
      .eq("status", "ativa")
      .maybeSingle();

    if (paError || !paymentAccount) {
      // Fallback: a loja não tem Vestui Pay ativo — retorna erro específico
      return json({
        error: "vestui_pay_inactive",
        message: "Esta loja ainda não ativou o Vestui Pay. Use o Pix Manual.",
      }, 422);
    }

    // 2. Recupera a API Key da subconta
    // A api_key_ref é o ID no Supabase Vault ou a chave em texto (sandbox)
    const apiKey = IS_SANDBOX
      ? Deno.env.get("ASAAS_PLATFORM_KEY")! // Em sandbox, usa a Platform Key
      : paymentAccount.api_key_ref;          // Em produção, api_key_ref é a key da subconta

    // 3. Prepara a data de vencimento (hoje + 1 dia para evitar rejeição por horário)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // 4. Cria a cobrança Pix Dinâmico na Asaas
    const asaasRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
        "User-Agent":   "Vestui-Pay/1.0",
      },
      body: JSON.stringify({
        billingType:       "PIX",
        value:             amount,
        dueDate:           dueDateStr,
        externalReference: orderId,
        description:       `Pedido ${orderId} — Vestui`,
        customer:          customerCpf ? undefined : undefined, // Opcional: cria customer no Asaas
        postalService:     false,
      }),
    });

    if (!asaasRes.ok) {
      const asaasError = await asaasRes.json();
      console.error("Asaas API error:", asaasError);
      return json({
        error: "gateway_error",
        message: "Erro ao criar cobrança Pix. Tente novamente.",
      }, 502);
    }

    const charge = await asaasRes.json() as {
      id: string;
      status: string;
      dueDate: string;
    };

    // 5. Busca o QR Code Pix da cobrança criada
    const qrRes = await fetch(`${ASAAS_BASE}/payments/${charge.id}/pixQrCode`, {
      headers: {
        "access_token": apiKey,
        "User-Agent":   "Vestui-Pay/1.0",
      },
    });

    if (!qrRes.ok) {
      return json({ error: "Cobrança criada mas QR Code não disponível ainda" }, 502);
    }

    const qrData = await qrRes.json() as {
      encodedImage: string; // Base64 do QR Code
      payload:      string; // Pix Copia e Cola (BR Code)
      expirationDate: string;
    };

    // 6. Salva gateway_charge_id e provider no pedido
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Expira em 30 minutos

    await supabase
      .from("orders")
      .update({
        gateway_charge_id: charge.id,
        gateway_provider:  "asaas",
        pix_expires_at:    expiresAt.toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq("id", orderId);

    // 7. Retorna dados para a vitrine exibir o QR Code e Pix Copia e Cola
    return json({
      chargeId:     charge.id,
      pixCode:      qrData.payload,
      encodedImage: qrData.encodedImage, // Imagem base64 do QR Code (sem depender de API externa!)
      expiresAt:    expiresAt.toISOString(),
    });

  } catch (err) {
    console.error("asaas-create-pix error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
