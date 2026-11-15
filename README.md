# Sopyo Pro Clone — Trendyol & Hepsiburada Multi-Tenant XML Entegrasyon SaaS Platformu

Bu proje, **Sopyo**'nun XML entegrasyon, pazaryeri ürün aktarımı, dinamik fiyatlandırma, çapraz sipariş/stok düşme ve kargo etiketi/fatura maskeleme özelliklerini birebir karşılayan, **Next.js (App Router, TypeScript, Tailwind CSS) + Supabase + Vercel** mimarisiyle geliştirilmiş çok kullanıcılı (**Multi-Tenant SaaS**) bir e-ticaret entegrasyon sistemidir.

## Öne Çıkan Özellikler

1. **Çok Kullanıcılı (Multi-Tenant SaaS) Mağaza & Kullanıcı Yönetimi**:
   - `/login` üzerinden yeni kayıt olan her kullanıcıya otomatik olarak izole bir mağaza (`tenant_id`) oluşturulur.
   - Her mağaza kendi XML kaynaklarını, fiyat kurallarını ve **Trendyol / Hepsiburada** API bilgilerini bağımsız olarak yönetir.
   - **Süper Admin** paneli üzerinden tüm mağazalar ve kullanıcılar izlenebilir, limitler düzenlenebilir ve tek tıkla mağazalar arasında geçiş yapılabilir.

2. **4 Adımlı Sopyo XML Sihirbazı & Canlı XML Çekim Motoru (`fast-xml-parser`)**:
   - **1. Adım (Tanımlama)**: Ticimax / İdeasoft / Özel XML URL tanımlama.
   - **2. Adım (Ürün Ayarları)**: Stok kodu ön eki (`AX`), otomatik EAN-13 barkod üretimi, kritik stok sıfırlama (`<= 3` ise `0`), yeni ürün/fiyat/stok kilitleme.
   - **3. Adım (Fiyat Ayarları)**: Pazaryeri bazlı kademeli fiyat kuralları (Örn: Trendyol `1-299 TL -> +%105 + 75 TL`, Hepsiburada `1-143 TL -> +%120 + 80 TL`), fiyat yuvarlama (`,x9`, `,99`, `,x0`, `,00`, `,90`) ve dinamik XML etiket eşleştirme.
   - **4. Adım (Onay)** & **XML Kontrol Raporu**: `Kaynak`, `Stoğu Güncellenen`, `Fiyatı Güncellenen`, `Yeni Eklenen`, `Silinen` ürünlerin detaylı raporu.

3. **Akıllı Kategori, Marka ve Varyant (`Renk`/`Beden`) Eşleştirme**:
   - Tüm XML kategorilerini Trendyol ve Hepsiburada kategori ağacı ve zorunlu özellikleriyle **tek tıkla otomatik eşitleme**.
   - XML'den gelen geçersiz `"Görsel"` renk değerini ürün başlığındaki gerçek renge veya `"Çok Renkli"` değerine dönüştürerek pazaryeri batch hatalarını önleme.

4. **Otomatik Çapraz Pazaryeri Stoktan Düşme & Rezerve Stok Koruması**:
   - Trendyol veya Hepsiburada'dan gelen siparişler ürünün **Rezerve Sipariş Stoğunu** artırır (`Net Stok = XML Stok - Rezerve Sipariş Stoğu`).
   - XML senkronizasyonu tekrar çalışsa bile satılan ürünün stoğu ezilmez ve karşı pazaryerine anında düşülmüş net stok gönderilir.

5. **Gizli Paketleme (Fatura Başlığı Maskeleme) & Kargo Etiketi Şablonları**:
   - Kargo fişinde ve faturada hassas ürün adı yerine maskeli başlık (`"Tekstil & Ev Giyim Ürünü (AX11160)"`) gösterme.
   - A4 Tekli, 2'li, 4'lü, Termal Barkod (10x10) ve Argox barkod yazıcı şablonları.

6. **Fiyat Rekabet Robotu (Buybox) & Ürün Farklılık Kontrolü (`diffCheck`)**:
   - Belirlenen **Dip Fiyat (Min)** altına inmeden rakip mağaza fiyatlarını takip ederek Buybox 1. sırayı kazanacak şekilde otomatik fiyat optimizasyonu.

## Kurulum & Çalıştırma

```bash
npm install
cp .env.example .env.local
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açarak yönetim paneline ulaşabilirsiniz.

## Supabase Kurulumu

Supabase projenizi oluşturduğunuzda `supabase/migrations/0001_initial_schema.sql` dosyasındaki SQL kodunu Supabase **SQL Editor** ekranında çalıştırarak tüm Multi-Tenant tabloları ve RLS güvenlik politikalarını tek seferde oluşturabilirsiniz.
