# Faz 2 — Kimlik Doğrulama (`@supabase/ssr`), RLS Sıkılaştırma, Zod Doğrulama ve Storage Uygulama Planı

> **İlgili Takip Dosyası:** `DENETIM_RAPORU_VE_TAKIP.md`  
> **Kapsanan Denetim Maddeleri:** `3.2 (c — @supabase/ssr & Supabase Auth)`, `3.5 (b, c — Tam RLS + WITH CHECK + Tenant Kapsamlı Silme + 0029 Uyarısı)`, `3.10 (Zod Şema Doğrulaması + Mağaza Limitleri + HTML Sanitizer + Supabase Storage)`  
> **Hedef:** Özel şifre/çerez sistemini tamamen kaldırıp resmi **`@supabase/ssr` + Supabase Auth (`getUser()`)** mimarisine geçmek, tüm 16 tabloda yetki yükseltmeye kapalı **granüler RLS politikalarını** devreye almak, tüm API mutasyonlarını **`zod`** ile doğrulamak ve firma logosunu **Supabase Storage**'a taşımak.

---

## 1. Mevcut Canlı Durum Analizi (Supabase MCP ile Doğrulandı)

- **Canlı Supabase Projesi:** `xml-entegrasyon` (`zyxehisqqbofetepcdmb`, PostgreSQL 17.12)
- **Mevcut Kayıtlı Kullanıcı:** `user_profiles` tablosunda yalnızca 1 kullanıcı (`user-zeki-47150` / `zekihamdicinarr@gmail.com` / `super_admin` / `auth_uid = NULL`).
- **Kalan Security Advisor Uyarısı:** Faz 1 sonrası yalnızca 1 uyarı kaldı: `0029` (`public.current_user_tenant_id()` fonksiyonunun `authenticated` rolüne `/rest/v1/rpc/...` üzerinden açık olması). Faz 2'de bu fonksiyon `private` şemasına alınarak **Security Advisor uyarı sayısı 0'a indirilecektir**.

---

## 2. Yaklaşım ve Mimari Kararlar

1. **Kesintisiz Auth Göçü (Zero-Downtime Lazy Migration):** Mevcut `user-zeki-47150` hesabı ve gelecekte eklenecek hesaplar için, `POST /api/auth` (`login`) ilk girişte `auth.users` kaydı yoksa mevcut doğrulanmış şifreyle `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` çalıştıracak, `user_profiles.auth_uid` bağlantısını kuracak ve `password_hash` sütununu `NULL` yaparak düz metin şifreyi kalıcı olarak silecektir.
2. **Sadece `supabase.auth.getUser()` Kuralı:** `src/middleware.ts`, `GET/POST /api/auth` ve `GET/POST /api/state` içinde sunucu tarafı oturum doğrulaması yalnızca `supabase.auth.getUser()` ile yapılacaktır (`getSession()` kesinlikle kullanılmayacaktır). Süper Admin'in mağaza değiştirme tercihi ise HMAC imzalı ayrı bir `sopyo_admin_tenant` çerezinde saklanacaktır.
3. **Veritabanı Seviyesinde Yetki Yükseltme Engeli (Defense-in-Depth):** `user_profiles` ve `tenants` tablolarında `SELECT / INSERT / UPDATE / DELETE` politikaları ayrılacak, `WITH CHECK` ve `BEFORE UPDATE` trigger'ları ile normal kullanıcıların `role`, `tenant_id`, `plan`, `max_products`, `license_expires_at` alanlarını değiştirmesi SQL seviyesinde imkansız hale getirilecektir.
4. **Sıkı Girdi Doğrulama & Güvenli Dosya Yükleme:** `zod` kurulacak, 21 API aksiyonunun tamamı tip güvenli şemalarla doğrulanacak, HTML ürün açıklamaları için allowlist sanitizer yazılacak ve firma logoları `image/svg+xml` yasaklanmış `tenant-logos` Supabase Storage bucket'ına yüklenecektir.

---

## 3. Kapsam (Scope)

- **Kapsam İçi (In-Scope):**
  - `@supabase/ssr` browser/server/middleware istemci katmanı (`src/lib/supabase/*`)
  - `src/middleware.ts`, `src/app/api/auth/route.ts` ve `src/app/api/state/route.ts` dosyalarının `supabase.auth.getUser()` ile yeniden yazımı
  - `supabase/migrations/0006_phase2_auth_rls_hardening.sql`: `private.current_user_tenant_id()`, granüler RLS + `WITH CHECK` + koruma trigger'ları, `tenant_id` kapsamlı silme RPC'leri, `tenant-logos` Storage bucket & politikaları
  - `zod` kurulumu, `src/lib/validators.ts`, `src/lib/html-sanitizer.ts` ve mağaza limit kontrolleri (`maxXmlSources`, `maxProducts`)
  - `POST /api/upload/logo` uç noktası ve `GeneralSettingsPanel.tsx` Storage entegrasyonu (tarayıcı `alert()` yerine `notify()`)
- **Kapsam Dışı (Out-of-Scope — Faz 3–5):**
  - `readDbAsync`/`writeDbAsync` monolitik state yapısının tablo bazlı doğrudan sorgulara bölünmesi *(Faz 3)*
  - Hepsiburada API ve eksik XML fiyat kuralı ekranları *(Faz 4)*
  - Tailwind v4 `@theme` ve App Router sayfa bölünmesi *(Faz 5)*

---

## 4. Atomik Uygulama Adımları (Action Items)

### [x] Adım 1: `@supabase/ssr` İstemci Katmanının Oluşturulması
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Yeni: `src/lib/supabase/client.ts` (`createBrowserClient`)
  - Yeni: `src/lib/supabase/server.ts` (`createSupabaseSsrServerClient` — Next.js 15 `await cookies()` ile `getAll` / `setAll`)
  - Düzenleme: `src/lib/supabase.ts` (`createSupabaseAdminClient` alias'ı + `isSupabaseAuthConfigured()`)
- **Yapılacak İşlem:**
  1. `src/lib/supabase/server.ts` içinde `@supabase/ssr`'nin `createServerClient` fonksiyonunu Next.js 15 async `cookies()` API'siyle sarmalayın.
  2. `src/lib/supabase/client.ts` içinde yalnızca `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` kullanan tarayıcı istemcisini tanımlayın.
  3. Sunucu tarafı yönetim işlemlerinde (`auth.admin.*`, Storage yönetimi, RPC) `service_role` istemcisinin yalnızca sunucu ortamında çalışmasını garanti edin.

### [x] Adım 2: Supabase RLS Sıkılaştırma, `private` Yardımcılar ve Storage Migration (`0006_phase2_auth_rls_hardening.sql`)
- **Oluşturulacak Dosya:** `supabase/migrations/0006_phase2_auth_rls_hardening.sql` *(ve Supabase MCP `apply_migration` ile canlıya uygulama)*
- **Yapılacak İşlem:**
  1. `public.current_user_tenant_id()` fonksiyonunu `private.current_user_tenant_id()` ve `private.current_user_role()` olarak `private` şemasına taşıyın (`GRANT USAGE ON SCHEMA private TO authenticated; GRANT EXECUTE ... TO authenticated;`), eski `public.current_user_tenant_id()` fonksiyonunu kaldırarak **0029 Security Advisor uyarısını tamamen temizleyin**.
  2. `public.user_profiles` üzerinde `idx_user_profiles_auth_uid` tekil indeksi oluşturun.
  3. Tüm 16 tablodaki eski `FOR ALL` politikalarını kaldırıp açık `SELECT / INSERT / UPDATE / DELETE` + `WITH CHECK` politikaları tanımlayın:
     - `public.tenants`: `owner` yalnızca kendi mağazasını okuyup güvenli profil alanlarını güncelleyebilir; `plan`, `max_xml_sources`, `max_products`, `license_expires_at`, `is_active` değişiklikleri `BEFORE UPDATE` trigger ile `super_admin` dışındaki rollere kapatılır.
     - `public.user_profiles`: Kullanıcı yalnızca kendi kaydını güncelleyebilir; `role`, `tenant_id`, `auth_uid`, `is_active` değişiklikleri `BEFORE UPDATE` trigger ile engellenir.
     - Diğer 14 tablo: Hem `USING` hem `WITH CHECK` içinde `tenant_id = private.current_user_tenant_id()`.
  4. `sopyo_save_meta_state` içinde `user_profiles.auth_uid` korunacak ve `xml_sources` soft-delete işlemi yalnızca ilgili kiracılarla kapsamlanacak; `sopyo_mark_missing_products_deleted` fonksiyonuna opsiyonel `p_tenant_id` kapsam desteği eklenecek.
  5. `tenant-logos` Supabase Storage bucket'ını (`public: true`, `512 KB` limit, yalnızca `image/png`, `image/jpeg`, `image/webp`) ve kiracı klasörü (`(storage.foldername(name))[1] = private.current_user_tenant_id()`) bazlı Storage RLS politikalarını oluşturun.

### [x] Adım 3: `src/middleware.ts`, `/api/auth` ve `/api/state` Dosyalarının `supabase.auth.getUser()` ile Yenilenmesi
- **Düzenlenecek Dosyalar:**
  - `src/middleware.ts`
  - `src/lib/session.ts` *(Süper Admin aktif mağaza seçimi için hafif imzalı `sopyo_admin_tenant` çerezi)*
  - `src/app/api/auth/route.ts`
  - `src/app/api/state/route.ts`
- **Yapılacak İşlem:**
  1. `src/middleware.ts` içinde `@supabase/ssr` `createServerClient` + `await supabase.auth.getUser()` ile token yenileme ve `/` → `/login` + `/api/state` → `401` korumasını uygulayın.
  2. `POST /api/auth` (`login`): Önce `supabase.auth.signInWithPassword` dener; kullanıcı `auth.users`'ta henüz yoksa ancak `user_profiles` tablosundaki eski şifreyle eşleşiyorsa `auth.admin.createUser` + `auth_uid` bağlantısı + `password_hash = NULL` ile otomatik göç edip girişi tamamlar.
  3. `POST /api/auth` (`register`): `auth.admin.createUser` ile şifreyi yalnızca Supabase Auth'ta (bcrypt/scrypt) saklar; `user_profiles` satırına `auth_uid` yazar ve `password` düz metin saklamaz.
  4. `GET /api/auth`, `POST /api/auth (switch_tenant)` ve `GET/POST /api/state`: Kimlik doğrulamasını yalnızca `await supabase.auth.getUser()` üzerinden yapar, `auth_uid` ile `user_profiles` kaydını çözer.

### [x] Adım 4: `zod` Kurulumu, Girdi Şema Doğrulaması, Mağaza Limitleri ve HTML Sanitizer
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Paket: `zod` (`npm install zod`)
  - Yeni: `src/lib/validators.ts`
  - Yeni: `src/lib/html-sanitizer.ts`
  - Düzenleme: `src/app/api/auth/route.ts`, `src/app/api/state/route.ts`, `src/lib/xml-engine.ts`, `src/lib/marketplace-api.ts`
- **Yapılacak İşlem:**
  1. `src/lib/validators.ts` içinde `/api/auth` ve `/api/state` tüm aksiyonları için strict `zod` şemaları ve ortak hata biçimlendirici (`400 Bad Request`) tanımlayın.
  2. `save_xml_source` içinde yeni kaynak oluştururken `tenant.maxXmlSources`, `save_product` içinde yeni ürün eklerken `tenant.maxProducts` limitlerini sunucu tarafında denetleyin.
  3. `src/lib/html-sanitizer.ts` içinde `<script>`, `<iframe>`, `<object>`, `<embed>`, `<svg>`, `on*=` nitelikleri ve `javascript:`/`data:` linklerini temizleyen allowlist HTML sanitizer yazıp `descriptionHtml`, `descriptionPrefixHtml`, `descriptionSuffixHtml` girişlerinde uygulayın.

### [x] Adım 5: Firma Logosunun Supabase Storage'a Taşınması (`POST /api/upload/logo`)
- **Oluşturulacak / Düzenlenecek Dosyalar:**
  - Yeni: `src/app/api/upload/logo/route.ts`
  - Düzenleme: `src/components/views/GeneralSettingsPanel.tsx` (Satır: 117-131, 372-382)
  - Düzenleme: `src/components/views/SettingsAndAdminView.tsx` (Satır: 451-458 — `notify` prop aktarımı)
- **Yapılacak İşlem:**
  1. `POST /api/upload/logo`: `supabase.auth.getUser()` doğrulaması yapar; `multipart/form-data` ile gelen dosyanın ilk baytlarını (PNG/JPEG/WebP magic bytes) ve `<= 512 KB` boyutunu kontrol eder; `image/svg+xml` dahil geçersiz dosyaları reddeder; `tenant-logos/{tenantId}/logo.{ext}` yoluna yükleyip public URL döner.
  2. `GeneralSettingsPanel.tsx`: `accept="image/png,image/jpeg,image/webp"` olarak daraltılır, `FileReader` Base64 ve `alert()` kaldırılarak `POST /api/upload/logo` + `notify()` kullanılır.

---

## 5. Doğrulama ve Test Adımları (Validation)

- [x] **Supabase Security Advisor:** Migration sonrası `get_advisors(security)` çıktısında **`0 WARN`** (`0028` ve `0029` dahil tüm uyarıların sıfırlandığını) doğrulandı.
- [x] **Derleme ve Tip Kontrolü:** `npx tsc --noEmit` ve `npm run build` sıfır hata ile geçti.
- [x] **Auth & Lazy Migration Akışı:** `@supabase/ssr` + `supabase.auth.getUser()` ve `auth.admin.createUser({ email_confirm: true })` + `clearPassword` akışı kuruldu (yerel fallback ile canlı giriş testi geçti).
- [x] **Zod & Limit Testi:** Geçersiz payload (`not-an-email`, bilinmeyen `action`, `admin_update_tenant` strict fazladan alan) `400 Bad Request` ile reddedildi; HTML sanitizer ve mağaza limitleri devreye alındı.
- [x] **Logo Upload Testi:** `.svg` dosyası magic-byte kontrolü ile `400` reddedildi, geçerli `.png` dosyası `200` ile kabul edildi (`tenant-logos` bucket ve Storage RLS politikaları canlı Supabase'de oluşturuldu).

---

## 6. Uygulama Öncesi 2 Hızlı Karar / Ön Koşul

1. **Yerel `.env.local` için `SUPABASE_SERVICE_ROLE_KEY`:** Faz 2'de `auth.admin.createUser` ve Storage yüklemelerinin bilgisayarınızdaki yerel geliştirme ortamında da canlı Supabase ile çalışabilmesi için `.env.local` içine `SUPABASE_SERVICE_ROLE_KEY` eklenmesi gerekir *(Vercel üretim ortamında zaten tanımlı; isterseniz Supabase Dashboard → Settings → API'den alıp ekleyebilirsiniz, ya da yerelde test için lokal fallback bırakalım)*.
2. **E-posta Doğrulaması (Kayıt Akışı):** Yeni mağaza kaydında (`register`) kullanıcılar kayıt olur olmaz doğrudan panele girebilsin mi (`email_confirm: true` — mevcut davranış korunur), yoksa e-posta doğrulama linki zorunlu olsun mu?
