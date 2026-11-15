-- =============================================================================
-- SOPYO KLONU — ÇOK KULLANICILI (MULTI-TENANT SaaS) SUPABASE VERİTABANI ŞEMASI
-- Sadece Trendyol + Hepsiburada Entegrasyonu, XML Kaynak Sihirbazı,
-- Akıllı Kategori/Marka/Varyant Eşleştirme, Sipariş & Çapraz Stok Düşme,
-- İade Yönetimi, Rekabet Robotu ve Süper Admin Yönetimi
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TENANTS (MAĞAZALAR / FİRMALAR) VE KULLANICI PROFİLLERİ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,                       -- Örn: LuneRose
    slug VARCHAR(150) UNIQUE NOT NULL,                -- Örn: lunerose
    plan VARCHAR(50) NOT NULL DEFAULT 'professional', -- free, professional, enterprise
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_xml_sources INT NOT NULL DEFAULT 10,
    max_products INT NOT NULL DEFAULT 50000,
    company_phone VARCHAR(50),
    company_email VARCHAR(150),
    company_address TEXT,
    company_website VARCHAR(255),
    default_vat_rate INT NOT NULL DEFAULT 10,
    mask_invoice_product_names BOOLEAN NOT NULL DEFAULT FALSE,
    default_masked_product_name VARCHAR(150) DEFAULT 'Tekstil / Giyim Ürünü',
    cargo_label_template VARCHAR(50) NOT NULL DEFAULT 'single', -- single, double, quad, barcode, argox
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
    id UUID PRIMARY KEY,                              -- Supabase auth.users.id ile eşleşir
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'owner',        -- super_admin, owner, staff
    password_hash TEXT,                               -- Yerel/Özel auth yedek alanı
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. PAZARYERİ API HESAPLARI (SADECE TRENDYOL & HEPSİBURADA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    store_name VARCHAR(150) NOT NULL,
    supplier_or_merchant_id VARCHAR(150) NOT NULL,    -- Trendyol: 1192080 | HB: fea9499f-...
    api_key VARCHAR(255),                             -- Trendyol API Key / HB Entegratör Kullanıcı
    api_secret VARCHAR(255),                          -- Trendyol API Secret / HB Service Key
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_confirm_orders BOOLEAN NOT NULL DEFAULT FALSE,
    shipment_provider_id VARCHAR(50) DEFAULT '7',     -- 7: Aras Kargo Marketplace
    shipment_provider_name VARCHAR(100) DEFAULT 'Aras Kargo Marketplace',
    shipment_address_id VARCHAR(100),                 -- Örn: 7853340
    shipment_address_text TEXT,
    returning_address_id VARCHAR(100),                -- Örn: 7853341
    returning_address_text TEXT,
    dispatch_time_hours INT DEFAULT 24,               -- HB Kargo hazırlık süresi
    hb_order_pull_status VARCHAR(50) DEFAULT 'ready_to_ship', -- packageable | ready_to_ship
    stock_code_type VARCHAR(50) DEFAULT 'modelCode',  -- modelCode | supplierStockCode | barcode
    description_prefix_html TEXT DEFAULT '',
    description_suffix_html TEXT DEFAULT '',
    last_tested_at TIMESTAMPTZ,
    connection_status VARCHAR(50) DEFAULT 'connected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, marketplace)
);

-- -----------------------------------------------------------------------------
-- 3. XML ÜRÜN KAYNAKLARI VE FİYAT KURALLARI (/xml/edit/10947 Birebir Yapısı)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xml_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                       -- Örn: ariasclosetx
    url TEXT NOT NULL,                                -- Örn: https://www.ariasclosetx.com/TicimaxXmlV2/...
    provider_type VARCHAR(50) NOT NULL DEFAULT 'ticimax', -- ticimax, ideasoft, custom
    extra_notes TEXT DEFAULT '',
    stock_code_prefix VARCHAR(20) DEFAULT 'AX',       -- beforeProductStockCode
    generate_barcode BOOLEAN NOT NULL DEFAULT TRUE,   -- generateBarcode
    disable_stock_sync BOOLEAN NOT NULL DEFAULT FALSE,-- checkStock
    disable_price_sync BOOLEAN NOT NULL DEFAULT FALSE,-- checkPrice
    disable_new_products BOOLEAN NOT NULL DEFAULT FALSE, -- checkProduct
    critical_stock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    critical_stock_amount INT NOT NULL DEFAULT 3,     -- criticalStockAmount (<=3 ise 0)
    auto_publish_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_publish_channels JSONB NOT NULL DEFAULT '["Trendyol", "Hepsiburada"]'::jsonb,
    sale_price_tag VARCHAR(100) NOT NULL DEFAULT 'SatisFiyati',
    buying_price_tag VARCHAR(100) DEFAULT 'SatisFiyati',
    market_price_tag VARCHAR(100) DEFAULT 'IndirimliFiyat',
    tax_included_mode INT NOT NULL DEFAULT 0,         -- 0: XML'den al, 1: Etiket seç, 2: Sabit KDV
    fixed_tax_rate INT DEFAULT 10,
    use_currency_conversion BOOLEAN NOT NULL DEFAULT FALSE,
    price_round_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    price_round_type VARCHAR(10) DEFAULT 'x9',        -- x9, 99, x0, 00, 90
    price_round_way VARCHAR(20) DEFAULT 'round',      -- round, roundDown, roundUp
    price_rule_type INT NOT NULL DEFAULT 3,           -- 0: Yok, 1: Sabit, 2: Değişken, 3: Pazaryeri Bazlı
    fixed_price_rule JSONB DEFAULT '{"ruleType":"increase","ruleOperationType":"percent","ruleAmount":100,"ruleExtraPrice":0}'::jsonb,
    dynamic_price_rules JSONB DEFAULT '[]'::jsonb,
    marketplace_price_rules JSONB NOT NULL DEFAULT '{
      "Trendyol": [
        {"ruleMinPrice": 1, "ruleMaxPrice": 299, "ruleType": "increase", "ruleOperationType": "percent", "ruleAmount": 105, "ruleExtraPrice": 75},
        {"ruleMinPrice": 299, "ruleMaxPrice": 999999999, "ruleType": "increase", "ruleOperationType": "percent", "ruleAmount": 105, "ruleExtraPrice": 0}
      ],
      "Hepsiburada": [
        {"ruleMinPrice": 1, "ruleMaxPrice": 143, "ruleType": "increase", "ruleOperationType": "percent", "ruleAmount": 120, "ruleExtraPrice": 80},
        {"ruleMinPrice": 143, "ruleMaxPrice": 999999999, "ruleType": "increase", "ruleOperationType": "percent", "ruleAmount": 120, "ruleExtraPrice": 40}
      ]
    }'::jsonb,
    custom_tag_mapping JSONB DEFAULT '{
      "productNode": "Urun",
      "externalId": "UrunKartiID",
      "title": "UrunAdi",
      "description": "Aciklama",
      "brand": "Marka",
      "category": "Kategori",
      "categoryTree": "KategoriTree",
      "images": "Resimler.Resim",
      "variants": "UrunSecenek.Secenek",
      "variantId": "VaryasyonID",
      "sku": "StokKodu",
      "barcode": "Barkod",
      "stock": "StokAdedi",
      "buyingPrice": "AlisFiyati",
      "salePrice": "SatisFiyati",
      "marketPrice": "IndirimliFiyat",
      "vatRate": "KdvOrani",
      "currency": "ParaBirimiKodu",
      "desi": "Desi"
    }'::jsonb,
    total_product_count INT NOT NULL DEFAULT 0,
    total_variant_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',     -- active, pending, limit_exceeded, paused
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xml_sync_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    xml_source_id UUID NOT NULL REFERENCES public.xml_sources(id) ON DELETE CASCADE,
    source_product_count INT NOT NULL DEFAULT 0,
    stock_updated_count INT NOT NULL DEFAULT 0,
    price_updated_count INT NOT NULL DEFAULT 0,
    newly_added_count INT NOT NULL DEFAULT 0,
    deleted_count INT NOT NULL DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. KATEGORİLER, MARKALAR, SEÇENEK GRUPLARI (VARYANT) VE ETİKETLER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,                       -- Örn: Gecelik Modelleri
    xml_category_tree TEXT,                           -- Örn: FANTAZİ GİYİM/Gecelik Modelleri
    source_name VARCHAR(100) DEFAULT 'ariasclosetx',
    product_count INT NOT NULL DEFAULT 0,
    trendyol_category_id INT,
    trendyol_category_name VARCHAR(255),
    trendyol_status VARCHAR(50) DEFAULT 'unmapped',   -- mapped, missing_options, missing_attributes, unmapped
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,                       -- Aria's Closet, MONAMİSE, Brand, Tegan
    product_count INT NOT NULL DEFAULT 0,
    trendyol_brand_id INT,
    trendyol_brand_name VARCHAR(150),
    hepsiburada_brand_name VARCHAR(150),
    is_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.variant_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                       -- Renk, Beden
    values_list JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{value: "XS", trendyolValue: "XS", hbValue: "XS"}, ...]
    product_count INT NOT NULL DEFAULT 0,
    trendyol_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    hepsiburada_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT '#4f46e5',
    product_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- -----------------------------------------------------------------------------
-- 5. ÜRÜNLER VE VARYANTLAR (/products/list/all & /products/show/[id])
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    xml_source_id UUID REFERENCES public.xml_sources(id) ON DELETE SET NULL,
    source_name VARCHAR(100) DEFAULT 'ariasclosetx',
    external_id VARCHAR(100),                         -- UrunKartiID
    stock_code VARCHAR(100) NOT NULL,                 -- AX33322
    supplier_stock_code VARCHAR(100),                 -- 33322
    barcode VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(150) DEFAULT '',
    invoice_title VARCHAR(150) DEFAULT '',            -- Fatura kaleminde ürün adı maskeleme
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
    stock_deduction_per_sale INT NOT NULL DEFAULT 1,  -- Ürün satıldığında stoktan ne kadar düşülecek
    max_purchase_qty INT NOT NULL DEFAULT 0,
    xml_price_lock BOOLEAN NOT NULL DEFAULT FALSE,    -- XML Fiyat Kilidi
    status VARCHAR(50) NOT NULL DEFAULT 'active',     -- active (Satışa Açık), passive (Satışa Kapalı)
    buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,      -- XML baz satış fiyatı
    trendyol_list_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    trendyol_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    hepsiburada_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_xml_stock INT NOT NULL DEFAULT 0,
    reserved_order_stock INT NOT NULL DEFAULT 0,      -- Açık siparişlerden rezerve edilen stok
    net_available_stock INT NOT NULL DEFAULT 0,       -- Pazaryerine gönderilen net stok
    trendyol_sync_status VARCHAR(50) DEFAULT 'not_sent', -- synced, pending, error, not_sent
    trendyol_error_message TEXT,
    hepsiburada_sync_status VARCHAR(50) DEFAULT 'not_sent',
    hepsiburada_error_message TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    product_url TEXT,
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, stock_code)
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    external_variant_id VARCHAR(100),                 -- VaryasyonID
    sku VARCHAR(100) NOT NULL,
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
    attributes JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{name: "Beden Seçiniz", value: "XS"}, {name: "Renk", value: "Görsel"}]
    price_stock_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TOPLU İŞLEMLER, FARKLILIK KONTROLÜ VE REKABET ROBOTU
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_number SERIAL,                              -- #803254 vb.
    marketplace VARCHAR(50) NOT NULL,                 -- Trendyol, Hepsiburada, Tümü
    operation_type VARCHAR(100) NOT NULL,             -- TÜM ÜRÜNLER, SEÇİLEN ÜRÜNLER, ÜRÜN GÜNCELLEME(Stok/Fiyat)
    remote_batch_id VARCHAR(150),                     -- Trendyol batchRequestId / HB ticketId
    attempted_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    error_report JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.price_robot_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    marketplace_sku_or_url TEXT NOT NULL,
    current_price NUMERIC(12,2) NOT NULL,
    buybox_price NUMERIC(12,2) NOT NULL,
    min_floor_price NUMERIC(12,2) NOT NULL,           -- Minimum (dip) fiyat koruması
    max_ceiling_price NUMERIC(12,2) NOT NULL,
    step_amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,  -- Rekabet düşüş adımı (TL)
    buybox_rank INT NOT NULL DEFAULT 1,
    competitor_store VARCHAR(150) DEFAULT '',
    excluded_stores JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. SİPARİŞLER, ÇAPRAZ STOK DÜŞME VE İADE YÖNETİMİ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,               -- Örn: 11820030786
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(50),
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100),
    shipping_district VARCHAR(100),
    cargo_company VARCHAR(100) DEFAULT 'Aras Kargo Marketplace',
    cargo_tracking_number VARCHAR(100),
    cargo_barcode VARCHAR(100),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'delivered',  -- pending, ready_to_ship, shipped, delivered, cancelled
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'unissued', -- unissued, issued
    invoice_number VARCHAR(100),
    label_printed BOOLEAN NOT NULL DEFAULT FALSE,
    stock_deducted BOOLEAN NOT NULL DEFAULT TRUE,     -- Çapraz pazaryeri stok düşüldü mü?
    cross_sync_log TEXT,                              -- Örn: "Trendyol siparişi -> Hepsiburada stoğu 1 adet düşüldü"
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, marketplace, order_number)
);

CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada')),
    customer_name VARCHAR(150) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',    -- pending, approved, rejected
    restock_on_approve BOOLEAN NOT NULL DEFAULT TRUE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    claim_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLİTİKALARI — TAM KULLANICI/MAĞAZA İZOLASYONU
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

-- Yardımcı fonksiyon: Oturum açmış kullanıcının tenant_id değerini döndürür
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY tenant_isolation_policy ON public.tenants
  FOR ALL USING (id = public.current_user_tenant_id());

CREATE POLICY profile_isolation_policy ON public.user_profiles
  FOR ALL USING (tenant_id = public.current_user_tenant_id() OR id = auth.uid());

CREATE POLICY mkt_isolation_policy ON public.marketplace_accounts
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY xml_isolation_policy ON public.xml_sources
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY xml_rep_isolation_policy ON public.xml_sync_reports
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY cat_isolation_policy ON public.categories
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY brand_isolation_policy ON public.brands
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY var_grp_isolation_policy ON public.variant_groups
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY tag_isolation_policy ON public.tags
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY prod_isolation_policy ON public.products
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY pvar_isolation_policy ON public.product_variants
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY batch_isolation_policy ON public.sync_batches
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY robot_isolation_policy ON public.price_robot_items
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY order_isolation_policy ON public.orders
  FOR ALL USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY claim_isolation_policy ON public.claims
  FOR ALL USING (tenant_id = public.current_user_tenant_id());
