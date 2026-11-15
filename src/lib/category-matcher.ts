import { CategoryMapping } from '@/types/sopyo';

export interface MarketplaceCategoryOption {
  trendyolId: number;
  trendyolName: string;
  hepsiburadaId: string;
  hepsiburadaName: string;
  keywords: string[];
  defaultAttributes: {
    trendyol: { attributeName: string; mappedValue: string; required: boolean }[];
    hepsiburada: { attributeName: string; mappedValue: string; required: boolean }[];
  };
}

export const MARKETPLACE_CATEGORY_CATALOG: MarketplaceCategoryOption[] = [
  {
    trendyolId: 1042,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Babydoll',
    hepsiburadaId: 'HB-60000682',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Babydoll',
    keywords: ['babydoll'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dokuma / Dantel', required: false },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dantel / Saten', required: true }
      ]
    }
  },
  {
    trendyolId: 1045,
    trendyolName: 'Giyim > İç Giyim > Gecelik',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
    keywords: ['gecelik', 'saten gecelik', 'tül gecelik', 'sabahlık'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kalıp', mappedValue: 'Regular', required: false },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Desen', mappedValue: 'Düz / Dantelli', required: true }
      ]
    }
  },
  {
    trendyolId: 1048,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Jartiyer Takım',
    hepsiburadaId: 'HB-60000684',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Jartiyer Takım',
    keywords: ['jartiyer'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Parça Sayısı', mappedValue: '2 Parça', required: false }
      ]
    }
  },
  {
    trendyolId: 1051,
    trendyolName: 'Giyim > İç Giyim > Pijama Takımı',
    hepsiburadaId: 'HB-60000678',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
    keywords: ['pijama', 'şortlu takım', 'saten takım', 'ev giyim', 'uzun kol takım', 't-shirt takım'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Paça Tipi', mappedValue: 'Normal Paça', required: false },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Mevsim', mappedValue: '4 Mevsim', required: true }
      ]
    }
  },
  {
    trendyolId: 1054,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Kostüm',
    hepsiburadaId: 'HB-60000686',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Kostüm',
    keywords: ['kostüm', 'fantazi kostüm', 'hizmetçi', 'hemşire', 'dansöz'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1057,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Body & Tulum',
    hepsiburadaId: 'HB-60000688',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Body & Vücut Çorabı',
    keywords: ['body', 'bodysuit', 'vücut çorabı', 'harness', 'deri'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1060,
    trendyolName: 'Giyim > İç Giyim > Sütyen & İç Çamaşırı Takımı',
    hepsiburadaId: 'HB-60000672',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Sütyen & İç Çamaşırı Takımı',
    keywords: ['sütyen', 'büstiyer', 'bralet', 'takım', 'iç giyim'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kap', mappedValue: 'Standart', required: false },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1063,
    trendyolName: 'Giyim > İç Giyim > Külot & Tanga & String',
    hepsiburadaId: 'HB-60000674',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Külot & String',
    keywords: ['külot', 'tanga', 'string', 'g-string', 'boxer'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1066,
    trendyolName: 'Giyim > İç Giyim > Korse',
    hepsiburadaId: 'HB-60000676',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Korse',
    keywords: ['korse', 'toparlayıcı', 'terletici'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1069,
    trendyolName: 'Giyim > Kadın > Elbise > Abiye & Parti Elbisesi',
    hepsiburadaId: 'HB-60000690',
    hepsiburadaName: 'Moda > Kadın > Giyim > Elbise',
    keywords: ['elbise', 'fantazi elbise', 'mini elbise'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Boy', mappedValue: 'Mini', required: false },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 1072,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Aksesuar',
    hepsiburadaId: 'HB-60000692',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Aksesuar',
    keywords: ['aksesuar', 'maske', 'kelepçe', 'çorap', 'monamise', 'arias closet'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  }
];

export function autoMatchCategory(
  categoryName: string,
  xmlCategoryTree: string
): MarketplaceCategoryOption {
  const combined = `${categoryName} ${xmlCategoryTree}`.toLocaleLowerCase('tr-TR');
  for (const option of MARKETPLACE_CATEGORY_CATALOG) {
    if (option.keywords.some((kw) => combined.includes(kw.toLocaleLowerCase('tr-TR')))) {
      return option;
    }
  }
  return MARKETPLACE_CATEGORY_CATALOG[5]; // Varsayılan İç Giyim / Fantezi Giyim
}

const KNOWN_COLORS = [
  'Siyah',
  'Beyaz',
  'Kırmızı',
  'Bordo',
  'Pembe',
  'Fuşya',
  'Mürdüm',
  'Mor',
  'Lila',
  'Mavi',
  'Lacivert',
  'Turkuaz',
  'Yeşil',
  'Zümrüt',
  'Sarı',
  'Altın',
  'Gümüş',
  'Turuncu',
  'Kahverengi',
  'Bej',
  'Ekru',
  'Krem',
  'Vizon',
  'Ten',
  'Gri',
  'Antrasit',
  'Leopar'
];

/**
 * Trendyol ve Hepsiburada'da "Görsel" veya boş renk hatasını önleyen akıllı renk çözümleyici
 */
export function normalizeColorValue(rawColor: string, productTitle = ''): string {
  const cleaned = (rawColor || '').trim();
  if (
    cleaned &&
    cleaned.toLocaleLowerCase('tr-TR') !== 'görsel' &&
    cleaned.toLocaleLowerCase('tr-TR') !== 'gorsel' &&
    cleaned.toLocaleLowerCase('tr-TR') !== 'standart'
  ) {
    return cleaned.charAt(0).toLocaleUpperCase('tr-TR') + cleaned.slice(1).toLocaleLowerCase('tr-TR');
  }

  const lowerTitle = (productTitle || '').toLocaleLowerCase('tr-TR');
  for (const color of KNOWN_COLORS) {
    if (lowerTitle.includes(color.toLocaleLowerCase('tr-TR'))) {
      return color;
    }
  }

  return 'Çok Renkli';
}

export function normalizeSizeValue(rawSize: string): string {
  const cleaned = (rawSize || '').trim();
  if (!cleaned) return 'Standart';
  return cleaned.toUpperCase();
}

export function enrichCategoryMappingWithAutoMatch(cat: CategoryMapping): CategoryMapping {
  const match = autoMatchCategory(cat.name, cat.xmlCategoryTree);
  return {
    ...cat,
    trendyolCategoryId: match.trendyolId,
    trendyolCategoryName: match.trendyolName,
    trendyolStatus: 'mapped',
    trendyolAttributes: match.defaultAttributes.trendyol,
    hepsiburadaCategoryId: match.hepsiburadaId,
    hepsiburadaCategoryName: match.hepsiburadaName,
    hepsiburadaStatus: 'mapped',
    hepsiburadaAttributes: match.defaultAttributes.hepsiburada
  };
}
