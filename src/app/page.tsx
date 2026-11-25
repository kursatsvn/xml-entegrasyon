'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import XmlView from '@/components/views/XmlView';
import ProductsView from '@/components/views/ProductsView';
import CatalogMappingsView from '@/components/views/CatalogMappingsView';
import BulkAndRobotView from '@/components/views/BulkAndRobotView';
import OrdersAndClaimsView from '@/components/views/OrdersAndClaimsView';
import SettingsAndAdminView from '@/components/views/SettingsAndAdminView';
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
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  RotateCcw,
  Package,
  Bot,
  Layers,
  Award,
  Tag,
  Sliders,
  FileCode2,
  Send,
  RefreshCw,
  GitCompare,
  Plug,
  Settings,
  Activity,
  ShieldCheck,
  LogOut,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ChevronRight
} from 'lucide-react';

type ActiveRoute =
  | 'dashboard'
  | 'reports'
  | 'orders'
  | 'claims'
  | 'products'
  | 'price_robot'
  | 'categories'
  | 'brands'
  | 'tags'
  | 'variants'
  | 'xml'
  | 'bulk_publish'
  | 'bulk_update'
  | 'diff_check'
  | 'integrations'
  | 'settings'
  | 'operations'
  | 'super_admin';

interface StatePayload {
  tenant: Tenant;
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
  isSuperAdmin: boolean;
  allTenants: Tenant[];
  allUsers: Omit<UserProfile, 'password'>[];
}

export default function SopyoCloneApp() {
  const router = useRouter();
  const [route, setRoute] = useState<ActiveRoute>('dashboard');
  const [data, setData] = useState<StatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('State fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    router.push('/login');
  };

  const handleQuickSwitchTenant = async (targetTenantId: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch_tenant', targetTenantId })
    });
    const json = await res.json();
    if (json.ok) {
      notify(json.message, 'success');
      await fetchState();
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center animate-pulse font-black text-xl">
            S
          </div>
          <div className="text-sm font-semibold text-slate-300">
            Sopyo Kurumsal XML & Pazaryeri Entegrasyonu Yükleniyor...
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = data.orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const mappedCatCount = data.categories.filter(
    (c) => c.trendyolStatus === 'mapped' && c.hepsiburadaStatus === 'mapped'
  ).length;
  const primaryXml = data.xmlSources[0];

  const navItems: {
    id: ActiveRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group: string;
    badge?: string | number;
  }[] = [
    { id: 'dashboard', label: 'Yönetim Paneli', icon: LayoutDashboard, group: 'GENEL' },
    { id: 'reports', label: 'Raporlar', icon: BarChart3, group: 'GENEL' },
    {
      id: 'orders',
      label: 'Siparişler ve Faturalar',
      icon: ShoppingBag,
      group: 'SİPARİŞ & LOJİSTİK',
      badge: data.orders.length
    },
    {
      id: 'claims',
      label: 'İade Yönetimi',
      icon: RotateCcw,
      group: 'SİPARİŞ & LOJİSTİK',
      badge: data.claims.length
    },
    {
      id: 'products',
      label: 'Ürün Listesi',
      icon: Package,
      group: 'ÜRÜN & KATALOG',
      badge: data.products.length
    },
    {
      id: 'xml',
      label: 'XML Kaynakları',
      icon: FileCode2,
      group: 'ÜRÜN & KATALOG',
      badge: data.xmlSources.length
    },
    {
      id: 'categories',
      label: 'Kategoriler',
      icon: Layers,
      group: 'ÜRÜN & KATALOG',
      badge: `${mappedCatCount}/${data.categories.length}`
    },
    {
      id: 'brands',
      label: 'Markalar',
      icon: Award,
      group: 'ÜRÜN & KATALOG',
      badge: data.brands.length
    },
    {
      id: 'variants',
      label: 'Seçenekler (Renk/Beden)',
      icon: Sliders,
      group: 'ÜRÜN & KATALOG'
    },
    { id: 'tags', label: 'Etiketler', icon: Tag, group: 'ÜRÜN & KATALOG' },
    {
      id: 'price_robot',
      label: 'Rekabet Robotu (Buybox)',
      icon: Bot,
      group: 'TOPLU İŞLEMLER & ROBOT'
    },
    {
      id: 'bulk_publish',
      label: 'Toplu Ürün Gönderimi',
      icon: Send,
      group: 'TOPLU İŞLEMLER & ROBOT'
    },
    {
      id: 'bulk_update',
      label: 'Toplu Ürün Güncelleme',
      icon: RefreshCw,
      group: 'TOPLU İŞLEMLER & ROBOT'
    },
    {
      id: 'diff_check',
      label: 'Ürün Farklılık Kontrolü',
      icon: GitCompare,
      group: 'TOPLU İŞLEMLER & ROBOT'
    },
    {
      id: 'integrations',
      label: 'Entegrasyonlar (TY & HB)',
      icon: Plug,
      group: 'AYARLAR & SİSTEM'
    },
    {
      id: 'settings',
      label: 'Genel Ayarlar',
      icon: Settings,
      group: 'AYARLAR & SİSTEM'
    },
    {
      id: 'operations',
      label: 'İşlem Merkezi',
      icon: Activity,
      group: 'AYARLAR & SİSTEM'
    }
  ];

  if (data.isSuperAdmin) {
    navItems.push({
      id: 'super_admin',
      label: 'Süper Admin (SaaS)',
      icon: ShieldCheck,
      group: 'AYARLAR & SİSTEM',
      badge: data.allTenants.length
    });
  }

  const groups = Array.from(new Set(navItems.map((i) => i.group)));

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sağ Üst Bildirim Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md px-4 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-700'
              : 'bg-rose-950 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* SOL MENÜ (SOPYO SIDEBAR) */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow">
              S
            </div>
            <div>
              <div className="text-white font-extrabold text-base tracking-tight leading-none">
                SOPYO <span className="text-blue-400 text-xs font-bold">PRO</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Trendyol & Hepsiburada SaaS
              </div>
            </div>
          </div>
        </div>

        {/* Aktif Mağaza Seçici (Multi-Tenant) */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-blue-400" /> AKTİF MAĞAZA (TENANT)
          </div>
          {data.allTenants.length > 1 ? (
            <select
              value={data.tenant.id}
              onChange={(e) => handleQuickSwitchTenant(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold"
            >
              {data.allTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan.toUpperCase()})
                </option>
              ))}
            </select>
          ) : (
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 text-white text-xs font-bold flex items-center justify-between">
              <span>{data.tenant.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                AKTİF
              </span>
            </div>
          )}
        </div>

        {/* Menü Linkleri */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => (
            <div key={grp}>
              <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {grp}
              </div>
              <div className="space-y-1">
                {navItems
                  .filter((i) => i.group === grp)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = route === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setRoute(item.id)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* Alt Kullanıcı & Çıkış */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-white truncate">Zeki Hamdi Çınar</div>
            <div className="text-[11px] text-slate-400 truncate">
              {data.tenant.companyEmail}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Çıkış Yap / Kullanıcı Değiştir"
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* SAĞ ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Üst Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-900">
              {navItems.find((n) => n.id === route)?.label || 'Yönetim Paneli'}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
              Trendyol: #1192080 (Aktif)
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              Hepsiburada: LuneRose (Aktif)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setRoute('xml')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
              XML: {primaryXml?.name || 'ariasclosetx'} ({primaryXml?.totalProductCount || 1648}{' '}
              Ürün)
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Hesap / Yeni Mağaza Kaydı
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="p-6 flex-1 overflow-y-auto">
          {/* YÖNETİM PANELİ (DASHBOARD) */}
          {route === 'dashboard' && (
            <div className="space-y-6">
              {/* Üst Özet Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    XML KAYNAĞI ({primaryXml?.name})
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {primaryXml?.totalProductCount || 1648} Ürün
                  </div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">
                    {primaryXml?.totalVariantCount || 7283} Varyant • Ön Ek:{' '}
                    {primaryXml?.stockCodePrefix || 'AX'} • Kritik Stok: &lt;=
                    {primaryXml?.criticalStockAmount || 3}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    KATEGORİ & VARYANT EŞİTLEME
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    {mappedCatCount} / {data.categories.length} Kategori
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Trendyol (+%105) & Hepsiburada (+%120) kuralları tanımlı
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    TOPLAM SİPARİŞ & CİRO
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {totalRevenue.toFixed(2)} TL
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    {data.orders.length} Sipariş • Otomatik Çapraz Stok Düşümü Aktif
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    GİZLİ PAKETLEME & FATURA
                  </div>
                  <div className="text-2xl font-black text-purple-700 mt-2">
                    {data.tenant.maskInvoiceProductNames ? 'Maskeleme Aktif' : 'Standart'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    Fatura Başlığı: {data.tenant.defaultMaskedProductName}
                  </div>
                </div>
              </div>

              {/* Hızlı İşlem Kısayolları */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      LuneRose Hızlı Operasyon Merkezi (Sopyo Birebir Klon)
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      `ariasclosetx` XML kaynağınız, Trendyol (`1192080`) ve Hepsiburada
                      (`fea9499f-...`) API bilgileriniz hazır. Tek tıkla işlem başlatabilirsiniz:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setRoute('xml')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <FileCode2 className="w-4 h-4" />
                      1. Canlı XML Çek & Fiyat Kuralları
                    </button>
                    <button
                      onClick={() => setRoute('categories')}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Layers className="w-4 h-4" />
                      2. Kategorileri Otomatik Eşitle
                    </button>
                    <button
                      onClick={() => setRoute('bulk_publish')}
                      className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-4 h-4" />
                      3. Trendyol & HB Toplu Ürün Gönder
                    </button>
                    <button
                      onClick={() => setRoute('orders')}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Zap className="w-4 h-4" />
                      4. Sipariş Çek & Stoktan Düş
                    </button>
                  </div>
                </div>
              </div>

              {/* Son Siparişler & Son İşlem Logları */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Son Siparişler & Çapraz Stok Düşümü
                    </h3>
                    <button
                      onClick={() => setRoute('orders')}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Tüm Siparişler <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.orders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            #{o.orderNumber} - {o.customerName}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {o.items[0]?.title} ({o.items[0]?.sku})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">
                            {o.totalAmount.toFixed(2)} TL
                          </div>
                          <div className="text-[11px] text-emerald-600 font-semibold">
                            Stok Düşüldü ({o.marketplace.toUpperCase()})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Son İşlem Merkezi Kayıtları
                    </h3>
                    <button
                      onClick={() => setRoute('operations')}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Tüm Kayıtlar <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.operationLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3.5 text-xs hover:bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.summary}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString('tr-TR')}
                          </span>
                        </div>
                        <div className="text-slate-500">{log.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* XML KAYNAKLARI */}
          {route === 'xml' && (
            <XmlView
              xmlSources={data.xmlSources}
              xmlReports={data.xmlReports}
              onRefreshState={fetchState}
              notify={notify}
            />
          )}

          {/* ÜRÜN LİSTESİ */}
          {route === 'products' && (
            <ProductsView
              products={data.products}
              categories={data.categories}
              tenant={data.tenant}
              onRefreshState={fetchState}
              notify={notify}
            />
          )}

          {/* KATEGORİLER, MARKALAR, SEÇENEKLER, ETİKETLER */}
          {(route === 'categories' ||
            route === 'brands' ||
            route === 'variants' ||
            route === 'tags') && (
            <CatalogMappingsView
              initialSection={route}
              categories={data.categories}
              brands={data.brands}
              variantGroups={data.variantGroups}
              tags={data.tags}
              onRefresh={fetchState}
              notify={notify}
            />
          )}

          {/* TOPLU İŞLEMLER & REKABET ROBOTU */}
          {(route === 'bulk_publish' ||
            route === 'bulk_update' ||
            route === 'diff_check' ||
            route === 'price_robot') && (
            <BulkAndRobotView
              initialTab={
                route === 'bulk_publish'
                  ? 'publish'
                  : route === 'bulk_update'
                  ? 'update'
                  : route === 'diff_check'
                  ? 'diff'
                  : 'robot'
              }
              batches={data.syncBatches}
              products={data.products}
              priceRobotItems={data.priceRobotItems}
              onRefresh={fetchState}
              notify={notify}
            />
          )}

          {/* SİPARİŞLER, İADELER, RAPORLAR */}
          {(route === 'orders' || route === 'claims' || route === 'reports') && (
            <OrdersAndClaimsView
              initialSection={route}
              orders={data.orders}
              claims={data.claims}
              tenant={data.tenant}
              onRefresh={fetchState}
              notify={notify}
            />
          )}

          {/* ENTEGRASYONLAR, GENEL AYARLAR, İŞLEM MERKEZİ, SÜPER ADMİN */}
          {(route === 'integrations' ||
            route === 'settings' ||
            route === 'operations' ||
            route === 'super_admin') && (
            <SettingsAndAdminView
              initialTab={
                route === 'integrations'
                  ? 'integrations'
                  : route === 'settings'
                  ? 'settings'
                  : route === 'operations'
                  ? 'operations'
                  : 'admin'
              }
              marketplaceAccounts={data.marketplaceAccounts}
              tenant={data.tenant}
              operationLogs={data.operationLogs}
              isSuperAdmin={data.isSuperAdmin}
              allTenants={data.allTenants}
              allUsers={data.allUsers}
              onRefresh={fetchState}
              notify={notify}
            />
          )}
        </main>
      </div>
    </div>
  );
}
