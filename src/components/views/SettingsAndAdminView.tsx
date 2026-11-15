'use client';

import React, { useState } from 'react';
import {
  MarketplaceAccount,
  OperationLog,
  Tenant,
  UserProfile
} from '@/types/sopyo';
import {
  Plug,
  Settings,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Save,
  EyeOff,
  Users,
  Building2,
  ArrowRightLeft
} from 'lucide-react';

interface SettingsAndAdminViewProps {
  initialTab?: 'integrations' | 'settings' | 'operations' | 'admin';
  marketplaceAccounts: MarketplaceAccount[];
  tenant: Tenant;
  operationLogs: OperationLog[];
  isSuperAdmin: boolean;
  allTenants: Tenant[];
  allUsers: Omit<UserProfile, 'password'>[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function SettingsAndAdminView({
  initialTab = 'integrations',
  marketplaceAccounts,
  tenant,
  operationLogs,
  isSuperAdmin,
  allTenants,
  allUsers,
  onRefresh,
  notify
}: SettingsAndAdminViewProps) {
  const [tab, setTab] = useState<'integrations' | 'settings' | 'operations' | 'admin'>(initialTab);
  const [loading, setLoading] = useState(false);

  const tyExisting = marketplaceAccounts.find((m) => m.marketplace === 'trendyol') || {
    id: 'mkt-ty',
    tenantId: tenant.id,
    marketplace: 'trendyol' as const,
    storeName: tenant.name,
    supplierOrMerchantId: '',
    apiKey: '',
    apiSecret: '',
    isActive: true,
    autoConfirmOrders: true,
    shipmentProviderId: '7',
    shipmentProviderName: 'Aras Kargo Marketplace',
    shipmentAddressId: '',
    shipmentAddressText: '',
    returningAddressId: '',
    returningAddressText: '',
    dispatchTimeHours: 24,
    hbOrderPullStatus: 'packageable' as const,
    stockCodeType: 'modelCode' as const,
    descriptionPrefixHtml: '',
    descriptionSuffixHtml: '',
    connectionStatus: 'disconnected' as const
  };

  const hbExisting = marketplaceAccounts.find((m) => m.marketplace === 'hepsiburada') || {
    id: 'mkt-hb',
    tenantId: tenant.id,
    marketplace: 'hepsiburada' as const,
    storeName: tenant.name,
    supplierOrMerchantId: '',
    apiKey: 'kodanka_dev',
    apiSecret: '',
    isActive: true,
    autoConfirmOrders: true,
    shipmentProviderId: 'aras',
    shipmentProviderName: 'Aras Kargo',
    shipmentAddressId: '',
    shipmentAddressText: '',
    returningAddressId: '',
    returningAddressText: '',
    dispatchTimeHours: 24,
    hbOrderPullStatus: 'packageable' as const,
    stockCodeType: 'supplierStockCode' as const,
    descriptionPrefixHtml: '',
    descriptionSuffixHtml: '',
    connectionStatus: 'disconnected' as const
  };

  const [tyForm, setTyForm] = useState<MarketplaceAccount>(tyExisting);
  const [hbForm, setHbForm] = useState<MarketplaceAccount>(hbExisting);
  const [tenantForm, setTenantForm] = useState<Tenant>(tenant);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    setTenantForm(tenant);
  }, [tenant]);

  const handleSaveMarketplace = async (account: MarketplaceAccount) => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_marketplace_account',
          account
        })
      });
      const data = await res.json();
      notify(data.message, data.ok ? 'success' : 'error');
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenantSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_tenant_settings',
          settings: tenantForm
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTenant = async (targetTenantId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_tenant',
          targetTenantId
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab('integrations')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'integrations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plug className="w-4 h-4" />
            Pazaryeri API Entegrasyonları (Trendyol + Hepsiburada)
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Genel Ayarlar & Gizli Paketleme
          </button>
          <button
            onClick={() => setTab('operations')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'operations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            İşlem Merkezi ({operationLogs.length})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                tab === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Süper Admin (Çoklu Mağaza & Kullanıcı Yönetimi)
            </button>
          )}
        </div>
      </div>

      {/* 1. PAZARYERİ API ENTEGRASYONLARI */}
      {tab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TRENDYOL KARTI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">Trendyol Mağaza API Ayarları</h3>
                <p className="text-xs text-orange-100 mt-0.5">
                  Ürün gönderimi, fiyat/stok eşitleme ve otomatik sipariş çekme
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mağaza Adı</label>
                  <input
                    type="text"
                    value={tyForm.storeName}
                    onChange={(e) => setTyForm({ ...tyForm, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Satıcı ID (Supplier ID)
                  </label>
                  <input
                    type="text"
                    value={tyForm.supplierOrMerchantId}
                    onChange={(e) =>
                      setTyForm({ ...tyForm, supplierOrMerchantId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">API Key</label>
                  <input
                    type="text"
                    value={tyForm.apiKey}
                    onChange={(e) => setTyForm({ ...tyForm, apiKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">API Secret</label>
                  <input
                    type="password"
                    value={tyForm.apiSecret}
                    onChange={(e) => setTyForm({ ...tyForm, apiSecret: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Kargo Firması
                  </label>
                  <input
                    type="text"
                    value={tyForm.shipmentProviderName}
                    onChange={(e) =>
                      setTyForm({ ...tyForm, shipmentProviderName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Sevkiyat Adres ID
                  </label>
                  <input
                    type="text"
                    value={tyForm.shipmentAddressId}
                    onChange={(e) => setTyForm({ ...tyForm, shipmentAddressId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    İade Adres ID
                  </label>
                  <input
                    type="text"
                    value={tyForm.returningAddressId}
                    onChange={(e) => setTyForm({ ...tyForm, returningAddressId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSaveMarketplace(tyForm)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Trendyol Ayarlarını Kaydet & Bağlantıyı Test Et
                </button>
              </div>
            </div>
          </div>

          {/* HEPSİBURADA KARTI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">Hepsiburada Mağaza API Ayarları</h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Merchant ID, Servis Anahtarı ve Katalog/Sipariş entegrasyonu
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
              </span>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mağaza Adı</label>
                  <input
                    type="text"
                    value={hbForm.storeName}
                    onChange={(e) => setHbForm({ ...hbForm, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Merchant ID (Mağaza Kodu)
                  </label>
                  <input
                    type="text"
                    value={hbForm.supplierOrMerchantId}
                    onChange={(e) =>
                      setHbForm({ ...hbForm, supplierOrMerchantId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Entegratör Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={hbForm.apiKey}
                    onChange={(e) => setHbForm({ ...hbForm, apiKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Servis Anahtarı (Service Key)
                  </label>
                  <input
                    type="password"
                    value={hbForm.apiSecret}
                    onChange={(e) => setHbForm({ ...hbForm, apiSecret: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Varsayılan Sevk Süresi (Saat)
                  </label>
                  <input
                    type="number"
                    value={hbForm.dispatchTimeHours}
                    onChange={(e) =>
                      setHbForm({ ...hbForm, dispatchTimeHours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Sipariş Çekme Durumu
                  </label>
                  <select
                    value={hbForm.hbOrderPullStatus}
                    onChange={(e) =>
                      setHbForm({ ...hbForm, hbOrderPullStatus: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    <option value="packageable">Paketlenebilir Siparişler</option>
                    <option value="ready_to_ship">Gönderime Hazır Siparişler</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSaveMarketplace(hbForm)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Hepsiburada Ayarlarını Kaydet & Bağlantıyı Test Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GENEL AYARLAR & GİZLİ PAKETLEME */}
      {tab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mağaza, Gizli Paketleme (Fatura Maskeleme) ve Kargo Şablonu Ayarları
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sopyo Genel Ayarlar (`/settings`) ekranındaki tüm özellikler
              </p>
            </div>
            <button
              onClick={handleSaveTenantSettings}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Ayarları Kaydet
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Firma & İletişim Bilgileri
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mağaza Adı</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-Posta</label>
                <input
                  type="text"
                  value={tenantForm.companyEmail}
                  onChange={(e) => setTenantForm({ ...tenantForm, companyEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Telefon</label>
                <input
                  type="text"
                  value={tenantForm.companyPhone}
                  onChange={(e) => setTenantForm({ ...tenantForm, companyPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-purple-700" />
                Gizli Paketleme / Fatura Ürün Adı Maskeleme
              </h4>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tenantForm.maskInvoiceProductNames}
                  onChange={(e) =>
                    setTenantForm({ ...tenantForm, maskInvoiceProductNames: e.target.checked })
                  }
                  className="rounded border-purple-300"
                />
                <span className="text-xs font-semibold text-purple-950">
                  Fatura ve Kargo Etiketlerinde Ürün Başlığını Gizle (Maskele)
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Varsayılan Maskeli Ürün Başlığı
                </label>
                <input
                  type="text"
                  value={tenantForm.defaultMaskedProductName}
                  onChange={(e) =>
                    setTenantForm({ ...tenantForm, defaultMaskedProductName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Varsayılan Kargo Etiketi Şablonu
                </label>
                <select
                  value={tenantForm.cargoLabelTemplate}
                  onChange={(e) =>
                    setTenantForm({ ...tenantForm, cargoLabelTemplate: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="single">A4 Tekli Kargo Etiketi</option>
                  <option value="double">A4 2&apos;li Kargo Etiketi</option>
                  <option value="quad">A4 4&apos;lü Kargo Etiketi</option>
                  <option value="barcode">Termal Barkod Yazıcı (10x10)</option>
                  <option value="argox">Argox Barkod Yazıcı</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. İŞLEM MERKEZİ */}
      {tab === 'operations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
            İşlem Merkezi & Senkronizasyon Logları (`/operations`)
          </div>
          <div className="divide-y divide-slate-200">
            {operationLogs.map((op) => (
              <div key={op.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {op.channel}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{op.summary}</span>
                  </div>
                  <div className="text-xs text-slate-600">{op.details}</div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {new Date(op.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SÜPER ADMİN (ÇOKLU KULLANICI & MAĞAZA YÖNETİMİ) */}
      {tab === 'admin' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="bg-purple-900 text-white rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-300" />
                SaaS Çoklu Mağaza & Kullanıcı Yönetimi (Süper Admin)
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                Sisteme `/login` sayfasından kayıt olan her yeni kullanıcı kendi izole mağaza alanına
                sahip olur, kendi XML linklerini ve Trendyol/Hepsiburada API anahtarlarını ekler.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kayıtlı Mağazalar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                Kayıtlı Mağazalar ({allTenants.length})
              </div>
              <div className="divide-y divide-slate-200">
                {allTenants.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {t.name}
                        {t.id === tenant.id && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            Aktif Mağaza
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Paket: {t.plan.toUpperCase()} | Limit: {t.maxXmlSources} XML /{' '}
                        {t.maxProducts} Ürün
                      </div>
                    </div>
                    {t.id !== tenant.id && (
                      <button
                        onClick={() => handleSwitchTenant(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Mağazaya Geç
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kayıtlı Kullanıcılar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Kayıtlı Kullanıcılar ({allUsers.length})
              </div>
              <div className="divide-y divide-slate-200">
                {allUsers.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{u.fullName}</div>
                      <div className="text-xs text-slate-500">
                        {u.email} • {u.phone}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
