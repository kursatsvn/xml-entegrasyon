# Faz 3 — Veri Mimarisi, Performans ve Hata Yönetimi Uygulama Planı

> **İlgili Takip Dosyası:** `DENETIM_RAPORU_VE_TAKIP.md`  
> **Kapsanan Denetim Maddeleri:** `2.4 (Yönetilmeyen Promise / catch Eksikliği & Mükerrer Form Gönderimi)`, `2.8.a (minPrice & marketplaceDescriptions DB Şeması)`, `2.9 (GET /api/state Yazma Yan Etkisi & Lost Update Azaltma)`, `4.1 (Supabase Hata Kontrolü & Sessiz Seed Fallback Kaldırma)`, `4.2 (Pazaryeri Stok/Fiyat Hata Raporlaması)`, `4.3 (Auth/Upload'da Gereksiz Ürün Yüklemesini Kaldırma, SELECT * & Çift Varyant Yazımı + Senkron fs Blokajı)`, `4.4 (Set-Tabanlı Toplu Upsert, Eksik İndeksler & Fetch Timeout)`  
> **Canlı Satış Güvenliği Garantisi:** Faz 3 boyunca mevcut XML fiyat/stok hesaplama mantığına (`pricing-engine.ts`), Trendyol/Hepsiburada gönderim yüklerine ve canlı ürün verilerine **dokunulmaz**; testler sırasında hiçbir canlı XML senkronizasyonu veya pazaryeri yazma çağrısı tetiklenmez.

---

## 1. Atomik Uygulama Adımları

### [x] Adım 1: Veritabanı Şeması, İndeksler ve Set-Tabanlı Upsert (`supabase/migrations/0007_phase3_perf_and_schema.sql`)
- `public.products` tablosuna eksik `min_price NUMERIC(12,2)` ve `marketplace_descriptions JSONB NOT NULL DEFAULT '{}'::jsonb` sütunlarını ekle (`2.8.a`).
- Birleşik performans indekslerini oluştur (`4.4`):
  - `idx_products_tenant_status (tenant_id, status)`
  - `idx_products_tenant_updated (tenant_id, updated_at DESC)`
  - `idx_orders_tenant_date (tenant_id, order_date DESC)`
  - `idx_operation_logs_tenant_created (tenant_id, created_at DESC)`
  - `idx_sync_batches_tenant_created (tenant_id, created_at DESC)`
  - `idx_xml_sync_reports_tenant_completed (tenant_id, completed_at DESC)`
- `sopyo_get_products_chunk` içinden `SELECT *` kaldırıp açık kolon listesiyle `minPrice` ve `marketplaceDescriptions` alanlarını döndür (`4.3`).
- `sopyo_upsert_products_chunk` içindeki iç içe `FOR` döngülerini ve okunmayan `product_variants` çift yazımını kaldırıp tek sorguluk set-tabanlı `INSERT ... SELECT ... FROM jsonb_array_elements(...) ON CONFLICT` yapısına geçir (`4.3`, `4.4`).
- Tüm güncellenen RPC izinlerini yalnızca `service_role` olarak kilitle (`0 WARN` korunsun).

### [x] Adım 2: Sunucu Veri Katmanı Sertleştirme & `GET /api/state` Yan Etkisinin Kaldırılması
- `src/lib/store.ts`:
  - `readDbAsync(options?: { skipProducts?: boolean })` desteğini ekle; `/api/auth` ve `/api/upload/logo` uç noktaları artık tüm ürün kataloğunu çekmeden sadece meta tabloları okuyacak (`4.3`).
  - Paralel `sopyo_get_products_chunk` çağrılarının tamamında `res.error` kontrolü yap; Supabase aktifken okuma hatasında sessizce 12 ürünlük yerel seed veriye düşmek yerine hata fırlat (`4.1`).
  - Supabase aktifken `writeDbAsync` içinde senkron `fs.writeFileSync` disk blokajını kaldır; yerel JSON modunda atomik dosya yazımı kullan (`4.3`).
- `src/app/api/state/route.ts`:
  - `GET /api/state` içindeki otomatik XML çekme ve `writeDbAsync` yan etkisini kaldır; `GET` tamamen salt-okunur olsun (`2.9`).
  - `save_product` içinde `minPrice` ve `marketplaceDescriptions` alanlarını koru (`2.8.a`).

### [x] Adım 3: Pazaryeri `fetch` Zaman Aşımı ve Hata Raporlaması (`4.2`, `4.4`)
- `src/lib/marketplace-api.ts`:
  - Gönderim payload'larına ve fiyat/stok kurallarına **dokunmadan**, `fetchLiveTrendyolProducts`, `archiveLiveTrendyolProducts` ve `deleteLiveTrendyolProducts` içindeki tüm dış `fetch` isteklerine `AbortSignal.timeout(12000)` ekle (`4.4`).
  - `syncPriceAndInventoryToMarketplace` içinde `!res.ok` veya ağ hatası durumunda hatayı yutup `errorCount: 0` dönmek yerine gerçek hata bilgisini `errors` dizisine ekle (`4.2`).

### [x] Adım 4: Merkezi İstemci Hata Yakalayıcısı ve Çift Gönderim Kilidi (`2.4`)
- Yeni: `src/lib/api-client.ts` (`apiPost` güvenli JSON/HTTP/ağ hata sarmalayıcısı).
- Düzenleme: `ProductsView.tsx`, `XmlView.tsx`, `CatalogMappingsView.tsx`, `OrdersAndClaimsView.tsx`, `BulkAndRobotView.tsx`, `SettingsAndAdminView.tsx` — eksik tüm `catch` bloklarını ve `isSubmitting` / buton disable kilitlerini tamamla.

---

## 2. Doğrulama Adımları (Canlı API/XML Tetiklemeden)

- [x] Supabase Security Advisor (`0 ERROR`, `0 WARN` korunduğu doğrulandı; 6 yeni performans indeksi ve `min_price`/`marketplace_descriptions` sütunları canlıda doğrulandı).
- [x] `npx tsc --noEmit` ve `npm run build` sıfır hata ile geçti (3.2s).
- [x] Salt-okunur canlı HTTP testleri (`next start -p 3099`): `POST /api/auth` (`200`), `GET /api/auth` (`200`, `70 ms`), `GET /api/state` (`200`, yan etkisiz, `1557` ürün, maskeli secret), `POST /api/state` Zod (`400`), `GET /api/cron/sync` yetkisiz (`401`) — hiçbir canlı XML/Trendyol/Hepsiburada yazması tetiklenmeden doğrulandı.
