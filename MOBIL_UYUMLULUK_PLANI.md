# Sopyo Enterprise — Tam Kapsamlı Mobil Uyumluluk (Responsive & Touch-First) Planı

Bu doküman, projedeki **tüm sayfaların, tabloların, modalların ve menülerin** telefon (`360px – 767px`), tablet (`768px – 1023px`) ve masaüstü (`1024px+`) ekranlarda kusursuz, hızlı ve tek elle (başparmak ergonomisiyle) kullanılabilir hale getirilmesi için hazırlanmış uygulama planıdır.

---

## 1. Mevcut Durum Analizi (Tespit Edilen Mobil Sorunlar)

 Kod tabanındaki tüm bileşenler incelendiğinde mobilde kullanımı zorlaştıran **7 temel darboğaz** tespit edilmiştir:

1. **Sabit Sol Menü (`src/app/page.tsx`):** `w-64` (`256px`) genişliğindeki sol menü mobilde gizlenmediği için telefon ekranının **%66'sını** kaplamakta, sağdaki içerik alanına yalnızca `~130px` yer bırakmaktadır.
2. **Üst Bar & Bildirim Taşmaları (`src/app/page.tsx`, `src/app/layout.tsx`):** Üst bardaki Trendyol/Hepsiburada/XML rozetleri dar ekranda sıkışmakta; `viewport` meta tanımı ve iOS Safari form yakınlaştırma (`16px` input kuralı) eksiktir.
3. **Giriş Ekranı Sıralaması (`src/app/login/page.tsx`):** Mobilde uzun sol tanıtım bloğu üstte kaldığı için kullanıcı giriş formuna ulaşmak için ekranı aşağı kaydırmak zorunda kalmaktadır.
4. **Geniş Veri Tabloları (`ProductsView`, `OrdersAndClaimsView`, `BulkAndRobotView`, `CatalogMappingsView`):** 6–7 sütunlu tablolar telefonda aşırı yatay kaydırma gerektirmekte, ürün düzenleme ve kargo fişi yazdırma aksiyonlarına erişimi zorlaştırmaktadır.
5. **4 Adımlı XML Sihirbazı & Fiyat Kuralları Tablosu (`XmlView.tsx`):** Sol adım çubuğu mobilde formun üstünde çok yer kaplamakta, 3. adımdaki 7 sütunlu fiyat kuralı input tablosu (`FİYAT >=`, `< FİYAT`, `İŞLEM MİKTARI`, `EK FİYAT`) telefonda daralmaktadır.
6. **9 Sekmeli Genel Ayarlar Menüsü (`GeneralSettingsPanel.tsx` & `SettingsAndAdminView.tsx`):** Sol kategori menüsündeki `sticky top-20` kuralı mobilde ekranın üstünü kapatmakta; Pazaryeri API kartlarındaki `grid-cols-2` / `grid-cols-3` alanlar (`Sevkiyat Adres ID`, `İade Adres ID` vb.) dar ekranda sıkışmaktadır.
7. **Modallar ve Kargo Etiketi Yazdırma (`ProductsView`, `OrdersAndClaimsView`, `BulkAndRobotView`):** Geniş modallar mobilde tam ekran alt çekmece (*Bottom Sheet / Fullscreen Modal*) yapısında değildir.

---

## 2. Tasarım İlkeleri (Mobile-First & Touch-First Standartları)

- **Minimum Dokunma Alanı:** Tüm buton, sekme, onay kutusu ve seçim alanları en az **`44x44px`** dokunma alanına sahip olacak.
- **iOS Otomatik Yakınlaştırma Engeli:** Mobilde (`< 640px`) tüm `input`, `select` ve `textarea` alanları `text-base` (`16px`), masaüstünde `sm:text-sm` (`14px`) olacak.
- **Hibrit Tablo / Kart Mimarisi:** Masaüstünde (`md:block`) mevcut detaylı tablolar birebir korunacak; mobilde (`md:hidden`) yatay kaydırma gerektirmeyen **Mobil Operasyon Kartları** gösterilecek.
- **Güvenli Alan (Safe-Area) Desteği:** Çentikli iPhone ve Android cihazlar için `viewport-fit=cover` ve alt navigasyon barında `pb-[env(safe-area-inset-bottom)]` uygulanacak.

---

## 3. Faz Bazlı Uygulama Planı

### Faz 1: Ana İskelet, Mobil Çekmece Menü ve Alt Hızlı Navigasyon
**Etkilenen Dosyalar:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

1. **Viewport & Global CSS (`layout.tsx`, `globals.css`):**
   - `export const viewport: Viewport` eklenecek (`width: 'device-width'`, `initialScale: 1`, `viewportFit: 'cover'`).
   - Yatay kaydırma çubuğu gizleyici (`.no-scrollbar`), güvenli alan (`safe-bottom`) ve `@media print` kargo fişi yazdırma kuralları eklenecek.
2. **Mobil Off-Canvas Sol Menü (`page.tsx`):**
   - Masaüstünde (`lg:flex`) sabit kalan sol menü, mobil ve tablette (`< 1024px`) sol üstteki **Hamburger Menü (`Menu`)** butonuyla açılan karartmalı (*backdrop*) kayar çekmeceye (`fixed inset-y-0 left-0 z-50 w-72`) dönüştürülecek.
   - Herhangi bir menü kalemine tıklandığında çekmece otomatik kapanacak ve sayfa en üste kayacak.
3. **Mobil Alt Hızlı Erişim Barı (`Bottom Tab Bar` - `lg:hidden`):**
   - Ekranın altında başparmak erişim alanında sabit 5 ana sekme yer alacak:
     1. `Panel` (`dashboard`)
     2. `Siparişler` (`orders` + sipariş sayısı rozeti)
     3. `Ürünler` (`products`)
     4. `XML` (`xml`)
     5. `Diğer / Menü` (Sol çekmeceyi açar)
4. **Mobil Üst Bar & Yönetim Paneli (Dashboard):**
   - Üst bar mobilde `h-14 px-3.5` ölçüsüne inecek; mağaza geçiş seçicisi ve XML kısayolu kompakt hale getirilecek.
   - Dashboard üzerindeki 4 özet kartı `grid-cols-2 lg:grid-cols-4`, hızlı operasyon butonları ise mobilde `grid-cols-1 sm:grid-cols-2` tam genişlikte olacak.

---

### Faz 2: Giriş / Kayıt Ekranı Mobil Optimizasyonu
**Etkilenen Dosya:** `src/app/login/page.tsx`

1. **Form Öncelikli Sıralama (`order-1 lg:order-2`):**
   - Mobilde sayfa açıldığı anda üstte kompakt Sopyo logosu + hemen altında **Giriş Yap / Ücretsiz Kayıt Ol** formu görünecek.
   - Sol tanıtım ve pazaryeri rozetleri alanı mobilde formun altına kompakt bilgi kartı olarak taşınacak.
2. **Form Ergonomisi:** Tüm giriş kutuları ve şifre göster/gizle butonu `44px+` yüksekliğe kavuşturulacak.

---

### Faz 3: Ürün Listesi & Ürün Düzenleme Modalı
**Etkilenen Dosya:** `src/components/views/ProductsView.tsx`

1. **Açılır/Kapanır Mobil Filtre Paneli:**
   - Mobilde arama kutusunun yanında **"Filtrele (Aktif Filtre Sayısı)"** butonu yer alacak; 4 adet seçim kutusu (`Platform`, `Kategori`, `Marka`, `Fiyat Kilidi`) istendiğinde açılıp kapanacak, böylece ürünler ekranın hemen üstünde başlayacak.
2. **Mobil Ürün Kartları (`md:hidden`):**
   - Her ürün için: Ürün görseli + Stok Kodu + Satışta/Kapalı rozeti + Ürün başlığı + 3'lü fiyat kutusu (`XML Baz | Trendyol | Hepsiburada`) + Net/Rezerve stok + `TY / HB` durum etiketleri + tam genişlik **`DÜZENLE`** butonu.
   - `0,00 TL` uyarı kutusu ve sayfalama (`Önceki / Sonraki` + `20/50/100`) mobilde tek satıra sığacak şekilde düzenlenecek.
3. **Tam Ekran Mobil Ürün Düzenleme Modalı:**
   - Mobilde tam ekran (`h-[100dvh] rounded-none sm:rounded-2xl`), üst başlık sabit, alt **`Vazgeç / KAYDET & GÜNCELLE`** çubuğu sabit olacak.
   - Varyant tablosu mobilde kart görünümüne (`Renk / Beden / Barkod / Net Stok`) dönüşecek.

---

### Faz 4: Siparişler, Faturalar, İadeler ve Kargo Fişi Yazdırma
**Etkilenen Dosya:** `src/components/views/OrdersAndClaimsView.tsx`

1. **Kaydırılabilir Üst Sekme ve Durum Çipleri:**
   - `Siparişler`, `İade Yönetimi`, `Raporlar` sekmeleri ve `Tümü / Gönderime Hazır / Kargolandı / Teslim Edildi` filtreleri yatay kaydırılabilir çip barı (`overflow-x-auto whitespace-nowrap no-scrollbar`) olacak.
2. **Mobil Sipariş & İade Kartları (`md:hidden`):**
   - Sipariş No + Pazaryeri rozeti + Tarih, Alıcı & İl/İlçe, Ürün & **Maskeli Fatura Başlığı**, Tutar, Sipariş Durumu seçicisi ve yan yana büyük **`Kargo Fişi`** + **`Fatura Kes`** butonları.
3. **Mobil Kargo Fişi Önizleme & Yazdırma Modalı:**
   - Telefondan açıldığında taşma yapmayan duyarlı etiket önizlemesi ve mobilden `Yazdır` (AirPrint / PDF Kaydet) dendiğinde arka planı gizleyip sadece barkodlu kargo fişini çıkaran `@media print` desteği.

---

### Faz 5: XML Kaynakları ve 4 Adımlı Sopyo XML Sihirbazı
**Etkilenen Dosya:** `src/components/views/XmlView.tsx`

1. **XML Kaynak Kartları:**
   - Kaynak satırındaki 5 aksiyon butonu (`Canlı XML Çek`, `% + ₺ Fiyat Ayarı`, `Düzenle`, `Rapor`, `Sil`) mobilde taşmadan 2 satırlı dokunmatik buton ızgarasına yerleşecek.
2. **4 Adımlı Sihirbaz (`TANIMLAMA -> ÜRÜN -> FİYAT -> ONAY`):**
   - Sol paneldeki dikey 4 adım listesi mobilde kompakt yatay adım çubuğuna (`1 ✓ — 2 ● — 3 ○ — 4 ○` + `% İlerleme`) dönüşecek; IP bilgilendirme kutusu formun altına inerek form alanına yer açacak.
   - **3. Adım & 4. Adım Pazaryeri Fiyat Kuralları Tablosu:** Mobilde 7 sütunlu tablo yerine her fiyat aralığı (`FİYAT >= 1 | < FİYAT 299 | +%105 | +75 TL`) kendi başlıklarıyla 2 sütunlu temiz kartlar halinde düzenlenebilecek.
   - Alt `← ÖNCEKİ ADIM` ve `DEVAM ET → / ONAYLA VE BİTİR →` butonları mobilde alt kısımda sabit ve tam genişlikli olacak.

---

### Faz 6: Toplu İşlemler, Rekabet Robotu & Trendyol Canlı Ürünler
**Etkilenen Dosya:** `src/components/views/BulkAndRobotView.tsx`

1. **5'li Sekme Çubuğu:** Yatay kaydırılabilir sekme çipleri (`overflow-x-auto no-scrollbar`).
2. **Trendyol Canlı Ürünler & 2 Aşamalı Arşiv/Silme Ekranı:**
   - 6'lı canlı sayaç kartları mobilde `grid-cols-2` düzeninde kompakt görünecek.
   - `1. Adım: Arşivle` ve `2. Adım: Kalıcı Sil` butonları mobilde tam genişlikli dikey aksiyon grubu olacak.
   - Canlı Trendyol ürünleri mobilde seçilebilir kartlar (`md:hidden`) olarak listelenecek.
3. **Fiyat Formülü (`+%` ve `+TL`) & Rekabet Robotu:** Mobilde tek sütunlu akıcı kartlar ve tam ekran modal yapısı.

---

### Faz 7: Katalog Eşitleme, Pazaryeri API ve 9 Sekmeli Genel Ayarlar
**Etkilenen Dosyalar:** `src/components/views/CatalogMappingsView.tsx`, `src/components/views/SettingsAndAdminView.tsx`, `src/components/views/GeneralSettingsPanel.tsx`

1. **Kategoriler / Markalar / Seçenekler (`CatalogMappingsView.tsx`):**
   - Mobilde kategori ve marka satırları kart görünümüne (`md:hidden`) kavuşturulacak; Kategori Eşitleme Modalı tam ekran alt çekmece olacak.
2. **Pazaryeri API & Süper Admin (`SettingsAndAdminView.tsx`):**
   - Trendyol ve Hepsiburada API formlarındaki dar `grid-cols-2` ve `grid-cols-3` alanlar `grid-cols-1 sm:grid-cols-2` ve `grid-cols-1 sm:grid-cols-3` yapılarak mobilde tam genişlikte rahat yazılabilir hale getirilecek.
3. **9 Sekmeli Genel Ayarlar (`GeneralSettingsPanel.tsx`):**
   - Sol menüdeki `sticky top-20` kuralı yalnızca masaüstünde (`lg:sticky lg:top-20`) çalışacak; mobilde 9 kategori üstte **yatay kaydırılabilir sabit sekme barına** dönüşecek.
   - Üst arama çubuğu ve **`AYARLARI KAYDET →`** butonu mobilde her an erişilebilir sabit alt/üst aksiyon düzenine kavuşturulacak.

---

### Faz 8: PWA (Progressive Web App) & "Ana Ekrana Ekle" Uygulama Desteği
**Etkilenen Dosyalar:** `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `public/sw.js`, `src/app/layout.tsx`, `src/app/page.tsx`

1. **Next.js App Router Web App Manifest (`src/app/manifest.ts`):**
   - `name`: `"Sopyo Pro — XML & Pazaryeri Yönetimi"`
   - `short_name`: `"Sopyo Pro"`
   - `display`: `"standalone"` (tarayıcı adres çubuğunu gizleyip yerel mobil uygulama gibi tam ekran açılır)
   - `orientation`: `"portrait"`
   - `background_color` & `theme_color`: `"#0f172a"`
   - **Uygulama Kısayolları (`shortcuts`):** İkona basılı tutulduğunda doğrudan *Siparişler*, *Ürünler* ve *XML Kaynakları* ekranlarını açan hızlı kısayollar.
2. **iOS & Android Uygulama İkonları ve Apple Web App Meta (`icon.tsx`, `apple-icon.tsx`, `layout.tsx`):**
   - `192x192`, `512x512` maskable PWA ikonları ve iPhone/iPad için `180x180` `apple-touch-icon`.
   - `appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Sopyo Pro' }` tanımı.
3. **Hafif Service Worker & "Uygulamayı Yükle" Butonu (`public/sw.js`, `page.tsx`):**
   - Android Chrome'da yerel **"Uygulamayı Telefonuna Yükle"** (`beforeinstallprompt`) kurulum butonu ve iOS Safari için tek tıkla **"Paylaş → Ana Ekrana Ekle"** rehber kutucuğu.
   - Statik varlık önbellekleme ve ağ koptuğunda kullanıcı dostu bağlantı uyarısı (API ve canlı stok verilerini asla bayat önbellekten dönmeyecek şekilde `network-only` koruyarak).

---

## 4. Doğrulama ve Test Adımları

1. `npm run build` ile TypeScript ve Next.js üretim derlemesi kontrolü.
2. Mobil (`375x812` - iPhone boyutları), Tablet (`768x1024` - iPad boyutları) ve Masaüstü (`1440x900`) kırılımlarında yatay taşma (`horizontal overflow = 0`) kontrolü.
3. GitHub (`main`) push ve canlı **Vercel** (`https://xml-entegrasyon-orcin.vercel.app`) dağıtımı.
