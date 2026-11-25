import { Tenant, TenantGeneralSettings } from '@/types/sopyo';

export const CARGO_TEMPLATE_CODE_TO_NAME: Record<
  TenantGeneralSettings['customerCargoReceiptTemplateType'],
  Tenant['cargoLabelTemplate']
> = {
  '0': 'single',
  '2': 'double',
  '1': 'quad',
  '3': 'barcode',
  '4': 'argox'
};

export const CARGO_TEMPLATE_NAME_TO_CODE: Record<
  Tenant['cargoLabelTemplate'],
  TenantGeneralSettings['customerCargoReceiptTemplateType']
> = {
  single: '0',
  double: '2',
  quad: '1',
  barcode: '3',
  argox: '4'
};

export function createDefaultGeneralSettings(
  tenant?: Partial<Tenant>
): TenantGeneralSettings {
  const templateCode: TenantGeneralSettings['customerCargoReceiptTemplateType'] =
    tenant?.cargoLabelTemplate && CARGO_TEMPLATE_NAME_TO_CODE[tenant.cargoLabelTemplate]
      ? CARGO_TEMPLATE_NAME_TO_CODE[tenant.cargoLabelTemplate]
      : '1'; // 4'lü Kargo Fişi (Sopyo LuneRose varsayılanı)

  return {
    // 1. Firma Ayarları
    customerLogo: '',
    customerSlogan: '',
    userMail: tenant?.companyEmail || 'zekihamdicinarr@gmail.com',

    // 2. Fatura Ayarları
    customerInvoiceCheck: false,
    customerInvoiceLastNumber: '0',
    customerTaxRate:
      tenant?.defaultVatRate !== undefined ? String(tenant.defaultVatRate) : '20',
    customerAutoInvoice: false,
    customerInvoiceMaskStatus: Boolean(tenant?.maskInvoiceProductNames ?? false),
    customerInvoiceMaskStockCode: '',
    customerInvoiceMaskProductName: tenant?.defaultMaskedProductName || '',
    customerInDateFaturaStatus: false,

    // 3. Ürün Listesi Ayarları
    productListSortType: '',
    productListPerPage: 20,
    productListBarcodeNoStatus: false,
    productListAddedDateStatus: false,

    // 4. Pazaryeri Ayarları
    customerUseMinPrice: false,
    customerAutoN11Confirm: false,
    customerHBWaitingOrderStatus: false,
    customerAutoAkakceConfirm: false,
    customerAutoPazaramaConfirm: false,
    customerUseMarketDesc: false,
    customerGGAutoReList: false,
    autoIdefixConfirm: false,

    // 5. Kargo Etiket Ayarları
    customerUseAdvancedCargoLabel: false,
    customerShowStockCargoReceipt: Boolean(tenant?.cargoLabelShowStock ?? false),
    customerShowProductCargoReceipt: Boolean(tenant?.cargoLabelShowProducts ?? true),
    customerShowPriceCargoReceipt: Boolean(tenant?.cargoLabelShowPrice ?? true),
    customerCargoReceiptBillingInfoShow: false,
    showDetailOrderReceipt: false,
    customerCargoReceiptTemplateType: templateCode,
    customerCargoReceiptStockCodeShow: Boolean(tenant?.cargoLabelShowSku ?? true),
    customerCargoReceiptCompanyAdressShow: false,
    customerCargoReceiptPhoneShow: false,
    customerCargoReceiptMailShow: false,
    customerOrderPaymentShow: false,
    customerOrderDescShow: false,
    customerCargoReceiptFontSize: String(tenant?.cargoLabelFontSize ?? 7.7),

    // 6. Fatura Açıklama Alanı Tanımları
    customerN11InvoiceDesc:
      'İş bu fatura tutarı n11 Elektronik Ticaret ve Bilişim Hizmetleri A.Ş. hesabına devredilmiştir.',
    customerGGInvoiceDesc:
      'İş bu fatura tutarı Gitti Gidiyor Bilgi Teknolojileri San. ve Tic. A.Ş. hesabına devredilmiştir.',
    customerHBInvoiceDesc:
      tenant?.hepsiburadaInvoiceNote ||
      'İş bu fatura tutarı D-Market Elektronik Hiz. ve Tic. A.Ş. hesabına devredilmiştir.',
    customerTrendyolInvoiceDesc:
      tenant?.trendyolInvoiceNote ||
      'İş bu fatura tutarı DSM Grup Danışmanlık İletişim ve Satış Tic.A.Ş hesabına devredilmiştir.',
    customerAkakceInvoiceDesc: '',
    customerCiceksepetiInvoiceDesc: '',
    customerPttavmInvoiceDesc: '',
    customerMorhipoInvoiceDesc: '',
    customerAmazonInvoiceDesc: '',
    customerPazaramaInvoiceDesc:
      'İş bu fatura tutarı Topkapı Danışmanlık Elektronik Hiz. Paz. Tic. A.Ş hesabına devredilmiştir.',
    customerIdefixInvoiceDesc: '',
    customerCargoReceiptDesc: '',

    // 7. Bildirim Ayarları
    notificationAlertStatus: true,
    notificationMailStatus: true,
    featureAlertStatus: true,
    packageAlertStatus: true,
    getProductAlertStatus: true,
    bulkPublishProductAlertStatus: true,
    bulkUpdateProductAlertStatus: true,
    xmlCheckAlertStatus: true,
    claimAlertStatus: false,
    aiHubReportAlertStatus: false,

    // 8. Ürün Ayarları
    combineProductCommonPrice: false
  };
}

export function mergeTenantGeneralSettings(tenant: Partial<Tenant>): TenantGeneralSettings {
  const defaults = createDefaultGeneralSettings(tenant);
  const incoming = tenant.generalSettings || ({} as Partial<TenantGeneralSettings>);
  const rawPerPage = Number(incoming.productListPerPage ?? defaults.productListPerPage);
  const productListPerPage: 20 | 50 | 100 =
    rawPerPage === 50 ? 50 : rawPerPage === 100 ? 100 : 20;

  return {
    ...defaults,
    ...incoming,
    productListPerPage
  };
}

export function syncLegacyTenantFields(
  tenant: Tenant,
  gs: TenantGeneralSettings
): Tenant {
  const parsedVat = Number(gs.customerTaxRate);
  const parsedFont = Number(String(gs.customerCargoReceiptFontSize || '7.7').replace(',', '.'));

  return {
    ...tenant,
    defaultVatRate: Number.isFinite(parsedVat) && gs.customerTaxRate !== '' ? parsedVat : tenant.defaultVatRate,
    maskInvoiceProductNames: Boolean(gs.customerInvoiceMaskStatus),
    defaultMaskedProductName: gs.customerInvoiceMaskProductName || tenant.defaultMaskedProductName || '',
    cargoLabelTemplate:
      CARGO_TEMPLATE_CODE_TO_NAME[gs.customerCargoReceiptTemplateType] || tenant.cargoLabelTemplate || 'quad',
    cargoLabelShowStock: Boolean(gs.customerShowStockCargoReceipt),
    cargoLabelShowProducts: Boolean(gs.customerShowProductCargoReceipt),
    cargoLabelShowPrice: Boolean(gs.customerShowPriceCargoReceipt),
    cargoLabelShowSku: Boolean(gs.customerCargoReceiptStockCodeShow),
    cargoLabelFontSize: Number.isFinite(parsedFont) && parsedFont > 0 ? parsedFont : 7.7,
    trendyolInvoiceNote: gs.customerTrendyolInvoiceDesc,
    hepsiburadaInvoiceNote: gs.customerHBInvoiceDesc,
    generalSettings: gs
  };
}
