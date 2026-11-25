-- =============================================================================
-- SOPYO ENTERPRISE — FAZ 1 ACİL GÜVENLİK YAMALARI
-- 1. private.server_config üzerinde RLS etkinleştirme
-- 2. SECURITY DEFINER RPC fonksiyonlarından anon ve authenticated EXECUTE yetkilerini kaldırma
-- 3. private.assert_server_secret içinde SHA-256 sabit uzunluklu özet karşılaştırması
-- =============================================================================

ALTER TABLE private.server_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.assert_server_secret(p_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions, pg_temp
AS $$
DECLARE
  v_expected TEXT;
BEGIN
  SELECT value INTO v_expected FROM private.server_config WHERE key = 'server_secret' LIMIT 1;
  IF v_expected IS NULL
     OR v_expected = ''
     OR p_secret IS NULL
     OR p_secret = ''
     OR digest(p_secret, 'sha256') <> digest(v_expected, 'sha256') THEN
    RAISE EXCEPTION 'Unauthorized Sopyo server secret' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_server_secret(TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.sopyo_get_meta_state(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sopyo_get_products_chunk(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sopyo_save_meta_state(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sopyo_upsert_products_chunk(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sopyo_mark_missing_products_deleted(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sopyo_get_meta_state(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sopyo_get_products_chunk(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sopyo_save_meta_state(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.sopyo_upsert_products_chunk(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.sopyo_mark_missing_products_deleted(TEXT, TEXT[]) TO service_role;
