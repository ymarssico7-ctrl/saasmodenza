-- ============================================================
-- VESTUI — Permissões Públicas para Leitura do Catálogo da Vitrine Online
-- Fix: RLS de inventory_items bloqueava visitantes anônimos (clientes)
-- de visualizar os produtos da loja ativa.
-- Data: 2026-11-19
-- ============================================================

GRANT SELECT ON public.inventory_items TO anon, authenticated;

-- Permite que anon e authenticated leiam peças de estoque vinculadas a uma loja
-- pública com slug configurado (vitrine online)
DROP POLICY IF EXISTS "inventory_public_select_showcase" ON public.inventory_items;
CREATE POLICY "inventory_public_select_showcase"
  ON public.inventory_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = inventory_items.store_id
        AND stores.slug IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.owner_id = inventory_items.user_id
        AND stores.slug IS NOT NULL
    )
  );
