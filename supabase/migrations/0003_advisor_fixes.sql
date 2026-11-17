ALTER POLICY profile_isolation_policy ON public.user_profiles
  USING (tenant_id = public.current_user_tenant_id() OR auth_uid = (SELECT auth.uid()));

REVOKE EXECUTE ON FUNCTION public.current_user_tenant_id() FROM PUBLIC, anon;

CREATE INDEX IF NOT EXISTS idx_claims_tenant ON public.claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant ON public.operation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_robot_items_tenant ON public.price_robot_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON public.product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_batches_tenant ON public.sync_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xml_sources_tenant ON public.xml_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xml_sync_reports_tenant ON public.xml_sync_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xml_sync_reports_xml_source ON public.xml_sync_reports(xml_source_id);
