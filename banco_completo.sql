-- ================================================================
-- MODENZA — Script SQL COMPLETO (apague tudo e cole este)
-- Execute no SQL Editor do Supabase → Run
-- É seguro rodar múltiplas vezes (não apaga dados existentes)
-- ================================================================

-- ── 1. Função auxiliar de timestamp ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 2. Tabela de perfis ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  store_name                    TEXT NOT NULL DEFAULT '',
  owner_name                    TEXT NOT NULL DEFAULT '',
  city                          TEXT,
  phone                         TEXT,
  logo_url                      TEXT,
  prolabore_target              NUMERIC(12,2) NOT NULL DEFAULT 0,
  plan                          TEXT NOT NULL DEFAULT 'gestao_anual',
  plan_renewal_date             DATE,
  plan_expires_at               DATE,
  onboarding_done               BOOLEAN NOT NULL DEFAULT false,
  -- Campos do sistema de planos e trial
  store_trial_offered_at        TIMESTAMPTZ,
  store_trial_accepted          BOOLEAN DEFAULT NULL,
  store_trial_expires_at        TIMESTAMPTZ,
  store_subscription_active     BOOLEAN NOT NULL DEFAULT false,
  store_subscription_expires_at TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adiciona colunas novas caso a tabela já exista (safe)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at               DATE,
  ADD COLUMN IF NOT EXISTS store_trial_offered_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_trial_accepted          BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS store_trial_expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_subscription_active     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_subscription_expires_at TIMESTAMPTZ;

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'own profile'
  ) THEN
    CREATE POLICY "own profile" ON public.profiles
      FOR ALL TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Trigger de updated_at
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Função de criação automática de perfil ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, store_name, owner_name,
    plan, plan_expires_at, plan_renewal_date,
    store_trial_accepted, store_subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'store_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', NEW.raw_user_meta_data->>'full_name', ''),
    'gestao_anual',
    (now() + interval '1 year')::date,
    (now() + interval '1 year')::date,
    NULL,   -- null = modal do trial ainda não foi mostrado
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Garante que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Transações (caixa) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('entrada','saida')),
  description    TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  category       TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  occurred_on    DATE NOT NULL DEFAULT current_date,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'own transactions') THEN
    CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS transactions_updated ON public.transactions;
CREATE TRIGGER transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON public.transactions (user_id, occurred_on DESC);

-- ── 5. Precificação ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name            TEXT NOT NULL,
  wholesale_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
  freight_cost    NUMERIC(12,2) NOT NULL DEFAULT 0,
  packaging_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_costs     NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_pct      NUMERIC(6,2) NOT NULL DEFAULT 100,
  tax_pct         NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricings TO authenticated;
GRANT ALL ON public.pricings TO service_role;
ALTER TABLE public.pricings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricings' AND policyname = 'own pricings') THEN
    CREATE POLICY "own pricings" ON public.pricings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS pricings_updated ON public.pricings;
CREATE TRIGGER pricings_updated BEFORE UPDATE ON public.pricings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. Pró-labore ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prolabore_withdrawals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  month      DATE NOT NULL,
  amount     NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prolabore_withdrawals TO authenticated;
GRANT ALL ON public.prolabore_withdrawals TO service_role;
ALTER TABLE public.prolabore_withdrawals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prolabore_withdrawals' AND policyname = 'own prolabore') THEN
    CREATE POLICY "own prolabore" ON public.prolabore_withdrawals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 7. Clientes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'own customers') THEN
    CREATE POLICY "own customers" ON public.customers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS customers_updated ON public.customers;
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 8. Fiado (créditos) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  paid_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT current_date,
  due_date      DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credits TO authenticated;
GRANT ALL ON public.credits TO service_role;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credits' AND policyname = 'own credits') THEN
    CREATE POLICY "own credits" ON public.credits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS credits_updated ON public.credits;
CREATE TRIGGER credits_updated BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.credit_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  credit_id  UUID NOT NULL REFERENCES public.credits ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL,
  paid_on    DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_payments TO authenticated;
GRANT ALL ON public.credit_payments TO service_role;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_payments' AND policyname = 'own credit payments') THEN
    CREATE POLICY "own credit payments" ON public.credit_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 9. Estoque ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'outro',
  color            TEXT,
  sizes            JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier         TEXT,
  photo_url        TEXT,
  sold_this_month  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'own inventory') THEN
    CREATE POLICY "own inventory" ON public.inventory_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS inventory_updated ON public.inventory_items;
CREATE TRIGGER inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 10. Metas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  month         DATE NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'own goals') THEN
    CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DROP TRIGGER IF EXISTS goals_updated ON public.goals;
CREATE TRIGGER goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 11. Equipe ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'funcionaria',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_members' AND policyname = 'own members') THEN
    CREATE POLICY "own members" ON public.store_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 12. Storage: bucket de imagens ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'own read store assets') THEN
    CREATE POLICY "own read store assets" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'own upload store assets') THEN
    CREATE POLICY "own upload store assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'own update store assets') THEN
    CREATE POLICY "own update store assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'own delete store assets') THEN
    CREATE POLICY "own delete store assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- ── 13. Segurança das funções ────────────────────────────────────
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ── Verificação final ────────────────────────────────────────────
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
