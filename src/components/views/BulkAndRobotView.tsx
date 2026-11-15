'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PriceRobotItem, Product, SyncBatch } from '@/types/sopyo';
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
}

interface BulkAndRobotViewProps {
  initialTab?: 'publish' | 'update' | 'diff' | 'robot' | 'trendyol_live';
  batches: SyncBatch[];
  products: Product[];
  priceRobotItems: PriceRobotItem[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function BulkAndRobotView({
  initialTab = 'publish',
  batches,
  products,
  priceRobotItems,
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

  // Canlı Trendyol Ürün Listeleme & Silme state'leri
  const [tyItems, setTyItems] = useState<LiveTrendyolItem[]>([]);
  const [tyFilter, setTyFilter] = useState<
    'all' | 'on_sale' | 'passive' | 'unapproved' | 'blacklisted'
  >('all');
  const [tyPage, setTyPage] = useState<number>(0);
  const [tyTotalPages, setTyTotalPages] = useState<number>(1);
  const [tyStats, setTyStats] = useState({
    totalElements: 0,
    approvedTotal: 0,
    onSaleTotal: 0,
    passiveTotal: 0,
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
      filter: 'all' | 'on_sale' | 'passive' | 'unapproved' | 'blacklisted' = tyFilter
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

  const handleDeleteTrendyolProducts = async (
    deleteAllMode:
      | 'selected'
      | 'on_sale'
      | 'passive'
      | 'unapproved'
      | 'blacklisted'
      | 'approved'
      | 'all'
  ) => {
    if (deleteAllMode === 'selected' && selectedBarcodes.length === 0) {
      notify('Lütfen silmek istediğiniz ürünleri tablodan seçin.', 'error');
      return;
    }

    const confirmText =
      deleteAllMode === 'selected'
        ? `Seçili ${selectedBarcodes.length} ürünü Trendyol'dan kalıcı olarak silmek istediğinize emin misiniz?`
        : deleteAllMode === 'on_sale'
        ? `Trendyol'da SATIŞTA OLAN (${tyStats.onSaleTotal} adet) aktif ürünleri silmek istediğinize emin misiniz?`
        : deleteAllMode === 'passive'
        ? `Trendyol'da PASİF / SATIŞ DIŞI (${tyStats.passiveTotal} adet) ürünleri silmek istediğinize emin misiniz?`
        : deleteAllMode === 'blacklisted'
        ? `Trendyol'da KARA LİSTEDEKİ (${tyStats.blacklistedTotal} adet) ürünleri silmek istediğinize emin misiniz?`
        : deleteAllMode === 'unapproved'
        ? `Trendyol'da ONAY BEKLEYEN (${tyStats.unapprovedTotal} adet) ürünleri silmek istediğinize emin misiniz?`
        : `Trendyol mağazanızdaki TÜM ÜRÜNLERİ (${tyStats.totalElements} adet) silmek istediğinize emin misiniz?`;

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
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_publish',
          marketplace: selectedMarketplace
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      } else {
        notify(data.message || 'Gönderim hatası', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_price_stock',
          marketplace: selectedMarketplace
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      } else {
        notify(data.message || 'Güncelleme hatası', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunPriceRobot = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_price_robot' })
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

  const handleAddRobotItem = async () => {
    if (!newRobotProductId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_price_robot_item',
          productId: newRobotProductId,
          marketplace: newRobotMarketplace,
          minFloorPrice: newRobotMinPrice,
          maxCeilingPrice: newRobotMaxPrice,
          stepAmount: newRobotStep
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        setShowAddRobotModal(false);
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
            onClick={() => setTab('publish')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'publish'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            Toplu Ürün Gönderimi
          </button>
          <button
            onClick={() => setTab('update')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'update'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Toplu Stok & Fiyat Güncelleme
          </button>
          <button
            onClick={() => setTab('diff')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'diff'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Ürün Farklılık Kontrolü
          </button>
          <button
            onClick={() => setTab('robot')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'robot'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Fiyat Rekabet Robotu (Buybox)
          </button>
          <button
            onClick={() => setTab('trendyol_live')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
              tab === 'trendyol_live'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Trendyol Canlı Ürünler & Silme (API)
          </button>
        </div>
      </div>

      {/* 5. TRENDYOL CANLI ÜRÜNLERİ GÖRÜNTÜLE & SİL (SATIŞTA, PASİF, KARA LİSTE, ONAY BEKLEYEN) */}
      {tab === 'trendyol_live' && (
        <div className="space-y-6">
          {/* Canlı Sayaçlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                TOPLAM ÜRÜN / VARYANT
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {tyStats.totalElements.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Satıcı ID: #1192080</div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">
                SATIŞTAKİ AKTİF (onSale=true)
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {tyStats.onSaleTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Şu an müşteriye açık</div>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-rose-700 uppercase">
                PASİF / SATIŞ DIŞI (onSale=false)
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {tyStats.passiveTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Stoksuz veya satışa kapalı</div>
            </div>

            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-purple-700 uppercase">
                KARA LİSTE / ASKIDA (blacklisted)
              </div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {tyStats.blacklistedTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Trendyol tarafından kapatılan</div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-amber-700 uppercase">
                ONAY BEKLEYEN (approved=false)
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {tyStats.unapprovedTotal.toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Katalog onayı bekleyen</div>
            </div>
          </div>

          {/* Filtre & Silme Butonları */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setTyFilter('all')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    tyFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Tümü ({tyStats.totalElements.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => setTyFilter('on_sale')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    tyFilter === 'on_sale'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Satıştaki Aktif Ürünler ({tyStats.onSaleTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => setTyFilter('passive')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    tyFilter === 'passive'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  Pasif / Satış Dışı Ürünler ({tyStats.passiveTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => setTyFilter('blacklisted')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    tyFilter === 'blacklisted'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-purple-50 text-purple-800 border-purple-200'
                  }`}
                >
                  Kara Liste ({tyStats.blacklistedTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => setTyFilter('unapproved')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                    tyFilter === 'unapproved'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  Onay Bekleyenler ({tyStats.unapprovedTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => loadLiveTrendyolProducts(tyPage, tyFilter)}
                  disabled={tyLoading}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <CloudDownload className={`w-4 h-4 ${tyLoading ? 'animate-bounce' : ''}`} />
                  Yenile
                </button>
              </div>
            </div>

            {/* Toplu veya Seçili Silme Aksiyon Barı */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-600">
                Tablodan tek tek ürün seçip silebilir veya sağdaki butonlarla grup bazlı toplu silebilirsiniz:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedBarcodes.length > 0 && (
                  <button
                    onClick={() => handleDeleteTrendyolProducts('selected')}
                    disabled={tyLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Seçili ({selectedBarcodes.length}) Ürünü Sil
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTrendyolProducts('passive')}
                  disabled={tyLoading || tyStats.passiveTotal === 0}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Sadece Pasif Ürünleri Sil ({tyStats.passiveTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => handleDeleteTrendyolProducts('on_sale')}
                  disabled={tyLoading || tyStats.onSaleTotal === 0}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Sadece Satıştaki Ürünleri Sil ({tyStats.onSaleTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => handleDeleteTrendyolProducts('blacklisted')}
                  disabled={tyLoading || tyStats.blacklistedTotal === 0}
                  className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Kara Listedekileri Sil ({tyStats.blacklistedTotal.toLocaleString('tr-TR')})
                </button>
                <button
                  onClick={() => handleDeleteTrendyolProducts('all')}
                  disabled={tyLoading || tyStats.totalElements === 0}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Tümünü Sil ({tyStats.totalElements.toLocaleString('tr-TR')})
                </button>
              </div>
            </div>
          </div>

          {/* Canlı Ürün Tablosu */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                            <img
                              src={it.imageUrl}
                              alt={it.title}
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span>
                Sayfa {tyPage + 1} / {tyTotalPages} (Her sayfada 50 varyant gösteriliyor)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={tyPage <= 0 || tyLoading}
                  onClick={() => loadLiveTrendyolProducts(tyPage - 1, tyFilter)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold"
                >
                  ← Önceki
                </button>
                <button
                  disabled={tyPage + 1 >= tyTotalPages || tyLoading}
                  onClick={() => loadLiveTrendyolProducts(tyPage + 1, tyFilter)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold"
                >
                  Sonraki →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOPLU ÜRÜN GÖNDERİMİ */}
      {tab === 'publish' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pazaryerlerine Toplu Ürün Gönderimi Başlat
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kategorisi, markası ve varyant seçenekleri eşitlenmiş ürünleri Trendyol ve
                Hepsiburada mağazalarınıza toplu olarak gönderir.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium bg-white"
              >
                <option value="Tümü">Trendyol + Hepsiburada (Tümü)</option>
                <option value="Trendyol">Sadece Trendyol</option>
                <option value="Hepsiburada">Sadece Hepsiburada</option>
              </select>
              <button
                onClick={handleBulkPublish}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Gönderiliyor...' : 'Toplu Ürün Gönderimini Başlat'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
              Toplu Gönderim Geçmişi (Sopyo Batch Kayıtları)
            </div>
            <div className="overflow-x-auto">
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
            <div className="flex items-center gap-3">
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium bg-white"
              >
                <option value="Tümü">Trendyol + Hepsiburada (Tümü)</option>
                <option value="Trendyol">Sadece Trendyol</option>
                <option value="Hepsiburada">Sadece Hepsiburada</option>
              </select>
              <button
                onClick={handleBulkUpdate}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Stok & Fiyatları Şimdi Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ÜRÜN FARKLILIK KONTROLÜ (diffCheck) */}
      {tab === 'diff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
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
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tüm Farklılıkları Pazaryerleriyle Eşitle
            </button>
          </div>
          <div className="overflow-x-auto">
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Trendyol & Hepsiburada Buybox Fiyat Rekabet Robotu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Belirlediğiniz <strong>Dip Fiyat (Min)</strong> altına asla inmeden rakip mağaza
                fiyatlarını takip eder ve Buybox 1. sırayı kazanacak şekilde fiyatı otomatik
                günceller.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddRobotModal(true)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Robota Ürün Ekle
              </button>
              <button
                onClick={handleRunPriceRobot}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                Robotu Şimdi Çalıştır
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
      )}

      {/* Batch Hata Raporu Modalı */}
      {selectedBatchErrors && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Batch #{selectedBatchErrors.batchNumber} Hata Raporu
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  Pazaryeri: {selectedBatchErrors.marketplace} | Remote ID:{' '}
                  {selectedBatchErrors.remoteBatchId}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchErrors(null)}
                className="p-1.5 rounded-lg hover:bg-rose-800 text-rose-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">
              {selectedBatchErrors.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-rose-900">
                    <span>
                      {err.stockCode} - {err.title}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                      {err.marketplace}
                    </span>
                  </div>
                  <div className="text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {err.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Robota Ürün Ekle Modalı */}
      {showAddRobotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Rekabet Robotuna Ürün Ekle</h3>
              <button onClick={() => setShowAddRobotModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ürün Seçin</label>
                <select
                  value={newRobotProductId}
                  onChange={(e) => setNewRobotProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="trendyol">Trendyol</option>
                  <option value="hepsiburada">Hepsiburada</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAddRobotModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleAddRobotItem}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
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
