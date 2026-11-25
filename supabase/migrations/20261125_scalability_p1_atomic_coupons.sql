-- ============================================================
-- VESTUI / MODALY — ESCALABILIDADE P1
-- Fase 2: Controle Atômico de Cupons no PostgreSQL
-- Data: 2026-11-25
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. RPC ATÔMICA DE INCREMENTO DE USO DE CUPOM
-- ─────────────────────────────────────────────────────────────
--
-- Problema resolvido:
--   Em flash sales ou tráfego concorrente, múltiplos visitantes
--   tentam usar o mesmo cupom com limite de uso (ex.: "válido para 50 pessoas").
--   No cliente (JavaScript), se 200 pessoas comprarem simultaneamente,
--   todas conseguiriam o desconto e sobrescreveriam o contador (Lost Updates).
--   Além disso, o navegador do visitante não possui o localStorage do lojista.
--
-- Solução:
--   Esta função executa dentro de uma transação travada no PostgreSQL (FOR UPDATE)
--   sobre a linha da loja (stores), inspeciona o array de cupons em metadata->'cupons',
--   valida se o cupom está ativo, dentro da validade e abaixo do limite,
--   incrementa o contador atomicamente e retorna sucesso.
--
-- Retorno:
--   { "success": true, "novo_usos": int }
--   { "success": false, "error": "motivo" }
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(
  p_store_id     uuid,
  p_coupon_code  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata       jsonb;
  v_cupons         jsonb;
  v_coupon         jsonb;
  v_idx            integer := -1;
  v_usos           integer;
  v_limite         integer;
  v_ativo          boolean;
  v_validade       text;
  v_codigo         text;
  v_hoje           text;
  i                integer;
BEGIN
  -- 1. Validação de parâmetros
  IF p_store_id IS NULL OR p_coupon_code IS NULL OR trim(p_coupon_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parâmetros inválidos');
  END IF;

  -- 2. Bloqueia exclusivamente a linha da loja (Pessimistic Locking)
  SELECT metadata INTO v_metadata
  FROM public.stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada');
  END IF;

  v_cupons := COALESCE(v_metadata->'cupons', '[]'::jsonb);
  IF jsonb_typeof(v_cupons) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum cupom cadastrado nesta loja');
  END IF;

  -- 3. Localiza o cupom por código (case-insensitive e sem espaços)
  FOR i IN 0 .. jsonb_array_length(v_cupons) - 1 LOOP
    v_coupon := v_cupons->i;
    v_codigo := v_coupon->>'codigo';
    IF lower(trim(v_codigo)) = lower(trim(p_coupon_code)) THEN
      v_idx := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_idx = -1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cupom não encontrado');
  END IF;

  -- 4. Valida se o cupom está ativo
  v_ativo := COALESCE((v_coupon->>'ativo')::boolean, true);
  IF NOT v_ativo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este cupom está inativo');
  END IF;

  -- 5. Valida data de validade (se configurada)
  v_validade := v_coupon->>'validade';
  IF v_validade IS NOT NULL AND trim(v_validade) <> '' THEN
    v_hoje := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
    IF substring(v_validade from 1 for 10) < v_hoje THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este cupom expirou');
    END IF;
  END IF;

  -- 6. Valida limite de usos
  v_usos := COALESCE((v_coupon->>'usos')::integer, 0);
  v_limite := (v_coupon->>'limite')::integer;

  IF v_limite IS NOT NULL AND v_limite > 0 AND v_usos >= v_limite THEN
    RETURN jsonb_build_object('success', false, 'error', 'Limite de uso deste cupom já foi atingido');
  END IF;

  -- 7. Incrementa o contador de usos atomicamente
  v_coupon := jsonb_set(v_coupon, '{usos}', to_jsonb(v_usos + 1));
  v_cupons := jsonb_set(v_cupons, ARRAY[v_idx::text], v_coupon);
  v_metadata := jsonb_set(COALESCE(v_metadata, '{}'::jsonb), '{cupons}', v_cupons);

  UPDATE public.stores
  SET
    metadata = v_metadata,
    updated_at = now()
  WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'codigo', v_codigo,
    'novo_usos', v_usos + 1
  );
END;
$$;

-- Permissões: visitantes anônimos (checkout) e lojistas autenticados podem acionar
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid, text)
  TO anon, authenticated;
