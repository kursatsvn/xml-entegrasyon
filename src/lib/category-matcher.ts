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

/**
 * Trendyol Canlı Katalog (Satıcı ID: 1192080) gerçek yaprak (leaf) pimCategoryId ve zorunlu özellik şablonları
 */
export const TRENDYOL_CATEGORY_REQUIRED_ATTRS: Record<
  number,
  { attributeId: number; attributeValueId?: number; customAttributeValue?: string }[]
> = {
  // Babydoll
  552: [
    { attributeId: 348, attributeValueId: 686230 }, // Web Color: Çok Renkli
    { attributeId: 200, attributeValueId: 10619094 }, // Kumaş Tipi: Belirtilmemiş
    { attributeId: 1192, attributeValueId: 10617344 }, // Menşei: TR
    { attributeId: 343, attributeValueId: 4295 }, // Cinsiyet: Kadın / Kız
    { attributeId: 346, attributeValueId: 4292 } // Yaş Grubu: Yetişkin
  ],
  // Gecelik
  553: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Kombinezon & Jüpon & Korse
  555: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4292 }
  ],
  // Jartiyer
  558: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Pijama Takımı
  563: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 },
    { attributeId: 48, attributeValueId: 10591478 }, // Boy: Uzun
    { attributeId: 191, attributeValueId: 10591487 }, // Kol Boyu: Uzun
    { attributeId: 179, attributeValueId: 1256921 } // Kalıp: Regular
  ],
  // Sütyen
  567: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2190 }, // Kumaş Tipi: Dokuma
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // İç Giyim Aksesuarı
  575: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 1256875 }
  ],
  // Atlet
  603: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 },
    { attributeId: 179, attributeValueId: 1256921 }
  ],
  // İç Çamaşırı Takımı
  2144: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 },
    { attributeId: 881, attributeValueId: 998410 } // Ortam: Gündüz / Gece
  ],
  // Sabahlık
  2358: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 179, attributeValueId: 1256921 },
    { attributeId: 48, attributeValueId: 10591478 }
  ],
  // Fantezi Kostüm
  3097: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Fantezi Çorap
  3102: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Fantezi İç Çamaşır Takımı
  3103: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 881, attributeValueId: 10591476 } // Ortam: Lounge/Home
  ],
  // Fantezi Jartiyer
  3104: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 881, attributeValueId: 10591476 }
  ],
  // Fantezi String & Tanga & Külot
  3108: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2190 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Fantezi Sütyen & Büstiyer
  3109: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2190 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Fantezi Gecelik & Fantezi Elbise
  3110: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Büyük Beden Pijama Takımı
  3610: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2189 }, // Kumaş Tipi: Örme
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4292 },
    { attributeId: 48, attributeValueId: 997239 }, // Boy: Uzun
    { attributeId: 179, attributeValueId: 2043 }, // Kalıp: Büyük Beden
    { attributeId: 33, attributeValueId: 1011 } // Desen: Düz
  ],
  // Fantezi Ürünleri
  5241: [
    { attributeId: 1192, attributeValueId: 10617344 }
  ],
  // Büyük Beden Gecelik
  5310: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2189 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Büyük Beden İç Çamaşırı Takımı
  5323: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2190 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4293 }
  ],
  // Büyük Beden Babydoll
  5324: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 10619094 },
    { attributeId: 1192, attributeValueId: 10617344 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 346, attributeValueId: 4292 }
  ],
  // Büyük Beden Fantezi Gecelik
  5327: [
    { attributeId: 348, attributeValueId: 686230 },
    { attributeId: 200, attributeValueId: 2190 },
    { attributeId: 1192, attributeValueId: 10617344 }
  ]
};

/**
 * Trendyol Beden (attributeId: 338) gerçek attributeValueId haritası
 */
const TRENDYOL_SIZE_VALUE_ID_MAP: Record<string, number> = {
  '36': 5613,
  '38': 5688,
  '40': 7067,
  '42': 5864,
  '44': 5921,
  '46': 5993,
  '48': 7069,
  '50': 7074,
  '52': 5764,
  '75': 6453,
  '80': 6501,
  '85': 6608,
  '90': 6649,
  '95': 6676,
  '100': 7025,
  '105': 4499,
  XS: 6964,
  S: 3961,
  M: 3960,
  L: 3959,
  XL: 3962,
  XXL: 5367,
  '2XL': 5367,
  XXXL: 5764,
  '3XL': 5764,
  '4XL': 6104,
  '5XL': 6287,
  'S/M': 7117,
  'S-M': 7117,
  'L/XL': 7112,
  'L-XL': 7112,
  'M/L': 6801,
  'XL/XXL': 6940,
  'XL-XXL': 6940,
  'XL/2XL': 6940,
  'XXL/XXXL': 5370,
  '2XL/3XL': 5370,
  '3XL/4XL': 13097,
  '3XL-4XL': 415907,
  'ST XL/XXXL': 6949,
  'M - 38': 3960,
  'L - 40': 3959,
  STANDART: 144271,
  STD: 144271,
  'STANDART (S-M-L)': 144271,
  '75B': 6462,
  '80B': 6572,
  '85B': 6616,
  '90B': 6661,
  '95B': 6683,
  '100B': 4470,
  '105B': 4503,
  '110B': 4535,
  '115B': 4546,
  '75C': 6463,
  '80C': 7254,
  '85C': 6617,
  '90C': 6662,
  '95C': 6684,
  '100C': 4471,
  '75D': 6464,
  '80D': 6574,
  '85D': 6618,
  '90D': 6663,
  '95D': 6685,
  '100D': 4472,
  '75E': 6466,
  '80E': 6576,
  '85E': 6620,
  '90E': 6665,
  '95E': 6687,
  '100E': 4473,
  '80F': 6577,
  '85F': 6621,
  '90F': 6666,
  '95F': 6688,
  '100F': 4474,
  '75DD': 6465,
  '80DD': 6575,
  '85DD': 6619,
  '90DD': 6664,
  '95DD': 6686
};

export function resolveTrendyolBedenValueId(rawSize?: string): number {
  const cleaned = (rawSize || '').trim().toUpperCase();
  if (!cleaned) return 144271; // Standart
  if (TRENDYOL_SIZE_VALUE_ID_MAP[cleaned]) {
    return TRENDYOL_SIZE_VALUE_ID_MAP[cleaned];
  }
  return 144271; // Standart
}

export function resolveTrendyolBrandId(brandName?: string, mappedId?: number): number {
  const lower = (brandName || '').trim().toLocaleLowerCase('tr-TR');
  if (lower.includes('monamise') || lower.includes('monamıse')) return 7990;
  if (lower.includes('tegan')) return 1741014;
  if (lower.includes('aesco')) return 2777249;
  if (lower.includes('normal tekstil')) return 2528416;
  if (lower.includes('aria')) return 995293;
  // Eski geçersiz placeholder ID'leri (1845920, 1791) gerçek Aria's Closet (995293) ID'sine çevir
  if (mappedId && mappedId !== 1845920 && mappedId !== 1791) return mappedId;
  return 995293; // Aria's Closet
}

export const MARKETPLACE_CATEGORY_CATALOG: MarketplaceCategoryOption[] = [
  {
    trendyolId: 5324,
    trendyolName: 'Giyim > İç Giyim > Büyük Beden > Büyük Beden Babydoll',
    hepsiburadaId: 'HB-60000682',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Babydoll',
    keywords: ['büyük beden babydoll'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dantel / Saten', required: true }
      ]
    }
  },
  {
    trendyolId: 552,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Babydoll',
    hepsiburadaId: 'HB-60000682',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Babydoll',
    keywords: ['babydoll'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dantel / Saten', required: true }
      ]
    }
  },
  {
    trendyolId: 5327,
    trendyolName: 'Giyim > İç Giyim > Büyük Beden > Büyük Beden Fantezi Gecelik',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
    keywords: ['büyük beden fantezi', 'büyük beden fantazi'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dokuma', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 5310,
    trendyolName: 'Giyim > İç Giyim > Büyük Beden > Büyük Beden Gecelik',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
    keywords: ['büyük beden kadın gecelik', 'büyük beden gecelik', 'büyük beden elbise'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Örme', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 3610,
    trendyolName: 'Giyim > İç Giyim > Büyük Beden > Büyük Beden Pijama Takımı',
    hepsiburadaId: 'HB-60000678',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
    keywords: ['büyük beden kadın pijama', 'büyük beden 2\'li saten', 'büyük beden ev giyim'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kalıp', mappedValue: 'Büyük Beden', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 3110,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Gecelik',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Gecelik',
    keywords: ['fantezi tül gecelik', 'fantazi elbise', 'fantezi gecelik', 'elbise', 'tulum elbise'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 2358,
    trendyolName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Sabahlık',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Sabahlık',
    keywords: ['sabahlık'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Kalıp', mappedValue: 'Regular', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 553,
    trendyolName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Gecelik',
    hepsiburadaId: 'HB-60000680',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
    keywords: ['gecelik', 'saten gecelik', 'hamile & lohusa', 'hamile / lohusa'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Desen', mappedValue: 'Düz / Dantelli', required: true }
      ]
    }
  },
  {
    trendyolId: 3104,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Jartiyer',
    hepsiburadaId: 'HB-60000684',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Jartiyer Takım',
    keywords: ['jartiyer'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Ortam', mappedValue: 'Lounge/Home', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Parça Sayısı', mappedValue: '2 Parça', required: false }
      ]
    }
  },
  {
    trendyolId: 563,
    trendyolName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
    hepsiburadaId: 'HB-60000678',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
    keywords: [
      'pijama',
      'şortlu takım',
      'saten takım',
      'ev giyim',
      'uzun kol takım',
      'alt üst takımlar',
      'monamise',
      'monamıse'
    ],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kalıp', mappedValue: 'Regular', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true },
        { attributeName: 'Mevsim', mappedValue: '4 Mevsim', required: true }
      ]
    }
  },
  {
    trendyolId: 3097,
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
    trendyolId: 3102,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Çorap',
    hepsiburadaId: 'HB-60000688',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Body & Vücut Çorabı',
    keywords: ['vücut çorabı', 'çorap çeşitleri', 'çorap'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 3103,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi İç Çamaşır Takımı',
    hepsiburadaId: 'HB-60000688',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi İç Çamaşır Takımı',
    keywords: ['fantezi body', 'deri & harness', 'fantazi iç giyim', 'sütyen & külot', 'kadın body'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Kumaş Tipi', mappedValue: 'Belirtilmemiş', required: true },
        { attributeName: 'Ortam', mappedValue: 'Lounge/Home', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 3109,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Sütyen',
    hepsiburadaId: 'HB-60000672',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Sütyen & Büstiyer',
    keywords: ['fantezi büstiyer', 'bralet & büstiyer', 'büstiyer'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dokuma', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 567,
    trendyolName: 'Giyim > İç Giyim > Sütyen',
    hepsiburadaId: 'HB-60000672',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Sütyen',
    keywords: ['desteksiz sütyen', 'destekli sütyen', 'emzirme sütyeni', 'toparlayıcı sütyen', 'straplez sütyen', 'sütyen'],
    defaultAttributes: {
      trendyol: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Kumaş Tipi', mappedValue: 'Dokuma', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburada: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }
      ]
    }
  },
  {
    trendyolId: 3108,
    trendyolName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi String',
    hepsiburadaId: 'HB-60000674',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Külot & String',
    keywords: ['külot', 'tanga', 'string', 'g-string', 'boxer', 'bokser'],
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
    trendyolId: 555,
    trendyolName: 'Giyim > İç Giyim > Kombinezon & Korse',
    hepsiburadaId: 'HB-60000676',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Korse & Kombinezon',
    keywords: ['korse', 'toparlayıcı', 'terletici', 'jupon', 'kombinezon', 'tayt'],
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
    trendyolId: 603,
    trendyolName: 'Giyim > İç Giyim > Atlet',
    hepsiburadaId: 'HB-60000672',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Atlet',
    keywords: ['atlet', 'termal'],
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
    trendyolId: 575,
    trendyolName: 'Giyim > İç Giyim > İç Giyim Aksesuarı',
    hepsiburadaId: 'HB-60000692',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Aksesuar',
    keywords: ['aksesuar', 'maske', 'kelepçe'],
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
    trendyolId: 2144,
    trendyolName: 'Giyim > İç Giyim > İç Çamaşırı Takımı',
    hepsiburadaId: 'HB-60000672',
    hepsiburadaName: 'Moda > Kadın > İç Giyim > İç Çamaşırı Takımı',
    keywords: ['iç giyim', 'takım'],
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
  const leafNorm = (categoryName || '').toLocaleLowerCase('tr-TR');
  for (const option of MARKETPLACE_CATEGORY_CATALOG) {
    if (option.keywords.some((kw) => leafNorm.includes(kw.toLocaleLowerCase('tr-TR')))) {
      return option;
    }
  }
  const combined = `${categoryName} ${xmlCategoryTree}`.toLocaleLowerCase('tr-TR');
  for (const option of MARKETPLACE_CATEGORY_CATALOG) {
    if (option.keywords.some((kw) => combined.includes(kw.toLocaleLowerCase('tr-TR')))) {
      return option;
    }
  }
  // Varsayılan yaprak kategori: Fantezi İç Çamaşır Takımı (3103)
  return MARKETPLACE_CATEGORY_CATALOG.find((c) => c.trendyolId === 3103) || MARKETPLACE_CATEGORY_CATALOG[0];
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
