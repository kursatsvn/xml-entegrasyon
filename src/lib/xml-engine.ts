import { XMLParser } from 'fast-xml-parser';
import { Product, ProductVariant, XmlSource, XmlSyncReport } from '@/types/sopyo';
import { calculateChannelPrices } from '@/lib/pricing-engine';
import { normalizeColorValue, normalizeSizeValue } from '@/lib/category-matcher';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false
});

function generateUniqueEan13(seedStr: string): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 1000000000;
  }
  const base12 = '869' + String(Math.abs(hash)).padStart(9, '0').slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(base12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base12 + String(checkDigit);
}

function asArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sopyo Step 3 (getXMLNodes.php) karşılığı: XML içindeki etiketleri ve adetlerini döner
 */
export async function inspectXmlFeedNodes(xmlUrl: string): Promise<{
  totalProducts: number;
  totalVariants: number;
  tags: { tag: string; count: number }[];
}> {
  const response = await fetch(xmlUrl, {
    headers: { 'User-Agent': 'Sopyo-XML-Bot/2.0' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`XML kaynağına erişilemedi: HTTP ${response.status}`);
  }
  const xmlText = await response.text();
  const parsed = parser.parse(xmlText);
  const rawProducts = asArray(parsed?.Root?.Urunler?.Urun || parsed?.Urunler?.Urun || parsed?.products?.product);

  const counts = new Map<string, number>();
  let totalVariants = 0;

  for (const prod of rawProducts) {
    if (!prod || typeof prod !== 'object') continue;
    for (const key of Object.keys(prod)) {
      if (key === 'UrunSecenek' || key === 'Resimler' || key === 'TeknikDetaylar') continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const variants = asArray(prod?.UrunSecenek?.Secenek);
    totalVariants += variants.length;
    for (const v of variants) {
      if (!v || typeof v !== 'object') continue;
      for (const vKey of Object.keys(v)) {
        if (vKey === 'EkSecenekOzellik') continue;
        counts.set(vKey, (counts.get(vKey) || 0) + 1);
      }
    }
  }

  return {
    totalProducts: rawProducts.length,
    totalVariants,
    tags: Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }))
  };
}

/**
 * Canlı XML kaynağını çekip ürün, varyant, fiyat ve kritik stok kurallarıyla işler
 */
export async function syncXmlFeedProducts(params: {
  xmlSource: XmlSource;
  existingProducts: Product[];
  limit?: number;
}): Promise<{
  products: Product[];
  report: XmlSyncReport;
  totalInXml: number;
  totalVariantsInXml: number;
}> {
  const { xmlSource, existingProducts, limit = 0 } = params;
  const startedAt = new Date().toISOString();

  const response = await fetch(xmlSource.url, {
    headers: { 'User-Agent': 'Sopyo-XML-Bot/2.0' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`XML indirilemedi (${response.status}): ${xmlSource.url}`);
  }

  const xmlText = await response.text();
  const parsed = parser.parse(xmlText);
  const rawProducts = asArray<Record<string, any>>(
    parsed?.Root?.Urunler?.Urun || parsed?.Urunler?.Urun || parsed?.products?.product
  );

  const existingByCode = new Map<string, Product>();
  for (const ep of existingProducts) {
    existingByCode.set(ep.stockCode, ep);
  }

  const stockUpdatedSkus: string[] = [];
  const priceUpdatedSkus: string[] = [];
  const newlyAddedSkus: string[] = [];
  const seenStockCodes = new Set<string>();

  let totalVariantsInXml = 0;
  for (const rp of rawProducts) {
    const secs = asArray(rp?.UrunSecenek?.Secenek);
    totalVariantsInXml += secs.length || 1;
  }

  const sliceToProcess = limit > 0 ? rawProducts.slice(0, limit) : rawProducts;
  const syncedProducts: Product[] = [];
  const usedProductIds = new Set<string>();

  for (let prodIdx = 0; prodIdx < sliceToProcess.length; prodIdx++) {
    const rawProd = sliceToProcess[prodIdx];
    const externalId = String(rawProd.UrunKartiID || rawProd.id || `${prodIdx + 1}`);
    const title = String(rawProd.UrunAdi || rawProd.name || 'İsimsiz Ürün');
    const descriptionHtml = String(rawProd.Aciklama || rawProd.OnYazi || '');
    const brandName = String(rawProd.Marka || "Aria's Closet");
    const categoryName = String(rawProd.Kategori || 'Genel');
    const categoryTree = String(rawProd.KategoriTree || categoryName);
    const productUrl = String(rawProd.UrunUrl || '');

    const rawImages = asArray<string>(rawProd?.Resimler?.Resim).map(String).filter(Boolean);
    const rawVariants = asArray<Record<string, any>>(rawProd?.UrunSecenek?.Secenek);

    const firstVariant = rawVariants[0] || rawProd;
    const rawBaseSku = String(firstVariant?.StokKodu || externalId || '0000');
    const prefix = xmlSource.stockCodePrefix || '';
    const baseStockCode = rawBaseSku.startsWith(prefix) ? rawBaseSku : `${prefix}${rawBaseSku}`;
    const stockCode = seenStockCodes.has(baseStockCode)
      ? `${baseStockCode}-${externalId}-${prodIdx}`
      : baseStockCode;
    seenStockCodes.add(stockCode);

    const existingProd = existingByCode.get(stockCode);
    let uniqueProdId = existingProd?.id || `prod-${externalId}-${stockCode}`;
    if (usedProductIds.has(uniqueProdId)) {
      uniqueProdId = `prod-${externalId}-${stockCode}-${prodIdx}`;
    }
    usedProductIds.add(uniqueProdId);
    const variants: ProductVariant[] = [];

    for (let idx = 0; idx < (rawVariants.length || 1); idx++) {
      const rv = rawVariants[idx] || rawProd;
      const extVarId = String(rv.VaryasyonID || `${externalId}-${idx + 1}`);
      const varSkuRaw = String(rv.StokKodu || rawBaseSku);
      const varSku =
        rawVariants.length > 1
          ? `${prefix}${varSkuRaw}-${extVarId}`
          : stockCode;

      const rawBarcode = String(rv.Barkod || '');
      const barcode =
        xmlSource.generateBarcode || !rawBarcode
          ? generateUniqueEan13(`${xmlSource.tenantId}-${stockCode}-${extVarId}`)
          : rawBarcode;

      const rawXmlStock = Math.max(0, Math.floor(parseNumber(rv.StokAdedi)));
      // Kritik stok kontrolü: <= criticalStockAmount ise 0 kabul et
      const effectiveXmlStock =
        xmlSource.criticalStockEnabled && rawXmlStock <= xmlSource.criticalStockAmount
          ? 0
          : rawXmlStock;

      const existingVariant = existingProd?.variants.find(
        (v) => v.externalVariantId === extVarId || v.sku === varSku
      );
      const reservedStock = existingVariant?.reservedStock || 0;
      const netStock = Math.max(0, effectiveXmlStock - reservedStock);

      const salePriceTagVal = parseNumber(rv[xmlSource.salePriceTag || 'SatisFiyati'] ?? rv.SatisFiyati);
      const buyingPriceVal = parseNumber(rv[xmlSource.buyingPriceTag || 'SatisFiyati'] ?? rv.AlisFiyati ?? salePriceTagVal);
      const marketPriceVal = parseNumber(rv[xmlSource.marketPriceTag || 'IndirimliFiyat'] ?? rv.IndirimliFiyat ?? salePriceTagVal);

      const channelPrices =
        salePriceTagVal > 0
          ? calculateChannelPrices(salePriceTagVal, xmlSource)
          : { trendyolPrice: 0, trendyolListPrice: 0, hepsiburadaPrice: 0 };

      // EkSecenekOzellik (Renk / Beden)
      const rawProps = asArray<Record<string, any>>(rv?.EkSecenekOzellik?.Ozellik);
      const attributes: { name: string; value: string }[] = [];
      let rawColor = '';
      let rawSize = '';

      for (const prop of rawProps) {
        const propName = String(prop?.['@_Tanim'] || prop?.Tanim || 'Özellik');
        const propVal = String(prop?.['@_Deger'] || prop?.['#text'] || prop || '');
        attributes.push({ name: propName, value: propVal });
        if (propName.toLocaleLowerCase('tr-TR').includes('renk')) {
          rawColor = propVal;
        } else if (propName.toLocaleLowerCase('tr-TR').includes('beden') || propName.toLocaleLowerCase('tr-TR').includes('numara')) {
          rawSize = propVal;
        }
      }

      const color = normalizeColorValue(rawColor, title);
      const size = normalizeSizeValue(rawSize);

      variants.push({
        id: existingVariant?.id || `var-${externalId}-${extVarId}`,
        externalVariantId: extVarId,
        sku: varSku,
        barcode,
        xmlStock: rawXmlStock,
        reservedStock,
        netStock: existingProd && xmlSource.disableStockSync ? existingVariant?.netStock ?? netStock : netStock,
        buyingPrice: buyingPriceVal,
        salePrice: salePriceTagVal,
        marketPrice: marketPriceVal,
        trendyolSalePrice:
          existingProd?.xmlPriceLock || xmlSource.disablePriceSync
            ? existingVariant?.trendyolSalePrice || channelPrices.trendyolPrice
            : channelPrices.trendyolPrice,
        hepsiburadaSalePrice:
          existingProd?.xmlPriceLock || xmlSource.disablePriceSync
            ? existingVariant?.hepsiburadaSalePrice || channelPrices.hepsiburadaPrice
            : channelPrices.hepsiburadaPrice,
        color,
        size,
        attributes
      });
    }

    const primaryVar = variants.find((v) => v.salePrice > 0) || variants[0];
    const hasZeroPriceVariant = variants.some((v) => !v.salePrice || v.salePrice <= 0);
    const isAllZeroPrice = variants.every((v) => !v.salePrice || v.salePrice <= 0);
    const totalXmlStock = variants.reduce((acc, v) => acc + v.xmlStock, 0);
    const reservedOrderStock = variants.reduce((acc, v) => acc + v.reservedStock, 0);
    const netAvailableStock = variants.reduce((acc, v) => acc + v.netStock, 0);

    const channelPrices =
      primaryVar.salePrice > 0
        ? calculateChannelPrices(primaryVar.salePrice, xmlSource)
        : { trendyolPrice: 0, trendyolListPrice: 0, hepsiburadaPrice: 0 };
    const zeroPriceWarningMsg = isAllZeroPrice
      ? '⚠️ XML satış fiyatı 0,00 TL! Bu ürün pazaryerine gönderilmez, lütfen fiyat giriniz.'
      : hasZeroPriceVariant
      ? '⚠️ Ürünün bazı varyantlarında XML fiyatı 0,00 TL! Sıfır fiyatlı varyantlar gönderilmez, fiyat giriniz.'
      : undefined;

    if (!existingProd) {
      if (xmlSource.disableNewProducts) continue;
      newlyAddedSkus.push(stockCode);
    } else {
      if (existingProd.totalXmlStock !== totalXmlStock) {
        stockUpdatedSkus.push(stockCode);
      }
      if (existingProd.salePrice !== primaryVar.salePrice) {
        priceUpdatedSkus.push(stockCode);
      }
    }

    syncedProducts.push({
      id: uniqueProdId,
      tenantId: xmlSource.tenantId,
      xmlSourceId: xmlSource.id,
      sourceName: xmlSource.name,
      externalId,
      stockCode,
      supplierStockCode: rawBaseSku,
      barcode: primaryVar.barcode,
      title: existingProd?.title || title,
      subtitle: existingProd?.subtitle || '',
      invoiceTitle: existingProd?.invoiceTitle || '',
      descriptionHtml: existingProd?.descriptionHtml || descriptionHtml,
      brandName,
      categoryName,
      categoryTree,
      images: rawImages,
      videoUrl: existingProd?.videoUrl || '',
      vatRate: parseNumber(firstVariant?.KdvOrani) || xmlSource.fixedTaxRate || 10,
      desi: parseNumber(firstVariant?.Desi) || 1,
      preparationDays: existingProd?.preparationDays || 1,
      warrantyMonths: existingProd?.warrantyMonths || 0,
      stockDeductionPerSale: existingProd?.stockDeductionPerSale || 1,
      maxPurchaseQty: existingProd?.maxPurchaseQty || 0,
      xmlPriceLock: existingProd?.xmlPriceLock || false,
      status: !isAllZeroPrice && netAvailableStock > 0 ? 'active' : 'passive',
      buyingPrice: isAllZeroPrice ? 0 : primaryVar.buyingPrice,
      marketPrice: isAllZeroPrice ? 0 : primaryVar.marketPrice,
      salePrice: isAllZeroPrice ? 0 : primaryVar.salePrice,
      trendyolListPrice: isAllZeroPrice
        ? 0
        : existingProd?.xmlPriceLock || xmlSource.disablePriceSync
        ? existingProd?.trendyolListPrice || channelPrices.trendyolListPrice
        : channelPrices.trendyolListPrice,
      trendyolSalePrice: isAllZeroPrice
        ? 0
        : existingProd?.xmlPriceLock || xmlSource.disablePriceSync
        ? existingProd?.trendyolSalePrice || channelPrices.trendyolPrice
        : channelPrices.trendyolPrice,
      hepsiburadaSalePrice: isAllZeroPrice
        ? 0
        : existingProd?.xmlPriceLock || xmlSource.disablePriceSync
        ? existingProd?.hepsiburadaSalePrice || channelPrices.hepsiburadaPrice
        : channelPrices.hepsiburadaPrice,
      totalXmlStock,
      reservedOrderStock,
      netAvailableStock,
      trendyolSyncStatus:
        isAllZeroPrice || hasZeroPriceVariant
          ? 'error'
          : existingProd?.trendyolSyncStatus || (xmlSource.autoPublishEnabled ? 'synced' : 'not_sent'),
      trendyolErrorMessage: zeroPriceWarningMsg || existingProd?.trendyolErrorMessage,
      hepsiburadaSyncStatus:
        isAllZeroPrice || hasZeroPriceVariant
          ? 'error'
          : existingProd?.hepsiburadaSyncStatus || (xmlSource.autoPublishEnabled ? 'synced' : 'not_sent'),
      hepsiburadaErrorMessage: zeroPriceWarningMsg || existingProd?.hepsiburadaErrorMessage,
      tags: existingProd?.tags || [],
      productUrl,
      variants,
      updatedAt: new Date().toISOString()
    });
  }

  const deletedSkus = existingProducts
    .filter((ep) => ep.xmlSourceId === xmlSource.id && !seenStockCodes.has(ep.stockCode))
    .map((ep) => ep.stockCode);

  const report: XmlSyncReport = {
    id: `rep-${Date.now()}`,
    tenantId: xmlSource.tenantId,
    xmlSourceId: xmlSource.id,
    xmlSourceName: xmlSource.name,
    sourceProductCount: rawProducts.length,
    stockUpdatedCount: stockUpdatedSkus.length,
    priceUpdatedCount: priceUpdatedSkus.length,
    newlyAddedCount: newlyAddedSkus.length,
    deletedCount: deletedSkus.length,
    startedAt,
    completedAt: new Date().toISOString(),
    itemsSummary: {
      stockUpdatedSkus: stockUpdatedSkus.slice(0, 50),
      priceUpdatedSkus: priceUpdatedSkus.slice(0, 50),
      newlyAddedSkus: newlyAddedSkus.slice(0, 50),
      deletedSkus: deletedSkus.slice(0, 50)
    }
  };

  return {
    products: syncedProducts,
    report,
    totalInXml: rawProducts.length,
    totalVariantsInXml
  };
}
