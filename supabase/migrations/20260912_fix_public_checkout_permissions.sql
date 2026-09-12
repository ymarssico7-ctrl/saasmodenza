-- ============================================================
-- VESTUI — Permissões Públicas para Checkout Anônimo (vitrine)
-- Fix: RLS estava bloqueando visitantes anônimos de ler a loja
-- e inserir pedidos, causando falha silenciosa no checkout.
-- Data: 2026-09-12
-- ============================================================

-- ─── 1. Leitura pública da tabela stores via slug (anon + authenticated) ───
-- Visitantes anônimos precisam ler os dados da loja (nome, telefone,
-- cidade, metadata/vitrineSettings) para renderizar a vitrine.
GRANT SELECT ON public.stores TO anon, authenticated;

DROP POLICY IF EXISTS "stores_public_select_by_slug" ON public.stores;
CREATE POLICY "stores_public_select_by_slug"
  ON public.stores FOR SELECT
  TO anon, authenticated
  USING (slug IS NOT NULL);

-- ─── 2. Inserção de pedidos por visitantes anônimos (vitrine pública) ────────
-- A política existente "vitrine_public_insert_orders" precisa cobrir anon.
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;

-- Remove a policy antiga que pode ter sido criada apenas para authenticated
DROP POLICY IF EXISTS "vitrine_public_insert_orders" ON public.orders;

-- Recria mais abrangente: anon E authenticated podem inserir
-- desde que a loja exista (FK check via SELECT na tabela stores)
CREATE POLICY "vitrine_public_insert_orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = orders.store_id
    )
  );

-- Leitura de pedidos: apenas o dono da loja pode ler
-- (policy existente owner_select_orders já cobre isso)
-- mas garantimos o GRANT mínimo
GRANT SELECT ON public.orders TO authenticated;

-- ─── 3. Função de número sequencial acessível para anon ─────────────────────
-- Garante que anon possa chamar o RPC generate_order_number
GRANT EXECUTE ON FUNCTION public.generate_order_number(uuid) TO anon, authenticated;

-- ─── 4. Adicionar colunas de Pix e configurações de cartão em stores ─────────
-- Campos para configuração de recebimento da lojista
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pix_key       TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type  TEXT DEFAULT 'cpf',
  ADD COLUMN IF NOT EXISTS pix_name      TEXT,
  ADD COLUMN IF NOT EXISTS pix_city      TEXT;
