import { Product } from '@/types/sopyo';
import { normalizeColorValue } from '@/lib/category-matcher';

export interface SanitizationResult {
  cleanTitle: string;
  cleanDescriptionHtml: string;
  removedWords: string[];
  isProhibitedProduct: boolean;
  prohibitedReason?: string;
  recommendedTrendyolCategoryId?: number;
  recommendedCategoryReason?: string;
}

/**
 * Trendyol & Hepsiburada Katalog Onay Motoru - Yasaklı Kelime ve İfade Sözlüğü
 * Ürünleri silmek/engellemek yerine başlık ve ürün açıklamalarındaki (descriptionHtml)
 * tüm yasaklı ifadeleri (%100 Orijinal, Yenilebilir, Tüketilebilir, Kama Sutra, Oyun Kartı, Etek Altı, Göğüs Dikleştirici, Erotik vb.)
 * otomatik temizler ve ürünün Trendyol onayından geçmesini sağlar.
 */
const BANNED_PATTERNS: { label: string; regex: RegExp; replacement: string }[] = [
  {
    label: '%100 Orijinal / 100% Orijinal',
    regex: /(?:%\s*100|100\s*%)\s*orijinal(?:dir)?[.,!\s]*/gi,
    replacement: ''
  },
  {
    label: 'Orijinal Ürün İddiası',
    regex: /tüm\s+ürünlerimiz\s+(?:%\s*100|100\s*%)\s*orijinaldir[.,!\s]*/gi,
    replacement: ''
  },
  {
    label: 'Etek Altı',
    regex: /etek\s*alt[ıi]/gi,
    replacement: 'İç Giyim'
  },
  {
    label: 'Göğüs Dikleştirici',
    regex: /g[öo][ğg][üu]s\s*dikle[şs]tirici/gi,
    replacement: 'Göğüs Şekillendirici ve Toparlayıcı'
  },
  {
    label: 'Dikleştirici',
    regex: /\bdikle[şs]tirici\b/gi,
    replacement: 'Toparlayıcı'
  },
  {
    label: 'Erotik',
    regex: /\berotik\b/gi,
    replacement: 'Fantezi'
  },
  {
    label: 'Tüketilebilen / Tüketilebilir',
    regex: /t[üu]ketilebil(?:en|ir)\s*/gi,
    replacement: ''
  },
  {
    label: 'Yenilebilir / Yenilebilen',
    regex: /yenilebil(?:en|ir)\s*/gi,
    replacement: ''
  },
  {
    label: 'Jelibondan Üretilmiştir İfadesi',
    regex: /jelibondan\s+[üu]retilmi[şs]tir\.?/gi,
    replacement: 'Özel tasarım fantezi üründür.'
  },
  {
    label: 'Kama Sutra',
    regex: /kama\s*sutra/gi,
    replacement: ' '
  },
  {
    label: 'Oyun Kartı / İskambil Kağıdı',
    regex: /(?:sexy\s+g[öo]rselli\s+)?oyun\s+kart[ıi]|52\s+adet\s+i[sş]kanb[iİ]l\s+ka[ğg][ıiİ]d[ıiİ]\s+fantez[iİ]\s+poz[iİ]syon\s+g[öo]rsell[iİ]|52\s+ADET\s+İSKANBİL\s+KAĞIDI\s+FANTEZİ\s+POZİSYON\s+GÖRSELLİ/gi,
    replacement: ' Fantezi Aksesuar '
  },
  {
    label: 'Bitişik Fantezi Aksesuar Düzeltmesi',
    regex: /Fantezi\s+Aksesuar(?=[A-ZÇĞİÖŞÜ0-9])/g,
    replacement: 'Fantezi Aksesuar '
  },
  {
    label: 'Alkol Türevi',
    regex: /alkol\s+t[üu]revi(?:\s+i[çc]eren)?\s*/gi,
    replacement: ''
  }
];

/**
 * Başlık ve HTML açıklamadaki yasaklı kelimeleri otomatik temizler, kategori uyumsuzluğunu tespit eder.
 * Hiçbir ürünü bloke etmez; yasaklı kelimeleri hem başlıktan hem açıklamadan silip yayına hazır hale getirir.
 */
export function sanitizeProductContent(params: {
  title: string;
  descriptionHtml: string;
  categoryName?: string;
  categoryTree?: string;
}): SanitizationResult {
  let cleanTitle = params.title || '';
  let cleanDescriptionHtml = params.descriptionHtml || '';
  const removedWords: string[] = [];

  // Yasaklı kelime temizliği (Başlık + Açıklama dahil)
  for (const pat of BANNED_PATTERNS) {
    if (pat.regex.test(cleanTitle) || pat.regex.test(cleanDescriptionHtml)) {
      removedWords.push(pat.label);
      cleanTitle = cleanTitle.replace(pat.regex, pat.replacement);
      cleanDescriptionHtml = cleanDescriptionHtml.replace(pat.regex, pat.replacement);
    }
  }

  // Fazla boşlukları ve bozuk noktalama işaretlerini temizle
  cleanTitle = cleanTitle
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .trim();

  cleanDescriptionHtml = cleanDescriptionHtml
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Akıllı Kategori Doğrulama (179 adet "Kategori Bilgisi Eksik veya Yanlış" hatasını önler)
  let recommendedTrendyolCategoryId: number | undefined;
  let recommendedCategoryReason: string | undefined;
  const lowerTitle = cleanTitle.toLocaleLowerCase('tr-TR');

  if (
    lowerTitle.includes('göğüs ucu') ||
    lowerTitle.includes('gogus ucu') ||
    lowerTitle.includes('meme ucu') ||
    lowerTitle.includes('dekolte band') ||
    lowerTitle.includes('boob tape') ||
    lowerTitle.includes('göğüs band') ||
    lowerTitle.includes('silikon göğüs') ||
    lowerTitle.includes('kırbaç') ||
    lowerTitle.includes('kelepçe') ||
    lowerTitle.includes('ağız topu') ||
    lowerTitle.includes('maske')
  ) {
    recommendedTrendyolCategoryId = 575; // İç Giyim Aksesuarı
    recommendedCategoryReason = 'Aksesuar / Göğüs ucu kapatıcı ürünleri İç Giyim Aksesuarı (575) kategorisine yönlendirildi';
  } else if (
    lowerTitle.includes('vücut çorab') ||
    lowerTitle.includes('jartiyer çorab') ||
    lowerTitle.includes('file çorap')
  ) {
    recommendedTrendyolCategoryId = 3102; // Fantezi Çorap
  } else if (
    (lowerTitle.includes('babydoll') || lowerTitle.includes('baby doll')) &&
    !lowerTitle.includes('büyük beden')
  ) {
    recommendedTrendyolCategoryId = 552; // Babydoll
  } else if (
    lowerTitle.includes('fantezi gecelik') ||
    lowerTitle.includes('tül gecelik') ||
    lowerTitle.includes('dantelli gecelik') ||
    lowerTitle.includes('saten gecelik')
  ) {
    recommendedTrendyolCategoryId = lowerTitle.includes('büyük beden') ? 5327 : 3110;
  } else if (
    lowerTitle.includes('hizmetçi') ||
    lowerTitle.includes('hemşire') ||
    lowerTitle.includes('polis') ||
    lowerTitle.includes('dansöz') ||
    lowerTitle.includes('kostüm')
  ) {
    recommendedTrendyolCategoryId = 3097; // Fantezi Kostüm
  } else if (lowerTitle.includes('jartiyer takım')) {
    recommendedTrendyolCategoryId = 3104; // Fantezi Jartiyer
  }

  return {
    cleanTitle,
    cleanDescriptionHtml,
    removedWords,
    isProhibitedProduct: false,
    recommendedTrendyolCategoryId,
    recommendedCategoryReason
  };
}

/**
 * Çoklanan Ürün Satışı (Aynı ürünü farklı barkodlar ile satışa açma) ihlalini önlemek için
 * normalize edilmiş (Başlık + Ana Renk) anahtarı üretir.
 */
export function buildCanonicalProductSignature(title: string, color?: string): string {
  const normTitle = (title || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
  const resolvedColor = normalizeColorValue(color || '', title)
    .toLocaleLowerCase('tr-TR')
    .trim();
  return `${normTitle}||${resolvedColor}`;
}

/**
 * Katalogdaki tüm ürünleri tarayıp başlık ve açıklamalarındaki yasaklı kelimeleri temizler
 * ve çoklanan (aynı başlık + aynı renk) ürünleri tekilleştirir (her üründen yalnızca 1 adet aktif kalır).
 */
export function sanitizeAndDeduplicateCatalog(products: Product[]): {
  products: Product[];
  sanitizedCount: number;
  prohibitedBlockedCount: number;
  duplicateRemovedCount: number;
  duplicateRemovedSkus: string[];
  sanitizedLog: { stockCode: string; title: string; action: string }[];
} {
  const seenSignatures = new Map<string, Product>();
  const deduplicated: Product[] = [];
  let sanitizedCount = 0;
  let duplicateRemovedCount = 0;
  const duplicateRemovedSkus: string[] = [];
  const sanitizedLog: { stockCode: string; title: string; action: string }[] = [];

  // Önce stok adedi yüksek ve fiyatı geçerli olanları öne al ki canonical olarak en iyi kart seçilsin
  const sorted = [...products].sort((a, b) => {
    const aValid = a.salePrice > 0 && a.netAvailableStock > 0 ? 1 : 0;
    const bValid = b.salePrice > 0 && b.netAvailableStock > 0 ? 1 : 0;
    if (bValid !== aValid) return bValid - aValid;
    return (b.netAvailableStock || 0) - (a.netAvailableStock || 0);
  });

  for (const prod of sorted) {
    const res = sanitizeProductContent({
      title: prod.title,
      descriptionHtml: prod.descriptionHtml,
      categoryName: prod.categoryName,
      categoryTree: prod.categoryTree
    });

    if (res.removedWords.length > 0) {
      sanitizedCount++;
      prod.title = res.cleanTitle;
      prod.descriptionHtml = res.cleanDescriptionHtml;
      sanitizedLog.push({
        stockCode: prod.stockCode,
        title: prod.title,
        action: `Başlık ve açıklamadan yasaklı kelimeler temizlendi: ${res.removedWords.join(', ')}`
      });
    }

    // Daha önce AI İhlal Koruması ile pasife alınmışsa ve fiyatı/stoğu varsa tekrar aktif et
    if (prod.trendyolErrorMessage && prod.trendyolErrorMessage.includes('AI İhlal Koruması')) {
      prod.trendyolErrorMessage = undefined;
      if (prod.salePrice > 0 && prod.netAvailableStock > 0) {
        prod.status = 'active';
        prod.trendyolSyncStatus = 'synced';
      }
    }

    const primaryColor = prod.variants[0]?.color || '';
    const signature = buildCanonicalProductSignature(prod.title, primaryColor);

    if (seenSignatures.has(signature)) {
      duplicateRemovedCount++;
      duplicateRemovedSkus.push(prod.stockCode);
      sanitizedLog.push({
        stockCode: prod.stockCode,
        title: prod.title,
        action: `Çoklanan ürün engellendi (Korunan Kart: ${seenSignatures.get(signature)?.stockCode})`
      });
      continue;
    }

    seenSignatures.set(signature, prod);
    deduplicated.push(prod);
  }

  return {
    products: deduplicated,
    sanitizedCount,
    prohibitedBlockedCount: 0,
    duplicateRemovedCount,
    duplicateRemovedSkus,
    sanitizedLog
  };
}
