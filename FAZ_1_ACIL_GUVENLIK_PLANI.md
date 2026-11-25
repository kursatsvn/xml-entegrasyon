# Faz 1 — Acil Güvenlik Yamaları (Canlı Sistem Koruması) Uygulama Planı

> **İlgili Takip Dosyası:** `DENETIM_RAPORU_VE_TAKIP.md`  
> **Kapsanan Denetim Maddeleri:** `3.1`, `3.2 (a, b)`, `3.3`, `2.6`, `3.4`, `3.5 (a)`, `3.6`, `3.7`, `3.8`, `3.9`, `3.10 (Mass Assignment)`, `4.2 (Hata/Token Sızıntısı)`  
> **Hedef:** Veri mimarisini veya mevcut kullanıcı arayüzü akışını bozmadan, canlı ortamdaki **yetkisiz erişim, hesap ele geçirme, kiracılar arası veri sızıntısı, SSRF ve açık RPC/Cron** zafiyetlerini atomik olarak kapatmak.

---

## 1. Yaklaşım ve Mimari Kararlar

Faz 2'de tam `@supabase/ssr` + Supabase Auth dönüşümü yapılana kadar canlı sistemin tek bir dakika bile korumasız kalmaması için **geriye dönük uyumlu ama kriptografik olarak kapalı (fail-closed)** bir güvenlik katmanı uygulanacaktır:

1. **İmzalı Oturum Token'ı (`HMAC-SHA256` Web Crypto):** Hem Next.js Edge `middleware.ts` hem de Node.js API Route'larında sıfır ek paketle çalışan `src/lib/session.ts` oluşturulacak; imzasız Base64 çerezler ve oturumsuz `db.users[0]` (`super_admin`) fallback'i tamamen kaldırılacaktır.
2. **Kiracı İzolasyonu ve Sır Maskeleme:** `GET /api/state` yanıtında pazaryeri `apiSecret` değerleri `'••••••••'` ile maskelenecek (kaydetme sırasında maskeli değer gelirse mevcut sır korunacak) ve yabancı kiracıların `process.env.TRENDYOL_*` anahtarlarına erişmesi engellenecektir.
3. **Ağ ve Veritabanı Sınır Koruması:** XML URL'leri DNS/IP doğrulamalı SSRF filtresinden (`src/lib/url-guard.ts`) geçirilecek, `/api/cron/sync` `CRON_SECRET` ile kilitlenecek ve Supabase'deki 5 `SECURITY DEFINER` RPC fonksiyonu `anon`/`authenticated` rollerine kapatılıp yalnızca `service_role` rolüne açılacaktır.

---

## 2. Kapsam (Scope)

- **Kapsam İçi (In-Scope):**
  - Sızmış XML token ve sabit şifre/ID kalıntılarının temizlenmesi
  - HMAC-SHA256 imzalı oturum çerezi, `src/middleware.ts` rota koruması, boş şifre bypass kapatma ve `switch_tenant` yetki/parametre düzeltmesi
  - Pazaryeri `apiSecret` maskelemesi, kiracılar arası `process.env` fallback'lerinin kaldırılması ve Mass Assignment (`plan`/`maxProducts` ezilmesi) engeli
  - `/api/cron/sync` `Bearer CRON_SECRET` doğrulaması ve XML SSRF / boyut / timeout koruması + hata mesajı sanitizasyonu
  - Supabase `0005_phase1_security_hardening.sql` migration dosyası (`REVOKE ... FROM anon, authenticated`, `private.server_config` RLS) ve `next.config.mjs` güvenlik başlıkları
- **Kapsam Dışı (Out-of-Scope — Sonraki Fazlar):**
  - `@supabase/ssr` + Supabase Auth (`auth.users`) göçü ve `zod` şemaları *(Faz 2)*
  - `readDbAsync`/`writeDbAsync` monolitik yapısının parçalanması *(Faz 3)*
  - Hepsiburada katalog/sipariş API uç noktalarının yazılması *(Faz 4)*
  - Tailwind v4 `@theme` ve App Router sayfa bölünmesi *(Faz 5)*

---

## 3. Atomik Uygulama Adımları (Action Items)

### [x] Adım 1: Sızmış Token ve Sabit Sırların Koddan Temizlenmesi
- **Düzenlenecek Dosyalar:**
  - `src/components/views/XmlView.tsx` (Satır: 639)
  - `src/lib/store.ts` (Satır: 90-151)
  - `.env.example` (Satır: 1-25)
- **Yapılacak İşlem:**
  1. `XmlView.tsx:639` içindeki gerçek Ticimax XML token'ını `YOUR_XML_TOKEN` ile değiştirin.
  2. `store.ts:97` içindeki `'admin123'` sabit şifre fallback'ini kaldırıp `process.env.ADMIN_INITIAL_PASSWORD || ''` yapın; `store.ts:132` içindeki sabit Hepsiburada Merchant UUID fallback'ini kaldırın.
  3. `.env.example` içine `SESSION_SECRET=` ekleyin ve `CRON_SECRET` değerini örnek yer tutucuya çevirin.

### [x] Adım 2: İmzalı Oturum Katmanı (`src/lib/session.ts`) ve `src/middleware.ts` Oluşturulması
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Yeni: `src/lib/session.ts`
  - Yeni: `src/middleware.ts`
  - Düzenleme: `src/app/api/auth/route.ts` (Satır: 8-227)
  - Düzenleme: `src/app/page.tsx` (Satır: 169-205)
  - Düzenleme: `src/components/views/SettingsAndAdminView.tsx` (Satır: 149-168)
- **Yapılacak İşlem:**
  1. `src/lib/session.ts` içinde Web Crypto `crypto.subtle` (`HMAC-SHA256`) kullanan `signSessionToken`, `verifySessionToken` ve güvenli çerez ayarlarını (`httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 gün`) oluşturun. İmza anahtarı olarak `SESSION_SECRET || SUPABASE_SERVER_SECRET` kullanın (üretimde ikisi de yoksa hata fırlatın).
  2. `src/middleware.ts` oluşturarak geçerli imzalı çerezi olmayan `/` isteklerini `/login` sayfasına yönlendirin, `/api/state` isteklerine ise erken `401` döndürün.
  3. `src/app/api/auth/route.ts` içinde:
     - `GET` ve `POST` içindeki tüm `db.users[0]` fallback'lerini kaldırın (`401 Unauthorized` döndürün).
     - `POST` gövdesini `try/catch` içine alın.
     - `login` aksiyonunda `(!u.password || ...)` boş şifre açığını kapatıp dolu şifre + sabit zamanlı karşılaştırma zorunlu kılın.
     - `switch_tenant` aksiyonunda `currentUser.role !== 'super_admin'` ise `403 Forbidden` döndürün; `body.targetTenantId` parametresini kabul edip hedef mağazanın varlığını doğrulayın ve `message` alanı döndürün.
  4. `src/app/page.tsx` (`fetchState`) içinde `res.status === 401` durumunda `router.replace('/login')` çalıştırın ve `!res.ok` ise `setData` çağırmadan güvenli hata ekranı gösterin.

### [x] Adım 3: Kiracı İzolasyonu, `apiSecret` Maskeleme ve Mass Assignment Engeli (`src/app/api/state/route.ts`)
- **Düzenlenecek Dosya:** `src/app/api/state/route.ts` (Satır: 25-58, 144-155, 175-190, 567-609, 693-703, 743-769, 1087-1129, 1194-1347)
- **Yapılacak İşlem:**
  1. `resolveCurrentTenantId` fonksiyonunu imzalı çerez doğrulayacak şekilde güncelleyin; oturumsuz veya pasif kullanıcı/kiracı isteklerini `401`/`403` ile reddedin.
  2. `GET /api/state` içinde `marketplaceAccounts` dizisindeki dolu `apiSecret` değerlerini `'••••••••'` olarak maskeleyin; `save_marketplace_account` içinde istemciden `'••••••••'` gelirse veritabanındaki mevcut `apiSecret` değerini koruyun.
  3. `GET /api/state` (Satır: 55-57) ve canlı Trendyol aksiyonlarındaki (`fetch_live_trendyol_products`, `archive_live_trendyol_products`, `delete_live_trendyol_products`) `process.env.ARIASCLOSET_XML_URL` ve `process.env.TRENDYOL_*` fallback'lerini kaldırın; kiracının kendi API anahtarı yoksa `400` döndürün.
  4. `update_tenant_settings`, `save_xml_source`, `save_product` ve `save_category_mapping` içinde korumalı alanların (`id`, `tenantId`, `plan`, `licenseExpiresAt`, `isActive`, `maxXmlSources`, `maxProducts`) kullanıcı girdisiyle ezilmesini engelleyin ve boş gövde (`!incoming`) kontrolleri ekleyin.
  5. En alttaki `catch` bloğunda iç veritabanı/URL hatalarını sunucu konsoluna loglayıp istemciye yalnızca güvenli mesaj döndürün.

### [x] Adım 4: XML SSRF Koruması (`src/lib/url-guard.ts`) ve Cron Kimlik Doğrulaması
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Yeni: `src/lib/url-guard.ts`
  - Düzenleme: `src/lib/xml-engine.ts` (Satır: 45-115)
  - Düzenleme: `src/app/api/cron/sync/route.ts` (Satır: 1-101)
  - Düzenleme: `.github/workflows/xml-sync-cron.yml` (Satır: 10-16)
- **Yapılacak İşlem:**
  1. `src/lib/url-guard.ts` içinde `assertSafeExternalXmlUrl(url)` fonksiyonunu yazın: yalnızca `https:` protokolüne ve standart porta izin verin, `dns.promises.lookup` ile çözümlenen tüm özel/loopback/link-local/metadata IPv4 ve IPv6 adreslerini (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `::1`, `fc00::/7`, `fe80::/10`) engelleyin.
  2. `xml-engine.ts` içindeki `fetch` çağrılarına `assertSafeExternalXmlUrl`, `redirect: 'error'`, `AbortSignal.timeout(15000)`, maksimum `25 MB` gövde sınırı ve URL token'ını sızdırmayan hata mesajları ekleyin.
  3. `/api/cron/sync/route.ts` dosyasına `export const dynamic = 'force-dynamic'` ve sabit zamanlı (`crypto.timingSafeEqual`) `Authorization: Bearer <CRON_SECRET>` doğrulaması ekleyin; pazaryeri senkronizasyon döngüsünü kiracı bazlı `try/catch` içine alın.
  4. `.github/workflows/xml-sync-cron.yml` dosyasını `Authorization: Bearer ${{ secrets.CRON_SECRET }}` başlığı gönderecek şekilde güncelleyin.

### [x] Adım 5: Supabase RPC Yetki Kısıtlaması ve `next.config.mjs` Güvenlik Başlıkları
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Yeni: `supabase/migrations/0005_phase1_security_hardening.sql`
  - Düzenleme: `src/lib/supabase.ts` (Satır: 1-32)
  - Düzenleme: `next.config.mjs` (Satır: 1-17)
- **Yapılacak İşlem:**
  1. `0005_phase1_security_hardening.sql` içinde:
     - `ALTER TABLE private.server_config ENABLE ROW LEVEL SECURITY;`
     - `sopyo_get_meta_state`, `sopyo_get_products_chunk`, `sopyo_save_meta_state`, `sopyo_upsert_products_chunk` ve `sopyo_mark_missing_products_deleted` fonksiyonlarından `PUBLIC`, `anon`, `authenticated` `EXECUTE` izinlerini geri alıp yalnızca `service_role` rolüne verin.
     - `private.assert_server_secret` içinde `pgcrypto` `digest()` ile sabit uzunluklu karşılaştırma kullanın.
  2. `src/lib/supabase.ts` içine istemci tarafında import edilmeyi engelleyen çalışma zamanı koruması (`typeof window !== 'undefined'`) ekleyin ve sunucu istemcisinin `SUPABASE_SERVICE_ROLE_KEY` ile çalışmasını zorunlu kılın.
  3. `next.config.mjs` içinde `http` wildcard görsel kuralını kaldırıp yalnızca `https` bırakın, `headers()` altında temel güvenlik başlıklarını (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) tanımlayın ve `eslint.ignoreDuringBuilds: false` için kullanılmayan küçük import uyarılarını temizleyin.

---

## 4. Doğrulama ve Test Adımları (Validation)

- [x] **Derleme ve Tip Kontrolü:** `npx tsc --noEmit` ve `npm run build` komutlarının sıfır hata ile tamamlandığını doğrula.
- [x] **Oturum ve Middleware Testi:** Çerez olmadan `GET /api/state` ve `POST /api/state` çağrılarının `401` döndüğünü, `/` adresinin `/login`'e yönlendiğini ve elle değiştirilmiş Base64 çerezin reddedildiğini doğrula.
- [x] **Yetki ve Sır Maskeleme Testi:** Giriş sonrası `GET /api/state` çıktısında `apiSecret` alanının `'••••••••'` geldiğini ve normal `owner` hesabının `switch_tenant` çağrısında `403` aldığını doğrula.
- [x] **Cron ve SSRF Testi:** Başlıksız `GET /api/cron/sync` çağrısının `401` döndüğünü; `inspect_xml_nodes` içine `http://169.254.169.254` veya `http://127.0.0.1` verildiğinde SSRF korumasının isteği engellediğini doğrula.

---

## 5. Uygulama Öncesi Açık Sorular / Ön Koşul Kontrolü

1. **`SUPABASE_SERVICE_ROLE_KEY` Durumu:** `.env.local` dosyasında şu an yalnızca `CRON_SECRET` ve `SUPABASE_SERVER_SECRET` tanımlı görünmektedir. Supabase'de `anon` rolünün RPC çalıştırma yetkisini kapattığımızda (`Adım 5`), uygulamanın Supabase'e bağlanabilmesi için `.env.local` ve Vercel ortam değişkenlerinde **`SUPABASE_SERVICE_ROLE_KEY`** tanımlı olmalıdır. Bu anahtarı ekleyecek misiniz, yoksa geçiş süresince yerel/mevcut ortam için geçici uyumluluk korunsun mu?
2. **`ADMIN_INITIAL_PASSWORD` Durumu:** Sabit `'admin123'` şifresi kaldırıldığında yerel geliştirme ortamında ilk kurulum için `.env.local` içine bir `ADMIN_INITIAL_PASSWORD` tanımlamanız gerekecektir (mevcut `data/sopyo-db.json` veya Supabase içindeki kayıtlı kullanıcı şifresi ise etkilenmez).
