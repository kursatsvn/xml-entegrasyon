'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  CloudDownload,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import { useOperation } from '@/components/ui/OperationFeedbackContext';
import type {
  HepsiburadaLiveFilter,
  LiveHepsiburadaProductItem
} from '@/lib/hepsiburada-api';

interface HepsiburadaLivePanelProps {
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function HepsiburadaLivePanel({
  onRefresh,
  notify
}: HepsiburadaLivePanelProps) {
  const { runOperation, confirmDialog } = useOperation();
  const [items, setItems] = useState<LiveHepsiburadaProductItem[]>([]);
  const [filter, setFilter] = useState<HepsiburadaLiveFilter>('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalElements: 0,
    onSaleTotal: 0,
    passiveTotal: 0,
    lockedTotal: 0,
    waitingTotal: 0,
    rejectedTotal: 0
  });

  const itemKey = (it: LiveHepsiburadaProductItem) =>
    `${it.hepsiburadaSku || 'NOHB'}::${it.merchantSku}`;

  const loadLiveProducts = useCallback(
    async (targetPage = 0, targetFilter: HepsiburadaLiveFilter = filter) => {
      setLoading(true);
      try {
        const res = await apiPost('/api/state', {
          action: 'fetch_live_hepsiburada_products',
          page: targetPage,
          size: 50,
          filter: targetFilter
        });
        if (res.ok && res.data) {
          setItems(res.data.items || []);
          setPage(res.data.page || 0);
          setTotalPages(res.data.totalPages || 1);
          setStats({
            totalElements: res.data.totalElements || 0,
            onSaleTotal: res.data.onSaleTotal || 0,
            passiveTotal: res.data.passiveTotal || 0,
            lockedTotal: res.data.lockedTotal || 0,
            waitingTotal: res.data.waitingTotal || 0,
            rejectedTotal: res.data.rejectedTotal || 0
          });
          setSelectedKeys([]);
        } else {
          notify(res.message || 'Hepsiburada canlı ürünleri çekilemedi.', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [filter, notify]
  );

  useEffect(() => {
    loadLiveProducts(0, filter);
  }, [filter, loadLiveProducts]);

  const selectedItems = items.filter((i) => selectedKeys.includes(itemKey(i)));

  const handleToggleState = async (targetState: 'activate' | 'deactivate') => {
    if (selectedItems.length === 0 || loading) return;
    const isActivate = targetState === 'activate';
    const confirmed = await confirmDialog({
      title: isActivate ? 'Hepsiburada Ürünlerini Satışa Aç' : 'Hepsiburada Ürünlerini Satışa Kapat',
      message: `Seçili ${selectedItems.length} Hepsiburada ürününü ${
        isActivate ? 'satışa açmak' : 'satışa kapatmak'
      } istediğinize emin misiniz?`,
      confirmText: isActivate ? 'Satışa Aç' : 'Satışa Kapat',
      variant: isActivate ? 'primary' : 'warning'
    });
    if (!confirmed) return;

    await runOperation(
      {
        title: isActivate
          ? `Hepsiburada Ürünleri Satışa Açılıyor (${selectedItems.length} Adet)`
          : `Hepsiburada Ürünleri Satışa Kapatılıyor (${selectedItems.length} Adet)`,
        description: 'Seçili SKU kayıtları Hepsiburada Listing API üzerinden güncelleniyor...',
        mode: 'blocking'
      },
      async ({ setStage }) => {
        setLoading(true);
        try {
          const res = await apiPost('/api/state', {
            action: 'toggle_hepsiburada_listings_state',
            targetState,
            items: selectedItems.map((i) => ({
              hepsiburadaSku: i.hepsiburadaSku,
              merchantSku: i.merchantSku
            }))
          });
          notify(res.message, res.ok ? 'success' : 'error');
          if (res.ok) {
            setStage('Canlı Hepsiburada listesi ve panel verileri yenileniyor...');
            await loadLiveProducts(page, filter);
            await onRefresh();
          }
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleApprovePreMatch = async () => {
    const preMatchedSkus = selectedItems
      .filter((i) => i.catalogStatus === 'PRE_MATCHED')
      .map((i) => i.merchantSku);
    if (preMatchedSkus.length === 0 || loading) {
      notify('Lütfen ön eşleşme (PRE_MATCHED) durumundaki ürünleri seçin.', 'error');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Ön Eşleşmeleri Onayla',
      message: `Seçili ${preMatchedSkus.length} adet ön eşleşmeli (PRE_MATCHED) ürünü Hepsiburada kataloğunda onaylamak istiyor musunuz?`,
      confirmText: 'Onayla',
      variant: 'primary'
    });
    if (!confirmed) return;

    await runOperation(
      {
        title: `Hepsiburada Ön Eşleşmeleri Onaylanıyor (${preMatchedSkus.length} SKU)`,
        description: 'Hepsiburada MPOP katalog servisine onay iletiliyor...',
        mode: 'blocking'
      },
      async ({ setStage }) => {
        setLoading(true);
        try {
          const res = await apiPost('/api/state', {
            action: 'approve_hepsiburada_prematch',
            merchantSkus: preMatchedSkus
          });
          notify(res.message, res.ok ? 'success' : 'error');
          if (res.ok) {
            setStage('Canlı Hepsiburada listesi yenileniyor...');
            await loadLiveProducts(page, filter);
            await onRefresh();
          }
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleDeletePending = async () => {
    const deletableSkus = selectedItems
      .filter((i) => i.catalogStatus !== 'LISTING')
      .map((i) => i.merchantSku);
    if (deletableSkus.length === 0 || loading) {
      notify(
        'Hepsiburada kuralları gereği yalnızca onay bekleyen / reddedilen katalog ürünleri silinebilir; aktif listingler için "Satışa Kapat" kullanın.',
        'error'
      );
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Onay Bekleyen HB Katalog Ürünlerini Sil',
      message: `Seçili ${deletableSkus.length} onay bekleyen / reddedilen Hepsiburada katalog ürününü kalıcı olarak silmek istediğinize emin misiniz?`,
      confirmText: 'Kalıcı Olarak Sil',
      variant: 'danger'
    });
    if (!confirmed) return;

    await runOperation(
      {
        title: `Hepsiburada Katalog Ürünleri Siliniyor (${deletableSkus.length} SKU)`,
        description: 'MPOP delete-process servisi üzerinden kayıtlar kaldırılıyor...',
        mode: 'blocking'
      },
      async ({ setStage }) => {
        setLoading(true);
        try {
          const res = await apiPost('/api/state', {
            action: 'delete_pending_hepsiburada_products',
            merchantSkus: deletableSkus
          });
          notify(res.message, res.ok ? 'success' : 'error');
          if (res.ok) {
            setStage('Canlı Hepsiburada listesi ve panel verileri yenileniyor...');
            await loadLiveProducts(page, filter);
            await onRefresh();
          }
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleReconcileStatuses = async () => {
    if (reconciling) return;
    await runOperation(
      {
        title: 'Hepsiburada Mağaza Durumları Eşitleniyor',
        description:
          'Canlı Hepsiburada Listing ve MPOP Katalog kayıtları taranarak yerel ürün durumlarıyla karşılaştırılıyor...',
        mode: 'blocking'
      },
      async ({ setStage }) => {
        setReconciling(true);
        try {
          const res = await apiPost('/api/state', { action: 'reconcile_hepsiburada_status' });
          if (res.ok) {
            setStage('Eşitlenen ürün durumları panele yükleniyor...');
            await onRefresh();
          }
          notify(res.message, res.ok ? 'success' : 'error');
        } finally {
          setReconciling(false);
        }
      }
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 6 Canlı Sayaç Kartı */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">TOPLAM HB KAYDI</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.totalElements.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Listing + Katalog</div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">SATIŞTAKİ AKTİF</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.onSaleTotal.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Satışa açık (isSalable)</div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 uppercase">SATIŞA KAPALI / PASİF</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {stats.passiveTotal.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Stok 0 veya deaktif</div>
        </div>

        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-purple-700 uppercase">KİLİTLİ / ASKIDA</div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {stats.lockedTotal.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">MinLock / MaxLock / Kilit</div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-amber-700 uppercase">ONAY / ÖN EŞLEŞME</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats.waitingTotal.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">WAITING / PRE_MATCHED</div>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold text-red-700 uppercase">REDDEDİLEN / EKSİK</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {stats.rejectedTotal.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">REJECTED / MISSING_INFO</div>
        </div>
      </div>

      {/* Filtre & Canlı Yönetim Barı */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 pb-1">
          {(
            [
              { id: 'all', label: `Tümü (${stats.totalElements})`, activeCls: 'bg-slate-900 text-white border-slate-900', idleCls: 'bg-white text-slate-700 border-slate-300' },
              { id: 'on_sale', label: `Satıştaki (${stats.onSaleTotal})`, activeCls: 'bg-emerald-600 text-white border-emerald-600', idleCls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              { id: 'passive', label: `Pasif (${stats.passiveTotal})`, activeCls: 'bg-rose-600 text-white border-rose-600', idleCls: 'bg-rose-50 text-rose-800 border-rose-200' },
              { id: 'locked', label: `Kilitli/Askıda (${stats.lockedTotal})`, activeCls: 'bg-purple-600 text-white border-purple-600', idleCls: 'bg-purple-50 text-purple-800 border-purple-200' },
              { id: 'waiting', label: `Onay Bekleyen (${stats.waitingTotal})`, activeCls: 'bg-amber-600 text-white border-amber-600', idleCls: 'bg-amber-50 text-amber-800 border-amber-200' },
              { id: 'rejected', label: `Red/Eksik (${stats.rejectedTotal})`, activeCls: 'bg-red-600 text-white border-red-600', idleCls: 'bg-red-50 text-red-800 border-red-200' }
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                filter === f.id ? f.activeCls : f.idleCls
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => loadLiveProducts(page, filter)}
            disabled={loading}
            className="shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CloudDownload className={`w-4 h-4 ${loading ? 'animate-bounce' : ''}`} />
            Yenile
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleToggleState('activate')}
              disabled={loading || selectedItems.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              Satışa Aç ({selectedItems.length})
            </button>
            <button
              onClick={() => handleToggleState('deactivate')}
              disabled={loading || selectedItems.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5" />
              Satışa Kapat ({selectedItems.length})
            </button>
            <button
              onClick={handleApprovePreMatch}
              disabled={loading || selectedItems.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Ön Eşleşme Onayla
            </button>
            <button
              onClick={handleDeletePending}
              disabled={loading || selectedItems.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Onay Bekleyenleri Sil
            </button>
          </div>

          <button
            onClick={handleReconcileStatuses}
            disabled={reconciling}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Eşitleniyor...' : 'HB Durumlarını Canlı Mağaza ile Eşitle'}
          </button>
        </div>
      </div>

      {/* Canlı Liste */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && items.length > 0 && (
          <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              Hepsiburada canlı verileri yükleniyor...
            </div>
          </div>
        )}
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span className="font-semibold text-slate-700">
                  Hepsiburada canlı verileri çekiliyor, lütfen bekleyin...
                </span>
              </>
            ) : (
              'Bu filtrede Hepsiburada kaydı bulunamadı.'
            )}
          </div>
        ) : (
          <>
            {/* Mobil Kartlar */}
            <div className="md:hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedKeys.length === items.length}
                    onChange={(e) =>
                      setSelectedKeys(e.target.checked ? items.map(itemKey) : [])
                    }
                    className="w-4 h-4 rounded border-slate-300 accent-amber-600"
                  />
                  Tümünü Seç ({items.length})
                </label>
                {selectedKeys.length > 0 && (
                  <span className="text-amber-700">{selectedKeys.length} seçili</span>
                )}
              </div>
              <div className="divide-y divide-slate-200">
                {items.map((it, idx) => {
                  const k = itemKey(it);
                  return (
                    <div key={`mhb-${k}-${idx}`} className="p-4 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(k)}
                          onChange={(e) =>
                            setSelectedKeys((prev) =>
                              e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)
                            )
                          }
                          className="w-4 h-4 mt-1 rounded border-slate-300 accent-amber-600 shrink-0"
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
                            SKU: {it.merchantSku}
                            {it.hepsiburadaSku ? ` • ${it.hepsiburadaSku}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                        <span className="font-extrabold text-amber-700">
                          {it.salePrice.toFixed(2)} TL
                        </span>
                        <span className="font-semibold text-slate-700">
                          Stok: {it.quantity} • Sevk: {it.dispatchTime}g
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {it.isSalable ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            Satışta
                          </span>
                        ) : it.isLocked || it.isSuspended ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                            Kilitli/Askıda
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            {it.catalogStatus}
                          </span>
                        )}
                        {it.lockReasons.map((r, ri) => (
                          <span
                            key={ri}
                            className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Masaüstü Tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedKeys.length === items.length}
                        onChange={(e) =>
                          setSelectedKeys(e.target.checked ? items.map(itemKey) : [])
                        }
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="py-3.5 px-4">MERCHANT SKU / HBSKU</th>
                    <th className="py-3.5 px-4">ÜRÜN ADI</th>
                    <th className="py-3.5 px-4">STOK & FİYAT</th>
                    <th className="py-3.5 px-4">DURUM & KİLİT BİLGİSİ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {items.map((it, idx) => {
                    const k = itemKey(it);
                    return (
                      <tr key={`dhb-${k}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(k)}
                            onChange={(e) =>
                              setSelectedKeys((prev) =>
                                e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)
                              )
                            }
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {it.merchantSku || '-'}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {it.hepsiburadaSku || 'Katalog Aşamasında'}
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
                          <div className="font-bold text-amber-700">
                            {it.salePrice.toFixed(2)} TL
                          </div>
                          <div className="text-slate-600">
                            Stok: <strong>{it.quantity}</strong> • Sevk: {it.dispatchTime} gün
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {it.isSalable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Satışta
                              </span>
                            ) : it.isLocked || it.isSuspended ? (
                              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                                Kilitli / Askıda
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                {it.catalogStatus === 'LISTING' ? 'Satışa Kapalı' : it.catalogStatus}
                              </span>
                            )}
                            {it.lockReasons.length > 0 && (
                              <span className="text-[11px] text-rose-700 font-medium">
                                {it.lockReasons.join(', ')}
                              </span>
                            )}
                            {it.rejectionReason && (
                              <span className="text-[11px] text-rose-700 font-medium">
                                {it.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Sayfalama */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <span>
            Sayfa {page + 1} / {totalPages} (50 kayıt/sayfa)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 0 || loading}
              onClick={() => loadLiveProducts(page - 1, filter)}
              className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold cursor-pointer"
            >
              ← Önceki
            </button>
            <button
              disabled={page + 1 >= totalPages || loading}
              onClick={() => loadLiveProducts(page + 1, filter)}
              className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50 font-semibold cursor-pointer"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
