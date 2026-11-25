# Faz 5 — Tasarım Token'ları, Dark Mode Kontrastı, Mobil Taşma ve Next.js Optimizasyon Planı

> **İlgili Takip Dosyası:** `DENETIM_RAPORU_VE_TAKIP.md`  
> **Kapsanan Denetim Maddeleri:** `1.1`, `1.2`, `1.3 (a, b, c)`, `1.4 (a, b, c)`, `1.5 (a, b)`, `1.6 (a, b, c)`, `2.1`, `2.3`, `4.5`  
> **Canlı Satış Güvenliği Garantisi:** Yalnızca CSS, arayüz bileşenleri, Next.js `error.tsx`/`loading.tsx` sınırları ve `next/dynamic` bundle bölünmesi kapsamdadır; XML/Trendyol/Hepsiburada backend iş mantığına ve canlı veritabanı verilerine dokunulmaz.

---

## 1. Atomik Uygulama Adımları

### [x] Adım 1: Tailwind v4 `@theme` Token'ları, OS Dark Mode Kontrastı ve Print CSS (`1.1`, `1.2`, `1.3`, `1.6.b`)
- `src/app/globals.css`: `@theme` bloğu (`--color-primary`, `--color-surface`, `--color-sidebar`, `--shadow-bottom-nav`), `:root { color-scheme: light; }`, form kontrolleri için varsayılan açık zemin/metin kontrastı ve kargo fişi yazdırma kesilmesini önleyen `@media print` kuralları.
- `src/app/manifest.ts`: Zemin renginin `--color-surface` (`#f1f5f9`) ile hizalanması.
- `src/app/page.tsx`: Sabit `bg-[#0f172a]` ve özel gölgenin tema sınıflarına (`bg-sidebar`, `bg-surface`, `shadow-bottom-nav`) geçirilmesi, koyu yükleme flaşının açık tema iskeletine çevrilmesi ve sidebar `<option>` kontrastının düzeltilmesi.

### [x] Adım 2: Next.js Hata/Yükleme Sınırları ve Dinamik Code-Splitting (`2.1`, `2.3`)
- Yeni: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/loading.tsx`.
- `src/app/page.tsx`: 6 büyük görünüm bileşeninin `next/dynamic` ile tembel yüklenerek ilk sayfa paket boyutunun (First Load JS) düşürülmesi.

### [x] Adım 3: Mobil Taşma, Tipografi, İkon Temizliği ve `next/image` (`1.2`, `1.4`, `1.5`, `1.6`, `4.5`)
- `OrdersAndClaimsView.tsx`: İade tablosuna `overflow-x-auto` + mobil kart görünümü; kargo etiketi modalına `print-modal-root`/`print-modal-card` + `grid-cols-1 sm:grid-cols-2` + taşmayan barkod.
- `CatalogMappingsView.tsx`: Varyant tablosuna `overflow-x-auto`, etiket noktalarında inline style yerine semantik Tailwind sınıf haritası, modal seçicilerde açık kontrast.
- `ProductsView.tsx` & `BulkAndRobotView.tsx`: Çift `<h1>` → `<h2>`, sayfalama `flex-wrap` + dokunma hedefi, modal input kontrastı, ürün/pazaryeri liste görsellerinde `next/image` (`width`/`height` + lazy loading).
- `XmlView.tsx`: Çift `<h1>` → `<h2>`, bozuk `'?'` / emoji / Unicode karakterlerinin `lucide-react` ikonlarıyla değişimi, kullanılmayan import temizliği, onay butonuna `savingWizard` kilidi ve `'9999999999999999'` yerine `'∞'`.
- `login/page.tsx`: Kullanılmayan `Layers` import temizliği.

---

## 2. Doğrulama Adımları

- [x] `npx tsc --noEmit` ve `npm run build` sıfır hata ile geçti; `/` sayfa boyutu `11.5 kB` (`114 kB` First Load JS) seviyesine indi.
- [x] Salt-okunur canlı HTTP kontrolü (`GET /login -> 200`, `GET / -> 307`, `GET /api/state -> 401`, `GET /manifest.webmanifest -> 200`) ile sayfa/API sağlığı doğrulandı.
