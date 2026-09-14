/**
 * asaas-get-balance/index.ts
 * Edge Function — Vestui Pay
 *
 * Consulta o saldo bancário real e valores em liquidação da subconta Asaas.
 * Chamada pelo Dashboard de Recebimentos da lojista autenticada.
 *
 * Segurança:
 *   - Exige Bearer JWT de usuário autenticado
 *   - Valida que o usuário é dono da loja (ownership check)
 *   - A chave de API da subconta nunca é exposta ao frontend
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD_URL    = "https://api.asaas.com/v3";
const IS_SANDBOX        = Deno.env.get("ASAAS_SANDBOX") !== "false";
const ASAAS_BASE        = IS_SANDBOX ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autorizado: token JWT ausente" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Cliente Supabase autenticado no contexto do usuário
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sessão inválida ou expirada" }, 401);
    }

    // Obter storeId da URL ou body
    const url = new URL(req.url);
    let storeId = url.searchParams.get("storeId");
    if (!storeId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      storeId = body.storeId;
    }

    if (!storeId) {
      return json({ error: "storeId é obrigatório" }, 400);
    }

    // Cliente Service Role para verificações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Valida que o usuário é o dono da loja
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError || !store || store.owner_id !== user.id) {
      return json({ error: "Acesso negado: loja não pertence ao usuário" }, 403);
    }

    // Busca subconta de pagamento
    const { data: paymentAccount, error: paError } = await supabaseAdmin
      .from("store_payment_accounts")
      .select("status, account_id, wallet_id, api_key_ref, kyc_data, created_at")
      .eq("store_id", storeId)
      .maybeSingle();

    if (paError || !paymentAccount) {
      return json({
        hasAccount: false,
        status: "inativo",
        balance: 0,
        pending: 0,
      });
    }

    if (paymentAccount.status !== "ativa") {
      return json({
        hasAccount: true,
        status: paymentAccount.status,
        balance: 0,
        pending: 0,
      });
    }

    // Recupera API Key correspondente
    const apiKey = IS_SANDBOX
      ? Deno.env.get("ASAAS_PLATFORM_KEY")!
      : (paymentAccount.api_key_ref || Deno.env.get("ASAAS_PLATFORM_KEY")!);

    // Consulta Saldo Real na API do Asaas
    const balanceRes = await fetch(`${ASAAS_BASE}/finance/balance`, {
      method: "GET",
      headers: {
        "access_token": apiKey,
        "User-Agent": "Vestui-Pay/1.0",
      },
    });

    if (!balanceRes.ok) {
      const errText = await balanceRes.text();
      console.error("Erro Asaas balance:", errText);
      return json({
        hasAccount: true,
        status: paymentAccount.status,
        balance: 0,
        pending: 0,
        error: "Falha ao consultar API do Asaas",
      }, 200);
    }

    const balanceData = await balanceRes.json();

    return json({
      hasAccount: true,
      status: paymentAccount.status,
      accountId: paymentAccount.account_id,
      balance: Number(balanceData.balance || 0),
      pending: Number(balanceData.totalPending || 0),
      transferred: Number(balanceData.transferredValue || 0),
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erro interno get-balance:", errorMsg);
    return json({ error: "Erro interno no servidor", details: errorMsg }, 500);
  }
});
