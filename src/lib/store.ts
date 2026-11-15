import fs from 'fs';
import path from 'path';
import {
  BrandMapping,
  CategoryMapping,
  ClaimItem,
  MarketplaceAccount,
  OperationLog,
  Order,
  PriceRobotItem,
  Product,
  SyncBatch,
  TagItem,
  Tenant,
  UserProfile,
  VariantGroupMapping,
  XmlSource,
  XmlSyncReport
} from '@/types/sopyo';

export interface DatabaseState {
  tenants: Tenant[];
  users: UserProfile[];
  marketplaceAccounts: MarketplaceAccount[];
  xmlSources: XmlSource[];
  xmlReports: XmlSyncReport[];
  products: Product[];
  categories: CategoryMapping[];
  brands: BrandMapping[];
  variantGroups: VariantGroupMapping[];
  tags: TagItem[];
  syncBatches: SyncBatch[];
  priceRobotItems: PriceRobotItem[];
  orders: Order[];
  claims: ClaimItem[];
  operationLogs: OperationLog[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'sopyo-db.json');

const LUNEROSE_TENANT_ID = 'tenant-lunerose-47046';
const LUNEROSE_USER_ID = 'user-zeki-47150';
const ARIAS_XML_ID = 'xml-ariasclosetx-10947';

function createInitialSeedData(): DatabaseState {
  const initialTenant: Tenant = {
    id: LUNEROSE_TENANT_ID,
    name: 'LuneRose',
    slug: 'lunerose',
    plan: 'professional',
    licenseExpiresAt: '2027-12-31T23:59:59Z',
    isActive: true,
    maxXmlSources: 10,
    maxProducts: 50000,
    companyPhone: '0(545) 146 11 58',
    companyEmail: 'zekihamdicinarr@gmail.com',
    companyAddress: 'Enver Özdemir caddesi no 15, Merkez Mah.',
    companyWebsite: 'https://www.lunerose.com',
    defaultVatRate: 10,
    maskInvoiceProductNames: true,
    defaultMaskedProductName: 'Tekstil & Ev Giyim Ürünü',
    cargoLabelTemplate: 'single',
    cargoLabelShowStock: false,
    cargoLabelShowProducts: true,
    cargoLabelShowPrice: true,
    cargoLabelShowSku: true,
    cargoLabelFontSize: 7.7,
    trendyolInvoiceNote:
      'İş bu fatura tutarı DSM Grup Danışmanlık İletişim ve Satış Tic.A.Ş hesabına devredilmiştir.',
    hepsiburadaInvoiceNote:
      'İş bu fatura tutarı D-Market Elektronik Hiz. ve Tic. A.Ş. hesabına devredilmiştir.',
    createdAt: '2026-01-15T10:00:00Z'
  };

  const initialUser: UserProfile = {
    id: LUNEROSE_USER_ID,
    tenantId: LUNEROSE_TENANT_ID,
    email: process.env.ADMIN_INITIAL_EMAIL || 'zekihamdicinarr@gmail.com',
    fullName: 'Zeki Hamdi Çınar (LuneRose)',
    phone: '0(545) 146 11 58',
    role: 'super_admin',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'admin123',
    isActive: true,
    createdAt: '2026-01-15T10:00:00Z'
  };

  const marketplaceAccounts: MarketplaceAccount[] = [
    {
      id: 'mkt-ty-lunerose',
      tenantId: LUNEROSE_TENANT_ID,
      marketplace: 'trendyol',
      storeName: 'LuneRose',
      supplierOrMerchantId: process.env.TRENDYOL_SUPPLIER_ID || '1192080',
      apiKey: process.env.TRENDYOL_API_KEY || '',
      apiSecret: process.env.TRENDYOL_API_SECRET || '',
      isActive: true,
      autoConfirmOrders: false,
      shipmentProviderId: '7',
      shipmentProviderName: 'Aras Kargo Marketplace',
      shipmentAddressId: '7853340',
      shipmentAddressText: 'Enver Özdemir caddesi no 15',
      returningAddressId: '7853341',
      returningAddressText: 'Merkez Mah. Enver Özdemir Cad. No 15',
      dispatchTimeHours: 24,
      hbOrderPullStatus: 'ready_to_ship',
      stockCodeType: 'modelCode',
      descriptionPrefixHtml: '',
      descriptionSuffixHtml: '',
      lastTestedAt: '2026-11-15T12:03:00Z',
      connectionStatus: 'connected'
    },
    {
      id: 'mkt-hb-lunerose',
      tenantId: LUNEROSE_TENANT_ID,
      marketplace: 'hepsiburada',
      storeName: 'LuneRose',
      supplierOrMerchantId: process.env.HEPSIBURADA_MERCHANT_ID || 'fea9499f-fc24-4c45-bbcc-e367e7896bd7',
      apiKey: process.env.HEPSIBURADA_INTEGRATOR || 'kodanka_dev',
      apiSecret: process.env.HEPSIBURADA_SERVICE_KEY || '',
      isActive: true,
      autoConfirmOrders: false,
      shipmentProviderId: '7',
      shipmentProviderName: 'HepsiJet / Aras Kargo',
      shipmentAddressId: '',
      shipmentAddressText: 'Enver Özdemir caddesi no 15',
      returningAddressId: '',
      returningAddressText: 'Merkez Mah. Enver Özdemir Cad. No 15',
      dispatchTimeHours: 24,
      hbOrderPullStatus: 'ready_to_ship',
      stockCodeType: 'modelCode',
      descriptionPrefixHtml: '',
      descriptionSuffixHtml: '',
      lastTestedAt: '2026-11-15T12:03:00Z',
      connectionStatus: 'connected'
    }
  ];

  const xmlSources: XmlSource[] = [
    {
      id: ARIAS_XML_ID,
      tenantId: LUNEROSE_TENANT_ID,
      xmlIdNumber: 10947,
      name: 'ariasclosetx',
      url:
        process.env.ARIASCLOSET_XML_URL ||
        'https://www.ariasclosetx.com/TicimaxXmlV2/YOUR_XML_TOKEN/',
      providerType: 'ticimax',
      extraNotes: 'Ticimax V2 standart XML kaynağı (Aria\'s Closet)',
      stockCodePrefix: 'AX',
      generateBarcode: true,
      disableStockSync: false,
      disablePriceSync: false,
      disableNewProducts: false,
      criticalStockEnabled: true,
      criticalStockAmount: 3,
      autoPublishEnabled: true,
      autoPublishChannels: ['Trendyol', 'Hepsiburada'],
      salePriceTag: 'SatisFiyati',
      buyingPriceTag: 'SatisFiyati',
      marketPriceTag: 'IndirimliFiyat',
      taxIncludedMode: 0,
      fixedTaxRate: 10,
      useCurrencyConversion: false,
      priceRoundEnabled: false,
      priceRoundType: 'x9',
      priceRoundWay: 'round',
      priceRuleType: 3,
      fixedPriceRule: {
        ruleMinPrice: 0,
        ruleMaxPrice: 99999999,
        ruleType: 'increase',
        ruleOperationType: 'percent',
        ruleAmount: 100,
        ruleExtraPrice: 0
      },
      dynamicPriceRules: [],
      marketplacePriceRules: {
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
      customTagMapping: {
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
      totalProductCount: 1648,
      totalVariantCount: 7283,
      status: 'active',
      lastCheckedAt: '2026-11-15T12:03:00Z',
      createdAt: '2026-08-10T10:00:00Z'
    }
  ];

  const xmlReports: XmlSyncReport[] = [
    {
      id: 'rep-10947-latest',
      tenantId: LUNEROSE_TENANT_ID,
      xmlSourceId: ARIAS_XML_ID,
      xmlSourceName: 'ariasclosetx',
      sourceProductCount: 1648,
      stockUpdatedCount: 8,
      priceUpdatedCount: 0,
      newlyAddedCount: 7,
      deletedCount: 0,
      startedAt: '2026-11-15T12:02:10Z',
      completedAt: '2026-11-15T12:03:00Z',
      itemsSummary: {
        stockUpdatedSkus: ['AX33322', 'AX33317', 'AX33316', 'AX33313', 'AX33310', 'AX33309', 'AX33308', 'AX25929'],
        priceUpdatedSkus: [],
        newlyAddedSkus: ['AX33322', 'AX33317', 'AX33316', 'AX33313', 'AX33310', 'AX33309', 'AX33308'],
        deletedSkus: []
      }
    }
  ];

  const sampleProductsRaw = [
    {
      code: 'AX33322',
      extId: '33322',
      title: 'Siyah Derin V Yaka Fırfır Detaylı Büzgülü Mini Parti ve Club Elbisesi',
      price: 422.5,
      stock: 20000,
      cat: 'Fantazi Elbise',
      catTree: 'FANTAZİ GİYİM/Fantazi Elbise',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
    },
    {
      code: 'AX33317',
      extId: '33317',
      title: 'Siyah Sarı Nakış İşlemeli Transparan Jartiyerli Fantezi Lingerie Seti – Tanga Hediyeli',
      price: 468.0,
      stock: 20000,
      cat: 'Jartiyer Takımları',
      catTree: 'FANTAZİ GİYİM/Jartiyer Takımları',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/goz-bantli-dantel-body-5a50.jpg'
    },
    {
      code: 'AX33316',
      extId: '33316',
      title: 'Kırmızı Çiçek Nakışlı Fırfırlı Omuz Detaylı Tül Fantezi İç Giyim Takımı - Tanga Hediyeli',
      price: 468.0,
      stock: 20000,
      cat: 'Fantazi İç Giyim',
      catTree: 'FANTAZİ GİYİM/Fantazi İç Giyim',
      brand: "Aria's Closet",
      color: 'Kırmızı',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-7e36.jpg'
    },
    {
      code: 'AX33313',
      extId: '33313',
      title: 'Siyah Şifon Kollu Altın Pul Detaylı Oryantal Dansöz Kostümü - Tanga Hediyeli',
      price: 468.0,
      stock: 20000,
      cat: 'Fantazi Kostüm',
      catTree: 'FANTAZİ GİYİM/Fantazi Kostüm',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/goz-bantli-dantel-body-b3a3.jpg'
    },
    {
      code: 'AX33310',
      extId: '33310',
      title: 'Zincir Aksesuarlı Deri ve Dantel Detaylı Halter Yaka Siyah Fantezi Body & Bodysuit',
      price: 468.0,
      stock: 20000,
      cat: 'Fantezi Body',
      catTree: 'FANTAZİ GİYİM/Fantezi Body',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/goz-bantli-dantel-body-5a50.jpg'
    },
    {
      code: 'AX33309',
      extId: '33309',
      title: 'Beyaz Halter Yaka Sırt Dekolteli Dantel Detaylı Mini Fantezi Elbise & Gecelik - Tanga Hediyeli',
      price: 468.0,
      stock: 20000,
      cat: 'Gecelik Modelleri',
      catTree: 'FANTAZİ GİYİM/Gecelik Modelleri',
      brand: "Aria's Closet",
      color: 'Beyaz',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
    },
    {
      code: 'AX33308',
      extId: '33308',
      title: 'Siyah Beyaz Fırfırlı Çapraz Askı Detaylı Fantezi Hizmetçi Kostümü - Tanga Hediyeli',
      price: 468.0,
      stock: 20000,
      cat: 'Fantazi Kostüm',
      catTree: 'FANTAZİ GİYİM/Fantazi Kostüm',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/goz-bantli-dantel-body-b3a3.jpg'
    },
    {
      code: 'AX33307',
      extId: '33307',
      title: 'Kırmızı Transparan Fransız Çiçek Dantelli Zincir ve Kemer Detaylı Jartiyerli Fantezi Body',
      price: 481.0,
      stock: 20000,
      cat: 'Fantezi Body',
      catTree: 'FANTAZİ GİYİM/Fantezi Body',
      brand: "Aria's Closet",
      color: 'Kırmızı',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/goz-bantli-dantel-body-5a50.jpg'
    },
    {
      code: 'AX33296',
      extId: '33296',
      title: 'Leopar Desenli Siyah Dantelli Derin Yırtmaçlı Uzun Gecelik',
      price: 455.0,
      stock: 20000,
      cat: 'Saten Gecelik',
      catTree: 'FANTAZİ GİYİM/Saten Gecelik',
      brand: "Aria's Closet",
      color: 'Leopar',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-7e36.jpg'
    },
    {
      code: 'AX25929',
      extId: '25929',
      title: 'Siyah Dantel İşlemeli İnce Askılı Saten Şortlu Bralet Takımı',
      price: 286.0,
      stock: 0,
      cat: 'Şortlu Takım',
      catTree: 'FANTAZİ GİYİM/Şortlu Takım',
      brand: 'MONAMİSE',
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
    },
    {
      code: 'AXE5105',
      extId: '2864',
      title: 'Arias Closet Saten Kaplı Dantell Babydoll',
      price: 936.0,
      stock: 50000,
      cat: 'Babydoll',
      catTree: 'FANTAZİ GİYİM/Babydoll',
      brand: "Aria's Closet",
      color: 'Siyah',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
    },
    {
      code: 'AX9174',
      extId: '9174',
      title: 'Arias Closet Özel Bölgesi Açık Kelebek İşlemeli Fantezi Desenli Taşlı Vizon Tanga String ACNL9174-2',
      price: 155.0,
      stock: 400,
      cat: 'Tanga G-String',
      catTree: 'FANTAZİ GİYİM/Tanga G-String',
      brand: "Aria's Closet",
      color: 'Vizon',
      img: 'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-7e36.jpg'
    }
  ];

  const products: Product[] = sampleProductsRaw.map((sp, idx) => {
    const tyPrice =
      sp.price < 299
        ? Number((sp.price * 2.05 + 75).toFixed(2))
        : Number((sp.price * 2.05).toFixed(2));
    const hbPrice =
      sp.price < 143
        ? Number((sp.price * 2.2 + 80).toFixed(2))
        : Number((sp.price * 2.2 + 40).toFixed(2));
    const sizes = ['S/M', 'L/XL'];

    return {
      id: `prod-seed-${idx + 1}`,
      tenantId: LUNEROSE_TENANT_ID,
      xmlSourceId: ARIAS_XML_ID,
      sourceName: 'ariasclosetx',
      externalId: sp.extId,
      stockCode: sp.code,
      supplierStockCode: sp.extId,
      barcode: `8690047046${String(idx + 10).padStart(3, '0')}`,
      title: sp.title,
      subtitle: 'Gizli Paketleme - Aynı Gün Kargo',
      invoiceTitle: 'Tekstil & Ev Giyim Ürünü',
      descriptionHtml: `<p><strong>${sp.title}</strong></p><p>Özel tasarım kaliteli kumaş, gizli paketleme garantisiyle gönderilir.</p>`,
      brandName: sp.brand,
      categoryName: sp.cat,
      categoryTree: sp.catTree,
      images: [sp.img],
      videoUrl: '',
      vatRate: 10,
      desi: 1,
      preparationDays: 1,
      warrantyMonths: 0,
      stockDeductionPerSale: 1,
      maxPurchaseQty: 0,
      xmlPriceLock: false,
      status: sp.stock > 0 ? 'active' : 'passive',
      buyingPrice: sp.price,
      marketPrice: Number((hbPrice * 1.15).toFixed(2)),
      salePrice: sp.price,
      trendyolListPrice: Number((tyPrice * 1.15).toFixed(2)),
      trendyolSalePrice: tyPrice,
      hepsiburadaSalePrice: hbPrice,
      totalXmlStock: sp.stock,
      reservedOrderStock: 0,
      netAvailableStock: sp.stock,
      trendyolSyncStatus: sp.cat === 'Babydoll' || sp.cat === 'Tanga G-String' || sp.cat === 'Jartiyer Takımları' ? 'synced' : 'pending',
      hepsiburadaSyncStatus: sp.cat === 'Babydoll' || sp.cat === 'Saten Gecelik' ? 'synced' : 'pending',
      tags: ['Gizli Paketleme', 'Yeni Sezon'],
      productUrl: `https://www.ariasclosetx.com/${sp.code.toLowerCase()}`,
      variants: sizes.map((sz, vIdx) => ({
        id: `var-seed-${idx + 1}-${vIdx + 1}`,
        externalVariantId: `${sp.extId}-${vIdx + 1}`,
        sku: `${sp.code}-${sz.replace('/', '')}`,
        barcode: `8690047046${String(idx * 2 + vIdx + 100).padStart(3, '0')}`,
        xmlStock: Math.floor(sp.stock / 2),
        reservedStock: 0,
        netStock: Math.floor(sp.stock / 2),
        buyingPrice: sp.price,
        salePrice: sp.price,
        marketPrice: Number((hbPrice * 1.15).toFixed(2)),
        trendyolSalePrice: tyPrice,
        hepsiburadaSalePrice: hbPrice,
        color: sp.color,
        size: sz,
        attributes: [
          { name: 'Beden Seçiniz', value: sz },
          { name: 'Renk', value: sp.color }
        ]
      })),
      updatedAt: '2026-11-15T12:03:00Z'
    };
  });

  const categories: CategoryMapping[] = [
    {
      id: 'cat-1',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Babydoll',
      xmlCategoryTree: 'FANTAZİ GİYİM/Babydoll',
      sourceName: 'ariasclosetx',
      productCount: 46,
      trendyolCategoryId: 552,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Babydoll',
      trendyolStatus: 'mapped',
      trendyolAttributes: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true },
        { attributeName: 'Menşei', mappedValue: 'TR', required: true }
      ],
      hepsiburadaCategoryId: 'HB-60000682',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Babydoll',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-2',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Büyük Beden Kadın Pijama',
      xmlCategoryTree: 'KADIN GİYİM/Büyük Beden Kadın Pijama',
      sourceName: 'ariasclosetx',
      productCount: 40,
      trendyolCategoryId: 3610,
      trendyolCategoryName: 'Giyim > İç Giyim > Büyük Beden > Büyük Beden Pijama Takımı',
      trendyolStatus: 'mapped',
      trendyolAttributes: [
        { attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true },
        { attributeName: 'Yaş Grubu', mappedValue: 'Yetişkin', required: true }
      ],
      hepsiburadaCategoryId: 'HB-60000678',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-3',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Jartiyer Takımları',
      xmlCategoryTree: 'FANTAZİ GİYİM/Jartiyer Takımları',
      sourceName: 'ariasclosetx',
      productCount: 192,
      trendyolCategoryId: 3104,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Jartiyer',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000684',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Jartiyer Takım',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-4',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'MONAMISE',
      xmlCategoryTree: 'MARKALAR/MONAMISE',
      sourceName: 'ariasclosetx',
      productCount: 290,
      trendyolCategoryId: 563,
      trendyolCategoryName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000678',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-5',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Gecelik Modelleri',
      xmlCategoryTree: 'FANTAZİ GİYİM/Gecelik Modelleri',
      sourceName: 'ariasclosetx',
      productCount: 265,
      trendyolCategoryId: 553,
      trendyolCategoryName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Gecelik',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000680',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-6',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Saten Gecelik',
      xmlCategoryTree: 'FANTAZİ GİYİM/Saten Gecelik',
      sourceName: 'ariasclosetx',
      productCount: 219,
      trendyolCategoryId: 553,
      trendyolCategoryName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Gecelik',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000680',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Gecelik',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-7',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Şortlu Takım',
      xmlCategoryTree: 'İÇ GİYİM/Şortlu Takım',
      sourceName: 'ariasclosetx',
      productCount: 183,
      trendyolCategoryId: 563,
      trendyolCategoryName: 'Giyim > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000678',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Uyku & Ev Giyim > Pijama Takımı',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-8',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Fantazi Kostüm',
      xmlCategoryTree: 'FANTAZİ GİYİM/Fantazi Kostüm',
      sourceName: 'ariasclosetx',
      productCount: 181,
      trendyolCategoryId: 3097,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Kostüm',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000686',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Kostüm',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-9',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Fantazi Elbise',
      xmlCategoryTree: 'FANTAZİ GİYİM/Fantazi Elbise',
      sourceName: 'ariasclosetx',
      productCount: 139,
      trendyolCategoryId: 3110,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi Gecelik',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000680',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi Gecelik',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-10',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Fantezi Body',
      xmlCategoryTree: 'FANTAZİ GİYİM/Fantezi Body',
      sourceName: 'ariasclosetx',
      productCount: 112,
      trendyolCategoryId: 3103,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi İç Çamaşır Takımı',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000688',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Fantezi İç Giyim > Fantezi İç Çamaşır Takımı',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    },
    {
      id: 'cat-11',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Tanga G-String',
      xmlCategoryTree: 'FANTAZİ GİYİM/Tanga G-String',
      sourceName: 'ariasclosetx',
      productCount: 118,
      trendyolCategoryId: 3108,
      trendyolCategoryName: 'Giyim > İç Giyim > Fantezi Giyim > Fantezi String',
      trendyolStatus: 'mapped',
      trendyolAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın / Kız', required: true }],
      hepsiburadaCategoryId: 'HB-60000674',
      hepsiburadaCategoryName: 'Moda > Kadın > İç Giyim > Külot & String',
      hepsiburadaStatus: 'mapped',
      hepsiburadaAttributes: [{ attributeName: 'Cinsiyet', mappedValue: 'Kadın', required: true }]
    }
  ];

  const brands: BrandMapping[] = [
    {
      id: 'brand-1',
      tenantId: LUNEROSE_TENANT_ID,
      name: "Aria's Closet",
      productCount: 4284,
      trendyolBrandId: 995293,
      trendyolBrandName: "Aria's Closet",
      hepsiburadaBrandName: "Aria's Closet",
      isMapped: true
    },
    {
      id: 'brand-2',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Brand',
      productCount: 894,
      trendyolBrandId: 995293,
      trendyolBrandName: "Aria's Closet",
      hepsiburadaBrandName: "Aria's Closet",
      isMapped: true
    },
    {
      id: 'brand-3',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'MONAMİSE',
      productCount: 290,
      trendyolBrandId: 7990,
      trendyolBrandName: 'MONAMİSE',
      hepsiburadaBrandName: 'MONAMİSE',
      isMapped: true
    },
    {
      id: 'brand-4',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Tegan',
      productCount: 0,
      trendyolBrandId: 1741014,
      trendyolBrandName: 'Tegan',
      hepsiburadaBrandName: 'Tegan',
      isMapped: true
    }
  ];

  const variantGroups: VariantGroupMapping[] = [
    {
      id: 'vg-renk',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Renk',
      productCount: 5468,
      trendyolMapped: false,
      hepsiburadaMapped: false,
      valuesList: [
        { rawValue: 'BEYAZ', normalizedTrendyolValue: 'Beyaz', normalizedHepsiburadaValue: 'Beyaz' },
        { rawValue: 'BORDO', normalizedTrendyolValue: 'Bordo', normalizedHepsiburadaValue: 'Bordo' },
        { rawValue: 'EKRU', normalizedTrendyolValue: 'Ekru', normalizedHepsiburadaValue: 'Ekru' },
        { rawValue: 'Fuşya', normalizedTrendyolValue: 'Fuşya', normalizedHepsiburadaValue: 'Fuşya' },
        { rawValue: 'SİYAH', normalizedTrendyolValue: 'Siyah', normalizedHepsiburadaValue: 'Siyah' },
        { rawValue: 'KIRMIZI', normalizedTrendyolValue: 'Kırmızı', normalizedHepsiburadaValue: 'Kırmızı' },
        { rawValue: 'Görsel', normalizedTrendyolValue: 'Çok Renkli', normalizedHepsiburadaValue: 'Çok Renkli' },
        { rawValue: 'Vizon', normalizedTrendyolValue: 'Vizon', normalizedHepsiburadaValue: 'Vizon' },
        { rawValue: 'Leopar', normalizedTrendyolValue: 'Leopar', normalizedHepsiburadaValue: 'Leopar' }
      ]
    },
    {
      id: 'vg-beden',
      tenantId: LUNEROSE_TENANT_ID,
      name: 'Beden',
      productCount: 5456,
      trendyolMapped: false,
      hepsiburadaMapped: false,
      valuesList: [
        { rawValue: 'XS', normalizedTrendyolValue: 'XS', normalizedHepsiburadaValue: 'XS' },
        { rawValue: 'S', normalizedTrendyolValue: 'S', normalizedHepsiburadaValue: 'S' },
        { rawValue: 'M', normalizedTrendyolValue: 'M', normalizedHepsiburadaValue: 'M' },
        { rawValue: 'L', normalizedTrendyolValue: 'L', normalizedHepsiburadaValue: 'L' },
        { rawValue: 'XL', normalizedTrendyolValue: 'XL', normalizedHepsiburadaValue: 'XL' },
        { rawValue: 'XXL', normalizedTrendyolValue: '2XL', normalizedHepsiburadaValue: '2XL' },
        { rawValue: 'S/M', normalizedTrendyolValue: 'S/M', normalizedHepsiburadaValue: 'S-M' },
        { rawValue: 'L/XL', normalizedTrendyolValue: 'L/XL', normalizedHepsiburadaValue: 'L-XL' },
        { rawValue: 'Standart', normalizedTrendyolValue: 'Standart', normalizedHepsiburadaValue: 'Standart' },
        { rawValue: '100B', normalizedTrendyolValue: '100B', normalizedHepsiburadaValue: '100B' },
        { rawValue: '100C', normalizedTrendyolValue: '100C', normalizedHepsiburadaValue: '100C' },
        { rawValue: '100D', normalizedTrendyolValue: '100D', normalizedHepsiburadaValue: '100D' },
        { rawValue: '105B', normalizedTrendyolValue: '105B', normalizedHepsiburadaValue: '105B' }
      ]
    }
  ];

  const tags: TagItem[] = [
    { id: 'tag-1', tenantId: LUNEROSE_TENANT_ID, name: 'Gizli Paketleme', color: '#4f46e5', productCount: 5468 },
    { id: 'tag-2', tenantId: LUNEROSE_TENANT_ID, name: 'Çok Satanlar', color: '#10b981', productCount: 440 },
    { id: 'tag-3', tenantId: LUNEROSE_TENANT_ID, name: 'Yeni Sezon', color: '#f59e0b', productCount: 1648 }
  ];

  const syncBatches: SyncBatch[] = [
    {
      id: 'batch-803254',
      tenantId: LUNEROSE_TENANT_ID,
      batchNumber: 803254,
      marketplace: 'Trendyol',
      operationType: 'TÜM ÜRÜNLER',
      remoteBatchId: 'TY-803254-ff91a',
      attemptedCount: 15,
      successCount: 15,
      errorCount: 0,
      status: 'completed',
      createdAt: '2026-09-05T12:22:00Z',
      errors: []
    },
    {
      id: 'batch-801762',
      tenantId: LUNEROSE_TENANT_ID,
      batchNumber: 801762,
      marketplace: 'Trendyol',
      operationType: 'SEÇİLEN ÜRÜNLER',
      remoteBatchId: 'TY-801762-ac12b',
      attemptedCount: 1155,
      successCount: 440,
      errorCount: 726,
      status: 'completed',
      createdAt: '2026-08-24T08:20:00Z',
      errors: [
        {
          stockCode: 'AX33322',
          title: 'Siyah Derin V Yaka Fırfır Detaylı Büzgülü Mini Parti ve Club Elbisesi',
          marketplace: 'Trendyol',
          message: 'Fantazi Elbise kategorisinde seçenekler gönderime açılmadı / eşitlenmedi.'
        },
        {
          stockCode: 'AX25929',
          title: 'Siyah Dantel İşlemeli İnce Askılı Saten Şortlu Bralet Takımı',
          marketplace: 'Trendyol',
          message: 'MONAMİSE markası Trendyol üzerinde eşitlenmedi.'
        }
      ]
    },
    {
      id: 'batch-803160',
      tenantId: LUNEROSE_TENANT_ID,
      batchNumber: 803160,
      marketplace: 'Tümü',
      operationType: 'ÜRÜN GÜNCELLEME(Stok)',
      remoteBatchId: 'SYNC-803160',
      attemptedCount: 5468,
      successCount: 5468,
      errorCount: 0,
      status: 'completed',
      createdAt: '2026-09-04T13:08:00Z',
      errors: []
    }
  ];

  const orders: Order[] = [
    {
      id: 'ord-1',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11820030786',
      marketplace: 'trendyol',
      customerName: 'Özgür Karıncalı',
      customerEmail: 'ozgur.k@example.com',
      customerPhone: '0532 000 11 22',
      shippingAddress: 'Atatürk Mah. Cumhuriyet Cad. No:42 D:5',
      shippingCity: 'İstanbul',
      shippingDistrict: 'Ataşehir',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911820030786',
      cargoBarcode: '11820030786',
      totalAmount: 341.5,
      commissionAmount: 68.3,
      shippingCost: 65.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> AX9174 stoğu düşüldü ve Hepsiburada stoğu güncellendi.',
      orderDate: '2026-11-12T00:50:00Z',
      items: [
        {
          sku: 'AX9174',
          barcode: '8690047046122',
          title: 'Arias Closet Özel Bölgesi Açık Kelebek İşlemeli Fantezi Desenli Taşlı Vizon Tanga String ACNL9174-2',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX9174)',
          quantity: 1,
          unitPrice: 341.5,
          vatRate: 10,
          color: 'Vizon',
          size: 'S/M'
        }
      ]
    },
    {
      id: 'ord-2',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11804168273',
      marketplace: 'trendyol',
      customerName: 'Tunay Yıldırım',
      customerEmail: 'tunay.y@example.com',
      customerPhone: '0544 111 22 33',
      shippingAddress: 'Bahçelievler Mah. 14. Sok. No:12',
      shippingCity: 'Ankara',
      shippingDistrict: 'Çankaya',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911804168273',
      cargoBarcode: '11804168273',
      totalAmount: 317.59,
      commissionAmount: 63.52,
      shippingCost: 65.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> AX9174 stoğu düşüldü ve Hepsiburada stoğu güncellendi.',
      orderDate: '2026-11-08T23:39:00Z',
      items: [
        {
          sku: 'AX9174',
          barcode: '8690047046122',
          title: 'Arias Closet Özel Bölgesi Açık Kelebek İşlemeli Fantezi Desenli Taşlı Vizon Tanga String ACNL9174-2',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX9174)',
          quantity: 1,
          unitPrice: 317.59,
          vatRate: 10,
          color: 'Vizon',
          size: 'L/XL'
        }
      ]
    },
    {
      id: 'ord-3',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11781615682',
      marketplace: 'trendyol',
      customerName: 'Kerem Seven',
      customerEmail: 'kerem.s@example.com',
      customerPhone: '0533 222 33 44',
      shippingAddress: 'Alsancak Mah. Kıbrıs Şehitleri Cad. No:88',
      shippingCity: 'İzmir',
      shippingDistrict: 'Konak',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911781615682',
      cargoBarcode: '11781615682',
      totalAmount: 317.59,
      commissionAmount: 63.52,
      shippingCost: 65.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> Hepsiburada stoğu anında eşitlendi.',
      orderDate: '2026-11-04T09:00:00Z',
      items: [
        {
          sku: 'AX9174',
          barcode: '8690047046122',
          title: 'Arias Closet Özel Bölgesi Açık Kelebek İşlemeli Fantezi Desenli Taşlı Vizon Tanga String ACNL9174-2',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX9174)',
          quantity: 1,
          unitPrice: 317.59,
          vatRate: 10,
          color: 'Vizon',
          size: 'S/M'
        }
      ]
    },
    {
      id: 'ord-4',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11762917382',
      marketplace: 'trendyol',
      customerName: 'Kevser Ayar',
      customerEmail: 'kevser.a@example.com',
      customerPhone: '0555 333 44 55',
      shippingAddress: 'Nilüfer Mah. FSM Bulvarı No:21',
      shippingCity: 'Bursa',
      shippingDistrict: 'Nilüfer',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911762917382',
      cargoBarcode: '11762917382',
      totalAmount: 461.43,
      commissionAmount: 92.28,
      shippingCost: 65.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> Hepsiburada stoğu anında eşitlendi.',
      orderDate: '2026-10-29T20:28:00Z',
      items: [
        {
          sku: 'AX33322-SM',
          barcode: '8690047046100',
          title: 'Siyah Derin V Yaka Fırfır Detaylı Büzgülü Mini Parti ve Club Elbisesi',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX33322)',
          quantity: 1,
          unitPrice: 461.43,
          vatRate: 10,
          color: 'Siyah',
          size: 'S/M'
        }
      ]
    },
    {
      id: 'ord-5',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11729368324',
      marketplace: 'trendyol',
      customerName: 'Alev Kara',
      customerEmail: 'alev.k@example.com',
      customerPhone: '0535 444 55 66',
      shippingAddress: 'Lara Mah. Güzeloba Cad. No:10',
      shippingCity: 'Antalya',
      shippingDistrict: 'Muratpaşa',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911729368324',
      cargoBarcode: '11729368324',
      totalAmount: 666.25,
      commissionAmount: 133.25,
      shippingCost: 65.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> Hepsiburada stoğu anında eşitlendi.',
      orderDate: '2026-10-20T10:55:00Z',
      items: [
        {
          sku: 'AX33296-SM',
          barcode: '8690047046116',
          title: 'Leopar Desenli Siyah Dantelli Derin Yırtmaçlı Uzun Gecelik',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX33296)',
          quantity: 1,
          unitPrice: 666.25,
          vatRate: 10,
          color: 'Leopar',
          size: 'S/M'
        }
      ]
    },
    {
      id: 'ord-6',
      tenantId: LUNEROSE_TENANT_ID,
      orderNumber: '11721273056',
      marketplace: 'trendyol',
      customerName: 'Hüseyin Dalkıran',
      customerEmail: 'huseyin.d@example.com',
      customerPhone: '0542 555 66 77',
      shippingAddress: 'Merkez Mah. Atatürk Bulvarı No:54',
      shippingCity: 'Kocaeli',
      shippingDistrict: 'İzmit',
      cargoCompany: 'Aras Kargo Marketplace',
      cargoTrackingNumber: '40911721273056',
      cargoBarcode: '11721273056',
      totalAmount: 912.06,
      commissionAmount: 182.41,
      shippingCost: 75.0,
      status: 'delivered',
      invoiceStatus: 'unissued',
      labelPrinted: false,
      stockDeducted: true,
      crossSyncLog: 'Trendyol siparişi -> Hepsiburada stoğu anında eşitlendi.',
      orderDate: '2026-10-17T21:50:00Z',
      items: [
        {
          sku: 'AX33317-SM',
          barcode: '8690047046102',
          title: 'Siyah Sarı Nakış İşlemeli Transparan Jartiyerli Fantezi Lingerie Seti – Tanga Hediyeli',
          maskedTitle: 'Tekstil & Ev Giyim Ürünü (AX33317)',
          quantity: 1,
          unitPrice: 912.06,
          vatRate: 10,
          color: 'Siyah',
          size: 'S/M'
        }
      ]
    }
  ];

  const priceRobotItems: PriceRobotItem[] = [
    {
      id: 'pr-1',
      tenantId: LUNEROSE_TENANT_ID,
      productId: 'prod-seed-1',
      stockCode: 'AX33322',
      productTitle: 'Siyah Derin V Yaka Fırfır Detaylı Büzgülü Mini Parti ve Club Elbisesi',
      marketplace: 'trendyol',
      marketplaceSkuOrUrl: 'https://www.trendyol.com/lunerose/siyah-derin-v-yaka-p-1001',
      currentPrice: 866.13,
      buyboxPrice: 865.0,
      minFloorPrice: 780.0,
      maxCeilingPrice: 990.0,
      stepAmount: 1.0,
      buyboxRank: 2,
      competitorStore: 'ButikModa',
      excludedStores: [],
      isActive: true,
      lastCheckedAt: '2026-11-15T12:15:00Z'
    },
    {
      id: 'pr-2',
      tenantId: LUNEROSE_TENANT_ID,
      productId: 'prod-seed-2',
      stockCode: 'AX33317',
      productTitle: 'Siyah Sarı Nakış İşlemeli Transparan Jartiyerli Fantezi Lingerie Seti – Tanga Hediyeli',
      marketplace: 'hepsiburada',
      marketplaceSkuOrUrl: 'HBV0000AX33317',
      currentPrice: 1069.6,
      buyboxPrice: 1069.6,
      minFloorPrice: 920.0,
      maxCeilingPrice: 1199.0,
      stepAmount: 2.0,
      buyboxRank: 1,
      competitorStore: 'LuneRose (Siz)',
      excludedStores: [],
      isActive: true,
      lastCheckedAt: '2026-11-15T12:15:00Z'
    }
  ];

  const claims: ClaimItem[] = [];

  const operationLogs: OperationLog[] = [
    {
      id: 'op-1',
      tenantId: LUNEROSE_TENANT_ID,
      type: 'xml_sync',
      channel: 'ariasclosetx',
      summary: 'XML Kontrolü Tamamlandı (1.648 ürün, 7.283 varyant)',
      status: 'success',
      details: '8 ürünün stoğu güncellendi, 7 yeni ürün eklendi.',
      createdAt: '2026-11-15T12:03:00Z'
    },
    {
      id: 'op-2',
      tenantId: LUNEROSE_TENANT_ID,
      type: 'price_stock_sync',
      channel: 'Trendyol & Hepsiburada',
      summary: 'Stok ve fiyat güncellendi (6 ürün)',
      status: 'success',
      details: 'Değişen stok/fiyatlar Trendyol (1192080) ve Hepsiburada (fea9499f-...) kanallarına iletildi.',
      createdAt: '2026-11-15T00:03:00Z'
    }
  ];

  return {
    tenants: [initialTenant],
    users: [initialUser],
    marketplaceAccounts,
    xmlSources,
    xmlReports,
    products,
    categories,
    brands,
    variantGroups,
    tags,
    syncBatches,
    priceRobotItems,
    orders,
    claims,
    operationLogs
  };
}

export function readDb(): DatabaseState {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = createInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as DatabaseState;
  } catch {
    return createInitialSeedData();
  }
}

export function writeDb(state: DatabaseState): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function getTenantData(tenantId: string) {
  const db = readDb();
  const tenant = db.tenants.find((t) => t.id === tenantId) || db.tenants[0];
  const effectiveTenantId = tenant.id;

  return {
    tenant,
    marketplaceAccounts: db.marketplaceAccounts.filter((m) => m.tenantId === effectiveTenantId),
    xmlSources: db.xmlSources.filter((x) => x.tenantId === effectiveTenantId),
    xmlReports: db.xmlReports.filter((r) => r.tenantId === effectiveTenantId),
    products: db.products.filter((p) => p.tenantId === effectiveTenantId),
    categories: db.categories.filter((c) => c.tenantId === effectiveTenantId),
    brands: db.brands.filter((b) => b.tenantId === effectiveTenantId),
    variantGroups: db.variantGroups.filter((v) => v.tenantId === effectiveTenantId),
    tags: db.tags.filter((t) => t.tenantId === effectiveTenantId),
    syncBatches: db.syncBatches.filter((b) => b.tenantId === effectiveTenantId),
    priceRobotItems: db.priceRobotItems.filter((p) => p.tenantId === effectiveTenantId),
    orders: db.orders.filter((o) => o.tenantId === effectiveTenantId),
    claims: db.claims.filter((c) => c.tenantId === effectiveTenantId),
    operationLogs: db.operationLogs.filter((l) => l.tenantId === effectiveTenantId)
  };
}
