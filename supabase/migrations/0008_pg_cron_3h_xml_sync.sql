-- =============================================================================
-- SOPYO ENTERPRISE — SUPABASE PG_CRON + PG_NET 3 SAATLİK DAKİK ZAMANLAYICI
-- GitHub Actions gecikmelerini (8-14 saat) ortadan kaldırarak her 3 saatte bir
-- (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC) saniyesi saniyesine
-- /api/cron/sync uç noktasını 180 sn timeout ile güvenli şekilde tetikler.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Vercel Production sunucusunun kendi CRON_SECRET değerini private.server_config
--    tablosuna güvenli biçimde senkronize etmesini sağlayan RPC (yalnızca service_role + server_secret)
CREATE OR REPLACE FUNCTION public.sopyo_ensure_cron_config(
  p_secret TEXT,
  p_cron_secret TEXT,
  p_app_base_url TEXT DEFAULT 'https://xml-entegrasyon-orcin.vercel.app'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions, pg_temp
AS $$
BEGIN
  PERFORM private.assert_server_secret(p_secret);

  IF p_cron_secret IS NOT NULL AND length(trim(p_cron_secret)) >= 8 THEN
    INSERT INTO private.server_config (key, value, updated_at)
    VALUES ('cron_secret', trim(p_cron_secret), now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now()
      WHERE private.server_config.value IS DISTINCT FROM EXCLUDED.value;
  END IF;

  IF p_app_base_url IS NOT NULL AND trim(p_app_base_url) LIKE 'https://%' THEN
    INSERT INTO private.server_config (key, value, updated_at)
    VALUES ('app_base_url', rtrim(trim(p_app_base_url), '/'), now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now()
      WHERE private.server_config.value IS DISTINCT FROM EXCLUDED.value;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sopyo_ensure_cron_config(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sopyo_ensure_cron_config(TEXT, TEXT, TEXT) TO service_role;

-- 2. pg_cron tarafından her 3 saatte bir çağrılan iç tetikleyici fonksiyon
CREATE OR REPLACE FUNCTION private.trigger_3h_xml_sync()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, net, extensions, pg_temp
AS $$
DECLARE
  v_cron_secret TEXT;
  v_base_url TEXT;
  v_req_id BIGINT;
BEGIN
  SELECT value INTO v_cron_secret
  FROM private.server_config
  WHERE key = 'cron_secret'
  LIMIT 1;

  IF v_cron_secret IS NULL OR trim(v_cron_secret) = '' THEN
    RAISE WARNING '[sopyo pg_cron] cron_secret henüz private.server_config tablosunda tanımlı değil; tetikleme atlandı.';
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(trim(value), ''), 'https://xml-entegrasyon-orcin.vercel.app')
  INTO v_base_url
  FROM private.server_config
  WHERE key = 'app_base_url'
  LIMIT 1;

  IF v_base_url IS NULL OR v_base_url = '' THEN
    v_base_url := 'https://xml-entegrasyon-orcin.vercel.app';
  END IF;

  -- 180 saniye (180000 ms) timeout ile canlı /api/cron/sync uç noktasını tetikle
  SELECT net.http_get(
    url := rtrim(v_base_url, '/') || '/api/cron/sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || trim(v_cron_secret),
      'Accept', 'application/json',
      'User-Agent', 'Sopyo-Supabase-pg_cron/1.0'
    ),
    timeout_milliseconds := 180000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION private.trigger_3h_xml_sync() FROM PUBLIC, anon, authenticated, service_role;

-- 3. Mevcut aynı isimli cron kaydı varsa kaldır ve tam 3 saatlik (0 */3 * * *) zamanlamayı kur
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'sopyo-3h-xml-sync'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'sopyo-3h-xml-sync',
  '0 */3 * * *',
  $$SELECT private.trigger_3h_xml_sync();$$
);
