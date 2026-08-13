-- ============================================================
-- MODALY 2.0 — CORREÇÃO DEFINITIVA DE RLS (SEM RECURSÃO INFINITA)
-- Data: 2026-08-13
-- 
-- INSTRUÇÕES:
--   1. Acesse seu projeto no Supabase
--   2. Vá em: SQL Editor → New Query
--   3. Cole todo este conteúdo e clique em "Run"
--
-- O QUE ESTE SCRIPT FAZ:
--   - Remove todas as policies antigas (que causavam recursão)
--   - Recria policies diretas baseadas em auth.uid() = user_id
--   - Garante isolamento total por usuário (multi-tenant seguro)
--   - NÃO apaga nenhum dado existente
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: stores
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_update_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_policy" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias lojas" ON public.stores;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias lojas" ON public.stores;

CREATE POLICY "stores_select_policy"
ON public.stores FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "stores_insert_policy"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stores_update_policy"
ON public.stores FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stores_delete_policy"
ON public.stores FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: inventory_items
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_insert_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_update_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_delete_policy" ON public.inventory_items;
DROP POLICY IF EXISTS "Usuários gerenciam seu próprio estoque" ON public.inventory_items;

CREATE POLICY "inventory_select_policy"
ON public.inventory_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "inventory_insert_policy"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inventory_update_policy"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inventory_delete_policy"
ON public.inventory_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. TABELA: customers
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios clientes" ON public.customers;

CREATE POLICY "customers_select_policy"
ON public.customers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "customers_insert_policy"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_policy"
ON public.customers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_delete_policy"
ON public.customers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 4. TABELA: transactions
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias transações" ON public.transactions;

CREATE POLICY "transactions_select_policy"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_policy"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_policy"
ON public.transactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_policy"
ON public.transactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 5. TABELA: profiles
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
-- VERIFICAÇÃO (opcional): Liste as policies criadas
-- ─────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'inventory_items', 'customers', 'transactions', 'profiles')
ORDER BY tablename, cmd;
