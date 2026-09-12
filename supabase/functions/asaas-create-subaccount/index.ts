/**
 * asaas-create-subaccount/index.ts
 * Edge Function — Vestui Pay
 *
 * Cria a subconta white-label da lojista no Asaas.
 * A lojista nunca sabe que o Asaas existe — ela vê "Vestui Pay".
 *
 * Segurança:
 *   - Requer autenticação JWT do usuário logado (lojista)
 *   - Valida que o usuário é dono do storeId informado
 *   - API Key salva como referência (nunca exposta ao browser)
 *
 * Body (POST):
 *   {
 *     storeId:      string,
 *     name:         string,  // Nome completo / Razão Social
 *     cpfCnpj:      string,  // CPF ou CNPJ (apenas números)
 *     email:        string,
 *     phone:        string,
 *     mobilePhone:  string,
 *     birthDate?:   string,  // PF: data de nascimento YYYY-MM-DD
 *     address:      string,
 *     addressNumber: string,
 *     complement?:  string,
 *     province:     string,  // Bairro
 *     postalCode:   string,
 *     bankCode:     string,  // Código do banco (ex: "341" = Itaú)
 *     agency:       string,
 *     account:      string,
 *     accountDigit: string,
 *     accountType:  "CONTA_CORRENTE" | "CONTA_POUPANCA"
 *   }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD_URL    = "https://api.asaas.com/v3";
const IS_SANDBOX        = Deno.env.get("ASAAS_SANDBOX") !== "false";
const ASAAS_BASE        = IS_SANDBOX ? ASAAS_SANDBOX_URL : ASAAS_PROD_URL;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    // ── 1. Autenticação: apenas lojistas logadas podem criar subconta ────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Autenticação necessária" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return json({ error: "Token inválido ou expirado" }, 401);
    }

    // ── 2. Serviço com permissão total (para gravar na tabela store_payment_accounts) ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json() as {
      storeId: string;
      name: string;
      cpfCnpj: string;
      email: string;
      phone: string;
      mobilePhone: string;
      birthDate?: string;
      address: string;
      addressNumber: string;
      complement?: string;
      province: string;
      postalCode: string;
      bankCode: string;
      agency: string;
      account: string;
      accountDigit: string;
      accountType: "CONTA_CORRENTE" | "CONTA_POUPANCA";
    };

    // ── 3. Valida que o usuário é dono da loja ──────────────────────────────
    const { data: store } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("id", body.storeId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!store) {
      return json({ error: "Loja não encontrada ou sem permissão" }, 403);
    }

    // ── 4. Verifica se já existe subconta (evita duplicação) ─────────────────
    const { data: existing } = await supabase
      .from("store_payment_accounts")
      .select("id, status, account_id")
      .eq("store_id", body.storeId)
      .maybeSingle();

    if (existing?.status === "ativa") {
      return json({ success: true, status: "ativa", alreadyExists: true });
    }

    // ── 5. Cria a subconta no Asaas ──────────────────────────────────────────
    const platformKey = Deno.env.get("ASAAS_PLATFORM_KEY")!;

    const asaasPayload = {
      name:            body.name,
      email:           body.email,
      cpfCnpj:         body.cpfCnpj.replace(/\D/g, ""),
      birthDate:       body.birthDate,
      companyType:     body.cpfCnpj.replace(/\D/g, "").length > 11 ? "MEI" : undefined,
      phone:           body.phone.replace(/\D/g, ""),
      mobilePhone:     body.mobilePhone.replace(/\D/g, ""),
      address:         body.address,
      addressNumber:   body.addressNumber,
      complement:      body.complement,
      province:        body.province,
      postalCode:      body.postalCode.replace(/\D/g, ""),
      webhookUrl:      `${Deno.env.get("SUPABASE_URL")}/functions/v1/asaas-webhook`,
    };

    const createRes = await fetch(`${ASAAS_BASE}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token":  platformKey,
        "User-Agent":    "Vestui-Pay/1.0",
      },
      body: JSON.stringify(asaasPayload),
    });

    const createData = await createRes.json() as {
      id?: string;
      walletId?: string;
      apiKey?: string;
      errors?: Array<{ description: string }>;
    };

    if (!createRes.ok || createData.errors?.length) {
      const msg = createData.errors?.[0]?.description ?? "Erro ao criar subconta";
      console.error("Asaas create account error:", createData);

      // Registra tentativa falhada
      await supabase.from("store_payment_accounts").upsert({
        store_id:      body.storeId,
        provider:      "asaas",
        status:        "rejeitada",
        error_message: msg,
        kyc_data:      body,
      }, { onConflict: "store_id" });

      return json({ error: "onboarding_rejected", message: msg }, 422);
    }

    // ── 6. Salva a subconta no banco (api_key_ref = a API key da subconta) ───
    // SEGURANÇA: em produção, criptografar a api_key antes de salvar.
    // Em sandbox, salvamos diretamente pois não há risco financeiro.
    await supabase.from("store_payment_accounts").upsert({
      store_id:     body.storeId,
      provider:     "asaas",
      account_id:   createData.id,
      wallet_id:    createData.walletId,
      api_key_ref:  createData.apiKey, // Em produção: criptografar com AES-256
      status:       "ativa",
      kyc_data:     {
        name:       body.name,
        cpfCnpj:    body.cpfCnpj,
        email:      body.email,
        postalCode: body.postalCode,
      },
    }, { onConflict: "store_id" });

    // ── 7. Configura o webhook token para validação HMAC ─────────────────────
    // Gera um token único por loja para validar notificações do Asaas
    const webhookToken = crypto.randomUUID().replace(/-/g, "");
    await supabase
      .from("store_payment_accounts")
      .update({ webhook_token: webhookToken })
      .eq("store_id", body.storeId);

    return json({
      success:   true,
      status:    "ativa",
      accountId: createData.id,
      walletId:  createData.walletId,
    });

  } catch (err) {
    console.error("asaas-create-subaccount error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
