# Faz 4 — Güvenli UI State, Tarih/Saat Formatlama ve İş Mantığı Düzeltmeleri Planı

> **İlgili Takip Dosyası:** `DENETIM_RAPORU_VE_TAKIP.md`  
> **Kapsanan Denetim Maddeleri:** `2.2`, `2.5 (a, b, c)`, `2.7.c (UI bağlantı rozeti)`, `2.8.d`, `2.10 (b, c)`  
> **Kullanıcı Talebi ile Ertelenen Maddeler (DOKUNULMADI):**
> - **Hepsiburada API Entegrasyonu (`2.7.a`, `2.7.b` ve `testMarketplaceConnection` API çağrısı):** Kullanıcı daha sonra resmi Hepsiburada API dokümantasyonu yükleyerek bu geliştirmeyi yaptıracak.
> - **XML Motoru & Fiyat Kuralı Değişiklikleri (`2.8.b`, `2.8.c`, `xml-engine.ts`, `pricing-engine.ts`):** Canlı satışlarda fiyat/stok hatası riski olmaması için mevcut çalışan XML ve Trendyol akışına dokunulmadı.

---

## 1. Atomik Uygulama Adımları

### [x] Adım 1: Ortak Güvenli Tarih/Saat Formatlayıcı (`2.2`)
- Yeni: `src/lib/date-format.ts` (`formatTrDateTime`, `formatTrDate`, `formatTrTime` — `Invalid Date` koruması + sabit `timeZone: 'Europe/Istanbul'`).
- Uygulanan bileşenler: `src/app/page.tsx`, `OrdersAndClaimsView.tsx`, `ProductsView.tsx`, `SettingsAndAdminView.tsx`, `XmlView.tsx`.

### [x] Adım 2: Mağaza Değişiminde Form State Senkronu ve Zamanlayıcı Temizliği (`2.5`)
- **2.5.a:** `SettingsAndAdminView.tsx` içinde `tyForm` ve `hbForm` state'lerinin `tenant.id` / `marketplaceAccounts` değişiminde güncellenmesi + `page.tsx` içinde tüm ana görünümlere `key={data.tenant.id}` eklenmesi (önceki mağazanın API anahtarının yeni mağazaya yazılması engellenir).
- **2.5.b:** `BulkAndRobotView.tsx` içindeki hızlı fiyat kuralı input'larının (`tyPercent`, `tyExtraTl`, `hbPercent`, `hbExtraTl`) ve `newRobotProductId` seçiminin aktif mağazanın `xmlSources` ve `products` prop'larından senkronize edilmesi.
- **2.5.c:** `page.tsx` içindeki toast `setTimeout` zamanlayıcısının `useRef` ile temizlenmesi.

### [x] Adım 3: Dinamik Kiracı Bilgileri, Bağlantı Rozeti ve Ölü Durum Kontrolleri (`2.7.c UI`, `2.10.b`, `2.10.c`)
- **2.10.b:** `GET /api/state` yanıtına `currentUser` (`id`, `email`, `fullName`, `role`) eklenmesi; `page.tsx` içindeki sabit `"Zeki Hamdi Çınar"`, `"Trendyol: #1192080"`, `"Hepsiburada: LuneRose"` ve `"LuneRose Hızlı Operasyon Merkezi"` metinlerinin aktif kiracı/kullanıcı verisine bağlanması.
- **2.7.c (UI):** `SettingsAndAdminView.tsx` Trendyol & Hepsiburada kart başlıklarındaki sabit `"Bağlı"` rozetinin gerçek `connectionStatus` değerine (`connected` / `error` / `disconnected`) bağlanması.
- **2.10.c:**
  - `OrdersAndClaimsView.tsx`: Sipariş durumu `<select>` içine eksik `'pending'` ("Beklemede / Yeni") seçeneğinin eklenmesi, `"Kargo Fiși"` yazım hatasının `"Kargo Fişi"` olarak düzeltilmesi ve İade Yönetimi tablosundaki sabit `"Onaylandı"` rozetinin gerçek `c.status` değerine bağlanması.
  - `CatalogMappingsView.tsx`: Seçenek gruplarındaki sabit `"Eşitlendi"` rozetlerinin gerçek `vg.trendyolMapped` / `vg.hepsiburadaMapped` değerlerine bağlanması.
  - `ProductsView.tsx`: Ölü `statusFilter` state'inin ürün filtre çubuğuna aktif `<select>` (`Tümü / Aktif / Pasif`) olarak bağlanması.

### [x] Adım 4: Sahte XML Rapor Fallback'lerinin Temizlenmesi (`2.8.d`)
- `XmlView.tsx`: Seçili XML kaynağının raporu yoksa başka kaynağın raporunu (`xmlReports[0]`) veya sabit sahte sayıları (`8`, `7`) ve sahte SKU listelerini (`AX33322`, vb.) göstermek yerine gerçek boş durum / `0` verisi gösterilmesi.

---

## 2. Doğrulama Adımları (Salt-Okunur — Canlı XML/Trendyol/HB Çağrısı Yok)

- [x] `npx tsc --noEmit` ve `npm run build` sıfır hata ile geçti (4.0s).
- [x] Salt-okunur canlı HTTP testi (`GET /api/state`): `200 OK`, `hasCurrentUser: true`, `noPasswordLeaked: true`, `products: 1557`, `maskedSecrets: true` — canlı XML/Trendyol/Hepsiburada verilerine dokunulmadı.
