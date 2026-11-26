# Faz 6 — Hepsiburada API Tam Entegrasyon Planı (Trendyol Birebir Özellik Eşitliği)

> **İlgili Takip Dosyaları:** `DENETIM_RAPORU_VE_TAKIP.md`, `FAZ_1_ACIL_GUVENLIK_PLANI.md` – `FAZ_5_TASARIM_UI_UX_APP_ROUTER_PLANI.md`  
> **Kapsanan Ertelenmiş Denetim Maddeleri:** `2.7.a` (Gerçek HB Ürün Gönderimi), `2.7.b` (Gerçek HB Sipariş Çekme), `2.7.c` (Gerçek HTTP Bağlantı Testi) + Trendyol ile %100 Özellik Eşitliği  
> **Referans Resmi Dokümantasyon:** Hepsiburada Developer Portal v1.0 (`developers.hepsiburada.com` — Başlangıç, Ürün/Katalog MPOP, Listing-External, OMS Sipariş/Paket/Etiket ve Talep/Claims Servisleri)  
> **Canlı Satış Güvenliği Garantisi:** Mevcut çalışan Trendyol entegrasyonu ile `xml-engine.ts` / `pricing-engine.ts` mantığı korunur; `0,00 TL` fiyat engeli, `xmlPriceLock`, `minPrice` dip fiyat kilidi, kritik stok ve AI İhlal Koruması Hepsiburada gönderimlerinde de zorunlu kapı olarak çalışır.

---

## 1. Mevcut Durum Analizi ve Tespit Edilen Kritik Eksikler

Önceki fazlarda (`Faz 1–5`) güvenlik, `@supabase/ssr` kimlik doğrulama, RLS, performans ve UI/UX tamamlanmış; Hepsiburada API katmanı ise resmi dokümantasyonla birlikte ele alınmak üzere bilinçli olarak ertelenmişti. Mevcut kod tabanında tespit edilen teknik sorunlar ve Trendyol'a kıyasla eksik kalan özellikler şunlardır:

1. **Hatalı Kimlik Doğrulama (`src/lib/marketplace-api.ts:27-35`):**
   - Mevcut `getHepsiburadaAuthHeaders`, Basic Auth kullanıcı adı olarak `account.apiKey` (`kodanka_dev` vb. entegratör adı) ve `User-Agent` olarak `${storeName}_SelfIntegration` göndermektedir.
   - **Resmi Hepsiburada v1.0 Kuralı:** Basic Auth `Base64(MerchantID:ServisAnahtari)` (`${supplierOrMerchantId}:${apiSecret}`) olmalı; `User-Agent` başlığı ise satıcı panelinde yetkilendirilen entegratör/geliştirici kullanıcı adı (`<entegrator_adi>_dev`, yani `account.apiKey`) olmalıdır. Mevcut haliyle canlı API `401 Unauthorized` döner.
2. **Sahte Bağlantı Testi (`2.7.c` — `src/lib/marketplace-api.ts:37-85`):**
   - `testMarketplaceConnection`, HTTP `401`/`403`/`500` veya zaman aşımı hatalarında bile `{ ok: true }` dönmektedir.
3. **Hatalı Stok/Fiyat JSON Şeması (`src/lib/marketplace-api.ts:131-187`):**
   - `inventory-uploads` ucuna `{ listings: [...] }` sarmalayıcısı ve küçük harfli `merchantSku` gönderilmektedir. Resmi şema sarmalayıcısız **kök JSON dizisi (`[...]`)** ve **PascalCase** alanlar (`HepsiburadaSku`, `MerchantSku`, `AvailableStock`, `Price`, `DispatchTime`) bekler; aksi halde veriler işlenmez. Yükleme sonrası `inventory-uploads/id/{id}` durum kontrolü de yapılmamaktadır.
4. **Sahte Ürün Gönderimi ve Sahte Kategori ID'leri (`2.7.a` — `src/lib/marketplace-api.ts:207-476`, `src/lib/category-matcher.ts:320`):**
   - `publishProductsToMarketplace` Hepsiburada için hiçbir HTTP isteği atmadan ürünleri `'synced'` işaretlemektedir.
   - `MARKETPLACE_CATEGORY_CATALOG` içindeki `hepsiburadaId` değerleri `'HB-60000682'` şeklinde sahte metinlerdir; gerçek MPOP sayısal uç (leaf) kategori ID'leri ve kategoriye özel zorunlu/varyant özellik şemaları çekilmemektedir.
   - MPOP `POST /product/api/products/import` ucu ham JSON değil, **`multipart/form-data` içinde `file` adlı `.json` dosyası** beklemektedir.
5. **Boş Sipariş ve İade Entegrasyonu (`2.7.b` — `src/lib/marketplace-api.ts:478-529`):**
   - `pullOrdersFromMarketplace` Hepsiburada için `[]` dönmektedir; paketleme, kargo barkodu/etiketi ve iade/talep (`claims`) çekme/onaylama/reddetme uçları yoktur.
6. **Trendyol'da Olup Hepsiburada'da Olmayan Arayüz Özellikleri (`BulkAndRobotView.tsx`):**
   - Trendyol için **Canlı Ürün Listeleme, Sayaçlar ve Arşivle/Sil (`trendyol_live`)** sekmesi varken Hepsiburada karşılığı yoktur.
   - **Buybox Fiyat Robotu** canlı Hepsiburada Buybox sıralamasını/fiyatını çekmemekte ve hesaplanan yeni fiyatı canlı Hepsiburada API'sine iletmemektedir.
   - **Farklılık Kontrolü (`diffCheck`)** sekmesi canlı Hepsiburada listing stok/fiyat verisiyle gerçek karşılaştırma yapmamaktadır.

---

## 2. Resmi Hepsiburada API v1.0 Mimari Eşleştirme Tablosu

| Modül | Canlı (Prod) & Test (SIT) Base URL | Kullanılacak Resmi Uç Noktalar (Endpoints) | Trendyol Karşılığı |
| :--- | :--- | :--- | :--- |
| **Kimlik Doğrulama** | Tüm servisler | Header: `Authorization: Basic Base64(MerchantId:ServiceKey)`<br>Header: `User-Agent: <integrator>_dev`<br>Header: `Accept: application/json` | `Basic Base64(apiKey:apiSecret)` + `User-Agent: {supplierId} - SelfIntegration` |
| **Katalog & Ürün (MPOP)** | Prod: `https://mpop.hepsiburada.com`<br>SIT: `https://mpop-sit.hepsiburada.com` | • `GET /product/api/categories/get-all-categories?leaf=true&status=ACTIVE&available=true`<br>• `GET /product/api/categories/{categoryId}/attributes`<br>• `GET /product/api/categories/{categoryId}/attribute/{attributeId}/values`<br>• `POST /product/api/products/import` (`multipart/form-data`, `file=products.json`)<br>• `GET /product/api/products/status/{trackingId}`<br>• `GET /product/api/products/products-by-merchant-and-status`<br>• `POST /product/api/products/delete-process`<br>• `POST /product/api/products/approve-prematch` | Kategori ağacı, zorunlu özellikler, `POST /products`, `batch-requests/{id}`, onay bekleyen ürün silme |
| **Listing, Stok/Fiyat & Buybox** | Prod: `https://listing-external.hepsiburada.com`<br>SIT: `https://listing-external-sit.hepsiburada.com` | • `GET /listings/merchantid/{merchantId}?offset=&limit=`<br>• `POST /listings/merchantid/{merchantId}/inventory-uploads`<br>• `GET /listings/merchantid/{merchantId}/inventory-uploads/id/{id}`<br>• `POST /listings/merchantid/{merchantId}/price-uploads`<br>• `POST /listings/merchantid/{merchantId}/sku/{hbSku}/activate`<br>• `POST /listings/merchantid/{merchantId}/sku/{hbSku}/deactivate`<br>• `GET /buybox-orders/merchantid/{merchantId}?skuList=` | `price-and-inventory`, `fetchLiveTrendyolProducts`, `archive-state`, Buybox takibi |
| **Sipariş, Paket, Etiket & İade (OMS)** | Prod: `https://oms-external.hepsiburada.com`<br>SIT: `https://oms-external-sit.hepsiburada.com` | • `GET /orders/merchantid/{merchantId}?offset=0&limit=50`<br>• `GET /orders/merchantid/{merchantId}/paymentawaiting`<br>• `GET /packages/merchantid/{merchantId}?offset=0&limit=50`<br>• `POST /packages/merchantid/{merchantId}` (Paketleme)<br>• `GET /packages/merchantid/{merchantId}/packagenumber/{pkg}/labels`<br>• `PUT /packages/merchantid/{merchantId}/packagenumber/{pkg}/invoice`<br>• `GET /claims/merchantId/{merchantId}/status/{status}`<br>• `POST /claims/number/{claimNumber}/accept`<br>• `POST /claims/number/{claimNumber}/reject` | `pullOrdersFromMarketplace`, çapraz stok düşme, kargo etiketi, fatura durumu ve İade Yönetimi |

---

## 3. Atomik Uygulama Adımları (8 Adım)

### [x] Adım 1: Tip Sistemi, Veritabanı Uyumluluğu, Kimlik Doğrulama ve Gerçek Bağlantı Testi (`2.7.c`)
- **Dosyalar:**
  - Düzenle: `src/types/sopyo.ts`, `src/lib/validators.ts`
  - Oluştur: `src/lib/hepsiburada-client.ts` (merkezi HB HTTP istemcisi: Prod/SIT URL seçici, Basic Auth, `User-Agent`, `AbortSignal.timeout`, `429` Rate-Limit / `X-RateLimit-Remaining` yönetimi, güvenli hata ayrıştırıcı)
  - Düzenle: `src/lib/marketplace-api.ts` (`getHepsiburadaAuthHeaders` ve `testMarketplaceConnection`)
  - Düzenle: `src/components/views/SettingsAndAdminView.tsx`
- **Detaylar:**
  - `MarketplaceAccount` tipine opsiyonel `environment?: 'production' | 'sit'` alanı ekle (varsayılan `'production'`; mevcut Supabase `marketplace_accounts` şeması veya JSONB/kolon ile geriye dönük uyumlu).
  - Basic Auth başlığını `Buffer.from(`${merchantId.trim()}:${apiSecret.trim()}`).toString('base64')`, `User-Agent` başlığını ise `(account.apiKey || '').trim()` (`_dev` uzantılı entegratör kullanıcı adı) olarak düzelt; formda kullanıcıya net yardımcı açıklama göster (*"Hesabım > Entegrasyon > Entegratör Bilgileri altındaki `_dev` uzantılı kullanıcı adı"*).
  - `testMarketplaceConnection`: Hem Trendyol hem Hepsiburada için sahte `{ ok: true }` dönüşünü kaldır (`2.7.c`). Hepsiburada için `GET /listings/merchantid/{merchantId}?offset=0&limit=1` çağrısı yap; yalnızca `res.ok` durumunda `connectionStatus: 'connected'`, `401/403/5xx`/ağ hatasında net Türkçe hata mesajıyla `ok: false` ve `connectionStatus: 'error'` döndür.
  - Kiracı izolasyonunu koru: `process.env.HEPSIBURADA_*` hiçbir zaman başka kiracıya fallback yapmaz (`3.7` kuralı).

### [x] Adım 2: Canlı Hepsiburada Kategori Ağacı ve Zorunlu/Varyant Özellik Eşleştirme Motoru
- **Dosyalar:**
  - Oluştur: `src/lib/hepsiburada-catalog.ts`
  - Düzenle: `src/lib/category-matcher.ts`, `src/app/api/state/route.ts`, `src/components/views/CatalogMappingsView.tsx`
- **Detaylar:**
  - MPOP `get-all-categories?leaf=true&status=ACTIVE&available=true` servisinden yaprak kategorileri çeken ve sunucu belleğinde/önbellekte tutan yardımcı servisi yaz.
  - Seçilen Hepsiburada `categoryId` için `/product/api/categories/{categoryId}/attributes` (ve enum tipli özellikler için `/attribute/{attributeId}/values`) servisini çağırarak `baseAttributes`, zorunlu `attributes` (`mandatory: true`) ve `variantAttributes` (`renk_variant_property`, `ebatlar_variant_property` vb.) listesini getir.
  - `category-matcher.ts` içindeki sahte `'HB-60000...'` kodlarını gerçek sayısal Hepsiburada kategori ID'leriyle ve dinamik arama desteğiyle değiştir; `CatalogMappingsView.tsx` kategori düzenleme modalına **Canlı Hepsiburada Kategori Arama & Zorunlu Özellik Eşleştirme** alanlarını ekle.
  - Renk (`Görsel` → gerçek renk / `Çok Renkli` koruması) ve Beden (`S/M`, `L/XL`, `80B`, `Standart` vb.) normalizasyonunu Hepsiburada varyant özellik değerleriyle eşleştir.

### [x] Adım 3: Gerçek Hepsiburada Ürün Gönderimi (`import` Multipart JSON) ve `trackingId` Durum Kontrolü (`2.7.a`)
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`publishProductsToMarketplace`), `src/app/api/state/route.ts`, `src/app/api/cron/sync/route.ts`
- **Detaylar:**
  - Gönderim öncesi mevcut güvenlik kapılarını birebir uygula:
    1. `salePrice <= 0` olan ürün/varyantları kesinlikle gönderme, uyarı üret.
    2. `sanitizeProductContent` (AI İhlal Koruması: yasaklı kelime temizliği ve satışı yasak ürün engeli) + `sanitizeRichHtml` uygula.
    3. Ürüne özel `prod.marketplaceDescriptions?.hepsiburada` varsa (`gs.customerUseMarketDesc` aktifken) onu, yoksa genel açıklamayı `descriptionPrefixHtml` / `descriptionSuffixHtml` ile birleştirerek kullan.
  - Her varyant için MPOP şemasını üret:
    - `categoryId`: Eşleştirilmiş sayısal HB yaprak kategori ID'si
    - `merchant`: `account.supplierOrMerchantId`
    - `attributes`: `merchantSku` (`stockCodeType` seçimine göre normalize edilmiş büyük harf SKU), `VaryantGroupID` (`prod.stockCode`), `Barcode`, `UrunAdi` (maks 100-150 karakter), `UrunAciklamasi`, `Marka` (`brand.hepsiburadaBrandName || prod.brandName`), `GarantiSuresi` (`String(prod.warrantyMonths || 0)`), `kg` (`String(Math.max(1, prod.desi || 1))`), `tax_rate` (`0 | 1 | 10 | 20`), `price` (`hepsiburadaSalePrice`, virgül/ondalık formatı HB standardına uygun), `stock` (`prod.status === 'active' ? v.netStock : 0`), `Image1`..`Image5` (HTTPS URL'ler) + kategori zorunlu ve varyant özellikleri.
  - JSON dizisini 1.000'erli paketlere bölerek `FormData` (`new Blob([JSON.stringify(chunk)], { type: 'application/json' })`, `'products.json'`) ile `POST /product/api/products/import` ucuna gönder.
  - Dönen `trackingId` ile kısa bekleme sonrası `GET /product/api/products/status/{trackingId}` sorgusu at; `CREATED`/`MATCHED`/`WAITING` olanları ilgili statüye (`synced` veya `pending`), satır bazlı validasyon hatası dönenleri ise `hepsiburadaSyncStatus = 'error'` ve `hepsiburadaErrorMessage` ile işaretle.
  - **Eski Sahte `'synced'` Kayıtlarını Düzeltme & Kontrollü Gönderim:** Canlı veritabanında eski sahte kod nedeniyle `hepsiburada_sync_status = 'synced'` olarak işaretlenmiş **3.272 ürün** bulunduğundan:
    1. Canlı Hepsiburada listing/katalog listesiyle yerel ürünleri karşılaştırıp gerçekte HB'de olmayanları `'not_sent'` durumuna çeken **"HB Durumlarını Canlı Mağaza ile Eşitle"** aksiyonu (`reconcile_hepsiburada_status`) ekle.
    2. Toplu gönderim ekranına opsiyonel **Test Gönderim Limiti (`1 Ürün Test`, `10 Ürün`, `Tümü`)** seçeneği ekle ki SIT ortamı olmadan canlıda önce tek 1 ürünle sıfır riskli deneme yapılabilsin.
    3. `/api/cron/sync` içinde otomatik yeni ürün gönderimini `xmlSource.autoPublishEnabled && xmlSource.autoPublishChannels.includes('Hepsiburada')` koşuluna bağla.
  - Ayrıca `SyncBatch` geçmişinde bekleyen HB batch'leri için **"Batch / Tracking Durumu Sorgula"** aksiyonu ekle (`check_hepsiburada_import_status`).

### [x] Adım 4: Gerçek Hepsiburada Stok & Fiyat Eşitleme (`inventory-uploads`) ve Canlı Farklılık Kontrolü (`diffCheck`)
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`syncPriceAndInventoryToMarketplace`), `src/app/api/state/route.ts`, `src/components/views/BulkAndRobotView.tsx`
- **Detaylar:**
  - `syncPriceAndInventoryToMarketplace` içindeki Hepsiburada yükünü resmi şemaya çevir:
    - Kök JSON dizisi (`Array`), maksimum **4.000 SKU / istek** chunk'lama.
    - Alanlar: `MerchantSku`, `HepsiburadaSku` (biliniyorsa), `AvailableStock` (tam sayı, kritik stok ve rezerve düşülmüş `netStock`), `Price` (`minPrice` ve `xmlPriceLock` kuralları korunarak), `DispatchTime` (`account.dispatchTimeHours || 24`), `MaximumPurchasableQuantity` (`prod.maxPurchaseQty > 0 ? prod.maxPurchaseQty : undefined`).
  - Dönen `id` ile `GET /listings/merchantid/{merchantId}/inventory-uploads/id/{id}` kontrolü yaparak `outofpricerange` / `MinLock` / `MaxLock` veya eşleşmeyen SKU hatalarını `SyncBatch.errors` içine gerçek sayılarıyla kaydet.
  - `BulkAndRobotView.tsx` → **Farklılık Kontrolü (`diff`)** sekmesinde isteğe bağlı **"Canlı Pazaryeri Fiyat/Stok Karşılaştır"** butonuyla hem Trendyol hem Hepsiburada (`GET /listings/merchantid/{merchantId}`) canlı değerlerini çekip yerel net stok/fiyatla farkı yan yana göster.

### [x] Adım 5: Hepsiburada Canlı Ürün Listeleme, Sayaçlar, Satışa Aç/Kapat ve Silme (`hepsiburada_live`)
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`fetchLiveHepsiburadaProducts`, `toggleHepsiburadaListingsState`, `deletePendingHepsiburadaProducts`, `approveHepsiburadaPreMatch`)
  - Düzenle: `src/app/api/state/route.ts`, `src/lib/validators.ts`
  - Düzenle: `src/components/views/BulkAndRobotView.tsx`
- **Detaylar:**
  - Trendyol'daki `Trendyol Canlı & Silme (API)` sekmesinin birebir Hepsiburada karşılığı olarak **`Hepsiburada Canlı & Yönetim (API)`** sekmesini ekle:
    - **6 Canlı Sayaç Kartı:**
      1. Toplam Listing / Katalog Ürünü
      2. Satıştaki Aktif (`isSalable === true`)
      3. Satışa Kapalı / Pasif (`!isSalable`, stok 0 veya deaktif)
      4. Kilitli / Askıda (`isLocked` / `isSuspended` — `lockReasons` açıklamasıyla: `MinLock`, `MaxLock`, `MissingProductContent` vb.)
      5. Eşleşme / Onay Bekleyen (`WAITING`, `PRE_MATCHED`)
      6. Eksik Bilgi / Reddedilen (`REJECTED`, `MISSING_INFO`)
    - **Toplu ve Seçili Aksiyonlar (Hepsiburada Mimari Kurallarına Uygun):**
      - **Satışa Kapat (`Deactivate`):** Seçili veya tüm aktif listing'leri `POST /listings/merchantid/{merchantId}/sku/{hbSku}/deactivate` (veya toplu stok `0` güncellemesi) ile satışa kapatma.
      - **Satışa Aç (`Activate`):** Fiyatı ve stoğu `> 0` olan seçili listing'leri `POST .../activate` ile yeniden satışa açma.
      - **Ön Eşleşme (`PRE_MATCHED`) Onayla:** Barkoddan eşleşip satıcı onayı bekleyen ürünleri `POST /product/api/products/approve-prematch` ile tek tıkla onaylama.
      - **Onay Bekleyen Katalog Ürünlerini Sil:** Henüz envantere yansımamış/aksiyon bekleyen ürünleri `POST /product/api/products/delete-process` (`[{ merchant, merchantSku }]`) ile silme (aktif listing'ler için HB kuralları gereği satışa kapatma uyarısıyla birlikte).

### [x] Adım 6: Canlı Hepsiburada Buybox Fiyat Rekabet Robotu Entegrasyonu
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`fetchHepsiburadaBuyboxOrders`), `src/app/api/state/route.ts` (`run_price_robot`, `add_price_robot_item`), `src/components/views/BulkAndRobotView.tsx`
- **Detaylar:**
  - `marketplace === 'hepsiburada'` olan aktif robot kalemleri için `GET /listings/merchantid/{merchantId}` üzerinden `hepsiburadaSku` (`HBSKU`) kodlarını eşleştir ve `GET /buybox-orders/merchantid/{merchantId}?skuList=...` servisinden **canlı `rank` (Buybox sırası)** ve **kazanan Buybox fiyatını** çek (Trendyol kalemleri için de mevcut akışı koru/geliştir).
  - Rakip fiyat bizim fiyatımızdan düşükse, **`Math.max(item.minFloorPrice, prod.minPrice || 0)` dip fiyatının altına asla inmeden** yeni hedef fiyatı (`buyboxPrice - stepAmount`) hesapla.
  - Yalnızca yerel veritabanını güncellemekle kalmayıp, değişen Hepsiburada fiyatlarını `POST /listings/merchantid/{merchantId}/price-uploads` (veya `inventory-uploads`) ile canlı Hepsiburada mağazasına ilet ve `operationLogs` altına kaydet.

### [x] Adım 7: Gerçek Hepsiburada Sipariş Çekme, Paketleme, Kargo Etiketi, Fatura Linki ve Çapraz Stok Düşme (`2.7.b`)
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`pullOrdersFromMarketplace`, `createHepsiburadaPackage`, `fetchHepsiburadaCargoLabel`, `sendHepsiburadaInvoiceLink`)
  - Düzenle: `src/app/api/state/route.ts`, `src/app/api/cron/sync/route.ts`, `src/components/views/OrdersAndClaimsView.tsx`
- **Detaylar:**
  - `pullOrdersFromMarketplace(account)` içine gerçek Hepsiburada OMS entegrasyonunu ekle:
    - `account.hbOrderPullStatus === 'packageable'` ise `GET /orders/merchantid/{merchantId}?offset=0&limit=50` + `GET /packages/merchantid/{merchantId}?offset=0&limit=50` uçlarını birlikte okuyarak hem paketlenebilir siparişleri hem oluşmuş paketleri normalize et.
    - `gs.customerHBWaitingOrderStatus === true` ise `GET /orders/merchantid/{merchantId}/paymentawaiting` ucundaki siparişleri `status: 'pending'` olarak çek.
    - `account.autoConfirmOrders === true` ise paketlenebilir sipariş kalemleri için opsiyonel paket oluşturma (`POST /packages/merchantid/{merchantId}`) desteğini bağla.
  - **Çapraz Pazaryeri Stok Düşme:** Yeni çekilen her Hepsiburada siparişi `reservedOrderStock` değerini artırır, `netAvailableStock` değerini düşürür ve aktif bir Trendyol hesabı varsa düşülmüş net stoğu **otomatik olarak Trendyol API'sine de gönderir** (ve tersi: Trendyol siparişi geldiğinde Hepsiburada `inventory-uploads` otomatik tetiklenir!).
  - **Kargo Fişi & Fatura:** Hepsiburada paket barkodu (`packageNumber` / `barcode`) ve kargo firması bilgisini `OrdersAndClaimsView.tsx` kargo etiketi yazdırma modalına bağla; ayrıca resmi HB etiketi (`GET .../labels?format=PDF`) indirme/görüntüleme ve fatura kesildiğinde HB'ye fatura bilgisi iletme (`PUT .../invoice`) desteğini ekle.

### [x] Adım 8: Canlı Hepsiburada İade ve Talep (`Claims`) Yönetimi
- **Dosyalar:**
  - Düzenle: `src/lib/marketplace-api.ts` (`pullClaimsFromMarketplace`, `resolveHepsiburadaClaim`)
  - Düzenle: `src/app/api/state/route.ts`, `src/lib/validators.ts`, `src/components/views/OrdersAndClaimsView.tsx`
- **Detaylar:**
  - `OrdersAndClaimsView.tsx` → **İade Yönetimi (`claims`)** sekmesine **"Canlı İadeleri Getir (API)"** butonu ekle (`pull_claims`).
  - Hepsiburada için `GET /claims/merchantId/{merchantId}/status/awaitingaction` (ve `awaitingpreapproval`, `accepted`, `rejected`) uçlarından gelen talepleri `ClaimItem` yapısına dönüştürerek kaydet (Trendyol için de `/claims` çekme ucunu eşzamanlı bağla).
  - Durumu `'pending'` (`AwaitingAction`) olan Hepsiburada talepleri için arayüze **"Onayla"** (`POST /claims/number/{claimNumber}/accept`) ve **"Reddet (Açıklama ile)"** (`POST /claims/number/{claimNumber}/reject` — `ClaimRejectionReason` + `MerchantStatement`) aksiyon butonları ve onay modalı ekle.

---

## 4. Güvenlik, Performans ve Doğrulama Planı

- [x] **Zod & Kiracı İzolasyonu:** Eklenen 11 yeni Hepsiburada aksiyonu `src/lib/validators.ts` şemalarına eklendi; tüm sorgu ve işlemlerde oturumdaki `tenantId` zorunlu tutuldu, ortam değişkeni fallback'i yapılmadı.
- [x] **Serverless Timeout & Rate-Limit Koruması:** `src/lib/hepsiburada-client.ts` içinde `AbortSignal.timeout`, büyük listelerde chunk'lama (`import`: 1.000, `inventory-uploads`: 4.000) ve `429` yanıtlarında kontrollü bekleme uygulandı.
- [x] **Derleme Doğrulaması:** `npx tsc --noEmit` (0 hata) ve `npm run build` (5.4s, `/` `11.5 kB`) başarıyla geçti; yerel salt-okunur HTTP kontrolü (`GET /login -> 200`, `GET /api/state -> 401`, `GET /api/cron/sync -> 401`) doğrulandı.
- [ ] **Canlı Yayın Sonrası Salt-Okunur Doğrulama (Kullanıcı Onaylı):** Canlıya (Vercel) alındıktan sonra panelden sırasıyla **Hepsiburada Ayarlarını Kaydet & Test Et**, **Hepsiburada Canlı & Yönetim (API) → HB Durumlarını Canlı Mağaza ile Eşitle**, **Kategoriler → Canlı HB Ara** ve ardından istenirse **1 Ürün (Canlı Test)** gönderimi ile doğrulanacak.

---

## 5. Netleştirilen Kararlar ve Canlı Mağaza Güvenlik Protokolü (26.11.2026)

1. **Entegratör Bilgileri (`kodanka_dev`):**
   - `User-Agent`: `kodanka_dev` olarak kullanılacak.
   - Supabase `public.marketplace_accounts` tablosunda LuneRose mağazası için `Merchant ID` (`fea9499f-fc24-4c45-bbcc-e367e7896bd7`), `api_key: kodanka_dev` ve `api_secret` (Servis Anahtarı) kaydının hazır olduğu doğrulandı.
2. **SIT Test Hesabı Olmadan Canlıda Sıfır Riskli Doğrulama:**
   - Varsayılan ortam doğrudan **Production** (`mpop.hepsiburada.com`, `listing-external.hepsiburada.com`, `oms-external.hepsiburada.com`) olacak.
   - Geliştirme ve doğrulama aşamasında canlı mağazaya **hiçbir yazma/silme (`POST`/`PUT`/`DELETE`) isteği atılmadan**, yalnızca **salt-okunur (`GET`)** uçlar (bağlantı testi, canlı listing kontrolü, kategori çekme, sipariş ve iade okuma) ile gerçek kimlik doğrulaması test edilecek.
   - Canlıya çıktıktan sonra ise arayüzdeki **"1 Ürün Test Gönderimi"** seçeneğiyle önce tek bir ürün üzerinde kontrollü doğrulama yapılabilecek.
   - Mevcut veritabanında eski sahte koddan dolayı `hepsiburada_sync_status = 'synced'` görünen `3.272` ürün, yeni **"HB Durumlarını Canlı Mağaza ile Eşitle"** aracıyla gerçek Hepsiburada envanterine göre temizlenip güncellenebilecek.
