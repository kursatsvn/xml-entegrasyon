# Sopyo Enterprise — Proje Planları ve Geliştirme Kayıtları İndeksi

Bu klasör, **Sopyo Enterprise (Çok Kiracılı XML, Trendyol & Hepsiburada Entegrasyon Sistemi)** projesinde yapılan tüm güvenlik denetimlerini, mimari dönüşümleri, pazaryeri API entegrasyonlarını ve kullanıcı deneyimi/performans geliştirmelerini tek merkezde takip etmek amacıyla oluşturulmuştur.

---

## Hızlı Dosya Haritası

| Sıra | Dosya | Kapsam ve İçerik | Durum |
| :-: | :--- | :--- | :---: |
| **0** | [DENETIM_RAPORU_VE_TAKIP.md](./DENETIM_RAPORU_VE_TAKIP.md) | **Ana Denetim Raporu & Takip Matrisi:** 31 ana bulgu grubu (44 alt madde) ve Faz 1–8 genel tamamlanma durumu | **Tamamlandı (`%100`)** |
| **1** | [FAZ_1_ACIL_GUVENLIK_PLANI.md](./FAZ_1_ACIL_GUVENLIK_PLANI.md) | **Faz 1 — Acil Güvenlik Yamaları:** Oturum doğrulama, HMAC imzalı çerez, SSRF koruması (`url-guard.ts`), HTML/XSS sanitizer, `server_config` RLS ve RPC yetki kısıtları | **Tamamlandı** |
| **2** | [FAZ_2_AUTH_RLS_ZOD_PLANI.md](./FAZ_2_AUTH_RLS_ZOD_PLANI.md) | **Faz 2 — Kimlik Doğrulama, RLS & Zod:** `@supabase/ssr` geçişi, şifre güvenliği, kiracı bazlı sıkı RLS (`WITH CHECK`) ve tüm API uçlarında Zod şema doğrulaması (`validators.ts`) | **Tamamlandı** |
| **3** | [FAZ_3_VERI_PERFORMANS_HATA_PLANI.md](./FAZ_3_VERI_PERFORMANS_HATA_PLANI.md) | **Faz 3 — Veri Mimarisi, Performans & Hata Yönetimi:** Merkezi `apiPost()`, chunk'lı ürün okuma/yazma, `minPrice` & `marketplaceDescriptions` şema uyumu ve Lost Update koruması | **Tamamlandı** |
| **4** | [FAZ_4_UI_STATE_IS_MANTIGI_PLANI.md](./FAZ_4_UI_STATE_IS_MANTIGI_PLANI.md) | **Faz 4 — Güvenli UI State & İş Mantığı:** Mağaza değişiminde state izolasyonu, `Europe/Istanbul` tarih formatlayıcı (`date-format.ts`) ve kiracı bazlı dinamik veriler | **Tamamlandı** |
| **5** | [FAZ_5_TASARIM_UI_UX_APP_ROUTER_PLANI.md](./FAZ_5_TASARIM_UI_UX_APP_ROUTER_PLANI.md) | **Faz 5 — Tasarım, UI/UX & App Router Standartları:** Tailwind v4 `@theme` token'ları, `next/dynamic` code-splitting, `error.tsx`/`loading.tsx` sınırları, mobil kartlar ve yazdırma uyumu | **Tamamlandı** |
| **6** | [FAZ_6_HEPSIBURADA_API_TAM_ENTEGRASYON_PLANI.md](./FAZ_6_HEPSIBURADA_API_TAM_ENTEGRASYON_PLANI.md) | **Faz 6 — Hepsiburada API v1.0 Tam Entegrasyonu:** Trendyol ile %100 özellik eşitliği (MPOP katalog/import/tracking, Listing stok-fiyat/satışa aç-kapat/Buybox, OMS sipariş/etiket/iade) + XML `2.8.b/c` kuralları | **Tamamlandı** |
| **7** | [FAZ_7_ISLEM_GERIBILDIRIM_VE_SAYFA_KORUMA_PLANI.md](./FAZ_7_ISLEM_GERIBILDIRIM_VE_SAYFA_KORUMA_PLANI.md) | **Faz 7 — İşlem Geri Bildirimi & Sayfa Çıkış Koruması:** Tüm 10 sayfada merkezi `OperationLockModal` (süre sayacı + aşama bilgisi), `beforeunload` & menü navigasyon kilidi, `Dirty Form` uyarısı ve `ConfirmModal` | **Tamamlandı** |
| **8** | [FAZ_8_PG_CRON_VE_HEPSIBURADA_PERFORMANS_PLANI.md](./FAZ_8_PG_CRON_VE_HEPSIBURADA_PERFORMANS_PLANI.md) | **Faz 8 — Supabase `pg_cron` 3 Saatlik Zamanlayıcı & Performans:** `pg_cron + pg_net` dakik 3 saatlik tetikleyici, `/api/cron/sync` paralel + fark bazlı DB yazımı, çapraz sipariş stok düşümü ve HB 250'li retry paketleme | **Tamamlandı** |
| **Ek-1** | [SOPYO_FIRMA_AYARLARI_PLAN.md](./SOPYO_FIRMA_AYARLARI_PLAN.md) | **Genel Firma Ayarları Referans Planı:** 9 sekme / 65 ayar alanı (`GeneralSettingsPanel.tsx`) ve gizli paketleme/kargo etiketi entegrasyonu | **Tamamlandı** |
| **Ek-2** | [MOBIL_UYUMLULUK_PLANI.md](./MOBIL_UYUMLULUK_PLANI.md) | **Mobil & PWA Uyumluluk Planı:** iOS safe-area, mobil alt navigasyon barı, tablo → kart dönüşümleri ve PWA kurulum desteği | **Tamamlandı** |
