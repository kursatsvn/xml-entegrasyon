-- =============================================================================
-- SOPYO ENTERPRISE — FAZ 3: VERİ MİMARİSİ, ŞEMA TAMAMLAMA & PERFORMANS
-- Tamamen idempotent DDL (canlı ürün/stok/fiyat verilerine dokunmaz)
-- 1. products tablosuna eksik min_price ve marketplace_descriptions sütunları
-- 2. Birleşik performans indeksleri (products, orders, operation_logs, sync_batches, xml_sync_reports)
-- 3. sopyo_get_products_chunk: SELECT * yerine açık sütun listesi + yeni alanlar
-- 4. sopyo_upsert_products_chunk: N+1 döngü ve çift varyant yazımı yerine set-tabanlı toplu upsert
-- =============================================================================

-- 1. Eksik ürün sütunları (2.8.a)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS marketplace_descriptions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Birleşik performans indeksleri (4.4)
CREATE INDEX IF NOT EXISTS idx_products_tenant_status
  ON public.products(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_products_tenant_updated
  ON public.products(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_date
  ON public.orders(tenant_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant_created
  ON public.operation_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_batches_tenant_created
  ON public.sync_batches(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xml_sync_reports_tenant_completed
  ON public.xml_sync_reports(tenant_id, completed_at DESC);

-- 3. sopyo_get_products_chunk: açık sütun listesi + minPrice & marketplaceDescriptions (4.3)
CREATE OR REPLACE FUNCTION public.sopyo_get_products_chunk(
  p_secret TEXT,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_total INT;
  v_items JSONB;
BEGIN
  PERFORM private.assert_server_secret(p_secret);

  SELECT COUNT(*) INTO v_total
  FROM public.products
  WHERE status <> 'deleted';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'tenantId', p.tenant_id,
    'xmlSourceId', p.xml_source_id,
    'sourceName', p.source_name,
    'externalId', p.external_id,
    'stockCode', p.stock_code,
    'supplierStockCode', p.supplier_stock_code,
    'barcode', p.barcode,
    'title', p.title,
    'subtitle', p.subtitle,
    'invoiceTitle', p.invoice_title,
    'descriptionHtml', p.description_html,
    'brandName', p.brand_name,
    'categoryName', p.category_name,
    'categoryTree', p.category_tree,
    'images', p.images,
    'videoUrl', p.video_url,
    'vatRate', p.vat_rate,
    'desi', p.desi::float8,
    'preparationDays', p.preparation_days,
    'warrantyMonths', p.warranty_months,
    'stockDeductionPerSale', p.stock_deduction_per_sale,
    'maxPurchaseQty', p.max_purchase_qty,
    'xmlPriceLock', p.xml_price_lock,
    'status', p.status,
    'buyingPrice', p.buying_price::float8,
    'marketPrice', p.market_price::float8,
    'salePrice', p.sale_price::float8,
    'minPrice', CASE WHEN p.min_price IS NOT NULL THEN p.min_price::float8 ELSE NULL END,
    'marketplaceDescriptions', COALESCE(p.marketplace_descriptions, '{}'::jsonb),
    'trendyolListPrice', p.trendyol_list_price::float8,
    'trendyolSalePrice', p.trendyol_sale_price::float8,
    'hepsiburadaSalePrice', p.hepsiburada_sale_price::float8,
    'totalXmlStock', p.total_xml_stock,
    'reservedOrderStock', p.reserved_order_stock,
    'netAvailableStock', p.net_available_stock,
    'trendyolSyncStatus', p.trendyol_sync_status,
    'trendyolErrorMessage', p.trendyol_error_message,
    'hepsiburadaSyncStatus', p.hepsiburada_sync_status,
    'hepsiburadaErrorMessage', p.hepsiburada_error_message,
    'tags', p.tags,
    'productUrl', p.product_url,
    'variants', p.variants_json,
    'updatedAt', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      id, tenant_id, xml_source_id, source_name, external_id, stock_code, supplier_stock_code,
      barcode, title, subtitle, invoice_title, description_html, brand_name, category_name,
      category_tree, images, video_url, vat_rate, desi, preparation_days, warranty_months,
      stock_deduction_per_sale, max_purchase_qty, xml_price_lock, status,
      buying_price, market_price, sale_price, min_price, marketplace_descriptions,
      trendyol_list_price, trendyol_sale_price, hepsiburada_sale_price,
      total_xml_stock, reserved_order_stock, net_available_stock,
      trendyol_sync_status, trendyol_error_message, hepsiburada_sync_status, hepsiburada_error_message,
      tags, product_url, variants_json, updated_at
    FROM public.products
    WHERE status <> 'deleted'
    ORDER BY id ASC
    OFFSET p_offset
    LIMIT p_limit
  ) p;

  RETURN jsonb_build_object('total', v_total, 'items', v_items);
END;
$$;

-- 4. sopyo_upsert_products_chunk: tek sorguluk set-tabanlı toplu upsert (N+1 ve çift yazım yok)
CREATE OR REPLACE FUNCTION public.sopyo_upsert_products_chunk(p_secret TEXT, p_products JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  PERFORM private.assert_server_secret(p_secret);

  WITH deduped AS (
    SELECT DISTINCT ON (elem->>'tenantId', elem->>'stockCode') elem AS p
    FROM jsonb_array_elements(COALESCE(p_products, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
    ORDER BY elem->>'tenantId', elem->>'stockCode', ord DESC
  ),
  upserted AS (
    INSERT INTO public.products (
      id, tenant_id, xml_source_id, source_name, external_id, stock_code, supplier_stock_code,
      barcode, title, subtitle, invoice_title, description_html, brand_name, category_name,
      category_tree, images, video_url, vat_rate, desi, preparation_days, warranty_months,
      stock_deduction_per_sale, max_purchase_qty, xml_price_lock, status,
      buying_price, market_price, sale_price, min_price, marketplace_descriptions,
      trendyol_list_price, trendyol_sale_price, hepsiburada_sale_price,
      total_xml_stock, reserved_order_stock, net_available_stock,
      trendyol_sync_status, trendyol_error_message, hepsiburada_sync_status, hepsiburada_error_message,
      tags, product_url, variants_json, updated_at
    )
    SELECT
      p->>'id',
      p->>'tenantId',
      COALESCE(p->>'xmlSourceId', ''),
      COALESCE(p->>'sourceName', 'ariasclosetx'),
      COALESCE(p->>'externalId', ''),
      p->>'stockCode',
      COALESCE(p->>'supplierStockCode', ''),
      COALESCE(p->>'barcode', ''),
      p->>'title',
      COALESCE(p->>'subtitle', ''),
      COALESCE(p->>'invoiceTitle', ''),
      COALESCE(p->>'descriptionHtml', ''),
      COALESCE(p->>'brandName', 'Aria''s Closet'),
      COALESCE(p->>'categoryName', 'Genel'),
      COALESCE(p->>'categoryTree', ''),
      COALESCE(p->'images', '[]'::jsonb),
      COALESCE(p->>'videoUrl', ''),
      COALESCE((p->>'vatRate')::int, 10),
      COALESCE((p->>'desi')::numeric, 1),
      COALESCE((p->>'preparationDays')::int, 1),
      COALESCE((p->>'warrantyMonths')::int, 0),
      COALESCE((p->>'stockDeductionPerSale')::int, 1),
      COALESCE((p->>'maxPurchaseQty')::int, 0),
      COALESCE((p->>'xmlPriceLock')::boolean, FALSE),
      COALESCE(p->>'status', 'active'),
      COALESCE((p->>'buyingPrice')::numeric, 0),
      COALESCE((p->>'marketPrice')::numeric, 0),
      COALESCE((p->>'salePrice')::numeric, 0),
      NULLIF(p->>'minPrice', '')::numeric,
      COALESCE(p->'marketplaceDescriptions', '{}'::jsonb),
      COALESCE((p->>'trendyolListPrice')::numeric, 0),
      COALESCE((p->>'trendyolSalePrice')::numeric, 0),
      COALESCE((p->>'hepsiburadaSalePrice')::numeric, 0),
      COALESCE((p->>'totalXmlStock')::int, 0),
      COALESCE((p->>'reservedOrderStock')::int, 0),
      COALESCE((p->>'netAvailableStock')::int, 0),
      COALESCE(p->>'trendyolSyncStatus', 'not_sent'),
      p->>'trendyolErrorMessage',
      COALESCE(p->>'hepsiburadaSyncStatus', 'not_sent'),
      p->>'hepsiburadaErrorMessage',
      COALESCE(p->'tags', '[]'::jsonb),
      COALESCE(p->>'productUrl', ''),
      COALESCE(p->'variants', '[]'::jsonb),
      COALESCE((p->>'updatedAt')::timestamptz, NOW())
    FROM deduped
    ON CONFLICT (tenant_id, stock_code) DO UPDATE SET
      xml_source_id = EXCLUDED.xml_source_id,
      source_name = EXCLUDED.source_name,
      external_id = EXCLUDED.external_id,
      barcode = EXCLUDED.barcode,
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      invoice_title = EXCLUDED.invoice_title,
      description_html = EXCLUDED.description_html,
      brand_name = EXCLUDED.brand_name,
      category_name = EXCLUDED.category_name,
      category_tree = EXCLUDED.category_tree,
      images = EXCLUDED.images,
      video_url = EXCLUDED.video_url,
      vat_rate = EXCLUDED.vat_rate,
      desi = EXCLUDED.desi,
      preparation_days = EXCLUDED.preparation_days,
      warranty_months = EXCLUDED.warranty_months,
      stock_deduction_per_sale = EXCLUDED.stock_deduction_per_sale,
      max_purchase_qty = EXCLUDED.max_purchase_qty,
      xml_price_lock = EXCLUDED.xml_price_lock,
      status = EXCLUDED.status,
      buying_price = EXCLUDED.buying_price,
      market_price = EXCLUDED.market_price,
      sale_price = EXCLUDED.sale_price,
      min_price = EXCLUDED.min_price,
      marketplace_descriptions = EXCLUDED.marketplace_descriptions,
      trendyol_list_price = EXCLUDED.trendyol_list_price,
      trendyol_sale_price = EXCLUDED.trendyol_sale_price,
      hepsiburada_sale_price = EXCLUDED.hepsiburada_sale_price,
      total_xml_stock = EXCLUDED.total_xml_stock,
      reserved_order_stock = EXCLUDED.reserved_order_stock,
      net_available_stock = EXCLUDED.net_available_stock,
      trendyol_sync_status = EXCLUDED.trendyol_sync_status,
      trendyol_error_message = EXCLUDED.trendyol_error_message,
      hepsiburada_sync_status = EXCLUDED.hepsiburada_sync_status,
      hepsiburada_error_message = EXCLUDED.hepsiburada_error_message,
      tags = EXCLUDED.tags,
      product_url = EXCLUDED.product_url,
      variants_json = EXCLUDED.variants_json,
      updated_at = EXCLUDED.updated_at
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upserted;

  RETURN v_count;
END;
$$;

-- RPC izinlerini yalnızca service_role olarak kilitle
REVOKE ALL ON FUNCTION public.sopyo_get_products_chunk(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sopyo_upsert_products_chunk(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sopyo_get_products_chunk(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sopyo_upsert_products_chunk(TEXT, JSONB) TO service_role;
