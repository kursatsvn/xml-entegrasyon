import { MarketplaceAccount } from '@/types/sopyo';
import { hepsiburadaFetch } from '@/lib/hepsiburada-client';

export interface HepsiburadaLeafCategory {
  categoryId: number;
  name: string;
  displayName: string;
  paths: string[];
  leaf: boolean;
  status: string;
  available: boolean;
}

export interface HepsiburadaCategoryAttribute {
  id: string;
  name: string;
  mandatory: boolean;
  type: string;
  multiValue: boolean;
  isVariant: boolean;
  isBase: boolean;
}

export interface HepsiburadaAttributeValue {
  id: string;
  value: string;
}

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika
const categoryCache = new Map<string, CacheEntry<HepsiburadaLeafCategory[]>>();
const attributeCache = new Map<string, CacheEntry<HepsiburadaCategoryAttribute[]>>();

function normalizeTr(text: string): string {
  return (text || '').toLocaleLowerCase('tr-TR').trim();
}

/**
 * Hepsiburada MPOP üzerinden aktif yaprak (leaf) kategorileri çeker ve önbellekler.
 */
export async function fetchHepsiburadaLeafCategories(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret' | 'environment'>,
  options?: { forceRefresh?: boolean; maxPages?: number }
): Promise<{ ok: boolean; categories: HepsiburadaLeafCategory[]; message?: string }> {
  const cacheKey = `${account.environment || 'production'}:${account.supplierOrMerchantId}`;
  const cached = categoryCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { ok: true, categories: cached.data };
  }

  const maxPages = options?.maxPages ?? 8;
  const collected: HepsiburadaLeafCategory[] = [];

  for (let page = 0; page < maxPages; page++) {
    const res = await hepsiburadaFetch<any>(
      account,
      'mpop',
      `/product/api/categories/get-all-categories?leaf=true&status=ACTIVE&available=true&page=${page}&size=1000&version=1`,
      { timeoutMs: 12000 }
    );

    if (!res.ok) {
      if (collected.length > 0) break;
      return { ok: false, categories: [], message: res.errorMessage };
    }

    const rawList: any[] = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];

    for (const c of rawList) {
      const catId = Number(c.categoryId || c.id || 0);
      if (!catId) continue;
      const paths: string[] = Array.isArray(c.paths)
        ? c.paths.map((p: unknown) => String(p))
        : [];
      const name = String(c.name || c.displayName || paths[paths.length - 1] || '');
      collected.push({
        categoryId: catId,
        name,
        displayName: paths.length > 0 ? paths.join(' > ') : String(c.displayName || name),
        paths,
        leaf: c.leaf !== false,
        status: String(c.status || 'ACTIVE'),
        available: c.available !== false
      });
    }

    const totalPages = Number(res.data?.totalPages || 0);
    if (rawList.length < 1000 || (totalPages > 0 && page + 1 >= totalPages)) {
      break;
    }
  }

  if (collected.length > 0) {
    categoryCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: collected
    });
  }

  return { ok: true, categories: collected };
}

/**
 * Hepsiburada yaprak kategorileri içinde Türkçe anahtar kelime araması yapar.
 */
export async function searchHepsiburadaCategories(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret' | 'environment'>,
  query: string,
  limit = 40
): Promise<{ ok: boolean; categories: HepsiburadaLeafCategory[]; totalCached: number; message?: string }> {
  const result = await fetchHepsiburadaLeafCategories(account);
  if (!result.ok) {
    return { ok: false, categories: [], totalCached: 0, message: result.message };
  }

  const q = normalizeTr(query);
  if (!q) {
    return {
      ok: true,
      categories: result.categories.slice(0, limit),
      totalCached: result.categories.length
    };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = result.categories
    .map((cat) => {
      const hay = normalizeTr(`${cat.categoryId} ${cat.name} ${cat.displayName}`);
      if (!tokens.every((t) => hay.includes(t))) return null;
      let score = 1;
      const nameNorm = normalizeTr(cat.name);
      if (nameNorm === q) score += 20;
      else if (nameNorm.includes(q)) score += 10;
      if (String(cat.categoryId) === q) score += 50;
      return { cat, score };
    })
    .filter((x): x is { cat: HepsiburadaLeafCategory; score: number } => Boolean(x))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.cat);

  return {
    ok: true,
    categories: scored,
    totalCached: result.categories.length
  };
}

/**
 * Belirli bir Hepsiburada yaprak kategorisinin base, zorunlu ve varyant özelliklerini çeker.
 */
export async function fetchHepsiburadaCategoryAttributes(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret' | 'environment'>,
  categoryId: number,
  options?: { forceRefresh?: boolean }
): Promise<{ ok: boolean; attributes: HepsiburadaCategoryAttribute[]; message?: string }> {
  const cacheKey = `${account.environment || 'production'}:${categoryId}`;
  const cached = attributeCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { ok: true, attributes: cached.data };
  }

  const res = await hepsiburadaFetch<any>(
    account,
    'mpop',
    `/product/api/categories/${categoryId}/attributes?version=2`,
    { timeoutMs: 12000 }
  );

  if (!res.ok) {
    return { ok: false, attributes: [], message: res.errorMessage };
  }

  const payload = res.data?.data || res.data || {};
  const mapGroup = (
    list: unknown,
    flags: { isVariant: boolean; isBase: boolean }
  ): HepsiburadaCategoryAttribute[] => {
    if (!Array.isArray(list)) return [];
    return list
      .map((a: any) => ({
        id: String(a.id || a.attributeId || a.name || '').trim(),
        name: String(a.name || a.id || '').trim(),
        mandatory: Boolean(a.mandatory),
        type: String(a.type || 'string'),
        multiValue: Boolean(a.multiValue),
        isVariant: flags.isVariant,
        isBase: flags.isBase
      }))
      .filter((a) => Boolean(a.id));
  };

  const attributes: HepsiburadaCategoryAttribute[] = [
    ...mapGroup(payload.baseAttributes, { isVariant: false, isBase: true }),
    ...mapGroup(payload.attributes, { isVariant: false, isBase: false }),
    ...mapGroup(payload.variantAttributes, { isVariant: true, isBase: false })
  ];

  attributeCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: attributes
  });

  return { ok: true, attributes };
}

/**
 * Enum tipindeki bir Hepsiburada kategori özelliği için kabul edilen değerleri çeker.
 */
export async function fetchHepsiburadaAttributeValues(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret' | 'environment'>,
  categoryId: number,
  attributeId: string
): Promise<{ ok: boolean; values: HepsiburadaAttributeValue[]; message?: string }> {
  const res = await hepsiburadaFetch<any>(
    account,
    'mpop',
    `/product/api/categories/${categoryId}/attribute/${encodeURIComponent(attributeId)}/values?version=5&page=0&size=500`,
    { timeoutMs: 10000 }
  );

  if (!res.ok) {
    return { ok: false, values: [], message: res.errorMessage };
  }

  const rawList: any[] = Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
    ? res.data
    : [];

  return {
    ok: true,
    values: rawList
      .map((v: any) => ({
        id: String(v.id || v.value || ''),
        value: String(v.value || v.name || '')
      }))
      .filter((v) => Boolean(v.value))
  };
}

/**
 * XML kategori adına göre canlı Hepsiburada yaprak kategorileri arasından en iyi eşleşmeyi bulur.
 */
export function findBestHepsiburadaCategoryMatch(
  xmlCategoryName: string,
  xmlCategoryTree: string,
  leafCategories: HepsiburadaLeafCategory[]
): HepsiburadaLeafCategory | null {
  if (leafCategories.length === 0) return null;

  const combined = normalizeTr(`${xmlCategoryName} ${xmlCategoryTree}`);
  const nameNorm = normalizeTr(xmlCategoryName);

  // Öncelikli giyim / iç giyim arama ipuçları
  const keywordHints: { match: string[]; target: string[] }[] = [
    { match: ['babydoll'], target: ['babydoll'] },
    { match: ['jartiyer'], target: ['jartiyer'] },
    { match: ['kostüm', 'kostum'], target: ['fantezi kostüm', 'kostüm'] },
    { match: ['vücut çorabı', 'çorap', 'corap'], target: ['vücut çorabı', 'fantezi çorap', 'kadın çorap'] },
    { match: ['pijama', 'şortlu takım', 'ev giyim'], target: ['pijama takımı', 'pijama'] },
    { match: ['sabahlık', 'sabahlik'], target: ['sabahlık'] },
    { match: ['gecelik', 'elbise'], target: ['fantezi gecelik', 'gecelik'] },
    { match: ['büstiyer', 'bustiyer', 'bralet'], target: ['büstiyer', 'bralet'] },
    { match: ['sütyen', 'sutyen'], target: ['sütyen'] },
    { match: ['külot', 'kulot', 'tanga', 'string', 'boxer'], target: ['string', 'külot'] },
    { match: ['korse', 'kombinezon', 'jupon'], target: ['korse', 'kombinezon'] },
    { match: ['atlet'], target: ['kadın atlet', 'atlet'] },
    { match: ['body', 'takım', 'iç giyim'], target: ['fantezi iç giyim', 'iç çamaşır takımı', 'body'] }
  ];

  let bestCat: HepsiburadaLeafCategory | null = null;
  let bestScore = 0;

  for (const cat of leafCategories) {
    const catName = normalizeTr(cat.name);
    const catPath = normalizeTr(cat.displayName);
    let score = 0;

    if (catName === nameNorm) score += 50;
    else if (catName && nameNorm.includes(catName)) score += 20;
    else if (nameNorm && catName.includes(nameNorm)) score += 18;

    if (catPath.includes('kadın') || catPath.includes('iç giyim') || catPath.includes('giyim')) {
      score += 5;
    }

    for (const hint of keywordHints) {
      if (hint.match.some((m) => combined.includes(m))) {
        if (hint.target.some((t) => catName.includes(t))) {
          score += 35;
        } else if (hint.target.some((t) => catPath.includes(t))) {
          score += 15;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  return bestScore >= 15 ? bestCat : null;
}
