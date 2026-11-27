import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync, writeDbAsync } from '@/lib/store';
import { createSupabaseServerClient, getSupabaseEnv } from '@/lib/supabase';
import { syncXmlFeedProducts } from '@/lib/xml-engine';
import { constantTimeStringEqual } from '@/lib/session';
import { mergeTenantGeneralSettings } from '@/lib/general-settings';
import {
  pullOrdersFromMarketplace,
  publishProductsToMarketplace,
  syncPriceAndInventoryToMarketplace
} from '@/lib/marketplace-api';
import { Product } from '@/types/sopyo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_AUTO_PUBLISH_PER_RUN = 80;
let cronConfigSyncedInInstance = false;

async function syncProductionCronConfigOnce(): Promise<void> {
  if (cronConfigSyncedInInstance) return;
  if (process.env.VERCEL_ENV !== 'production') return;
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return;

  try {
    const supabase = createSupabaseServerClient();
    const { serverSecret } = getSupabaseEnv();
    if (!supabase || !serverSecret) return;
    const { error } = await supabase.rpc('sopyo_ensure_cron_config', {
      p_secret: serverSecret,
      p_cron_secret: cronSecret,
      p_app_base_url:
        process.env.APP_BASE_URL?.trim() || 'https://xml-entegrasyon-orcin.vercel.app'
    });
    if (!error) {
      cronConfigSyncedInInstance = true;
    }
  } catch (e) {
    console.error('[syncProductionCronConfigOnce error]', e);
  }
}

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers.get('authorization') || '';
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return Boolean(
    expectedSecret && providedSecret && constantTimeStringEqual(providedSecret, expectedSecret)
  );
}

function productFingerprint(p: Product): string {
  const varSig = p.variants
    .map(
      (v) =>
        `${v.sku}:${v.netStock}:${v.reservedStock}:${v.salePrice}:${v.trendyolSalePrice}:${v.hepsiburadaSalePrice}`
    )
    .join(',');
  return `${p.status}|${p.totalXmlStock}|${p.reservedOrderStock}|${p.netAvailableStock}|${p.salePrice}|${p.trendyolSalePrice}|${p.hepsiburadaSalePrice}|${p.trendyolSyncStatus}|${p.hepsiburadaSyncStatus}|${p.title}|${varSig}`;
}

/**
 * Yan etkisiz (read-only) sağlık ve kimlik doğrulama kontrolü.
 */
export async function HEAD(req: NextRequest) {
  await syncProductionCronConfigOnce();
  if (!isAuthorizedCronRequest(req)) {
    return new NextResponse(null, { status: 401 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  await syncProductionCronConfigOnce();
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const startedAtMs = Date.now();

  try {
    const db = await readDbAsync();
    const beforeFingerprints = new Map<string, string>(
      db.products.map((p) => [p.id, productFingerprint(p)])
    );
    const summary: string[] = [];
    let anyDeletedFromXml = false;

    for (const tenant of db.tenants) {
      if (!tenant.isActive) continue;
      const tenantGs = mergeTenantGeneralSettings(tenant);
      const sources = db.xmlSources.filter(
        (s) => s.tenantId === tenant.id && s.status === 'active'
      );

      // 1. Aktif XML kaynaklarını çek & AI korumasından geçir
      for (const src of sources) {
        try {
          const existing = db.products.filter((p) => p.tenantId === tenant.id);
          const { products, report, totalInXml, totalVariantsInXml } = await syncXmlFeedProducts({
            xmlSource: src,
            existingProducts: existing,
            limit: 0
          });
          src.totalProductCount = totalInXml;
          src.totalVariantCount = totalVariantsInXml;
          src.lastCheckedAt = new Date().toISOString();
          if ((report.deletedCount || 0) > 0) {
            anyDeletedFromXml = true;
          }

          const others = db.products.filter(
            (p) => !(p.tenantId === tenant.id && p.xmlSourceId === src.id)
          );
          db.products = [...others, ...products];
          db.xmlReports.unshift(report);
          summary.push(
            `${tenant.name} / ${src.name}: ${products.length} temiz ürün senkronize edildi (XML Toplam: ${totalInXml})`
          );
        } catch (e: unknown) {
          console.error(`[cron xml sync error] ${tenant.id}/${src.id}`, e);
          summary.push(`${tenant.name} / ${src.name}: XML senkronizasyonu başarısız`);
        }
      }

      const accounts = db.marketplaceAccounts.filter(
        (m) => m.tenantId === tenant.id && m.isActive
      );
      if (accounts.length === 0) continue;

      // 2. Trendyol & Hepsiburada yeni siparişlerini PARALEL çek ve çapraz stok düşümü uygula
      const orderResults = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const orders = await pullOrdersFromMarketplace(acc, {
              includePaymentAwaiting: Boolean(tenantGs.customerHBWaitingOrderStatus)
            });
            return { acc, orders };
          } catch (e: unknown) {
            console.error(`[cron order pull error] ${tenant.id}/${acc.marketplace}`, e);
            return { acc, orders: [] };
          }
        })
      );

      let newOrdersSaved = 0;
      for (const { acc, orders } of orderResults) {
        for (const po of orders) {
          if (!po.orderNumber) continue;
          const exists = db.orders.some(
            (o) =>
              o.tenantId === tenant.id &&
              o.marketplace === acc.marketplace &&
              o.orderNumber === po.orderNumber
          );
          if (exists) continue;

          newOrdersSaved++;
          for (const item of po.items || []) {
            const prod = db.products.find(
              (p) =>
                p.tenantId === tenant.id &&
                (p.stockCode === item.sku ||
                  p.variants.some((v) => v.sku === item.sku || v.barcode === item.barcode))
            );
            if (prod) {
              const deductQty = (item.quantity || 1) * (prod.stockDeductionPerSale || 1);
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
            tenantId: tenant.id,
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
            crossSyncLog: `${acc.marketplace === 'trendyol' ? 'Trendyol' : 'Hepsiburada'} siparişi otomatik çekildi -> Çapraz stok düşüldü.`,
            items: po.items || [],
            orderDate: po.orderDate || new Date().toISOString()
          });
        }
      }

      const tenantProducts = db.products.filter(
        (p) => p.tenantId === tenant.id && p.status === 'active' && p.salePrice > 0
      );
      const tenantCats = db.categories.filter((c) => c.tenantId === tenant.id);
      const tenantBrands = db.brands.filter((b) => b.tenantId === tenant.id);
      const autoPublishChannelSet = new Set<string>(
        sources.filter((s) => s.autoPublishEnabled).flatMap((s) => s.autoPublishChannels || [])
      );

      // 3. Trendyol & Hepsiburada Stok/Fiyat Eşitleme + Yeni Ürün Gönderimini PARALEL çalıştır
      await Promise.all(
        accounts.map(async (acc) => {
          try {
            await syncPriceAndInventoryToMarketplace({
              account: acc,
              products: tenantProducts,
              useMinPrice: Boolean(tenantGs.customerUseMinPrice)
            });

            const channelTitle = acc.marketplace === 'trendyol' ? 'Trendyol' : 'Hepsiburada';
            const canAutoPublishChannel =
              sources.length === 0 || autoPublishChannelSet.has(channelTitle);

            const newUnsent = canAutoPublishChannel
              ? tenantProducts
                  .filter(
                    (p) =>
                      (acc.marketplace === 'trendyol' &&
                        (p.trendyolSyncStatus === 'not_sent' ||
                          p.trendyolSyncStatus === 'pending')) ||
                      (acc.marketplace === 'hepsiburada' &&
                        (p.hepsiburadaSyncStatus === 'not_sent' ||
                          p.hepsiburadaSyncStatus === 'pending'))
                  )
                  .slice(0, MAX_AUTO_PUBLISH_PER_RUN)
              : [];

            if (newUnsent.length > 0) {
              const pubRes = await publishProductsToMarketplace({
                account: acc,
                products: newUnsent,
                categories: tenantCats,
                brands: tenantBrands,
                useMarketDesc: Boolean(tenantGs.customerUseMarketDesc),
                useMinPrice: Boolean(tenantGs.customerUseMinPrice)
              });
              const syncedSet = new Set(pubRes.syncedProductIds);
              const targetedSet = new Set(newUnsent.map((u) => u.id));
              const chunkFallbackErr = pubRes.errors.find(
                (e) => e.stockCode.startsWith('HB-CHUNK-') || e.stockCode === 'HB-IMPORT-HTTP'
              );

              for (const p of db.products) {
                if (!targetedSet.has(p.id)) continue;
                const isSynced = syncedSet.has(p.id);
                const err = pubRes.errors.find((e) => e.stockCode === p.stockCode);
                if (acc.marketplace === 'trendyol') {
                  p.trendyolSyncStatus = isSynced ? 'synced' : 'error';
                  p.trendyolErrorMessage = isSynced
                    ? undefined
                    : err?.message || 'Otomatik gönderim hatası.';
                } else {
                  p.hepsiburadaSyncStatus = isSynced ? 'synced' : 'error';
                  p.hepsiburadaErrorMessage = isSynced
                    ? undefined
                    : err?.message || chunkFallbackErr?.message || 'Otomatik gönderim hatası.';
                }
              }
            }
          } catch (e: unknown) {
            console.error(`[cron marketplace sync error] ${tenant.id}/${acc.marketplace}`, e);
            summary.push(`${tenant.name} / ${acc.marketplace}: Pazaryeri senkronizasyonu başarısız`);
          }
        })
      );

      db.operationLogs.unshift({
        id: `log-cron-${Date.now()}`,
        tenantId: tenant.id,
        type: 'xml_sync',
        channel: '3 Saatlik Otomatik XML & AI Katalog Botu',
        summary: `3 saatlik otomatik XML senkronizasyonu tamamlandı (${tenantProducts.length} aktif temiz ürün${newOrdersSaved > 0 ? `, ${newOrdersSaved} yeni sipariş` : ''}).`,
        status: 'success',
        details:
          'Yasaklı kelimeler temizlendi, çoklanan ürünler tekilleştirildi, 0 TL ürünler engellendi ve stok/fiyatlar Trendyol & Hepsiburada ile paralel eşitlendi.',
        createdAt: new Date().toISOString()
      });
    }

    // Yalnızca gerçekte eklenen veya stok/fiyat/statüsü değişen ürünleri Supabase'e yaz (büyük hız kazancı)
    const changedProductIds = db.products
      .filter((p) => beforeFingerprints.get(p.id) !== productFingerprint(p))
      .map((p) => p.id);

    await writeDbAsync(db, {
      onlyProductIds: changedProductIds,
      syncDeletedProducts: anyDeletedFromXml
    });

    const durationMs = Date.now() - startedAtMs;
    return NextResponse.json({
      ok: true,
      schedule: '0 */3 * * * (Supabase pg_cron — Her 3 Saatte Bir Dakik)',
      aiComplianceGuard: true,
      changedProductsSaved: changedProductIds.length,
      durationMs,
      executedAt: new Date().toISOString(),
      summary
    });
  } catch (err) {
    console.error('[api/cron/sync error]', err);
    return NextResponse.json(
      { ok: false, message: 'Cron senkronizasyonu sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
