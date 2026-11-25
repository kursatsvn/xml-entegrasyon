-- =============================================================================
-- SOPYO ENTERPRISE — GENEL AYARLAR (65 ALAN / 9 SEKME) JSONB DESTEĞİ
-- =============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS general_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 1. sopyo_get_meta_state güncelle: tenants objesine generalSettings ekle
CREATE OR REPLACE FUNCTION public.sopyo_get_meta_state(p_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  PERFORM private.assert_server_secret(p_secret);

  RETURN jsonb_build_object(
    'tenants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'plan', t.plan,
        'licenseExpiresAt', to_char(t.license_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'isActive', t.is_active,
        'maxXmlSources', t.max_xml_sources,
        'maxProducts', t.max_products,
        'companyPhone', t.company_phone,
        'companyEmail', t.company_email,
        'companyAddress', t.company_address,
        'companyWebsite', t.company_website,
        'defaultVatRate', t.default_vat_rate,
        'maskInvoiceProductNames', t.mask_invoice_product_names,
        'defaultMaskedProductName', t.default_masked_product_name,
        'cargoLabelTemplate', t.cargo_label_template,
        'cargoLabelShowStock', t.cargo_label_show_stock,
        'cargoLabelShowProducts', t.cargo_label_show_products,
        'cargoLabelShowPrice', t.cargo_label_show_price,
        'cargoLabelShowSku', t.cargo_label_show_sku,
        'cargoLabelFontSize', t.cargo_label_font_size::float8,
        'trendyolInvoiceNote', t.trendyol_invoice_note,
        'hepsiburadaInvoiceNote', t.hepsiburada_invoice_note,
        'generalSettings', COALESCE(t.general_settings, '{}'::jsonb),
        'createdAt', to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY t.created_at ASC) FROM public.tenants t
    ), '[]'::jsonb),

    'users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id,
        'tenantId', u.tenant_id,
        'email', u.email,
        'fullName', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'password', u.password_hash,
        'isActive', u.is_active,
        'createdAt', to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY u.created_at ASC) FROM public.user_profiles u
    ), '[]'::jsonb),

    'marketplaceAccounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'tenantId', m.tenant_id,
        'marketplace', m.marketplace,
        'storeName', m.store_name,
        'supplierOrMerchantId', m.supplier_or_merchant_id,
        'apiKey', m.api_key,
        'apiSecret', m.api_secret,
        'isActive', m.is_active,
        'autoConfirmOrders', m.auto_confirm_orders,
        'shipmentProviderId', m.shipment_provider_id,
        'shipmentProviderName', m.shipment_provider_name,
        'shipmentAddressId', m.shipment_address_id,
        'shipmentAddressText', m.shipment_address_text,
        'returningAddressId', m.returning_address_id,
        'returningAddressText', m.returning_address_text,
        'dispatchTimeHours', m.dispatch_time_hours,
        'hbOrderPullStatus', m.hb_order_pull_status,
        'stockCodeType', m.stock_code_type,
        'descriptionPrefixHtml', m.description_prefix_html,
        'descriptionSuffixHtml', m.description_suffix_html,
        'lastTestedAt', CASE WHEN m.last_tested_at IS NOT NULL THEN to_char(m.last_tested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') ELSE NULL END,
        'connectionStatus', m.connection_status
      ) ORDER BY m.created_at ASC) FROM public.marketplace_accounts m
    ), '[]'::jsonb),

    'xmlSources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', x.id,
        'tenantId', x.tenant_id,
        'xmlIdNumber', x.xml_id_number,
        'name', x.name,
        'url', x.url,
        'providerType', x.provider_type,
        'extraNotes', x.extra_notes,
        'stockCodePrefix', x.stock_code_prefix,
        'generateBarcode', x.generate_barcode,
        'disableStockSync', x.disable_stock_sync,
        'disablePriceSync', x.disable_price_sync,
        'disableNewProducts', x.disable_new_products,
        'criticalStockEnabled', x.critical_stock_enabled,
        'criticalStockAmount', x.critical_stock_amount,
        'autoPublishEnabled', x.auto_publish_enabled,
        'autoPublishChannels', x.auto_publish_channels,
        'salePriceTag', x.sale_price_tag,
        'buyingPriceTag', x.buying_price_tag,
        'marketPriceTag', x.market_price_tag,
        'taxIncludedMode', x.tax_included_mode,
        'fixedTaxRate', x.fixed_tax_rate,
        'useCurrencyConversion', x.use_currency_conversion,
        'priceRoundEnabled', x.price_round_enabled,
        'priceRoundType', x.price_round_type,
        'priceRoundWay', x.price_round_way,
        'priceRuleType', x.price_rule_type,
        'fixedPriceRule', x.fixed_price_rule,
        'dynamicPriceRules', x.dynamic_price_rules,
        'marketplacePriceRules', x.marketplace_price_rules,
        'customTagMapping', x.custom_tag_mapping,
        'totalProductCount', x.total_product_count,
        'totalVariantCount', x.total_variant_count,
        'status', x.status,
        'lastCheckedAt', to_char(COALESCE(x.last_checked_at, x.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'createdAt', to_char(x.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY x.created_at ASC) FROM public.xml_sources x WHERE x.status <> 'deleted'
    ), '[]'::jsonb),

    'xmlReports', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'tenantId', r.tenant_id,
        'xmlSourceId', r.xml_source_id,
        'xmlSourceName', r.xml_source_name,
        'sourceProductCount', r.source_product_count,
        'stockUpdatedCount', r.stock_updated_count,
        'priceUpdatedCount', r.price_updated_count,
        'newlyAddedCount', r.newly_added_count,
        'deletedCount', r.deleted_count,
        'startedAt', to_char(r.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'completedAt', to_char(r.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'itemsSummary', r.items_summary
      ) ORDER BY r.completed_at DESC) FROM public.xml_sync_reports r
    ), '[]'::jsonb),

    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'tenantId', c.tenant_id,
        'name', c.name,
        'xmlCategoryTree', c.xml_category_tree,
        'sourceName', c.source_name,
        'productCount', c.product_count,
        'trendyolCategoryId', c.trendyol_category_id,
        'trendyolCategoryName', c.trendyol_category_name,
        'trendyolStatus', c.trendyol_status,
        'trendyolAttributes', c.trendyol_attributes,
        'hepsiburadaCategoryId', c.hepsiburada_category_id,
        'hepsiburadaCategoryName', c.hepsiburada_category_name,
        'hepsiburadaStatus', c.hepsiburada_status,
        'hepsiburadaAttributes', c.hepsiburada_attributes
      ) ORDER BY c.product_count DESC, c.name ASC) FROM public.categories c
    ), '[]'::jsonb),

    'brands', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'tenantId', b.tenant_id,
        'name', b.name,
        'productCount', b.product_count,
        'trendyolBrandId', b.trendyol_brand_id,
        'trendyolBrandName', b.trendyol_brand_name,
        'hepsiburadaBrandName', b.hepsiburada_brand_name,
        'isMapped', b.is_mapped
      ) ORDER BY b.product_count DESC, b.name ASC) FROM public.brands b
    ), '[]'::jsonb),

    'variantGroups', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id,
        'tenantId', v.tenant_id,
        'name', v.name,
        'productCount', v.product_count,
        'trendyolMapped', v.trendyol_mapped,
        'hepsiburadaMapped', v.hepsiburada_mapped,
        'valuesList', v.values_list
      ) ORDER BY v.created_at ASC) FROM public.variant_groups v
    ), '[]'::jsonb),

    'tags', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tg.id,
        'tenantId', tg.tenant_id,
        'name', tg.name,
        'color', tg.color,
        'productCount', tg.product_count
      ) ORDER BY tg.created_at ASC) FROM public.tags tg
    ), '[]'::jsonb),

    'syncBatches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sb.id,
        'tenantId', sb.tenant_id,
        'batchNumber', sb.batch_number,
        'marketplace', sb.marketplace,
        'operationType', sb.operation_type,
        'remoteBatchId', sb.remote_batch_id,
        'attemptedCount', sb.attempted_count,
        'successCount', sb.success_count,
        'errorCount', sb.error_count,
        'status', sb.status,
        'createdAt', to_char(sb.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'errors', sb.errors
      ) ORDER BY sb.created_at DESC) FROM public.sync_batches sb
    ), '[]'::jsonb),

    'priceRobotItems', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'tenantId', pr.tenant_id,
        'productId', pr.product_id,
        'stockCode', pr.stock_code,
        'productTitle', pr.product_title,
        'marketplace', pr.marketplace,
        'marketplaceSkuOrUrl', pr.marketplace_sku_or_url,
        'currentPrice', pr.current_price::float8,
        'buyboxPrice', pr.buybox_price::float8,
        'minFloorPrice', pr.min_floor_price::float8,
        'maxCeilingPrice', pr.max_ceiling_price::float8,
        'stepAmount', pr.step_amount::float8,
        'buyboxRank', pr.buybox_rank,
        'competitorStore', pr.competitor_store,
        'excludedStores', pr.excluded_stores,
        'isActive', pr.is_active,
        'lastCheckedAt', to_char(pr.last_checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY pr.created_at DESC) FROM public.price_robot_items pr
    ), '[]'::jsonb),

    'orders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'tenantId', o.tenant_id,
        'orderNumber', o.order_number,
        'marketplace', o.marketplace,
        'customerName', o.customer_name,
        'customerEmail', o.customer_email,
        'customerPhone', o.customer_phone,
        'shippingAddress', o.shipping_address,
        'shippingCity', o.shipping_city,
        'shippingDistrict', o.shipping_district,
        'cargoCompany', o.cargo_company,
        'cargoTrackingNumber', o.cargo_tracking_number,
        'cargoBarcode', o.cargo_barcode,
        'totalAmount', o.total_amount::float8,
        'commissionAmount', o.commission_amount::float8,
        'shippingCost', o.shipping_cost::float8,
        'status', o.status,
        'invoiceStatus', o.invoice_status,
        'invoiceNumber', o.invoice_number,
        'labelPrinted', o.label_printed,
        'stockDeducted', o.stock_deducted,
        'crossSyncLog', o.cross_sync_log,
        'items', o.items,
        'orderDate', to_char(o.order_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY o.order_date DESC) FROM public.orders o
    ), '[]'::jsonb),

    'claims', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cl.id,
        'tenantId', cl.tenant_id,
        'claimNumber', cl.claim_number,
        'orderNumber', cl.order_number,
        'marketplace', cl.marketplace,
        'customerName', cl.customer_name,
        'productTitle', cl.product_title,
        'sku', cl.sku,
        'quantity', cl.quantity,
        'reason', cl.reason,
        'status', cl.status,
        'restockOnApprove', cl.restock_on_approve,
        'amount', cl.amount::float8,
        'claimDate', to_char(cl.claim_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY cl.claim_date DESC) FROM public.claims cl
    ), '[]'::jsonb),

    'operationLogs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ol.id,
        'tenantId', ol.tenant_id,
        'type', ol.type,
        'channel', ol.channel,
        'summary', ol.summary,
        'status', ol.status,
        'details', ol.details,
        'createdAt', to_char(ol.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY ol.created_at DESC) FROM public.operation_logs ol
    ), '[]'::jsonb)
  );
END;
$$;

-- 2. sopyo_save_meta_state güncelle: tenants tablosunda general_settings kolonunu kaydet
CREATE OR REPLACE FUNCTION public.sopyo_save_meta_state(p_secret TEXT, p_payload JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  r JSONB;
BEGIN
  PERFORM private.assert_server_secret(p_secret);

  -- Tenants
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'tenants', '[]'::jsonb)) LOOP
    INSERT INTO public.tenants (
      id, name, slug, plan, license_expires_at, is_active, max_xml_sources, max_products,
      company_phone, company_email, company_address, company_website, default_vat_rate,
      mask_invoice_product_names, default_masked_product_name, cargo_label_template,
      cargo_label_show_stock, cargo_label_show_products, cargo_label_show_price,
      cargo_label_show_sku, cargo_label_font_size, trendyol_invoice_note, hepsiburada_invoice_note,
      general_settings, created_at
    ) VALUES (
      r->>'id', r->>'name', r->>'slug', COALESCE(r->>'plan', 'professional'),
      COALESCE((r->>'licenseExpiresAt')::timestamptz, '2027-12-31T23:59:59Z'::timestamptz),
      COALESCE((r->>'isActive')::boolean, TRUE), COALESCE((r->>'maxXmlSources')::int, 10),
      COALESCE((r->>'maxProducts')::int, 50000), COALESCE(r->>'companyPhone', ''),
      COALESCE(r->>'companyEmail', ''), COALESCE(r->>'companyAddress', ''), COALESCE(r->>'companyWebsite', ''),
      COALESCE((r->>'defaultVatRate')::int, 20), COALESCE((r->>'maskInvoiceProductNames')::boolean, FALSE),
      COALESCE(r->>'defaultMaskedProductName', ''), COALESCE(r->>'cargoLabelTemplate', 'quad'),
      COALESCE((r->>'cargoLabelShowStock')::boolean, FALSE), COALESCE((r->>'cargoLabelShowProducts')::boolean, TRUE),
      COALESCE((r->>'cargoLabelShowPrice')::boolean, TRUE), COALESCE((r->>'cargoLabelShowSku')::boolean, TRUE),
      COALESCE((r->>'cargoLabelFontSize')::numeric, 7.7), COALESCE(r->>'trendyolInvoiceNote', ''),
      COALESCE(r->>'hepsiburadaInvoiceNote', ''), COALESCE(r->'generalSettings', '{}'::jsonb),
      COALESCE((r->>'createdAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan,
      license_expires_at = EXCLUDED.license_expires_at, is_active = EXCLUDED.is_active,
      max_xml_sources = EXCLUDED.max_xml_sources, max_products = EXCLUDED.max_products,
      company_phone = EXCLUDED.company_phone, company_email = EXCLUDED.company_email,
      company_address = EXCLUDED.company_address, company_website = EXCLUDED.company_website,
      default_vat_rate = EXCLUDED.default_vat_rate,
      mask_invoice_product_names = EXCLUDED.mask_invoice_product_names,
      default_masked_product_name = EXCLUDED.default_masked_product_name,
      cargo_label_template = EXCLUDED.cargo_label_template,
      cargo_label_show_stock = EXCLUDED.cargo_label_show_stock,
      cargo_label_show_products = EXCLUDED.cargo_label_show_products,
      cargo_label_show_price = EXCLUDED.cargo_label_show_price,
      cargo_label_show_sku = EXCLUDED.cargo_label_show_sku,
      cargo_label_font_size = EXCLUDED.cargo_label_font_size,
      trendyol_invoice_note = EXCLUDED.trendyol_invoice_note,
      hepsiburada_invoice_note = EXCLUDED.hepsiburada_invoice_note,
      general_settings = EXCLUDED.general_settings,
      updated_at = NOW();
  END LOOP;

  -- User Profiles
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'users', '[]'::jsonb)) LOOP
    INSERT INTO public.user_profiles (id, tenant_id, email, full_name, phone, role, password_hash, is_active, created_at)
    VALUES (
      r->>'id', r->>'tenantId', r->>'email', r->>'fullName', COALESCE(r->>'phone', ''),
      COALESCE(r->>'role', 'owner'), r->>'password', COALESCE((r->>'isActive')::boolean, TRUE),
      COALESCE((r->>'createdAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id, email = EXCLUDED.email, full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone, role = EXCLUDED.role, password_hash = COALESCE(EXCLUDED.password_hash, user_profiles.password_hash),
      is_active = EXCLUDED.is_active;
  END LOOP;

  -- Marketplace Accounts
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'marketplaceAccounts', '[]'::jsonb)) LOOP
    INSERT INTO public.marketplace_accounts (
      id, tenant_id, marketplace, store_name, supplier_or_merchant_id, api_key, api_secret,
      is_active, auto_confirm_orders, shipment_provider_id, shipment_provider_name,
      shipment_address_id, shipment_address_text, returning_address_id, returning_address_text,
      dispatch_time_hours, hb_order_pull_status, stock_code_type, description_prefix_html,
      description_suffix_html, last_tested_at, connection_status
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'marketplace', r->>'storeName', r->>'supplierOrMerchantId',
      COALESCE(r->>'apiKey', ''), COALESCE(r->>'apiSecret', ''), COALESCE((r->>'isActive')::boolean, TRUE),
      COALESCE((r->>'autoConfirmOrders')::boolean, FALSE), COALESCE(r->>'shipmentProviderId', '7'),
      COALESCE(r->>'shipmentProviderName', 'Aras Kargo Marketplace'), COALESCE(r->>'shipmentAddressId', ''),
      COALESCE(r->>'shipmentAddressText', ''), COALESCE(r->>'returningAddressId', ''),
      COALESCE(r->>'returningAddressText', ''), COALESCE((r->>'dispatchTimeHours')::int, 24),
      COALESCE(r->>'hbOrderPullStatus', 'ready_to_ship'), COALESCE(r->>'stockCodeType', 'modelCode'),
      COALESCE(r->>'descriptionPrefixHtml', ''), COALESCE(r->>'descriptionSuffixHtml', ''),
      CASE WHEN r->>'lastTestedAt' IS NOT NULL AND r->>'lastTestedAt' <> '' THEN (r->>'lastTestedAt')::timestamptz ELSE NULL END,
      COALESCE(r->>'connectionStatus', 'connected')
    )
    ON CONFLICT (tenant_id, marketplace) DO UPDATE SET
      store_name = EXCLUDED.store_name, supplier_or_merchant_id = EXCLUDED.supplier_or_merchant_id,
      api_key = EXCLUDED.api_key, api_secret = EXCLUDED.api_secret, is_active = EXCLUDED.is_active,
      auto_confirm_orders = EXCLUDED.auto_confirm_orders, shipment_provider_id = EXCLUDED.shipment_provider_id,
      shipment_provider_name = EXCLUDED.shipment_provider_name, shipment_address_id = EXCLUDED.shipment_address_id,
      shipment_address_text = EXCLUDED.shipment_address_text, returning_address_id = EXCLUDED.returning_address_id,
      returning_address_text = EXCLUDED.returning_address_text, dispatch_time_hours = EXCLUDED.dispatch_time_hours,
      hb_order_pull_status = EXCLUDED.hb_order_pull_status, stock_code_type = EXCLUDED.stock_code_type,
      description_prefix_html = EXCLUDED.description_prefix_html, description_suffix_html = EXCLUDED.description_suffix_html,
      last_tested_at = EXCLUDED.last_tested_at, connection_status = EXCLUDED.connection_status, updated_at = NOW();
  END LOOP;

  -- XML Sources
  UPDATE public.xml_sources
  SET status = 'deleted', updated_at = NOW()
  WHERE status <> 'deleted'
    AND NOT (id = ANY(ARRAY(SELECT x->>'id' FROM jsonb_array_elements(COALESCE(p_payload->'xmlSources', '[]'::jsonb)) x)));

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'xmlSources', '[]'::jsonb)) LOOP
    INSERT INTO public.xml_sources (
      id, tenant_id, xml_id_number, name, url, provider_type, extra_notes, stock_code_prefix,
      generate_barcode, disable_stock_sync, disable_price_sync, disable_new_products,
      critical_stock_enabled, critical_stock_amount, auto_publish_enabled, auto_publish_channels,
      sale_price_tag, buying_price_tag, market_price_tag, tax_included_mode, fixed_tax_rate,
      use_currency_conversion, price_round_enabled, price_round_type, price_round_way,
      price_rule_type, fixed_price_rule, dynamic_price_rules, marketplace_price_rules,
      custom_tag_mapping, total_product_count, total_variant_count, status, last_checked_at, created_at
    ) VALUES (
      r->>'id', r->>'tenantId', COALESCE((r->>'xmlIdNumber')::int, 10947), r->>'name', r->>'url',
      COALESCE(r->>'providerType', 'ticimax'), COALESCE(r->>'extraNotes', ''), COALESCE(r->>'stockCodePrefix', ''),
      COALESCE((r->>'generateBarcode')::boolean, TRUE), COALESCE((r->>'disableStockSync')::boolean, FALSE),
      COALESCE((r->>'disablePriceSync')::boolean, FALSE), COALESCE((r->>'disableNewProducts')::boolean, FALSE),
      COALESCE((r->>'criticalStockEnabled')::boolean, TRUE), COALESCE((r->>'criticalStockAmount')::int, 3),
      COALESCE((r->>'autoPublishEnabled')::boolean, TRUE), COALESCE(r->'autoPublishChannels', '[]'::jsonb),
      COALESCE(r->>'salePriceTag', 'SatisFiyati'), COALESCE(r->>'buyingPriceTag', 'SatisFiyati'),
      COALESCE(r->>'marketPriceTag', ''), COALESCE((r->>'taxIncludedMode')::int, 0),
      COALESCE((r->>'fixedTaxRate')::int, 20), COALESCE((r->>'useCurrencyConversion')::boolean, FALSE),
      COALESCE((r->>'priceRoundEnabled')::boolean, FALSE), COALESCE(r->>'priceRoundType', 'x9'),
      COALESCE(r->>'priceRoundWay', 'round'), COALESCE((r->>'priceRuleType')::int, 3),
      COALESCE(r->'fixedPriceRule', '{}'::jsonb), COALESCE(r->'dynamicPriceRules', '[]'::jsonb),
      COALESCE(r->'marketplacePriceRules', '{}'::jsonb), COALESCE(r->'customTagMapping', '{}'::jsonb),
      COALESCE((r->>'totalProductCount')::int, 0), COALESCE((r->>'totalVariantCount')::int, 0),
      COALESCE(r->>'status', 'active'), COALESCE((r->>'lastCheckedAt')::timestamptz, NOW()),
      COALESCE((r->>'createdAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, url = EXCLUDED.url, provider_type = EXCLUDED.provider_type,
      extra_notes = EXCLUDED.extra_notes, stock_code_prefix = EXCLUDED.stock_code_prefix,
      generate_barcode = EXCLUDED.generate_barcode, disable_stock_sync = EXCLUDED.disable_stock_sync,
      disable_price_sync = EXCLUDED.disable_price_sync, disable_new_products = EXCLUDED.disable_new_products,
      critical_stock_enabled = EXCLUDED.critical_stock_enabled, critical_stock_amount = EXCLUDED.critical_stock_amount,
      auto_publish_enabled = EXCLUDED.auto_publish_enabled, auto_publish_channels = EXCLUDED.auto_publish_channels,
      sale_price_tag = EXCLUDED.sale_price_tag, buying_price_tag = EXCLUDED.buying_price_tag,
      market_price_tag = EXCLUDED.market_price_tag, tax_included_mode = EXCLUDED.tax_included_mode,
      fixed_tax_rate = EXCLUDED.fixed_tax_rate, use_currency_conversion = EXCLUDED.use_currency_conversion,
      price_round_enabled = EXCLUDED.price_round_enabled, price_round_type = EXCLUDED.price_round_type,
      price_round_way = EXCLUDED.price_round_way, price_rule_type = EXCLUDED.price_rule_type,
      fixed_price_rule = EXCLUDED.fixed_price_rule, dynamic_price_rules = EXCLUDED.dynamic_price_rules,
      marketplace_price_rules = EXCLUDED.marketplace_price_rules, custom_tag_mapping = EXCLUDED.custom_tag_mapping,
      total_product_count = EXCLUDED.total_product_count, total_variant_count = EXCLUDED.total_variant_count,
      status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at, updated_at = NOW();
  END LOOP;

  -- XML Sync Reports
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'xmlReports', '[]'::jsonb)) LOOP
    INSERT INTO public.xml_sync_reports (
      id, tenant_id, xml_source_id, xml_source_name, source_product_count,
      stock_updated_count, price_updated_count, newly_added_count, deleted_count,
      items_summary, started_at, completed_at
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'xmlSourceId', COALESCE(r->>'xmlSourceName', ''),
      COALESCE((r->>'sourceProductCount')::int, 0), COALESCE((r->>'stockUpdatedCount')::int, 0),
      COALESCE((r->>'priceUpdatedCount')::int, 0), COALESCE((r->>'newlyAddedCount')::int, 0),
      COALESCE((r->>'deletedCount')::int, 0), COALESCE(r->'itemsSummary', '{}'::jsonb),
      COALESCE((r->>'startedAt')::timestamptz, NOW()), COALESCE((r->>'completedAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Categories
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'categories', '[]'::jsonb)) LOOP
    INSERT INTO public.categories (
      id, tenant_id, name, xml_category_tree, source_name, product_count,
      trendyol_category_id, trendyol_category_name, trendyol_status, trendyol_attributes,
      hepsiburada_category_id, hepsiburada_category_name, hepsiburada_status, hepsiburada_attributes
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'name', COALESCE(r->>'xmlCategoryTree', ''),
      COALESCE(r->>'sourceName', 'ariasclosetx'), COALESCE((r->>'productCount')::int, 0),
      NULLIF(r->>'trendyolCategoryId', '')::int, r->>'trendyolCategoryName',
      COALESCE(r->>'trendyolStatus', 'unmapped'), COALESCE(r->'trendyolAttributes', '[]'::jsonb),
      r->>'hepsiburadaCategoryId', r->>'hepsiburadaCategoryName',
      COALESCE(r->>'hepsiburadaStatus', 'unmapped'), COALESCE(r->'hepsiburadaAttributes', '[]'::jsonb)
    )
    ON CONFLICT (tenant_id, name) DO UPDATE SET
      xml_category_tree = EXCLUDED.xml_category_tree, product_count = EXCLUDED.product_count,
      trendyol_category_id = EXCLUDED.trendyol_category_id, trendyol_category_name = EXCLUDED.trendyol_category_name,
      trendyol_status = EXCLUDED.trendyol_status, trendyol_attributes = EXCLUDED.trendyol_attributes,
      hepsiburada_category_id = EXCLUDED.hepsiburada_category_id, hepsiburada_category_name = EXCLUDED.hepsiburada_category_name,
      hepsiburada_status = EXCLUDED.hepsiburada_status, hepsiburada_attributes = EXCLUDED.hepsiburada_attributes,
      updated_at = NOW();
  END LOOP;

  -- Brands
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'brands', '[]'::jsonb)) LOOP
    INSERT INTO public.brands (
      id, tenant_id, name, product_count, trendyol_brand_id, trendyol_brand_name, hepsiburada_brand_name, is_mapped
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'name', COALESCE((r->>'productCount')::int, 0),
      NULLIF(r->>'trendyolBrandId', '')::int, r->>'trendyolBrandName',
      r->>'hepsiburadaBrandName', COALESCE((r->>'isMapped')::boolean, FALSE)
    )
    ON CONFLICT (tenant_id, name) DO UPDATE SET
      product_count = EXCLUDED.product_count, trendyol_brand_id = EXCLUDED.trendyol_brand_id,
      trendyol_brand_name = EXCLUDED.trendyol_brand_name, hepsiburada_brand_name = EXCLUDED.hepsiburada_brand_name,
      is_mapped = EXCLUDED.is_mapped;
  END LOOP;

  -- Variant Groups
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'variantGroups', '[]'::jsonb)) LOOP
    INSERT INTO public.variant_groups (id, tenant_id, name, values_list, product_count, trendyol_mapped, hepsiburada_mapped)
    VALUES (
      r->>'id', r->>'tenantId', r->>'name', COALESCE(r->'valuesList', '[]'::jsonb),
      COALESCE((r->>'productCount')::int, 0), COALESCE((r->>'trendyolMapped')::boolean, FALSE),
      COALESCE((r->>'hepsiburadaMapped')::boolean, FALSE)
    )
    ON CONFLICT (tenant_id, name) DO UPDATE SET
      values_list = EXCLUDED.values_list, product_count = EXCLUDED.product_count,
      trendyol_mapped = EXCLUDED.trendyol_mapped, hepsiburada_mapped = EXCLUDED.hepsiburada_mapped;
  END LOOP;

  -- Tags
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'tags', '[]'::jsonb)) LOOP
    INSERT INTO public.tags (id, tenant_id, name, color, product_count)
    VALUES (
      r->>'id', r->>'tenantId', r->>'name', COALESCE(r->>'color', '#4f46e5'), COALESCE((r->>'productCount')::int, 0)
    )
    ON CONFLICT (tenant_id, name) DO UPDATE SET
      color = EXCLUDED.color, product_count = EXCLUDED.product_count;
  END LOOP;

  -- Sync Batches
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'syncBatches', '[]'::jsonb)) LOOP
    INSERT INTO public.sync_batches (
      id, tenant_id, batch_number, marketplace, operation_type, remote_batch_id,
      attempted_count, success_count, error_count, status, errors, created_at
    ) VALUES (
      r->>'id', r->>'tenantId', COALESCE((r->>'batchNumber')::int, 803255), r->>'marketplace',
      r->>'operationType', COALESCE(r->>'remoteBatchId', ''), COALESCE((r->>'attemptedCount')::int, 0),
      COALESCE((r->>'successCount')::int, 0), COALESCE((r->>'errorCount')::int, 0),
      COALESCE(r->>'status', 'completed'), COALESCE(r->'errors', '[]'::jsonb),
      COALESCE((r->>'createdAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      success_count = EXCLUDED.success_count, error_count = EXCLUDED.error_count,
      status = EXCLUDED.status, errors = EXCLUDED.errors;
  END LOOP;

  -- Price Robot Items
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'priceRobotItems', '[]'::jsonb)) LOOP
    INSERT INTO public.price_robot_items (
      id, tenant_id, product_id, stock_code, product_title, marketplace, marketplace_sku_or_url,
      current_price, buybox_price, min_floor_price, max_ceiling_price, step_amount,
      buybox_rank, competitor_store, excluded_stores, is_active, last_checked_at
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'productId', COALESCE(r->>'stockCode', ''),
      COALESCE(r->>'productTitle', ''), r->>'marketplace', r->>'marketplaceSkuOrUrl',
      COALESCE((r->>'currentPrice')::numeric, 0), COALESCE((r->>'buyboxPrice')::numeric, 0),
      COALESCE((r->>'minFloorPrice')::numeric, 0), COALESCE((r->>'maxCeilingPrice')::numeric, 0),
      COALESCE((r->>'stepAmount')::numeric, 1), COALESCE((r->>'buyboxRank')::int, 1),
      COALESCE(r->>'competitorStore', ''), COALESCE(r->'excludedStores', '[]'::jsonb),
      COALESCE((r->>'isActive')::boolean, TRUE), COALESCE((r->>'lastCheckedAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      current_price = EXCLUDED.current_price, buybox_price = EXCLUDED.buybox_price,
      buybox_rank = EXCLUDED.buybox_rank, is_active = EXCLUDED.is_active, last_checked_at = EXCLUDED.last_checked_at;
  END LOOP;

  -- Orders
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'orders', '[]'::jsonb)) LOOP
    INSERT INTO public.orders (
      id, tenant_id, order_number, marketplace, customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, shipping_district, cargo_company, cargo_tracking_number,
      cargo_barcode, total_amount, commission_amount, shipping_cost, status, invoice_status,
      invoice_number, label_printed, stock_deducted, cross_sync_log, items, order_date
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'orderNumber', r->>'marketplace', r->>'customerName',
      COALESCE(r->>'customerEmail', ''), COALESCE(r->>'customerPhone', ''), COALESCE(r->>'shippingAddress', ''),
      COALESCE(r->>'shippingCity', ''), COALESCE(r->>'shippingDistrict', ''), COALESCE(r->>'cargoCompany', 'Aras Kargo Marketplace'),
      COALESCE(r->>'cargoTrackingNumber', ''), COALESCE(r->>'cargoBarcode', ''),
      COALESCE((r->>'totalAmount')::numeric, 0), COALESCE((r->>'commissionAmount')::numeric, 0),
      COALESCE((r->>'shippingCost')::numeric, 0), COALESCE(r->>'status', 'ready_to_ship'),
      COALESCE(r->>'invoiceStatus', 'unissued'), r->>'invoiceNumber', COALESCE((r->>'labelPrinted')::boolean, FALSE),
      COALESCE((r->>'stockDeducted')::boolean, TRUE), COALESCE(r->>'crossSyncLog', ''),
      COALESCE(r->'items', '[]'::jsonb), COALESCE((r->>'orderDate')::timestamptz, NOW())
    )
    ON CONFLICT (tenant_id, marketplace, order_number) DO UPDATE SET
      status = EXCLUDED.status, invoice_status = EXCLUDED.invoice_status,
      invoice_number = EXCLUDED.invoice_number, label_printed = EXCLUDED.label_printed;
  END LOOP;

  -- Claims
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'claims', '[]'::jsonb)) LOOP
    INSERT INTO public.claims (
      id, tenant_id, claim_number, order_number, marketplace, customer_name, product_title,
      sku, quantity, reason, status, restock_on_approve, amount, claim_date
    ) VALUES (
      r->>'id', r->>'tenantId', r->>'claimNumber', r->>'orderNumber', r->>'marketplace',
      r->>'customerName', r->>'productTitle', r->>'sku', COALESCE((r->>'quantity')::int, 1),
      r->>'reason', COALESCE(r->>'status', 'pending'), COALESCE((r->>'restockOnApprove')::boolean, TRUE),
      COALESCE((r->>'amount')::numeric, 0), COALESCE((r->>'claimDate')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, restock_on_approve = EXCLUDED.restock_on_approve;
  END LOOP;

  -- Operation Logs
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'operationLogs', '[]'::jsonb)) LOOP
    INSERT INTO public.operation_logs (id, tenant_id, type, channel, summary, status, details, created_at)
    VALUES (
      r->>'id', r->>'tenantId', r->>'type', r->>'channel', r->>'summary',
      COALESCE(r->>'status', 'success'), COALESCE(r->>'details', ''),
      COALESCE((r->>'createdAt')::timestamptz, NOW())
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END;
$$;
