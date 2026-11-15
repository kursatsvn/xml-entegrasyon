import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/store';
import { syncXmlFeedProducts } from '@/lib/xml-engine';
import { pullOrdersFromMarketplace, syncPriceAndInventoryToMarketplace } from '@/lib/marketplace-api';

export async function GET() {
  const db = readDb();
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
          limit: 200
        });
        src.totalProductCount = totalInXml;
        src.totalVariantCount = totalVariantsInXml;
        src.lastCheckedAt = new Date().toISOString();

        const others = db.products.filter(
          (p) => !(p.tenantId === tenant.id && p.xmlSourceId === src.id)
        );
        db.products = [...others, ...products];
        db.xmlReports.unshift(report);
        summary.push(`${tenant.name} / ${src.name}: ${products.length} ürün senkronize edildi`);
      } catch (e: any) {
        summary.push(`${tenant.name} / ${src.name} hata: ${e?.message}`);
      }
    }

    const accounts = db.marketplaceAccounts.filter((m) => m.tenantId === tenant.id && m.isActive);
    const tenantProducts = db.products.filter((p) => p.tenantId === tenant.id);
    for (const acc of accounts) {
      await pullOrdersFromMarketplace(acc);
      await syncPriceAndInventoryToMarketplace({ account: acc, products: tenantProducts });
    }
  }

  writeDb(db);
  return NextResponse.json({
    ok: true,
    executedAt: new Date().toISOString(),
    summary
  });
}
