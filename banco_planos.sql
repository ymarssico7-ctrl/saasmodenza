-- ============================================================
-- VESTULI — Migração do Sistema de Planos e Controle de Acesso
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona as colunas de controle de plano na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at DATE,
  ADD COLUMN IF NOT EXISTS store_trial_offered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_trial_accepted BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS store_trial_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS store_subscription_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_subscription_expires_at TIMESTAMPTZ;

-- 2. Atualiza clientes existentes com o plano padrão
UPDATE public.profiles
  SET plan = 'gestao_anual'
  WHERE plan IS NULL OR plan = 'essencial';

-- 3. Define a data de expiração do plano anual para clientes existentes
-- (1 ano a partir de agora para quem não tem data ainda)
UPDATE public.profiles
  SET plan_expires_at = (now() + interval '1 year')::date
  WHERE plan_expires_at IS NULL;

-- 4. Atualiza a função de criação de novo usuário para incluir novos campos
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    store_name,
    owner_name,
    plan,
    plan_expires_at,
    plan_renewal_date,
    store_trial_accepted,
    store_subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'store_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', NEW.raw_user_meta_data->>'full_name', ''),
    'gestao_anual',
    (now() + interval '1 year')::date,
    (now() + interval '1 year')::date,
    NULL,   -- null = ainda não foi perguntado sobre o trial
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Verificação: deve retornar as colunas novas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'plan_expires_at',
    'store_trial_offered_at',
    'store_trial_accepted',
    'store_trial_expires_at',
    'store_subscription_active',
    'store_subscription_expires_at'
  )
ORDER BY column_name;
