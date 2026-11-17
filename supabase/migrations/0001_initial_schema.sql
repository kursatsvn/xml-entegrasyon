-- =============================================================================
-- SOPYO ENTERPRISE — ÇOK KULLANICILI (MULTI-TENANT SaaS) SUPABASE VERİTABANI ŞEMASI
-- Proje: xml-entegrasyon (Trendyol & Hepsiburada)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 0. PRIVATE INTERNAL CONFIG (PostgREST tarafından dışarı açılmaz)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE TABLE IF NOT EXISTS private.server_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. TENANTS (MAĞAZALAR / FİRMALAR) VE KULLANICI PROFİLLERİ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'professional',
    license_expires_at TIMESTAMPTZ NOT NULL DEFAULT '2027-12-31T23:59:59Z',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_xml_sources INT NOT NULL DEFAULT 10,
    max_products INT NOT NULL DEFAULT 50000,
    company_phone VARCHAR(50) DEFAULT '',
    company_email VARCHAR(150) DEFAULT '',
    company_address TEXT DEFAULT '',
    company_website VARCHAR(255) DEFAULT '',
    default_vat_rate INT NOT NULL DEFAULT 10,
    mask_invoice_product_names BOOLEAN NOT NULL DEFAULT FALSE,
    default_masked_product_name VARCHAR(150) DEFAULT 'Tekstil & Ev Giyim Ürünü',
    cargo_label_template VARCHAR(50) NOT NULL DEFAULT 'single',
    cargo_label_show_stock BOOLEAN NOT NULL DEFAULT FALSE,
    cargo_label_show_products BOOLEAN NOT NULL DEFAULT TRUE,
    cargo_label_show_price BOOLEAN NOT NULL DEFAULT TRUE,
    cargo_label_show_sku BOOLEAN NOT NULL DEFAULT TRUE,
    cargo_label_font_size NUMERIC(4,1) NOT NULL DEFAULT 7.7,
    trendyol_invoice_note TEXT DEFAULT 'İş bu fatura tutarı DSM Grup Danışmanlık İletişim ve Satış Tic.A.Ş hesabına devredilmiştir.',
    hepsiburada_invoice_note TEXT DEFAULT 'İş bu fatura tutarı D-Market Elektronik Hiz. ve Tic. A.Ş. hesabına devredilmiştir.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    auth_uid UUID,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'owner',
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. PAZARYERİ API HESAPLARI (SADECE TRENDYOL & HEPSİBURADA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    store_name VARCHAR(150) NOT NULL,
    supplier_or_merchant_id VARCHAR(150) NOT NULL,
    api_key VARCHAR(255) DEFAULT '',
    api_secret VARCHAR(255) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_confirm_orders BOOLEAN NOT NULL DEFAULT FALSE,
    shipment_provider_id VARCHAR(50) DEFAULT '7',
    shipment_provider_name VARCHAR(100) DEFAULT 'Aras Kargo Marketplace',
    shipment_address_id VARCHAR(100) DEFAULT '',
    shipment_address_text TEXT DEFAULT '',
    returning_address_id VARCHAR(100) DEFAULT '',
    returning_address_text TEXT DEFAULT '',
    dispatch_time_hours INT DEFAULT 24,
    hb_order_pull_status VARCHAR(50) DEFAULT 'ready_to_ship',
    stock_code_type VARCHAR(50) DEFAULT 'modelCode',
    description_prefix_html TEXT DEFAULT '',
    description_suffix_html TEXT DEFAULT '',
    last_tested_at TIMESTAMPTZ,
    connection_status VARCHAR(50) DEFAULT 'connected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, marketplace)
);

-- -----------------------------------------------------------------------------
-- 3. XML ÜRÜN KAYNAKLARI VE SENKRONİZASYON RAPORLARI
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xml_sources (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    xml_id_number INT NOT NULL DEFAULT 10947,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    provider_type VARCHAR(50) NOT NULL DEFAULT 'ticimax',
    extra_notes TEXT DEFAULT '',
    stock_code_prefix VARCHAR(20) DEFAULT 'AX',
    generate_barcode BOOLEAN NOT NULL DEFAULT TRUE,
    disable_stock_sync BOOLEAN NOT NULL DEFAULT FALSE,
    disable_price_sync BOOLEAN NOT NULL DEFAULT FALSE,
    disable_new_products BOOLEAN NOT NULL DEFAULT FALSE,
    critical_stock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    critical_stock_amount INT NOT NULL DEFAULT 3,
    auto_publish_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_publish_channels JSONB NOT NULL DEFAULT '["Trendyol", "Hepsiburada"]'::jsonb,
    sale_price_tag VARCHAR(100) NOT NULL DEFAULT 'SatisFiyati',
    buying_price_tag VARCHAR(100) DEFAULT 'SatisFiyati',
    market_price_tag VARCHAR(100) DEFAULT 'IndirimliFiyat',
    tax_included_mode INT NOT NULL DEFAULT 0,
    fixed_tax_rate INT DEFAULT 10,
    use_currency_conversion BOOLEAN NOT NULL DEFAULT FALSE,
    price_round_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    price_round_type VARCHAR(10) DEFAULT 'x9',
    price_round_way VARCHAR(20) DEFAULT 'round',
    price_rule_type INT NOT NULL DEFAULT 3,
    fixed_price_rule JSONB DEFAULT '{}'::jsonb,
    dynamic_price_rules JSONB DEFAULT '[]'::jsonb,
    marketplace_price_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_tag_mapping JSONB DEFAULT '{}'::jsonb,
    total_product_count INT NOT NULL DEFAULT 0,
    total_variant_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xml_sync_reports (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    xml_source_id TEXT NOT NULL REFERENCES public.xml_sources(id) ON DELETE CASCADE,
    xml_source_name VARCHAR(150) DEFAULT 'ariasclosetx',
    source_product_count INT NOT NULL DEFAULT 0,
    stock_updated_count INT NOT NULL DEFAULT 0,
    price_updated_count INT NOT NULL DEFAULT 0,
    newly_added_count INT NOT NULL DEFAULT 0,
    deleted_count INT NOT NULL DEFAULT 0,
    items_summary JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. KATEGORİLER, MARKALAR, SEÇENEK GRUPLARI VE ETİKETLER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    xml_category_tree TEXT DEFAULT '',
    source_name VARCHAR(100) DEFAULT 'ariasclosetx',
    product_count INT NOT NULL DEFAULT 0,
    trendyol_category_id INT,
    trendyol_category_name VARCHAR(255),
    trendyol_status VARCHAR(50) DEFAULT 'unmapped',
    trendyol_attributes JSONB DEFAULT '[]'::jsonb,
    hepsiburada_category_id VARCHAR(100),
    hepsiburada_category_name VARCHAR(255),
    hepsiburada_status VARCHAR(50) DEFAULT 'unmapped',
    hepsiburada_attributes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.brands (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    product_count INT NOT NULL DEFAULT 0,
    trendyol_brand_id INT,
    trendyol_brand_name VARCHAR(150),
    hepsiburada_brand_name VARCHAR(150),
    is_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.variant_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    values_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    product_count INT NOT NULL DEFAULT 0,
    trendyol_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    hepsiburada_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.tags (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT '#4f46e5',
    product_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- -----------------------------------------------------------------------------
-- 5. ÜRÜNLER VE VARYANTLAR
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    xml_source_id TEXT DEFAULT '',
    source_name VARCHAR(100) DEFAULT 'ariasclosetx',
    external_id VARCHAR(100) DEFAULT '',
    stock_code VARCHAR(150) NOT NULL,
    supplier_stock_code VARCHAR(150) DEFAULT '',
    barcode VARCHAR(100) DEFAULT '',
    title VARCHAR(300) NOT NULL,
    subtitle VARCHAR(200) DEFAULT '',
    invoice_title VARCHAR(200) DEFAULT '',
    description_html TEXT DEFAULT '',
    brand_name VARCHAR(150) DEFAULT 'Aria''s Closet',
    category_name VARCHAR(255) DEFAULT 'Genel',
    category_tree TEXT DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    video_url TEXT DEFAULT '',
    vat_rate INT NOT NULL DEFAULT 10,
    desi NUMERIC(8,2) NOT NULL DEFAULT 1,
    preparation_days INT NOT NULL DEFAULT 1,
    warranty_months INT NOT NULL DEFAULT 0,
    stock_deduction_per_sale INT NOT NULL DEFAULT 1,
    max_purchase_qty INT NOT NULL DEFAULT 0,
    xml_price_lock BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    trendyol_list_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    trendyol_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    hepsiburada_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_xml_stock INT NOT NULL DEFAULT 0,
    reserved_order_stock INT NOT NULL DEFAULT 0,
    net_available_stock INT NOT NULL DEFAULT 0,
    trendyol_sync_status VARCHAR(50) DEFAULT 'not_sent',
    trendyol_error_message TEXT,
    hepsiburada_sync_status VARCHAR(50) DEFAULT 'not_sent',
    hepsiburada_error_message TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    product_url TEXT DEFAULT '',
    variants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    external_variant_id VARCHAR(100) DEFAULT '',
    sku VARCHAR(150) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    xml_stock INT NOT NULL DEFAULT 0,
    reserved_stock INT NOT NULL DEFAULT 0,
    net_stock INT NOT NULL DEFAULT 0,
    buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    trendyol_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    hepsiburada_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    color VARCHAR(100) DEFAULT '',
    size VARCHAR(100) DEFAULT '',
    attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pvariants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_pvariants_barcode ON public.product_variants(barcode);

-- -----------------------------------------------------------------------------
-- 6. TOPLU İŞLEMLER, REKABET ROBOTU, SİPARİŞLER, İADELER VE LOGLAR
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_batches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_number INT NOT NULL,
    marketplace VARCHAR(50) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    remote_batch_id VARCHAR(255) DEFAULT '',
    attempted_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.price_robot_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    stock_code VARCHAR(150) DEFAULT '',
    product_title VARCHAR(300) DEFAULT '',
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    marketplace_sku_or_url TEXT NOT NULL,
    current_price NUMERIC(12,2) NOT NULL,
    buybox_price NUMERIC(12,2) NOT NULL,
    min_floor_price NUMERIC(12,2) NOT NULL,
    max_ceiling_price NUMERIC(12,2) NOT NULL,
    step_amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    buybox_rank INT NOT NULL DEFAULT 1,
    competitor_store VARCHAR(150) DEFAULT '',
    excluded_stores JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150) DEFAULT '',
    customer_phone VARCHAR(50) DEFAULT '',
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100) DEFAULT '',
    shipping_district VARCHAR(100) DEFAULT '',
    cargo_company VARCHAR(100) DEFAULT 'Aras Kargo Marketplace',
    cargo_tracking_number VARCHAR(100) DEFAULT '',
    cargo_barcode VARCHAR(100) DEFAULT '',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'delivered',
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'unissued',
    invoice_number VARCHAR(100),
    label_printed BOOLEAN NOT NULL DEFAULT FALSE,
    stock_deducted BOOLEAN NOT NULL DEFAULT TRUE,
    cross_sync_log TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, marketplace, order_number)
);

CREATE TABLE IF NOT EXISTS public.claims (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    customer_name VARCHAR(150) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    restock_on_approve BOOLEAN NOT NULL DEFAULT TRUE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    claim_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operation_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type VARCHAR(80) NOT NULL,
    channel VARCHAR(120) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'success',
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLİTİKALARI — TAM İZOLASYON
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_sync_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_robot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS TEXT AS $$
  SELECT tenant_id FROM public.user_profiles WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp;

CREATE POLICY tenant_isolation_policy ON public.tenants
  FOR ALL TO authenticated USING (id = public.current_user_tenant_id());

CREATE POLICY profile_isolation_policy ON public.user_profiles
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id() OR auth_uid = auth.uid());

CREATE POLICY mkt_isolation_policy ON public.marketplace_accounts
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY xml_isolation_policy ON public.xml_sources
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY xml_rep_isolation_policy ON public.xml_sync_reports
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY cat_isolation_policy ON public.categories
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY brand_isolation_policy ON public.brands
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY var_grp_isolation_policy ON public.variant_groups
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY tag_isolation_policy ON public.tags
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY prod_isolation_policy ON public.products
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY pvar_isolation_policy ON public.product_variants
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY batch_isolation_policy ON public.sync_batches
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY robot_isolation_policy ON public.price_robot_items
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY order_isolation_policy ON public.orders
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY claim_isolation_policy ON public.claims
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY log_isolation_policy ON public.operation_logs
  FOR ALL TO authenticated USING (tenant_id = public.current_user_tenant_id());
