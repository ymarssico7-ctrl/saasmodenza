-- ============================================================
-- Migration: Multi-Tenant Architecture (stores + RLS upgrade)
-- Modaly 2.0 — 2026-08-11
-- ============================================================

-- -------------------------------------------------------
-- STEP 1: Create the `stores` table (the Tenant root)
-- Every business that signs up owns exactly one store.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name                      TEXT NOT NULL DEFAULT '',
  slug                      TEXT UNIQUE,
  city                      TEXT,
  phone                     TEXT,
  logo_url                  TEXT,
  plan                      TEXT NOT NULL DEFAULT 'gestao_mensal',
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

-- Owner can see and edit their own store
CREATE POLICY "stores_owner_all" ON public.stores
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Members can read the store (SELECT only) via store_members
CREATE POLICY "stores_member_read" ON public.stores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = stores.id AND sm.user_id = auth.uid()
    )
  );

CREATE TRIGGER stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -------------------------------------------------------
-- STEP 2: Auto-create a store for every existing user
-- -------------------------------------------------------
INSERT INTO public.stores (owner_id, name, city, phone, logo_url,
  plan, plan_renewal_date, onboarding_done, prolabore_target,
  store_subscription_active)
SELECT
  p.id,
  COALESCE(NULLIF(p.store_name, ''), 'Minha Loja'),
  p.city,
  p.phone,
  p.logo_url,
  COALESCE(p.plan, 'gestao_mensal'),
  p.plan_renewal_date,
  p.onboarding_done,
  COALESCE(p.prolabore_target, 0),
  false
FROM public.profiles p;


-- -------------------------------------------------------
-- STEP 3: Refactor `store_members` as a true junction table
-- Add store_id and a proper user_id FK to auth.users.
-- -------------------------------------------------------
ALTER TABLE public.store_members
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

-- Back-fill store_id from the stores table using owner_id = user_id
UPDATE public.store_members sm
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = sm.user_id AND sm.store_id IS NULL;

-- Make store_id non-nullable now that it is filled
ALTER TABLE public.store_members ALTER COLUMN store_id SET NOT NULL;

-- Drop old policies and recreate with store-scoped rules
DROP POLICY IF EXISTS "own members" ON public.store_members;

CREATE POLICY "store_members_owner" ON public.store_members
  FOR ALL TO authenticated
  USING  (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));


-- -------------------------------------------------------
-- STEP 4: Authorisation helper function
-- Returns true if auth.uid() belongs to a given store
-- (either as owner or as an active member).
-- STABLE so the query-planner can cache within a txn.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = p_store_id AND user_id = auth.uid()
  );
$$;


-- -------------------------------------------------------
-- STEP 5: Add store_id to all resource tables
-- -------------------------------------------------------

-- 5a. transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.transactions t
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = t.user_id AND t.store_id IS NULL;

ALTER TABLE public.transactions ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_store_date_idx
  ON public.transactions (store_id, occurred_on DESC);

DROP POLICY IF EXISTS "own transactions" ON public.transactions;
CREATE POLICY "transactions_store_access" ON public.transactions
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5b. inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.inventory_items i
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = i.user_id AND i.store_id IS NULL;

ALTER TABLE public.inventory_items ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_store_idx
  ON public.inventory_items (store_id);

DROP POLICY IF EXISTS "own inventory" ON public.inventory_items;
CREATE POLICY "inventory_store_access" ON public.inventory_items
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5c. pricings
ALTER TABLE public.pricings
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.pricings p
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = p.user_id AND p.store_id IS NULL;

ALTER TABLE public.pricings ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own pricings" ON public.pricings;
CREATE POLICY "pricings_store_access" ON public.pricings
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5d. customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.customers c
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = c.user_id AND c.store_id IS NULL;

ALTER TABLE public.customers ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own customers" ON public.customers;
CREATE POLICY "customers_store_access" ON public.customers
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5e. credits
ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.credits c
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = c.user_id AND c.store_id IS NULL;

ALTER TABLE public.credits ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own credits" ON public.credits;
CREATE POLICY "credits_store_access" ON public.credits
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5f. credit_payments
ALTER TABLE public.credit_payments
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.credit_payments cp
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = cp.user_id AND cp.store_id IS NULL;

ALTER TABLE public.credit_payments ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own credit payments" ON public.credit_payments;
CREATE POLICY "credit_payments_store_access" ON public.credit_payments
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5g. prolabore_withdrawals
ALTER TABLE public.prolabore_withdrawals
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.prolabore_withdrawals pw
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = pw.user_id AND pw.store_id IS NULL;

ALTER TABLE public.prolabore_withdrawals ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own prolabore" ON public.prolabore_withdrawals;
CREATE POLICY "prolabore_store_access" ON public.prolabore_withdrawals
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- 5h. goals
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores ON DELETE CASCADE;

UPDATE public.goals g
SET store_id = s.id
FROM public.stores s
WHERE s.owner_id = g.user_id AND g.store_id IS NULL;

ALTER TABLE public.goals ALTER COLUMN store_id SET NOT NULL;

DROP POLICY IF EXISTS "own goals" ON public.goals;
CREATE POLICY "goals_store_access" ON public.goals
  FOR ALL TO authenticated
  USING  (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));


-- -------------------------------------------------------
-- STEP 6: Update handle_new_user trigger — also creates
--         a store row on every new auth sign-up.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Upsert profile row (backward compat)
  INSERT INTO public.profiles (id, store_name, owner_name, plan_renewal_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'store_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', NEW.raw_user_meta_data->>'full_name', ''),
    (now() + interval '30 days')::date
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create a store owned by this new user
  INSERT INTO public.stores (owner_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'store_name', 'Minha Loja')
  );

  RETURN NEW;
END;
$$;
