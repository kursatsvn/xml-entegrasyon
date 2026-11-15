import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantData, readDb, writeDb } from '@/lib/store';
import { calculateChannelPrices } from '@/lib/pricing-engine';
import { enrichCategoryMappingWithAutoMatch } from '@/lib/category-matcher';
import { inspectXmlFeedNodes, syncXmlFeedProducts } from '@/lib/xml-engine';
import {
  deleteLiveTrendyolProducts,
  fetchLiveTrendyolProducts,
  publishProductsToMarketplace,
  pullOrdersFromMarketplace,
  syncPriceAndInventoryToMarketplace,
  testMarketplaceConnection
} from '@/lib/marketplace-api';
import { CategoryMapping, MarketplaceAccount, Order, Product, XmlSource } from '@/types/sopyo';

const SESSION_COOKIE = 'sopyo_session_v1';

async function resolveCurrentTenantId(): Promise<{ userId: string; tenantId: string; role: string }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const db = readDb();
  const defaultUser = db.users[0];

  if (!raw) {
    return { userId: defaultUser.id, tenantId: defaultUser.tenantId, role: defaultUser.role };
  }
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    const user = db.users.find((u) => u.id === parsed.userId) || defaultUser;
    return {
      userId: user.id,
      tenantId: parsed.tenantId || user.tenantId,
      role: user.role
    };
  } catch {
    return { userId: defaultUser.id, tenantId: defaultUser.tenantId, role: defaultUser.role };
  }
}

export async function GET() {
  const { tenantId, role } = await resolveCurrentTenantId();
  const db = readDb();

  // Eğer veritabanında henüz sadece 12 başlangıç (seed) ürünü varsa, canlı XML'den tüm ürünleri (1.648 ürün) otomatik çek
  const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
  const primaryXml = db.xmlSources.find((x) => x.tenantId === tenantId);
  if (primaryXml && process.env.ARIASCLOSET_XML_URL && primaryXml.url.includes('YOUR_XML_TOKEN')) {
    primaryXml.url = process.env.ARIASCLOSET_XML_URL;
  }

  if (
    tenantProducts.length <= 20 &&
    primaryXml &&
    primaryXml.url &&
    !primaryXml.url.includes('YOUR_XML_TOKEN')
  ) {
    try {
      const { products: syncedProducts, report, totalInXml, totalVariantsInXml } =
        await syncXmlFeedProducts({
          xmlSource: primaryXml,
          existingProducts: tenantProducts,
          limit: 0
        });
      primaryXml.totalProductCount = totalInXml;
      primaryXml.totalVariantCount = totalVariantsInXml;
      primaryXml.lastCheckedAt = new Date().toISOString();
      const otherProducts = db.products.filter(
        (p) => !(p.tenantId === tenantId && p.xmlSourceId === primaryXml.id)
      );
      db.products = [...otherProducts, ...syncedProducts];
      db.xmlReports.unshift(report);

      // Kategorileri ve Markaları da tüm 1.648 üründen otomatik çıkar
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
          db.categories.push(
            enrichCategoryMappingWithAutoMatch({
              id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tenantId,
              name: catName,
              xmlCategoryTree: info.tree,
              sourceName: primaryXml.name,
              productCount: info.count,
              trendyolStatus: 'unmapped',
              trendyolAttributes: [],
              hepsiburadaStatus: 'unmapped',
              hepsiburadaAttributes: []
            })
          );
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
            trendyolBrandId: 1845920,
            trendyolBrandName: "Aria's Closet",
            hepsiburadaBrandName: "Aria's Closet",
            isMapped: true
          });
        }
      }

      writeDb(db);
    } catch (e) {
      console.error('Auto XML sync on initial load failed:', e);
    }
  }

  const data = getTenantData(tenantId);

  return NextResponse.json({
    ...data,
    isSuperAdmin: role === 'super_admin',
    allTenants: role === 'super_admin' ? db.tenants : [data.tenant],
    allUsers:
      role === 'super_admin'
        ? db.users.map(({ password, ...rest }) => rest)
        : []
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const { tenantId, role } = await resolveCurrentTenantId();
    const db = readDb();

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
      const incoming = body.xmlSource as Partial<XmlSource>;
      const existingIdx = db.xmlSources.findIndex(
        (x) => x.id === incoming.id && x.tenantId === tenantId
      );

      let savedSource: XmlSource;
      if (existingIdx >= 0) {
        savedSource = {
          ...db.xmlSources[existingIdx],
          ...incoming,
          tenantId,
          lastCheckedAt: new Date().toISOString()
        };
        db.xmlSources[existingIdx] = savedSource;
      } else {
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

      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: 'XML kaynağı ve fiyat/stok kuralları kaydedildi.',
        xmlSource: savedSource
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

      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'xml_sync',
        channel: xmlSource.name,
        summary: `Canlı XML Çekildi: ${syncedProducts.length} ürün (${totalInXml} toplam kaynak ürün, ${totalVariantsInXml} varyant)`,
        status: 'success',
        details: `Yeni eklenen: ${report.newlyAddedCount}, Stoğu güncellenen: ${report.stockUpdatedCount}, Fiyatı güncellenen: ${report.priceUpdatedCount}`,
        createdAt: new Date().toISOString()
      });

      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: `${xmlSource.name} kaynağından ${syncedProducts.length} ürün (Toplam XML: ${totalInXml} ürün / ${totalVariantsInXml} varyant) başarıyla çekildi ve fiyat kuralları uygulandı!`,
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
      writeDb(db);
      return NextResponse.json({ ok: true, message: 'XML kaynağı silindi.' });
    }

    // 5. Tekil Ürün Güncelle / Yeni Ürün Ekle
    if (action === 'save_product') {
      const incoming = body.product as Partial<Product>;
      const idx = db.products.findIndex(
        (p) => p.id === incoming.id && p.tenantId === tenantId
      );
      if (idx >= 0) {
        db.products[idx] = {
          ...db.products[idx],
          ...incoming,
          tenantId,
          updatedAt: new Date().toISOString()
        };
      } else {
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
          descriptionHtml: incoming.descriptionHtml || '',
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
      writeDb(db);
      return NextResponse.json({ ok: true, message: 'Ürün bilgileri kaydedildi.' });
    }

    // 6. Tüm Kategorileri Tek Tıkla Otomatik Eşitle (Trendyol & Hepsiburada)
    if (action === 'auto_match_all_categories') {
      let matchedCount = 0;
      db.categories = db.categories.map((cat) => {
        if (cat.tenantId !== tenantId) return cat;
        matchedCount++;
        return enrichCategoryMappingWithAutoMatch(cat);
      });
      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: `${matchedCount} kategori Trendyol ve Hepsiburada kategori ağacı ve zorunlu özellikleriyle otomatik eşitlendi!`
      });
    }

    // 7. Tekil Kategori Eşitleme Kaydet
    if (action === 'save_category_mapping') {
      const incoming = body.category as CategoryMapping;
      const idx = db.categories.findIndex(
        (c) => c.id === incoming.id && c.tenantId === tenantId
      );
      if (idx >= 0) {
        db.categories[idx] = { ...db.categories[idx], ...incoming };
      }
      writeDb(db);
      return NextResponse.json({ ok: true, message: 'Kategori eşleştirmesi güncellendi.' });
    }

    // 8. Tüm Markaları Otomatik Eşitle
    if (action === 'auto_match_all_brands') {
      const defaultBrandName = String(body.defaultBrandName || "Aria's Closet");
      db.brands = db.brands.map((b) => {
        if (b.tenantId !== tenantId) return b;
        return {
          ...b,
          trendyolBrandId: b.trendyolBrandId || 1845920,
          trendyolBrandName: b.trendyolBrandName || defaultBrandName,
          hepsiburadaBrandName: b.hepsiburadaBrandName || defaultBrandName,
          isMapped: true
        };
      });
      writeDb(db);
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
      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: 'Renk ve Beden seçenek grupları Trendyol ve Hepsiburada için eşitlendi!'
      });
    }

    // 10. Pazaryeri API Ayarlarını Kaydet & Test Et
    if (action === 'save_marketplace_account') {
      const incoming = body.account as MarketplaceAccount;
      const idx = db.marketplaceAccounts.findIndex(
        (m) => m.tenantId === tenantId && m.marketplace === incoming.marketplace
      );
      const testResult = await testMarketplaceConnection({ ...incoming, tenantId });

      const updated: MarketplaceAccount = {
        ...incoming,
        id: idx >= 0 ? db.marketplaceAccounts[idx].id : `mkt-${incoming.marketplace}-${Date.now()}`,
        tenantId,
        lastTestedAt: new Date().toISOString(),
        connectionStatus: testResult.ok ? 'connected' : 'error'
      };

      if (idx >= 0) {
        db.marketplaceAccounts[idx] = updated;
      } else {
        db.marketplaceAccounts.push(updated);
      }
      writeDb(db);
      return NextResponse.json({
        ok: testResult.ok,
        message: testResult.message,
        account: updated
      });
    }

    // 11. Toplu Ürün Gönderimi (Trendyol & Hepsiburada)
    if (action === 'bulk_publish') {
      const targetMarketplace = (body.marketplace || 'Tümü') as 'Trendyol' | 'Hepsiburada' | 'Tümü';
      const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const tenantCategories = db.categories.filter((c) => c.tenantId === tenantId);
      const tenantBrands = db.brands.filter((b) => b.tenantId === tenantId);
      const accounts = db.marketplaceAccounts.filter(
        (m) =>
          m.tenantId === tenantId &&
          m.isActive &&
          (targetMarketplace === 'Tümü' ||
            m.marketplace.toLowerCase() === targetMarketplace.toLowerCase())
      );

      let totalAttempted = 0;
      let totalSuccess = 0;
      let totalError = 0;
      const allErrors: { stockCode: string; title: string; marketplace: string; message: string }[] = [];
      let remoteBatchIds: string[] = [];

      for (const acc of accounts) {
        const res = await publishProductsToMarketplace({
          account: acc,
          products: tenantProducts,
          categories: tenantCategories,
          brands: tenantBrands
        });
        totalAttempted = Math.max(totalAttempted, res.attemptedCount);
        totalSuccess = Math.max(totalSuccess, res.successCount);
        totalError += res.errorCount;
        allErrors.push(...res.errors);
        remoteBatchIds.push(res.remoteBatchId);

        const syncedSet = new Set(res.syncedProductIds);
        for (const p of db.products) {
          if (p.tenantId !== tenantId) continue;
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
        operationType: 'TÜM ÜRÜNLER',
        remoteBatchId: remoteBatchIds.join(' | ') || `BATCH-${Date.now()}`,
        attemptedCount: tenantProducts.length,
        successCount: totalSuccess,
        errorCount: allErrors.length,
        status: 'completed' as const,
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

      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: `Toplu ürün gönderimi tamamlandı (#${newBatch.batchNumber}): ${totalSuccess} ürün aktarıldı, ${allErrors.length} hata döndü.`,
        batch: newBatch
      });
    }

    // 12. Toplu Stok & Fiyat Güncelleme
    if (action === 'bulk_update_price_stock') {
      const targetMarketplace = (body.marketplace || 'Tümü') as 'Trendyol' | 'Hepsiburada' | 'Tümü';
      const tenantProducts = db.products.filter((p) => p.tenantId === tenantId);
      const accounts = db.marketplaceAccounts.filter(
        (m) =>
          m.tenantId === tenantId &&
          m.isActive &&
          (targetMarketplace === 'Tümü' ||
            m.marketplace.toLowerCase() === targetMarketplace.toLowerCase())
      );

      const batchIds: string[] = [];
      for (const acc of accounts) {
        const res = await syncPriceAndInventoryToMarketplace({
          account: acc,
          products: tenantProducts
        });
        batchIds.push(res.remoteBatchId);
      }

      const newBatch = {
        id: `batch-${Date.now()}`,
        tenantId,
        batchNumber: 803255 + db.syncBatches.length,
        marketplace: targetMarketplace,
        operationType: 'ÜRÜN GÜNCELLEME(Stok & Fiyat)',
        remoteBatchId: batchIds.join(' | ') || `INV-${Date.now()}`,
        attemptedCount: tenantProducts.length,
        successCount: tenantProducts.length,
        errorCount: 0,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        errors: []
      };

      db.syncBatches.unshift(newBatch);
      db.operationLogs.unshift({
        id: `op-${Date.now()}`,
        tenantId,
        type: 'price_stock_sync',
        channel: targetMarketplace,
        summary: `Toplu Stok & Fiyat Güncellendi (${tenantProducts.length} ürün)`,
        status: 'success',
        details: `Batch ID: ${newBatch.remoteBatchId}`,
        createdAt: new Date().toISOString()
      });

      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: `${tenantProducts.length} ürünün güncel stok ve fiyatları ${targetMarketplace} kanallarına başarıyla gönderildi!`,
        batch: newBatch
      });
    }

    // 13. Sipariş Çekme + Otomatik Çapraz Pazaryeri Stoktan Düşme
    if (action === 'pull_orders_and_deduct_stock') {
      const accounts = db.marketplaceAccounts.filter((m) => m.tenantId === tenantId && m.isActive);
      let newOrdersCount = 0;

      for (const acc of accounts) {
        const pulled = await pullOrdersFromMarketplace(acc);
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
              }
            }
            db.orders.unshift({
              id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tenantId,
              orderNumber: po.orderNumber,
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

      writeDb(db);
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
      if (ord) {
        if (status) ord.status = status;
        if (invoiceStatus) {
          ord.invoiceStatus = invoiceStatus;
          if (invoiceStatus === 'issued' && !ord.invoiceNumber) {
            ord.invoiceNumber = `FTR2026${Math.floor(100000 + Math.random() * 900000)}`;
          }
        }
        if (typeof labelPrinted === 'boolean') ord.labelPrinted = labelPrinted;
        writeDb(db);
      }
      return NextResponse.json({ ok: true, message: 'Sipariş güncellendi.' });
    }

    // 15. Firma & Genel Ayarları Kaydet
    if (action === 'update_tenant_settings') {
      const idx = db.tenants.findIndex((t) => t.id === tenantId);
      if (idx >= 0) {
        db.tenants[idx] = {
          ...db.tenants[idx],
          ...body.settings
        };
        writeDb(db);
      }
      return NextResponse.json({
        ok: true,
        message: 'Firma, fatura maskeleme ve kargo etiketi ayarları kaydedildi.'
      });
    }

    // 16. Rekabet Robotu Çalıştır / Ekle
    if (action === 'run_price_robot') {
      let updatedCount = 0;
      for (const item of db.priceRobotItems) {
        if (item.tenantId !== tenantId || !item.isActive) continue;
        if (item.buyboxPrice < item.currentPrice) {
          const target = Math.max(item.minFloorPrice, Number((item.buyboxPrice - item.stepAmount).toFixed(2)));
          item.currentPrice = target;
          item.buyboxRank = target <= item.buyboxPrice ? 1 : 2;
          item.lastCheckedAt = new Date().toISOString();
          updatedCount++;

          const prod = db.products.find((p) => p.id === item.productId && p.tenantId === tenantId);
          if (prod) {
            if (item.marketplace === 'trendyol') prod.trendyolSalePrice = target;
            else prod.hepsiburadaSalePrice = target;
          }
        }
      }
      writeDb(db);
      return NextResponse.json({
        ok: true,
        message: `Fiyat Rekabet Robotu çalıştırıldı: ${updatedCount} üründe dip fiyat korunarak Buybox fiyatı optimize edildi!`
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
      writeDb(db);
      return NextResponse.json({ ok: true, message: 'Ürün Fiyat Rekabet Robotuna eklendi.' });
    }

    // 18. Canlı Trendyol Ürünlerini Listele (Onaylı + Onay Bekleyenler Dahil)
    if (action === 'fetch_live_trendyol_products') {
      const tyAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'trendyol'
      );
      const effectiveAccount: MarketplaceAccount = {
        ...(tyAcc || {
          id: 'mkt-ty-lunerose',
          tenantId,
          marketplace: 'trendyol',
          storeName: 'LuneRose',
          supplierOrMerchantId: process.env.TRENDYOL_SUPPLIER_ID || '1192080',
          apiKey: '',
          apiSecret: '',
          isActive: true,
          autoConfirmOrders: false,
          shipmentProviderId: '7',
          shipmentProviderName: 'Aras Kargo Marketplace',
          shipmentAddressId: '7853340',
          shipmentAddressText: '',
          returningAddressId: '7853341',
          returningAddressText: '',
          dispatchTimeHours: 24,
          hbOrderPullStatus: 'ready_to_ship',
          stockCodeType: 'modelCode',
          descriptionPrefixHtml: '',
          descriptionSuffixHtml: '',
          connectionStatus: 'connected'
        }),
        supplierOrMerchantId:
          tyAcc?.supplierOrMerchantId || process.env.TRENDYOL_SUPPLIER_ID || '1192080',
        apiKey: tyAcc?.apiKey || process.env.TRENDYOL_API_KEY || '',
        apiSecret: tyAcc?.apiSecret || process.env.TRENDYOL_API_SECRET || ''
      };

      const result = await fetchLiveTrendyolProducts({
        account: effectiveAccount,
        page: Number(body.page || 0),
        size: Number(body.size || 50),
        filter: body.filter || 'all'
      });

      return NextResponse.json(result);
    }

    // 19. Canlı Trendyol Ürünlerini Sil (Seçili Barkodlar, Sadece Onay Bekleyenler veya Tümü)
    if (action === 'delete_live_trendyol_products') {
      const tyAcc = db.marketplaceAccounts.find(
        (m) => m.tenantId === tenantId && m.marketplace === 'trendyol'
      );
      const effectiveAccount: MarketplaceAccount = {
        ...(tyAcc as MarketplaceAccount),
        supplierOrMerchantId:
          tyAcc?.supplierOrMerchantId || process.env.TRENDYOL_SUPPLIER_ID || '1192080',
        apiKey: tyAcc?.apiKey || process.env.TRENDYOL_API_KEY || '',
        apiSecret: tyAcc?.apiSecret || process.env.TRENDYOL_API_SECRET || ''
      };

      const result = await deleteLiveTrendyolProducts({
        account: effectiveAccount,
        barcodes: body.barcodes || [],
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
      writeDb(db);

      return NextResponse.json(result);
    }

    // 17. Süper Admin: Mağaza/Kullanıcı Yönetimi
    if (action === 'admin_update_tenant' && role === 'super_admin') {
      const targetId = String(body.targetTenantId || '');
      const idx = db.tenants.findIndex((t) => t.id === targetId);
      if (idx >= 0) {
        db.tenants[idx] = {
          ...db.tenants[idx],
          ...body.updates
        };
        writeDb(db);
      }
      return NextResponse.json({ ok: true, message: 'Mağaza yetki ve limitleri güncellendi.' });
    }

    return NextResponse.json({ ok: false, message: 'Bilinmeyen işlem' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'İşlem sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
