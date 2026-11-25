'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PriceRobotItem, Product, SyncBatch, XmlSource } from '@/types/sopyo';
import { apiPost } from '@/lib/api-client';
import {
  Send,
  RefreshCw,
  GitCompare,
  Bot,
  AlertCircle,
  CheckCircle2,
  Plus,
  Play,
  FileWarning,
  Trash2,
  CloudDownload,
  X
} from 'lucide-react';

interface LiveTrendyolItem {
  barcode: string;
  productMainId: string;
  stockCode: string;
  title: string;
  brand: string;
  categoryName: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
  approved: boolean;
  onSale: boolean;
  archived: boolean;
  rejected: boolean;
  blacklisted: boolean;
  blacklistReason?: string;
  imageUrl: string;
  lastUpdateDate?: number;
}

interface BulkAndRobotViewProps {
  initialTab?: 'publish' | 'update' | 'diff' | 'robot' | 'trendyol_live';
  batches: SyncBatch[];
  products: Product[];
  priceRobotItems: PriceRobotItem[];
  xmlSources?: XmlSource[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function BulkAndRobotView({
  initialTab = 'publish',
  batches,
  products,
  priceRobotItems,
  xmlSources = [],
  onRefresh,
  notify
}: BulkAndRobotViewProps) {
  const [tab, setTab] = useState<'publish' | 'update' | 'diff' | 'robot' | 'trendyol_live'>(
    initialTab
  );
  const [selectedMarketplace, setSelectedMarketplace] = useState<
    'Tümü' | 'Trendyol' | 'Hepsiburada'
  >('Tümü');
  const [loading, setLoading] = useState(false);
  const [selectedBatchErrors, setSelectedBatchErrors] = useState<SyncBatch | null>(null);
  const [showAddRobotModal, setShowAddRobotModal] = useState(false);
  const [newRobotProductId, setNewRobotProductId] = useState(products[0]?.id || '');
  const [newRobotMarketplace, setNewRobotMarketplace] = useState<'trendyol' | 'hepsiburada'>(
    'trendyol'
  );
  const [newRobotMinPrice, setNewRobotMinPrice] = useState<number>(350);
  const [newRobotMaxPrice, setNewRobotMaxPrice] = useState<number>(650);
  const [newRobotStep, setNewRobotStep] = useState<number>(1);

  // XML Fiyat Ayarı (% Yüzde + Ekstra TL) state'leri (aktif mağazanın XML kaynağından senkronize)
  const primaryXmlRuleTy = xmlSources[0]?.marketplacePriceRules?.Trendyol?.[0];
  const primaryXmlRuleHb = xmlSources[0]?.marketplacePriceRules?.Hepsiburada?.[0];
  const [tyPercent, setTyPercent] = useState<number>(primaryXmlRuleTy?.ruleAmount ?? 105);
  const [tyExtraTl, setTyExtraTl] = useState<number>(primaryXmlRuleTy?.ruleExtraPrice ?? 75);
  const [hbPercent, setHbPercent] = useState<number>(primaryXmlRuleHb?.ruleAmount ?? 120);
  const [hbExtraTl, setHbExtraTl] = useState<number>(primaryXmlRuleHb?.ruleExtraPrice ?? 80);
  const [sampleXmlPrice, setSampleXmlPrice] = useState<number>(200);
  const [savingPriceRules, setSavingPriceRules] = useState(false);

  useEffect(() => {
    const tyRule = xmlSources[0]?.marketplacePriceRules?.Trendyol?.[0];
    const hbRule = xmlSources[0]?.marketplacePriceRules?.Hepsiburada?.[0];
    if (tyRule) {
      setTyPercent(tyRule.ruleAmount);
      setTyExtraTl(tyRule.ruleExtraPrice);
    }
    if (hbRule) {
      setHbPercent(hbRule.ruleAmount);
      setHbExtraTl(hbRule.ruleExtraPrice);
    }
  }, [xmlSources]);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === newRobotProductId)) {
      setNewRobotProductId(products[0].id);
    } else if (products.length === 0 && newRobotProductId !== '') {
      setNewRobotProductId('');
    }
  }, [products, newRobotProductId]);

  const handleApplyQuickPriceRules = async () => {
    setSavingPriceRules(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_quick_price_rules',
          trendyolPercent: tyPercent,
          trendyolExtraTl: tyExtraTl,
          hepsiburadaPercent: hbPercent,
          hepsiburadaExtraTl: hbExtraTl
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      } else {
        notify(data.message || 'Fiyat kuralları kaydedilemedi', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'Fiyat güncelleme hatası', 'error');
    } finally {
      setSavingPriceRules(false);
    }
  };

  // Canlı Trendyol Ürün Listeleme & Silme state'leri
  const [tyItems, setTyItems] = useState<LiveTrendyolItem[]>([]);
  const [tyFilter, setTyFilter] = useState<
    'all' | 'on_sale' | 'passive' | 'archived' | 'unapproved' | 'blacklisted'
  >('archived');
  const [tyPage, setTyPage] = useState<number>(0);
  const [tyTotalPages, setTyTotalPages] = useState<number>(1);
  const [tyStats, setTyStats] = useState({
    totalElements: 0,
    approvedTotal: 0,
    onSaleTotal: 0,
    passiveTotal: 0,
    archivedTotal: 0,
    unapprovedTotal: 0,
    blacklistedTotal: 0
  });
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [tyLoading, setTyLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadLiveTrendyolProducts = useCallback(
    async (
      page = 0,
      filter:
        | 'all'
        | 'on_sale'
        | 'passive'
        | 'archived'
        | 'unapproved'
        | 'blacklisted' = tyFilter
    ) => {
      setTyLoading(true);
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fetch_live_trendyol_products',
            page,
            size: 50,
            filter
          })
        });
        const data = await res.json();
        if (data.ok) {
          setTyItems(data.items || []);
          setTyPage(data.page || 0);
          setTyTotalPages(data.totalPages || 1);
          setTyStats({
            totalElements: data.totalElements || 0,
            approvedTotal: data.approvedTotal || 0,
            onSaleTotal: data.onSaleTotal || 0,
            passiveTotal: data.passiveTotal || 0,
            archivedTotal: data.archivedTotal || 0,
            unapprovedTotal: data.unapprovedTotal || 0,
            blacklistedTotal: data.blacklistedTotal || 0
          });
          setSelectedBarcodes([]);
        } else {
          notify(data.message || 'Trendyol ürünleri çekilemedi', 'error');
        }
      } catch (e: any) {
        notify(e?.message || 'Trendyol API hatası', 'error');
      } finally {
        setTyLoading(false);
      }
    },
    [tyFilter, notify]
  );

  useEffect(() => {
    if (tab === 'trendyol_live') {
      loadLiveTrendyolProducts(0, tyFilter);
    }
  }, [tab, tyFilter, loadLiveTrendyolProducts]);

  // 1. ADIM: ÖNCE ARŞİVLE (Arşivlenen ürünler Pasif listesinden çıkar ve Arşiv sekmesine taşınır)
  const handleArchiveTrendyolProducts = async (
    archiveMode: 'selected' | 'on_sale' | 'passive' | 'all_unarchived'
  ) => {
    if (archiveMode === 'selected' && selectedBarcodes.length === 0) {
      notify('Lütfen önce arşivlemek istediğiniz ürünleri tablodan seçin.', 'error');
      return;
    }

    setTyLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive_live_trendyol_products',
          barcodes: selectedBarcodes,
          archiveMode
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        setTyFilter('archived');
        await loadLiveTrendyolProducts(0, 'archived');
        await onRefresh();
      } else {
        notify(data.message || 'Arşivleme işlemi başarısız oldu', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'Arşivleme hatası', 'error');
    } finally {
      setTyLoading(false);
    }
  };

  // 2. ADIM: ARŞİVLENDİKTEN SONRA KALICI OLARAK SİL
  const handleDeleteTrendyolProducts = async (
    deleteAllMode:
      | 'selected'
      | 'on_sale'
      | 'passive'
      | 'archived'
      | 'unapproved'
      | 'blacklisted'
      | 'approved'
      | 'all'
  ) => {
    if (deleteAllMode === 'selected' && selectedBarcodes.length === 0) {
      notify('Lütfen silmek istediğiniz arşivlenmiş ürünleri tablodan seçin.', 'error');
      return;
    }

    const confirmText =
      deleteAllMode === 'selected'
        ? `Seçili ${selectedBarcodes.length} arşivlenmiş ürünü Trendyol'dan kalıcı olarak silmek istediğinize emin misiniz?`
        : deleteAllMode === 'archived'
        ? `Arşivdeki (${tyStats.archivedTotal.toLocaleString('tr-TR')} adet) ürünleri Trendyol'dan KALICI OLARAK SİLMEK istediğinize emin misiniz?`
        : deleteAllMode === 'blacklisted'
        ? `Kara listedeki (${tyStats.blacklistedTotal.toLocaleString('tr-TR')} adet) ürünleri kalıcı olarak silmek istediğinize emin misiniz?`
        : `Arşivlenmiş tüm ürünleri kalıcı olarak silmek istediğinize emin misiniz?`;

    if (!window.confirm(confirmText)) return;

    setTyLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_live_trendyol_products',
          barcodes: selectedBarcodes,
          deleteAllMode,
          maxPagesToDelete: 80
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await loadLiveTrendyolProducts(0, tyFilter);
        await onRefresh();
      } else {
        notify(data.message || 'Silme işlemi başarısız oldu', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'Silme hatası', 'error');
    } finally {
      setTyLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost('/api/state', {
        action: 'bulk_publish',
        marketplace: selectedMarketplace
      });
      if (res.ok) {
        notify(res.message, 'success');
        await onRefresh();
      } else {
        notify(res.message || 'Gönderim hatası', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost('/api/state', {
        action: 'bulk_update_price_stock',
        marketplace: selectedMarketplace
      });
      if (res.ok) {
        notify(res.message, 'success');
        await onRefresh();
      } else {
        notify(res.message || 'Güncelleme hatası', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunPriceRobot = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost('/api/state', { action: 'run_price_robot' });
      if (res.ok) {
        notify(res.message, 'success');
        await onRefresh();
      } else {
        notify(res.message || 'Fiyat robotu çalıştırılamadı.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRobotItem = async () => {
    if (!newRobotProductId || loading) return;
    setLoading(true);
    try {
      const res = await apiPost('/api/state', {
        action: 'add_price_robot_item',
        productId: newRobotProductId,
        marketplace: newRobotMarketplace,
        minFloorPrice: newRobotMinPrice,
        maxCeilingPrice: newRobotMaxPrice,
        stepAmount: newRobotStep
      });
      if (res.ok) {
        notify(res.message, 'success');
        setShowAddRobotModal(false);
        await onRefresh();
      } else {
        notify(res.message || 'Ürün fiyat robotuna eklenemedi.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Üst Sekmeler */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-4 shadow-sm">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 pb-0.5">
          <button
            onClick={() => setTab('publish')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              tab === 'publish'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4 shrink-0" />
            Toplu Gönderim
          </button>
          <button
            onClick={() => setTab('update')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              tab === 'update'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            Stok &amp; Fiyat Güncelleme
          </button>
          <button
            onClick={() => setTab('diff')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              tab === 'diff'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GitCompare className="w-4 h-4 shrink-0" />
            Farklılık Kontrolü
          </button>
          <button
            onClick={() => setTab('robot')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              tab === 'robot'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            Fiyat Robotu (Buybox)
          </button>
          <button
            onClick={() => setTab('trendyol_live')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              tab === 'trendyol_live'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            Trendyol Canlı &amp; Silme (API)
          </button>
        </div>
      </div>

      {/* 5. TRENDYOL CANLI ÜRÜNLERİ GÖRÜNTÜLE & SİL (1. ADIM ARŞİVLE -> 2. ADIM KALICI SİL) */}
      {tab === 'trendyol_live' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Canlı Sayaçlar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                TOPLAM ÜRÜN
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {tyStats.totalElements.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Satıcı ID: #1192080</div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">
                SATIŞTAKİ AKTİF
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {tyStats.onSaleTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Müşteriye açık (Stok &gt; 0)</div>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-rose-700 uppercase">
                PASİF (ARŞİVLENMEMİŞ)
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {tyStats.passiveTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">1. Adım: Önce arşivlenmeli</div>
            </div>

            <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-indigo-700 uppercase">
                ARŞİVDEKİ ÜRÜNLER
              </div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {tyStats.archivedTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">2. Adım: Silmeye hazır</div>
            </div>

            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-purple-700 uppercase">
                KARA LİSTE / ASKIDA
              </div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {tyStats.blacklistedTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Trendyol tarafından kapatılan</div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-amber-700 uppercase">
                ONAY BEKLEYEN
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {tyStats.unapprovedTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Katalog onayı bekleyen</div>
            </div>
          </div>

          {/* Filtre & 2 Aşamalı (Önce Arşivle -> Sonra Sil) Butonları */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex overflow-x-auto no-scrollbar items-center gap-2 pb-1">
              <button
                onClick={() => setTyFilter('all')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Tümü ({tyStats.totalElements.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => setTyFilter('on_sale')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'on_sale'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                Satıştaki ({tyStats.onSaleTotal.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => setTyFilter('passive')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'passive'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                Pasif ({tyStats.passiveTotal.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => setTyFilter('archived')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'archived'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                Arşiv ({tyStats.archivedTotal.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => setTyFilter('blacklisted')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'blacklisted'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-purple-50 text-purple-800 border-purple-200'
                }`}
              >
                Kara Liste ({tyStats.blacklistedTotal.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => setTyFilter('unapproved')}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  tyFilter === 'unapproved'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Onay Bekleyen ({tyStats.unapprovedTotal.toLocaleString('tr-TR')})
              </button>
              <button
                onClick={() => loadLiveTrendyolProducts(tyPage, tyFilter)}
                disabled={tyLoading}
                className="shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CloudDownload className={`w-4 h-4 ${tyLoading ? 'animate-bounce' : ''}`} />
                Yenile
              </button>
            </div>

            {/* 2 Aşamalı Akış: 1. Adım Önce Arşivle -> 2. Adım Arşivlendikten Sonra Sil */}
            {(() => {
              const selectedItems = tyItems.filter((i) => selectedBarcodes.includes(i.barcode));
              const hasUnarchivedSelection = selectedItems.some((i) => !i.archived);
              const hasArchivedSelection =
                selectedItems.length > 0 && selectedItems.every((i) => i.archived);
              const unarchivedTotalCount = tyStats.onSaleTotal + tyStats.passiveTotal;
              const canDeleteAllArchived =
                unarchivedTotalCount === 0 && tyStats.archivedTotal > 0;

              return (
                <div className="pt-3 border-t border-slate-200 flex flex-col gap-3">
                  <div className="text-xs font-semibold text-slate-700">
                    {unarchivedTotalCount > 0 ? (
                      <span className="text-amber-700">
                        ⚠️ Silme işlemi için önce <strong>1. Adım: Önce Arşivle</strong> butonunu
                        kullanın. Arşivlenen ürünler Pasif listesinden çıkıp Arşiv sekmesine geçer ve{' '}
                        <strong>2. Adım: Kalıcı Sil</strong> butonu aktif olur.
                      </span>
                    ) : (
                      <span className="text-emerald-700">
                        ✓ <strong>1. Adım Tamamlandı:</strong> Satıştaki ve Pasif ürünlerin tamamı
                        arşivlendi (Pasif: 0). Artık <strong>2. Adım: Kalıcı Olarak Sil</strong>{' '}
                        butonları aktif!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                    {/* SEÇİLİ ÜRÜNLER İÇİN 1. ADIM / 2. ADIM */}
                    {selectedBarcodes.length > 0 && (
                      <>
                        <button
                          onClick={() => handleArchiveTrendyolProducts('selected')}
                          disabled={tyLoading || !hasUnarchivedSelection}
                          className="min-h-[42px] px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          1. Adım: Seçili ({selectedBarcodes.length}) Ürünü Önce Arşivle
                        </button>
                        <button
                          onClick={() => handleDeleteTrendyolProducts('selected')}
                          disabled={tyLoading || !hasArchivedSelection}
                          title={
                            !hasArchivedSelection
                              ? 'Seçili ürünleri silmek için önce arşivlemelisiniz!'
                              : 'Arşivlenmiş seçili ürünleri kalıcı olarak sil'
                          }
                          className="min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          2. Adım: Seçili ({selectedBarcodes.length}) Arşivli Ürünü Sil
                        </button>
                      </>
                    )}

                    {/* TOPLU 1. ADIM: ÖNCE ARŞİVLE BUTONU */}
                    <button
                      onClick={() => handleArchiveTrendyolProducts('all_unarchived')}
                      disabled={tyLoading || unarchivedTotalCount === 0}
                      className="min-h-[42px] px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {unarchivedTotalCount > 0
                        ? `1. Adım: Aktif/Pasif Ürünleri Önce Arşivle (${unarchivedTotalCount})`
                        : '1. Adım: Tüm Ürünler Arşivlendi ✓'}
                    </button>

                    {/* TOPLU 2. ADIM: ARŞİVDEKİLERİ KALICI SİL BUTONU (Sadece Arşivlendikten Sonra Aktif) */}
                    <button
                      onClick={() => handleDeleteTrendyolProducts('archived')}
                      disabled={tyLoading || !canDeleteAllArchived}
                      title={
                        !canDeleteAllArchived
                          ? 'Önce 1. Adım ile tüm ürünleri arşivlemelisiniz'
                          : 'Arşivlenmiş tüm ürünleri kalıcı olarak sil'
                      }
                      className="min-h-[42px] px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      {unarchivedTotalCount > 0
                        ? '2. Adım: Sil (Önce Arşivleyin 🔒)'
                        : `2. Adım: Arşivdekileri Kalıcı Sil (${tyStats.archivedTotal.toLocaleString('tr-TR')})`}
                    </button>

                    {/* KARA LİSTEDEKİLERİ SİL BUTONU */}
                    <button
                      onClick={() => handleDeleteTrendyolProducts('blacklisted')}
                      disabled={tyLoading || tyStats.blacklistedTotal === 0}
                      className="min-h-[42px] px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      Kara Listedekileri Sil ({tyStats.blacklistedTotal.toLocaleString('tr-TR')})
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Canlı Ürün Listesi (Mobil Kartlar + Masaüstü Tablosu) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mobil Tümünü Seç Barı & Kartlar */}
            <div className="md:hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tyItems.length > 0 && selectedBarcodes.length === tyItems.length}
                    onChange={(e) =>
                      setSelectedBarcodes(
                        e.target.checked ? tyItems.map((i) => i.barcode) : []
                      )
                    }
                    className="w-4 h-4 rounded border-slate-300 accent-orange-600"
                  />
                  Bu Sayfadakilerin Tümünü Seç ({tyItems.length})
                </label>
                {selectedBarcodes.length > 0 && (
                  <span className="text-orange-600">{selectedBarcodes.length} seçili</span>
                )}
              </div>
              <div className="divide-y divide-slate-200">
                {tyItems.map((it, idx) => (
                  <div key={`m-${it.barcode}-${idx}`} className="p-4 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedBarcodes.includes(it.barcode)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBarcodes((prev) => [...prev, it.barcode]);
                          } else {
                            setSelectedBarcodes((prev) => prev.filter((b) => b !== it.barcode));
                          }
                        }}
                        className="w-4 h-4 mt-1 rounded border-slate-300 accent-orange-600 shrink-0"
                      />
                      {it.imageUrl && (
                        <Image
                          src={it.imageUrl}
                          alt={it.title}
                          width={48}
                          height={56}
                          unoptimized
                          className="w-12 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-xs line-clamp-2">
                          {it.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1 break-all">
                          {it.barcode} • {it.stockCode}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {it.brand} • {it.categoryName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                      <span className="font-extrabold text-orange-600">
                        {it.salePrice.toFixed(2)} TL
                      </span>
                      <span className="font-semibold text-slate-700">Stok: {it.quantity}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {it.onSale ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          Satışta
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                          Pasif
                        </span>
                      )}
                      {it.archived && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                          Arşivde
                        </span>
                      )}
                      {it.blacklisted && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                          Kara Liste
                        </span>
                      )}
                      {!it.approved && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                          Onay Bekliyor
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Masaüstü Tablosu */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          tyItems.length > 0 && selectedBarcodes.length === tyItems.length
                        }
                        onChange={(e) =>
                          setSelectedBarcodes(
                            e.target.checked ? tyItems.map((i) => i.barcode) : []
                          )
                        }
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="py-3.5 px-4">BARKOD & MODEL KODU</th>
                    <th className="py-3.5 px-4">ÜRÜN ADI</th>
                    <th className="py-3.5 px-4">MARKA & KATEGORİ</th>
                    <th className="py-3.5 px-4">STOK & FİYAT</th>
                    <th className="py-3.5 px-4">ONAY DURUMU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {tyItems.map((it, idx) => (
                    <tr key={`${it.barcode}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedBarcodes.includes(it.barcode)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBarcodes((prev) => [...prev, it.barcode]);
                            } else {
                              setSelectedBarcodes((prev) =>
                                prev.filter((b) => b !== it.barcode)
                              );
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {it.barcode}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Model: {it.productMainId} | SKU: {it.stockCode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {it.imageUrl && (
                            <Image
                              src={it.imageUrl}
                              alt={it.title}
                              width={40}
                              height={48}
                              unoptimized
                              className="w-10 h-12 object-cover rounded border border-slate-200 shrink-0"
                            />
                          )}
                          <span className="font-medium text-slate-900 text-xs line-clamp-2">
                            {it.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-bold text-slate-800">{it.brand}</div>
                        <div className="text-slate-500">{it.categoryName}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-bold text-orange-600">
                          {it.salePrice.toFixed(2)} TL
                        </div>
                        <div className="text-slate-600">Stok: {it.quantity}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {it.onSale ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              Satışta (Aktif)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                              Pasif (Satış Dışı)
                            </span>
                          )}
                          {it.archived && (() => {
                            const hoursInArchive = it.lastUpdateDate
                              ? (Date.now() - it.lastUpdateDate) / 3600000
                              : 0;
                            const remainingHours = Math.max(1, Math.ceil(24 - hoursInArchive));
                            const isReadyToDelete = hoursInArchive >= 24 && !it.blacklisted;
                            return (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  isReadyToDelete
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}
                              >
                                {isReadyToDelete
                                  ? 'Arşivde (>24 Saat • Silmeye Hazır ✓)'
                                  : `Arşivde (${remainingHours} saat sonra silinebilir ⏳)`}
                              </span>
                            );
                          })()}
                          {it.blacklisted && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                              Kara Liste{it.blacklistReason ? `: ${it.blacklistReason}` : ''}
                            </span>
                          )}
                          {!it.approved && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                              Onay Bekliyor
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <span>
                Sayfa {tyPage + 1} / {tyTotalPages} (50 varyant/sayfa)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={tyPage <= 0 || tyLoading}
                  onClick={() => loadLiveTrendyolProducts(tyPage - 1, tyFilter)}
                  className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold cursor-pointer"
                >
                  ← Önceki
                </button>
                <button
                  disabled={tyPage + 1 >= tyTotalPages || tyLoading}
                  onClick={() => loadLiveTrendyolProducts(tyPage + 1, tyFilter)}
                  className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold cursor-pointer"
                >
                  Sonraki →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOPLU ÜRÜN GÖNDERİMİ VE FİYAT AYARI (% YÜZDE + EKSTRA TL) */}
      {(tab === 'publish' || tab === 'update') && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                XML Fiyat Ayarı (Yüzde % Artış + Ekstra TL Ekleme)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                XML&apos;den gelen alış/baz fiyatın üzerine kanal bazlı <strong>% Yüzde</strong> ve
                ayrıca <strong>+ Ekstra TL (Kargo / Komisyon / Sabit Tutar)</strong> ekleyerek tüm
                ürünlerin satış fiyatını tek tıkla hesaplayın.
              </p>
            </div>
            <button
              onClick={handleApplyQuickPriceRules}
              disabled={savingPriceRules}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              {savingPriceRules
                ? 'Fiyatlar Hesaplanıyor...'
                : 'Fiyat Ayarını Kaydet & Tüm Ürünlere Uygula'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trendyol Fiyat Ayarı */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-3">
              <div className="font-bold text-orange-900 text-xs uppercase flex items-center justify-between">
                <span>TRENDYOL FİYAT FORMÜLÜ</span>
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-mono">
                  +%{tyPercent} + {tyExtraTl} ₺
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Yüzde Artış Oranı (+%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={tyPercent}
                      onChange={(e) => setTyPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-orange-300 bg-white text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ekstra Sabit Tutar (+TL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={tyExtraTl}
                      onChange={(e) => setTyExtraTl(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-orange-300 bg-white text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₺</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-orange-900 bg-white/80 px-3 py-2 rounded-lg border border-orange-200/80 font-medium">
                Örnek ({sampleXmlPrice} ₺ XML Fiyatı):{' '}
                <strong>
                  {sampleXmlPrice} ₺ + %{tyPercent} + {tyExtraTl} ₺ ={' '}
                  {(sampleXmlPrice * (1 + tyPercent / 100) + tyExtraTl).toFixed(2)} ₺
                </strong>
              </div>
            </div>

            {/* Hepsiburada Fiyat Ayarı */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="font-bold text-amber-900 text-xs uppercase flex items-center justify-between">
                <span>HEPSİBURADA FİYAT FORMÜLÜ</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                  +%{hbPercent} + {hbExtraTl} ₺
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Yüzde Artış Oranı (+%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={hbPercent}
                      onChange={(e) => setHbPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ekstra Sabit Tutar (+TL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={hbExtraTl}
                      onChange={(e) => setHbExtraTl(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">₺</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-amber-900 bg-white/80 px-3 py-2 rounded-lg border border-amber-200/80 font-medium">
                Örnek ({sampleXmlPrice} ₺ XML Fiyatı):{' '}
                <strong>
                  {sampleXmlPrice} ₺ + %{hbPercent} + {hbExtraTl} ₺ ={' '}
                  {(sampleXmlPrice * (1 + hbPercent / 100) + hbExtraTl).toFixed(2)} ₺
                </strong>
              </div>
            </div>

            {/* Canlı Simülasyon Test Kutusu */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-800 text-xs uppercase mb-2">
                  CANLI FİYAT SİMÜLASYONU
                </div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Test Edilecek XML Baz Fiyatı (₺)
                </label>
                <input
                  type="number"
                  value={sampleXmlPrice}
                  onChange={(e) => setSampleXmlPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold"
                />
              </div>
              <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trendyol Satış:</span>
                  <strong className="text-orange-700">
                    {(sampleXmlPrice * (1 + tyPercent / 100) + tyExtraTl).toFixed(2)} ₺
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hepsiburada Satış:</span>
                  <strong className="text-amber-700">
                    {(sampleXmlPrice * (1 + hbPercent / 100) + hbExtraTl).toFixed(2)} ₺
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOPLU ÜRÜN GÖNDERİMİ */}
      {tab === 'publish' && (
        <div className="space-y-6">
          {(() => {
            const zeroProds = products.filter(
              (p) => !p.salePrice || p.salePrice <= 0 || p.variants.some((v) => !v.salePrice || v.salePrice <= 0)
            );
            const zeroVarCount = products.reduce(
              (acc, p) => acc + p.variants.filter((v) => !v.salePrice || v.salePrice <= 0).length,
              0
            );
            if (zeroProds.length === 0) return null;
            return (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
                <div className="text-sm font-bold text-rose-900">
                  ⚠️ Dikkat: XML&apos;de Fiyatı 0,00 TL Olan {zeroProds.length} Ürün ({zeroVarCount} Varyant) Bulunuyor!
                </div>
                <p className="text-xs text-rose-800">
                  Fiyatı <strong>0,00 ₺</strong> olan ürün ve varyantlar toplu gönderim sırasında <strong>otomatik olarak engellenir ve pazaryerine gönderilmez</strong>. Bu ürünleri göndermek için lütfen <strong>Ürünler → Ürün Listesi</strong> sayfasından ilgili ürüne satış fiyatı giriniz.
                </p>
              </div>
            );
          })()}

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pazaryerlerine Toplu Ürün Gönderimi Başlat
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kategorisi, markası ve varyant seçenekleri eşitlenmiş ürünleri Trendyol ve
                Hepsiburada mağazalarınıza toplu olarak gönderir.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value as any)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium bg-white"
              >
                <option value="Tümü">Trendyol + Hepsiburada (Tümü)</option>
                <option value="Trendyol">Sadece Trendyol</option>
                <option value="Hepsiburada">Sadece Hepsiburada</option>
              </select>
              <button
                onClick={handleBulkPublish}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
                {loading ? 'Gönderiliyor...' : 'Toplu Ürün Gönderimini Başlat'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
              Toplu Gönderim Geçmişi (Sopyo Batch Kayıtları)
            </div>

            {/* Mobil Batch Kartları */}
            <div className="md:hidden divide-y divide-slate-200">
              {batches.map((b) => (
                <div key={`m-${b.id}`} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      #{b.batchNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                      {b.marketplace}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-700">{b.operationType}</div>
                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Toplam: {b.attemptedCount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Başarılı: {b.successCount}
                    </span>
                    {b.errorCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                        Hata: {b.errorCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {new Date(b.createdAt).toLocaleString('tr-TR')}
                    </span>
                    {b.errors && b.errors.length > 0 ? (
                      <button
                        onClick={() => setSelectedBatchErrors(b)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileWarning className="w-3.5 h-3.5" />
                        Hata ({b.errors.length})
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Hatasız
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">BATCH NO</th>
                    <th className="py-3.5 px-4">PAZARYERİ</th>
                    <th className="py-3.5 px-4">İŞLEM TÜRÜ</th>
                    <th className="py-3.5 px-4">DENENEN / BAŞARILI / HATA</th>
                    <th className="py-3.5 px-4">TARİH</th>
                    <th className="py-3.5 px-4 text-right">DETAY & RAPOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{b.batchNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                          {b.marketplace}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{b.operationType}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Toplam: {b.attemptedCount}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            Başarılı: {b.successCount}
                          </span>
                          {b.errorCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                              Hata: {b.errorCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(b.createdAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {b.errors && b.errors.length > 0 ? (
                          <button
                            onClick={() => setSelectedBatchErrors(b)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <FileWarning className="w-3.5 h-3.5" />
                            Hata Raporu ({b.errors.length})
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Hatasız Tamamlandı
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOPLU STOK & FİYAT GÜNCELLEME */}
      {tab === 'update' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pazaryeri Toplu Stok ve Fiyat Eşitleme
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                XML fiyat kuralları (`Trendyol +%105`, `Hepsiburada +%120`), kritik stok (`&lt;=3`
                ise `0`) ve düşülen sipariş stoklarına göre hesaplanan net stokları pazaryerlerine
                anında basar.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value as any)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium bg-white"
              >
                <option value="Tümü">Trendyol + Hepsiburada (Tümü)</option>
                <option value="Trendyol">Sadece Trendyol</option>
                <option value="Hepsiburada">Sadece Hepsiburada</option>
              </select>
              <button
                onClick={handleBulkUpdate}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                Stok &amp; Fiyatları Şimdi Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ÜRÜN FARKLILIK KONTROLÜ (diffCheck) */}
      {tab === 'diff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ürün Farklılık Kontrolü (Sopyo diffCheck)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                XML kaynağındaki güncel fiyat/stok ile Trendyol ve Hepsiburada&apos;daki yayında olan
                değerleri karşılaştırır.
              </p>
            </div>
            <button
              onClick={handleBulkUpdate}
              disabled={loading}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              Tüm Farklılıkları Pazaryerleriyle Eşitle
            </button>
          </div>

          {/* Mobil Diff Kartları */}
          <div className="md:hidden divide-y divide-slate-200">
            {products.slice(0, 30).map((p, idx) => (
              <div key={`mdiff-${p.id}-${idx}`} className="p-4 space-y-2">
                <div className="font-mono font-bold text-xs text-blue-700">{p.stockCode}</div>
                <div className="font-semibold text-slate-900 text-xs line-clamp-2">{p.title}</div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                    XML: {p.totalXmlStock}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 font-semibold text-amber-700">
                    Rezerve: {p.reservedOrderStock}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 font-bold text-emerald-700">
                    Net: {p.netAvailableStock}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-orange-50/70 border border-orange-100">
                    <div className="text-[10px] font-bold text-orange-700">TRENDYOL</div>
                    <div className="font-bold text-orange-600">
                      {p.trendyolSalePrice.toFixed(2)} TL
                    </div>
                    <div className="text-[10px] text-slate-500">{p.trendyolSyncStatus}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-800">HEPSİBURADA</div>
                    <div className="font-bold text-amber-700">
                      {p.hepsiburadaSalePrice.toFixed(2)} TL
                    </div>
                    <div className="text-[10px] text-slate-500">{p.hepsiburadaSyncStatus}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">STOK KODU</th>
                  <th className="py-3 px-4">ÜRÜN ADI</th>
                  <th className="py-3 px-4">XML STOK / REZERVE / NET</th>
                  <th className="py-3 px-4">TRENDYOL FİYAT & DURUM</th>
                  <th className="py-3 px-4">HEPSİBURADA FİYAT & DURUM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {products.slice(0, 30).map((p, idx) => (
                  <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.stockCode}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.title}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold text-slate-700">XML: {p.totalXmlStock}</span>
                      {' | '}
                      <span className="font-semibold text-amber-700">
                        Rezerve: {p.reservedOrderStock}
                      </span>
                      {' | '}
                      <span className="font-bold text-emerald-700">Net: {p.netAvailableStock}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-orange-600">
                        {p.trendyolSalePrice.toFixed(2)} TL
                      </div>
                      <div className="text-xs text-slate-500">Durum: {p.trendyolSyncStatus}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-700">
                        {p.hepsiburadaSalePrice.toFixed(2)} TL
                      </div>
                      <div className="text-xs text-slate-500">Durum: {p.hepsiburadaSyncStatus}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. FİYAT REKABET ROBOTU (BUYBOX) */}
      {tab === 'robot' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Trendyol &amp; Hepsiburada Buybox Fiyat Rekabet Robotu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Belirlediğiniz <strong>Dip Fiyat (Min)</strong> altına asla inmeden rakip mağaza
                fiyatlarını takip eder ve Buybox 1. sırayı kazanacak şekilde fiyatı otomatik
                günceller.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => setShowAddRobotModal(true)}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Robota Ürün Ekle
              </button>
              <button
                onClick={handleRunPriceRobot}
                disabled={loading}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Robotu Şimdi Çalıştır
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mobil Robot Kartları */}
            <div className="md:hidden divide-y divide-slate-200">
              {priceRobotItems.map((item) => (
                <div key={`mrobot-${item.id}`} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs line-clamp-2">
                        {item.productTitle}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {item.stockCode} •{' '}
                        <span className="uppercase font-bold text-orange-600">
                          {item.marketplace}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.buyboxRank === 1
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.buyboxRank}. Sıra
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">Fiyatımız</div>
                      <div className="font-bold text-slate-900">
                        {item.currentPrice.toFixed(2)} TL
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200">
                      <div className="text-[10px] text-blue-700">
                        Buybox ({item.competitorStore})
                      </div>
                      <div className="font-bold text-blue-700">
                        {item.buyboxPrice.toFixed(2)} TL
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-600 font-semibold">
                      Dip: {item.minFloorPrice.toFixed(2)} TL
                    </span>
                    <span className="text-emerald-700 font-semibold">
                      Tavan: {item.maxCeilingPrice.toFixed(2)} TL
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">ÜRÜN / STOK KODU</th>
                    <th className="py-3.5 px-4">PAZARYERİ</th>
                    <th className="py-3.5 px-4">MEVCUT FİYATIMIZ</th>
                    <th className="py-3.5 px-4">BUYBOX FİYATI</th>
                    <th className="py-3.5 px-4">DİP / TAVAN FİYAT</th>
                    <th className="py-3.5 px-4">BUYBOX SIRASI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {priceRobotItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.productTitle}</div>
                        <div className="text-xs font-mono text-slate-500">{item.stockCode}</div>
                      </td>
                      <td className="py-3.5 px-4 uppercase font-bold text-xs text-orange-600">
                        {item.marketplace}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.currentPrice.toFixed(2)} TL
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">
                        {item.buyboxPrice.toFixed(2)} TL
                        <div className="text-[11px] font-normal text-slate-500">
                          Rakip: {item.competitorStore}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-rose-600 font-semibold">
                          Dip: {item.minFloorPrice.toFixed(2)} TL
                        </span>
                        {' / '}
                        <span className="text-emerald-700 font-semibold">
                          Tavan: {item.maxCeilingPrice.toFixed(2)} TL
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.buyboxRank === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.buyboxRank}. Sırada
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batch Hata Raporu Modalı */}
      {selectedBatchErrors && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="p-4 sm:p-5 bg-rose-900 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold truncate">
                  Batch #{selectedBatchErrors.batchNumber} Hata Raporu
                </h3>
                <p className="text-xs text-rose-200 mt-0.5 truncate">
                  Pazaryeri: {selectedBatchErrors.marketplace} | Remote ID:{' '}
                  {selectedBatchErrors.remoteBatchId}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchErrors(null)}
                className="p-2 rounded-lg hover:bg-rose-800 text-rose-200 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 pb-safe">
              {selectedBatchErrors.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-rose-900">
                    <span className="break-words">
                      {err.stockCode} - {err.title}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 shrink-0">
                      {err.marketplace}
                    </span>
                  </div>
                  <div className="text-rose-700 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{err.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Robota Ürün Ekle Modalı */}
      {showAddRobotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Rekabet Robotuna Ürün Ekle</h3>
              <button
                onClick={() => setShowAddRobotModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ürün Seçin</label>
                <select
                  value={newRobotProductId}
                  onChange={(e) => setNewRobotProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.stockCode} - {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pazaryeri</label>
                <select
                  value={newRobotMarketplace}
                  onChange={(e) => setNewRobotMarketplace(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="trendyol">Trendyol</option>
                  <option value="hepsiburada">Hepsiburada</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Dip Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    value={newRobotMinPrice}
                    onChange={(e) => setNewRobotMinPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tavan Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    value={newRobotMaxPrice}
                    onChange={(e) => setNewRobotMaxPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Adım (TL)
                  </label>
                  <input
                    type="number"
                    value={newRobotStep}
                    onChange={(e) => setNewRobotStep(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 pb-safe">
              <button
                onClick={() => setShowAddRobotModal(false)}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleAddRobotItem}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                Robota Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
