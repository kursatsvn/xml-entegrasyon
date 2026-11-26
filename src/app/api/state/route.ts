import { NextRequest, NextResponse } from 'next/server';
import { getTenantData, readDbAsync, writeDbAsync } from '@/lib/store';
import { calculateChannelPrices } from '@/lib/pricing-engine';
import {
  enrichCategoryMappingWithAutoMatch,
  resolveTrendyolBrandId
} from '@/lib/category-matcher';
import { inspectXmlFeedNodes, syncXmlFeedProducts } from '@/lib/xml-engine';
import { sanitizeAndDeduplicateCatalog } from '@/lib/ai-sanitizer';
import { sanitizeRichHtml } from '@/lib/html-sanitizer';
import { mergeTenantGeneralSettings, syncLegacyTenantFields } from '@/lib/general-settings';
import { resolveAuthenticatedContext } from '@/lib/auth-server';
import { UrlGuardError, assertSafeExternalXmlUrl } from '@/lib/url-guard';
import { StateActionSchema, formatZodError } from '@/lib/validators';
import {
  archiveLiveTrendyolProducts,
  deleteLiveTrendyolProducts,
  fetchLiveTrendyolProducts,
  publishProductsToMarketplace,
  pullOrdersFromMarketplace,
  syncPriceAndInventoryToMarketplace,
  testMarketplaceConnection
} from '@/lib/marketplace-api';
import {
  approveHepsiburadaPreMatch,
  checkHepsiburadaImportStatus,
  deletePendingHepsiburadaProducts,
  fetchHepsiburadaBuyboxOrders,
  fetchHepsiburadaCargoLabel,
  fetchLiveHepsiburadaProducts,
  pullHepsiburadaClaims,
  reconcileHepsiburadaProductStatuses,
  resolveHepsiburadaClaim,
  syncHepsiburadaInventoryAndPrice,
  toggleHepsiburadaListingsState
} from '@/lib/hepsiburada-api';
import {
  fetchHepsiburadaCategoryAttributes,
  fetchHepsiburadaLeafCategories,
  findBestHepsiburadaCategoryMatch,
  searchHepsiburadaCategories
} from '@/lib/hepsiburada-catalog';
import { parseHepsiburadaCategoryId } from '@/lib/hepsiburada-client';
import {
  CategoryMapping,
  MarketplaceAccount,
  Order,
  Product,
  Tenant,
  XmlSource
} from '@/types/sopyo';

export const dynamic = 'force-dynamic';

const SECRET_MASK = '••••••••';

function maskMarketplaceAccount(acc: MarketplaceAccount): MarketplaceAccount {
  return {
    ...acc,
    apiSecret: acc.apiSecret ? SECRET_MASK : ''
  };
}

function sanitizeLogoUrl(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return trimmed;
  return fallback;
}

export async function GET() {
  try {
    const db = await readDbAsync();
    const auth = await resolveAuthenticatedContext(db);
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: 'Oturum gerekli. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const { tenantId, role } = auth;
    const data = getTenantData(tenantId, db);

    return NextResponse.json({
      ...data,
      currentUser: {
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.fullName,
        role: auth.user.role,
        tenantId: auth.user.tenantId
      },
      marketplaceAccounts: data.marketplaceAccounts.map(maskMarketplaceAccount),
      isSuperAdmin: role === 'super_admin',
      allTenants: role === 'super_admin' ? db.tenants : [data.tenant],
      allUsers:
        role === 'super_admin'
          ? db.users.map(({ password: _password, clearPassword: _clear, ...rest }) => rest)
          : []
    });
  } catch (err) {
    console.error('[api/state GET error]', err);
    return NextResponse.json(
      { ok: false, message: 'Veriler yüklenirken bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Geçersiz JSON istek gövdesi.' }, { status: 400 });
    }

    const db = await readDbAsync();
    const auth = await resolveAuthenticatedContext(db);
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: 'Oturum gerekli. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const parsed = StateActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const body = parsed.data as Record<string, any>;
    const action = parsed.data.action;
    const { tenantId, role, tenant: activeTenant } = auth;

    // 1. XML Etiketlerini İncele (Sopyo Step 3 getXMLNodes.php)
    if (action === 'inspect_xml_nodes') {
      const xmlUrl = String(body.url || '').trim();
      if (!xmlUrl) {
        return NextResponse.json({ ok: false, message: 'XML URL gerekli' }, { status: 400 });
      }
      const nodesInfo = await inspectXmlFeedNodes(xmlUrl);
      return NextResponse.json({ ok: true, ...nodesInfo });
    }

    // 2. XML Kaynağı Ekle / Güncelle + Fiyat Kurallarını Tüm Ürünlere Uygula
    if (action === 'save_xml_source') {
      const incoming = body.xmlSource as Partial<XmlSource> | undefined;
      if (!incoming || typeof incoming !== 'object') {
        return NextResponse.json({ ok: false, message: 'XML kaynak verisi eksik.' }, { status: 400 });
      }
      if (incoming.url && String(incoming.url).trim()) {
        await assertSafeExternalXmlUrl(String(incoming.url));
      }
      const existingIdx = db.xmlSources.findIndex(
        (x) => x.id === incoming.id && x.tenantId === tenantId
      );

      let savedSource: XmlSource;
      if (existingIdx >= 0) {
        const existing = db.xmlSources[existingIdx];
        savedSource = {
          ...existing,
          ...incoming,
          id: existing.id,
          tenantId,
          lastCheckedAt: new Date().toISOString()
        };
        db.xmlSources[existingIdx] = savedSource;
      } else {
        const currentTenantXmlCount = db.xmlSources.filter((x) => x.tenantId === tenantId).length;
        if (currentTenantXmlCount >= activeTenant.maxXmlSources) {
          return NextResponse.json(
            {
              ok: false,
              message: `XML kaynak limitinize ulaştınız (${currentTenantXmlCount}/${activeTenant.maxXmlSources}). Yeni kaynak eklemek için paketinizi yükseltin.`
            },
            { status: 403 }
          );
        }

        savedSource = {
          id: `xml-${Date.now()}`,
          tenantId,
          xmlIdNumber: Math.floor(10000 + Math.random() * 90000),
          name: incoming.name || 'yeni_xml',
          url: incoming.url || '',
          providerType: incoming.providerType || 'ticimax',
          extraNotes: incoming.extraNotes || '',
          stockCodePrefix: incoming.stockCodePrefix ?? 'AX',
          generateBarcode: incoming.generateBarcode ?? true,
          disableStockSync: incoming.disableStockSync ?? false,
          disablePriceSync: incoming.disablePriceSync ?? false,
          disableNewProducts: incoming.disableNewProducts ?? false,
          criticalStockEnabled: incoming.criticalStockEnabled ?? true,
          criticalStockAmount: Number(incoming.criticalStockAmount ?? 3),
          autoPublishEnabled: incoming.autoPublishEnabled ?? true,
          autoPublishChannels: incoming.autoPublishChannels || ['Trendyol', 'Hepsiburada'],
          salePriceTag: incoming.salePriceTag || 'SatisFiyati',
          buyingPriceTag: incoming.buyingPriceTag || 'SatisFiyati',
          marketPriceTag: incoming.marketPriceTag || 'IndirimliFiyat',
          taxIncludedMode: incoming.taxIncludedMode ?? 0,
          fixedTaxRate: Number(incoming.fixedTaxRate ?? 10),
          useCurrencyConversion: incoming.useCurrencyConversion ?? false,
          priceRoundEnabled: incoming.priceRoundEnabled ?? false,
          priceRoundType: incoming.priceRoundType || 'x9',
          priceRoundWay: incoming.priceRoundWay || 'round',
          priceRuleType: incoming.priceRuleType ?? 3,
          fixedPriceRule: incoming.fixedPriceRule || {
            ruleMinPrice: 0,
            ruleMaxPrice: 999999999,
            ruleType: 'increase',
            ruleOperationType: 'percent',
            ruleAmount: 100,
            ruleExtraPrice: 0
          },
          dynamicPriceRules: incoming.dynamicPriceRules || [],
          marketplacePriceRules: incoming.marketplacePriceRules || {
            Trendyol: [
              {
                ruleMinPrice: 1,
                ruleMaxPrice: 299,
                ruleType: 'increase',
                ruleOperationType: 'percent',
                ruleAmount: 105,
                ruleExtraPrice: 75
              },
              {
                ruleMinPrice: 299,
                ruleMaxPrice: 999999999,
                ruleType: 'increase',
                ruleOperationType: 'percent',
                ruleAmount: 105,
                ruleExtraPrice: 0
              }
            ],
            Hepsiburada: [
              {
                ruleMinPrice: 1,
                ruleMaxPrice: 143,
                ruleType: 'increase',
                ruleOperationType: 'percent',
                ruleAmount: 120,
                ruleExtraPrice: 80
              },
              {
                ruleMinPrice: 143,
                ruleMaxPrice: 999999999,
                ruleType: 'increase',
                ruleOperationType: 'percent',
                ruleAmount: 120,
                ruleExtraPrice: 40
              }
            ]
          },
          customTagMapping: incoming.customTagMapping || {
            productNode: 'Urun',
            externalId: 'UrunKartiID',
            title: 'UrunAdi',
            description: 'Aciklama',
            brand: 'Marka',
            category: 'Kategori',
            categoryTree: 'KategoriTree',
            images: 'Resimler.Resim',
            variants: 'UrunSecenek.Secenek',
            variantId: 'VaryasyonID',
            sku: 'StokKodu',
            barcode: 'Barkod',
            stock: 'StokAdedi',
            buyingPrice: 'AlisFiyati',
            salePrice: 'SatisFiyati',
            marketPrice: 'IndirimliFiyat',
            vatRate: 'KdvOrani',
            currency: 'ParaBirimiKodu',
            desi: 'Desi'
          },
          totalProductCount: 0,
          totalVariantCount: 0,
          status: 'active',
          lastCheckedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        db.xmlSources.push(savedSource);
      }

      // Bu XML kaynağına bağlı ürünlerin fiyatlarını ve kritik stoklarını anında yeniden hesapla
      for (const prod of db.products) {
        if (prod.tenantId === tenantId && prod.xmlSourceId === savedSource.id) {
          if (!prod.xmlPriceLock && !savedSource.disablePriceSync) {
            const prices = calculateChannelPrices(prod.salePrice, savedSource);
            prod.trendyolSalePrice = prices.trendyolPrice;
            prod.trendyolListPrice = prices.trendyolListPrice;
            prod.hepsiburadaSalePrice = prices.hepsiburadaPrice;
            for (const v of prod.variants) {
              const vPrices = calculateChannelPrices(v.salePrice, savedSource);
              v.trendyolSalePrice = vPrices.trendyolPrice;
              v.hepsiburadaSalePrice = vPrices.hepsiburadaPrice;
            }
          }
          for (const v of prod.variants) {
            const effStock =
              savedSource.criticalStockEnabled && v.xmlStock <= savedSource.criticalStockAmount
                ? 0
                : v.xmlStock;
            v.netStock = Math.max(0, effStock - v.reservedStock);
          }
          prod.netAvailableStock = prod.variants.reduce((a, b) => a + b.netStock, 0);
        }
      }

      await writeDbAsync(db);
      return NextResponse.json({
        ok: true,
        message: 'XML kaynağı ve fiyat/stok kuralları kaydedildi.',
        xmlSource: savedSource
      });
    }

    // 2B. Hızlı Fiyat Ayarı (% Yüzde Artış + Ekstra TL) Güncelleme ve Tüm Ürünlere Uygulama
    if (action === 'update_quick_price_rules') {
      const tyPercent = Number(body.trendyolPercent ?? 105);
      const tyExtraTl = Number(body.trendyolExtraTl ?? 0);
      const hbPercent = Number(body.hepsiburadaPercent ?? 120);
      const hbExtraTl = Number(body.hepsiburadaExtraTl ?? 0);

      const tenantSources = db.xmlSources.filter((s) => s.tenantId === tenantId);
      for (const src of tenantSources) {
        src.priceRuleType = 3;
        src.marketplacePriceRules = {
          Trendyol: [
            {
              ruleMinPrice: 0,
              ruleMaxPrice: 999999999,
              ruleType: 'increase',
              ruleOperationType: 'percent',
              ruleAmount: tyPercent,
              ruleExtraPrice: tyExtraTl
            }
          ],
          Hepsiburada: [
            {
              ruleMinPrice: 0,
              ruleMaxPrice: 999999999,
              ruleType: 'increase',
              ruleOperationType: 'percent',
              ruleAmount: hbPercent,
              ruleExtraPrice: hbExtraTl
            }
          ]
        };
      }

      let recalculatedCount = 0;
      const primarySource = tenantSources[0];
      for (const prod of db.products) {
        if (prod.tenantId !== tenantId) continue;
        if (prod.xmlPriceLock) continue;
        const src = tenantSources.find((s) => s.id === prod.xmlSourceId) || primarySource;
        if (src) {
          const prices = calculateChannelPrices(prod.salePrice, src);
          prod.trendyolSalePrice = prices.trendyolPrice;
          prod.trendyolListPrice = prices.trendyolListPrice;
          prod.hepsiburadaSalePrice = prices.hepsiburadaPrice;
          for (const v of prod.variants) {
            const vPrices = calculateChannelPrices(v.salePrice, src);
            v.trendyolSalePrice = vPrices.trendyolPrice;
            v.hepsiburadaSalePrice = vPrices.hepsiburadaPrice;
          }
        } else {
          const tyCalc = Number((prod.salePrice * (1 + tyPercent / 100) + tyExtraTl).toFixed(2));
          const hbCalc = Number((prod.salePrice * (1 + hbPercent / 100) + hbExtraTl).toFixed(2));
          prod.trendyolSalePrice = tyCalc;
          prod.trendyolListPrice = Number((tyCalc * 1.15).toFixed(2));
          prod.hepsiburadaSalePrice = hbCalc;
          for (const v of prod.variants) {
            v.trendyolSalePrice = Number(
              (v.salePrice * (1 + tyPercent / 100) + tyExtraTl).toFixed(2)
            );
            v.hepsiburadaSalePrice = Number(
              (v.salePrice * (1 + hbPercent / 100) + hbExtraTl).toFixed(2)
            );
          }
        }
        recalculatedCount++;
      }

      await writeDbAsync(db);
      return NextResponse.json({
        ok: true,
        message: `Fiyat ayarları güncellendi (Trendyol: +%${tyPercent} + ${tyExtraTl} TL | Hepsiburada: +%${hbPercent} + ${hbExtraTl} TL) ve ${recalculatedCount} ürünün satış fiyatı yeniden hesaplandı!`
      });
    }

    // 3. Canlı XML Çekimi & Senkronizasyonu (ariasclosetx veya herhangi bir XML)
    if (action === 'sync_xml_source') {
      const xmlSourceId = String(body.xmlSourceId || '');
      const limit = Number(body.limit ?? 0);
      const xmlSource = db.xmlSources.find((x) => x.id === xmlSourceId && x.tenantId === tenantId);
      if (!xmlSource) {
        return NextResponse.json({ ok: false, message: 'XML kaynağı bulunamadı' }, { status: 404 });
      }

      const existingTenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const { products: syncedProducts, report, totalInXml, totalVariantsInXml } =
        await syncXmlFeedProducts({
          xmlSource,
          existingProducts: existingTenantProducts,
          limit
        });

      xmlSource.totalProductCount = totalInXml;
      xmlSource.totalVariantCount = totalVariantsInXml;
      xmlSource.lastCheckedAt = new Date().toISOString();

      // Mevcut ürünleri güncelle / yeni ürünleri ekle
      const otherProducts = db.products.filter(
        (p) => !(p.tenantId === tenantId && p.xmlSourceId === xmlSource.id)
      );
      db.products = [...otherProducts, ...syncedProducts];
      db.xmlReports.unshift(report);

      // Kategorileri ve Markaları otomatik çıkar / güncelle
      const catCounts = new Map<string, { tree: string; count: number }>();
      const brandCounts = new Map<string, number>();

      for (const p of syncedProducts) {
        const prevCat = catCounts.get(p.categoryName);
        catCounts.set(p.categoryName, {
          tree: p.categoryTree || p.categoryName,
          count: (prevCat?.count || 0) + 1
        });
        brandCounts.set(p.brandName, (brandCounts.get(p.brandName) || 0) + 1);
      }

      for (const [catName, info] of catCounts.entries()) {
        const existingCat = db.categories.find(
          (c) => c.tenantId === tenantId && c.name === catName
        );
        if (existingCat) {
          existingCat.productCount = info.count;
          existingCat.xmlCategoryTree = info.tree;
        } else {
          const newCat: CategoryMapping = {
            id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tenantId,
            name: catName,
            xmlCategoryTree: info.tree,
            sourceName: xmlSource.name,
            productCount: info.count,
            trendyolStatus: 'unmapped',
            trendyolAttributes: [],
            hepsiburadaStatus: 'unmapped',
            hepsiburadaAttributes: []
          };
          db.categories.push(newCat);
        }
      }

      for (const [bName, count] of brandCounts.entries()) {
        const existingBrand = db.brands.find(
          (b) => b.tenantId === tenantId && b.name === bName
        );
        if (existingBrand) {
          existingBrand.productCount = count;
        } else {
          db.brands.push({
            id: `brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tenantId,
            name: bName,
            productCount: count,
            isMapped: false
          });
        }
      }

      // Eğer XML kaynağında Otomatik Yayınla / Güncelle açıksa, Trendyol & Hepsiburada'ya otomatik stok/fiyat ve yeni ürünleri gönder
      let trendyolAutoMsg = '';
      if (xmlSource.autoPublishEnabled) {
        const accounts = db.marketplaceAccounts.filter((m) => m.tenantId === tenantId && m.isActive);
        const validProducts = syncedProducts.filter((p) => p.status === 'active' && p.salePrice > 0);
        const tenantCats = db.categories.filter((c) => c.tenantId === tenantId);
        const tenantBrands = db.brands.filter((b) => b.tenantId === tenantId);

        for (const acc of accounts) {
          // 1. Mevcut ürünlerin stok ve fiyatlarını güncelle
          await syncPriceAndInventoryToMarketplace({ account: acc, products: validProducts });

          // 2. Yeni eklenen / henüz gönderilmemiş veya fiyatı yeni girilmiş (pending) ürünleri otomatik Trendyol'a gönder
          const unsent = validProducts.filter(
            (p) =>
              (acc.marketplace === 'trendyol' && (p.trendyolSyncStatus === 'not_sent' || p.trendyolSyncStatus === 'pending')) ||
              (acc.marketplace === 'hepsiburada' && (p.hepsiburadaSyncStatus === 'not_sent' || p.hepsiburadaSyncStatus === 'pending'))
          );
          if (unsent.length > 0) {
            const pubRes = await publishProductsToMarketplace({
              account: acc,
              products: unsent,
              categories: tenantCats,
              brands: tenantBrands
            });
            const syncedSet = new Set(pubRes.syncedProductIds);
            for (const prod of syncedProducts) {
              if (syncedSet.has(prod.id)) {
                if (acc.marketplace === 'trendyol') {
                  prod.trendyolSyncStatus = 'synced';
                  prod.trendyolErrorMessage = undefined;
                } else {
                  prod.hepsiburadaSyncStatus = 'synced';
                  prod.hepsiburadaErrorMessage = undefined;
                }
              }
            }
            if (acc.marketplace === 'trendyol') {
              trendyolAutoMsg = ` | Trendyol'a ${pubRes.successCount} yeni ürün ve ${validProducts.length} ürün stok/fiyatı otomatik gönderildi.`;
            }
          } else if (acc.marketplace === 'trendyol') {
            trendyolAutoMsg = ` | Trendyol'da ${validProducts.length} ürünün stok ve fiyatları otomatik güncellendi.`;
          }
        }
      }

      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'xml_sync',
        channel: xmlSource.name,
        summary: `Canlı XML Çekildi: ${syncedProducts.length} tekil & temiz ürün (${totalInXml} kaynak ürün, ${totalVariantsInXml} varyant)${trendyolAutoMsg}`,
        status: 'success',
        details: `Yeni eklenen: ${report.newlyAddedCount}, Stoğu güncellenen: ${report.stockUpdatedCount}, Fiyatı güncellenen: ${report.priceUpdatedCount}`,
        createdAt: new Date().toISOString()
      });

      await writeDbAsync(db, { syncDeletedProducts: true, tenantId });
      return NextResponse.json({
        ok: true,
        message: `${xmlSource.name} kaynağından ${syncedProducts.length} tekil ürün başarıyla çekildi, yasaklı kelimeler temizlendi, Ürün Listesi güncellendi${trendyolAutoMsg}!`,
        report
      });
    }

    // 4. XML Kaynağı Sil
    if (action === 'delete_xml_source') {
      const xmlSourceId = String(body.xmlSourceId || '');
      const deleteProducts = Boolean(body.deleteProducts);
      db.xmlSources = db.xmlSources.filter(
        (x) => !(x.id === xmlSourceId && x.tenantId === tenantId)
      );
      if (deleteProducts) {
        db.products = db.products.filter(
          (p) => !(p.xmlSourceId === xmlSourceId && p.tenantId === tenantId)
        );
      }
      await writeDbAsync(db, {
        skipProducts: !deleteProducts,
        syncDeletedProducts: deleteProducts,
        tenantId
      });
      return NextResponse.json({ ok: true, message: 'XML kaynağı silindi.' });
    }

    // 5. Tekil Ürün Güncelle / Yeni Ürün Ekle
    if (action === 'save_product') {
      const incoming = body.product as Partial<Product> | undefined;
      if (!incoming || typeof incoming !== 'object') {
        return NextResponse.json({ ok: false, message: 'Ürün verisi eksik.' }, { status: 400 });
      }
      const idx = db.products.findIndex(
        (p) => p.id === incoming.id && p.tenantId === tenantId
      );
      if (idx >= 0) {
        const prev = db.products[idx];
        const newSalePrice = Number(incoming.salePrice ?? prev.salePrice ?? 0);
        const newTyPrice = Number(incoming.trendyolSalePrice ?? prev.trendyolSalePrice ?? 0);
        const newHbPrice = Number(incoming.hepsiburadaSalePrice ?? prev.hepsiburadaSalePrice ?? 0);
        const updatedVariants = (incoming.variants || prev.variants).map((v) => {
          if ((!v.salePrice || v.salePrice <= 0) && newSalePrice > 0) {
            return {
              ...v,
              salePrice: newSalePrice,
              buyingPrice: v.buyingPrice > 0 ? v.buyingPrice : newSalePrice,
              trendyolSalePrice: v.trendyolSalePrice > 0 ? v.trendyolSalePrice : newTyPrice || newSalePrice,
              hepsiburadaSalePrice: v.hepsiburadaSalePrice > 0 ? v.hepsiburadaSalePrice : newHbPrice || newSalePrice
            };
          }
          return v;
        });
        const stillHasZero =
          newSalePrice <= 0 || updatedVariants.some((v) => !v.salePrice || v.salePrice <= 0);

        const sanitizedMarketplaceDescriptions = incoming.marketplaceDescriptions
          ? {
              trendyol:
                incoming.marketplaceDescriptions.trendyol !== undefined
                  ? sanitizeRichHtml(incoming.marketplaceDescriptions.trendyol)
                  : prev.marketplaceDescriptions?.trendyol,
              hepsiburada:
                incoming.marketplaceDescriptions.hepsiburada !== undefined
                  ? sanitizeRichHtml(incoming.marketplaceDescriptions.hepsiburada)
                  : prev.marketplaceDescriptions?.hepsiburada
            }
          : prev.marketplaceDescriptions;

        db.products[idx] = {
          ...prev,
          ...incoming,
          id: prev.id,
          descriptionHtml:
            incoming.descriptionHtml !== undefined
              ? sanitizeRichHtml(incoming.descriptionHtml)
              : prev.descriptionHtml,
          minPrice:
            incoming.minPrice !== undefined ? Number(incoming.minPrice) : prev.minPrice,
          marketplaceDescriptions: sanitizedMarketplaceDescriptions,
          variants: updatedVariants,
          xmlPriceLock: prev.salePrice <= 0 && newSalePrice > 0 ? true : Boolean(incoming.xmlPriceLock ?? prev.xmlPriceLock),
          status: !stillHasZero ? incoming.status || 'active' : 'passive',
          trendyolSyncStatus: stillHasZero ? 'error' : prev.trendyolSyncStatus === 'error' ? 'pending' : prev.trendyolSyncStatus,
          trendyolErrorMessage: stillHasZero
            ? '⚠️ XML satış fiyatı 0,00 TL! Gönderim engellendi — Lütfen geçerli bir satış fiyatı giriniz.'
            : undefined,
          hepsiburadaSyncStatus: stillHasZero ? 'error' : prev.hepsiburadaSyncStatus === 'error' ? 'pending' : prev.hepsiburadaSyncStatus,
          hepsiburadaErrorMessage: stillHasZero
            ? '⚠️ XML satış fiyatı 0,00 TL! Gönderim engellendi — Lütfen geçerli bir satış fiyatı giriniz.'
            : undefined,
          tenantId,
          updatedAt: new Date().toISOString()
        };
      } else {
        const currentTenantProdCount = db.products.filter((p) => p.tenantId === tenantId).length;
        if (currentTenantProdCount >= activeTenant.maxProducts) {
          return NextResponse.json(
            {
              ok: false,
              message: `Ürün limitinize ulaştınız (${currentTenantProdCount}/${activeTenant.maxProducts}). Yeni ürün eklemek için paketinizi yükseltin.`
            },
            { status: 403 }
          );
        }

        const newProd: Product = {
          id: `prod-${Date.now()}`,
          tenantId,
          xmlSourceId: incoming.xmlSourceId || '',
          sourceName: incoming.sourceName || 'Sopyo Manuel',
          externalId: incoming.externalId || String(Date.now()),
          stockCode: incoming.stockCode || `MN${Date.now().toString().slice(-5)}`,
          supplierStockCode: incoming.supplierStockCode || '',
          barcode: incoming.barcode || `86900${Date.now().toString().slice(-8)}`,
          title: incoming.title || 'Yeni Ürün',
          subtitle: incoming.subtitle || '',
          invoiceTitle: incoming.invoiceTitle || '',
          descriptionHtml: sanitizeRichHtml(incoming.descriptionHtml || ''),
          brandName: incoming.brandName || "Aria's Closet",
          categoryName: incoming.categoryName || 'Genel',
          categoryTree: incoming.categoryTree || 'Genel',
          images: incoming.images || [],
          videoUrl: incoming.videoUrl || '',
          vatRate: Number(incoming.vatRate ?? 10),
          desi: Number(incoming.desi ?? 1),
          preparationDays: Number(incoming.preparationDays ?? 1),
          warrantyMonths: Number(incoming.warrantyMonths ?? 0),
          stockDeductionPerSale: Number(incoming.stockDeductionPerSale ?? 1),
          maxPurchaseQty: Number(incoming.maxPurchaseQty ?? 0),
          xmlPriceLock: Boolean(incoming.xmlPriceLock),
          status: incoming.status || 'active',
          buyingPrice: Number(incoming.buyingPrice ?? 0),
          marketPrice: Number(incoming.marketPrice ?? 0),
          salePrice: Number(incoming.salePrice ?? 0),
          minPrice: incoming.minPrice !== undefined ? Number(incoming.minPrice) : undefined,
          marketplaceDescriptions: incoming.marketplaceDescriptions
            ? {
                trendyol: incoming.marketplaceDescriptions.trendyol
                  ? sanitizeRichHtml(incoming.marketplaceDescriptions.trendyol)
                  : undefined,
                hepsiburada: incoming.marketplaceDescriptions.hepsiburada
                  ? sanitizeRichHtml(incoming.marketplaceDescriptions.hepsiburada)
                  : undefined
              }
            : undefined,
          trendyolListPrice: Number(incoming.trendyolListPrice ?? 0),
          trendyolSalePrice: Number(incoming.trendyolSalePrice ?? 0),
          hepsiburadaSalePrice: Number(incoming.hepsiburadaSalePrice ?? 0),
          totalXmlStock: Number(incoming.totalXmlStock ?? 100),
          reservedOrderStock: 0,
          netAvailableStock: Number(incoming.netAvailableStock ?? incoming.totalXmlStock ?? 100),
          trendyolSyncStatus: 'not_sent',
          hepsiburadaSyncStatus: 'not_sent',
          tags: incoming.tags || [],
          productUrl: '',
          variants: incoming.variants || [
            {
              id: `var-${Date.now()}`,
              externalVariantId: '1',
              sku: incoming.stockCode || 'SKU-1',
              barcode: incoming.barcode || `86900${Date.now().toString().slice(-8)}`,
              xmlStock: Number(incoming.totalXmlStock ?? 100),
              reservedStock: 0,
              netStock: Number(incoming.totalXmlStock ?? 100),
              buyingPrice: Number(incoming.buyingPrice ?? 0),
              salePrice: Number(incoming.salePrice ?? 0),
              marketPrice: Number(incoming.marketPrice ?? 0),
              trendyolSalePrice: Number(incoming.trendyolSalePrice ?? 0),
              hepsiburadaSalePrice: Number(incoming.hepsiburadaSalePrice ?? 0),
              color: 'Standart',
              size: 'Standart',
              attributes: []
            }
          ],
          updatedAt: new Date().toISOString()
        };
        db.products.unshift(newProd);
      }
      const savedProdId = incoming.id || db.products[0]?.id;
      await writeDbAsync(db, {
        skipMeta: true,
        onlyProductIds: savedProdId ? [savedProdId] : undefined
      });
      return NextResponse.json({ ok: true, message: 'Ürün bilgileri kaydedildi.' });
    }

    // 6. Tüm Kategorileri Tek Tıkla Otomatik Eşitle (Trendyol & Canlı Hepsiburada MPOP)
    if (action === 'auto_match_all_categories') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      let hbLeafCategories: Awaited<ReturnType<typeof fetchHepsiburadaLeafCategories>>['categories'] = [];
      if (hbAcc?.supplierOrMerchantId && hbAcc?.apiSecret) {
        const hbCatRes = await fetchHepsiburadaLeafCategories(hbAcc, { maxPages: 6 });
        if (hbCatRes.ok) {
          hbLeafCategories = hbCatRes.categories;
        }
      }

      let matchedCount = 0;
      let hbRealMatchedCount = 0;
      db.categories = db.categories.map((cat) => {
        if (cat.tenantId !== tenantId) return cat;
        matchedCount++;
        const enriched = enrichCategoryMappingWithAutoMatch(cat);

        // Eğer halihazırda gerçek sayısal ve doğru cinsiyet/alanda bir Hepsiburada kategori ID varsa koru
        const existingHbNameLower = (cat.hepsiburadaCategoryName || '').toLocaleLowerCase('tr-TR');
        const xmlLower = `${cat.name} ${cat.xmlCategoryTree}`.toLocaleLowerCase('tr-TR');
        const isXmlErkek = /\berkek\b/.test(xmlLower);
        const isXmlBebek = /\b(bebek|çocuk|cocuk)\b/.test(xmlLower);
        const hasWrongHbSegment =
          (!isXmlBebek && (existingHbNameLower.includes('bebek') || existingHbNameLower.includes('çocuk'))) ||
          (!isXmlErkek && existingHbNameLower.includes('erkek')) ||
          (isXmlErkek && existingHbNameLower.includes('kadın')) ||
          existingHbNameLower.includes('mobilya') ||
          existingHbNameLower.includes('ev dekorasyon');

        if (parseHepsiburadaCategoryId(cat.hepsiburadaCategoryId) && !hasWrongHbSegment) {
          hbRealMatchedCount++;
          return {
            ...enriched,
            hepsiburadaCategoryId: cat.hepsiburadaCategoryId,
            hepsiburadaCategoryName: cat.hepsiburadaCategoryName,
            hepsiburadaStatus: 'mapped' as const,
            hepsiburadaAttributes:
              cat.hepsiburadaAttributes.length > 0
                ? cat.hepsiburadaAttributes
                : enriched.hepsiburadaAttributes
          };
        }

        // Canlı Hepsiburada MPOP yaprak kategorilerinden eşleştir
        if (hbLeafCategories.length > 0) {
          const bestHb = findBestHepsiburadaCategoryMatch(
            cat.name,
            cat.xmlCategoryTree,
            hbLeafCategories
          );
          if (bestHb) {
            hbRealMatchedCount++;
            return {
              ...enriched,
              hepsiburadaCategoryId: String(bestHb.categoryId),
              hepsiburadaCategoryName: bestHb.displayName,
              hepsiburadaStatus: 'mapped' as const
            };
          }
        }

        // Gerçek sayısal HB kategorisi eşleşmediyse eski sahte HB-60000... ID'sini mapped sayma
        return {
          ...enriched,
          hepsiburadaCategoryId: '',
          hepsiburadaCategoryName: '',
          hepsiburadaStatus: 'unmapped' as const
        };
      });

      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({
        ok: true,
        message:
          hbLeafCategories.length > 0
            ? `${matchedCount} kategori Trendyol ile, ${hbRealMatchedCount} kategori canlı Hepsiburada MPOP yaprak kategorileriyle otomatik eşitlendi!`
            : `${matchedCount} kategori Trendyol ile eşitlendi. Hepsiburada canlı kategori eşleştirme için önce Hepsiburada API bilgilerini doğrulayın.`
      });
    }

    // 7. Tekil Kategori Eşitleme Kaydet
    if (action === 'save_category_mapping') {
      const incoming = body.category as CategoryMapping | undefined;
      if (!incoming || typeof incoming !== 'object') {
        return NextResponse.json({ ok: false, message: 'Kategori verisi eksik.' }, { status: 400 });
      }
      const idx = db.categories.findIndex(
        (c) => c.id === incoming.id && c.tenantId === tenantId
      );
      if (idx >= 0) {
        const prev = db.categories[idx];
        db.categories[idx] = { ...prev, ...incoming, id: prev.id, tenantId };
      }
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({ ok: true, message: 'Kategori eşleştirmesi güncellendi.' });
    }

    // 8. Tüm Markaları Otomatik Eşitle
    if (action === 'auto_match_all_brands') {
      const defaultBrandName = String(body.defaultBrandName || "Aria's Closet");
      db.brands = db.brands.map((b) => {
        if (b.tenantId !== tenantId) return b;
        return {
          ...b,
          trendyolBrandId: resolveTrendyolBrandId(b.name, b.trendyolBrandId),
          trendyolBrandName: b.trendyolBrandName || b.name || defaultBrandName,
          hepsiburadaBrandName: b.hepsiburadaBrandName || b.name || defaultBrandName,
          isMapped: true
        };
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({
        ok: true,
        message: 'Tüm markalar Trendyol ve Hepsiburada için eşitlendi!'
      });
    }

    // 9. Tüm Seçenek Gruplarını (Renk & Beden) Otomatik Eşitle
    if (action === 'auto_match_all_variants') {
      db.variantGroups = db.variantGroups.map((vg) => {
        if (vg.tenantId !== tenantId) return vg;
        return {
          ...vg,
          trendyolMapped: true,
          hepsiburadaMapped: true
        };
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({
        ok: true,
        message: 'Renk ve Beden seçenek grupları Trendyol ve Hepsiburada için eşitlendi!'
      });
    }

    // 10. Pazaryeri API Ayarlarını Kaydet & Test Et
    if (action === 'save_marketplace_account') {
      const incoming = body.account as MarketplaceAccount | undefined;
      if (
        !incoming ||
        typeof incoming !== 'object' ||
        (incoming.marketplace !== 'trendyol' && incoming.marketplace !== 'hepsiburada')
      ) {
        return NextResponse.json({ ok: false, message: 'Geçersiz pazaryeri hesabı.' }, { status: 400 });
      }
      const idx = db.marketplaceAccounts.findIndex(
        (m) => m.tenantId === tenantId && m.marketplace === incoming.marketplace
      );
      const existingAcc = idx >= 0 ? db.marketplaceAccounts[idx] : undefined;
      const resolvedApiSecret =
        existingAcc && (!incoming.apiSecret || incoming.apiSecret === SECRET_MASK)
          ? existingAcc.apiSecret
          : String(incoming.apiSecret || '');

      const candidateAccount: MarketplaceAccount = {
        ...incoming,
        id: existingAcc ? existingAcc.id : `mkt-${incoming.marketplace}-${Date.now()}`,
        tenantId,
        apiSecret: resolvedApiSecret,
        descriptionPrefixHtml: sanitizeRichHtml(incoming.descriptionPrefixHtml || ''),
        descriptionSuffixHtml: sanitizeRichHtml(incoming.descriptionSuffixHtml || '')
      };

      const testResult = await testMarketplaceConnection(candidateAccount);

      const updated: MarketplaceAccount = {
        ...candidateAccount,
        lastTestedAt: new Date().toISOString(),
        connectionStatus: testResult.ok ? 'connected' : 'error'
      };

      if (idx >= 0) {
        db.marketplaceAccounts[idx] = updated;
      } else {
        db.marketplaceAccounts.push(updated);
      }
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({
        ok: testResult.ok,
        message: testResult.message,
        account: maskMarketplaceAccount(updated)
      });
    }

    // 11. Toplu Ürün Gönderimi (Trendyol & Hepsiburada + Kontrollü Test Limiti)
    if (action === 'bulk_publish') {
      const targetMarketplace = (body.marketplace || 'Tümü') as 'Trendyol' | 'Hepsiburada' | 'Tümü';
      const publishLimit = Number(body.limit || 0);
      const currentTenant = db.tenants.find((t) => t.id === tenantId);
      const tenantGs = currentTenant ? mergeTenantGeneralSettings(currentTenant) : null;
      const allTenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const tenantCategories = db.categories.filter((c) => c.tenantId === tenantId);
      const tenantBrands = db.brands.filter((b) => b.tenantId === tenantId);
      const accounts = db.marketplaceAccounts.filter(
        (m) =>
          m.tenantId === tenantId &&
          m.isActive &&
          (targetMarketplace === 'Tümü' ||
            m.marketplace.toLowerCase() === targetMarketplace.toLowerCase())
      );

      if (accounts.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            message: `${targetMarketplace} için aktif bir pazaryeri API hesabı bulunamadı.`
          },
          { status: 400 }
        );
      }

      let totalAttempted = 0;
      let totalSuccess = 0;
      let totalError = 0;
      const allErrors: { stockCode: string; title: string; marketplace: string; message: string }[] = [];
      const remoteBatchIds: string[] = [];
      const modifiedProdIds = new Set<string>();

      for (const acc of accounts) {
        let productsForAcc = allTenantProducts;
        if (publishLimit > 0) {
          // Test / sınırlı gönderimde önce fiyatı > 0 ve henüz gönderilmemiş ürünleri önceliklendir
          const prioritized = [...allTenantProducts].sort((a, b) => {
            const aEligible = a.salePrice > 0 && a.status === 'active' ? 0 : 1;
            const bEligible = b.salePrice > 0 && b.status === 'active' ? 0 : 1;
            if (aEligible !== bEligible) return aEligible - bEligible;
            const aUnsent =
              (acc.marketplace === 'trendyol' ? a.trendyolSyncStatus : a.hepsiburadaSyncStatus) !== 'synced'
                ? 0
                : 1;
            const bUnsent =
              (acc.marketplace === 'trendyol' ? b.trendyolSyncStatus : b.hepsiburadaSyncStatus) !== 'synced'
                ? 0
                : 1;
            return aUnsent - bUnsent;
          });
          productsForAcc = prioritized.slice(0, publishLimit);
        }

        const res = await publishProductsToMarketplace({
          account: acc,
          products: productsForAcc,
          categories: tenantCategories,
          brands: tenantBrands,
          useMarketDesc: Boolean(tenantGs?.customerUseMarketDesc),
          useMinPrice: Boolean(tenantGs?.customerUseMinPrice)
        });
        totalAttempted = Math.max(totalAttempted, res.attemptedCount);
        totalSuccess = Math.max(totalSuccess, res.successCount);
        totalError += res.errorCount;
        allErrors.push(...res.errors);
        remoteBatchIds.push(res.remoteBatchId);

        const syncedSet = new Set(res.syncedProductIds);
        const targetedIds = new Set(productsForAcc.map((p) => p.id));
        for (const p of db.products) {
          if (p.tenantId !== tenantId || !targetedIds.has(p.id)) continue;
          modifiedProdIds.add(p.id);
          if (acc.marketplace === 'trendyol') {
            p.trendyolSyncStatus = syncedSet.has(p.id) ? 'synced' : 'error';
            const err = res.errors.find((e) => e.stockCode === p.stockCode);
            p.trendyolErrorMessage = err?.message;
          } else {
            p.hepsiburadaSyncStatus = syncedSet.has(p.id) ? 'synced' : 'error';
            const err = res.errors.find((e) => e.stockCode === p.stockCode);
            p.hepsiburadaErrorMessage = err?.message;
          }
        }
      }

      const newBatch = {
        id: `batch-${Date.now()}`,
        tenantId,
        batchNumber: 803255 + db.syncBatches.length,
        marketplace: targetMarketplace,
        operationType: publishLimit > 0 ? `KONTROLLÜ GÖNDERİM (${publishLimit} ÜRÜN)` : 'TÜM ÜRÜNLER',
        remoteBatchId: remoteBatchIds.join(' | ') || `BATCH-${Date.now()}`,
        attemptedCount: totalAttempted,
        successCount: totalSuccess,
        errorCount: allErrors.length,
        status: allErrors.length > 0 && totalSuccess === 0 ? ('failed' as const) : ('completed' as const),
        createdAt: new Date().toISOString(),
        errors: allErrors
      };

      db.syncBatches.unshift(newBatch);
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: targetMarketplace,
        summary: `Toplu Ürün Gönderimi (#${newBatch.batchNumber}): ${totalSuccess} başarılı, ${allErrors.length} hata`,
        status: allErrors.length === 0 ? 'success' : 'warning',
        details: `Batch ID: ${newBatch.remoteBatchId}`,
        createdAt: new Date().toISOString()
      });

      await writeDbAsync(
        db,
        modifiedProdIds.size > 0
          ? { onlyProductIds: Array.from(modifiedProdIds) }
          : { skipProducts: true }
      );
      return NextResponse.json({
        ok: true,
        message: `Toplu ürün gönderimi tamamlandı (#${newBatch.batchNumber}): ${totalSuccess} ürün aktarıldı, ${allErrors.length} hata döndü.`,
        batch: newBatch
      });
    }

    // 12. Toplu Stok & Fiyat Güncelleme
    if (action === 'bulk_update_price_stock') {
      const targetMarketplace = (body.marketplace || 'Tümü') as 'Trendyol' | 'Hepsiburada' | 'Tümü';
      const currentTenant = db.tenants.find((t) => t.id === tenantId);
      const tenantGs = currentTenant ? mergeTenantGeneralSettings(currentTenant) : null;
      const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const accounts = db.marketplaceAccounts.filter(
        (m) =>
          m.tenantId === tenantId &&
          m.isActive &&
          (targetMarketplace === 'Tümü' ||
            m.marketplace.toLowerCase() === targetMarketplace.toLowerCase())
      );

      const batchIds: string[] = [];
      let totalSuccess = 0;
      const allErrors: { stockCode: string; title: string; marketplace: string; message: string }[] = [];
      for (const acc of accounts) {
        const res = await syncPriceAndInventoryToMarketplace({
          account: acc,
          products: tenantProducts,
          useMinPrice: Boolean(tenantGs?.customerUseMinPrice)
        });
        batchIds.push(res.remoteBatchId);
        totalSuccess = Math.max(totalSuccess, res.successCount);
        allErrors.push(...res.errors);
      }

      const newBatch = {
        id: `batch-${Date.now()}`,
        tenantId,
        batchNumber: 803255 + db.syncBatches.length,
        marketplace: targetMarketplace,
        operationType: 'ÜRÜN GÜNCELLEME(Stok & Fiyat)',
        remoteBatchId: batchIds.join(' | ') || `INV-${Date.now()}`,
        attemptedCount: tenantProducts.length,
        successCount: totalSuccess,
        errorCount: allErrors.length,
        status: allErrors.length > 0 && totalSuccess === 0 ? ('failed' as const) : ('completed' as const),
        createdAt: new Date().toISOString(),
        errors: allErrors
      };

      db.syncBatches.unshift(newBatch);
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'price_stock_sync',
        channel: targetMarketplace,
        summary: `Toplu Stok & Fiyat Güncellendi (${totalSuccess} başarılı, ${allErrors.length} hata)`,
        status: allErrors.length === 0 ? 'success' : 'warning',
        details: `Batch ID: ${newBatch.remoteBatchId}`,
        createdAt: new Date().toISOString()
      });

      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({
        ok: true,
        message:
          allErrors.length === 0
            ? `${totalSuccess} ürünün güncel stok ve fiyatları ${targetMarketplace} kanallarına başarıyla gönderildi!`
            : `Stok & fiyat güncelleme tamamlandı: ${totalSuccess} başarılı, ${allErrors.length} hata döndü.`,
        batch: newBatch
      });
    }

    // 13. Sipariş Çekme + Otomatik Çapraz Pazaryeri Stoktan Düşme
    if (action === 'pull_orders_and_deduct_stock') {
      const currentTenant = db.tenants.find((t) => t.id === tenantId);
      const tenantGs = currentTenant ? mergeTenantGeneralSettings(currentTenant) : null;
      const accounts = db.marketplaceAccounts.filter((m) => m.tenantId === tenantId && m.isActive);
      let newOrdersCount = 0;
      const affectedProductsByChannel: { sourceMarketplace: string; product: Product }[] = [];

      for (const acc of accounts) {
        const pulled = await pullOrdersFromMarketplace(acc, {
          includePaymentAwaiting: Boolean(tenantGs?.customerHBWaitingOrderStatus)
        });
        for (const po of pulled) {
          if (!po.orderNumber) continue;
          const exists = db.orders.some(
            (o) =>
              o.tenantId === tenantId &&
              o.marketplace === acc.marketplace &&
              o.orderNumber === po.orderNumber
          );
          if (!exists) {
            newOrdersCount++;
            // Stoktan düş
            for (const item of po.items || []) {
              const prod = db.products.find(
                (p) =>
                  p.tenantId === tenantId &&
                  (p.stockCode === item.sku || p.variants.some((v) => v.sku === item.sku || v.barcode === item.barcode))
              );
              if (prod) {
                const deductQty = item.quantity * (prod.stockDeductionPerSale || 1);
                prod.reservedOrderStock += deductQty;
                prod.netAvailableStock = Math.max(0, prod.totalXmlStock - prod.reservedOrderStock);
                for (const v of prod.variants) {
                  if (v.sku === item.sku || v.barcode === item.barcode) {
                    v.reservedStock += deductQty;
                    v.netStock = Math.max(0, v.xmlStock - v.reservedStock);
                  }
                }
                affectedProductsByChannel.push({ sourceMarketplace: acc.marketplace, product: prod });
              }
            }
            db.orders.unshift({
              id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tenantId,
              orderNumber: po.orderNumber,
              packageNumber: po.packageNumber,
              marketplace: acc.marketplace,
              customerName: po.customerName || 'Müşteri',
              customerEmail: po.customerEmail || '',
              customerPhone: po.customerPhone || '',
              shippingAddress: po.shippingAddress || '',
              shippingCity: po.shippingCity || '',
              shippingDistrict: po.shippingDistrict || '',
              cargoCompany: po.cargoCompany || 'Aras Kargo Marketplace',
              cargoTrackingNumber: po.cargoTrackingNumber || '',
              cargoBarcode: po.cargoBarcode || po.orderNumber,
              totalAmount: po.totalAmount || 0,
              commissionAmount: Number(((po.totalAmount || 0) * 0.2).toFixed(2)),
              shippingCost: 65,
              status: po.status || 'ready_to_ship',
              invoiceStatus: 'unissued',
              labelPrinted: false,
              stockDeducted: true,
              crossSyncLog: `${acc.marketplace === 'trendyol' ? 'Trendyol' : 'Hepsiburada'} siparişi çekildi -> Diğer pazaryeri stoğu otomatik düşüldü.`,
              items: po.items || [],
              orderDate: po.orderDate || new Date().toISOString()
            });
          }
        }
      }

      // Simülasyon / Test Siparişi Oluşturma desteği (Kullanıcı çapraz stok düşmeyi canlı test etmek isterse)
      if (body.simulateNewOrder) {
        const sampleProd = db.products.find((p) => p.tenantId === tenantId && p.netAvailableStock > 0);
        if (sampleProd) {
          const mkt = (body.marketplace || 'trendyol') as 'trendyol' | 'hepsiburada';
          const otherMkt = mkt === 'trendyol' ? 'Hepsiburada' : 'Trendyol';
          const deductQty = sampleProd.stockDeductionPerSale || 1;
          sampleProd.reservedOrderStock += deductQty;
          sampleProd.netAvailableStock = Math.max(0, sampleProd.totalXmlStock - sampleProd.reservedOrderStock);
          if (sampleProd.variants[0]) {
            sampleProd.variants[0].reservedStock += deductQty;
            sampleProd.variants[0].netStock = Math.max(
              0,
              sampleProd.variants[0].xmlStock - sampleProd.variants[0].reservedStock
            );
          }

          const orderNum = String(Math.floor(11830000000 + Math.random() * 9000000));
          const price =
            mkt === 'trendyol' ? sampleProd.trendyolSalePrice : sampleProd.hepsiburadaSalePrice;

          const newOrder: Order = {
            id: `ord-${Date.now()}`,
            tenantId,
            orderNumber: orderNum,
            marketplace: mkt,
            customerName: 'Selin Demir',
            customerEmail: 'selin.demir@example.com',
            customerPhone: '0532 987 65 43',
            shippingAddress: 'Bağdat Cad. No:142 D:8 Kadıköy',
            shippingCity: 'İstanbul',
            shippingDistrict: 'Kadıköy',
            cargoCompany: 'Aras Kargo Marketplace',
            cargoTrackingNumber: `409${orderNum}`,
            cargoBarcode: orderNum,
            totalAmount: price,
            commissionAmount: Number((price * 0.2).toFixed(2)),
            shippingCost: 65,
            status: 'ready_to_ship',
            invoiceStatus: 'unissued',
            labelPrinted: false,
            stockDeducted: true,
            crossSyncLog: `${mkt === 'trendyol' ? 'Trendyol' : 'Hepsiburada'} siparişi geldi -> ${sampleProd.stockCode} stoğu ${deductQty} adet düşüldü (Rezerve: ${sampleProd.reservedOrderStock}) ve ${otherMkt} API'sine yeni stok (${sampleProd.netAvailableStock}) anında iletildi.`,
            orderDate: new Date().toISOString(),
            items: [
              {
                sku: sampleProd.variants[0]?.sku || sampleProd.stockCode,
                barcode: sampleProd.variants[0]?.barcode || sampleProd.barcode,
                title: sampleProd.title,
                maskedTitle: `${sampleProd.invoiceTitle || 'Tekstil & Ev Giyim Ürünü'} (${sampleProd.stockCode})`,
                quantity: 1,
                unitPrice: price,
                vatRate: sampleProd.vatRate,
                color: sampleProd.variants[0]?.color || 'Siyah',
                size: sampleProd.variants[0]?.size || 'S/M'
              }
            ]
          };
          db.orders.unshift(newOrder);
          newOrdersCount++;

          db.operationLogs.unshift({
            id: `op-${Date.now()}`,
            tenantId,
            type: 'cross_stock_deduct',
            channel: `${mkt.toUpperCase()} -> ${otherMkt.toUpperCase()}`,
            summary: `Sipariş #${orderNum}: ${sampleProd.stockCode} stoğu ${deductQty} adet düşüldü ve ${otherMkt} stoğu eşitlendi`,
            status: 'success',
            details: newOrder.crossSyncLog,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Gerçek siparişten düşülen stokları karşı pazaryerine anında ilet
      if (affectedProductsByChannel.length > 0) {
        for (const otherAcc of accounts) {
          const toSync = affectedProductsByChannel
            .filter((x) => x.sourceMarketplace !== otherAcc.marketplace)
            .map((x) => x.product);
          if (toSync.length > 0) {
            await syncPriceAndInventoryToMarketplace({
              account: otherAcc,
              products: toSync,
              useMinPrice: Boolean(tenantGs?.customerUseMinPrice)
            });
          }
        }
      }

      await writeDbAsync(
        db,
        affectedProductsByChannel.length > 0
          ? { onlyProductIds: Array.from(new Set(affectedProductsByChannel.map((x) => x.product.id))) }
          : body.simulateNewOrder
          ? undefined
          : { skipProducts: true }
      );
      return NextResponse.json({
        ok: true,
        message:
          newOrdersCount > 0
            ? `${newOrdersCount} yeni sipariş çekildi, ürün stokları otomatik düşüldü ve karşı pazaryeri stokları anında güncellendi!`
            : 'Trendyol ve Hepsiburada siparişleri kontrol edildi; tüm siparişler ve stoklar güncel.'
      });
    }

    // 14. Sipariş Fatura & Kargo Durumu Güncelleme
    if (action === 'update_order') {
      const { orderId, status, invoiceStatus, labelPrinted } = body;
      const ord = db.orders.find((o) => o.id === orderId && o.tenantId === tenantId);
      const tenant = db.tenants.find((t) => t.id === tenantId);
      if (ord) {
        if (status) ord.status = status;
        if (invoiceStatus) {
          ord.invoiceStatus = invoiceStatus;
          if (invoiceStatus === 'issued' && !ord.invoiceNumber) {
            const gs = tenant ? mergeTenantGeneralSettings(tenant) : null;
            if (tenant && gs?.customerInvoiceCheck) {
              const nextNum = (Number(gs.customerInvoiceLastNumber || '0') || 0) + 1;
              gs.customerInvoiceLastNumber = String(nextNum);
              tenant.generalSettings = gs;
              ord.invoiceNumber = `FTR-${String(nextNum).padStart(6, '0')}`;
            } else {
              ord.invoiceNumber = `FTR2026${Math.floor(100000 + Math.random() * 900000)}`;
            }
          }
        }
        if (typeof labelPrinted === 'boolean') ord.labelPrinted = labelPrinted;
        await writeDbAsync(db, { skipProducts: true });
      }
      return NextResponse.json({ ok: true, message: 'Sipariş güncellendi.' });
    }

    // 15. Firma & Genel Ayarları Kaydet (Sopyo 9 Sekme / 65 Alan - Mass Assignment Korumalı)
    if (action === 'update_tenant_settings') {
      const idx = db.tenants.findIndex((t) => t.id === tenantId);
      if (idx >= 0) {
        const currentTenant = db.tenants[idx];
        const incoming = (body.settings && typeof body.settings === 'object' ? body.settings : {}) as Partial<Tenant>;
        const safeSettings: Partial<Tenant> = {
          name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim() : currentTenant.name,
          companyPhone: typeof incoming.companyPhone === 'string' ? incoming.companyPhone : currentTenant.companyPhone,
          companyEmail: typeof incoming.companyEmail === 'string' ? incoming.companyEmail : currentTenant.companyEmail,
          companyAddress: typeof incoming.companyAddress === 'string' ? incoming.companyAddress : currentTenant.companyAddress,
          companyWebsite: typeof incoming.companyWebsite === 'string' ? incoming.companyWebsite : currentTenant.companyWebsite,
          defaultVatRate: incoming.defaultVatRate !== undefined ? Number(incoming.defaultVatRate) : currentTenant.defaultVatRate,
          maskInvoiceProductNames:
            typeof incoming.maskInvoiceProductNames === 'boolean'
              ? incoming.maskInvoiceProductNames
              : currentTenant.maskInvoiceProductNames,
          defaultMaskedProductName:
            typeof incoming.defaultMaskedProductName === 'string'
              ? incoming.defaultMaskedProductName
              : currentTenant.defaultMaskedProductName,
          cargoLabelTemplate: incoming.cargoLabelTemplate ?? currentTenant.cargoLabelTemplate,
          cargoLabelShowStock:
            typeof incoming.cargoLabelShowStock === 'boolean'
              ? incoming.cargoLabelShowStock
              : currentTenant.cargoLabelShowStock,
          cargoLabelShowProducts:
            typeof incoming.cargoLabelShowProducts === 'boolean'
              ? incoming.cargoLabelShowProducts
              : currentTenant.cargoLabelShowProducts,
          cargoLabelShowPrice:
            typeof incoming.cargoLabelShowPrice === 'boolean'
              ? incoming.cargoLabelShowPrice
              : currentTenant.cargoLabelShowPrice,
          cargoLabelShowSku:
            typeof incoming.cargoLabelShowSku === 'boolean'
              ? incoming.cargoLabelShowSku
              : currentTenant.cargoLabelShowSku,
          cargoLabelFontSize:
            incoming.cargoLabelFontSize !== undefined
              ? Number(incoming.cargoLabelFontSize)
              : currentTenant.cargoLabelFontSize,
          trendyolInvoiceNote:
            typeof incoming.trendyolInvoiceNote === 'string'
              ? incoming.trendyolInvoiceNote
              : currentTenant.trendyolInvoiceNote,
          hepsiburadaInvoiceNote:
            typeof incoming.hepsiburadaInvoiceNote === 'string'
              ? incoming.hepsiburadaInvoiceNote
              : currentTenant.hepsiburadaInvoiceNote
        };

        const mergedTenant: Tenant = {
          ...currentTenant,
          ...safeSettings
        };
        const currentGs = mergeTenantGeneralSettings(currentTenant);
        const incomingGs =
          incoming.generalSettings && typeof incoming.generalSettings === 'object'
            ? { ...incoming.generalSettings }
            : {};
        if ('customerLogo' in incomingGs) {
          incomingGs.customerLogo = sanitizeLogoUrl(incomingGs.customerLogo, currentGs.customerLogo);
        }

        const mergedGs = mergeTenantGeneralSettings({
          ...mergedTenant,
          generalSettings: {
            ...currentGs,
            ...incomingGs
          }
        });
        db.tenants[idx] = syncLegacyTenantFields(mergedTenant, mergedGs);

        // Kullanıcı bilgilendirme e-postası güncellendiyse yerel profille senkronize et
        if (mergedGs.userMail && auth.authMode === 'local_hmac') {
          const ownerUser = db.users.find((u) => u.id === auth.userId);
          if (ownerUser) {
            ownerUser.email = mergedGs.userMail;
          }
        }

        db.operationLogs.unshift({
          id: `op-settings-${Date.now()}`,
          tenantId,
          type: 'xml_sync',
          channel: 'Genel Ayarlar',
          summary: 'Firma, fatura, ürün listesi, kargo etiketi ve bildirim ayarları güncellendi',
          status: 'success',
          details: `KDV: %${db.tenants[idx].defaultVatRate} | Kargo Şablonu: ${db.tenants[idx].cargoLabelTemplate} | Liste Sıralama: ${mergedGs.productListSortType || 'En Son Eklenen'} (${mergedGs.productListPerPage}/sayfa)`,
          createdAt: new Date().toISOString()
        });

        await writeDbAsync(db, { skipProducts: true });
      }
      return NextResponse.json({
        ok: true,
        message: 'Tüm genel ayarlar (Firma, Fatura, Ürün Listesi, Pazaryeri, Kargo Etiketi ve Bildirim) başarıyla kaydedildi!'
      });
    }

    // 16. Rekabet Robotu Çalıştır (Hepsiburada Canlı Buybox API + Dip Fiyat Koruması)
    if (action === 'run_price_robot') {
      let updatedCount = 0;
      const modifiedProdIds: string[] = [];
      const hbProductsToSync: Product[] = [];
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada' && m.isActive
      );

      // Hepsiburada aktif robot kalemleri için canlı Buybox verisini çek
      const hbBuyboxMap = new Map<string, { rank: number; winningPrice: number; merchantName?: string }>();
      const activeHbRobotItems = db.priceRobotItems.filter(
        (i) => i.tenantId === tenantId && i.isActive && i.marketplace === 'hepsiburada'
      );
      if (hbAcc?.supplierOrMerchantId && hbAcc?.apiSecret && activeHbRobotItems.length > 0) {
        const candidateSkus: string[] = [];
        for (const rItem of activeHbRobotItems) {
          const p = db.products.find((pr) => pr.id === rItem.productId && pr.tenantId === tenantId);
          const hbSku = p?.variants.find((v) => v.hepsiburadaSku)?.hepsiburadaSku || rItem.marketplaceSkuOrUrl;
          if (hbSku && /^HB/i.test(hbSku)) candidateSkus.push(hbSku);
        }
        if (candidateSkus.length > 0) {
          const bbRes = await fetchHepsiburadaBuyboxOrders({ account: hbAcc, hbSkus: candidateSkus });
          if (bbRes.ok) {
            for (const o of bbRes.orders) {
              hbBuyboxMap.set(o.sku.toUpperCase(), o);
            }
          }
        }
      }

      for (const item of db.priceRobotItems) {
        if (item.tenantId !== tenantId || !item.isActive) continue;
        const prod = db.products.find((p) => p.id === item.productId && p.tenantId === tenantId);

        if (item.marketplace === 'hepsiburada') {
          const hbSku =
            prod?.variants.find((v) => v.hepsiburadaSku)?.hepsiburadaSku || item.marketplaceSkuOrUrl;
          const liveBb = hbSku ? hbBuyboxMap.get(hbSku.toUpperCase()) : undefined;
          if (liveBb && liveBb.winningPrice > 0) {
            item.buyboxPrice = liveBb.winningPrice;
            item.buyboxRank = liveBb.rank;
            if (liveBb.merchantName) item.competitorStore = liveBb.merchantName;
          }
        }

        const effectiveFloor = Math.max(item.minFloorPrice, prod?.minPrice || 0);
        if (item.buyboxPrice > 0 && item.buyboxPrice < item.currentPrice) {
          const target = Math.max(
            effectiveFloor,
            Number((item.buyboxPrice - item.stepAmount).toFixed(2))
          );
          if (target !== item.currentPrice) {
            item.currentPrice = target;
            item.buyboxRank = target <= item.buyboxPrice ? 1 : item.buyboxRank || 2;
            item.lastCheckedAt = new Date().toISOString();
            updatedCount++;

            if (prod) {
              if (item.marketplace === 'trendyol') {
                prod.trendyolSalePrice = target;
              } else {
                prod.hepsiburadaSalePrice = target;
                for (const v of prod.variants) {
                  v.hepsiburadaSalePrice = target;
                }
                hbProductsToSync.push(prod);
              }
              modifiedProdIds.push(prod.id);
            }
          }
        }
      }

      // Güncellenen Hepsiburada Buybox fiyatlarını canlı Listing API'sine bas
      if (hbAcc?.supplierOrMerchantId && hbAcc?.apiSecret && hbProductsToSync.length > 0) {
        await syncHepsiburadaInventoryAndPrice({
          account: hbAcc,
          products: hbProductsToSync,
          useMinPrice: true
        });
      }

      await writeDbAsync(
        db,
        modifiedProdIds.length > 0 ? { onlyProductIds: modifiedProdIds } : { skipProducts: true }
      );
      return NextResponse.json({
        ok: true,
        message: `Fiyat Rekabet Robotu çalıştırıldı: ${updatedCount} üründe dip fiyat korunarak Buybox fiyatı optimize edildi${hbProductsToSync.length > 0 ? ` (${hbProductsToSync.length} ürün canlı Hepsiburada'ya iletildi)` : ''}!`
      });
    }

    if (action === 'add_price_robot_item') {
      const prod = db.products.find((p) => p.id === body.productId && p.tenantId === tenantId);
      if (!prod) {
        return NextResponse.json({ ok: false, message: 'Ürün bulunamadı' }, { status: 404 });
      }
      const mkt = (body.marketplace || 'trendyol') as 'trendyol' | 'hepsiburada';
      const currentPrice = mkt === 'trendyol' ? prod.trendyolSalePrice : prod.hepsiburadaSalePrice;

      db.priceRobotItems.unshift({
        id: `pr-${Date.now()}`,
        tenantId,
        productId: prod.id,
        stockCode: prod.stockCode,
        productTitle: prod.title,
        marketplace: mkt,
        marketplaceSkuOrUrl: body.marketplaceSkuOrUrl || prod.stockCode,
        currentPrice,
        buyboxPrice: Number((currentPrice - 5).toFixed(2)),
        minFloorPrice: Number(body.minFloorPrice || ( currentPrice * 0.85 ).toFixed(2)),
        maxCeilingPrice: Number(body.maxCeilingPrice || ( currentPrice * 1.2 ).toFixed(2)),
        stepAmount: Number(body.stepAmount || 1),
        buyboxRank: 2,
        competitorStore: 'Rakip Mağaza',
        excludedStores: [],
        isActive: true,
        lastCheckedAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json({ ok: true, message: 'Ürün Fiyat Rekabet Robotuna eklendi.' });
    }

    // 18. Canlı Trendyol Ürünlerini Listele (Yalnızca Aktif Kiracının Kendi API Anahtarı ile)
    if (action === 'fetch_live_trendyol_products') {
      const tyAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'trendyol'
      );
      if (!tyAcc || !tyAcc.supplierOrMerchantId || !tyAcc.apiKey || !tyAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Bu işlem için önce Entegrasyonlar sekmesinden mağazanıza ait Trendyol Satıcı ID, API Key ve API Secret bilgilerini kaydedin.'
          },
          { status: 400 }
        );
      }

      const result = await fetchLiveTrendyolProducts({
        account: tyAcc,
        page: Number(body.page || 0),
        size: Number(body.size || 50),
        filter: body.filter || 'all'
      });

      return NextResponse.json(result);
    }

    // 19. Canlı Trendyol Ürünlerini Önce Arşivle (1. Adım - Kiracı İzolasyonlu)
    if (action === 'archive_live_trendyol_products') {
      const tyAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'trendyol'
      );
      if (!tyAcc || !tyAcc.supplierOrMerchantId || !tyAcc.apiKey || !tyAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Bu işlem için önce Entegrasyonlar sekmesinden mağazanıza ait Trendyol API bilgilerini kaydedin.'
          },
          { status: 400 }
        );
      }

      const result = await archiveLiveTrendyolProducts({
        account: tyAcc,
        barcodes: Array.isArray(body.barcodes) ? body.barcodes : [],
        archiveMode: body.archiveMode || 'selected'
      });

      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: 'Trendyol API (ARCHIVE)',
        summary: `Trendyol 1. Adım Arşivleme: ${result.archivedCount} ürün arşivlendi`,
        status: result.ok ? 'success' : 'error',
        details: result.message,
        createdAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });

      return NextResponse.json(result);
    }

    // 20. Canlı Trendyol Ürünlerini Kalıcı Sil (2. Adım - Kiracı İzolasyonlu)
    if (action === 'delete_live_trendyol_products') {
      const tyAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'trendyol'
      );
      if (!tyAcc || !tyAcc.supplierOrMerchantId || !tyAcc.apiKey || !tyAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Bu işlem için önce Entegrasyonlar sekmesinden mağazanıza ait Trendyol API bilgilerini kaydedin.'
          },
          { status: 400 }
        );
      }

      const result = await deleteLiveTrendyolProducts({
        account: tyAcc,
        barcodes: Array.isArray(body.barcodes) ? body.barcodes : [],
        deleteAllMode: body.deleteAllMode || 'selected',
        maxPagesToDelete: Number(body.maxPagesToDelete || 20)
      });

      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: 'Trendyol API (DELETE)',
        summary: `Trendyol Ürün Silme: ${result.deletedCount} barkod silme kuyruğuna alındı`,
        status: result.ok ? 'success' : 'error',
        details: result.message,
        createdAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });

      return NextResponse.json(result);
    }

    // 17. Süper Admin: Mağaza/Kullanıcı Yönetimi
    if (action === 'admin_update_tenant') {
      if (role !== 'super_admin') {
        return NextResponse.json(
          { ok: false, message: 'Bu işlem için Süper Admin yetkisi gereklidir.' },
          { status: 403 }
        );
      }
      const targetId = String(body.targetTenantId || '');
      const updates = (body.updates && typeof body.updates === 'object' ? body.updates : {}) as Partial<Tenant>;
      const idx = db.tenants.findIndex((t) => t.id === targetId);
      if (idx >= 0) {
        const current = db.tenants[idx];
        const { id: _id, createdAt: _createdAt, ...allowedUpdates } = updates;
        db.tenants[idx] = {
          ...current,
          ...allowedUpdates,
          id: current.id,
          createdAt: current.createdAt
        };
        await writeDbAsync(db, { skipProducts: true });
      }
      return NextResponse.json({ ok: true, message: 'Mağaza yetki ve limitleri güncellendi.' });
    }

    // 21. AI Katalog & İhlal Koruma Motorunu Manuel Çalıştır + Temizlenenleri Trendyol'a Gönder
    if (action === 'run_ai_compliance_scan') {
      const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const otherProducts = db.products.filter((p) => p.tenantId !== tenantId);
      const scanResult = sanitizeAndDeduplicateCatalog(tenantProducts);
      db.products = [...otherProducts, ...scanResult.products];

      await writeDbAsync(db, { syncDeletedProducts: true, tenantId });

      return NextResponse.json({
        ok: true,
        sanitizedCount: scanResult.sanitizedCount,
        prohibitedBlockedCount: scanResult.prohibitedBlockedCount,
        duplicateRemovedCount: scanResult.duplicateRemovedCount,
        totalCleanProducts: scanResult.products.length,
        sanitizedLog: scanResult.sanitizedLog.slice(0, 25),
        message: `🛡️ AI İhlal Koruma & Tekilleştirme Tamamlandı: ${scanResult.sanitizedCount} ürünün yasaklı kelimeleri temizlendi, ${scanResult.duplicateRemovedCount} çoklanan ürün tekilleştirildi, ${scanResult.prohibitedBlockedCount} satışı yasak ürün engellendi. Toplam ${scanResult.products.length} temiz ürün aktif!`
      });
    }

    // 22. Hepsiburada Canlı MPOP Kategori Arama
    if (action === 'search_hepsiburada_categories') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Önce Entegrasyonlar sekmesinden mağazanıza ait Hepsiburada Merchant ID ve Servis Anahtarını kaydedin.'
          },
          { status: 400 }
        );
      }
      const res = await searchHepsiburadaCategories(
        hbAcc,
        String(body.query || ''),
        Number(body.limit || 40)
      );
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    // 23. Hepsiburada Seçili Kategori Zorunlu & Varyant Özelliklerini Çek
    if (action === 'fetch_hepsiburada_category_attributes') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Önce Entegrasyonlar sekmesinden mağazanıza ait Hepsiburada API bilgilerini kaydedin.'
          },
          { status: 400 }
        );
      }
      const res = await fetchHepsiburadaCategoryAttributes(hbAcc, Number(body.categoryId));
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    // 24. Canlı Hepsiburada Ürünlerini & Sayaçlarını Listele (Kiracı İzolasyonlu)
    if (action === 'fetch_live_hepsiburada_products') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Bu işlem için önce Entegrasyonlar sekmesinden mağazanıza ait Hepsiburada Merchant ID, Entegratör Kullanıcı Adı ve Servis Anahtarını kaydedin.'
          },
          { status: 400 }
        );
      }
      const result = await fetchLiveHepsiburadaProducts({
        account: hbAcc,
        page: Number(body.page || 0),
        size: Number(body.size || 50),
        filter: body.filter || 'all'
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // 25. Canlı Hepsiburada Ürünlerini Satışa Aç / Kapat (Activate / Deactivate)
    if (action === 'toggle_hepsiburada_listings_state') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Hepsiburada API bilgileri eksik.'
          },
          { status: 400 }
        );
      }
      const result = await toggleHepsiburadaListingsState({
        account: hbAcc,
        items: Array.isArray(body.items) ? body.items : [],
        targetState: body.targetState
      });
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: `Hepsiburada API (${String(body.targetState).toUpperCase()})`,
        summary: `Hepsiburada Satış Durumu Güncelleme: ${result.processedCount} ürün işlendi`,
        status: result.ok ? 'success' : 'error',
        details: result.message,
        createdAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // 26. Hepsiburada Onay Bekleyen Katalog Ürünlerini Sil (MPOP delete-process)
    if (action === 'delete_pending_hepsiburada_products') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const result = await deletePendingHepsiburadaProducts({
        account: hbAcc,
        merchantSkus: Array.isArray(body.merchantSkus) ? body.merchantSkus : []
      });
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: 'Hepsiburada API (DELETE)',
        summary: `Hepsiburada Onay Bekleyen Ürün Silme: ${result.deletedCount} SKU`,
        status: result.ok ? 'success' : 'error',
        details: result.message,
        createdAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // 27. Hepsiburada Ön Eşleşmeli (PRE_MATCHED) Ürünleri Onayla
    if (action === 'approve_hepsiburada_prematch') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const result = await approveHepsiburadaPreMatch({
        account: hbAcc,
        merchantSkus: Array.isArray(body.merchantSkus) ? body.merchantSkus : []
      });
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'marketplace_publish',
        channel: 'Hepsiburada API (PRE_MATCH)',
        summary: `Hepsiburada Ön Eşleşme Onayı: ${result.approvedCount} SKU`,
        status: result.ok ? 'success' : 'error',
        details: result.message,
        createdAt: new Date().toISOString()
      });
      await writeDbAsync(db, { skipProducts: true });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // 28. Hepsiburada Batch / Tracking ID Durum Sorgula
    if (action === 'check_hepsiburada_import_status') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const res = await checkHepsiburadaImportStatus(hbAcc, String(body.trackingId || ''));
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    // 29. Hepsiburada Gönderim Durumlarını Canlı Mağaza ile Eşitle (Salt-Okunur HB GET -> Yerel DB Hizalama)
    if (action === 'reconcile_hepsiburada_status') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const res = await reconcileHepsiburadaProductStatuses({
        account: hbAcc,
        products: tenantProducts
      });
      if (res.ok && res.updatedProductIds.length > 0) {
        await writeDbAsync(db, { onlyProductIds: res.updatedProductIds });
      }
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    // 30. Canlı Pazaryeri İade / Talep (Claims) Çekme
    if (action === 'pull_marketplace_claims') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada' && m.isActive
      );
      let addedCount = 0;
      let updatedCount = 0;
      if (hbAcc?.supplierOrMerchantId && hbAcc?.apiSecret) {
        const pulledClaims = await pullHepsiburadaClaims(hbAcc);
        for (const pc of pulledClaims) {
          if (!pc.claimNumber) continue;
          const existing = db.claims.find(
            (c) =>
              c.tenantId === tenantId &&
              c.marketplace === 'hepsiburada' &&
              c.claimNumber === pc.claimNumber
          );
          if (existing) {
            if (pc.status && existing.status !== pc.status) {
              existing.status = pc.status;
              updatedCount++;
            }
          } else {
            db.claims.unshift({
              id: `clm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tenantId,
              claimNumber: pc.claimNumber,
              orderNumber: pc.orderNumber || '',
              marketplace: 'hepsiburada',
              customerName: pc.customerName || 'Hepsiburada Müşterisi',
              productTitle: pc.productTitle || 'İade Ürünü',
              sku: pc.sku || '',
              quantity: pc.quantity || 1,
              reason: pc.reason || 'Müşteri Talebi',
              status: pc.status || 'pending',
              restockOnApprove: true,
              amount: pc.amount || 0,
              claimDate: pc.claimDate || new Date().toISOString()
            });
            addedCount++;
          }
        }
      }
      if (addedCount > 0 || updatedCount > 0) {
        db.operationLogs.unshift({
          id: `op-claim-${Date.now()}`,
          tenantId,
          type: 'claim_sync',
          channel: 'Hepsiburada OMS Claims',
          summary: `İade/Talep Senkronizasyonu: ${addedCount} yeni, ${updatedCount} güncellendi`,
          status: 'success',
          details: 'Hepsiburada OMS talep listesi canlı API üzerinden güncellendi.',
          createdAt: new Date().toISOString()
        });
        await writeDbAsync(db, { skipProducts: true });
      }
      return NextResponse.json({
        ok: true,
        addedCount,
        updatedCount,
        message:
          addedCount > 0 || updatedCount > 0
            ? `Hepsiburada iade talepleri güncellendi: ${addedCount} yeni, ${updatedCount} durum değişikliği.`
            : 'Hepsiburada iade ve değişim talepleri kontrol edildi; tüm kayıtlar güncel.'
      });
    }

    // 31. Hepsiburada İade / Değişim Talebini Onayla / Reddet
    if (action === 'resolve_hepsiburada_claim') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const res = await resolveHepsiburadaClaim({
        account: hbAcc,
        claimNumber: String(body.claimNumber),
        decision: body.decision,
        rejectionReason: body.rejectionReason,
        merchantStatement: body.merchantStatement
      });
      if (res.ok) {
        const claim = db.claims.find(
          (c) =>
            c.tenantId === tenantId &&
            (c.id === body.claimId || c.claimNumber === String(body.claimNumber))
        );
        if (claim) {
          claim.status = body.decision === 'accept' ? 'approved' : 'rejected';
        }
        db.operationLogs.unshift({
          id: `op-clm-${Date.now()}`,
          tenantId,
          type: 'claim_sync',
          channel: 'Hepsiburada OMS Claims',
          summary: res.message,
          status: 'success',
          details: `Talep #${body.claimNumber} -> ${body.decision}`,
          createdAt: new Date().toISOString()
        });
        await writeDbAsync(db, { skipProducts: true });
      }
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    // 32. Hepsiburada Resmi Kargo Etiketi Çekme (OMS Labels)
    if (action === 'fetch_hepsiburada_cargo_label') {
      const hbAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'hepsiburada'
      );
      if (!hbAcc || !hbAcc.supplierOrMerchantId || !hbAcc.apiSecret) {
        return NextResponse.json(
          { ok: false, message: 'Hepsiburada API bilgileri eksik.' },
          { status: 400 }
        );
      }
      const res = await fetchHepsiburadaCargoLabel(hbAcc, String(body.packageNumber));
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }

    return NextResponse.json({ ok: false, message: 'Bilinmeyen işlem' }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof UrlGuardError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
    }
    console.error('[api/state POST error]', err);
    return NextResponse.json(
      { ok: false, message: 'İşlem sırasında beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
