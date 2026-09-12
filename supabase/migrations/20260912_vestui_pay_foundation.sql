-- ============================================================
-- VESTUI PAY — Fundação do Sistema de Pagamentos (Asaas)
-- Data: 2026-09-12
--
-- O QUE ESTE SCRIPT FAZ:
--   ✓ Cria tabela store_payment_accounts (subconta Asaas por loja)
--   ✓ Cria tabela store_pix_config (chave Pix isolada da query pública)
--   ✓ Adiciona colunas de gateway na tabela orders
--   ✓ RLS completo: dados financeiros NUNCA expostos anonimamente
--   ✓ Idempotente: pode ser rodado múltiplas vezes sem erro
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: store_payment_accounts
--    Subconta white-label da lojista no Asaas.
--    A lojista nunca sabe que o Asaas existe — ela vê "Vestui Pay".
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_payment_accounts (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider       text          NOT NULL DEFAULT 'asaas',
  account_id     text,         -- accountId retornado pela API do Asaas
  wallet_id      text,         -- walletId da subconta no Asaas
  api_key_ref    text,         -- Referência à API key criptografada (nunca a key em texto puro)
  webhook_token  text,         -- Token HMAC para validar webhooks recebidos do Asaas
  status         text          NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','ativa','bloqueada','rejeitada')),
  kyc_data       jsonb,        -- Dados do KYC (CPF/CNPJ, endereço, banco) — NUNCA exposto via API pública
  error_message  text,         -- Mensagem de erro do Asaas em caso de rejeição
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spa_store_id
  ON public.store_payment_accounts(store_id);

CREATE INDEX IF NOT EXISTS idx_spa_account_id
  ON public.store_payment_accounts(account_id);

-- Trigger: atualiza updated_at automaticamente
DROP TRIGGER IF EXISTS set_spa_updated_at ON public.store_payment_accounts;
CREATE TRIGGER set_spa_updated_at
  BEFORE UPDATE ON public.store_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Apenas o dono da loja vê e edita sua conta de pagamento.
-- A vitrine (anon) NUNCA acessa esta tabela diretamente.
ALTER TABLE public.store_payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spa_owner_select" ON public.store_payment_accounts;
DROP POLICY IF EXISTS "spa_owner_insert" ON public.store_payment_accounts;
DROP POLICY IF EXISTS "spa_owner_update" ON public.store_payment_accounts;

CREATE POLICY "spa_owner_select"
  ON public.store_payment_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY "spa_owner_insert"
  ON public.store_payment_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY "spa_owner_update"
  ON public.store_payment_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- Permissões de tabela (service_role usado pelas Edge Functions)
GRANT SELECT, INSERT, UPDATE ON public.store_payment_accounts TO authenticated;
GRANT ALL ON public.store_payment_accounts TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: store_pix_config
--    Chave Pix da lojista isolada em tabela privada.
--    CORRIGE o GAP de segurança: chavePix estava em stores.metadata
--    que é retornado pela query pública anônima da vitrine.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_pix_config (
  store_id       uuid          PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  chave_pix      text,         -- A chave Pix em si (CPF, CNPJ, e-mail, telefone ou aleatória)
  tipo_chave     text          NOT NULL DEFAULT 'cpf'
                   CHECK (tipo_chave IN ('cpf','cnpj','email','telefone','aleatoria')),
  titular_pix    text,         -- Nome do titular como registrado no banco
  cidade_pix     text,         -- Cidade do titular (campo merchantCity do BR Code BACEN)
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_pix_config_updated_at ON public.store_pix_config;
CREATE TRIGGER set_pix_config_updated_at
  BEFORE UPDATE ON public.store_pix_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: chave Pix NUNCA acessível por visitantes anônimos.
-- Edge Functions usam service_role key para acessar quando necessário.
ALTER TABLE public.store_pix_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pix_config_owner_select" ON public.store_pix_config;
DROP POLICY IF EXISTS "pix_config_owner_insert" ON public.store_pix_config;
DROP POLICY IF EXISTS "pix_config_owner_update" ON public.store_pix_config;

CREATE POLICY "pix_config_owner_select"
  ON public.store_pix_config FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY "pix_config_owner_insert"
  ON public.store_pix_config FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE POLICY "pix_config_owner_update"
  ON public.store_pix_config FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.store_pix_config TO authenticated;
GRANT ALL ON public.store_pix_config TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3. TABELA: orders — Novos campos de gateway
--    Adiciona rastreamento de cobrança Asaas e custódia.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gateway_charge_id  text,
  ADD COLUMN IF NOT EXISTS gateway_provider   text DEFAULT 'pix_manual',
  ADD COLUMN IF NOT EXISTS pix_expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_status      text NOT NULL DEFAULT 'na'
    CHECK (escrow_status IN ('na','retido','liberado','estornado')),
  ADD COLUMN IF NOT EXISTS platform_fee       numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_merchant_amt   numeric(12,2) NOT NULL DEFAULT 0;

-- Índice para o webhook encontrar o pedido pelo ID da cobrança rapidamente
CREATE INDEX IF NOT EXISTS idx_orders_gateway_charge_id
  ON public.orders(gateway_charge_id)
  WHERE gateway_charge_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 4. FUNÇÃO: Dedução atômica de estoque após pagamento confirmado
--    Chamada pelo webhook do Asaas quando Pix ou Cartão é confirmado.
--    Usa SECURITY DEFINER para rodar com permissões elevadas (via Edge Function).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_order_and_deduct_stock(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  record;
  v_item   jsonb;
  v_errors jsonb[] := '{}';
BEGIN
  -- Busca o pedido
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  -- Já estava confirmado — idempotente
  IF v_order.payment_status = 'pago' THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true);
  END IF;

  -- Atualiza status do pedido
  UPDATE public.orders
  SET
    payment_status = 'pago',
    status         = 'confirmado',
    updated_at     = now()
  WHERE id = p_order_id;

  -- Deduz estoque de cada item do pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    DECLARE
      v_product_id text  := v_item->>'produtoId';
      v_tamanho    text  := v_item->>'tamanho';
      v_qty        int   := (v_item->>'qtd')::int;
      v_atual      int;
    BEGIN
      SELECT COALESCE((sizes->v_tamanho)::int, 0) INTO v_atual
      FROM public.inventory_items
      WHERE id::text = v_product_id;

      IF v_atual >= v_qty THEN
        UPDATE public.inventory_items
        SET
          sizes      = jsonb_set(sizes, ARRAY[v_tamanho], to_jsonb(GREATEST(v_atual - v_qty, 0))),
          updated_at = now()
        WHERE id::text = v_product_id;
      ELSE
        -- Registra aviso mas não bloqueia a confirmação
        v_errors := array_append(v_errors,
          jsonb_build_object('product_id', v_product_id, 'tamanho', v_tamanho,
            'aviso', 'Estoque insuficiente — dedução parcial'));
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'warnings', v_errors);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_and_deduct_stock(uuid) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 5. VERIFICAÇÃO FINAL
-- ─────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('store_payment_accounts','store_pix_config','orders')
ORDER BY tablename, cmd;
