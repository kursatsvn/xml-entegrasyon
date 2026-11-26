import {
  BrandMapping,
  CategoryMapping,
  ClaimItem,
  MarketplaceAccount,
  Order,
  Product
} from '@/types/sopyo';
import {
  hepsiburadaFetch,
  normalizeHepsiburadaMerchantSku,
  parseHepsiburadaCategoryId
} from '@/lib/hepsiburada-client';
import {
  HepsiburadaCategoryAttribute,
  HepsiburadaAttributeValue,
  fetchHepsiburadaAttributeValues,
  fetchHepsiburadaCategoryAttributes
} from '@/lib/hepsiburada-catalog';
import { normalizeColorValue, normalizeSizeValue } from '@/lib/category-matcher';
import { sanitizeProductContent } from '@/lib/ai-sanitizer';
import { sanitizeRichHtml } from '@/lib/html-sanitizer';

export interface LiveHepsiburadaProductItem {
  hepsiburadaSku: string;
  merchantSku: string;
  barcode: string;
  title: string;
  brand: string;
  categoryName: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
  isSalable: boolean;
  isLocked: boolean;
  isSuspended: boolean;
  lockReasons: string[];
  deactivationReasons: string[];
  catalogStatus: 'MATCHED' | 'WAITING' | 'PRE_MATCHED' | 'MISSING_INFO' | 'REJECTED' | 'LISTING';
  rejectionReason?: string;
  dispatchTime: number;
  imageUrl: string;
}

export type HepsiburadaLiveFilter =
  | 'all'
  | 'on_sale'
  | 'passive'
  | 'locked'
  | 'waiting'
  | 'rejected';

function resolveMerchantSku(account: MarketplaceAccount, prod: Product, sku: string, barcode: string, vIdx: number): string {
  if (account.stockCodeType === 'barcode' && barcode) {
    return normalizeHepsiburadaMerchantSku(barcode);
  }
  if (account.stockCodeType === 'modelCode') {
    return normalizeHepsiburadaMerchantSku(sku || `${prod.stockCode}-${vIdx + 1}`);
  }
  return normalizeHepsiburadaMerchantSku(sku || prod.supplierStockCode || `${prod.stockCode}-${vIdx + 1}`);
}

function toDispatchDays(hours?: number): number {
  const h = Number(hours || 24);
  if (!Number.isFinite(h) || h <= 0) return 1;
  return Math.max(1, Math.min(15, Math.ceil(h / 24)));
}

/**
 * 1. Gerçek Hepsiburada Bağlantı Testi (Sahte ok:true dönmez)
 */
export async function testHepsiburadaConnection(account: MarketplaceAccount): Promise<{
  ok: boolean;
  message: string;
}> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const serviceKey = (account.apiSecret || '').trim();
  if (!merchantId || !serviceKey) {
    return { ok: false, message: 'Hepsiburada Merchant ID ve Servis Anahtarı zorunludur.' };
  }

  const res = await hepsiburadaFetch<any>(
    account,
    'listing',
    `/listings/merchantid/${encodeURIComponent(merchantId)}?offset=0&limit=1`,
    { timeoutMs: 10000 }
  );

  if (res.ok) {
    const totalCount = Number(res.data?.totalCount ?? res.data?.listings?.length ?? 0);
    return {
      ok: true,
      message: `Hepsiburada API bağlantısı başarılı! (Merchant ID: ${merchantId}, User-Agent: ${(account.apiKey || 'kodanka_dev').trim()}, Listing: ${totalCount})`
    };
  }

  return {
    ok: false,
    message: res.errorMessage || `Hepsiburada API bağlantısı başarısız (HTTP ${res.status}).`
  };
}

/**
 * 2. Gerçek Hepsiburada Stok & Fiyat Eşitleme (Listing API - inventory-uploads)
 * Resmi Şema: Kök JSON dizisi ([...]), PascalCase alan adları, maks 4000 SKU/istek.
 */
export async function syncHepsiburadaInventoryAndPrice(params: {
  account: MarketplaceAccount;
  products: Product[];
  useMinPrice?: boolean;
}): Promise<{
  remoteBatchId: string;
  attemptedCount: number;
  successCount: number;
  errorCount: number;
  errors: { stockCode: string; title: string; marketplace: string; message: string }[];
}> {
  const { account, products, useMinPrice = false } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const dispatchDays = toDispatchDays(account.dispatchTimeHours);
  const errors: { stockCode: string; title: string; marketplace: string; message: string }[] = [];
  const listingsPayload: Record<string, unknown>[] = [];
  const skuToMeta = new Map<string, { stockCode: string; title: string }>();

  for (const prod of products) {
    for (let vIdx = 0; vIdx < prod.variants.length; vIdx++) {
      const v = prod.variants[vIdx];
      if (!v.barcode && !v.sku) {
        errors.push({
          stockCode: prod.stockCode,
          title: prod.title,
          marketplace: 'Hepsiburada',
          message: 'Varyant SKU ve barkodu eksik.'
        });
        continue;
      }

      if (!v.salePrice || v.salePrice <= 0) {
        errors.push({
          stockCode: prod.stockCode,
          title: `${prod.title}${v.size ? ` (${v.size})` : ''}`,
          marketplace: 'Hepsiburada',
          message:
            '⚠️ XML fiyatı 0,00 TL olduğu için Hepsiburada\'ya gönderilmedi! Lütfen Ürünler sayfasından satış fiyatı giriniz.'
        });
        continue;
      }

      const rawPrice = Number(v.hepsiburadaSalePrice || prod.hepsiburadaSalePrice || v.salePrice);
      const minFloor = useMinPrice && prod.minPrice && prod.minPrice > 0 ? prod.minPrice : 0;
      const finalPrice = Number(Math.max(minFloor, rawPrice).toFixed(2));
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) continue;

      const merchantSku = resolveMerchantSku(account, prod, v.sku, v.barcode, vIdx);
      const item: Record<string, unknown> = {
        MerchantSku: merchantSku,
        AvailableStock: prod.status === 'active' ? Math.max(0, Math.floor(Number(v.netStock ?? 0))) : 0,
        Price: finalPrice,
        DispatchTime: dispatchDays
      };
      if (v.hepsiburadaSku) {
        item.HepsiburadaSku = v.hepsiburadaSku;
      }
      if (prod.maxPurchaseQty && prod.maxPurchaseQty > 0) {
        item.MaximumPurchasableQuantity = prod.maxPurchaseQty;
      }

      listingsPayload.push(item);
      skuToMeta.set(merchantSku, { stockCode: prod.stockCode, title: prod.title });
    }
  }

  let remoteBatchId = `HEPSIBURADA-INV-${Date.now()}`;
  const uploadIds: string[] = [];

  // Hepsiburada tek istekte maksimum 4000 SKU kabul eder
  for (let i = 0; i < listingsPayload.length; i += 4000) {
    const chunk = listingsPayload.slice(i, i + 4000);
    const res = await hepsiburadaFetch<any>(
      account,
      'listing',
      `/listings/merchantid/${encodeURIComponent(merchantId)}/inventory-uploads`,
      {
        method: 'POST',
        body: JSON.stringify(chunk),
        timeoutMs: 15000
      }
    );

    if (res.ok) {
      const uploadId = String(res.data?.id || res.data?.ticketId || '');
      if (uploadId) uploadIds.push(uploadId);
    } else {
      errors.push({
        stockCode: 'HB-INV-HTTP',
        title: `Hepsiburada Stok/Fiyat API Hatası (HTTP ${res.status})`,
        marketplace: 'Hepsiburada',
        message: res.errorMessage
      });
    }
  }

  if (uploadIds.length > 0) {
    remoteBatchId = uploadIds[0];
    // İlk paketin yükleme sonucunu kontrol et (outofpricerange / MinLock / eşleşmeyen SKU yakala)
    await new Promise((r) => setTimeout(r, 1500));
    const checkRes = await hepsiburadaFetch<any>(
      account,
      'listing',
      `/listings/merchantid/${encodeURIComponent(merchantId)}/inventory-uploads/id/${encodeURIComponent(remoteBatchId)}`,
      { timeoutMs: 10000 }
    );
    if (checkRes.ok && Array.isArray(checkRes.data?.errors)) {
      const seen = new Set<string>();
      for (const errItem of checkRes.data.errors) {
        const sku = String(errItem.merchantSku || errItem.MerchantSku || errItem.hepsiburadaSku || 'HB-SKU');
        const meta = skuToMeta.get(sku.toUpperCase()) || { stockCode: sku, title: sku };
        const msg = Array.isArray(errItem.errors)
          ? errItem.errors.join(' | ')
          : String(errItem.message || errItem.error || 'Stok/Fiyat güncelleme reddedildi');
        const key = `${meta.stockCode}::${msg}`;
        if (!seen.has(key)) {
          seen.add(key);
          errors.push({
            stockCode: meta.stockCode,
            title: meta.title,
            marketplace: 'Hepsiburada',
            message: msg
          });
        }
      }
    }
  }

  const failedStocks = new Set(errors.map((e) => e.stockCode));
  const successCount =
    listingsPayload.length === 0
      ? 0
      : failedStocks.has('HB-INV-HTTP')
      ? 0
      : Math.max(0, products.length - failedStocks.size);

  return {
    remoteBatchId,
    attemptedCount: products.length,
    successCount,
    errorCount: errors.length,
    errors
  };
}

function pickAllowedEnumValue(
  desired: string,
  allowedValues: HepsiburadaAttributeValue[],
  fallbacks: string[] = []
): string {
  if (allowedValues.length === 0) return desired;
  const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
  const candidates = [desired, ...fallbacks].filter(Boolean);

  for (const cand of candidates) {
    const cNorm = norm(cand);
    const exact = allowedValues.find((v) => norm(v.value) === cNorm);
    if (exact) return exact.value;
  }

  // S/M -> S-M veya S, L/XL -> L-XL veya L gibi esnek eşleştirme
  for (const cand of candidates) {
    const altSlash = cand.replace('/', '-');
    const altDash = cand.replace('-', '/');
    const altFirst = cand.split(/[\/\- ]/)[0];
    for (const alt of [altSlash, altDash, altFirst]) {
      if (!alt) continue;
      const aNorm = norm(alt);
      const exact = allowedValues.find((v) => norm(v.value) === aNorm);
      if (exact) return exact.value;
    }
  }

  for (const cand of candidates) {
    const cNorm = norm(cand);
    const partial = allowedValues.find(
      (v) => norm(v.value).includes(cNorm) || cNorm.includes(norm(v.value))
    );
    if (partial) return partial.value;
  }

  return allowedValues[0].value;
}

/**
 * 3. Gerçek Hepsiburada Ürün Gönderimi (MPOP /product/api/products/import - multipart/form-data)
 * Her kategori için gerçek MPOP zorunlu & varyant özelliklerini dinamik okuyarak eksiksiz doldurur.
 */
export async function publishProductsToHepsiburada(params: {
  account: MarketplaceAccount;
  products: Product[];
  categories: CategoryMapping[];
  brands: BrandMapping[];
  useMarketDesc?: boolean;
  useMinPrice?: boolean;
}): Promise<{
  remoteBatchId: string;
  attemptedCount: number;
  successCount: number;
  errorCount: number;
  errors: { stockCode: string; title: string; marketplace: string; message: string }[];
  syncedProductIds: string[];
}> {
  const {
    account,
    products,
    categories,
    brands,
    useMarketDesc = false,
    useMinPrice = false
  } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const catMap = new Map(categories.map((c) => [c.name, c]));
  const brandMap = new Map(brands.map((b) => [b.name, b]));

  const errors: { stockCode: string; title: string; marketplace: string; message: string }[] = [];
  const candidateProductIds: string[] = [];
  const importItems: Record<string, unknown>[] = [];
  const skuToProduct = new Map<string, { id: string; stockCode: string; title: string }>();

  // Gönderilecek ürünlerin benzersiz HB kategori şemalarını ve zorunlu enum değerlerini paralel önbellekle (hız optimizasyonu)
  const catSchemaMap = new Map<number, HepsiburadaCategoryAttribute[]>();
  const attrValuesMap = new Map<string, HepsiburadaAttributeValue[]>();
  const uniqueCatIds = Array.from(
    new Set(
      products
        .map((p) => parseHepsiburadaCategoryId(catMap.get(p.categoryName)?.hepsiburadaCategoryId))
        .filter((id): id is number => Boolean(id))
    )
  );

  const SCHEMA_CONCURRENCY = 6;
  for (let i = 0; i < uniqueCatIds.length; i += SCHEMA_CONCURRENCY) {
    const batchCids = uniqueCatIds.slice(i, i + SCHEMA_CONCURRENCY);
    await Promise.all(
      batchCids.map(async (cid) => {
        const attrRes = await fetchHepsiburadaCategoryAttributes(account, cid);
        if (attrRes.ok) {
          catSchemaMap.set(cid, attrRes.attributes);
          // Zorunlu veya varyant enum özelliklerin geçerli değer listesini çek (önbellekli)
          const enumTargets = attrRes.attributes.filter(
            (a) =>
              !a.isBase &&
              (a.mandatory || a.isVariant) &&
              a.type.toLowerCase().includes('enum')
          );
          await Promise.all(
            enumTargets.map(async (attr) => {
              const valRes = await fetchHepsiburadaAttributeValues(account, cid, attr.id);
              if (valRes.ok && valRes.values.length > 0) {
                attrValuesMap.set(`${cid}:${attr.id}`, valRes.values);
              }
            })
          );
        }
      })
    );
  }

  for (const prod of products) {
    const cat = catMap.get(prod.categoryName);
    const brand = brandMap.get(prod.brandName);

    const numericCatId = parseHepsiburadaCategoryId(cat?.hepsiburadaCategoryId);
    if (!cat || cat.hepsiburadaStatus === 'unmapped' || !numericCatId) {
      errors.push({
        stockCode: prod.stockCode,
        title: prod.title,
        marketplace: 'Hepsiburada',
        message: `Hepsiburada gerçek yaprak kategori ID eşitlenmedi (${prod.categoryName}). Kategoriler sekmesinden canlı Hepsiburada kategorisi seçin.`
      });
      continue;
    }

    const validImages = (prod.images || []).filter((url) => Boolean(url && /^https:\/\//i.test(url))).slice(0, 5);
    if (validImages.length === 0) {
      errors.push({
        stockCode: prod.stockCode,
        title: prod.title,
        marketplace: 'Hepsiburada',
        message: 'Ürüne ait geçerli HTTPS görsel bulunamadı.'
      });
      continue;
    }

    const isAllVariantsZeroPrice =
      (!prod.salePrice || prod.salePrice <= 0) &&
      prod.variants.every((v) => !v.salePrice || v.salePrice <= 0);
    if (isAllVariantsZeroPrice) {
      errors.push({
        stockCode: prod.stockCode,
        title: prod.title,
        marketplace: 'Hepsiburada',
        message:
          '⚠️ XML satış fiyatı 0,00 TL! Ürün Hepsiburada\'ya gönderilmedi. Lütfen Ürünler sayfasından satış fiyatı giriniz.'
      });
      continue;
    }

    // AI İhlal & Yasaklı Kelime Koruması
    const aiCheck = sanitizeProductContent({
      title: prod.title,
      descriptionHtml: prod.descriptionHtml,
      categoryName: prod.categoryName,
      categoryTree: prod.categoryTree
    });

    if (aiCheck.isProhibitedProduct) {
      errors.push({
        stockCode: prod.stockCode,
        title: prod.title,
        marketplace: 'Hepsiburada',
        message: `🛡️ AI İhlal Koruması: ${aiCheck.prohibitedReason}`
      });
      continue;
    }

    const sanitizedTitle = (aiCheck.cleanTitle || prod.title).slice(0, 150);
    const baseDesc =
      useMarketDesc && prod.marketplaceDescriptions?.hepsiburada
        ? prod.marketplaceDescriptions.hepsiburada
        : aiCheck.cleanDescriptionHtml || prod.descriptionHtml || sanitizedTitle;
    const finalDescHtml = sanitizeRichHtml(
      `${account.descriptionPrefixHtml || ''}${baseDesc}${account.descriptionSuffixHtml || ''}`
    );

    const rawVat = Number(prod.vatRate ?? 10);
    const validVatRate =
      rawVat === 8 ? 10 : rawVat === 18 ? 20 : [0, 1, 10, 20].includes(rawVat) ? rawVat : 10;
    const resolvedBrandName = (brand?.hepsiburadaBrandName || prod.brandName || account.storeName || 'Genel').trim();
    const minFloor = useMinPrice && prod.minPrice && prod.minPrice > 0 ? prod.minPrice : 0;

    const catAttrs = catSchemaMap.get(numericCatId) || [];
    const baseAttrIds = new Set(catAttrs.filter((a) => a.isBase).map((a) => a.id));
    const isErkekCat = /\berkek\b/i.test(`${cat.hepsiburadaCategoryName || ''} ${prod.categoryName}`);

    // Kullanıcının kategori eşleştirmesinde tanımladığı değerleri id/name bazlı haritala
    const userMappedAttrValues = new Map<string, string>();
    for (const ua of cat.hepsiburadaAttributes || []) {
      if (ua.attributeName && ua.mappedValue) {
        userMappedAttrValues.set(ua.attributeName.trim().toLocaleLowerCase('tr-TR'), ua.mappedValue.trim());
      }
    }

    let hasValidVariant = false;
    for (let vIdx = 0; vIdx < prod.variants.length; vIdx++) {
      const v = prod.variants[vIdx];
      if (!v.barcode) continue;
      if (!v.salePrice || v.salePrice <= 0) {
        errors.push({
          stockCode: v.sku || prod.stockCode,
          title: `${prod.title}${v.size ? ` (Beden: ${v.size})` : ''}`,
          marketplace: 'Hepsiburada',
          message:
            '⚠️ Varyantın XML satış fiyatı 0,00 TL olduğu için Hepsiburada\'ya gönderilmedi!'
        });
        continue;
      }

      const merchantSku = resolveMerchantSku(account, prod, v.sku, v.barcode, vIdx);
      const resolvedColor = normalizeColorValue(v.color, prod.title);
      const resolvedSize = normalizeSizeValue(v.size);
      const rawPrice = Number(v.hepsiburadaSalePrice || prod.hepsiburadaSalePrice || v.salePrice || 100);
      const resolvedPrice = Number(Math.max(10, minFloor, rawPrice).toFixed(2));

      const attributes: Record<string, string> = {
        merchantSku,
        VaryantGroupID: normalizeHepsiburadaMerchantSku(prod.stockCode),
        Barcode: String(v.barcode).trim(),
        UrunAdi: sanitizedTitle,
        UrunAciklamasi: finalDescHtml,
        Marka: resolvedBrandName,
        GarantiSuresi: String(Math.max(0, Number(prod.warrantyMonths || 0))),
        kg: String(Math.max(1, Number(prod.desi || 1))),
        tax_vat_rate: String(validVatRate),
        price: resolvedPrice.toFixed(2).replace('.', ','),
        stock: String(prod.status === 'active' ? Math.max(0, Math.floor(Number(v.netStock ?? 0))) : 0)
      };

      // Eğer kategori baseAttributes içinde tax_vat_rate yerine başka bir KDV alanı yoksa koru
      if (baseAttrIds.size > 0 && !baseAttrIds.has('tax_vat_rate') && baseAttrIds.has('tax_rate')) {
        delete attributes.tax_vat_rate;
        attributes.tax_rate = String(validVatRate);
      }

      validImages.forEach((imgUrl, idx) => {
        attributes[`Image${idx + 1}`] = imgUrl;
      });

      // Kategori şemasındaki gerçek varyant ve zorunlu özellikleri dinamik doldur
      if (catAttrs.length > 0) {
        for (const attr of catAttrs) {
          if (attr.isBase) continue;
          const idLower = attr.id.toLocaleLowerCase('tr-TR');
          const nameLower = attr.name.toLocaleLowerCase('tr-TR');
          const allowed = attrValuesMap.get(`${numericCatId}:${attr.id}`) || [];

          // 1) Varyant veya standart Renk özelliği
          if (idLower.includes('renk') || nameLower.includes('renk')) {
            attributes[attr.id] = pickAllowedEnumValue(resolvedColor, allowed, [
              'Çok Renkli',
              'Siyah',
              'Diğer'
            ]);
            continue;
          }

          // 2) Varyant veya standart Beden / Ebat / Numara özelliği
          if (
            idLower.includes('beden') ||
            nameLower.includes('beden') ||
            idLower.includes('ebat') ||
            nameLower.includes('ebat') ||
            idLower.includes('numara')
          ) {
            attributes[attr.id] = pickAllowedEnumValue(resolvedSize, allowed, [
              'Standart',
              'Tek Ebat',
              'S/M',
              'M',
              'L'
            ]);
            continue;
          }

          // 3) Kullanıcının kategori eşleştirmesinde tanımladığı değer
          const userVal = userMappedAttrValues.get(idLower) || userMappedAttrValues.get(nameLower);
          if (userVal) {
            attributes[attr.id] = pickAllowedEnumValue(userVal, allowed);
            continue;
          }

          // 4) Zorunlu diğer kategori özellikleri (Cinsiyet, Yaş Grubu, Kumaş, Menşei, Parça Sayısı vb.)
          if (attr.mandatory) {
            let smartDefault = '';
            let fallbacks: string[] = ['Belirtilmemiş', 'Diğer', 'Standart', 'Yok'];

            if (idLower.includes('cinsiyet') || nameLower.includes('cinsiyet')) {
              smartDefault = isErkekCat ? 'Erkek' : 'Kadın';
              fallbacks = [isErkekCat ? 'Erkek' : 'Kadın', 'Kadın / Kız', 'Unisex'];
            } else if (idLower.includes('yas') || nameLower.includes('yaş')) {
              smartDefault = 'Yetişkin';
              fallbacks = ['Yetişkin', 'Genç'];
            } else if (idLower.includes('mensei') || nameLower.includes('menşei') || nameLower.includes('uretim')) {
              smartDefault = 'Türkiye';
              fallbacks = ['Türkiye', 'TR', 'Yerli'];
            } else if (idLower.includes('kumas') || nameLower.includes('kumaş') || nameLower.includes('materyal')) {
              smartDefault = 'Dokuma';
              fallbacks = ['Belirtilmemiş', 'Dokuma', 'Örme', 'Polyester', 'Pamuk', 'Dantel'];
            } else if (idLower.includes('desen') || nameLower.includes('desen')) {
              smartDefault = 'Düz';
              fallbacks = ['Düz', 'Dantelli', 'Desenli'];
            } else if (idLower.includes('parca') || nameLower.includes('parça') || idLower.includes('paket')) {
              smartDefault = '1';
              fallbacks = ['Tekli', '1', '1 Parça', '2 Parça'];
            } else if (attr.type.toLowerCase().includes('int') || attr.type.toLowerCase().includes('num')) {
              smartDefault = '1';
            } else {
              smartDefault = 'Belirtilmemiş';
            }

            attributes[attr.id] = pickAllowedEnumValue(smartDefault, allowed, fallbacks);
          }
        }
      } else {
        // Şema okunamadıysa giyim için standart HB varyant alan adlarıyla devam et
        attributes.renk_variant_property = resolvedColor;
        if (resolvedSize) {
          attributes.beden_variant_property = resolvedSize;
        }
      }

      importItems.push({
        categoryId: numericCatId,
        merchant: merchantId,
        attributes
      });

      skuToProduct.set(merchantSku, {
        id: prod.id,
        stockCode: prod.stockCode,
        title: prod.title
      });
      hasValidVariant = true;
    }

    if (hasValidVariant) {
      candidateProductIds.push(prod.id);
    }
  }

  let remoteBatchId = `HEPSIBURADA-PUB-${Date.now()}`;
  const failedProductIds = new Set<string>();
  const trackingIds: string[] = [];

  if (importItems.length === 0) {
    return {
      remoteBatchId,
      attemptedCount: products.length,
      successCount: 0,
      errorCount: errors.length,
      errors,
      syncedProductIds: []
    };
  }

  // Resmi MPOP /product/api/products/import multipart/form-data (.json dosyası) gönderimi
  // 250'li güvenli paket boyutu + 45sn timeout + geçici HTTP 0/429/5xx için otomatik retry + 2'li paralel aktarım
  const IMPORT_CHUNK_SIZE = 250;
  const UPLOAD_CONCURRENCY = 2;
  const importChunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < importItems.length; i += IMPORT_CHUNK_SIZE) {
    importChunks.push(importItems.slice(i, i + IMPORT_CHUNK_SIZE));
  }

  for (let c = 0; c < importChunks.length; c += UPLOAD_CONCURRENCY) {
    const batchChunks = importChunks.slice(c, c + UPLOAD_CONCURRENCY);
    await Promise.all(
      batchChunks.map(async (chunk, offset) => {
        const chunkIdx = c + offset + 1;
        let lastRes: Awaited<ReturnType<typeof hepsiburadaFetch<any>>> | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, attempt === 1 ? 1200 : 2500));
          }
          const formData = new FormData();
          const jsonBlob = new Blob([JSON.stringify(chunk)], { type: 'application/json' });
          formData.append('file', jsonBlob, `products-part-${chunkIdx}.json`);

          const res = await hepsiburadaFetch<any>(
            account,
            'mpop',
            `/product/api/products/import?version=1`,
            {
              method: 'POST',
              body: formData,
              multipart: true,
              timeoutMs: 45000
            }
          );
          lastRes = res;

          if (res.ok) {
            const tid = String(res.data?.data?.trackingId || res.data?.trackingId || '');
            if (tid) trackingIds.push(tid);
            return;
          }

          // Yalnızca geçici ağ/timeout/rate-limit/sunucu hatalarında tekrar dene
          const isTransient = res.status === 0 || res.status === 429 || res.status >= 500;
          if (!isTransient) break;
        }

        const failedChunkMsg = lastRes?.errorMessage || 'Hepsiburada API paket gönderimi başarısız oldu.';
        for (const item of chunk) {
          const sku = String((item.attributes as Record<string, string>)?.merchantSku || '');
          const meta = skuToProduct.get(sku);
          if (meta) failedProductIds.add(meta.id);
        }
        errors.push({
          stockCode: `HB-CHUNK-${chunkIdx}`,
          title: `Hepsiburada Katalog API Hatası — Paket #${chunkIdx}/${importChunks.length} (HTTP ${lastRes?.status ?? 0})`,
          marketplace: 'Hepsiburada',
          message: failedChunkMsg
        });
      })
    );
  }

  if (trackingIds.length > 0) {
    remoteBatchId =
      trackingIds.length === 1
        ? trackingIds[0]
        : `${trackingIds[0]} (+${trackingIds.length - 1} paket)`;
    await new Promise((r) => setTimeout(r, 1800));
    const seenStocks = new Set<string>();
    const STATUS_CONCURRENCY = 4;

    for (let t = 0; t < trackingIds.length; t += STATUS_CONCURRENCY) {
      const tidSlice = trackingIds.slice(t, t + STATUS_CONCURRENCY);
      const statusChecks = await Promise.all(
        tidSlice.map((tid) => checkHepsiburadaImportStatus(account, tid))
      );
      for (const statusCheck of statusChecks) {
        if (statusCheck.ok && statusCheck.items.length > 0) {
          for (const stItem of statusCheck.items) {
            if (stItem.errors.length > 0 || stItem.importStatus === 'FAILED') {
              const meta = skuToProduct.get(stItem.merchantSku.toUpperCase());
              if (meta) {
                failedProductIds.add(meta.id);
                if (!seenStocks.has(meta.stockCode)) {
                  seenStocks.add(meta.stockCode);
                  errors.push({
                    stockCode: meta.stockCode,
                    title: meta.title,
                    marketplace: 'Hepsiburada',
                    message: stItem.errors.join(' | ') || `Import statüsü: ${stItem.importStatus}`
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  const finalSyncedIds =
    trackingIds.length === 0
      ? []
      : candidateProductIds.filter((id) => !failedProductIds.has(id));

  return {
    remoteBatchId,
    attemptedCount: products.length,
    successCount: finalSyncedIds.length,
    errorCount: errors.length,
    errors,
    syncedProductIds: finalSyncedIds
  };
}

/**
 * 4. Hepsiburada Tracking ID Durum Sorgulama (MPOP /product/api/products/status/{trackingId})
 */
export async function checkHepsiburadaImportStatus(
  account: MarketplaceAccount,
  trackingId: string
): Promise<{
  ok: boolean;
  trackingId: string;
  totalElements: number;
  items: {
    merchantSku: string;
    hbSku: string;
    importStatus: string;
    productStatus: string;
    errors: string[];
  }[];
  message: string;
}> {
  const res = await hepsiburadaFetch<any>(
    account,
    'mpop',
    `/product/api/products/status/${encodeURIComponent(trackingId)}?page=0&size=250`,
    { timeoutMs: 12000 }
  );

  if (!res.ok) {
    return {
      ok: false,
      trackingId,
      totalElements: 0,
      items: [],
      message: res.errorMessage
    };
  }

  const rawList: any[] = Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data?.items)
    ? res.data.items
    : [];

  const items = rawList.map((entry: any) => {
    const validationErrors: string[] = [];
    if (Array.isArray(entry.validationResults)) {
      for (const vr of entry.validationResults) {
        const attrLabel = String(vr?.attributeName || vr?.fieldName || '').trim();
        const msgText = String(vr?.message || '').trim();
        const formatted = attrLabel && msgText ? `${attrLabel}: ${msgText}` : msgText || attrLabel;
        if (formatted) validationErrors.push(formatted);
      }
    }
    if (Array.isArray(entry.importMessages)) {
      for (const im of entry.importMessages) {
        const msg = String(im?.message || '').trim();
        const sev = String(im?.severity || '').trim();
        // Bilgilendirici/ignored uyarılarını gerçek hata olarak sayma (ERROR veya FAILED hariç)
        if (msg && (!sev || sev.toUpperCase() === 'ERROR' || sev.toUpperCase() === 'FATAL')) {
          validationErrors.push(msg);
        }
      }
    }
    return {
      merchantSku: String(entry.merchantSku || ''),
      hbSku: String(entry.hbSku || ''),
      importStatus: String(entry.importStatus || 'UNKNOWN'),
      productStatus: String(entry.productStatus || ''),
      errors: validationErrors
    };
  });

  const failedCount = items.filter((i) => i.errors.length > 0 || i.importStatus === 'FAILED').length;
  return {
    ok: true,
    trackingId,
    totalElements: Number(res.data?.totalElements || items.length),
    items,
    message: `Tracking #${trackingId}: ${items.length} kayıt sorgulandı (${failedCount} hatalı).`
  };
}

/**
 * 5. Canlı Hepsiburada Ürünlerini & Sayaçlarını Çekme (Listing + MPOP Statü)
 */
export async function fetchLiveHepsiburadaProducts(params: {
  account: MarketplaceAccount;
  page?: number;
  size?: number;
  filter?: HepsiburadaLiveFilter;
}): Promise<{
  ok: boolean;
  totalElements: number;
  onSaleTotal: number;
  passiveTotal: number;
  lockedTotal: number;
  waitingTotal: number;
  rejectedTotal: number;
  totalPages: number;
  page: number;
  items: LiveHepsiburadaProductItem[];
  message?: string;
}> {
  const { account, page = 0, size = 50, filter = 'all' } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const offset = page * size;

  const [listingsRes, waitingRes, preMatchedRes, rejectedRes, missingRes] = await Promise.all([
    hepsiburadaFetch<any>(
      account,
      'listing',
      `/listings/merchantid/${encodeURIComponent(merchantId)}?offset=0&limit=500`,
      { timeoutMs: 12000 }
    ),
    hepsiburadaFetch<any>(
      account,
      'mpop',
      `/product/api/products/products-by-merchant-and-status?merchantId=${encodeURIComponent(merchantId)}&productStatus=WAITING&page=0&size=200`,
      { timeoutMs: 10000 }
    ),
    hepsiburadaFetch<any>(
      account,
      'mpop',
      `/product/api/products/products-by-merchant-and-status?merchantId=${encodeURIComponent(merchantId)}&productStatus=PRE_MATCHED&page=0&size=200`,
      { timeoutMs: 10000 }
    ),
    hepsiburadaFetch<any>(
      account,
      'mpop',
      `/product/api/products/products-by-merchant-and-status?merchantId=${encodeURIComponent(merchantId)}&productStatus=REJECTED&page=0&size=200`,
      { timeoutMs: 10000 }
    ),
    hepsiburadaFetch<any>(
      account,
      'mpop',
      `/product/api/products/products-by-merchant-and-status?merchantId=${encodeURIComponent(merchantId)}&productStatus=MISSING_INFO&page=0&size=200`,
      { timeoutMs: 10000 }
    )
  ]);

  if (!listingsRes.ok && !waitingRes.ok) {
    return {
      ok: false,
      totalElements: 0,
      onSaleTotal: 0,
      passiveTotal: 0,
      lockedTotal: 0,
      waitingTotal: 0,
      rejectedTotal: 0,
      totalPages: 1,
      page,
      items: [],
      message: listingsRes.errorMessage || waitingRes.errorMessage
    };
  }

  const rawListings: any[] = Array.isArray(listingsRes.data?.listings)
    ? listingsRes.data.listings
    : Array.isArray(listingsRes.data)
    ? listingsRes.data
    : [];

  const listingItems: LiveHepsiburadaProductItem[] = rawListings.map((l: any) => {
    const isLocked = Boolean(l.isLocked);
    const isSuspended = Boolean(l.isSuspended);
    const availableStock = Number(l.availableStock ?? 0);
    const isSalable = Boolean(l.isSalable) && availableStock > 0 && !isLocked && !isSuspended;
    return {
      hepsiburadaSku: String(l.hepsiburadaSku || l.hbSku || ''),
      merchantSku: String(l.merchantSku || ''),
      barcode: String(l.barcode || l.gtin || ''),
      title: String(l.productName || l.title || l.merchantSku || 'Hepsiburada Ürünü'),
      brand: String(l.brand || ''),
      categoryName: String(l.categoryName || ''),
      quantity: availableStock,
      salePrice: Number(l.price ?? 0),
      listPrice: Number(l.listPrice ?? l.price ?? 0),
      isSalable,
      isLocked,
      isSuspended,
      lockReasons: Array.isArray(l.lockReasons) ? l.lockReasons.map(String) : [],
      deactivationReasons: Array.isArray(l.deactivationReasons)
        ? l.deactivationReasons.map(String)
        : [],
      catalogStatus: 'LISTING',
      dispatchTime: Number(l.dispatchTime ?? 1),
      imageUrl: String(l.imageUrl || '')
    };
  });

  const mapMpopItems = (
    res: typeof waitingRes,
    status: LiveHepsiburadaProductItem['catalogStatus']
  ): LiveHepsiburadaProductItem[] => {
    if (!res.ok) return [];
    const list: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
    return list.map((p: any) => ({
      hepsiburadaSku: String(p.hbSku || ''),
      merchantSku: String(p.merchantSku || ''),
      barcode: String(p.barcode || ''),
      title: String(p.productName || p.name || p.merchantSku || 'Katalog Ürünü'),
      brand: String(p.brand || ''),
      categoryName: String(p.categoryName || p.categoryId || ''),
      quantity: Number(p.stock ?? 0),
      salePrice: Number(p.price ?? 0),
      listPrice: Number(p.price ?? 0),
      isSalable: false,
      isLocked: false,
      isSuspended: false,
      lockReasons: [],
      deactivationReasons: [],
      catalogStatus: status,
      rejectionReason: p.taskStatusMessage || p.statusMessage || undefined,
      dispatchTime: 1,
      imageUrl: String(p.image1 || p.imageUrl || '')
    }));
  };

  const waitingItems = [
    ...mapMpopItems(waitingRes, 'WAITING'),
    ...mapMpopItems(preMatchedRes, 'PRE_MATCHED')
  ];
  const rejectedItems = [
    ...mapMpopItems(rejectedRes, 'REJECTED'),
    ...mapMpopItems(missingRes, 'MISSING_INFO')
  ];

  const onSaleItems = listingItems.filter((i) => i.isSalable);
  const lockedItems = listingItems.filter((i) => i.isLocked || i.isSuspended);
  const passiveItems = listingItems.filter((i) => !i.isSalable && !i.isLocked && !i.isSuspended);

  const onSaleTotal = onSaleItems.length;
  const lockedTotal = lockedItems.length;
  const passiveTotal = passiveItems.length;
  const waitingTotal =
    Number(waitingRes.data?.totalElements || 0) + Number(preMatchedRes.data?.totalElements || 0) ||
    waitingItems.length;
  const rejectedTotal =
    Number(rejectedRes.data?.totalElements || 0) + Number(missingRes.data?.totalElements || 0) ||
    rejectedItems.length;
  const listingTotal = Math.max(
    Number(listingsRes.data?.totalCount || 0),
    listingItems.length
  );

  let selectedPool: LiveHepsiburadaProductItem[] = listingItems;
  if (filter === 'on_sale') selectedPool = onSaleItems;
  else if (filter === 'passive') selectedPool = passiveItems;
  else if (filter === 'locked') selectedPool = lockedItems;
  else if (filter === 'waiting') selectedPool = waitingItems;
  else if (filter === 'rejected') selectedPool = rejectedItems;
  else selectedPool = [...listingItems, ...waitingItems, ...rejectedItems];

  const totalPages = Math.max(1, Math.ceil(selectedPool.length / size));
  const pagedItems = selectedPool.slice(offset, offset + size);

  return {
    ok: true,
    totalElements: listingTotal + waitingTotal + rejectedTotal,
    onSaleTotal,
    passiveTotal,
    lockedTotal,
    waitingTotal,
    rejectedTotal,
    totalPages,
    page,
    items: pagedItems
  };
}

/**
 * 6. Hepsiburada Listing Satışa Açma / Kapatma (Activate / Deactivate)
 */
export async function toggleHepsiburadaListingsState(params: {
  account: MarketplaceAccount;
  items: { hepsiburadaSku?: string; merchantSku: string }[];
  targetState: 'activate' | 'deactivate';
}): Promise<{
  ok: boolean;
  processedCount: number;
  failedCount: number;
  message: string;
}> {
  const { account, items, targetState } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  if (items.length === 0) {
    return { ok: false, processedCount: 0, failedCount: 0, message: 'İşlem için ürün seçilmedi.' };
  }

  let processedCount = 0;
  let failedCount = 0;
  const fallbackDeactivatePayload: Record<string, unknown>[] = [];

  for (const item of items.slice(0, 100)) {
    const hbSku = (item.hepsiburadaSku || '').trim();
    if (!hbSku) {
      if (targetState === 'deactivate' && item.merchantSku) {
        fallbackDeactivatePayload.push({
          MerchantSku: item.merchantSku,
          AvailableStock: 0
        });
      } else {
        failedCount++;
      }
      continue;
    }

    const res = await hepsiburadaFetch<any>(
      account,
      'listing',
      `/listings/merchantid/${encodeURIComponent(merchantId)}/sku/${encodeURIComponent(hbSku)}/${targetState}`,
      { method: 'POST', timeoutMs: 10000 }
    );
    if (res.ok) processedCount++;
    else failedCount++;
  }

  if (fallbackDeactivatePayload.length > 0) {
    const invRes = await hepsiburadaFetch<any>(
      account,
      'listing',
      `/listings/merchantid/${encodeURIComponent(merchantId)}/inventory-uploads`,
      {
        method: 'POST',
        body: JSON.stringify(fallbackDeactivatePayload),
        timeoutMs: 12000
      }
    );
    if (invRes.ok) processedCount += fallbackDeactivatePayload.length;
    else failedCount += fallbackDeactivatePayload.length;
  }

  const label = targetState === 'activate' ? 'satışa açıldı' : 'satışa kapatıldı';
  return {
    ok: processedCount > 0,
    processedCount,
    failedCount,
    message: `${processedCount} adet Hepsiburada ürünü ${label}${failedCount > 0 ? ` (${failedCount} başarısız)` : ''}.`
  };
}

/**
 * 7. Onay Bekleyen Katalog Ürünlerini Silme (MPOP /product/api/products/delete-process)
 */
export async function deletePendingHepsiburadaProducts(params: {
  account: MarketplaceAccount;
  merchantSkus: string[];
}): Promise<{ ok: boolean; deletedCount: number; message: string }> {
  const { account, merchantSkus } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const uniqueSkus = Array.from(new Set(merchantSkus.map((s) => s.trim()).filter(Boolean)));
  if (uniqueSkus.length === 0) {
    return {
      ok: false,
      deletedCount: 0,
      message: 'Silinecek onay bekleyen ürün SKU\'su seçilmedi.'
    };
  }

  const payload = uniqueSkus.map((merchantSku) => ({
    merchant: merchantId,
    merchantSku
  }));

  const res = await hepsiburadaFetch<any>(
    account,
    'mpop',
    `/product/api/products/delete-process`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 15000
    }
  );

  if (!res.ok) {
    return { ok: false, deletedCount: 0, message: res.errorMessage };
  }

  return {
    ok: true,
    deletedCount: uniqueSkus.length,
    message: `${uniqueSkus.length} adet onay bekleyen Hepsiburada katalog ürünü silme kuyruğuna alındı.`
  };
}

/**
 * 8. Ön Eşleşmeli (PRE_MATCHED) Ürünleri Onaylama
 */
export async function approveHepsiburadaPreMatch(params: {
  account: MarketplaceAccount;
  merchantSkus: string[];
}): Promise<{ ok: boolean; approvedCount: number; message: string }> {
  const { account, merchantSkus } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const uniqueSkus = Array.from(new Set(merchantSkus.map((s) => s.trim()).filter(Boolean)));
  if (uniqueSkus.length === 0) {
    return { ok: false, approvedCount: 0, message: 'Onaylanacak ön eşleşmeli ürün bulunamadı.' };
  }

  const payload = uniqueSkus.map((merchantSku) => ({
    merchant: merchantId,
    merchantSku
  }));

  const res = await hepsiburadaFetch<any>(
    account,
    'mpop',
    `/product/api/products/approve-prematch`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 15000
    }
  );

  if (!res.ok) {
    return { ok: false, approvedCount: 0, message: res.errorMessage };
  }

  return {
    ok: true,
    approvedCount: uniqueSkus.length,
    message: `${uniqueSkus.length} adet ön eşleşmeli Hepsiburada ürünü onaylandı.`
  };
}

/**
 * 9. Canlı Hepsiburada Buybox Sıralaması ve Kazanan Fiyat Sorgulama
 */
export async function fetchHepsiburadaBuyboxOrders(params: {
  account: MarketplaceAccount;
  hbSkus: string[];
}): Promise<{
  ok: boolean;
  orders: { sku: string; rank: number; winningPrice: number; merchantName?: string }[];
  message?: string;
}> {
  const { account, hbSkus } = params;
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const unique = Array.from(new Set(hbSkus.map((s) => s.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return { ok: true, orders: [] };
  }

  const results: { sku: string; rank: number; winningPrice: number; merchantName?: string }[] = [];

  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const query = encodeURIComponent(chunk.join(','));
    const res = await hepsiburadaFetch<any>(
      account,
      'listing',
      `/buybox-orders/merchantid/${encodeURIComponent(merchantId)}?skuList=${query}`,
      { timeoutMs: 10000 }
    );
    if (!res.ok) continue;
    const rawList: any[] = Array.isArray(res.data?.buyboxOrderList)
      ? res.data.buyboxOrderList
      : Array.isArray(res.data)
      ? res.data
      : [];
    for (const row of rawList) {
      results.push({
        sku: String(row.sku || row.hepsiburadaSku || ''),
        rank: Number(row.rank ?? 2),
        winningPrice: Number(row.winningPrice ?? row.price ?? 0),
        merchantName: row.winningMerchantName ? String(row.winningMerchantName) : undefined
      });
    }
  }

  return { ok: true, orders: results };
}

/**
 * 10. Canlı Hepsiburada Sipariş ve Paket Çekme (OMS API)
 */
export async function pullHepsiburadaOrders(
  account: MarketplaceAccount,
  options?: { includePaymentAwaiting?: boolean }
): Promise<Partial<Order>[]> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  if (!merchantId || !account.apiSecret) return [];

  const collected = new Map<string, Partial<Order>>();

  const mapOrderStatus = (rawStatus?: string): Order['status'] => {
    const s = String(rawStatus || '').toLowerCase();
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit') || s.includes('shipped') || s.includes('cargo')) return 'shipped';
    if (s.includes('cancel')) return 'cancelled';
    if (s.includes('payment') || s.includes('open') || s.includes('unpacked')) return 'pending';
    return 'ready_to_ship';
  };

  // A) Paketlenmiş / gönderime hazır & kargodaki paketler
  const pkgRes = await hepsiburadaFetch<any>(
    account,
    'oms',
    `/packages/merchantid/${encodeURIComponent(merchantId)}?offset=0&limit=50&timespan=168`,
    { timeoutMs: 12000 }
  );

  if (pkgRes.ok) {
    const packages: any[] = Array.isArray(pkgRes.data)
      ? pkgRes.data
      : Array.isArray(pkgRes.data?.items)
      ? pkgRes.data.items
      : [];
    for (const pkg of packages) {
      const orderNum = String(pkg.orderNumber || pkg.packageNumber || pkg.id || '');
      if (!orderNum) continue;
      const itemsList: any[] = Array.isArray(pkg.items) ? pkg.items : [];
      const totalAmount =
        Number(pkg.totalPrice?.amount ?? pkg.totalPrice ?? 0) ||
        itemsList.reduce((acc, it) => acc + Number(it.totalPrice?.amount ?? it.price?.amount ?? 0), 0);

      collected.set(orderNum, {
        orderNumber: orderNum,
        packageNumber: String(pkg.packageNumber || ''),
        marketplace: 'hepsiburada',
        customerName: String(pkg.customerName || pkg.recipientName || 'Hepsiburada Müşterisi'),
        customerEmail: String(pkg.email || ''),
        customerPhone: String(pkg.phoneNumber || pkg.shippingAddress?.phoneNumber || ''),
        shippingAddress: String(
          pkg.shippingAddressDetail || pkg.shippingAddress?.address || ''
        ),
        shippingCity: String(pkg.shippingCity || pkg.shippingAddress?.city || ''),
        shippingDistrict: String(pkg.shippingDistrict || pkg.shippingAddress?.district || ''),
        cargoCompany: String(pkg.cargoCompany || pkg.cargoCompanyModel?.name || 'Hepsiburada Kargo'),
        cargoTrackingNumber: String(pkg.barcode || pkg.cargoTrackingNumber || pkg.packageNumber || ''),
        cargoBarcode: String(pkg.barcode || pkg.packageNumber || orderNum),
        totalAmount: Number(totalAmount.toFixed(2)),
        status: mapOrderStatus(pkg.status),
        orderDate: pkg.orderDate ? new Date(pkg.orderDate).toISOString() : new Date().toISOString(),
        items: itemsList.map((it: any) => ({
          sku: String(it.merchantSKU || it.merchantSku || it.sku || ''),
          barcode: String(it.barcode || it.gtin || ''),
          title: String(it.productName || it.name || ''),
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice?.amount ?? it.price?.amount ?? it.unitPrice ?? 0),
          vatRate: Number(it.vatRate ?? 10),
          color: String(it.color || ''),
          size: String(it.size || '')
        }))
      });
    }
  }

  // B) Paketlenebilir (açık) sipariş kalemleri (hbOrderPullStatus === 'packageable')
  if (account.hbOrderPullStatus === 'packageable') {
    const openRes = await hepsiburadaFetch<any>(
      account,
      'oms',
      `/orders/merchantid/${encodeURIComponent(merchantId)}?offset=0&limit=50`,
      { timeoutMs: 12000 }
    );
    if (openRes.ok) {
      const openItems: any[] = Array.isArray(openRes.data?.items)
        ? openRes.data.items
        : Array.isArray(openRes.data)
        ? openRes.data
        : [];
      for (const line of openItems) {
        const orderNum = String(line.orderNumber || '');
        if (!orderNum || collected.has(orderNum)) continue;
        const unitPrice = Number(line.unitPrice?.amount ?? line.totalPrice?.amount ?? 0);
        collected.set(orderNum, {
          orderNumber: orderNum,
          marketplace: 'hepsiburada',
          customerName: String(line.customerName || line.shippingAddress?.name || 'Hepsiburada Müşterisi'),
          customerEmail: String(line.shippingAddress?.email || ''),
          customerPhone: String(line.shippingAddress?.phoneNumber || ''),
          shippingAddress: String(line.shippingAddress?.address || ''),
          shippingCity: String(line.shippingAddress?.city || ''),
          shippingDistrict: String(line.shippingAddress?.district || ''),
          cargoCompany: String(line.cargoCompanyModel?.name || line.cargoCompany || 'Hepsiburada Kargo'),
          cargoTrackingNumber: String(line.barcode || ''),
          cargoBarcode: String(line.barcode || orderNum),
          totalAmount: Number(line.totalPrice?.amount ?? unitPrice * Number(line.quantity || 1)),
          status: 'ready_to_ship',
          orderDate: line.orderDate ? new Date(line.orderDate).toISOString() : new Date().toISOString(),
          items: [
            {
              sku: String(line.merchantSKU || line.merchantSku || line.sku || ''),
              barcode: String(line.productBarcode || line.barcode || ''),
              title: String(line.name || line.productName || ''),
              quantity: Number(line.quantity || 1),
              unitPrice,
              vatRate: Number(line.vatRate ?? 10)
            }
          ]
        });
      }
    }
  }

  // C) Ödemesi Bekleyen Siparişler (Genel Ayarlar: customerHBWaitingOrderStatus)
  if (options?.includePaymentAwaiting) {
    const waitRes = await hepsiburadaFetch<any>(
      account,
      'oms',
      `/orders/merchantid/${encodeURIComponent(merchantId)}/paymentawaiting?offset=0&limit=30`,
      { timeoutMs: 10000 }
    );
    if (waitRes.ok) {
      const waitItems: any[] = Array.isArray(waitRes.data?.items)
        ? waitRes.data.items
        : Array.isArray(waitRes.data)
        ? waitRes.data
        : [];
      for (const line of waitItems) {
        const orderNum = String(line.orderNumber || '');
        if (!orderNum || collected.has(orderNum)) continue;
        collected.set(orderNum, {
          orderNumber: orderNum,
          marketplace: 'hepsiburada',
          customerName: String(line.customerName || 'Hepsiburada (Ödeme Bekliyor)'),
          customerEmail: '',
          customerPhone: '',
          shippingAddress: String(line.shippingAddress?.address || ''),
          shippingCity: String(line.shippingAddress?.city || ''),
          shippingDistrict: String(line.shippingAddress?.district || ''),
          cargoCompany: 'Hepsiburada Kargo',
          cargoTrackingNumber: '',
          cargoBarcode: orderNum,
          totalAmount: Number(line.totalPrice?.amount ?? 0),
          status: 'pending',
          orderDate: line.orderDate ? new Date(line.orderDate).toISOString() : new Date().toISOString(),
          items: [
            {
              sku: String(line.merchantSKU || line.merchantSku || ''),
              barcode: String(line.productBarcode || ''),
              title: String(line.name || 'Sipariş Kalemi'),
              quantity: Number(line.quantity || 1),
              unitPrice: Number(line.unitPrice?.amount ?? 0),
              vatRate: Number(line.vatRate ?? 10)
            }
          ]
        });
      }
    }
  }

  return Array.from(collected.values());
}

/**
 * 11. Hepsiburada Resmi Kargo Etiketi (OMS /packages/.../labels)
 */
export async function fetchHepsiburadaCargoLabel(
  account: MarketplaceAccount,
  packageNumber: string
): Promise<{ ok: boolean; labelData?: string; format?: string; message: string }> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const res = await hepsiburadaFetch<any>(
    account,
    'oms',
    `/packages/merchantid/${encodeURIComponent(merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/labels?format=PDF`,
    { timeoutMs: 12000 }
  );

  if (!res.ok) {
    return { ok: false, message: res.errorMessage };
  }

  const labelData = String(res.data?.data || res.data?.label || res.rawText || '');
  return {
    ok: Boolean(labelData),
    labelData,
    format: 'PDF',
    message: labelData
      ? `Hepsiburada paket #${packageNumber} resmi kargo etiketi alındı.`
      : 'Kargo etiketi henüz hazır değil.'
  };
}

/**
 * 12. Hepsiburada Fatura Linki Bildirme (OMS /packages/.../invoice)
 */
export async function sendHepsiburadaInvoiceLink(
  account: MarketplaceAccount,
  packageNumber: string,
  invoiceLink: string
): Promise<{ ok: boolean; message: string }> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const res = await hepsiburadaFetch<any>(
    account,
    'oms',
    `/packages/merchantid/${encodeURIComponent(merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/invoice`,
    {
      method: 'PUT',
      body: JSON.stringify({ invoiceLink }),
      timeoutMs: 10000
    }
  );
  return {
    ok: res.ok,
    message: res.ok
      ? `Hepsiburada paket #${packageNumber} fatura linki iletildi.`
      : res.errorMessage
  };
}

/**
 * 13. Canlı Hepsiburada İade / Değişim Taleplerini Çekme (OMS Claims)
 */
export async function pullHepsiburadaClaims(account: MarketplaceAccount): Promise<Partial<ClaimItem>[]> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  if (!merchantId || !account.apiSecret) return [];

  const statuses: { hbStatus: string; localStatus: ClaimItem['status'] }[] = [
    { hbStatus: 'awaitingaction', localStatus: 'pending' },
    { hbStatus: 'awaitingpreapproval', localStatus: 'pending' },
    { hbStatus: 'accepted', localStatus: 'approved' },
    { hbStatus: 'rejected', localStatus: 'rejected' }
  ];

  const responses = await Promise.all(
    statuses.map((st) =>
      hepsiburadaFetch<any>(
        account,
        'oms',
        `/claims/merchantId/${encodeURIComponent(merchantId)}/status/${st.hbStatus}?offset=0&limit=50`,
        { timeoutMs: 10000 }
      ).then((res) => ({ st, res }))
    )
  );

  const claims: Partial<ClaimItem>[] = [];
  const seen = new Set<string>();

  for (const { st, res } of responses) {
    if (!res.ok) continue;
    const rawList: any[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.items)
      ? res.data.items
      : [];

    for (const c of rawList) {
      const claimNumber = String(c.number || c.claimNumber || c.id || '');
      if (!claimNumber || seen.has(claimNumber)) continue;
      seen.add(claimNumber);

      claims.push({
        claimNumber,
        orderNumber: String(c.orderNumber || ''),
        marketplace: 'hepsiburada',
        customerName: String(c.customerName || 'Hepsiburada Müşterisi'),
        productTitle: String(c.productName || c.sku || 'İade Ürünü'),
        sku: String(c.merchantSku || c.sku || ''),
        quantity: Number(c.quantity || 1),
        reason: String(c.explanation || c.claimType || c.reason || 'Müşteri Talebi'),
        status: st.localStatus,
        restockOnApprove: true,
        amount: Number(c.price?.amount ?? c.amount ?? 0),
        claimDate: c.claimDate ? new Date(c.claimDate).toISOString() : new Date().toISOString()
      });
    }
  }

  return claims;
}

/**
 * 14. Hepsiburada İade / Değişim Talebini Onaylama veya Reddetme (OMS Claims)
 */
export async function resolveHepsiburadaClaim(params: {
  account: MarketplaceAccount;
  claimNumber: string;
  decision: 'accept' | 'reject';
  rejectionReason?: string;
  merchantStatement?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { account, claimNumber, decision, rejectionReason, merchantStatement } = params;
  const path = `/claims/number/${encodeURIComponent(claimNumber)}/${decision}`;

  const body =
    decision === 'reject'
      ? JSON.stringify({
          ClaimRejectionReason: rejectionReason || 'Other',
          MerchantStatement:
            merchantStatement || 'Ürün incelemesi sonucunda iade koşullarına uygun bulunmadı.'
        })
      : JSON.stringify({});

  const res = await hepsiburadaFetch<any>(account, 'oms', path, {
    method: 'POST',
    body,
    timeoutMs: 12000
  });

  if (!res.ok) {
    return { ok: false, message: res.errorMessage };
  }

  return {
    ok: true,
    message:
      decision === 'accept'
        ? `Hepsiburada talep #${claimNumber} başarıyla ONAYLANDI.`
        : `Hepsiburada talep #${claimNumber} başarıyla REDDEDİLDİ.`
  };
}

/**
 * 15. Salt-Okunur Durum Eşitleme (Reconcile):
 * Eski sahte 'synced' işaretlerini temizleyip canlı Hepsiburada listing ve MPOP statülerine hizalar.
 */
export async function reconcileHepsiburadaProductStatuses(params: {
  account: MarketplaceAccount;
  products: Product[];
}): Promise<{
  ok: boolean;
  liveListingCount: number;
  syncedCount: number;
  pendingCount: number;
  notSentCount: number;
  updatedProductIds: string[];
  message: string;
}> {
  const { account, products } = params;
  const live = await fetchLiveHepsiburadaProducts({ account, page: 0, size: 1000, filter: 'all' });
  if (!live.ok) {
    return {
      ok: false,
      liveListingCount: 0,
      syncedCount: 0,
      pendingCount: 0,
      notSentCount: 0,
      updatedProductIds: [],
      message: live.message || 'Hepsiburada canlı verileri okunamadı.'
    };
  }

  const liveSkuMap = new Map<string, LiveHepsiburadaProductItem>();
  const liveBarcodeMap = new Map<string, LiveHepsiburadaProductItem>();
  for (const item of live.items) {
    if (item.merchantSku) liveSkuMap.set(item.merchantSku.toUpperCase(), item);
    if (item.barcode) liveBarcodeMap.set(item.barcode.trim(), item);
  }

  let syncedCount = 0;
  let pendingCount = 0;
  let notSentCount = 0;
  const updatedProductIds: string[] = [];

  for (const prod of products) {
    let matchedItem: LiveHepsiburadaProductItem | undefined;
    for (let vIdx = 0; vIdx < prod.variants.length; vIdx++) {
      const v = prod.variants[vIdx];
      const normSku = resolveMerchantSku(account, prod, v.sku, v.barcode, vIdx);
      const found =
        liveSkuMap.get(normSku) ||
        (v.sku ? liveSkuMap.get(v.sku.trim().toUpperCase()) : undefined) ||
        (v.barcode ? liveBarcodeMap.get(v.barcode.trim()) : undefined);
      if (found) {
        if (found.hepsiburadaSku) {
          v.hepsiburadaSku = found.hepsiburadaSku;
        }
        matchedItem = found;
      }
    }

    let nextStatus: Product['hepsiburadaSyncStatus'] = 'not_sent';
    let nextError: string | undefined = undefined;
    if (matchedItem) {
      if (matchedItem.catalogStatus === 'LISTING' || matchedItem.catalogStatus === 'MATCHED') {
        nextStatus = 'synced';
        syncedCount++;
      } else if (
        matchedItem.catalogStatus === 'WAITING' ||
        matchedItem.catalogStatus === 'PRE_MATCHED'
      ) {
        nextStatus = 'pending';
        pendingCount++;
      } else {
        nextStatus = 'error';
        nextError = matchedItem.rejectionReason || 'Hepsiburada katalog eksik bilgi / red';
      }
    } else {
      notSentCount++;
    }

    if (prod.hepsiburadaSyncStatus !== nextStatus || prod.hepsiburadaErrorMessage !== nextError) {
      prod.hepsiburadaSyncStatus = nextStatus;
      prod.hepsiburadaErrorMessage = nextError;
      updatedProductIds.push(prod.id);
    }
  }

  return {
    ok: true,
    liveListingCount: live.totalElements,
    syncedCount,
    pendingCount,
    notSentCount,
    updatedProductIds,
    message: `Hepsiburada canlı eşitleme tamamlandı: ${syncedCount} yayında, ${pendingCount} onay bekliyor, ${notSentCount} henüz gönderilmedi (${updatedProductIds.length} ürün statüsü güncellendi).`
  };
}
