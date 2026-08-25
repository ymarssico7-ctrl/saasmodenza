-- ================================================================
-- VESTULI — Storefront SQL (cola no SQL Editor do Supabase → Run)
-- Adiciona campos de loja pública + tabela store_products
-- ================================================================

-- ── 1. Colunas extras no profiles para a vitrine pública ─────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_slug               TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS store_description        TEXT,
  ADD COLUMN IF NOT EXISTS store_welcome_message    TEXT,
  ADD COLUMN IF NOT EXISTS store_exchange_policy    TEXT,
  ADD COLUMN IF NOT EXISTS store_primary_color      TEXT DEFAULT '#3A3AF0',
  ADD COLUMN IF NOT EXISTS store_template           TEXT DEFAULT 'boutique',
  ADD COLUMN IF NOT EXISTS store_logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS store_banner_url         TEXT,
  ADD COLUMN IF NOT EXISTS store_whatsapp           TEXT,
  ADD COLUMN IF NOT EXISTS store_instagram          TEXT,
  ADD COLUMN IF NOT EXISTS store_city               TEXT,
  ADD COLUMN IF NOT EXISTS store_state              TEXT,
  ADD COLUMN IF NOT EXISTS store_show_stock         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_auto_publish       BOOLEAN DEFAULT true;

-- ── 2. Tabela de produtos da loja ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  descricao        TEXT,
  categoria        TEXT NOT NULL DEFAULT 'Outros',
  imagem_url       TEXT,
  preco            NUMERIC(12,2) NOT NULL,
  preco_promocional NUMERIC(12,2),
  promocao_inicio  DATE,
  promocao_fim     DATE,
  estoque          INTEGER NOT NULL DEFAULT 0,
  tamanhos         TEXT[] DEFAULT '{}',
  cores            TEXT[] DEFAULT '{}',
  ativo            BOOLEAN NOT NULL DEFAULT true,
  destaque         BOOLEAN NOT NULL DEFAULT false,
  preco_oculto     BOOLEAN NOT NULL DEFAULT false,
  vendas           INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT SELECT ON public.store_products TO anon;
GRANT ALL ON public.store_products TO service_role;

-- RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Proprietário pode tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_products' AND policyname = 'owner crud') THEN
    CREATE POLICY "owner crud" ON public.store_products
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Público pode LER produtos ativos (para a vitrine)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_products' AND policyname = 'public read active') THEN
    CREATE POLICY "public read active" ON public.store_products
      FOR SELECT TO anon, authenticated
      USING (ativo = true);
  END IF;
END $$;

-- Política pública para ler profiles (slug + config da loja)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'public read store') THEN
    CREATE POLICY "public read store" ON public.profiles
      FOR SELECT TO anon
      USING (store_slug IS NOT NULL);
  END IF;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS store_products_updated ON public.store_products;
CREATE TRIGGER store_products_updated
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
