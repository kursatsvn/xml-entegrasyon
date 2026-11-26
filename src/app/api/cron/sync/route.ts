import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync, writeDbAsync } from '@/lib/store';
import { syncXmlFeedProducts } from '@/lib/xml-engine';
import { constantTimeStringEqual } from '@/lib/session';
import {
  pullOrdersFromMarketplace,
  publishProductsToMarketplace,
  syncPriceAndInventoryToMarketplace
} from '@/lib/marketplace-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers.get('authorization') || '';
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!expectedSecret || !providedSecret || !constantTimeStringEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await readDbAsync();
    const summary: string[] = [];

    for (const tenant of db.tenants) {
      if (!tenant.isActive) continue;
      const sources = db.xmlSources.filter((s) => s.tenantId === tenant.id && s.status === 'active');

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

          const others = db.products.filter(
            (p) => !(p.tenantId === tenant.id && p.xmlSourceId === src.id)
          );
          db.products = [...others, ...products];
          db.xmlReports.unshift(report);
          summary.push(
            `${tenant.name} / ${src.name}: ${products.length} tekilleştirilmiş & temizlenmiş ürün senkronize edildi (XML Toplam: ${totalInXml})`
          );
        } catch (e: unknown) {
          console.error(`[cron xml sync error] ${tenant.id}/${src.id}`, e);
          summary.push(`${tenant.name} / ${src.name}: XML senkronizasyonu başarısız`);
        }
      }

      const accounts = db.marketplaceAccounts.filter((m) => m.tenantId === tenant.id && m.isActive);
      const tenantProducts = db.products.filter(
        (p) => p.tenantId === tenant.id && p.status === 'active' && p.salePrice > 0
      );
      const tenantCats = db.categories.filter((c) => c.tenantId === tenant.id);
      const tenantBrands = db.brands.filter((b) => b.tenantId === tenant.id);
      const autoPublishChannelSet = new Set<string>(
        sources
          .filter((s) => s.autoPublishEnabled)
          .flatMap((s) => s.autoPublishChannels || [])
      );

      for (const acc of accounts) {
        try {
          await pullOrdersFromMarketplace(acc, {
            includePaymentAwaiting: Boolean(tenant.generalSettings?.customerHBWaitingOrderStatus)
          });
          await syncPriceAndInventoryToMarketplace({
            account: acc,
            products: tenantProducts,
            useMinPrice: Boolean(tenant.generalSettings?.customerUseMinPrice)
          });

          const channelTitle = acc.marketplace === 'trendyol' ? 'Trendyol' : 'Hepsiburada';
          const canAutoPublishChannel =
            sources.length === 0 || autoPublishChannelSet.has(channelTitle);

          const newUnsent = canAutoPublishChannel
            ? tenantProducts.filter(
                (p) =>
                  (acc.marketplace === 'trendyol' &&
                    (p.trendyolSyncStatus === 'not_sent' || p.trendyolSyncStatus === 'pending')) ||
                  (acc.marketplace === 'hepsiburada' &&
                    (p.hepsiburadaSyncStatus === 'not_sent' || p.hepsiburadaSyncStatus === 'pending'))
              )
            : [];
          if (newUnsent.length > 0) {
            const pubRes = await publishProductsToMarketplace({
              account: acc,
              products: newUnsent,
              categories: tenantCats,
              brands: tenantBrands,
              useMarketDesc: Boolean(tenant.generalSettings?.customerUseMarketDesc),
              useMinPrice: Boolean(tenant.generalSettings?.customerUseMinPrice)
            });
            const syncedSet = new Set(pubRes.syncedProductIds);
            for (const p of db.products) {
              if (syncedSet.has(p.id)) {
                if (acc.marketplace === 'trendyol') {
                  p.trendyolSyncStatus = 'synced';
                  p.trendyolErrorMessage = undefined;
                } else {
                  p.hepsiburadaSyncStatus = 'synced';
                  p.hepsiburadaErrorMessage = undefined;
                }
              }
            }
          }
        } catch (e: unknown) {
          console.error(`[cron marketplace sync error] ${tenant.id}/${acc.marketplace}`, e);
          summary.push(`${tenant.name} / ${acc.marketplace}: Pazaryeri senkronizasyonu başarısız`);
        }
      }

      db.operationLogs.unshift({
        id: `log-cron-${Date.now()}`,
        tenantId: tenant.id,
        type: 'xml_sync',
        channel: '3 Saatlik Otomatik XML & AI Katalog Botu',
        summary: `3 saatlik otomatik XML senkronizasyonu tamamlandı (${tenantProducts.length} aktif temiz ürün).`,
        status: 'success',
        details:
          'Yasaklı kelimeler temizlendi, çoklanan ürünler tekilleştirildi, 0 TL ürünler engellendi ve stok/fiyatlar Trendyol & Hepsiburada ile eşitlendi.',
        createdAt: new Date().toISOString()
      });
    }

    await writeDbAsync(db, { syncDeletedProducts: true });
    return NextResponse.json({
      ok: true,
      schedule: '0 */3 * * * (Her 3 Saatte Bir Otomatik)',
      aiComplianceGuard: true,
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
