'use client';

import React, { useMemo, useState } from 'react';
import { Tenant, TenantGeneralSettings } from '@/types/sopyo';
import { mergeTenantGeneralSettings } from '@/lib/general-settings';
import {
  LayoutGrid,
  User,
  Receipt,
  ListFilter,
  Store,
  Tag,
  FileText,
  Bell,
  Box,
  Search,
  Save,
  Upload,
  Check
} from 'lucide-react';

type SettingsFilterId =
  | 'all'
  | 'personel'
  | 'invoices'
  | 'productlist'
  | 'marketplace'
  | 'cargotag'
  | 'invoicesdesc'
  | 'notification'
  | 'productSettings';

interface GeneralSettingsPanelProps {
  tenantForm: Tenant;
  setTenantForm: React.Dispatch<React.SetStateAction<Tenant>>;
  onSave: () => Promise<void>;
  loading: boolean;
}

const SIDEBAR_ITEMS: {
  id: SettingsFilterId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'all', label: 'Tüm Ayarlar', icon: LayoutGrid },
  { id: 'personel', label: 'Firma Ayarları', icon: User },
  { id: 'invoices', label: 'Fatura Ayarları', icon: Receipt },
  { id: 'productlist', label: 'Ürün Listesi Ayarları', icon: ListFilter },
  { id: 'marketplace', label: 'Pazaryeri Ayarları', icon: Store },
  { id: 'cargotag', label: 'Kargo Etiket Ayarları', icon: Tag },
  { id: 'invoicesdesc', label: 'Fatura Açıklama Alanı Tanımları', icon: FileText },
  { id: 'notification', label: 'Bildirim Ayarları', icon: Bell },
  { id: 'productSettings', label: 'Ürün Ayarları', icon: Box }
];

export default function GeneralSettingsPanel({
  tenantForm,
  setTenantForm,
  onSave,
  loading
}: GeneralSettingsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<SettingsFilterId>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const gs = useMemo(() => mergeTenantGeneralSettings(tenantForm), [tenantForm]);

  const updateGs = <K extends keyof TenantGeneralSettings>(
    key: K,
    value: TenantGeneralSettings[K]
  ) => {
    setTenantForm((prev) => {
      const currentGs = mergeTenantGeneralSettings(prev);
      const nextGs: TenantGeneralSettings = {
        ...currentGs,
        [key]: value
      };
      const nextTenant: Tenant = {
        ...prev,
        generalSettings: nextGs
      };
      // Sync closely-coupled legacy fields immediately for live UI preview
      if (key === 'customerInvoiceMaskStatus') {
        nextTenant.maskInvoiceProductNames = Boolean(value);
      } else if (key === 'customerInvoiceMaskProductName') {
        nextTenant.defaultMaskedProductName = String(value);
      } else if (key === 'customerTaxRate' && value !== '') {
        nextTenant.defaultVatRate = Number(value);
      } else if (key === 'customerTrendyolInvoiceDesc') {
        nextTenant.trendyolInvoiceNote = String(value);
      } else if (key === 'customerHBInvoiceDesc') {
        nextTenant.hepsiburadaInvoiceNote = String(value);
      } else if (key === 'customerShowStockCargoReceipt') {
        nextTenant.cargoLabelShowStock = Boolean(value);
      } else if (key === 'customerShowProductCargoReceipt') {
        nextTenant.cargoLabelShowProducts = Boolean(value);
      } else if (key === 'customerShowPriceCargoReceipt') {
        nextTenant.cargoLabelShowPrice = Boolean(value);
      } else if (key === 'customerCargoReceiptStockCodeShow') {
        nextTenant.cargoLabelShowSku = Boolean(value);
      } else if (key === 'customerCargoReceiptFontSize') {
        const parsed = Number(String(value).replace(',', '.'));
        if (Number.isFinite(parsed) && parsed > 0) nextTenant.cargoLabelFontSize = parsed;
      } else if (key === 'customerCargoReceiptTemplateType') {
        const map: Record<string, Tenant['cargoLabelTemplate']> = {
          '0': 'single',
          '2': 'double',
          '1': 'quad',
          '3': 'barcode',
          '4': 'argox'
        };
        nextTenant.cargoLabelTemplate = map[String(value)] || 'quad';
      }
      return nextTenant;
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      alert('Logo dosyası 512 KB boyutundan küçük olmalıdır.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateGs('customerLogo', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const matches = (group: Exclude<SettingsFilterId, 'all'>, title: string, desc = '') => {
    if (activeFilter !== 'all' && activeFilter !== group) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLocaleLowerCase('tr-TR').trim();
    return (
      title.toLocaleLowerCase('tr-TR').includes(q) ||
      desc.toLocaleLowerCase('tr-TR').includes(q)
    );
  };

  const renderToggleRow = (params: {
    group: Exclude<SettingsFilterId, 'all'>;
    id: string;
    title: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    extraContent?: React.ReactNode;
  }) => {
    if (!matches(params.group, params.title, params.description)) return null;
    return (
      <li key={params.id} className="py-4 px-5 hover:bg-slate-50/70 transition">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <label htmlFor={params.id} className="md:col-span-7 cursor-pointer">
            <div className="text-sm font-bold text-slate-800">{params.title}</div>
            {params.description && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {params.description}
              </p>
            )}
          </label>
          <div className="md:col-span-5 flex md:justify-end items-center pt-0.5">
            <label
              htmlFor={params.id}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-bold cursor-pointer select-none transition ${
                params.checked
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                id={params.id}
                type="checkbox"
                checked={params.checked}
                onChange={(e) => params.onChange(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <span>{params.checked ? 'Ayarı Kapat' : 'Ayarı Aç'}</span>
            </label>
          </div>
        </div>
        {params.extraContent}
      </li>
    );
  };

  const renderTextRow = (params: {
    group: Exclude<SettingsFilterId, 'all'>;
    id: string;
    title: string;
    description?: string;
    type?: string;
    value: string;
    onChange: (val: string) => void;
    required?: boolean;
    placeholder?: string;
    helperNote?: string;
  }) => {
    if (!matches(params.group, params.title, params.description)) return null;
    return (
      <li key={params.id} className="py-4 px-5 hover:bg-slate-50/70 transition">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label htmlFor={params.id} className="md:col-span-5">
            <div className="text-sm font-bold text-slate-800">
              {params.title} {params.required && <span className="text-rose-500">*</span>}
            </div>
            {params.description && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {params.description}
              </p>
            )}
          </label>
          <div className="md:col-span-7">
            <input
              id={params.id}
              type={params.type || 'text'}
              value={params.value}
              onChange={(e) => params.onChange(e.target.value)}
              placeholder={params.placeholder}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {params.helperNote && (
              <div className="text-[11px] text-slate-400 mt-1">{params.helperNote}</div>
            )}
          </div>
        </div>
      </li>
    );
  };

  const renderSelectRow = (params: {
    group: Exclude<SettingsFilterId, 'all'>;
    id: string;
    title: string;
    description?: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
  }) => {
    if (!matches(params.group, params.title, params.description)) return null;
    return (
      <li key={params.id} className="py-4 px-5 hover:bg-slate-50/70 transition">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label htmlFor={params.id} className="md:col-span-5">
            <div className="text-sm font-bold text-slate-800">{params.title}</div>
            {params.description && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {params.description}
              </p>
            )}
          </label>
          <div className="md:col-span-7">
            <select
              id={params.id}
              value={params.value}
              onChange={(e) => params.onChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {params.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </li>
    );
  };

  const showNotificationEventsHeader =
    (activeFilter === 'all' || activeFilter === 'notification') &&
    (!searchTerm.trim() ||
      'olaylar duyuru yenilik paket ürün çekim toplu xml iade ai hub'.includes(
        searchTerm.toLocaleLowerCase('tr-TR').trim()
      ));

  return (
    <div className="space-y-4">
      {/* Üst Başlık ve Arama Barı (#SopyoSearch) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Genel Ayarlar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sopyo Firma, Fatura, Ürün Listesi, Pazaryeri, Kargo Etiketi, Bildirim ve Ürün Ayarları (9 Sekme / 65 Ayar)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="SopyoSearch"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ayarlarda ara..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Kaydediliyor...' : 'AYARLARI KAYDET →'}
          </button>
        </div>
      </div>

      {/* Sopyo 2 Kolonlu Düzen: Mobilde Yatay Sekme Şeridi, Masaüstünde Sol 9 Sekme + Sağ Ayarlar Listesi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* SOL KATEGORİ MENÜSÜ */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 sm:p-3 shadow-sm lg:sticky lg:top-20">
          <ul className="flex lg:block overflow-x-auto no-scrollbar gap-1.5 lg:space-y-1 pb-0.5 lg:pb-0">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setActiveFilter(item.id)}
                    className={`lg:w-full min-h-[40px] px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 sm:gap-2.5 whitespace-nowrap lg:whitespace-normal transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-slate-50 lg:bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* SAĞ AYARLAR FORMU */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {/* ==================== 1. FİRMA AYARLARI (8 Alan) ==================== */}
            {matches('personel', 'Firma Logosu:', 'Logo yükleme görsel') && (
              <li className="py-4 px-5 hover:bg-slate-50/70 transition">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <label className="md:col-span-5 text-sm font-bold text-slate-800">
                    Firma Logosu:
                  </label>
                  <div className="md:col-span-7 flex flex-wrap items-center gap-3">
                    {gs.customerLogo ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={gs.customerLogo}
                          alt="Firma Logosu"
                          className="h-12 w-auto max-w-[140px] object-contain rounded-lg border border-slate-200 p-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => updateGs('customerLogo', '')}
                          className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Kaldır
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Logo yüklenmedi</span>
                    )}
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Logo Seç
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </li>
            )}

            {renderTextRow({
              group: 'personel',
              id: 'customerSlogan',
              title: 'Slogan:',
              value: gs.customerSlogan,
              onChange: (v) => updateGs('customerSlogan', v),
              placeholder: 'Firma sloganı'
            })}

            {renderTextRow({
              group: 'personel',
              id: 'customerName',
              title: 'Firma Adı :',
              required: true,
              value: tenantForm.name,
              onChange: (v) => setTenantForm((p) => ({ ...p, name: v }))
            })}

            {renderTextRow({
              group: 'personel',
              id: 'customerPhone',
              title: 'Telefon:',
              required: true,
              type: 'tel',
              value: tenantForm.companyPhone,
              onChange: (v) => setTenantForm((p) => ({ ...p, companyPhone: v })),
              helperNote: "Güvenlik kodları bu numaraya gelir."
            })}

            {renderTextRow({
              group: 'personel',
              id: 'customerMail',
              title: 'Bilgilendirme E-posta Adresi:',
              type: 'email',
              value: tenantForm.companyEmail,
              onChange: (v) => setTenantForm((p) => ({ ...p, companyEmail: v }))
            })}

            {renderTextRow({
              group: 'personel',
              id: 'userMail',
              title: 'Kullanıcı Giriş E-posta Adresi:',
              required: true,
              type: 'email',
              value: gs.userMail,
              onChange: (v) => updateGs('userMail', v)
            })}

            {renderTextRow({
              group: 'personel',
              id: 'customerAddress',
              title: 'Firma Adresi:',
              value: tenantForm.companyAddress,
              onChange: (v) => setTenantForm((p) => ({ ...p, companyAddress: v }))
            })}

            {renderTextRow({
              group: 'personel',
              id: 'customerWebsite',
              title: 'Firma Websitesi:',
              value: tenantForm.companyWebsite,
              onChange: (v) => setTenantForm((p) => ({ ...p, companyWebsite: v }))
            })}

            {/* ==================== 2. FATURA AYARLARI (8 Alan) ==================== */}
            {renderToggleRow({
              group: 'invoices',
              id: 'customerInvoiceCheck',
              title: 'Fatura No Takibi Yapılsın Mı?:',
              description:
                'İlgili ayar aktif hale getirilirse Son Yazdırılan Fatura No alanına girmiş olduğunuz değer otomatik olarak arttırılmaya başlar.',
              checked: gs.customerInvoiceCheck,
              onChange: (c) => updateGs('customerInvoiceCheck', c)
            })}

            {renderTextRow({
              group: 'invoices',
              id: 'customerInvoiceLastNumber',
              title: 'Son Yazdırılan Fatura No:',
              description:
                'Fatura no takibi yapmak için Fatura No Takibi Yapılsın Mı? seçeneğinin seçili olduğundan emin olunuz.',
              value: gs.customerInvoiceLastNumber,
              onChange: (v) => updateGs('customerInvoiceLastNumber', v)
            })}

            {renderSelectRow({
              group: 'invoices',
              id: 'customerTaxRate',
              title: 'Genel KDV Oranı',
              value: gs.customerTaxRate,
              options: [
                { value: '', label: '---' },
                { value: '20', label: '20' },
                { value: '18', label: '18' },
                { value: '10', label: '10' },
                { value: '8', label: '8' },
                { value: '2', label: '2' },
                { value: '1', label: '1' },
                { value: '0', label: '0' }
              ],
              onChange: (v) => updateGs('customerTaxRate', v)
            })}

            {renderToggleRow({
              group: 'invoices',
              id: 'customerAutoInvoice',
              title: 'Onaylı Siparişler Otomatik Olarak Fatura Listesine Aktarılsın mı?:',
              description:
                'Onaylamış olduğunuz siparişlerin otomatik olarak faturalandırma sekmesine aktarılmasını istiyorsanız ilgili ayarı aktif hale getirebilirsiniz.',
              checked: gs.customerAutoInvoice,
              onChange: (c) => updateGs('customerAutoInvoice', c)
            })}

            {renderToggleRow({
              group: 'invoices',
              id: 'customerInvoiceMaskStatus',
              title: 'Fatura kalemlerinde ürün isimleri maskelensin mi?:',
              description:
                'Satmış olduğunuz tüm ürünlerin faturada yer alan ürün isimlerini maskelemek istiyorsanız ilgili ayarı aktif hale getirebilirsiniz. İlgili ayarı aktif hale getirdikten sonra aşağıda açılan kutucuklara stok kodunuzu ve maske ürün adınızı girebilirsiniz.',
              checked: gs.customerInvoiceMaskStatus,
              onChange: (c) => updateGs('customerInvoiceMaskStatus', c),
              extraContent: gs.customerInvoiceMaskStatus ? (
                <div
                  id="invoiceMaskArea"
                  className="mt-4 p-4 rounded-xl bg-purple-50/80 border border-purple-200 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label
                      htmlFor="customerInvoiceMaskStockCode"
                      className="block text-xs font-bold text-purple-950 mb-1"
                    >
                      Stok Kodu:
                    </label>
                    <input
                      id="customerInvoiceMaskStockCode"
                      type="text"
                      value={gs.customerInvoiceMaskStockCode}
                      onChange={(e) => updateGs('customerInvoiceMaskStockCode', e.target.value)}
                      placeholder="Örn: MSK-001"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerInvoiceMaskProductName"
                      className="block text-xs font-bold text-purple-950 mb-1"
                    >
                      Ürün İsmi(Fatura Başlığı):
                    </label>
                    <input
                      id="customerInvoiceMaskProductName"
                      type="text"
                      value={gs.customerInvoiceMaskProductName}
                      onChange={(e) => updateGs('customerInvoiceMaskProductName', e.target.value)}
                      placeholder="Örn: Tekstil & Ev Giyim Ürünü"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-sm"
                    />
                  </div>
                </div>
              ) : null
            })}

            {renderToggleRow({
              group: 'invoices',
              id: 'customerInDateFaturaStatus',
              title: 'Fatura kesildiğinde, faturanın kesildiği zamanın tarihi kullanılsın mı?:',
              description:
                'Fatura kesme işleminizde faturanın kesildiği zamanın tarih ve saati otomatik olarak fatura kesilme tarihi olarak ekleyecektir.',
              checked: gs.customerInDateFaturaStatus,
              onChange: (c) => updateGs('customerInDateFaturaStatus', c)
            })}

            {/* ==================== 3. ÜRÜN LİSTESİ AYARLARI (4 Alan) ==================== */}
            {renderSelectRow({
              group: 'productlist',
              id: 'productListSortType',
              title: 'Ürünler Hangi Kurala Göre Sıralansın?:',
              description:
                'Ürünler sayfasında yer alan listedeki ürün sıralamanızı kendi belirlediğiniz şekilde ayarlayabilirsiniz.',
              value: gs.productListSortType,
              options: [
                { value: '', label: 'En Son Eklenen En Üstte' },
                { value: 'sortName-asc', label: 'Ürün Adı(A-Z)' },
                { value: 'sortName-desc', label: 'Ürün Adı(Z-A)' },
                { value: 'sortPrice-asc', label: 'Ürün Fiyatı(Küçükten Büyüğe)' },
                { value: 'sortPrice-desc', label: 'Ürün Fiyatı(Büyükten Küçüğe)' },
                { value: 'sortStok-asc', label: 'Ürün Stoğu(Küçükten Büyüğe)' },
                { value: 'sortStok-desc', label: 'Ürün Stoğu(Büyükten Küçüğe)' }
              ],
              onChange: (v) =>
                updateGs('productListSortType', v as TenantGeneralSettings['productListSortType'])
            })}

            {renderSelectRow({
              group: 'productlist',
              id: 'productListPerPage',
              title: 'Ürünler Kaç Adet Listelensin?:',
              description:
                'Ürünler sayfasında yer alan listedeki ürün sayısını kendi belirlediğiniz şekilde ayarlayabilirsiniz.',
              value: String(gs.productListPerPage),
              options: [
                { value: '20', label: '20' },
                { value: '50', label: '50' },
                { value: '100', label: '100' }
              ],
              onChange: (v) =>
                updateGs(
                  'productListPerPage',
                  (Number(v) === 50 ? 50 : Number(v) === 100 ? 100 : 20) as 20 | 50 | 100
                )
            })}

            {renderToggleRow({
              group: 'productlist',
              id: 'productListBarcodeNoStatus',
              title: 'Ürünler Listesinde Barkod Numarası Gösterilsin Mi?:',
              description:
                'Ürünler sayfasında yer alan listedeki ürün barkod numarası göstermek için ilgili ayarı açabilirsiniz.',
              checked: gs.productListBarcodeNoStatus,
              onChange: (c) => updateGs('productListBarcodeNoStatus', c)
            })}

            {renderToggleRow({
              group: 'productlist',
              id: 'productListAddedDateStatus',
              title: 'Ürünler Listesinde Eklenme Tarihi Gösterilsin Mi?:',
              description:
                'Ürünler sayfasındaki listede, kaynak bilgisinin altında ürünün eklenme tarihini göstermek için ilgili ayarı açabilirsiniz.',
              checked: gs.productListAddedDateStatus,
              onChange: (c) => updateGs('productListAddedDateStatus', c)
            })}

            {/* ==================== 4. PAZARYERİ AYARLARI (8 Alan) ==================== */}
            {renderToggleRow({
              group: 'marketplace',
              id: 'customerUseMinPrice',
              title: 'Minimum Fiyat Alanı Kullanılsın mı?:',
              description:
                'Ürün detay sayfasında yer alan fiyatlar bölümünde Minimum Fiyat kutucuğunu göstermek için ilgili ayarı açabilirsiniz.',
              checked: gs.customerUseMinPrice,
              onChange: (c) => updateGs('customerUseMinPrice', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerAutoN11Confirm',
              title: 'N11 Siparişleri Otomatik Onaylansın mı?:',
              description:
                "N11'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz.",
              checked: gs.customerAutoN11Confirm,
              onChange: (c) => updateGs('customerAutoN11Confirm', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerHBWaitingOrderStatus',
              title: 'Hepsiburada Onaylanmamış Siparişler Getirilsin mi?:',
              description:
                "Hepsiburada'dan gelen siparişlerinizi onaylamadan Sopyo panelinizde görmek istiyorsanız ilgili ayarı açabilirsiniz.",
              checked: gs.customerHBWaitingOrderStatus,
              onChange: (c) => updateGs('customerHBWaitingOrderStatus', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerAutoAkakceConfirm',
              title: 'Akakçe Siparişleri Otomatik Onaylansın mı?:',
              description:
                "Akakçe'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz.",
              checked: gs.customerAutoAkakceConfirm,
              onChange: (c) => updateGs('customerAutoAkakceConfirm', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerAutoPazaramaConfirm',
              title: 'Pazarama Siparişleri Otomatik Onaylansın mı?:',
              description:
                "Pazarama'dan gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz.",
              checked: gs.customerAutoPazaramaConfirm,
              onChange: (c) => updateGs('customerAutoPazaramaConfirm', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerUseMarketDesc',
              title: 'Her Pazaryeri İçin Farklı Ürün Açıklaması Girilebilsin Mi?:',
              description:
                'Her pazaryeri için birbirinden farklı açıklama girmek istiyorsanız ilgili ayarı açabilirsiniz.',
              checked: gs.customerUseMarketDesc,
              onChange: (c) => updateGs('customerUseMarketDesc', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'customerGGAutoReList',
              title: "Gittigidiyor'da Süresi Biten Ürünler Otomatik Yeniden Listelensin Mi?:",
              description:
                "Gittigidiyor'da süresi biten ilanlarınızın otomatik olarak yeniden listelenmesini istiyorsanız ilgili ayarı açabilirsiniz.",
              checked: gs.customerGGAutoReList,
              onChange: (c) => updateGs('customerGGAutoReList', c)
            })}

            {renderToggleRow({
              group: 'marketplace',
              id: 'autoIdefixConfirm',
              title: 'İdefix Siparişleri Otomatik Onaylansın mı?:',
              description:
                "İdefix'den gelen siparişlerinizi otomatik olarak onaylamak için ilgili ayarı açabilirsiniz.",
              checked: gs.autoIdefixConfirm,
              onChange: (c) => updateGs('autoIdefixConfirm', c)
            })}

            {/* ==================== 5. KARGO ETİKET AYARLARI (14 Alan) ==================== */}
            {renderToggleRow({
              group: 'cargotag',
              id: 'customerUseAdvancedCargoLabel',
              title: 'Gelişmiş Kargo Etiket Modülü Kullanılsın mı ? :',
              description: 'Kargo etiketlerinizi kendinize özel tasarlayabilirsiniz.',
              checked: gs.customerUseAdvancedCargoLabel,
              onChange: (c) => updateGs('customerUseAdvancedCargoLabel', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerShowStockCargoReceipt',
              title: 'Kargo Etiketinde Kalan Stok Gösterilsin Mi?:',
              description:
                'Kargo etiketinde yer alan ürünlerde kalan stok miktarının gösterilmesini sağlar.',
              checked: gs.customerShowStockCargoReceipt,
              onChange: (c) => updateGs('customerShowStockCargoReceipt', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerShowProductCargoReceipt',
              title: 'Kargo Etiketinde Ürünler gösterilsin Mi?:',
              description:
                'Kargo etiketinde yer alan bilgiler içerisinde ürünler gösterilmesini sağlar.',
              checked: gs.customerShowProductCargoReceipt,
              onChange: (c) => updateGs('customerShowProductCargoReceipt', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerShowPriceCargoReceipt',
              title: 'Kargo Etiketinde Ürün Fiyatı Gösterilsin Mi?:',
              description:
                'Kargo etiketinde yer alan ürünlerde fiyat alanının gösterilmesini sağlar.',
              checked: gs.customerShowPriceCargoReceipt,
              onChange: (c) => updateGs('customerShowPriceCargoReceipt', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerCargoReceiptBillingInfoShow',
              title: 'Kargo Etiketinde Fatura Bilgileri Gösterilsin Mi?:',
              description:
                'Kargo etiketinde müşterinin fatura bilgilerinin gösterilmesini sağlar.',
              checked: gs.customerCargoReceiptBillingInfoShow,
              onChange: (c) => updateGs('customerCargoReceiptBillingInfoShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'showDetailOrderReceipt',
              title: 'Fatura Listesinde Detaylı Sipariş Fişi Gösterilsin Mi?:',
              description:
                'Fatura listesinde detaylı sipariş fişi butonunu açmak için aktif hale getirebilirsiniz.',
              checked: gs.showDetailOrderReceipt,
              onChange: (c) => updateGs('showDetailOrderReceipt', c)
            })}

            {renderSelectRow({
              group: 'cargotag',
              id: 'customerCargoReceiptTemplateType',
              title: 'Bir Sayfada Kaç Adet Kargo Etiketi Yer Alsın?:',
              description:
                'Bir sayfada kaç adet kargo etiketi göstermek istiyorsanız, ilgili seçimi gerçekleştirebilirsiniz.',
              value: gs.customerCargoReceiptTemplateType,
              options: [
                { value: '0', label: 'Tek Kargo Fişi' },
                { value: '2', label: "2'li Kargo Fişi" },
                { value: '1', label: "4'lü Kargo Fişi" },
                { value: '3', label: 'Barkod Yazıcısı' },
                { value: '4', label: 'Argox Barkod Yazıcısı' }
              ],
              onChange: (v) =>
                updateGs(
                  'customerCargoReceiptTemplateType',
                  v as TenantGeneralSettings['customerCargoReceiptTemplateType']
                )
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerCargoReceiptStockCodeShow',
              title: 'Kargo Etiketinde Stok Kodu Gösterilsin Mi?:',
              description:
                'Kargo etiketinde yer alan ürünlerde stok kodunun gösterilmesini sağlar.',
              checked: gs.customerCargoReceiptStockCodeShow,
              onChange: (c) => updateGs('customerCargoReceiptStockCodeShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerCargoReceiptCompanyAdressShow',
              title: 'Kargo Etiketinde Gönderici Adresi Gösterilsin Mi?:',
              description: 'Kargo etiketinde gönderici adresinin gösterilmesini sağlar.',
              checked: gs.customerCargoReceiptCompanyAdressShow,
              onChange: (c) => updateGs('customerCargoReceiptCompanyAdressShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerCargoReceiptPhoneShow',
              title: 'Kargo Etiketinde Gönderici Telefonu Gösterilsin Mi?:',
              description:
                'Kargo etiketinde gönderici telefon bilgisinin gösterilmesini sağlar.',
              checked: gs.customerCargoReceiptPhoneShow,
              onChange: (c) => updateGs('customerCargoReceiptPhoneShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerCargoReceiptMailShow',
              title: 'Kargo Etiketinde Alıcı E-posta Gösterilsin Mi?:',
              description:
                'Kargo etiketinde alıcı e-posta bilgisinin gösterilmesini sağlar.',
              checked: gs.customerCargoReceiptMailShow,
              onChange: (c) => updateGs('customerCargoReceiptMailShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerOrderPaymentShow',
              title: 'Kargo Etiketinde Ödeme Bilgisi Gösterilsin Mi?:',
              description: 'Kargo etiketinde ödeme bilgisinin gösterilmesini sağlar.',
              checked: gs.customerOrderPaymentShow,
              onChange: (c) => updateGs('customerOrderPaymentShow', c)
            })}

            {renderToggleRow({
              group: 'cargotag',
              id: 'customerOrderDescShow',
              title: 'Kargo Etiketinde Sipariş Açıklaması Gösterilsin Mi?:',
              description: 'Kargo etiketinde sipariş açıklaması gösterilmesini sağlar.',
              checked: gs.customerOrderDescShow,
              onChange: (c) => updateGs('customerOrderDescShow', c)
            })}

            {renderTextRow({
              group: 'cargotag',
              id: 'customerCargoReceiptFontSize',
              title: 'Kargo Etiketi Yazı Tipi Büyüklüğü:',
              description: 'Kargo etiketindeki yazı boyutlarını belirlemenizi sağlar.',
              value: gs.customerCargoReceiptFontSize,
              onChange: (v) => updateGs('customerCargoReceiptFontSize', v),
              placeholder: '7.7'
            })}

            {/* ==================== 6. FATURA AÇIKLAMA ALANI TANIMLARI (12 Alan) ==================== */}
            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerN11InvoiceDesc',
              title: 'N11 Fatura Açıklaması:',
              value: gs.customerN11InvoiceDesc,
              onChange: (v) => updateGs('customerN11InvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerGGInvoiceDesc',
              title: 'Amazon Fatura Açıklaması (GG):',
              value: gs.customerGGInvoiceDesc,
              onChange: (v) => updateGs('customerGGInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerHBInvoiceDesc',
              title: 'Hepsiburada Fatura Açıklaması:',
              value: gs.customerHBInvoiceDesc,
              onChange: (v) => updateGs('customerHBInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerTrendyolInvoiceDesc',
              title: 'Trendyol Fatura Açıklaması:',
              value: gs.customerTrendyolInvoiceDesc,
              onChange: (v) => updateGs('customerTrendyolInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerAkakceInvoiceDesc',
              title: 'Akakçe Fatura Açıklaması:',
              value: gs.customerAkakceInvoiceDesc,
              onChange: (v) => updateGs('customerAkakceInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerCiceksepetiInvoiceDesc',
              title: 'Çiçeksepeti Fatura Açıklaması:',
              value: gs.customerCiceksepetiInvoiceDesc,
              onChange: (v) => updateGs('customerCiceksepetiInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerPttavmInvoiceDesc',
              title: 'Pttavm Fatura Açıklaması:',
              value: gs.customerPttavmInvoiceDesc,
              onChange: (v) => updateGs('customerPttavmInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerMorhipoInvoiceDesc',
              title: 'Morhipo Fatura Açıklaması:',
              value: gs.customerMorhipoInvoiceDesc,
              onChange: (v) => updateGs('customerMorhipoInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerAmazonInvoiceDesc',
              title: 'Amazon Fatura Açıklaması:',
              value: gs.customerAmazonInvoiceDesc,
              onChange: (v) => updateGs('customerAmazonInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerPazaramaInvoiceDesc',
              title: 'Pazarama Fatura Açıklaması:',
              value: gs.customerPazaramaInvoiceDesc,
              onChange: (v) => updateGs('customerPazaramaInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerIdefixInvoiceDesc',
              title: 'İdefix Fatura Açıklaması:',
              value: gs.customerIdefixInvoiceDesc,
              onChange: (v) => updateGs('customerIdefixInvoiceDesc', v)
            })}

            {renderTextRow({
              group: 'invoicesdesc',
              id: 'customerCargoReceiptDesc',
              title: 'Kargo Etiketi Özel Açıklama:',
              value: gs.customerCargoReceiptDesc,
              onChange: (v) => updateGs('customerCargoReceiptDesc', v),
              placeholder: 'Kargo fişinin alt kısmında görünecek özel not...'
            })}

            {/* ==================== 7. BİLDİRİM AYARLARI (10 Alan) ==================== */}
            {renderToggleRow({
              group: 'notification',
              id: 'notificationAlertStatus',
              title: 'Anlık Bildirimler gösterilsin mi?:',
              description:
                'Sopyo panelinde tüm bildirimleri görmek için aktif hale getirebilirsiniz.',
              checked: gs.notificationAlertStatus,
              onChange: (c) => updateGs('notificationAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'notificationMailStatus',
              title: 'Bildirimler E-Posta olarak gönderilsin mi?:',
              description:
                "Sopyo'ya gelen tüm bildirimleriniz E-Posta ile gönderilmesi için aktif hale getirebilirsiniz.",
              checked: gs.notificationMailStatus,
              onChange: (c) => updateGs('notificationMailStatus', c)
            })}

            {showNotificationEventsHeader && (
              <li className="py-2.5 px-5 bg-slate-50 border-y border-slate-200">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Olaylar
                </h4>
              </li>
            )}

            {renderToggleRow({
              group: 'notification',
              id: 'featureAlertStatus',
              title: 'Duyuru & Yenilikleri bildir:',
              description:
                'Sopyo sürekli gelişmektedir bu süreçte yapılan yenilikleri ve önemli bilgilendirmeleri size bildirim kanallarından iletilir.',
              checked: gs.featureAlertStatus,
              onChange: (c) => updateGs('featureAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'packageAlertStatus',
              title: 'Paket uyarılarını bildir:',
              description:
                "Sopyo'da kullanmış olduğunuz paketlerinizin kalan kullanım sürelerini ve yeni paketlerle alakalı bilgileri size bildirim kanallarından iletilir.",
              checked: gs.packageAlertStatus,
              onChange: (c) => updateGs('packageAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'getProductAlertStatus',
              title: 'Ürün çekim raporlarını bildir:',
              description:
                "Sopyo'ya dış kaynaktan ürün çekim işlemi tamamlandığında rapor bilgisi size bildirim kanallarından iletilir.",
              checked: gs.getProductAlertStatus,
              onChange: (c) => updateGs('getProductAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'bulkPublishProductAlertStatus',
              title: 'Toplu ürün gönderim raporlarını bildir:',
              description:
                "Sopyo'dan dış kaynaklara iletilen toplu ürün işlemi tamamlandığında rapor bilgisi size bildirim kanallarından iletilir.",
              checked: gs.bulkPublishProductAlertStatus,
              onChange: (c) => updateGs('bulkPublishProductAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'bulkUpdateProductAlertStatus',
              title: 'Toplu ürün güncelleme raporlarını bildir:',
              description:
                "Sopyo'da yapılan toplu ürün güncelleme işlemleri tamamlandığında rapor bilgisi size bildirim kanallarından iletilir.",
              checked: gs.bulkUpdateProductAlertStatus,
              onChange: (c) => updateGs('bulkUpdateProductAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'xmlCheckAlertStatus',
              title: 'XML kontrol raporlarını bildir:',
              description:
                "Sopyo'da tanımlamış olduğunuz XML kaynağınızın kontrolleri tamamlandığında rapor bilgisi size bildirim kanallarından iletilir.",
              checked: gs.xmlCheckAlertStatus,
              onChange: (c) => updateGs('xmlCheckAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'claimAlertStatus',
              title: 'İade geldiği zaman bildir:',
              description:
                'Desteklenen platformlardan iade geldiğinde bilgisi size bildirim kanallarından iletilir.',
              checked: gs.claimAlertStatus,
              onChange: (c) => updateGs('claimAlertStatus', c)
            })}

            {renderToggleRow({
              group: 'notification',
              id: 'aiHubReportAlertStatus',
              title: 'Ai hub işlem raporlarını bildir:',
              description:
                'Sopyo Ai Hub işlemlerinin raporları size bildirim kanallarından iletilir.',
              checked: gs.aiHubReportAlertStatus,
              onChange: (c) => updateGs('aiHubReportAlertStatus', c)
            })}

            {/* ==================== 8. ÜRÜN AYARLARI (1 Alan) ==================== */}
            {renderToggleRow({
              group: 'productSettings',
              id: 'combineProductCommonPrice',
              title: 'Gruplanmış ürünler için ortak fiyat uygulansın mı?:',
              checked: gs.combineProductCommonPrice,
              onChange: (c) => updateGs('combineProductCommonPrice', c)
            })}
          </ul>

          {/* Alt Sabit Kaydet Çubuğu */}
          <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              Kaydedilen ayarlar Ürünler, Siparişler ve Kargo Etiketlerine anında yansır.
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Kaydediliyor...' : 'AYARLARI KAYDET →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
