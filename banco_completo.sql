-- ================================================================
-- MODENZA — Script SQL COMPLETO E UNIFICADO
-- Cole este script no SQL Editor do Supabase e clique em "Run"
-- É 100% seguro rodar múltiplas vezes (idempotente - preserva dados)
-- ================================================================

-- ── 1. Função auxiliar de timestamp ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ── 2. Tabela de Perfis (`profiles`) ──────────────────────────────
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

-- Garante todas as colunas caso a tabela já existia antes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan                          TEXT NOT NULL DEFAULT 'gestao_anual',
  ADD COLUMN IF NOT EXISTS plan_renewal_date             DATE,
  ADD COLUMN IF NOT EXISTS plan_expires_at               DATE,
  ADD COLUMN IF NOT EXISTS onboarding_done               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_trial_offered_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_trial_accepted          BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS store_trial_expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_subscription_active     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_subscription_expires_at TIMESTAMPTZ;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'own profile') THEN
    CREATE POLICY "own profile" ON public.profiles
      FOR ALL TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 3. Tabela de Lojas (`stores`) — Multi-Tenancy ─────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name                      TEXT NOT NULL DEFAULT '',
  slug                      TEXT UNIQUE,
  city                      TEXT,
  phone                     TEXT,
  logo_url                  TEXT,
  plan                      TEXT NOT NULL DEFAULT 'gestao_anual',
  plan_expires_at           DATE,
  plan_renewal_date         DATE,
  onboarding_done           BOOLEAN NOT NULL DEFAULT false,
  prolabore_target          NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_trial_offered_at    TIMESTAMPTZ,
  store_trial_accepted      BOOLEAN,
  store_trial_expires_at    TIMESTAMPTZ,
  store_subscription_active BOOLEAN NOT NULL DEFAULT false,
  store_subscription_expires_at DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Auto-cria store para usuários existentes em profiles se não existir
INSERT INTO public.stores (owner_id, name, city, phone, logo_url, plan, onboarding_done, prolabore_target)
SELECT p.id, COALESCE(NULLIF(p.store_name, ''), 'Minha Loja'), p.city, p.phone, p.logo_url, COALESCE(p.plan, 'gestao_anual'), p.onboarding_done, COALESCE(p.prolabore_target, 0)
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = p.id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_owner_all') THEN
    CREATE POLICY "stores_owner_all" ON public.stores FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;


-- ── 4. Tabela de Membros de Loja (`store_members`) ───────────────
CREATE TABLE IF NOT EXISTS public.store_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID REFERENCES public.stores ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'funcionaria',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_members' AND policyname = 'store_members_owner') THEN
    CREATE POLICY "store_members_owner" ON public.store_members FOR ALL TO authenticated
      USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()) OR user_id = auth.uid())
      WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
  END IF;
END $$;


-- ── 5. Função de Permissão Multi-Tenant (`has_store_access`) ───────
CREATE OR REPLACE FUNCTION public.has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.store_members WHERE store_id = p_store_id AND user_id = auth.uid()
  );
$$;


-- ── 6. Transações (`transactions`) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID REFERENCES public.stores ON DELETE CASCADE,
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

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_store_access" ON public.transactions;
CREATE POLICY "transactions_store_access" ON public.transactions FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 7. Precificação (`pricings`) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES public.stores ON DELETE CASCADE,
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

ALTER TABLE public.pricings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricings TO authenticated;
GRANT ALL ON public.pricings TO service_role;
ALTER TABLE public.pricings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own pricings" ON public.pricings;
DROP POLICY IF EXISTS "pricings_store_access" ON public.pricings;
CREATE POLICY "pricings_store_access" ON public.pricings FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 8. Pró-labore (`prolabore_withdrawals`) ────────────────────────
CREATE TABLE IF NOT EXISTS public.prolabore_withdrawals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID REFERENCES public.stores ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  month      DATE NOT NULL,
  amount     NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prolabore_withdrawals ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prolabore_withdrawals TO authenticated;
GRANT ALL ON public.prolabore_withdrawals TO service_role;
ALTER TABLE public.prolabore_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own prolabore" ON public.prolabore_withdrawals;
DROP POLICY IF EXISTS "prolabore_store_access" ON public.prolabore_withdrawals;
CREATE POLICY "prolabore_store_access" ON public.prolabore_withdrawals FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 9. Clientes (`customers`) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID REFERENCES public.stores ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own customers" ON public.customers;
DROP POLICY IF EXISTS "customers_store_access" ON public.customers;
CREATE POLICY "customers_store_access" ON public.customers FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 10. Fiado (`credits` e `credit_payments`) ─────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES public.stores ON DELETE CASCADE,
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

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credits TO authenticated;
GRANT ALL ON public.credits TO service_role;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own credits" ON public.credits;
DROP POLICY IF EXISTS "credits_store_access" ON public.credits;
CREATE POLICY "credits_store_access" ON public.credits FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.credit_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID REFERENCES public.stores ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  credit_id  UUID NOT NULL REFERENCES public.credits ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL,
  paid_on    DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_payments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_payments TO authenticated;
GRANT ALL ON public.credit_payments TO service_role;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own credit payments" ON public.credit_payments;
DROP POLICY IF EXISTS "credit_payments_store_access" ON public.credit_payments;
CREATE POLICY "credit_payments_store_access" ON public.credit_payments FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 11. Estoque (`inventory_items`) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID REFERENCES public.stores ON DELETE CASCADE,
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

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_store_access" ON public.inventory_items;
CREATE POLICY "inventory_store_access" ON public.inventory_items FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 12. Metas (`goals`) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES public.stores ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  month         DATE NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own goals" ON public.goals;
DROP POLICY IF EXISTS "goals_store_access" ON public.goals;
CREATE POLICY "goals_store_access" ON public.goals FOR ALL TO authenticated USING (public.has_store_access(store_id) OR auth.uid() = user_id) WITH CHECK (public.has_store_access(store_id) OR auth.uid() = user_id);


-- ── 13. Trigger de Criação de Novos Usuários ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id UUID;
BEGIN
  -- Cria perfil do usuário
  INSERT INTO public.profiles (
    id, store_name, owner_name, plan, plan_expires_at, plan_renewal_date, store_trial_accepted, store_subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'store_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', NEW.raw_user_meta_data->>'full_name', ''),
    'gestao_anual',
    (now() + interval '1 year')::date,
    (now() + interval '1 year')::date,
    NULL,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    owner_name = EXCLUDED.owner_name;

  -- Cria loja associada ao usuário
  INSERT INTO public.stores (owner_id, name, plan)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'store_name', ''), 'Minha Loja'),
    'gestao_anual'
  )
  RETURNING id INTO v_store_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 14. Recarregar Cache de Esquema do PostgREST ──────────────────
NOTIFY pgrst, 'reload schema';

-- ── 15. Verificação Final das Colunas da Tabela Profiles ─────────
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
