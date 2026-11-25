'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { formatTrTime } from '@/lib/date-format';

function ViewLoader() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex items-center justify-center gap-3 text-sm font-semibold text-slate-500">
      <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      Bölüm yükleniyor...
    </div>
  );
}

const XmlView = dynamic(() => import('@/components/views/XmlView'), { loading: ViewLoader });
const ProductsView = dynamic(() => import('@/components/views/ProductsView'), { loading: ViewLoader });
const CatalogMappingsView = dynamic(() => import('@/components/views/CatalogMappingsView'), { loading: ViewLoader });
const BulkAndRobotView = dynamic(() => import('@/components/views/BulkAndRobotView'), { loading: ViewLoader });
const OrdersAndClaimsView = dynamic(() => import('@/components/views/OrdersAndClaimsView'), { loading: ViewLoader });
const SettingsAndAdminView = dynamic(() => import('@/components/views/SettingsAndAdminView'), { loading: ViewLoader });
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
  ChevronRight,
  Menu,
  X,
  Smartphone,
  Download
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
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    role: UserProfile['role'];
    tenantId: string;
  };
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  const navigateTo = useCallback((target: ActiveRoute) => {
    setRoute(target);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // PWA kısayol parametresini oku (?tab=orders|products|xml)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as ActiveRoute | null;
    if (tabParam && ['dashboard', 'orders', 'products', 'xml', 'settings', 'bulk_publish'].includes(tabParam)) {
      setRoute(tabParam);
    }

    // Standalone PWA kontrolü
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Service Worker kaydı
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Android / Desktop PWA yükleme istemi
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      setShowIosInstallHint((prev) => !prev);
    }
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json || !json.tenant || !Array.isArray(json.orders)) {
        const msg = json?.message || 'Panel verileri yüklenemedi.';
        setFetchError(msg);
        notify(msg, 'error');
        return;
      }
      setData(json);
    } catch (e) {
      console.error('State fetch error:', e);
      setFetchError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [router, notify]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const handleQuickSwitchTenant = async (targetTenantId: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_tenant', targetTenantId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        notify(json.message || 'Aktif mağaza değiştirildi.', 'success');
        await fetchState();
      } else {
        notify(json?.message || 'Mağaza değiştirilemedi.', 'error');
      }
    } catch (e) {
      console.error('Switch tenant error:', e);
      notify('Mağaza değiştirme sırasında bağlantı hatası oluştu.', 'error');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-surface text-slate-900 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white mx-auto flex items-center justify-center animate-pulse font-black text-xl shadow-sm">
            S
          </div>
          {fetchError ? (
            <>
              <div className="text-sm font-semibold text-rose-600">{fetchError}</div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    fetchState();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold cursor-pointer"
                >
                  Tekrar Dene
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/login')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Giriş Ekranı
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-slate-600">
              Sopyo Kurumsal XML &amp; Pazaryeri Entegrasyonu Yükleniyor...
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalRevenue = data.orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const mappedCatCount = data.categories.filter(
    (c) => c.trendyolStatus === 'mapped' && c.hepsiburadaStatus === 'mapped'
  ).length;
  const primaryXml = data.xmlSources[0];
  const tyAccount = data.marketplaceAccounts.find((m) => m.marketplace === 'trendyol');
  const hbAccount = data.marketplaceAccounts.find((m) => m.marketplace === 'hepsiburada');
  const displayUserName = data.currentUser?.fullName || data.tenant.name;
  const displayUserEmail = data.currentUser?.email || data.tenant.companyEmail;

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
    <div className="min-h-screen bg-surface flex overflow-x-clip">
      {/* iOS 26 PWA Üst Durum Çubuğu Sabit Beyaz Zemin (Beyaz sistem blur'unu görünmez kılar) */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-safe-top bg-white z-[55] lg:hidden pointer-events-none no-print"
      />

      {/* Sağ Üst Bildirim Toast (Mobil + iOS Notch uyumlu) */}
      {toast && (
        <div
          className={`fixed top-safe-offset inset-x-3 sm:inset-x-auto sm:top-5 sm:right-5 z-[60] sm:max-w-md px-4 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-semibold transition-all no-print ${
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
          <span className="leading-snug">{toast.msg}</span>
        </div>
      )}

      {/* Mobil Sol Menü Arka Plan Karartması */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed top-safe-drawer bottom-0 inset-x-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden no-print"
        />
      )}

      {/* SOL MENÜ (Masaüstünde Sabit, Mobilde Off-Canvas Çekmece - iOS Durum Çubuğunun Altında) */}
      <aside
        className={`fixed top-safe-drawer bottom-0 left-0 z-50 w-72 lg:w-64 bg-sidebar text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 pb-safe no-print ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo + Mobil Kapat Butonu */}
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
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Menüyü Kapat"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
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
              className="w-full px-2.5 py-2 rounded-lg !bg-slate-800 border border-slate-700 !text-white text-xs font-bold"
            >
              {data.allTenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-800 text-white">
                  {t.name} ({t.plan.toUpperCase()})
                </option>
              ))}
            </select>
          ) : (
            <div className="px-2.5 py-2 rounded-lg bg-slate-800/90 text-white text-xs font-bold flex items-center justify-between">
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
                        onClick={() => navigateTo(item.id)}
                        className={`w-full px-3 py-2.5 lg:py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
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

        {/* PWA Uygulamayı Yükle Butonu (Standalone değilse göster) */}
        {!isStandalone && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Uygulamayı Telefonuna Yükle
            </button>
            {showIosInstallHint && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-200 leading-relaxed">
                <strong>iPhone / Safari:</strong> Alt bardaki <strong>Paylaş (↑)</strong> butonuna basıp{' '}
                <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğine dokunun.
              </div>
            )}
          </div>
        )}

        {/* Alt Kullanıcı & Çıkış */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-white truncate">{displayUserName}</div>
            <div className="text-[11px] text-slate-400 truncate">
              {displayUserEmail}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Çıkış Yap / Kullanıcı Değiştir"
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* SAĞ ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col min-w-0 pt-mobile-header">
        {/* Üst Bar (Mobilde Sabit + Solid Beyaz Safe-Area, Masaüstünde Sticky) */}
        <header className="fixed top-0 inset-x-0 lg:sticky bg-white border-b border-slate-200 z-30 pt-safe no-print">
          <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menüyü Aç"
                className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {navItems.find((n) => n.id === route)?.label || 'Yönetim Paneli'}
              </h1>
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold shrink-0">
                Trendyol:{' '}
                {tyAccount?.supplierOrMerchantId
                  ? `#${tyAccount.supplierOrMerchantId} (${tyAccount.isActive ? 'Aktif' : 'Pasif'})`
                  : 'Tanımlanmadı'}
              </span>
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0">
                Hepsiburada:{' '}
                {hbAccount?.storeName
                  ? `${hbAccount.storeName} (${hbAccount.isActive ? 'Aktif' : 'Pasif'})`
                  : 'Tanımlanmadı'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {!isStandalone && deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Yükle</span>
                </button>
              )}
              <button
                onClick={() => navigateTo('xml')}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden md:inline">
                  XML: {primaryXml?.name || 'Tanımlı Değil'} ({primaryXml?.totalProductCount ?? data.products.length} Ürün)
                </span>
                <span className="md:hidden">XML</span>
              </button>
              <button
                onClick={() => router.push('/login')}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Hesap / Yeni Mağaza Kaydı
              </button>
            </div>
          </div>
        </header>

        {/* Sayfa İçeriği (Mobilde alt tab bar için pb-24 boşluk) */}
        <main className="p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6 flex-1 overflow-y-auto min-w-0">
          {/* YÖNETİM PANELİ (DASHBOARD) */}
          {route === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Üst Özet Kartları (Mobilde 2x2) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">
                    XML ({primaryXml?.name || 'Kaynak Yok'})
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 sm:mt-2">
                    {primaryXml?.totalProductCount ?? data.products.length} Ürün
                  </div>
                  <div className="text-[11px] sm:text-xs text-blue-600 font-semibold mt-1 line-clamp-2">
                    {primaryXml?.totalVariantCount ?? 0} Varyant • Ön Ek:{' '}
                    {primaryXml?.stockCodePrefix || '—'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">
                    KATEGORİ EŞİTLEME
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1.5 sm:mt-2">
                    {mappedCatCount} / {data.categories.length}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2">
                    Trendyol (+%105) & HB (+%120)
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">
                    TOPLAM CİRO
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 sm:mt-2">
                    {totalRevenue.toFixed(0)} TL
                  </div>
                  <div className="text-[11px] sm:text-xs text-emerald-600 font-semibold mt-1 line-clamp-2">
                    {data.orders.length} Sipariş • Stok Korumalı
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">
                    GİZLİ PAKETLEME
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-purple-700 mt-1.5 sm:mt-2">
                    {data.tenant.maskInvoiceProductNames ? 'Aktif' : 'Standart'}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
                    {data.tenant.defaultMaskedProductName || 'Varsayılan Başlık'}
                  </div>
                </div>
              </div>

              {/* Hızlı İşlem Kısayolları */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                      {data.tenant.name} Hızlı Operasyon Merkezi
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      {primaryXml?.name ? `${primaryXml.name} XML` : 'XML kaynağı'}
                      {tyAccount?.supplierOrMerchantId
                        ? `, Trendyol (#${tyAccount.supplierOrMerchantId})`
                        : ''}
                      {hbAccount?.storeName ? ` ve Hepsiburada (${hbAccount.storeName})` : ''} operasyon kısayolları:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-wrap gap-2">
                    <button
                      onClick={() => navigateTo('xml')}
                      className="px-4 py-3 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 shadow"
                    >
                      <FileCode2 className="w-4 h-4 shrink-0" />
                      1. Canlı XML Çek & Kurallar
                    </button>
                    <button
                      onClick={() => navigateTo('categories')}
                      className="px-4 py-3 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 shadow"
                    >
                      <Layers className="w-4 h-4 shrink-0" />
                      2. Kategorileri Eşitle
                    </button>
                    <button
                      onClick={() => navigateTo('bulk_publish')}
                      className="px-4 py-3 sm:py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 shadow"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      3. Toplu Ürün Gönder
                    </button>
                    <button
                      onClick={() => navigateTo('orders')}
                      className="px-4 py-3 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 shadow"
                    >
                      <Zap className="w-4 h-4 shrink-0" />
                      4. Sipariş & Kargo Fişi
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
                            {formatTrTime(log.createdAt)}
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
              key={data.tenant.id}
              xmlSources={data.xmlSources}
              xmlReports={data.xmlReports}
              onRefreshState={fetchState}
              notify={notify}
            />
          )}

          {/* ÜRÜN LİSTESİ */}
          {route === 'products' && (
            <ProductsView
              key={data.tenant.id}
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
              key={data.tenant.id}
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
              key={data.tenant.id}
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
              xmlSources={data.xmlSources}
              onRefresh={fetchState}
              notify={notify}
            />
          )}

          {/* SİPARİŞLER, İADELER, RAPORLAR */}
          {(route === 'orders' || route === 'claims' || route === 'reports') && (
            <OrdersAndClaimsView
              key={data.tenant.id}
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
              key={data.tenant.id}
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

        {/* MOBİL ALT HIZLI NAVİGASYON BARI (Başparmak Bölgesi - 5 Temel Sekme) */}
        <nav
          aria-label="Mobil Alt Menü"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-bottom-nav no-print"
        >
          <div className="grid grid-cols-5 h-16">
            {[
              { id: 'dashboard' as const, label: 'Panel', icon: LayoutDashboard },
              { id: 'orders' as const, label: 'Sipariş', icon: ShoppingBag, badge: data.orders.length },
              { id: 'products' as const, label: 'Ürünler', icon: Package },
              { id: 'xml' as const, label: 'XML', icon: FileCode2 }
            ].map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition relative ${
                    active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-blue-600" />
                  )}
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
                mobileMenuOpen ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span>Menü</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
