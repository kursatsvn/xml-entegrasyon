'use client';

import React, { useState } from 'react';
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
  X
} from 'lucide-react';

interface BulkAndRobotViewProps {
  initialTab?: 'publish' | 'update' | 'diff' | 'robot';
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
  const [tab, setTab] = useState<'publish' | 'update' | 'diff' | 'robot'>(initialTab);
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

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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
        </div>
      </div>

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
                {products.slice(0, 30).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
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
