-- ============================================================
-- MODALY 2.0 — CORREÇÃO DEFINITIVA DE RLS (20260817)
-- 
-- PROBLEMA IDENTIFICADO:
--   A migração 20260813_fix_rls_recursion.sql criou policies na
--   tabela `stores` usando `auth.uid() = user_id`, mas a coluna
--   correta é `owner_id`. Isso quebrava has_store_access() e
--   causava o erro 403 em TODAS as inserções nas tabelas dependentes.
--
-- INSTRUÇÕES:
--   1. Acesse seu projeto no Supabase
--   2. Vá em: SQL Editor → New Query
--   3. Cole todo este conteúdo e clique em "Run"
--
-- ESTE SCRIPT:
--   - Corrige as policies da tabela `stores` (owner_id, não user_id)
--   - Remove policies conflitantes de versões anteriores
--   - Garante que has_store_access() funcione corretamente
--   - Recria policies corretas para transactions e todas as tabelas
--   - NÃO apaga nenhum dado existente
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Recriar função has_store_access (garantia)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.store_members WHERE store_id = p_store_id AND user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: stores  (coluna é owner_id, NÃO user_id)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Remove TODAS as policies antigas (incluindo as erradas do 20260813)
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_update_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_policy" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "stores_store_access" ON public.stores;
DROP POLICY IF EXISTS "own stores" ON public.stores;

-- Cria policies CORRETAS com owner_id
CREATE POLICY "stores_select_policy"
ON public.stores FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "stores_insert_policy"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "stores_update_policy"
ON public.stores FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "stores_delete_policy"
ON public.stores FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);


-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: transactions
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Remove TODAS as policies conflitantes de versões anteriores
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_store_access" ON public.transactions;
DROP POLICY IF EXISTS "own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias transações" ON public.transactions;

-- Cria policy unificada que aceita tanto user_id quanto store_id via has_store_access
CREATE POLICY "transactions_select_policy"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "transactions_insert_policy"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "transactions_update_policy"
ON public.transactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "transactions_delete_policy"
ON public.transactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 3. TABELA: inventory_items
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_insert_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_update_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_delete_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_store_access" ON public.inventory_items;
DROP POLICY IF EXISTS "own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Usuários gerenciam seu próprio estoque" ON public.inventory_items;

CREATE POLICY "inventory_select_policy"
ON public.inventory_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "inventory_insert_policy"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "inventory_update_policy"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "inventory_delete_policy"
ON public.inventory_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 4. TABELA: customers
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_store_access" ON public.customers;
DROP POLICY IF EXISTS "own customers" ON public.customers;
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios clientes" ON public.customers;

CREATE POLICY "customers_select_policy"
ON public.customers FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "customers_insert_policy"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "customers_update_policy"
ON public.customers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "customers_delete_policy"
ON public.customers FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 5. TABELA: credits
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credits_select_policy" ON public.credits;
DROP POLICY IF EXISTS "credits_insert_policy" ON public.credits;
DROP POLICY IF EXISTS "credits_update_policy" ON public.credits;
DROP POLICY IF EXISTS "credits_delete_policy" ON public.credits;
DROP POLICY IF EXISTS "credits_store_access" ON public.credits;
DROP POLICY IF EXISTS "own credits" ON public.credits;

CREATE POLICY "credits_select_policy"
ON public.credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credits_insert_policy"
ON public.credits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credits_update_policy"
ON public.credits FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credits_delete_policy"
ON public.credits FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 6. TABELA: credit_payments
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_payments_select_policy" ON public.credit_payments;
DROP POLICY IF EXISTS "credit_payments_insert_policy" ON public.credit_payments;
DROP POLICY IF EXISTS "credit_payments_update_policy" ON public.credit_payments;
DROP POLICY IF EXISTS "credit_payments_delete_policy" ON public.credit_payments;
DROP POLICY IF EXISTS "credit_payments_store_access" ON public.credit_payments;
DROP POLICY IF EXISTS "own credit_payments" ON public.credit_payments;

CREATE POLICY "credit_payments_select_policy"
ON public.credit_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credit_payments_insert_policy"
ON public.credit_payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credit_payments_update_policy"
ON public.credit_payments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "credit_payments_delete_policy"
ON public.credit_payments FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 7. TABELA: prolabore_withdrawals
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.prolabore_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prolabore_select_policy" ON public.prolabore_withdrawals;
DROP POLICY IF EXISTS "prolabore_insert_policy" ON public.prolabore_withdrawals;
DROP POLICY IF EXISTS "prolabore_update_policy" ON public.prolabore_withdrawals;
DROP POLICY IF EXISTS "prolabore_delete_policy" ON public.prolabore_withdrawals;
DROP POLICY IF EXISTS "prolabore_store_access" ON public.prolabore_withdrawals;

CREATE POLICY "prolabore_select_policy"
ON public.prolabore_withdrawals FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "prolabore_insert_policy"
ON public.prolabore_withdrawals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "prolabore_update_policy"
ON public.prolabore_withdrawals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "prolabore_delete_policy"
ON public.prolabore_withdrawals FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 8. TABELA: goals
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_update_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_delete_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_store_access" ON public.goals;

CREATE POLICY "goals_select_policy"
ON public.goals FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "goals_insert_policy"
ON public.goals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "goals_update_policy"
ON public.goals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "goals_delete_policy"
ON public.goals FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 9. TABELA: pricings
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.pricings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricings_select_policy" ON public.pricings;
DROP POLICY IF EXISTS "pricings_insert_policy" ON public.pricings;
DROP POLICY IF EXISTS "pricings_update_policy" ON public.pricings;
DROP POLICY IF EXISTS "pricings_delete_policy" ON public.pricings;
DROP POLICY IF EXISTS "pricings_store_access" ON public.pricings;

CREATE POLICY "pricings_select_policy"
ON public.pricings FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "pricings_insert_policy"
ON public.pricings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "pricings_update_policy"
ON public.pricings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id))
WITH CHECK (auth.uid() = user_id OR public.has_store_access(store_id));

CREATE POLICY "pricings_delete_policy"
ON public.pricings FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_store_access(store_id));


-- ─────────────────────────────────────────────────────────────
-- 10. TABELA: profiles (coluna é id, não user_id)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuários acessam seu próprio perfil" ON public.profiles;

CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL: Lista todas as policies das tabelas principais
-- ─────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'stores', 'inventory_items', 'customers', 'transactions',
    'credits', 'credit_payments', 'prolabore_withdrawals',
    'goals', 'pricings', 'profiles'
  )
ORDER BY tablename, cmd;
