# Sopyo Genel Ayarlar (`/settings/company/edit`) Birebir Entegrasyon Planı

Bu doküman, `https://app.sopyo.com/settings/company/edit` sayfasından Chrome DevTools MCP ile çekilen **9 sol kategori filtresi** ve **toplam 65 ayar alanının** projemize (`Next.js + Supabase + Vercel`) birebir entegre edilmesi için hazırlanmış uygulama planıdır.

---

## 1. Sayfa Mimarisi ve Sol Kategori Menüsü (`SettingsAndAdminView.tsx`)

- **Üst Arama Çubuğu (`#SopyoSearch`):** Ayar başlığı veya açıklamasına göre anlık filtreleme (`"Ara..."`).
- **Sol Kategori Filtre Menüsü (9 Sekme):**
  1. `Tüm Ayarlar` (`filter-none`)
  2. `Firma Ayarları` (`filter-personel`)
  3. `Fatura Ayarları` (`filter-invoices`)
  4. `Ürün Listesi Ayarları` (`filter-productlist`)
  5. `Pazaryeri Ayarları` (`filter-marketplace`)
  6. `Kargo Etiket Ayarları` (`filter-cargotag`)
  7. `Fatura Açıklama Alanı Tanımları` (`filter-invoicesdesc`)
  8. `Bildirim Ayarları` (`filter-notification`)
  9. `Ürün Ayarları` (`filter-productSettings`)
- **Alt Sabit Kaydet Barı:** Sağ altta yeşil **`AYARLARI KAYDET →`** butonu.

---

## 2. Sekme Bazlı Tüm Form Alanları ve Varsayılan (LuneRose) Değerleri

### 2.1. Firma Ayarları (`filter-personel`)
| Alan Adı (`name` / `id`) | Etiket | Tip | Mevcut Değer | Açıklama / Not |
| :--- | :--- | :--- | :--- | :--- |
| `customerLogo` | **Firma Logosu:** | `file` / URL | `""` | Firma logosu yükleme alanı |
| `customerSlogan` | **Slogan:** | `text` | `""` | Firma sloganı |
| `customerName` | **Firma Adı : \*** | `text` | `"LuneRose"` | Zorunlu alan |
| `customerPhone` | **Telefon: \*** | `tel` | `"0(545) 146 11 58"` | *"Güvenlik kodları bu numaraya gelir. Hesabım'dan değiştir ›"* |
| `customerMail` | **Bilgilendirme E-posta Adresi:** | `email` | `"zekihamdicinarr@gmail.com"` | Bildirimlerin gideceği e-posta |
| `userMail` | **Kullanıcı Giriş E-posta Adresi: \*** | `email` | `"zekihamdicinarr@gmail.com"` | Sisteme giriş e-postası |
| `customerAddress` | **Firma Adresi:** | `text` | `""` | Gönderici / firma açık adresi |
| `customerWebsite` | **Firma Websitesi:** | `text` | `""` | Firma web sitesi |

---

### 2.2. Fatura Ayarları (`filter-invoices`)
| Alan Adı (`name` / `id`) | Etiket | Tip | Mevcut Değer | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| `customerInvoiceCheck` | **Fatura No Takibi Yapılsın Mı?:** | `checkbox` | `false` (`Ayarı Aç`) | İlgili ayar aktif hale getirilirse Son Yazdırılan Fatura No alanına girmiş olduğunuz değer otomatik olarak arttırılmaya başlar. |
| `customerInvoiceLastNumber` | **Son Yazdırılan Fatura No:** | `text` | `"0"` | Fatura no takibi yapmak için Fatura No Takibi Yapılsın Mı? seçeneğinin seçili olduğundan emin olunuz. |
| `customerTaxRate` | **Genel KDV Oranı** | `select` | `"20"` | Seçenekler: `---`, `20`, `18`, `10`, `8`, `2`, `1`, `0` |
| `customerAutoInvoice` | **Onaylı Siparişler Otomatik Olarak Fatura Listesine Aktarılsın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | Onaylamış olduğunuz siparişlerin otomatik olarak faturalandırma sekmesine aktarılmasını sağlar. |
| `customerInvoiceMaskStatus` | **Fatura kalemlerinde ürün isimleri maskelensin mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Satmış olduğunuz tüm ürünlerin faturada yer alan ürün isimlerini maskelemek istiyorsanız ilgili ayarı aktif hale getirebilirsiniz. Aktif edildiğinde aşağıdaki 2 kutucuk açılır: |
| `customerInvoiceMaskStockCode` | ↳ **Stok Kodu:** | `text` | `""` | Maskeli faturada görünecek stok kodu (`#invoiceMaskArea`) |
| `customerInvoiceMaskProductName` | ↳ **Ürün İsmi(Fatura Başlığı):** | `text` | `""` | Maskeli faturada görünecek ürün başlığı (`#invoiceMaskArea`) |
| `customerInDateFaturaStatus` | **Fatura kesildiğinde, faturanın kesildiği zamanın tarihi kullanılsın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | Fatura kesme işleminizde faturanın kesildiği zamanın tarih ve saati otomatik olarak fatura kesilme tarihi olarak eklenir. |

---

### 2.3. Ürün Listesi Ayarları (`filter-productlist`)
| Alan Adı (`name` / `id`) | Etiket | Tip | Mevcut Değer | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| `productListSortType` | **Ürünler Hangi Kurala Göre Sıralansın?:** | `select` | `""` (`En Son Eklenen En Üstte`) | Seçenekler: `En Son Eklenen En Üstte` (`""`), `Ürün Adı(A-Z)` (`sortName-asc`), `Ürün Adı(Z-A)` (`sortName-desc`), `Ürün Fiyatı(Küçükten Büyüğe)` (`sortPrice-asc`), `Ürün Fiyatı(Büyükten Küçüğe)` (`sortPrice-desc`), `Ürün Stoğu(Küçükten Büyüğe)` (`sortStok-asc`), `Ürün Stoğu(Büyükten Küçüğe)` (`sortStok-desc`) |
| `productListPerPage` | **Ürünler Kaç Adet Listelensin?:** | `select` | `"20"` | Seçenekler: `20`, `50`, `100` |
| `productListBarcodeNoStatus` | **Ürünler Listesinde Barkod Numarası Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Ürünler sayfasında yer alan listedeki ürün barkod numarasını göstermek için ilgili ayarı açabilirsiniz. |
| `productListAddedDateStatus` | **Ürünler Listesinde Eklenme Tarihi Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Ürünler sayfasındaki listede, kaynak bilgisinin altında ürünün eklenme tarihini göstermek için ilgili ayarı açabilirsiniz. |

---

### 2.4. Pazaryeri Ayarları (`filter-marketplace`)
| Alan Adı (`name` / `id`) | Etiket | Tip | Mevcut Değer | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| `customerUseMinPrice` | **Minimum Fiyat Alanı Kullanılsın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | Ürün detay sayfasında yer alan fiyatlar bölümünde Minimum Fiyat kutucuğunu göstermek için ilgili ayarı açabilirsiniz. |
| `customerAutoN11Confirm` | **N11 Siparişleri Otomatik Onaylansın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | N11'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz. |
| `customerHBWaitingOrderStatus` | **Hepsiburada Onaylanmamış Siparişler Getirilsin mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Hepsiburada'dan gelen siparişlerinizi onaylamadan Sopyo panelinizde görmek istiyorsanız ilgili ayarı açabilirsiniz. |
| `customerAutoAkakceConfirm` | **Akakçe Siparişleri Otomatik Onaylansın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | Akakçe'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz. |
| `customerAutoPazaramaConfirm` | **Pazarama Siparişleri Otomatik Onaylansın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | Pazarama'dan gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz. |
| `customerUseMarketDesc` | **Her Pazaryeri İçin Farklı Ürün Açıklaması Girilebilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Her pazaryeri için birbirinden farklı açıklama girmek istiyorsanız ilgili ayarı açabilirsiniz. |
| `customerGGAutoReList` | **Gittigidiyor'da Süresi Biten Ürünler Otomatik Yeniden Listelensin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Süresi biten ilanların otomatik yeniden listelenmesi. |
| `autoIdefixConfirm` | **İdefix Siparişleri Otomatik Onaylansın mı?:** | `checkbox` | `false` (`Ayarı Aç`) | İdefix'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz. |

---

### 2.5. Kargo Etiket Ayarları (`filter-cargotag`)
| Alan Adı (`name` / `id`) | Etiket | Tip | Mevcut Değer | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| `customerUseAdvancedCargoLabel` | **Gelişmiş Kargo Etiket Modülü Kullanılsın mı ? :** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketlerinizi kendinize özel tasarlayabilirsiniz. |
| `customerShowStockCargoReceipt` | **Kargo Etiketinde Kalan Stok Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde yer alan ürünlerde kalan stok miktarının gösterilmesini sağlar. |
| `customerShowProductCargoReceipt` | **Kargo Etiketinde Ürünler gösterilsin Mi?:** | `checkbox` | **`true` (`Ayarı Kapat`)** | Kargo etiketinde yer alan bilgiler içerisinde ürünler gösterilmesini sağlar. |
| `customerShowPriceCargoReceipt` | **Kargo Etiketinde Ürün Fiyatı Gösterilsin Mi?:** | `checkbox` | **`true` (`Ayarı Kapat`)** | Kargo etiketinde yer alan ürünlerde fiyat alanının gösterilmesini sağlar. |
| `customerCargoReceiptBillingInfoShow` | **Kargo Etiketinde Fatura Bilgileri Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde müşterinin fatura bilgilerinin gösterilmesini sağlar. |
| `showDetailOrderReceipt` | **Fatura Listesinde Detaylı Sipariş Fişi Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Fatura listesinde detaylı sipariş fişi butonunu açmak için aktif hale getirebilirsiniz. |
| `customerCargoReceiptTemplateType` | **Bir Sayfada Kaç Adet Kargo Etiketi Yer Alsın?:** | `select` | **`"1"` (`4'lü Kargo Fişi`)** | Seçenekler: `Tek Kargo Fişi` (`0`), `2'li Kargo Fişi` (`2`), **`4'lü Kargo Fişi` (`1`)**, `Barkod Yazıcısı` (`3`), `Argox Barkod Yazıcısı` (`4`) |
| `customerCargoReceiptStockCodeShow` | **Kargo Etiketinde Stok Kodu Gösterilsin Mi?:** | `checkbox` | **`true` (`Ayarı Kapat`)** | Kargo etiketinde yer alan ürünlerde stok kodunun gösterilmesini sağlar. |
| `customerCargoReceiptCompanyAdressShow` | **Kargo Etiketinde Gönderici Adresi Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde gönderici adresinin gösterilmesini sağlar. |
| `customerCargoReceiptPhoneShow` | **Kargo Etiketinde Gönderici Telefonu Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde gönderici telefon bilgisinin gösterilmesini sağlar. |
| `customerCargoReceiptMailShow` | **Kargo Etiketinde Alıcı E-posta Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde alıcı e-posta bilgisinin gösterilmesini sağlar. |
| `customerOrderPaymentShow` | **Kargo Etiketinde Ödeme Bilgisi Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde ödeme bilgisinin gösterilmesini sağlar. |
| `customerOrderDescShow` | **Kargo Etiketinde Sipariş Açıklaması Gösterilsin Mi?:** | `checkbox` | `false` (`Ayarı Aç`) | Kargo etiketinde sipariş açıklaması gösterilmesini sağlar. |
| `customerCargoReceiptFontSize` | **Kargo Etiketi Yazı Tipi Büyüklüğü:** | `text` | **`"7.7"`** | Kargo etiketindeki yazı boyutlarını belirlemenizi sağlar. |

---

### 2.6. Fatura Açıklama Alanı Tanımları (`filter-invoicesdesc`)
| Alan Adı (`name` / `id`) | Etiket | Mevcut Değer |
| :--- | :--- | :--- |
| `customerN11InvoiceDesc` | **N11 Fatura Açıklaması:** | `"İş bu fatura tutarı n11 Elektronik Ticaret ve Bilişim Hizmetleri A.Ş. hesabına devredilmiştir."` |
| `customerGGInvoiceDesc` | **Amazon Fatura Açıklaması:** | `"İş bu fatura tutarı Gitti Gidiyor Bilgi Teknolojileri San. ve Tic. A.Ş. hesabına devredilmiştir."` |
| `customerHBInvoiceDesc` | **Hepsiburada Fatura Açıklaması:** | `"İş bu fatura tutarı D-Market Elektronik Hiz. ve Tic. A.Ş. hesabına devredilmiştir."` |
| `customerTrendyolInvoiceDesc` | **Trendyol Fatura Açıklaması:** | `"İş bu fatura tutarı DSM Grup Danışmanlık İletişim ve Satış Tic.A.Ş hesabına devredilmiştir."` |
| `customerAkakceInvoiceDesc` | **Akakçe Fatura Açıklaması:** | `""` |
| `customerCiceksepetiInvoiceDesc` | **Çiçeksepeti Fatura Açıklaması:** | `""` |
| `customerPttavmInvoiceDesc` | **Pttavm Fatura Açıklaması:** | `""` |
| `customerMorhipoInvoiceDesc` | **Morhipo Fatura Açıklaması:** | `""` |
| `customerAmazonInvoiceDesc` | **Amazon Fatura Açıklaması:** | `""` |
| `customerPazaramaInvoiceDesc` | **Pazarama Fatura Açıklaması:** | `"İş bu fatura tutarı Topkapı Danışmanlık Elektronik Hiz. Paz. Tic. A.Ş hesabına devredilmiştir."` |
| `customerIdefixInvoiceDesc` | **İdefix Fatura Açıklaması:** | `""` |
| `customerCargoReceiptDesc` | **Kargo Etiketi Özel Açıklama:** | `""` |

---

### 2.7. Bildirim Ayarları (`filter-notification`)
| Alan Adı (`name` / `id`) | Etiket | Mevcut Değer | Açıklama |
| :--- | :--- | :--- | :--- |
| `notificationAlertStatus` | **Anlık Bildirimler gösterilsin mi?:** | **`true` (`Ayarı Kapat`)** | Sopyo panelinde tüm bildirimleri görmek için aktif hale getirebilirsiniz. |
| `notificationMailStatus` | **Bildirimler E-Posta olarak gönderilsin mi?:** | **`true` (`Ayarı Kapat`)** | Sopyo'ya gelen tüm bildirimleriniz E-Posta ile gönderilmesi için aktif hale getirebilirsiniz. |
| `featureAlertStatus` | **Duyuru & Yenilikleri bildir:** | **`true` (`Ayarı Kapat`)** | Yapılan yenilikleri ve önemli bilgilendirmeleri bildirim kanallarından iletir. |
| `packageAlertStatus` | **Paket uyarılarını bildir:** | **`true` (`Ayarı Kapat`)** | Paket kalan kullanım sürelerini bildirim kanallarından iletir. |
| `getProductAlertStatus` | **Ürün çekim raporlarını bildir:** | **`true` (`Ayarı Kapat`)** | Dış kaynaktan ürün çekim işlemi tamamlandığında rapor bilgisi iletilir. |
| `bulkPublishProductAlertStatus` | **Toplu ürün gönderim raporlarını bildir:** | **`true` (`Ayarı Kapat`)** | Toplu ürün gönderimi tamamlandığında rapor bilgisi iletilir. |
| `bulkUpdateProductAlertStatus` | **Toplu ürün güncelleme raporlarını bildir:** | **`true` (`Ayarı Kapat`)** | Toplu ürün güncelleme işlemleri tamamlandığında rapor bilgisi iletilir. |
| `xmlCheckAlertStatus` | **XML kontrol raporlarını bildir:** | **`true` (`Ayarı Kapat`)** | XML kaynağınızın kontrolleri tamamlandığında rapor bilgisi iletilir. |
| `claimAlertStatus` | **İade geldiği zaman bildir:** | `false` (`Ayarı Aç`) | Desteklenen platformlardan iade geldiğinde bilgisi iletilir. |
| `aiHubReportAlertStatus` | **Ai hub işlem raporlarını bildir:** | `false` (`Ayarı Aç`) | AI Hub işlemlerinin raporları bildirim kanallarından iletilir. |

---

### 2.8. Ürün Ayarları (`filter-productSettings`)
| Alan Adı (`name` / `id`) | Etiket | Mevcut Değer |
| :--- | :--- | :--- |
| `combineProductCommonPrice` | **Gruplanmış ürünler için ortak fiyat uygulansın mı?:** | `false` (`Ayarı Aç`) |

---

## 3. Uygulama Adımları (İstediğiniz Zaman Başlatmak İçin)

1. **Tip & Veritabanı Güncellemesi (`src/types/sopyo.ts` & Supabase `tenants` tablosu):**
   - `Tenant` arayüzüne yukarıdaki tüm ayarların ekleneceği `generalSettings` alanı (veya doğrudan `Tenant` alanları) eklenecek ve Supabase `tenants` tablosuna `general_settings JSONB` kolonu eklenecek.
2. **Arayüz (`src/components/views/SettingsAndAdminView.tsx`):**
   - `Genel Ayarlar` sekmesi Sopyo'daki sol 9 filtreli menü + üst arama kutusu (`#SopyoSearch`) + 65 form alanı ve `Ayarı Aç / Ayarı Kapat` onay kutularıyla birebir kodlanacak.
3. **Canlı Fonksiyonel Bağlantılar:**
   - **Ürün Listesi Ayarları** (`productListSortType`, `productListPerPage`, `productListBarcodeNoStatus`, `productListAddedDateStatus`) doğrudan **Ürünler (`ProductsView.tsx`)** tablosunun varsayılan sıralama, sayfa başı ürün sayısı ve barkod/tarih gösterimine bağlanacak.
   - **Fatura & Kargo Etiketi Ayarları** (`customerInvoiceMaskStatus`, `customerCargoReceiptTemplateType`, `customerCargoReceiptFontSize` vb.) doğrudan **Siparişler (`OrdersView.tsx`)** fatura ve kargo fişi yazdırma şablonuna bağlanacak.
