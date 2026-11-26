# Sopyo Enterprise — Kapsamlı Kod Denetim Raporu ve Eylem Takip Listesi

> **Oluşturulma Tarihi:** 25.11.2026  
> **Kapsam:** `src/app/`, `src/components/`, `src/lib/`, `src/types/`, `supabase/migrations/`, `public/sw.js`, kök yapılandırma ve CI/CD dosyaları  
> **Denetim Perspektifi:** Kıdemli Next.js Mimarı • Supabase Güvenlik Denetçisi • UI/UX Uzmanı

---

## Genel İlerleme Özeti

| Kategori | Kritik | Yüksek | Orta | Düşük | Toplam | Tamamlanan |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Tasarım, Renk ve UI/UX (Tailwind / CSS)** | 0 | 2 | 3 | 1 | **6** | `6 / 6` *(Faz 5 tamamlandı)* |
| **2. Next.js & React Bugları, Mantık ve Runtime** | 1 | 5 | 4 | 0 | **10** | `10 / 10` *(Faz 1–6 tamamlandı)* |
| **3. Supabase & Next.js Güvenlik Açıkları** | 8 | 2 | 0 | 0 | **10** | `10 / 10` *(Faz 1 & Faz 2 tamamlandı)* |
| **4. Hata Yönetimi ve Performans Darboğazları** | 2 | 2 | 1 | 0 | **5** | `5 / 5` *(Faz 3 & Faz 5 tamamlandı)* |
| **TOPLAM ANA BULGU GRUBU (44 Alt Madde)** | **11** | **11** | **8** | **1** | **31 Grup (44 Madde)** | **`31 / 31` (%100 Tamamlandı)** |

---

## Faz Bazlı Hızlı Takip Tablosu

- [x] **Faz 1 — Acil Güvenlik Yamaları (Canlı Sistem Koruması)** *(Tamamlandı: 25.11.2026 — `FAZ_1_ACIL_GUVENLIK_PLANI.md`)*
- [x] **Faz 2 — Kimlik Doğrulama (`@supabase/ssr`), RLS Sıkılaştırma ve Zod Doğrulama** *(Tamamlandı: 25.11.2026 — `FAZ_2_AUTH_RLS_ZOD_PLANI.md`)*
- [x] **Faz 3 — Veri Mimarisi, Performans ve Hata Yönetimi Dönüşümü** *(Tamamlandı: 26.11.2026 — `FAZ_3_VERI_PERFORMANS_HATA_PLANI.md`)*
- [x] **Faz 4 — Güvenli UI State, Tarih/Saat ve Kiracı Dinamizmi** *(Tamamlandı: 26.11.2026 — `FAZ_4_UI_STATE_IS_MANTIGI_PLANI.md`)*
- [x] **Faz 5 — Next.js App Router Bölünmesi ve UI/UX Standartlaştırma** *(Tamamlandı: 26.11.2026 — `FAZ_5_TASARIM_UI_UX_APP_ROUTER_PLANI.md`)*
- [x] **Faz 6 — Hepsiburada API Tam Entegrasyonu (Trendyol Birebir Özellik Eşitliği)** *(Tamamlandı: 26.11.2026 — `FAZ_6_HEPSIBURADA_API_TAM_ENTEGRASYON_PLANI.md`)*

---

## 1. Tasarım, Renk ve UI/UX Uyumsuzlukları (Tailwind / CSS)

### [x] 1.1. Kullanılmayan CSS Değişkenleri, Eksik Tema Token'ları ve Zemin Rengi Çelişkisi
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/globals.css` (Satır: 1-17), `postcss.config.mjs` (Satır: 1-7), `src/app/manifest.ts` (Satır: 12-13), `src/app/page.tsx` (Satır: 343)
- **Sorun:** Proje Tailwind CSS v4 (`@import "tailwindcss";`) kullanmaktadır; ayrı bir `tailwind.config.*` dosyası bulunmadığı gibi `globals.css` içinde `@theme` bloğu veya semantik tasarım token'ları (`--primary`, `--background`, `--foreground`, `--border` vb.) tanımlanmamıştır. `:root` içinde tanımlanan `--sopyo-navy`, `--sopyo-blue`, `--sopyo-indigo` ve `--sopyo-bg: #f4f6fb` değişkenleri kod tabanının hiçbir yerinde kullanılmamaktadır. Üstelik `globals.css` `body` zeminine sabit `#ffffff` verirken, `manifest.ts` `#f4f6fb`, `page.tsx` ise `bg-slate-100` (`#f1f5f9`) kullanmaktadır.
- **Çözüm Önerisi:** `globals.css` içinde Tailwind v4 `@theme` direktifi ile semantik renk token'larını (`--color-primary`, `--color-surface`, `--color-sidebar` vb.) tanımlayın ve tüm bileşenlerde sabit renkler yerine bu yardımcı sınıfları (`bg-primary`, `bg-sidebar`, `bg-surface`) kullanın.

### [x] 1.2. Bileşenlerde Sabit Yazılmış (Hardcoded) Renk Kodları (`#hex`, `rgba`, Inline Style)
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 378, 849), `src/app/layout.tsx` (Satır: 9), `src/components/views/CatalogMappingsView.tsx` (Satır: 596), `src/lib/store.ts` (Satır: 777-779), `src/app/icon.tsx` (Satır: 16-18), `src/app/apple-icon.tsx` (Satır: 16-17), `src/app/pwa-icon-192/route.tsx` (Satır: 13-15)
- **Sorun:** Sol menüde `bg-[#0f172a]` (`page.tsx:378`), mobil alt navigasyonda `shadow-[0_-4px_20px_rgba(15,23,42,0.06)]` (`page.tsx:849`), etiket bileşeninde inline `style={{ backgroundColor: t.color }}` (`#4f46e5`, `#10b981`, `#f59e0b`) ve PWA/viewport yapılandırmalarında sabit hex değerleri kullanılmıştır.
- **Çözüm Önerisi:** `bg-[#0f172a]` yerine `@theme` içindeki `bg-sidebar` (veya `bg-slate-900`), özel gölge yerine tema gölge token'ı (`--shadow-bottom-nav`) ve etiketlerde önceden tanımlı semantik varyant haritası (`indigo` / `emerald` / `amber`) kullanın.

### [x] 1.3. İşletim Sistemi Dark Mode ve Koyu/Açık Geçişlerinde Kontrast ve Görünmez Metin Sorunu
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/globals.css` (Satır: 10-17), `src/app/page.tsx` (Satır: 209-219, 413-423), `src/components/views/ProductsView.tsx` (Satır: 748-830, 966-1005), `src/components/views/CatalogMappingsView.tsx` (Satır: 634-662)
- **Sorun:**
  - [x] **1.3.a:** `html` üzerinde `color-scheme: light;` tanımlanmamış ve projede hiçbir `dark:` varyantı yazılmamıştır. İşletim sistemi koyu modda olan Windows/Android tarayıcılarda, arka planı açıkça `bg-white` veya metin rengi `text-slate-900` verilmeyen form kontrollerinde (`ProductsView.tsx:756, 772, 790, 981, 992, 1003` ve `CatalogMappingsView.tsx:654`) kontrast bozulması oluşur.
  - [x] **1.3.b:** `page.tsx:413-423` satırlarındaki `<select className="... bg-slate-800 ... text-white">` içindeki `<option>` etiketlerine arka plan rengi verilmediği için Windows tarayıcılarında beyaz açılır liste üzerinde beyaz metin (görünmez metin) hatası yaşanır.
  - [x] **1.3.c:** `page.tsx:209` yükleme ekranı tam koyu (`bg-slate-950 text-white`) iken veri yüklendiği anda beyaz arayüze sıçrayarak sert görsel flaş yaratmakta ve `layout.tsx:9` içindeki `themeColor: '#ffffff'` koyu yükleme ekranının tepesinde parlak beyaz durum çubuğu bırakmaktadır.
- **Çözüm Önerisi:** Yalnızca açık tema desteklenecekse `globals.css` içinde `:root { color-scheme: light; }` tanımlayın ve tüm `<input>`, `<select>`, `<textarea>`, `<option>` elemanlarına açıkça `bg-white text-slate-900` (koyu sidebar `<option>`'larına `bg-slate-800 text-white`) ekleyin; yükleme iskeletini de ana panelin açık temasıyla uyumlu hale getirin.

### [x] 1.4. Birincil Buton Rengi, `rounded-*`, Gölge ve Boyut (Touch Target) Tutarsızlıkları
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/ProductsView.tsx` (Satır: 255-258, 509, 689-715), `src/components/views/GeneralSettingsPanel.tsx` (Satır: 303-311), `src/components/views/CatalogMappingsView.tsx` (Satır: 186-242, 363-368, 520-526), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 219-229, 420-450), `src/components/views/XmlView.tsx` (Satır: 1571-1579, 1863-1879, 1915-1920)
- **Sorun:**
  - [x] **1.4.a:** Ana CTA butonları sekmeler arasında `bg-blue-600`, `bg-indigo-600` ve `bg-emerald-500` olarak tutarsız değişmektedir.
  - [x] **1.4.b:** Kartlarda `rounded-2xl shadow-xs` ile `rounded-xl shadow-sm`; butonlarda `rounded-md`, `rounded-lg` ve `rounded-xl` karışık kullanılmıştır.
  - [x] **1.4.c:** Sayfalama (`py-1`), tablo aksiyon (`py-1.5`) ve modal kapatma/silme (`p-1.5`) butonları `44px` dokunma standardının altındadır.
- **Çözüm Önerisi:** Ortak `<Button>` ve `<Card>` bileşenleri oluşturarak tek bir birincil renk, standart kart yuvarlaklığı (`rounded-2xl shadow-sm`) ve mobilde minimum `min-h-11` (`44px`) yüksekliği zorunlu kılın.

### [x] 1.5. Tipografi Hiyerarşisi Bozukluğu (Çift `<h1>`), İkon Kütüphanesi Karmaşası ve Yazım Hatası
- **Önem Derecesi:** `[DÜŞÜK]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 532-534), `src/components/views/ProductsView.tsx` (Satır: 245-247), `src/components/views/XmlView.tsx` (Satır: 5, 8, 13, 361-363, 491, 555, 578, 586, 1608-1746, 1892), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 425), `src/app/login/page.tsx` (Satır: 5)
- **Sorun:**
  - [x] **1.5.a:** Üst `header` içinde `<h1>` varken `ProductsView` ve `XmlView` ikinci bir `<h1>` render etmektedir.
  - [x] **1.5.b:** `XmlView.tsx` içinde bozuk ikon portundan kalan düz `'?'` karakterleri (`Satır: 1608-1745`), `'🥿'` emojisi (`Satır: 1619`), `'☆'`, `'▣'`, `'➔'`, `'||||||||'` sembolleri kullanılmış; import edilen `AlertCircle`, `ChevronRight`, `Server`, `Layers` ise hiç kullanılmamıştır.
  - [x] **1.5.c:** `OrdersAndClaimsView.tsx:425` satırında `"Kargo Fiși"` metninde Türkçe `ş` yerine Romence `ș` (`U+0219`) karakteri bulunmaktadır. *(Faz 4'te düzeltildi)*
- **Çözüm Önerisi:** Tek `<h1 />` hiyerarşisini koruyun; tüm emoji, Unicode sembol ve `'?'` kalıntılarını `lucide-react` ikonlarıyla değiştirin, yazım hatasını düzeltin ve kullanılmayan import'ları silin.

### [x] 1.6. Mobil/Tablet Kırılımlarında Yatay Taşma (`overflow-x-clip` Maskelemesi) ve Yazdırma Kesilmesi
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/globals.css` (Satır: 15, 71-78), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 463-509, 551-552, 648, 657-677, 699-713), `src/components/views/CatalogMappingsView.tsx` (Satır: 551-577), `src/components/views/ProductsView.tsx` (Satır: 682-717), `src/components/views/XmlView.tsx` (Satır: 697-887, 1827)
- **Sorun:**
  - [x] **1.6.a:** İade Yönetimi tablosu (`OrdersAndClaimsView.tsx:468-507`) ve Varyant değerleri tablosu (`CatalogMappingsView.tsx:552-576`) `overflow-x-auto` ve mobil kart görünümü içermediğinden `overflow-x-clip` nedeniyle mobilde sağdan kesilmektedir.
  - [x] **1.6.b:** Kargo Etiketi modalı (`OrdersAndClaimsView.tsx:551-552, 648, 657`) dar ekranlarda taşmakta ve `fixed inset-0 max-h-[92vh] overflow-y-auto` yüzünden `window.print()` sırasında çok kalemli fişleri yarıdan kesmektedir.
  - [x] **1.6.c:** `ProductsView.tsx:686` sayfalama grubu `flex-wrap` içermemekte, `XmlView.tsx:1827` ise `'9999999999999999'` sabit metniyle tabloyu genişletmektedir.
- **Çözüm Önerisi:** Tablolara `overflow-x-auto` + `md:hidden` mobil kart görünümü ekleyin; kargo etiketinde `grid-cols-1 sm:grid-cols-2` kullanın ve `@media print` altında yazdırma kapsayıcısının yükseklik/kaydırma kısıtlarını kaldırın.

---

## 2. Next.js & React Bugları, Mantık Hataları ve Runtime Riskleri

### [x] 2.1. Tüm Uygulamanın Tek Bir `'use client'` SPA Olması ve Statik Bundle Şişmesi
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 5 *(Tamamlandı — `next/dynamic` code-splitting)*
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 1-10, 100-220), `src/components/views/CatalogMappingsView.tsx` (Satır: 10), `src/lib/store.ts` (Satır: 1), `src/lib/supabase.ts` (Satır: 1)
- **Sorun:** Ana sayfa `'use client'` olarak işaretlenmiş ve 6 büyük görünüm bileşeninin tamamını (~380 KB kaynak kod + 28 KB kategori kataloğu) statik olarak tek pakette tarayıcıya indirmektedir. App Router alt rotaları, URL tabanlı sekme geçmişi ve code-splitting devre dışıdır; sunucu modüllerinde `server-only` sınırı yoktur.
- **Çözüm Önerisi:** Sekmeleri App Router alt rotalarına (`app/(dashboard)/...`) ayırın veya `next/dynamic` ile tembel yükleyin; sunucu modüllerine `server-only` koruması ekleyin.

### [x] 2.2. Tarih/Saat Formatlamada Saat Dilimi, Hydration Mismatch ve `"Invalid Date"` Riski
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 4 *(Tamamlandı — `src/lib/date-format.ts`)*
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 735), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 256, 359), `src/components/views/ProductsView.tsx` (Satır: 448, 560), `src/components/views/SettingsAndAdminView.tsx` (Satır: 482), `src/components/views/XmlView.tsx` (Satır: 365, 2009)
- **Sorun:** `new Date(val).toLocaleString('tr-TR')` çağrılarında `timeZone: 'Europe/Istanbul'` ve geçerli tarih kontrolü yoktur; boş tarih alanında `"Invalid Date"` ve SSR'da Hydration mismatch riski doğurur.
- **Çözüm Önerisi:** Geçerlilik kontrolü ve sabit `timeZone: 'Europe/Istanbul'` içeren ortak `formatTrDate()` yardımcısı kullanın.

### [x] 2.3. Eksik `loading.tsx`, `error.tsx`, `global-error.tsx` ve `Suspense` Sınırları
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/layout.tsx` (Satır: 27-38), `src/app/page.tsx` (Satır: 123-127, 575-844)
- **Sorun:** `src/app/` dizininde hiçbir hata veya yükleme sınırı dosyası yoktur; tek bir alt bileşen hatası tüm uygulamayı beyaz ekrana düşürür.
- **Çözüm Önerisi:** `src/app/error.tsx`, `src/app/global-error.tsx` ve `src/app/loading.tsx` dosyalarını ekleyin.

### [x] 2.4. Yönetilmeyen Promise Hataları (`catch` Eksikliği) ve Mükerrer Form Gönderimi
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 3 *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/ProductsView.tsx` (Satır: 154-170), `src/components/views/XmlView.tsx` (Satır: 232-251, 279-301), `src/components/views/SettingsAndAdminView.tsx` (Satır: 109-168), `src/components/views/CatalogMappingsView.tsx` (Satır: 57-134), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 58-105, 755-758), `src/components/views/BulkAndRobotView.tsx` (Satır: 280-369), `src/app/api/auth/route.ts` (Satır: 50-55), `src/app/api/cron/sync/route.ts` (Satır: 49-79)
- **Sorun:**
  - [x] **2.4.a:** Onlarca `try ... finally` bloğunda `catch` bulunmamaktadır; ağ/timeout hataları sessizce yutulup `Unhandled Promise Rejection` üretmektedir.
  - [x] **2.4.b:** `handleSaveProduct`, `handleSaveWizard` ve `handleDeleteXml` içinde `isSubmitting` kilidi olmadığından çift tıklamada mükerrer kayıt oluşmaktadır.
  - [x] **2.4.c:** `/api/auth` `POST` içinde `try/catch` yoktur; `/api/cron/sync` içinde pazaryeri döngüsü `try/catch` dışındadır.
- **Çözüm Önerisi:** Merkezi `apiPost()` hata yakalayıcısı ve `isSubmitting` buton kilidi kullanın; `/api/auth` ve `/api/cron/sync` içine `try/catch` izolasyonu ekleyin.

### [x] 2.5. Mağaza Değişiminde Form State'lerinin Güncellenmemesi (Yanlış Mağazanın API Anahtarını Ezme)
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 4 *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/SettingsAndAdminView.tsx` (Satır: 49-107), `src/components/views/BulkAndRobotView.tsx` (Satır: 66-80), `src/app/page.tsx` (Satır: 162-167)
- **Sorun:**
  - [x] **2.5.a:** `SettingsAndAdminView` içindeki `tyForm` ve `hbForm` mağaza değiştiğinde güncellenmediği için önceki mağazanın API anahtarları yeni mağazanın üzerine yazılabilir.
  - [x] **2.5.b:** `BulkAndRobotView` içindeki hızlı fiyat oranları (`105 / 75 / 120 / 80`) ve `newRobotProductId` prop'lardan senkronize edilmemektedir.
  - [x] **2.5.c:** `page.tsx:164` içindeki toast `setTimeout` zamanlayıcısı `useRef` ile temizlenmemektedir.
- **Çözüm Önerisi:** Görünümlere `key={data.tenant.id}` verin, fiyat kurallarını `xmlSources` prop'undan ilklendirin ve `clearTimeout` temizliği ekleyin.

### [x] 2.6. Mağaza Değiştirme (`switch_tenant`) Parametre Uyuşmazlığı — Çalışmayan Özellik
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 1
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 194-205), `src/components/views/SettingsAndAdminView.tsx` (Satır: 149-168), `src/app/api/auth/route.ts` (Satır: 196-219)
- **Sorun:** İstemci `targetTenantId` gönderirken `/api/auth` `body.tenantId` okumakta ve `message` döndürmemektedir; mağaza değiştirme özelliği hiçbir zaman çalışmamaktadır.
- **Çözüm Önerisi:** Sunucuda `targetTenantId` parametresini doğrulayarak okuyun, hedef mağazanın varlığını kontrol edin ve `message` alanı döndürün.

### [x] 2.7. Hepsiburada Ürün Gönderimi, Sipariş Çekme ve Bağlantı Testinde Sahte Başarı *(Tamamlandı — Faz 6: `FAZ_6_HEPSIBURADA_API_TAM_ENTEGRASYON_PLANI.md`)*
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 6 *(Tamamlandı)*
- **Dosya ve Satır:** `src/lib/hepsiburada-client.ts`, `src/lib/hepsiburada-catalog.ts`, `src/lib/hepsiburada-api.ts`, `src/lib/marketplace-api.ts`, `src/components/views/SettingsAndAdminView.tsx`
- **Sorun:**
  - [x] **2.7.a:** `publishProductsToMarketplace` Hepsiburada için resmi MPOP `POST /product/api/products/import` (`multipart/form-data`) + `GET /product/api/products/status/{trackingId}` hata takibine geçirildi.
  - [x] **2.7.b:** `pullOrdersFromMarketplace` Hepsiburada için resmi OMS `/packages`, `/orders` ve `/orders/.../paymentawaiting` uçlarına + çapraz stok düşmeye bağlandı.
  - [x] **2.7.c:** `testMarketplaceConnection` hem Trendyol hem Hepsiburada için yalnızca gerçek HTTP `200` durumunda `{ ok: true }` dönecek şekilde düzeltildi; UI rozeti gerçek `connectionStatus` değerine bağlandı.
- **Çözüm Önerisi:** Hepsiburada katalog/sipariş API çağrılarını gerçek uç noktalarla tamamlayın; bağlantı testinde yalnızca `res.ok` durumunda `ok: true` döndürün ve rozeti `connectionStatus` değerine bağlayın.

### [x] 2.8. Supabase Şema Uyumsuzluğu (`minPrice` & `marketplaceDescriptions`) ve İşlevsiz XML Kuralları *(Tamamlandı)*
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 3 (`2.8.a`), Faz 4 (`2.8.d`) & Faz 6 (`2.8.b/c`) *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/ProductsView.tsx`, `supabase/migrations/0007_phase3_perf_and_schema.sql`, `src/components/views/XmlView.tsx`, `src/lib/xml-engine.ts`, `src/app/api/cron/sync/route.ts`
- **Sorun:**
  - [x] **2.8.a:** `minPrice` ve `marketplaceDescriptions` alanları Supabase `public.products` tablosuna eklendi.
  - [x] **2.8.b:** `XmlView.tsx` içine "Değişken Fiyat Kuralı (`priceRuleType === 2`)" kural tablosu (ekle/düzenle/sil + mobil kart görünümü) eklendi.
  - [x] **2.8.c:** `xml-engine.ts` içine `customTagMapping` okuyucusu ve `taxIncludedMode` (`0/1/2`) KDV hesaplaması; `cron/sync/route.ts` içine `autoPublishChannels` filtresi bağlandı.
  - [x] **2.8.d:** `XmlView.tsx` sahte rapor fallback'leri temizlendi.
- **Çözüm Önerisi:** Eksik sütunlar için migration ekleyin; `priceRuleType === 2` tablosunu ve XML motorundaki etiket/KDV/kanal filtrelerini devreye alın; sahte rapor fallback'lerini temizleyin.

### [x] 2.9. Cache & Revalidation Eksiklikleri, `GET` Üzerinden DB Yazma ve Eşzamanlı Veri Ezilmesi (Lost Update)
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 3 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 48-142), `src/app/api/cron/sync/route.ts` (Satır: 10-12), `src/lib/store.ts` (Satır: 1178-1330), `src/app/page.tsx` (Satır: 185-192)
- **Sorun:** `GET /api/state` okuma isteğinde veritabanına yazmakta; `/api/cron/sync` üzerinde `dynamic = 'force-dynamic'` bulunmamakta; `handleLogout` sonrasında `router.refresh()` çağrılmamakta ve tam-veritabanı yazımı eşzamanlı isteklerde Lost Update yaratmaktadır.
- **Çözüm Önerisi:** `GET /api/state` içindeki yazma yan etkisini kaldırın, API rotalarına `force-dynamic` ekleyin ve satır/tablo bazlı atomik Supabase güncellemelerine geçin.

### [x] 2.10. Null/Undefined Çökme Riskleri, Sabit Kiracı Metinleri ve Ölü Durum Kodları
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 1 & Faz 4 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/page.tsx` (Satır: 170-178, 222-225, 503, 536-540, 637-641), `src/app/api/state/route.ts` (Satır: 30-33, 177, 569, 695, 745), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 291-302, 404-415, 500-502), `src/components/views/CatalogMappingsView.tsx` (Satır: 542-549), `src/components/views/ProductsView.tsx` (Satır: 39, 113), `src/components/views/BulkAndRobotView.tsx` (Satır: 446, 1288-1390)
- **Sorun:**
  - [x] **2.10.a:** `page.tsx:171` `!res.ok` kontrolü yapmadığından hata yanıtında `data.orders.reduce` istemciyi çökertmektedir; `state/route.ts` içinde `incoming` nesneleri null kontrolsüz okunmaktadır.
  - [x] **2.10.b:** Arayüzde `"Zeki Hamdi Çınar"`, `"Trendyol: #1192080"` ve `"LuneRose"` sabit yazılmıştır.
  - [x] **2.10.c:** Sipariş `<select>` içinde `'pending'` seçeneği eksik, iade/varyant durum rozetleri sabit yazılmış ve `ProductsView` `statusFilter` seçicisi eksiktir.
- **Çözüm Önerisi:** `fetchState` hata/401 yönlendirmesini ekleyin, sabit metinleri aktif oturum/mağaza verisine bağlayın ve ölü durum kontrollerini tamamlayın.

---

## 3. Supabase & Next.js Güvenlik Açıkları (Kritik Denetim)

### [x] 3.1. Oturumsuz İsteklere Otomatik `super_admin` Yetkisi Verilmesi ve `middleware.ts` Eksikliği
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 25-46), `src/app/api/auth/route.ts` (Satır: 8-48)
- **Sorun:** `src/middleware.ts` mevcut değildir ve oturum çerezi bulunmayan tüm istekler `401` dönmek yerine otomatik olarak `db.users[0]` (`super_admin`) yetkisiyle çalıştırılmaktadır.
- **Çözüm Önerisi:** `db.users[0]` fallback'ini tamamen kaldırın, geçersiz/eksik oturumda `401 Unauthorized` döndürün ve `src/middleware.ts` rota korumasını ekleyin.

### [x] 3.2. İmzasız Base64 Oturum Çerezi, `@supabase/ssr` Kullanılmaması ve Düz Metin Şifreler
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 (Acil HMAC İmzalı Çerez — *Tamamlandı*) & Faz 2 (`@supabase/ssr` Geçişi — *Tamamlandı*)
- **Dosya ve Satır:** `src/app/api/auth/route.ts` (Satır: 60-86, 157-181, 196-219), `src/lib/supabase.ts` (Satır: 1-32), `src/lib/store.ts` (Satır: 97), `package.json` (Satır: 12)
- **Sorun:**
  - [x] **3.2.a:** `sopyo_session_v1` çerezi imzasız düz Base64 JSON olduğu için sahte çerez üretilerek herhangi bir hesaba girilebilir; çerezlerde `secure` ve `sameSite: 'lax'` eksiktir.
  - [x] **3.2.b:** `(!u.password || u.password === password)` nedeniyle boş şifreli hesaplara herhangi bir şifreyle girilebilmekte ve `store.ts:97` sabit `'admin123'` içermektedir.
  - [x] **3.2.c:** `@supabase/ssr` ve `supabase.auth.getUser()` hiç kullanılmamakta, şifreler düz metin saklanmaktadır.
- **Çözüm Önerisi:** Faz 1'de çerezi HMAC-SHA256 imzalı + `httpOnly/secure/sameSite` yapısına kavuşturup boş şifre bypass'ını kapatın; Faz 2'de tamamen `@supabase/ssr` + Supabase Auth (`getUser()`) altyapısına geçin.

### [x] 3.3. `switch_tenant` Aksiyonunda Rol Kontrolü Eksikliği (IDOR)
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/auth/route.ts` (Satır: 196-219)
- **Sorun:** `switch_tenant` içinde `role === 'super_admin'` kontrolü yapılmadığı için herhangi bir kullanıcı başka bir mağazanın oturumunu alabilir.
- **Çözüm Önerisi:** Yalnızca doğrulanmış `super_admin` rolüne izin verin; aksi durumda `403 Forbidden` döndürün.

### [x] 3.4. Supabase `SECURITY DEFINER` RPC'lerinin `anon` ve `authenticated` Rollerine Açılması
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı — canlı Supabase'e uygulandı)*
- **Dosya ve Satır:** `supabase/migrations/0002_server_rpc_bridge.sql` (Satır: 7-21, 824-834), `src/lib/supabase.ts` (Satır: 22-32)
- **Sorun:** Tüm RLS kurallarını bypass eden 5 `SECURITY DEFINER` RPC fonksiyonuna `anon` ve `authenticated` rolleri için `EXECUTE` izni verilmiştir.
- **Çözüm Önerisi:** `anon` ve `authenticated` rollerinden `EXECUTE` yetkisini geri alıp yalnızca `service_role` rolüne izin verin ve `private.assert_server_secret` karşılaştırmasını sabit zamanlı hale getirin.

### [x] 3.5. RLS Politikalarında Yetki Yükseltme (`WITH CHECK` Eksikliği), İşlevsiz `auth_uid` ve Kiracılar Arası Silme
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 (`server_config` RLS — *Tamamlandı*) & Faz 2 (Tam RLS + `auth_uid` — *Tamamlandı*)
- **Dosya ve Satır:** `supabase/migrations/0001_initial_schema.sql` (Satır: 16-22, 408-459), `supabase/migrations/0003_advisor_fixes.sql` (Satır: 1-2), `supabase/migrations/0002_server_rpc_bridge.sql` (Satır: 444, 489-493, 816-818)
- **Sorun:**
  - [x] **3.5.a:** `private.server_config` tablosunda RLS etkin değildir.
  - [x] **3.5.b:** `user_profiles` ve `tenants` üzerindeki `FOR ALL` politikaları `WITH CHECK` kısıtı içermediğinden kullanıcı kendi `role`, `tenant_id` veya `plan` alanını yükseltebilir.
  - [x] **3.5.c:** `xml_sources` ve `products` toplu silme sorgularında `tenant_id` filtresi bulunmamaktadır.
- **Çözüm Önerisi:** `private.server_config` üzerinde RLS açın; Faz 2'de `auth_uid` bağlantısını kurup `WITH CHECK` ve rol bazlı RLS politikalarını ayırın; silme sorgularına `tenant_id` filtresi ekleyin.

### [x] 3.6. İstemci Kodunda (Git'te) Gerçek Ticimax XML Token'ı ve Pazaryeri Sırlarının Sızdırılması
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/XmlView.tsx` (Satır: 639), `src/app/api/state/route.ts` (Satır: 144-154, 743-769), `src/lib/store.ts` (Satır: 132-133), `.env.example` (Satır: 25)
- **Sorun:** `XmlView.tsx:639` placeholder'ında gerçek canlı XML token'ı (`CD636DDDFFD142D396880893BBFF5820`) açıkça yer almakta ve `GET /api/state` yanıtı tüm pazaryeri `apiSecret` değerlerini tarayıcıya düz metin JSON olarak göndermektedir.
- **Çözüm Önerisi:** Ticimax XML token'ını yenileyin, koddan tüm gerçek token/ID kalıntılarını temizleyin ve `GET /api/state` yanıtında `apiSecret` alanlarını maskeleyin (`save_marketplace_account` içinde maskeli değer geldiğinde mevcut sırrı koruyarak).

### [x] 3.7. Kiracılar Arası Ortam Değişkeni Fallback Açığı
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 55-57, 1194-1305)
- **Sorun:** Kendi Trendyol API bilgisi olmayan herhangi bir kiracı canlı Trendyol listeleme/arşivleme/silme aksiyonlarını çağırdığında sistem `process.env.TRENDYOL_*` (`1192080` - LuneRose) anahtarlarına fallback yapmakta ve yabancı kiracının ana mağaza ürünlerini silmesine olanak tanımaktadır.
- **Çözüm Önerisi:** Çok kiracılı aksiyonlardan `process.env.TRENDYOL_*` ve `process.env.ARIASCLOSET_XML_URL` fallback'lerini kaldırın; yalnızca ilgili kiracının kayıtlı kimlik bilgilerini kullanın.

### [x] 3.8. Korumasız Cron Endpoint'i (`/api/cron/sync`) ve Zamanlama Çelişkisi
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/cron/sync/route.ts` (Satır: 10-15), `vercel.json` (Satır: 2-6), `.github/workflows/xml-sync-cron.yml` (Satır: 14-16)
- **Sorun:** `/api/cron/sync` üzerinde `CRON_SECRET` kontrolü yoktur; dışarıdan tetiklenerek DoS ve API kota aşımına uğratılabilir.
- **Çözüm Önerisi:** `Authorization: Bearer <CRON_SECRET>` doğrulamasını sabit zamanlı karşılaştırma ile zorunlu kılın ve GitHub Actions iş akışını gizli anahtarla güncelleyin.

### [x] 3.9. SSRF (Server-Side Request Forgery) ve Açık Image Proxy Yapılandırması
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 1 *(Tamamlandı)*
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 165-172), `src/lib/xml-engine.ts` (Satır: 50-57, 104-112), `next.config.mjs` (Satır: 3-11)
- **Sorun:** Kullanıcıdan alınan XML URL'si iç IP / protokol kontrolü, timeout ve boyut sınırı olmadan sunucuda `fetch` edilmektedir; `next.config.mjs` ise `http`/`https` tüm alan adlarına (`**`) açık image proxy izni vermekte ve build sırasında ESLint'i kapatmaktadır.
- **Çözüm Önerisi:** `https:` zorunluluğu, DNS/özel IP bloklaması, `redirect: 'error'`, `15s` timeout ve maksimum yanıt boyutu kontrolü yapan `assertSafeExternalXmlUrl` korumasını ekleyin; `next.config.mjs` güvenlik başlıklarını ve görsel kurallarını sıkılaştırın.

### [x] 3.10. Eksik Girdi Doğrulaması (Zod), Mass Assignment ve Logo/HTML Sanitizasyon Eksikliği
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 1 (Mass Assignment Kapatma — *Tamamlandı*) & Faz 2 (Tam Zod + Supabase Storage — *Tamamlandı*)
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 183-188, 592-608, 699, 1087-1103, 1308-1318), `src/components/views/GeneralSettingsPanel.tsx` (Satır: 117-131, 377), `src/lib/marketplace-api.ts` (Satır: 333)
- **Sorun:** `update_tenant_settings` ham `incoming` nesnesini yaydığı için mağaza sahibi kendi `plan`, `maxProducts`, `licenseExpiresAt` alanlarını yükseltebilir; logo Base64 olarak JSONB'ye yazılmakta ve HTML açıklamalar sanitize edilmemektedir.
- **Çözüm Önerisi:** Faz 1'de `update_tenant_settings`, `save_category_mapping`, `save_product`, `save_xml_source` içinde korumalı alanların (`id`, `tenantId`, `plan`, `maxProducts`, `maxXmlSources`, `licenseExpiresAt`, `isActive`) ezilmesini engelleyin; Faz 2'de tüm uç noktalara `zod` şemaları, HTML sanitizer ve Supabase Storage entegrasyonu ekleyin.

---

## 4. Hata Yönetimi ve Performans Darboğazları

### [x] 4.1. Supabase `{ data, error }` Kontrollerinin Atlanması ve Sessiz Seed Veriye Geri Dönüş
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 3 *(Tamamlandı)*
- **Dosya ve Satır:** `src/lib/store.ts` (Satır: 1190-1254, 1323-1329)
- **Sorun:** `sopyo_get_products_chunk` paralel çağrılarında ve `sopyo_mark_missing_products_deleted` RPC'sinde `error` kontrol edilmemekte; Supabase okuma hatasında sessizce 12 ürünlük yerel seed veriye dönülerek veri ezilme riski yaratılmaktadır.
- **Çözüm Önerisi:** Tüm RPC/sorgu sonuçlarında `error` kontrolünü zorunlu kılın ve Supabase aktifken okuma hatasında seed veriye düşmek yerine hata fırlatın.

### [x] 4.2. Ham Veritabanı/XML Token Hatalarının Kullanıcıya Sızdırılması ve Yutulan Pazaryeri Hataları
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 1 (Hata Sızıntısı Maskeleme — *Tamamlandı*) & Faz 3 (Pazaryeri Hata Takibi — *Tamamlandı*)
- **Dosya ve Satır:** `src/app/api/state/route.ts` (Satır: 882-888, 1342-1346), `src/lib/store.ts` (Satır: 1298-1300, 1318-1320), `src/lib/xml-engine.ts` (Satır: 108-110), `src/lib/marketplace-api.ts` (Satır: 152-172)
- **Sorun:** İç SQL/PostgREST hataları ve gizli token içeren `${xmlSource.url}` istemciye doğrudan döndürülmekte; `syncPriceAndInventoryToMarketplace` ise API hatalarını yutup `errorCount: 0` bildirmektedir.
- **Çözüm Önerisi:** Ham sunucu ve URL hatalarını sunucu logunda tutup istemciye güvenli mesaj döndürün; stok/fiyat eşitleme hatalarını batch raporuna gerçek sayılarıyla kaydedin.

### [x] 4.3. Tüm Veritabanının Belleğe Çekilmesi, `SELECT *`, Çift Varyant Yazımı ve Senkron `fs` Blokajı
- **Önem Derecesi:** `[KRİTİK]` • **Hedef Faz:** Faz 3 *(Tamamlandı)*
- **Dosya ve Satır:** `src/lib/store.ts` (Satır: 1150-1330), `supabase/migrations/0002_server_rpc_bridge.sql` (Satır: 24-387, 749, 774-799)
- **Sorun:** Her API isteğinde tüm kiracıların verisi (`SELECT *`, ağır `description_html` dahil) belleğe çekilmekte, varyantlar iki yere birden yazılmakta ve yerel 10,4 MB JSON dosyası `fs.writeFileSync` ile Event Loop'u bloklamaktadır.
- **Çözüm Önerisi:** Alan bazlı modüler API uç noktalarına, `tenant_id` filtreli/sayfalı sorgulara ve daraltılmış sütun seçimlerine geçin; senkron disk yazımını kaldırın.

### [x] 4.4. Sıralı Sorgu Döngüleri (N+1), Eksik İndeksler ve Serverless Zaman Aşımı
- **Önem Derecesi:** `[YÜKSEK]` • **Hedef Faz:** Faz 3 *(Tamamlandı)*
- **Dosya ve Satır:** `src/lib/store.ts` (Satır: 1311-1321), `supabase/migrations/0002_server_rpc_bridge.sql` (Satır: 402-799), `src/lib/marketplace-api.ts` (Satır: 398, 563-578, 813-828, 860), `supabase/migrations/0003_advisor_fixes.sql` (Satır: 6-14)
- **Sorun:** PL/pgSQL satır içi `FOR` döngüleri, `fetchLiveTrendyolProducts` içindeki 6'lı istek ve `deleteLiveTrendyolProducts` içindeki 80 sayfalık sıralı döngü + `setTimeout` beklemeleri serverless timeout riski üretmektedir; `orders(tenant_id, order_date DESC)` ve `products(tenant_id, status)` indeksleri eksiktir.
- **Çözüm Önerisi:** Set-tabanlı `jsonb_to_recordset` toplu upsert kullanın, tüm dış `fetch` isteklerine `AbortSignal.timeout` ekleyin ve eksik birleşik indeksleri oluşturun.

### [x] 4.5. Optimize Edilmemiş `<img>` Etiketleri (`next/image` Eksikliği)
- **Önem Derecesi:** `[ORTA]` • **Hedef Faz:** Faz 5 *(Tamamlandı)*
- **Dosya ve Satır:** `src/components/views/ProductsView.tsx` (Satır: 410-417, 538-545), `src/components/views/BulkAndRobotView.tsx` (Satır: 710-714, 821-825), `src/components/views/GeneralSettingsPanel.tsx` (Satır: 356-360), `src/components/views/OrdersAndClaimsView.tsx` (Satır: 609-613)
- **Sorun:** Ürün ve pazaryeri listelerinde onlarca yüksek çözünürlüklü dış görsel ham `<img>` ile boyutsuz ve optimizasyonsuz yüklenmektedir.
- **Çözüm Önerisi:** Liste görünümlerinde `next/image` bileşenine geçin.
