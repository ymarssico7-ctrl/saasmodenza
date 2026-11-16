-- ============================================================
-- VESTUI OS — Arquitetura Modular de Planos (Entitlement-Driven Platform)
-- Migration: 20261116_vestui_plan_entitlements.sql
--
-- O QUE ESTE SCRIPT FAZ:
--   ✓ Adiciona coluna plan_tier normalizada na tabela stores (fonte da verdade do tier)
--   ✓ Cria função utilitária get_store_plan_tier() para reutilização interna
--   ✓ Cria trigger check_product_quota_before_insert() com BVA (Boundary Value Analysis)
--   ✓ Cria trigger check_batch_quota_before_insert() para cota mensal de lotes
--   ✓ Idempotente: pode ser rodado múltiplas vezes sem erro
--
-- TIERS:
--   free  → Plano Gratuito (R$ 0):    max 15 produtos, max 3 lotes/mês
--   pro   → Vestui Pro (R$ 19,90):    max 60 produtos, lotes ilimitados
--   store → Vestui Store (R$ 97,00):  produtos e lotes ilimitados
--
-- LEGADO: valores "lote" e "vestui_lote" são alias de "pro"
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. NORMALIZAÇÃO DO PLAN_TIER NA TABELA STORES
--    Garante que a coluna aceite apenas valores canônicos.
-- ─────────────────────────────────────────────────────────────

-- Adiciona a coluna plan_tier se ainda não existir
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS plan_tier TEXT;

-- Adiciona constraint CHECK idempotente para valores canônicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_plan_tier_check'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_plan_tier_check
        CHECK (plan_tier IS NULL OR plan_tier IN ('free', 'pro', 'lote', 'store'));
  END IF;
END $$;

-- Migração dos valores legados: "lote" → "pro"
UPDATE public.stores
  SET plan_tier = 'pro'
  WHERE plan_tier = 'lote';


-- ─────────────────────────────────────────────────────────────
-- 2. FUNÇÃO UTILITÁRIA: get_store_plan_tier()
--    Resolve o tier canônico de uma loja a partir de múltiplas colunas.
--    Prioridade: stores.plan_tier > stores.plan > profiles.plan_tier > 'free'
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_store_plan_tier(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE -- não modifica dados, pode ser cacheada pela sessão
SECURITY DEFINER -- roda com permissões do owner, não do chamador
AS $$
DECLARE
  v_tier TEXT;
  v_plan TEXT;
BEGIN
  -- Tenta resolver pelo store diretamente
  SELECT
    COALESCE(s.plan_tier, s.plan),
    s.plan_tier
  INTO v_plan, v_tier
  FROM public.stores s
  WHERE s.id = p_store_id;

  -- Normaliza valores legados
  IF v_tier IN ('lote', 'vestui_lote') THEN
    RETURN 'pro';
  ELSIF v_tier IN ('store', 'gestao_anual', 'digital', 'completo') THEN
    RETURN 'store';
  ELSIF v_tier IN ('pro', 'vestui_pro') THEN
    RETURN 'pro';
  ELSIF v_tier = 'free' OR v_tier = 'gratuito' THEN
    RETURN 'free';
  END IF;

  -- Fallback: analisa o campo plan
  IF v_plan IN ('lote', 'vestui_lote', 'pro', 'vestui_pro') THEN
    RETURN 'pro';
  ELSIF v_plan IN ('store', 'gestao_anual', 'digital', 'completo') THEN
    RETURN 'store';
  END IF;

  -- Padrão seguro: free
  RETURN 'free';
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 3. TRIGGER: Proteção de Cota de Produtos
--    Bloqueia INSERT de produto quando a loja atingiu o limite do plano.
--    QA-01, QA-02: Garante os limites de Boundary Value Analysis.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_product_quota_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier  TEXT;
  v_count INT;
  v_limit INT;
BEGIN
  -- Resolve o tier da loja
  v_tier := public.get_store_plan_tier(NEW.store_id);

  -- Define o limite conforme o tier
  IF v_tier = 'free' THEN
    v_limit := 15;
  ELSIF v_tier = 'pro' THEN
    v_limit := 60;
  ELSE
    -- store: ilimitado — deixa passar
    RETURN NEW;
  END IF;

  -- Conta os produtos ativos existentes da loja
  SELECT COUNT(*)
  INTO v_count
  FROM public.products
  WHERE store_id = NEW.store_id;

  -- Bloqueia se atingiu o limite
  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'QUOTA_EXCEEDED: Plano % permite ate % produtos ativos. Faca upgrade para continuar.',
      v_tier, v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplica o trigger na tabela de produtos (idempotente)
DROP TRIGGER IF EXISTS trg_check_product_quota ON public.products;
CREATE TRIGGER trg_check_product_quota
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_product_quota_before_insert();


-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGER: Proteção de Cota de Lotes de Precificação
--    Bloqueia INSERT de lote quando o plano Free atingiu 3 lotes no mês.
--    QA-08: Valida limite mensal de precificação.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_batch_quota_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier  TEXT;
  v_count INT;
  v_limit INT := 3; -- limite do plano free
BEGIN
  -- Resolve o tier da loja
  v_tier := public.get_store_plan_tier(NEW.store_id);

  -- Pro e Store: ilimitados — deixa passar
  IF v_tier != 'free' THEN
    RETURN NEW;
  END IF;

  -- Conta os lotes criados no mês corrente
  SELECT COUNT(*)
  INTO v_count
  FROM public.pricings
  WHERE store_id = NEW.store_id
    AND date_trunc('month', created_at) = date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'QUOTA_EXCEEDED: Plano gratuito permite ate % lotes por mes. Faca upgrade para Vestui Pro (R$ 19,90).',
      v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplica o trigger na tabela de pricings (idempotente)
DROP TRIGGER IF EXISTS trg_check_batch_quota ON public.pricings;
CREATE TRIGGER trg_check_batch_quota
  BEFORE INSERT ON public.pricings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_batch_quota_before_insert();


-- ─────────────────────────────────────────────────────────────
-- 5. INDEX de desempenho para a contagem mensal de lotes
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pricings_store_created_at
  ON public.pricings (store_id, created_at);

CREATE INDEX IF NOT EXISTS idx_products_store_id
  ON public.products (store_id);
