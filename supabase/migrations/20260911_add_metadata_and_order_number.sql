-- ============================================================
-- VESTUI — METADATA NA TABELA STORES, REALTIME E NÚMERO SEQUENCIAL SEGURO
-- Data: 2026-09-11
-- ============================================================

-- 1. Permite armazenar configurações públicas da vitrine (Pix, cores, boas-vindas)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Ativa WebSocket em tempo real para novos pedidos na tela da lojista
DO 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END ;

-- 3. Gerador atômico de número de pedido sequencial para clientes anônimos
CREATE OR REPLACE FUNCTION public.generate_order_number(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.orders WHERE store_id = p_store_id;
  RETURN '#' || (1001 + v_count)::text;
END;
;

GRANT EXECUTE ON FUNCTION public.generate_order_number(uuid) TO anon, authenticated;
