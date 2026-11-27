# Faz 8 — Supabase `pg_cron` 3 Saatlik Dakik Zamanlayıcı, `/api/cron/sync` Hız Optimizasyonu ve Canlı Hepsiburada İyileştirmeleri

> **Tarih:** 26–27.11.2026  
> **İlgili Takip Dosyaları:** `planlar/DENETIM_RAPORU_VE_TAKIP.md`, `planlar/FAZ_6_HEPSIBURADA_API_TAM_ENTEGRASYON_PLANI.md`, `planlar/FAZ_7_ISLEM_GERIBILDIRIM_VE_SAYFA_KORUMA_PLANI.md`  
> **İlgili Commit'ler:** `1320eef`, `bdb9897`, `f48ee17`  
> **Kapsam:** Canlı Hepsiburada MPOP şema/paket/kategori sertleştirmeleri + GitHub Actions gecikme/timeout sorununun kök çözümü olarak **Supabase `pg_cron + pg_net`** geçişi ve `/api/cron/sync` paralel/diferansiyel hızlandırması.

---

## 1. Canlı Hepsiburada Gönderim Sertleştirmeleri (`1320eef` & `bdb9897`)

Faz 6 canlı testleri (`#803260` – `#803263`) sırasında gerçek Hepsiburada MPOP yanıtları ve Vercel runtime logları analiz edilerek aşağıdaki kalıcı iyileştirmeler devreye alındı:

1. **Dinamik MPOP Kategori Şeması ve Gerçek Alan Adları (`src/lib/hepsiburada-api.ts`, `src/lib/hepsiburada-catalog.ts`):**
   - `tax_rate` yerine resmi MPOP KDV alanı **`tax_vat_rate`** kullanıldı.
   - Sabit `ebatlar_variant_property` yerine her kategorinin gerçek MPOP şeması (`baseAttributes`, `attributes`, `variantAttributes` + izinli enum listeleri) **6'lı paralel** ve 30 dk önbellekli çekilerek `beden_variant_property`, `renk_variant_property` ve tüm `mandatory: true` özellikler gerçek enum değerleriyle dolduruldu.
   - Tracking hata mesajları `${attributeName}: ${message}` formatına geçirildi.
2. **250'li Güvenli Paketleme, Otomatik Retry ve Paralel DB Yazımı (`src/lib/hepsiburada-api.ts`, `src/lib/store.ts`):**
   - MPOP `import` paket boyutu `1000` varyanttan **`250` varyanta** düşürüldü; timeout **`45 sn`** yapıldı ve geçici **`HTTP 0 / 429 / 5xx`** hataları için **3 denemeli otomatik retry (backoff)** + 2'li paralel gönderim eklendi.
   - Çoklu paket gönderimlerinde üretilen **tüm `trackingId`** kayıtlarının 4'lü paralel sorgulanması sağlandı (`remote_batch_id` 255 karakter sütun sınırına uygun `<ilk-uuid> (+N paket)` olarak kaydedildi).
   - Supabase `sopyo_upsert_products_chunk` yazımı **4'lü paralel** hale getirilerek 300 sn Vercel timeout riski ortadan kaldırıldı.
3. **Sıkı Kategori Eşleştirme Koruması ve Eksik/Hatalı Gönderim Modu (`src/lib/hepsiburada-catalog.ts`, `src/lib/category-matcher.ts`, `src/components/views/BulkAndRobotView.tsx`):**
   - `Mobilya`, `Ev Dekorasyon`, `Taraftar / Spor Outdoor`, yanlış `Bebek / Çocuk / Erkek` ve (XML'de belirtilmeyen) `Hamile / Lohusa` dalları kesin olarak engellendi; yaprak kategori adı önceliğiyle `Pijama Takımı` / `Şortlu Pijama Takımı` doğrudan **Pijama** (`60000734`) dalına bağlandı.
   - Toplu Gönderim ekranına **"Sadece henüz gönderilmemiş veya hatalı aktif ürünleri gönder (`onlyUnsent`)"** seçeneği eklendi.

---

## 2. GitHub Actions Cron Analizi ve Zamanlayıcı Karşılaştırması

### 2.1. Tespit Edilen 2 Kritik Sorun
1. **`Run #45994666319` (`27.11.2026 11:57:35 UTC`) Sahte Zaman Aşımı:**
   - Vercel üzerindeki `/api/cron/sync` gerçekte **`69.3 saniyede` sıfır hatayla tamamlanıp** Supabase `operation_logs` tablosuna `success` (`1589 aktif temiz ürün`) kaydını yazdı.
   - Ancak `.github/workflows/xml-sync-cron.yml` içindeki `curl --max-time 60` sınırı 60. saniyede bağlantıyı kestiği için GitHub Actions kırmızı uyarı verdi.
2. **GitHub Actions `schedule` Gecikmesi ve Öğün Atlaması:**
   - `0 */3 * * *` (3 saatte bir = günde 8 kez) tanımlı olmasına rağmen GitHub'ın paylaşımlı zamanlayıcısı son 4 günde **10 ila 14 saat arayla** (günde yalnızca 2–3 kez) tetiklendi.

### 2.2. Neden `cron-job.org` Yerine `Supabase pg_cron + pg_net` Seçildi?
- **`cron-job.org` Ücretsiz Plan Kısıtı:** Kesin **30 saniye** HTTP timeout sınırı vardır; 1.600+ ürünlük XML + çift pazaryeri senkronizasyonu 30 saniyeyi aştığında isteği hata sayıp görevi otomatik olarak devre dışı bırakır.
- **`Supabase pg_cron + pg_net` Avantajı:** Projenin kendi PostgreSQL veritabanı (`zyxehisqqbofetepcdmb`) içinde çalışır; dış üyelik gerektirmez, **saniyesi saniyesine tam 3 saatte bir** (`00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00` TSİ/UTC) çalışır ve **`180 saniye` (`180000 ms`) timeout** destekler.

---

## 3. Uygulanan Mimari ve Hız Optimizasyonları (`f48ee17`)

- [x] **1. Supabase `pg_cron` + `pg_net` Kurulumu (`supabase/migrations/0008_pg_cron_3h_xml_sync.sql`):**
  - `pg_net` ve `pg_cron` eklentileri etkinleştirildi.
  - RLS korumalı `private.server_config` tablosuna Vercel Production `CRON_SECRET` değerini kod veya loglara sızdırmadan eşitleyen `public.sopyo_ensure_cron_config` (`SECURITY DEFINER`, yalnızca `service_role` + `server_secret`) fonksiyonu eklendi.
  - `private.trigger_3h_xml_sync()` fonksiyonu ve `sopyo-3h-xml-sync` (`0 */3 * * *`, `active: true`, `180000 ms` timeout) zamanlayıcısı canlı veritabanında devreye alındı.
- [x] **2. `/api/cron/sync` Hız ve İş Mantığı Optimizasyonu (`src/app/api/cron/sync/route.ts`):**
  - `export const maxDuration = 300;` ve yan etkisiz sağlık/yetki doğrulaması için `HEAD /api/cron/sync` eklendi.
  - **Fark Bazlı DB Yazımı (`productFingerprint`):** Her 3 saatte bir tüm 1.615 ürünü yeniden yazmak yerine yalnızca yeni eklenen veya stok/fiyat/durumu gerçekte değişen ürünler Supabase'e yazılıyor (`src/lib/store.ts` boş `onlyProductIds: []` desteğiyle birlikte).
  - **Otomatik Sipariş Kaydı ve Çapraz Stok Düşümü:** Cron sırasında Trendyol ve Hepsiburada'dan paralel çekilen yeni siparişler `orders` tablosuna kaydedilip `reservedOrderStock` düşülerek net stoklar karşı pazaryerine anında iletiliyor.
  - **Paralel Pazaryeri Eşitleme (`Promise.all`):** Trendyol ve Hepsiburada stok/fiyat + yeni ürün gönderimleri paralel çalışıyor; Trendyol `price-and-inventory` gönderimi de tüm 7.200+ varyantı kapsayacak şekilde 1.000'li 3'lü paralel paketlere çıkarıldı (`src/lib/marketplace-api.ts`).
  - **Hatalı `not_sent` Döngüsü Kapatıldı:** Pazaryerinin reddettiği (+18 görsel vb.) ürünler `'error'` olarak işaretlenerek her 3 saatte bir tekrar tekrar gönderilmesi engellendi (otomatik yeni ürün gönderimi çalışması başına `80` ürünle sınırlandı).
- [x] **3. Çakışma Önleme (`.github/workflows/xml-sync-cron.yml`, `vercel.json`):**
  - GitHub Actions zamanlaması kaldırılıp `--max-time 240` ile yalnızca manuel yedek tetikleyici (`workflow_dispatch`) bırakıldı.
  - `vercel.json` günlük yedeği `03:00 UTC` çakışmaması için `30 4 * * *` (`07:30 TSİ`) saatine çekildi.
