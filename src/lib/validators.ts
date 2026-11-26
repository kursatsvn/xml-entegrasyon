import { z } from 'zod';

// =============================================================================
// AUTH ENDPOINT (/api/auth) ZOD SCHEMAS
// =============================================================================

const EmailSchema = z
  .string()
  .trim()
  .min(3, 'Geçerli bir e-posta adresi giriniz.')
  .max(254, 'E-posta adresi çok uzun.')
  .email('Geçerli bir e-posta adresi giriniz.')
  .transform((v) => v.toLowerCase());

export const AuthLoginSchema = z.object({
  action: z.literal('login'),
  email: EmailSchema,
  password: z.string().min(1, 'Şifre zorunludur.').max(256, 'Şifre çok uzun.')
});

export const AuthRegisterSchema = z.object({
  action: z.literal('register'),
  storeName: z
    .string()
    .trim()
    .min(2, 'Mağaza adı en az 2 karakter olmalıdır.')
    .max(120, 'Mağaza adı en fazla 120 karakter olabilir.'),
  fullName: z
    .string()
    .trim()
    .max(120, 'Ad soyad en fazla 120 karakter olabilir.')
    .optional()
    .default(''),
  email: EmailSchema,
  phone: z
    .string()
    .trim()
    .max(40, 'Telefon numarası en fazla 40 karakter olabilir.')
    .optional()
    .default(''),
  password: z
    .string()
    .min(6, 'Şifre en az 6 karakter olmalıdır.')
    .max(128, 'Şifre en fazla 128 karakter olabilir.')
});

export const AuthLogoutSchema = z.object({
  action: z.literal('logout')
});

export const AuthSwitchTenantSchema = z
  .object({
    action: z.literal('switch_tenant'),
    targetTenantId: z.string().trim().min(1).max(120).optional(),
    tenantId: z.string().trim().min(1).max(120).optional()
  })
  .refine((d) => Boolean(d.targetTenantId || d.tenantId), {
    message: 'Hedef mağaza kimliği zorunludur.'
  });

export const AuthActionSchema = z.discriminatedUnion('action', [
  AuthLoginSchema,
  AuthRegisterSchema,
  AuthLogoutSchema,
  AuthSwitchTenantSchema
]);

// =============================================================================
// STATE ENDPOINT (/api/state) ZOD SCHEMAS
// =============================================================================

const PriceRuleItemSchema = z.object({
  ruleMinPrice: z.coerce.number().min(0).max(1e12),
  ruleMaxPrice: z.coerce.number().min(0).max(1e12),
  ruleType: z.enum(['increase', 'discount']),
  ruleOperationType: z.enum(['percent', 'price']),
  ruleAmount: z.coerce.number().min(0).max(1e9),
  ruleExtraPrice: z.coerce.number().min(-1e9).max(1e9)
});

const MarketplaceTargetSchema = z.enum(['Trendyol', 'Hepsiburada', 'Tümü']).default('Tümü');
const MarketplaceSlugSchema = z.enum(['trendyol', 'hepsiburada']);

const InspectXmlNodesSchema = z.object({
  action: z.literal('inspect_xml_nodes'),
  url: z.string().trim().min(8, 'Geçerli bir XML URL giriniz.').max(2048, 'XML URL çok uzun.')
});

const SaveXmlSourceSchema = z.object({
  action: z.literal('save_xml_source'),
  xmlSource: z
    .object({
      id: z.string().trim().max(120).optional(),
      name: z.string().trim().min(1, 'XML kaynak adı zorunludur.').max(150).optional(),
      url: z.string().trim().max(2048).optional(),
      providerType: z.enum(['ticimax', 'ideasoft', 'custom']).optional(),
      extraNotes: z.string().max(2000).optional(),
      stockCodePrefix: z.string().max(30).optional(),
      generateBarcode: z.boolean().optional(),
      disableStockSync: z.boolean().optional(),
      disablePriceSync: z.boolean().optional(),
      disableNewProducts: z.boolean().optional(),
      criticalStockEnabled: z.boolean().optional(),
      criticalStockAmount: z.coerce.number().int().min(0).max(100000).optional(),
      autoPublishEnabled: z.boolean().optional(),
      autoPublishChannels: z.array(z.enum(['Trendyol', 'Hepsiburada'])).max(5).optional(),
      salePriceTag: z.string().max(120).optional(),
      buyingPriceTag: z.string().max(120).optional(),
      marketPriceTag: z.string().max(120).optional(),
      taxIncludedMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
      fixedTaxRate: z.coerce.number().min(0).max(100).optional(),
      useCurrencyConversion: z.boolean().optional(),
      priceRoundEnabled: z.boolean().optional(),
      priceRoundType: z.enum(['x9', '99', 'x0', '00', '90']).optional(),
      priceRoundWay: z.enum(['round', 'roundDown', 'roundUp']).optional(),
      priceRuleType: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      fixedPriceRule: PriceRuleItemSchema.optional(),
      dynamicPriceRules: z.array(PriceRuleItemSchema).max(50).optional(),
      marketplacePriceRules: z
        .object({
          Trendyol: z.array(PriceRuleItemSchema).max(50),
          Hepsiburada: z.array(PriceRuleItemSchema).max(50)
        })
        .optional(),
      customTagMapping: z.record(z.string(), z.string().max(120)).optional(),
      status: z.enum(['active', 'pending', 'limit_exceeded']).optional()
    })
    .passthrough()
});

const UpdateQuickPriceRulesSchema = z.object({
  action: z.literal('update_quick_price_rules'),
  trendyolPercent: z.coerce.number().min(-99).max(5000).default(105),
  trendyolExtraTl: z.coerce.number().min(-100000).max(1000000).default(0),
  hepsiburadaPercent: z.coerce.number().min(-99).max(5000).default(120),
  hepsiburadaExtraTl: z.coerce.number().min(-100000).max(1000000).default(0)
});

const SyncXmlSourceSchema = z.object({
  action: z.literal('sync_xml_source'),
  xmlSourceId: z.string().trim().min(1, 'XML kaynak kimliği zorunludur.').max(120),
  limit: z.coerce.number().int().min(0).max(100000).optional().default(0)
});

const DeleteXmlSourceSchema = z.object({
  action: z.literal('delete_xml_source'),
  xmlSourceId: z.string().trim().min(1, 'XML kaynak kimliği zorunludur.').max(120),
  deleteProducts: z.boolean().optional().default(false)
});

const ProductVariantInputSchema = z
  .object({
    id: z.string().max(160).optional(),
    externalVariantId: z.string().max(160).optional(),
    sku: z.string().max(160).optional(),
    barcode: z.string().max(120).optional(),
    xmlStock: z.coerce.number().min(0).max(1e9).optional(),
    reservedStock: z.coerce.number().min(0).max(1e9).optional(),
    netStock: z.coerce.number().min(0).max(1e9).optional(),
    buyingPrice: z.coerce.number().min(0).max(1e9).optional(),
    salePrice: z.coerce.number().min(0).max(1e9).optional(),
    marketPrice: z.coerce.number().min(0).max(1e9).optional(),
    trendyolSalePrice: z.coerce.number().min(0).max(1e9).optional(),
    hepsiburadaSalePrice: z.coerce.number().min(0).max(1e9).optional(),
    color: z.string().max(100).optional(),
    size: z.string().max(100).optional(),
    attributes: z
      .array(z.object({ name: z.string().max(120), value: z.string().max(250) }))
      .max(50)
      .optional()
  })
  .passthrough();

const SaveProductSchema = z.object({
  action: z.literal('save_product'),
  product: z
    .object({
      id: z.string().trim().max(160).optional(),
      title: z.string().trim().min(1, 'Ürün başlığı zorunludur.').max(300).optional(),
      subtitle: z.string().max(300).optional(),
      invoiceTitle: z.string().max(300).optional(),
      descriptionHtml: z.string().max(100000).optional(),
      stockCode: z.string().max(160).optional(),
      supplierStockCode: z.string().max(160).optional(),
      barcode: z.string().max(120).optional(),
      brandName: z.string().max(150).optional(),
      categoryName: z.string().max(200).optional(),
      categoryTree: z.string().max(500).optional(),
      images: z.array(z.string().max(2048)).max(20).optional(),
      videoUrl: z.string().max(2048).optional(),
      vatRate: z.coerce.number().min(0).max(100).optional(),
      desi: z.coerce.number().min(0).max(10000).optional(),
      preparationDays: z.coerce.number().int().min(0).max(60).optional(),
      warrantyMonths: z.coerce.number().int().min(0).max(240).optional(),
      stockDeductionPerSale: z.coerce.number().int().min(1).max(1000).optional(),
      maxPurchaseQty: z.coerce.number().int().min(0).max(10000).optional(),
      xmlPriceLock: z.boolean().optional(),
      status: z.enum(['active', 'passive']).optional(),
      buyingPrice: z.coerce.number().min(0).max(1e9).optional(),
      marketPrice: z.coerce.number().min(0).max(1e9).optional(),
      salePrice: z.coerce.number().min(0).max(1e9).optional(),
      minPrice: z.coerce.number().min(0).max(1e9).optional(),
      trendyolListPrice: z.coerce.number().min(0).max(1e9).optional(),
      trendyolSalePrice: z.coerce.number().min(0).max(1e9).optional(),
      hepsiburadaSalePrice: z.coerce.number().min(0).max(1e9).optional(),
      totalXmlStock: z.coerce.number().min(0).max(1e9).optional(),
      netAvailableStock: z.coerce.number().min(0).max(1e9).optional(),
      tags: z.array(z.string().max(80)).max(50).optional(),
      variants: z.array(ProductVariantInputSchema).max(500).optional()
    })
    .passthrough()
});

const AutoMatchCategoriesSchema = z.object({
  action: z.literal('auto_match_all_categories')
});

const SaveCategoryMappingSchema = z.object({
  action: z.literal('save_category_mapping'),
  category: z
    .object({
      id: z.string().trim().min(1, 'Kategori kimliği zorunludur.').max(160),
      trendyolCategoryId: z.coerce.number().int().min(0).optional(),
      trendyolCategoryName: z.string().max(300).optional(),
      trendyolStatus: z
        .enum(['mapped', 'missing_options', 'missing_attributes', 'unmapped'])
        .optional(),
      hepsiburadaCategoryId: z.string().max(120).optional(),
      hepsiburadaCategoryName: z.string().max(300).optional(),
      hepsiburadaStatus: z
        .enum(['mapped', 'missing_options', 'missing_attributes', 'unmapped'])
        .optional()
    })
    .passthrough()
});

const AutoMatchBrandsSchema = z.object({
  action: z.literal('auto_match_all_brands'),
  defaultBrandName: z.string().trim().max(150).optional()
});

const AutoMatchVariantsSchema = z.object({
  action: z.literal('auto_match_all_variants')
});

const SaveMarketplaceAccountSchema = z.object({
  action: z.literal('save_marketplace_account'),
  account: z
    .object({
      id: z.string().max(160).optional(),
      marketplace: MarketplaceSlugSchema,
      environment: z.enum(['production', 'sit']).optional().default('production'),
      storeName: z.string().trim().min(1, 'Mağaza adı zorunludur.').max(150),
      supplierOrMerchantId: z.string().trim().max(150).default(''),
      apiKey: z.string().max(300).default(''),
      apiSecret: z.string().max(300).default(''),
      isActive: z.boolean().default(true),
      autoConfirmOrders: z.boolean().default(false),
      shipmentProviderId: z.string().max(80).default('7'),
      shipmentProviderName: z.string().max(160).default(''),
      shipmentAddressId: z.string().max(80).default(''),
      shipmentAddressText: z.string().max(500).default(''),
      returningAddressId: z.string().max(80).default(''),
      returningAddressText: z.string().max(500).default(''),
      dispatchTimeHours: z.coerce.number().int().min(1).max(720).default(24),
      hbOrderPullStatus: z.enum(['packageable', 'ready_to_ship']).default('ready_to_ship'),
      stockCodeType: z.enum(['modelCode', 'supplierStockCode', 'barcode']).default('modelCode'),
      descriptionPrefixHtml: z.string().max(20000).default(''),
      descriptionSuffixHtml: z.string().max(20000).default('')
    })
    .passthrough()
});

const BulkPublishSchema = z.object({
  action: z.literal('bulk_publish'),
  marketplace: MarketplaceTargetSchema.optional(),
  limit: z.coerce.number().int().min(0).max(50000).optional().default(0),
  onlyUnsent: z.boolean().optional().default(false)
});

const BulkUpdatePriceStockSchema = z.object({
  action: z.literal('bulk_update_price_stock'),
  marketplace: MarketplaceTargetSchema.optional()
});

const PullOrdersSchema = z.object({
  action: z.literal('pull_orders_and_deduct_stock'),
  simulateNewOrder: z.boolean().optional(),
  marketplace: MarketplaceSlugSchema.optional()
});

const UpdateOrderSchema = z.object({
  action: z.literal('update_order'),
  orderId: z.string().trim().min(1, 'Sipariş kimliği zorunludur.').max(160),
  status: z.enum(['pending', 'ready_to_ship', 'shipped', 'delivered', 'cancelled']).optional(),
  invoiceStatus: z.enum(['unissued', 'issued']).optional(),
  labelPrinted: z.boolean().optional()
});

const UpdateTenantSettingsSchema = z.object({
  action: z.literal('update_tenant_settings'),
  settings: z
    .object({
      name: z.string().trim().max(150).optional(),
      companyPhone: z.string().max(50).optional(),
      companyEmail: z.string().max(254).optional(),
      companyAddress: z.string().max(500).optional(),
      companyWebsite: z.string().max(300).optional(),
      defaultVatRate: z.coerce.number().min(0).max(100).optional(),
      maskInvoiceProductNames: z.boolean().optional(),
      defaultMaskedProductName: z.string().max(250).optional(),
      cargoLabelTemplate: z.enum(['single', 'double', 'quad', 'barcode', 'argox']).optional(),
      cargoLabelShowStock: z.boolean().optional(),
      cargoLabelShowProducts: z.boolean().optional(),
      cargoLabelShowPrice: z.boolean().optional(),
      cargoLabelShowSku: z.boolean().optional(),
      cargoLabelFontSize: z.coerce.number().min(4).max(36).optional(),
      trendyolInvoiceNote: z.string().max(1000).optional(),
      hepsiburadaInvoiceNote: z.string().max(1000).optional(),
      generalSettings: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough()
});

const RunPriceRobotSchema = z.object({
  action: z.literal('run_price_robot')
});

const AddPriceRobotItemSchema = z.object({
  action: z.literal('add_price_robot_item'),
  productId: z.string().trim().min(1, 'Ürün kimliği zorunludur.').max(160),
  marketplace: MarketplaceSlugSchema.optional().default('trendyol'),
  marketplaceSkuOrUrl: z.string().trim().max(500).optional(),
  minFloorPrice: z.coerce.number().min(0).max(1e9).optional(),
  maxCeilingPrice: z.coerce.number().min(0).max(1e9).optional(),
  stepAmount: z.coerce.number().min(0.01).max(100000).optional()
});

const FetchLiveTrendyolSchema = z.object({
  action: z.literal('fetch_live_trendyol_products'),
  page: z.coerce.number().int().min(0).max(10000).optional().default(0),
  size: z.coerce.number().int().min(1).max(200).optional().default(50),
  filter: z
    .enum(['all', 'on_sale', 'passive', 'archived', 'unapproved', 'blacklisted'])
    .optional()
    .default('all')
});

const ArchiveLiveTrendyolSchema = z.object({
  action: z.literal('archive_live_trendyol_products'),
  barcodes: z.array(z.string().trim().min(1).max(120)).max(5000).optional().default([]),
  archiveMode: z
    .enum(['selected', 'on_sale', 'passive', 'all_unarchived'])
    .optional()
    .default('selected')
});

const DeleteLiveTrendyolSchema = z.object({
  action: z.literal('delete_live_trendyol_products'),
  barcodes: z.array(z.string().trim().min(1).max(120)).max(5000).optional().default([]),
  deleteAllMode: z
    .enum([
      'selected',
      'on_sale',
      'passive',
      'archived',
      'unapproved',
      'blacklisted',
      'approved',
      'all'
    ])
    .optional()
    .default('selected'),
  maxPagesToDelete: z.coerce.number().int().min(1).max(200).optional().default(20)
});

const AdminUpdateTenantSchema = z.object({
  action: z.literal('admin_update_tenant'),
  targetTenantId: z.string().trim().min(1, 'Hedef mağaza kimliği zorunludur.').max(120),
  updates: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      plan: z.enum(['free', 'professional', 'enterprise']).optional(),
      licenseExpiresAt: z.string().max(60).optional(),
      isActive: z.boolean().optional(),
      maxXmlSources: z.coerce.number().int().min(0).max(500).optional(),
      maxProducts: z.coerce.number().int().min(0).max(1000000).optional()
    })
    .strict()
});

const RunAiComplianceScanSchema = z.object({
  action: z.literal('run_ai_compliance_scan')
});

const SearchHepsiburadaCategoriesSchema = z.object({
  action: z.literal('search_hepsiburada_categories'),
  query: z.string().max(200).optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40)
});

const FetchHepsiburadaCategoryAttributesSchema = z.object({
  action: z.literal('fetch_hepsiburada_category_attributes'),
  categoryId: z.coerce.number().int().min(1, 'Geçerli bir Hepsiburada kategori ID giriniz.')
});

const FetchLiveHepsiburadaSchema = z.object({
  action: z.literal('fetch_live_hepsiburada_products'),
  page: z.coerce.number().int().min(0).max(10000).optional().default(0),
  size: z.coerce.number().int().min(1).max(200).optional().default(50),
  filter: z
    .enum(['all', 'on_sale', 'passive', 'locked', 'waiting', 'rejected'])
    .optional()
    .default('all')
});

const ToggleHepsiburadaListingsStateSchema = z.object({
  action: z.literal('toggle_hepsiburada_listings_state'),
  items: z
    .array(
      z.object({
        hepsiburadaSku: z.string().max(120).optional().default(''),
        merchantSku: z.string().trim().min(1).max(160)
      })
    )
    .min(1, 'En az bir ürün seçilmelidir.')
    .max(500),
  targetState: z.enum(['activate', 'deactivate'])
});

const DeletePendingHepsiburadaSchema = z.object({
  action: z.literal('delete_pending_hepsiburada_products'),
  merchantSkus: z.array(z.string().trim().min(1).max(160)).min(1).max(1000)
});

const ApproveHepsiburadaPreMatchSchema = z.object({
  action: z.literal('approve_hepsiburada_prematch'),
  merchantSkus: z.array(z.string().trim().min(1).max(160)).min(1).max(1000)
});

const CheckHepsiburadaImportStatusSchema = z.object({
  action: z.literal('check_hepsiburada_import_status'),
  trackingId: z.string().trim().min(1, 'Tracking ID zorunludur.').max(200)
});

const ReconcileHepsiburadaStatusSchema = z.object({
  action: z.literal('reconcile_hepsiburada_status')
});

const PullMarketplaceClaimsSchema = z.object({
  action: z.literal('pull_marketplace_claims')
});

const ResolveHepsiburadaClaimSchema = z.object({
  action: z.literal('resolve_hepsiburada_claim'),
  claimId: z.string().max(160).optional(),
  claimNumber: z.string().trim().min(1, 'Talep numarası zorunludur.').max(120),
  decision: z.enum(['accept', 'reject']),
  rejectionReason: z.string().max(200).optional(),
  merchantStatement: z.string().max(1000).optional()
});

const FetchHepsiburadaCargoLabelSchema = z.object({
  action: z.literal('fetch_hepsiburada_cargo_label'),
  packageNumber: z.string().trim().min(1, 'Paket numarası zorunludur.').max(120)
});

export const StateActionSchema = z.discriminatedUnion('action', [
  InspectXmlNodesSchema,
  SaveXmlSourceSchema,
  UpdateQuickPriceRulesSchema,
  SyncXmlSourceSchema,
  DeleteXmlSourceSchema,
  SaveProductSchema,
  AutoMatchCategoriesSchema,
  SaveCategoryMappingSchema,
  AutoMatchBrandsSchema,
  AutoMatchVariantsSchema,
  SaveMarketplaceAccountSchema,
  BulkPublishSchema,
  BulkUpdatePriceStockSchema,
  PullOrdersSchema,
  UpdateOrderSchema,
  UpdateTenantSettingsSchema,
  RunPriceRobotSchema,
  AddPriceRobotItemSchema,
  FetchLiveTrendyolSchema,
  ArchiveLiveTrendyolSchema,
  DeleteLiveTrendyolSchema,
  AdminUpdateTenantSchema,
  RunAiComplianceScanSchema,
  SearchHepsiburadaCategoriesSchema,
  FetchHepsiburadaCategoryAttributesSchema,
  FetchLiveHepsiburadaSchema,
  ToggleHepsiburadaListingsStateSchema,
  DeletePendingHepsiburadaSchema,
  ApproveHepsiburadaPreMatchSchema,
  CheckHepsiburadaImportStatusSchema,
  ReconcileHepsiburadaStatusSchema,
  PullMarketplaceClaimsSchema,
  ResolveHepsiburadaClaimSchema,
  FetchHepsiburadaCargoLabelSchema
]);

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Geçersiz istek verisi.';
  const path = first.path.length > 0 ? `${first.path.join('.')}: ` : '';
  return `Doğrulama hatası (${path}${first.message})`;
}
