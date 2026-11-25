-- ============================================================
-- VESTUI / MODALY — ESCALABILIDADE P0
-- Fase 1: Atômica de Estoque, Índices e Blindagem de PII
-- Data: 2026-11-25
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ÍNDICES DE ALTA PERFORMANCE (Multi-Tenant)
-- ─────────────────────────────────────────────────────────────

-- 1a. Busca por slug da loja (rota pública /vitrine/$slug)
--     Sem este índice cada acesso faz Seq Scan na tabela inteira.
CREATE INDEX IF NOT EXISTS idx_stores_slug
  ON public.stores USING btree (slug)
  WHERE slug IS NOT NULL;

-- 1b. Produtos por lojista ordenados por data de criação
--     Necessário para a query:
--     .from("inventory_items").select("*").eq("user_id", ?).order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_inventory_user_created
  ON public.inventory_items USING btree (user_id, created_at DESC);

-- 1c. Pedidos por loja ordenados por data (painel da lojista e Realtime)
CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON public.orders USING btree (store_id, created_at DESC);

-- 1d. Pagamentos por número de pedido (reconciliação de webhook Asaas)
CREATE INDEX IF NOT EXISTS idx_orders_numero_store
  ON public.orders USING btree (store_id, numero);

-- 1e. Busca por proprietário da loja (RLS multi-tenant e StoreContext resolver)
CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON public.stores USING btree (owner_id);

-- ─────────────────────────────────────────────────────────────
-- 2. RPC ATÔMICA DE BAIXA DE ESTOQUE (Anti-Overselling)
-- ─────────────────────────────────────────────────────────────
--
-- Substitui o padrão client-side Read-Modify-Write em adjustInventoryStock.
-- Usa FOR UPDATE (Pessimistic Lock) para garantir que apenas uma transação
-- por vez altere o estoque de um produto específico — eliminando race conditions.
--
-- Parâmetros:
--   p_product_id  UUID do inventory_item
--   p_size        Nome do tamanho (ex.: "M", "GG", "Único")
--   p_quantity    Quantidade a subtrair (valor positivo)
--
-- Retorno:
--   TRUE  → Estoque decrementado com sucesso
--   FALSE → Estoque insuficiente (cliente deve receber mensagem de erro)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_stock_atomic(
  p_product_id  uuid,
  p_size        text,
  p_quantity    integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sizes         jsonb;
  v_current_stock integer;
  v_matched_key   text;
BEGIN
  -- Valida parâmetros de entrada
  IF p_product_id IS NULL OR p_quantity <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Bloqueia a linha de forma exclusiva durante a transação.
  -- Qualquer outra chamada concorrente aguardará este COMMIT/ROLLBACK
  -- antes de prosseguir — eliminando Lost Updates / race conditions.
  SELECT sizes INTO v_sizes
  FROM public.inventory_items
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Encontra a chave exata no JSONB (case-insensitive) ou usa o tamanho informado
  SELECT key INTO v_matched_key
  FROM jsonb_object_keys(COALESCE(v_sizes, '{}'::jsonb)) AS key
  WHERE lower(trim(key)) = lower(trim(p_size))
  LIMIT 1;

  -- Fallback: se o tamanho não existe no JSONB, usa p_size diretamente
  IF v_matched_key IS NULL THEN
    v_matched_key := p_size;
  END IF;

  -- Lê o estoque atual do tamanho
  v_current_stock := COALESCE((v_sizes ->> v_matched_key)::integer, 0);

  -- Verifica se há estoque suficiente para a quantidade pedida
  IF v_current_stock < p_quantity THEN
    RETURN FALSE;  -- Estoque insuficiente — rejeita ANTES de cobrar o cliente
  END IF;

  -- Decrementa atomicamente dentro da mesma transação travada
  UPDATE public.inventory_items
  SET sizes = jsonb_set(
    COALESCE(sizes, '{}'::jsonb),
    ARRAY[v_matched_key],
    to_jsonb(GREATEST(v_current_stock - p_quantity, 0))
  )
  WHERE id = p_product_id;

  RETURN TRUE;
END;
$$;

-- Concede execução para usuários anônimos e autenticados
-- (Clientes da vitrine e lojistas autenticados podem chamar a RPC)
GRANT EXECUTE ON FUNCTION public.decrement_stock_atomic(uuid, text, integer)
  TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. COMENTÁRIO NO CAMPO metadata (documentação inline)
-- ─────────────────────────────────────────────────────────────
-- Esta migration não altera a estrutura do metadata.
-- Chaves seguras para leitura pública: theme, templateId,
--   showcaseConfigs, vitrineSettings (SEM chavePix), categorias,
--   descricao, capaUrl, store_subscription_active.
-- Chaves PRIVADAS (nunca expor em select público):
--   chavePix, tipoChavePix, titularPix, asaas_api_key.
COMMENT ON COLUMN public.stores.metadata IS
  'JSONB de configurações da loja. '
  'Chaves PRIVADAS (PII/segredos): chavePix, tipoChavePix, titularPix, asaas_api_key — NUNCA selecionar em queries públicas. '
  'Chaves públicas seguras: theme, templateId, showcaseConfigs, vitrineSettings (sem chavePix), categorias, descricao, capaUrl.';
