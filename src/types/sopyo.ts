export type MarketplaceType = 'trendyol' | 'hepsiburada';

export interface PriceRuleItem {
  ruleMinPrice: number;
  ruleMaxPrice: number;
  ruleType: 'increase' | 'discount';
  ruleOperationType: 'percent' | 'price';
  ruleAmount: number;
  ruleExtraPrice: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'professional' | 'enterprise';
  licenseExpiresAt: string;
  isActive: boolean;
  maxXmlSources: number;
  maxProducts: number;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyWebsite: string;
  defaultVatRate: number;
  maskInvoiceProductNames: boolean;
  defaultMaskedProductName: string;
  cargoLabelTemplate: 'single' | 'double' | 'quad' | 'barcode' | 'argox';
  cargoLabelShowStock: boolean;
  cargoLabelShowProducts: boolean;
  cargoLabelShowPrice: boolean;
  cargoLabelShowSku: boolean;
  cargoLabelFontSize: number;
  trendyolInvoiceNote: string;
  hepsiburadaInvoiceNote: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'super_admin' | 'owner' | 'staff';
  password?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MarketplaceAccount {
  id: string;
  tenantId: string;
  marketplace: MarketplaceType;
  storeName: string;
  supplierOrMerchantId: string;
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
  autoConfirmOrders: boolean;
  shipmentProviderId: string;
  shipmentProviderName: string;
  shipmentAddressId: string;
  shipmentAddressText: string;
  returningAddressId: string;
  returningAddressText: string;
  dispatchTimeHours: number;
  hbOrderPullStatus: 'packageable' | 'ready_to_ship';
  stockCodeType: 'modelCode' | 'supplierStockCode' | 'barcode';
  descriptionPrefixHtml: string;
  descriptionSuffixHtml: string;
  lastTestedAt?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export interface XmlSource {
  id: string;
  tenantId: string;
  xmlIdNumber: number; // Örn: 10947
  name: string;
  url: string;
  providerType: 'ticimax' | 'ideasoft' | 'custom';
  extraNotes: string;
  stockCodePrefix: string; // Örn: AX
  generateBarcode: boolean;
  disableStockSync: boolean;
  disablePriceSync: boolean;
  disableNewProducts: boolean;
  criticalStockEnabled: boolean;
  criticalStockAmount: number; // Örn: 3
  autoPublishEnabled: boolean;
  autoPublishChannels: ('Trendyol' | 'Hepsiburada')[];
  salePriceTag: string;
  buyingPriceTag: string;
  marketPriceTag: string;
  taxIncludedMode: 0 | 1 | 2;
  fixedTaxRate: number;
  useCurrencyConversion: boolean;
  priceRoundEnabled: boolean;
  priceRoundType: 'x9' | '99' | 'x0' | '00' | '90';
  priceRoundWay: 'round' | 'roundDown' | 'roundUp';
  priceRuleType: 0 | 1 | 2 | 3; // 0: Yok, 1: Sabit, 2: Değişken, 3: Pazaryeri Bazlı
  fixedPriceRule: PriceRuleItem;
  dynamicPriceRules: PriceRuleItem[];
  marketplacePriceRules: {
    Trendyol: PriceRuleItem[];
    Hepsiburada: PriceRuleItem[];
  };
  customTagMapping: {
    productNode: string;
    externalId: string;
    title: string;
    description: string;
    brand: string;
    category: string;
    categoryTree: string;
    images: string;
    variants: string;
    variantId: string;
    sku: string;
    barcode: string;
    stock: string;
    buyingPrice: string;
    salePrice: string;
    marketPrice: string;
    vatRate: string;
    currency: string;
    desi: string;
  };
  totalProductCount: number;
  totalVariantCount: number;
  status: 'active' | 'pending' | 'limit_exceeded';
  lastCheckedAt: string;
  createdAt: string;
}

export interface XmlSyncReport {
  id: string;
  tenantId: string;
  xmlSourceId: string;
  xmlSourceName: string;
  sourceProductCount: number;
  stockUpdatedCount: number;
  priceUpdatedCount: number;
  newlyAddedCount: number;
  deletedCount: number;
  startedAt: string;
  completedAt: string;
  itemsSummary: {
    stockUpdatedSkus: string[];
    priceUpdatedSkus: string[];
    newlyAddedSkus: string[];
    deletedSkus: string[];
  };
}

export interface ProductVariant {
  id: string;
  externalVariantId: string;
  sku: string;
  barcode: string;
  xmlStock: number;
  reservedStock: number;
  netStock: number;
  buyingPrice: number;
  salePrice: number;
  marketPrice: number;
  trendyolSalePrice: number;
  hepsiburadaSalePrice: number;
  color: string;
  size: string;
  attributes: { name: string; value: string }[];
}

export interface Product {
  id: string;
  tenantId: string;
  xmlSourceId: string;
  sourceName: string;
  externalId: string;
  stockCode: string;
  supplierStockCode: string;
  barcode: string;
  title: string;
  subtitle: string;
  invoiceTitle: string; // Maskeli fatura başlığı
  descriptionHtml: string;
  brandName: string;
  categoryName: string;
  categoryTree: string;
  images: string[];
  videoUrl: string;
  vatRate: number;
  desi: number;
  preparationDays: number;
  warrantyMonths: number;
  stockDeductionPerSale: number;
  maxPurchaseQty: number;
  xmlPriceLock: boolean;
  status: 'active' | 'passive';
  buyingPrice: number;
  marketPrice: number;
  salePrice: number;
  trendyolListPrice: number;
  trendyolSalePrice: number;
  hepsiburadaSalePrice: number;
  totalXmlStock: number;
  reservedOrderStock: number;
  netAvailableStock: number;
  trendyolSyncStatus: 'synced' | 'pending' | 'error' | 'not_sent';
  trendyolErrorMessage?: string;
  hepsiburadaSyncStatus: 'synced' | 'pending' | 'error' | 'not_sent';
  hepsiburadaErrorMessage?: string;
  tags: string[];
  productUrl: string;
  variants: ProductVariant[];
  updatedAt: string;
}

export interface CategoryMapping {
  id: string;
  tenantId: string;
  name: string;
  xmlCategoryTree: string;
  sourceName: string;
  productCount: number;
  trendyolCategoryId?: number;
  trendyolCategoryName?: string;
  trendyolStatus: 'mapped' | 'missing_options' | 'missing_attributes' | 'unmapped';
  trendyolAttributes: { attributeName: string; mappedValue: string; required: boolean }[];
  hepsiburadaCategoryId?: string;
  hepsiburadaCategoryName?: string;
  hepsiburadaStatus: 'mapped' | 'missing_options' | 'missing_attributes' | 'unmapped';
  hepsiburadaAttributes: { attributeName: string; mappedValue: string; required: boolean }[];
}

export interface BrandMapping {
  id: string;
  tenantId: string;
  name: string;
  productCount: number;
  trendyolBrandId?: number;
  trendyolBrandName?: string;
  hepsiburadaBrandName?: string;
  isMapped: boolean;
}

export interface VariantGroupMapping {
  id: string;
  tenantId: string;
  name: string; // Renk | Beden
  productCount: number;
  trendyolMapped: boolean;
  hepsiburadaMapped: boolean;
  valuesList: {
    rawValue: string;
    normalizedTrendyolValue: string;
    normalizedHepsiburadaValue: string;
  }[];
}

export interface TagItem {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  productCount: number;
}

export interface SyncBatch {
  id: string;
  tenantId: string;
  batchNumber: number;
  marketplace: 'Trendyol' | 'Hepsiburada' | 'Tümü';
  operationType: string;
  remoteBatchId: string;
  attemptedCount: number;
  successCount: number;
  errorCount: number;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
  errors: { stockCode: string; title: string; marketplace: string; message: string }[];
}

export interface PriceRobotItem {
  id: string;
  tenantId: string;
  productId: string;
  stockCode: string;
  productTitle: string;
  marketplace: MarketplaceType;
  marketplaceSkuOrUrl: string;
  currentPrice: number;
  buyboxPrice: number;
  minFloorPrice: number;
  maxCeilingPrice: number;
  stepAmount: number;
  buyboxRank: number;
  competitorStore: string;
  excludedStores: string[];
  isActive: boolean;
  lastCheckedAt: string;
}

export interface OrderLineItem {
  sku: string;
  barcode: string;
  title: string;
  maskedTitle?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  color?: string;
  size?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  marketplace: MarketplaceType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  cargoCompany: string;
  cargoTrackingNumber: string;
  cargoBarcode: string;
  totalAmount: number;
  commissionAmount: number;
  shippingCost: number;
  status: 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  invoiceStatus: 'unissued' | 'issued';
  invoiceNumber?: string;
  labelPrinted: boolean;
  stockDeducted: boolean;
  crossSyncLog: string;
  items: OrderLineItem[];
  orderDate: string;
}

export interface ClaimItem {
  id: string;
  tenantId: string;
  claimNumber: string;
  orderNumber: string;
  marketplace: MarketplaceType;
  customerName: string;
  productTitle: string;
  sku: string;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  restockOnApprove: boolean;
  amount: number;
  claimDate: string;
}

export interface OperationLog {
  id: string;
  tenantId: string;
  type: 'xml_sync' | 'marketplace_publish' | 'price_stock_sync' | 'order_pull' | 'cross_stock_deduct' | 'claim_sync';
  channel: string;
  summary: string;
  status: 'success' | 'warning' | 'error';
  details: string;
  createdAt: string;
}
