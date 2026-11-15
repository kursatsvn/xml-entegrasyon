'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Edit3,
  EyeOff,
  Filter,
  Lock,
  PackagePlus,
  Search,
  Unlock,
  X
} from 'lucide-react';
import { CategoryMapping, Product } from '@/types/sopyo';
import { calculateDesi, calculateProfitBreakdown } from '@/lib/pricing-engine';

interface ProductsViewProps {
  products: Product[];
  categories: CategoryMapping[];
  onRefreshState: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function ProductsView({
  products,
  categories,
  onRefreshState,
  notify
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [priceLockFilter, setPriceLockFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [showDesiModal, setShowDesiModal] = useState(false);

  // Komisyon & Kar Hesaplama state
  const [commPct, setCommPct] = useState(21);
  const [shipCost, setShipCost] = useState(65);
  const [profitPct, setProfitPct] = useState(25);

  // Desi Hesaplama state
  const [widthCm, setWidthCm] = useState(25);
  const [lengthCm, setLengthCm] = useState(35);
  const [heightCm, setHeightCm] = useState(5);

  const uniqueBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandName))).filter(Boolean),
    [products]
  );

  const zeroPriceProducts = useMemo(
    () =>
      products.filter(
        (p) => !p.salePrice || p.salePrice <= 0 || p.variants.some((v) => !v.salePrice || v.salePrice <= 0)
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr-TR');
        const matchesMain =
          p.stockCode.toLocaleLowerCase('tr-TR').includes(q) ||
          p.title.toLocaleLowerCase('tr-TR').includes(q) ||
          p.barcode.toLocaleLowerCase('tr-TR').includes(q);
        const matchesVar = p.variants.some(
          (v) =>
            v.sku.toLocaleLowerCase('tr-TR').includes(q) ||
            v.barcode.toLocaleLowerCase('tr-TR').includes(q) ||
            v.color.toLocaleLowerCase('tr-TR').includes(q) ||
            v.size.toLocaleLowerCase('tr-TR').includes(q)
        );
        if (!matchesMain && !matchesVar) return false;
      }

      if (platformFilter === 'zero-price') {
        const isZero =
          !p.salePrice || p.salePrice <= 0 || p.variants.some((v) => !v.salePrice || v.salePrice <= 0);
        if (!isZero) return false;
      }
      if (platformFilter === 'ty-active' && p.trendyolSyncStatus !== 'synced') return false;
      if (platformFilter === 'ty-error' && p.trendyolSyncStatus !== 'error') return false;
      if (platformFilter === 'hb-active' && p.hepsiburadaSyncStatus !== 'synced') return false;
      if (platformFilter === 'hb-error' && p.hepsiburadaSyncStatus !== 'error') return false;

      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.categoryName !== categoryFilter) return false;
      if (brandFilter !== 'all' && p.brandName !== brandFilter) return false;
      if (priceLockFilter === 'locked' && !p.xmlPriceLock) return false;
      if (priceLockFilter === 'unlocked' && p.xmlPriceLock) return false;

      return true;
    });
  }, [
    products,
    searchQuery,
    platformFilter,
    statusFilter,
    categoryFilter,
    brandFilter,
    priceLockFilter
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_product', product: editingProduct })
    });
    const data = await res.json();
    if (data.ok) {
      notify(data.message);
      setEditingProduct(null);
      await onRefreshState();
    } else {
      notify(data.message || 'Hata oluştu', 'error');
    }
  }

  function openNewProductModal() {
    setEditingProduct({
      id: '',
      tenantId: '',
      xmlSourceId: '',
      sourceName: 'Manuel',
      externalId: '',
      stockCode: `AX${Math.floor(40000 + Math.random() * 50000)}`,
      supplierStockCode: '',
      barcode: `8690047${Math.floor(100000 + Math.random() * 899999)}`,
      title: '',
      subtitle: 'Gizli Paketleme - Aynı Gün Kargo',
      invoiceTitle: 'Tekstil & Ev Giyim Ürünü',
      descriptionHtml: '<p>Ürün açıklaması</p>',
      brandName: "Aria's Closet",
      categoryName: categories[0]?.name || 'Gecelik Modelleri',
      categoryTree: categories[0]?.xmlCategoryTree || 'FANTAZİ GİYİM/Gecelik Modelleri',
      images: [
        'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
      ],
      videoUrl: '',
      vatRate: 10,
      desi: 1,
      preparationDays: 1,
      warrantyMonths: 0,
      stockDeductionPerSale: 1,
      maxPurchaseQty: 0,
      xmlPriceLock: false,
      status: 'active',
      buyingPrice: 400,
      marketPrice: 950,
      salePrice: 400,
      trendyolListPrice: 980,
      trendyolSalePrice: 820,
      hepsiburadaSalePrice: 920,
      totalXmlStock: 100,
      reservedOrderStock: 0,
      netAvailableStock: 100,
      trendyolSyncStatus: 'not_sent',
      hepsiburadaSyncStatus: 'not_sent',
      tags: ['Gizli Paketleme'],
      productUrl: '',
      variants: [
        {
          id: `var-new-1`,
          externalVariantId: '1',
          sku: 'SKU-SM',
          barcode: `8690047${Math.floor(100000 + Math.random() * 899999)}`,
          xmlStock: 50,
          reservedStock: 0,
          netStock: 50,
          buyingPrice: 400,
          salePrice: 400,
          marketPrice: 950,
          trendyolSalePrice: 820,
          hepsiburadaSalePrice: 920,
          color: 'Siyah',
          size: 'S/M',
          attributes: [
            { name: 'Beden Seçiniz', value: 'S/M' },
            { name: 'Renk', value: 'Siyah' }
          ]
        }
      ],
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Hızlı Aksiyonlar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Ürün Listesi ({filteredProducts.length} adet)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            XML kaynaklarından gelen ve manuel eklenen tüm ürünler, Trendyol ve Hepsiburada fiyatları ve stok durumları.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openNewProductModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" /> YENİ ÜRÜN EKLE
          </button>
        </div>
      </div>

      {/* XML Fiyatı 0 TL Olan Ürünler İçin Otomatik Uyarı Kutusu */}
      {zeroPriceProducts.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <span>⚠️ Dikkat: XML&apos;de Fiyatı 0,00 TL Olan {zeroPriceProducts.length} Ürün / Varyant Tespit Edildi!</span>
            </div>
            <p className="text-xs text-rose-800">
              XML kaynağında fiyatı <strong>0,00 ₺</strong> olan ürünler veya varyantlar pazaryerlerine (Trendyol / Hepsiburada) <strong>kesinlikle gönderilmez</strong>. Bu ürünleri göndermek istiyorsanız karşısındaki <strong>DÜZENLE</strong> butonuna tıklayarak geçerli bir satış fiyatı giriniz.
            </p>
          </div>
          <button
            onClick={() => {
              setPlatformFilter(platformFilter === 'zero-price' ? 'all' : 'zero-price');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
              platformFilter === 'zero-price'
                ? 'bg-slate-800 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {platformFilter === 'zero-price'
              ? 'Tüm Ürünleri Göster'
              : `0 TL Fiyatlı Ürünleri Göster (${zeroPriceProducts.length})`}
          </button>
        </div>
      )}

      {/* Sopyo Gelişmiş Filtre Çubuğu */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Stok Kodu (AX33322), Ürün Adı, Barkod veya Varyant ara..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
          >
            <option value="all">Tüm Platform Durumları</option>
            <option value="zero-price">⚠️ XML Fiyatı 0 TL (Fiyat Girilmeli)</option>
            <option value="ty-active">Trendyol Aktif (Satışta)</option>
            <option value="ty-error">Trendyol Hatalı / Eksik</option>
            <option value="hb-active">Hepsiburada Aktif (Satışta)</option>
            <option value="hb-error">Hepsiburada Hatalı / Eksik</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
          >
            <option value="all">Tüm Markalar</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={priceLockFilter}
            onChange={(e) => {
              setPriceLockFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
          >
            <option value="all">XML Fiyat Kilidi (Tümü)</option>
            <option value="locked">Fiyat Kilidi Açık</option>
            <option value="unlocked">Fiyat Kilidi Kapalı</option>
          </select>
        </div>
      </div>

      {/* Ürün Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-3.5 px-4">GÖRSEL & STOK KODU</th>
                <th className="py-3.5 px-4">ÜRÜN ADI & KATEGORİ</th>
                <th className="py-3.5 px-4">FİYATLAR (BAZ → TY / HB)</th>
                <th className="py-3.5 px-4">STOK (NET / REZERVE)</th>
                <th className="py-3.5 px-4">PLATFORM DURUMU</th>
                <th className="py-3.5 px-4">DURUMU</th>
                <th className="py-3.5 px-4 text-right">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedProducts.map((p, idx) => (
                <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.images[0] ||
                          'https://static.ticimax.cloud/33490/Uploads/UrunResimleri/saten-kapli-dantell-babydoll-e086.jpg'
                        }
                        alt={p.title}
                        className="w-12 h-14 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                      />
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold">
                          {p.stockCode}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          {p.barcode}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Kaynak: <strong>{p.sourceName}</strong>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-md">
                    <div className="font-semibold text-slate-900 line-clamp-2">{p.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {p.brandName}
                      </span>
                      <span>•</span>
                      <span>{p.categoryName}</span>
                      <span>•</span>
                      <span>{p.variants.length} Seçenek</span>
                      {p.invoiceTitle && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px]">
                          <EyeOff className="w-3 h-3" /> Maskeli Fatura
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-slate-500">
                        XML Baz:{' '}
                        <strong className={p.salePrice <= 0 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                          {p.salePrice.toFixed(2)} ₺
                        </strong>
                      </div>
                      <div className="text-orange-700 font-semibold">
                        Trendyol: {p.trendyolSalePrice.toFixed(2)} ₺
                      </div>
                      <div className="text-amber-700 font-semibold">
                        Hepsiburada: {p.hepsiburadaSalePrice.toFixed(2)} ₺
                      </div>
                      {(p.salePrice <= 0 || p.variants.some((v) => !v.salePrice || v.salePrice <= 0)) && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300">
                          ⚠️ Fiyat Girilmeli (Gönderilmez)
                        </div>
                      )}
                      {p.xmlPriceLock && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                          <Lock className="w-3 h-3" /> Fiyat Kilidi Açık
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">
                      {p.netAvailableStock.toLocaleString('tr-TR')}
                    </div>
                    {p.reservedOrderStock > 0 && (
                      <div className="text-xs text-amber-600 font-medium">
                        Rezerve Sipariş: {p.reservedOrderStock}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        title={p.trendyolErrorMessage || 'Trendyol Durumu'}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          p.trendyolSyncStatus === 'synced'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.trendyolSyncStatus === 'error'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        TY: {p.trendyolSyncStatus === 'synced' ? 'Aktif' : p.trendyolSyncStatus === 'error' ? 'Hatalı' : 'Bekliyor'}
                      </span>

                      <span
                        title={p.hepsiburadaErrorMessage || 'Hepsiburada Durumu'}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          p.hepsiburadaSyncStatus === 'synced'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.hepsiburadaSyncStatus === 'error'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        HB: {p.hepsiburadaSyncStatus === 'synced' ? 'Aktif' : p.hepsiburadaSyncStatus === 'error' ? 'Hatalı' : 'Bekliyor'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'active' && p.netAvailableStock > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.status === 'active' && p.netAvailableStock > 0
                        ? 'Satışa Açık'
                        : 'Satışa Kapalı'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setEditingProduct(JSON.parse(JSON.stringify(p)))}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> DÜZENLE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Toplam <strong>{totalPages}</strong> sayfada <strong>{currentPage}.</strong> sayfadasınız.
          </div>
          <div className="flex items-center gap-2">
            <span>Sayfa başına:</span>
            {[20, 50, 100].map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                  pageSize === sz ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300'
                }`}
              >
                {sz}
              </button>
            ))}
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
              className="px-3 py-1 rounded-md bg-white border border-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Önceki
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
              className="px-3 py-1 rounded-md bg-white border border-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* ÜRÜN DETAY / DÜZENLEME MODALI (/products/show/[id] Birebir Karşılığı) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Ürün Bilgileri & Kanal Bazlı Fiyatlandırma ({editingProduct.stockCode})
                </h2>
                <p className="text-xs text-slate-500">
                  Sopyo Ürün Detay Kartı — Fatura Maskeleme, XML Fiyat Kilidi, Desi ve Varyant Yönetimi
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Ürün Başlığı (Maksimum 150 Karakter) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={editingProduct.title}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Ürün Satış Durumu
                  </label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        status: e.target.value as 'active' | 'passive'
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  >
                    <option value="active">SATIŞA AÇIK</option>
                    <option value="passive">SATIŞA KAPALI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Stok Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.stockCode}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stockCode: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Barkod
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcode: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Desi
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDesiModal(!showDesiModal)}
                      className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      Desi Hesapla
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.desi}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, desi: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Ürün الفatura Başlığı (Maskeleme)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.invoiceTitle}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, invoiceTitle: e.target.value })
                    }
                    placeholder="Örn: Tekstil & Ev Giyim Ürünü"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <span className="text-[11px] text-slate-500">
                    Fatura ve kargo fişinde ürün adını gizlemek/maskelemek için kullanılır.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Satıldığında Stoktan Düşülecek Adet
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingProduct.stockDeductionPerSale}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stockDeductionPerSale: Number(e.target.value)
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    XML Fiyat Kilidi
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        xmlPriceLock: !editingProduct.xmlPriceLock
                      })
                    }
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      editingProduct.xmlPriceLock
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  >
                    {editingProduct.xmlPriceLock ? (
                      <>
                        <Lock className="w-4 h-4" /> FİYAT KİLİDİ AÇIK (XML Ezmez)
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" /> FİYAT KİLİDİ KAPALI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Desi Hesaplama Mini Aracı */}
              {showDesiModal && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">EN (CM)</label>
                    <input
                      type="number"
                      value={widthCm}
                      onChange={(e) => setWidthCm(Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 rounded-lg border bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">BOY (CM)</label>
                    <input
                      type="number"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 rounded-lg border bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      YÜKSEKLİK (CM)
                    </label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 rounded-lg border bg-white text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const d = calculateDesi(widthCm, lengthCm, heightCm);
                      setEditingProduct({ ...editingProduct, desi: d });
                      setShowDesiModal(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Uygula ({calculateDesi(widthCm, lengthCm, heightCm)} Desi)
                  </button>
                </div>
              )}

              {/* Kanal Bazlı Fiyatlandırma & Kar Hesaplama Aracı */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    KANAL BAZLI FİYATLANDIRMA (TRENDYOL & HEPSİBURADA)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProfitModal(!showProfitModal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Komisyon & Kar Hesaplama Robotu
                  </button>
                </div>

                {showProfitModal && (
                  <div className="p-4 rounded-xl bg-white border border-indigo-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Alış Maliyeti (TL)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.buyingPrice}
                        readOnly
                        className="w-full px-2.5 py-1.5 rounded border bg-slate-50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Kategori Komisyon (%)
                      </label>
                      <input
                        type="number"
                        value={commPct}
                        onChange={(e) => setCommPct(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded border text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Kargo Ücreti (KDV Hariç)
                      </label>
                      <input
                        type="number"
                        value={shipCost}
                        onChange={(e) => setShipCost(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded border text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Hedef Karlılık (%)
                      </label>
                      <input
                        type="number"
                        value={profitPct}
                        onChange={(e) => setProfitPct(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded border text-sm"
                      />
                    </div>
                    <div>
                      {(() => {
                        const calc = calculateProfitBreakdown({
                          buyingCost: editingProduct.buyingPrice,
                          commissionPct: commPct,
                          shippingCostExclVat: shipCost,
                          targetProfitPct: profitPct,
                          vatRate: editingProduct.vatRate
                        });
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                trendyolSalePrice: calc.suggestedSalePrice,
                                hepsiburadaSalePrice: calc.suggestedSalePrice
                              })
                            }
                            className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Uygula: {calc.suggestedSalePrice} ₺ (Net Kar: {calc.netProfit} ₺)
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      XML Baz / Alış Fiyatı (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.salePrice}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          salePrice: Number(e.target.value),
                          buyingPrice: Number(e.target.value)
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-orange-700 mb-1">
                      Trendyol Liste Fiyatı (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.trendyolListPrice}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          trendyolListPrice: Number(e.target.value)
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-white text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-orange-700 mb-1">
                      Trendyol Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.trendyolSalePrice}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          trendyolSalePrice: Number(e.target.value)
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-orange-400 bg-white text-sm font-bold text-orange-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-700 mb-1">
                      Hepsiburada Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.hepsiburadaSalePrice}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          hepsiburadaSalePrice: Number(e.target.value)
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-amber-400 bg-white text-sm font-bold text-amber-800"
                    />
                  </div>
                </div>
              </div>

              {/* Varyant / Seçenek Tablosu */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">
                  ÜRÜN SEÇENEKLERİ / VARYANTLAR ({editingProduct.variants.length})
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 px-3">STOK KODU</th>
                        <th className="py-2.5 px-3">BARKOD</th>
                        <th className="py-2.5 px-3">RENK</th>
                        <th className="py-2.5 px-3">BEDEN</th>
                        <th className="py-2.5 px-3">XML STOK</th>
                        <th className="py-2.5 px-3">REZERVE</th>
                        <th className="py-2.5 px-3">NET STOK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editingProduct.variants.map((v, idx) => (
                        <tr key={v.id || idx}>
                          <td className="py-2 px-3 font-mono font-semibold">{v.sku}</td>
                          <td className="py-2 px-3 font-mono">{v.barcode}</td>
                          <td className="py-2 px-3">{v.color}</td>
                          <td className="py-2 px-3 font-semibold">{v.size}</td>
                          <td className="py-2 px-3">{v.xmlStock}</td>
                          <td className="py-2 px-3 text-amber-700">{v.reservedStock}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{v.netStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer"
                >
                  KAYDET & GÜNCELLE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
