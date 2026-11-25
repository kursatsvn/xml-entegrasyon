'use client';

import React, { useMemo, useState } from 'react';
import { ClaimItem, Order, Tenant } from '@/types/sopyo';
import { mergeTenantGeneralSettings } from '@/lib/general-settings';
import {
  ShoppingBag,
  RotateCcw,
  BarChart3,
  Printer,
  FileText,
  DownloadCloud,
  Zap,
  CheckCircle2,
  EyeOff,
  Truck,
  X
} from 'lucide-react';

interface OrdersAndClaimsViewProps {
  initialSection?: 'orders' | 'claims' | 'reports';
  orders: Order[];
  claims: ClaimItem[];
  tenant: Tenant;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function OrdersAndClaimsView({
  initialSection = 'orders',
  orders,
  claims,
  tenant,
  onRefresh,
  notify
}: OrdersAndClaimsViewProps) {
  const gs = useMemo(() => mergeTenantGeneralSettings(tenant), [tenant]);
  const [section, setSection] = useState<'orders' | 'claims' | 'reports'>(initialSection);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [labelTemplate, setLabelTemplate] = useState<Tenant['cargoLabelTemplate']>(
    tenant.cargoLabelTemplate || 'quad'
  );
  const [useMaskedTitleOnLabel, setUseMaskedTitleOnLabel] = useState<boolean>(
    gs.customerInvoiceMaskStatus
  );

  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  React.useEffect(() => {
    setLabelTemplate(tenant.cargoLabelTemplate || 'quad');
    setUseMaskedTitleOnLabel(gs.customerInvoiceMaskStatus);
  }, [tenant.cargoLabelTemplate, gs.customerInvoiceMaskStatus]);

  const handlePullOrders = async (simulateNewOrder = false, marketplace: 'trendyol' | 'hepsiburada' = 'trendyol') => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pull_orders_and_deduct_stock',
          simulateNewOrder,
          marketplace
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      } else {
        notify(data.message || 'Sipariş çekme hatası', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async (
    orderId: string,
    updates: { status?: Order['status']; invoiceStatus?: Order['invoiceStatus']; labelPrinted?: boolean }
  ) => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId,
          ...updates
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

  const filteredOrders = orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  );

  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalCommission = orders.reduce((acc, o) => acc + o.commissionAmount, 0);
  const totalShipping = orders.reduce((acc, o) => acc + o.shippingCost, 0);
  const netRevenue = totalRevenue - totalCommission - totalShipping;

  return (
    <div className="space-y-6">
      {/* Üst Sekme Seçici (Mobilde yatay kaydırılabilir) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm no-print">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSection('orders')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition shrink-0 min-h-[40px] ${
              section === 'orders'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            Siparişler ({orders.length})
          </button>
          <button
            onClick={() => setSection('claims')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition shrink-0 min-h-[40px] ${
              section === 'claims'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            İade Yönetimi ({claims.length})
          </button>
          <button
            onClick={() => setSection('reports')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition shrink-0 min-h-[40px] ${
              section === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            Finans Raporları
          </button>
        </div>

        {section === 'orders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2">
            <button
              onClick={() => handlePullOrders(false)}
              disabled={loading}
              className="px-3.5 py-2.5 lg:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
            >
              <DownloadCloud className="w-4 h-4 shrink-0" />
              Hızlı Sipariş Getir (Canlı API)
            </button>
            <button
              onClick={() => handlePullOrders(true, 'trendyol')}
              disabled={loading}
              className="px-3.5 py-2.5 lg:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
            >
              <Zap className="w-4 h-4 shrink-0" />
              Test Siparişi Simülasyonu
            </button>
          </div>
        )}
      </div>

      {/* 1. SİPARİŞLER VE FATURALAR */}
      {section === 'orders' && (
        <div className="space-y-4">
          {/* Gizli Paketleme & Çapraz Stok Bilgisi */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Otomatik Çapraz Pazaryeri Stok Düşme & Gizli Paketleme (Fatura Maskeleme) Aktif
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Trendyol veya Hepsiburada&apos;dan gelen her sipariş ürünün{' '}
                  <strong>Rezerve Sipariş Stoğunu</strong> artırır; XML senkronizasyonu çalışsa bile
                  satılan ürün stoğu ezilmez ve karşı pazaryerine anında düşülmüş net stok gönderilir.
                </div>
              </div>
            </div>
          </div>

          {/* Durum Sekmeleri (Mobilde Yatay Kaydırılabilir) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 no-print">
            {[
              { id: 'all', label: `Tümü (${orders.length})` },
              {
                id: 'ready_to_ship',
                label: `Gönderime Hazır (${orders.filter((o) => o.status === 'ready_to_ship').length})`
              },
              {
                id: 'shipped',
                label: `Kargolandı (${orders.filter((o) => o.status === 'shipped').length})`
              },
              {
                id: 'delivered',
                label: `Teslim Edildi (${orders.filter((o) => o.status === 'delivered').length})`
              },
              {
                id: 'cancelled',
                label: `İptal (${orders.filter((o) => o.status === 'cancelled').length})`
              }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition shrink-0 ${
                  statusFilter === st.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sipariş Listesi: Mobilde Kartlar + Masaüstünde Tablo */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {/* MOBİL SİPARİŞ KARTLARI */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredOrders.map((ord) => (
                <div key={`m-ord-${ord.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          #{ord.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ord.marketplace === 'trendyol'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {ord.marketplace}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ord.orderDate).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {ord.totalAmount.toFixed(2)} TL
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Komisyon: {ord.commissionAmount.toFixed(2)} TL
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">{ord.customerName}</div>
                    <div className="text-slate-500 mt-0.5">
                      {ord.shippingDistrict} / {ord.shippingCity} • {ord.cargoCompany}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-xs font-semibold text-slate-800">
                          {it.quantity}x {it.title} ({it.sku})
                        </div>
                        <div className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Fatura/Etiket: {it.maskedTitle || tenant.defaultMaskedProductName}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <select
                      value={ord.status}
                      onChange={(e) =>
                        handleUpdateOrder(ord.id, { status: e.target.value as Order['status'] })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="ready_to_ship">Gönderime Hazır</option>
                      <option value="shipped">Kargolandı</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal Edildi</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPrintingOrder(ord)}
                        className="px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[42px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Kargo Fişi
                      </button>
                      <button
                        onClick={() => handleUpdateOrder(ord.id, { invoiceStatus: 'issued' })}
                        className={`px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border min-h-[42px] ${
                          ord.invoiceStatus === 'issued'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {ord.invoiceStatus === 'issued'
                          ? ord.invoiceNumber || 'Faturalandı'
                          : 'Fatura Kes'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MASAÜSTÜ SİPARİŞ TABLOSU */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">SİPARİŞ NO & KANAL</th>
                    <th className="py-3.5 px-4">MÜŞTERİ & TESLİMAT</th>
                    <th className="py-3.5 px-4">ÜRÜN & GİZLİ FATURA BAŞLIĞI</th>
                    <th className="py-3.5 px-4">TUTAR</th>
                    <th className="py-3.5 px-4">STOK & SENKRON LOGU</th>
                    <th className="py-3.5 px-4">DURUM</th>
                    <th className="py-3.5 px-4 text-right">KARGO & FATURA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">#{ord.orderNumber}</div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            ord.marketplace === 'trendyol'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {ord.marketplace}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {new Date(ord.orderDate).toLocaleString('tr-TR')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.customerName}</div>
                        <div className="text-xs text-slate-500">
                          {ord.shippingDistrict} / {ord.shippingCity}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {ord.cargoCompany} ({ord.cargoTrackingNumber})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="text-xs font-semibold text-slate-800">
                              {it.quantity}x {it.title} ({it.sku})
                            </div>
                            <div className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              Fatura/Etiket: {it.maskedTitle || tenant.defaultMaskedProductName}
                            </div>
                          </div>
                        ))}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {ord.totalAmount.toFixed(2)} TL
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Komisyon: {ord.commissionAmount.toFixed(2)} TL
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Stoktan Düşüldü
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{ord.crossSyncLog}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={ord.status}
                          onChange={(e) =>
                            handleUpdateOrder(ord.id, { status: e.target.value as Order['status'] })
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                        >
                          <option value="ready_to_ship">Gönderime Hazır</option>
                          <option value="shipped">Kargolandı</option>
                          <option value="delivered">Teslim Edildi</option>
                          <option value="cancelled">İptal Edildi</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right space-y-1.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setPrintingOrder(ord)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Kargo Fiși
                          </button>
                          {gs.showDetailOrderReceipt && (
                            <button
                              onClick={() => setPrintingOrder(ord)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Sipariş Fişi
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleUpdateOrder(ord.id, { invoiceStatus: 'issued' })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border ${
                              ord.invoiceStatus === 'issued'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {ord.invoiceStatus === 'issued'
                              ? ord.invoiceNumber || 'Faturalandı'
                              : 'Fatura Kes'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. İADE YÖNETİMİ */}
      {section === 'claims' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
            Müşteri İade ve Değişim Talepleri (Trendyol & Hepsiburada)
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="py-3.5 px-4">TALEP NO / SİPARİŞ</th>
                <th className="py-3.5 px-4">PAZARYERİ</th>
                <th className="py-3.5 px-4">MÜŞTERİ & ÜRÜN</th>
                <th className="py-3.5 px-4">İADE NEDENİ</th>
                <th className="py-3.5 px-4">TUTAR</th>
                <th className="py-3.5 px-4">DURUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {c.claimNumber}
                    <div className="text-xs text-slate-400">Sipariş: #{c.orderNumber}</div>
                  </td>
                  <td className="py-3.5 px-4 uppercase font-bold text-xs text-orange-600">
                    {c.marketplace}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{c.customerName}</div>
                    <div className="text-xs text-slate-500">
                      {c.productTitle} ({c.sku})
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700">{c.reason}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {c.amount.toFixed(2)} TL
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      Onaylandı
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. RAPORLAR */}
      {section === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Toplam Brüt Ciro</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {totalRevenue.toFixed(2)} TL
              </div>
              <div className="text-xs text-emerald-600 mt-1">{orders.length} toplam sipariş</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Pazaryeri Komisyon Toplamı
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-2">
                -{totalCommission.toFixed(2)} TL
              </div>
              <div className="text-xs text-slate-500 mt-1">Ortalama %20 kategori komisyonu</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Toplam Kargo Gideri</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-2">
                -{totalShipping.toFixed(2)} TL
              </div>
              <div className="text-xs text-slate-500 mt-1">Aras Kargo Marketplace</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Tahmini Net Hakediş</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-2">
                {netRevenue.toFixed(2)} TL
              </div>
              <div className="text-xs text-slate-500 mt-1">Komisyon ve kargo düşülmüş net</div>
            </div>
          </div>
        </div>
      )}

      {/* KARGO ETİKETİ YAZDIRMA MODALI (Mobil Tam Ekran + Yazdırırken Sadece Etiket) */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pt-safe overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)] sm:max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 p-4 bg-slate-900 text-white flex items-center justify-between gap-2 no-print">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">
                  Kargo Etiketi & Barkod Fişi (#{printingOrder.orderNumber})
                </h3>
                <p className="text-xs text-slate-300 truncate">
                  Şablon: {labelTemplate.toUpperCase()} | Yazı Boyutu: {gs.customerCargoReceiptFontSize || '7.7'} pt | Gizli Paketleme:{' '}
                  {useMaskedTitleOnLabel ? 'Aktif' : 'Kapalı'}
                </p>
              </div>
              <button
                onClick={() => setPrintingOrder(null)}
                aria-label="Kapat"
                className="p-2 rounded-lg hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 no-print">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Etiket Şablonu:</label>
                  <select
                    value={labelTemplate}
                    onChange={(e) => setLabelTemplate(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="single">Tek Kargo Fişi</option>
                    <option value="double">2&apos;li Kargo Fişi</option>
                    <option value="quad">4&apos;lü Kargo Fişi</option>
                    <option value="barcode">Barkod Yazıcısı</option>
                    <option value="argox">Argox Barkod Yazıcısı</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMaskedTitleOnLabel}
                    onChange={(e) => setUseMaskedTitleOnLabel(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Gizli Paketleme (Ürün Adını Maskele)
                </label>
              </div>

              {/* Kargo Etiketi Önizleme Kutusu (Genel Ayarlar -> Kargo Etiket Ayarlarına Bağlı) */}
              <div
                className="border-2 border-dashed border-slate-800 rounded-xl p-6 bg-white space-y-4"
                style={{
                  fontSize: `${Math.max(10, Number(String(gs.customerCargoReceiptFontSize || '7.7').replace(',', '.')) * 1.45)}px`
                }}
              >
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                  <div className="space-y-0.5">
                    {gs.customerLogo && (
                      <img
                        src={gs.customerLogo}
                        alt={tenant.name}
                        className="h-8 w-auto object-contain mb-1"
                      />
                    )}
                    <div className="text-xs font-bold uppercase text-slate-500">GÖNDERİCİ MAĞAZA</div>
                    <div className="text-lg font-black text-slate-900">{tenant.name}</div>
                    {gs.customerSlogan && (
                      <div className="text-[11px] italic text-slate-500">{gs.customerSlogan}</div>
                    )}
                    <div className="text-xs text-slate-600">
                      Pazaryeri: {printingOrder.marketplace.toUpperCase()}
                    </div>
                    {gs.customerCargoReceiptCompanyAdressShow && tenant.companyAddress && (
                      <div className="text-[11px] text-slate-600">Adres: {tenant.companyAddress}</div>
                    )}
                    {gs.customerCargoReceiptPhoneShow && tenant.companyPhone && (
                      <div className="text-[11px] text-slate-600">Tel: {tenant.companyPhone}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-500">KARGO FİRMASI</div>
                    <div className="text-base font-extrabold text-slate-900">
                      {printingOrder.cargoCompany}
                    </div>
                    <div className="font-mono text-xs text-slate-600">
                      Sipariş No: #{printingOrder.orderNumber}
                    </div>
                    {gs.customerOrderPaymentShow && (
                      <div className="text-[11px] font-bold text-emerald-700 mt-1">
                        Ödeme: Pazaryeri Online (Ödendi)
                      </div>
                    )}
                  </div>
                </div>

                {/* Barkod Alanı */}
                <div className="py-4 text-center bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-mono tracking-[0.35em] text-2xl font-black text-slate-900">
                    ||| |||| || ||||| |||| |||
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800 mt-1">
                    {printingOrder.cargoBarcode}
                  </div>
                </div>

                {/* Alıcı Bilgileri */}
                <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
                  <div>
                    <div className="font-bold text-slate-500 uppercase">ALICI ADI SOYADI</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {printingOrder.customerName}
                    </div>
                    <div className="text-slate-600 mt-0.5">{printingOrder.customerPhone}</div>
                    {gs.customerCargoReceiptMailShow && printingOrder.customerEmail && (
                      <div className="text-slate-500 mt-0.5">{printingOrder.customerEmail}</div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-500 uppercase">TESLİMAT ADRESİ</div>
                    <div className="text-slate-800 font-medium mt-0.5">
                      {printingOrder.shippingAddress}
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {printingOrder.shippingDistrict} / {printingOrder.shippingCity}
                    </div>
                  </div>
                </div>

                {/* Paket İçeriği */}
                {gs.customerShowProductCargoReceipt && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                      PAKET İÇERİĞİ ({useMaskedTitleOnLabel ? 'GİZLİ PAKETLEME MODU' : 'STANDART MOD'})
                    </div>
                    {printingOrder.items.map((it, idx) => {
                      const effectiveSku =
                        useMaskedTitleOnLabel && gs.customerInvoiceMaskStockCode
                          ? gs.customerInvoiceMaskStockCode
                          : it.sku;
                      const effectiveTitle = useMaskedTitleOnLabel
                        ? gs.customerInvoiceMaskProductName ||
                          it.maskedTitle ||
                          tenant.defaultMaskedProductName ||
                          'Tekstil Ürünü'
                        : it.title;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-slate-100"
                        >
                          <span className="font-semibold text-slate-900">
                            {it.quantity} Adet - {effectiveTitle}
                            {gs.customerCargoReceiptStockCodeShow && effectiveSku ? ` (${effectiveSku})` : ''}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            {gs.customerShowPriceCargoReceipt && (
                              <span className="font-bold text-slate-800">
                                {Number(it.unitPrice || 0).toFixed(2)} TL
                              </span>
                            )}
                            <span className="font-mono text-slate-600">Barkod: {it.barcode}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fatura Bilgisi / Sipariş Açıklaması / Kargo Etiketi Özel Açıklaması */}
                {(gs.customerCargoReceiptBillingInfoShow ||
                  gs.customerOrderDescShow ||
                  gs.customerCargoReceiptDesc) && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                    {gs.customerCargoReceiptBillingInfoShow && (
                      <div>
                        <strong>Fatura Açıklaması:</strong>{' '}
                        {printingOrder.marketplace === 'trendyol'
                          ? gs.customerTrendyolInvoiceDesc
                          : gs.customerHBInvoiceDesc}
                      </div>
                    )}
                    {gs.customerOrderDescShow && printingOrder.crossSyncLog && (
                      <div>
                        <strong>Sipariş Notu:</strong> {printingOrder.crossSyncLog}
                      </div>
                    )}
                    {gs.customerCargoReceiptDesc && (
                      <div className="font-semibold text-slate-800">
                        {gs.customerCargoReceiptDesc}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                onClick={() => setPrintingOrder(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold min-h-[42px]"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  handleUpdateOrder(printingOrder.id, { labelPrinted: true });
                  window.print();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[42px]"
              >
                <Printer className="w-4 h-4" />
                Etiketi Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
