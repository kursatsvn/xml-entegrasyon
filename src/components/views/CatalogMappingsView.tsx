'use client';

import React, { useState } from 'react';
import {
  BrandMapping,
  CategoryMapping,
  TagItem,
  VariantGroupMapping
} from '@/types/sopyo';
import { MARKETPLACE_CATEGORY_CATALOG } from '@/lib/category-matcher';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Search,
  Layers,
  Award,
  Sliders,
  Tag,
  X,
  Save
} from 'lucide-react';

interface CatalogMappingsViewProps {
  initialSection?: 'categories' | 'brands' | 'variants' | 'tags';
  categories: CategoryMapping[];
  brands: BrandMapping[];
  variantGroups: VariantGroupMapping[];
  tags: TagItem[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function CatalogMappingsView({
  initialSection = 'categories',
  categories,
  brands,
  variantGroups,
  tags,
  onRefresh,
  notify
}: CatalogMappingsViewProps) {
  const [section, setSection] = useState<'categories' | 'brands' | 'variants' | 'tags'>(
    initialSection
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [loading, setLoading] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryMapping | null>(null);
  const [defaultBrandInput, setDefaultBrandInput] = useState("Aria's Closet");

  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const handleAutoMatchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_match_all_categories' })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefresh();
      } else {
        notify(data.message || 'Hata oluştu', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingleCategory = async () => {
    if (!editingCat) return;
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_category_mapping', category: editingCat })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        setEditingCat(null);
        await onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_match_all_brands',
          defaultBrandName: defaultBrandInput
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

  const handleAutoMatchVariants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_match_all_variants' })
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

  const renderStatusBadge = (
    channel: 'Trendyol' | 'Hepsiburada',
    status: CategoryMapping['trendyolStatus']
  ) => {
    const colorMap = {
      mapped: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      missing_options: 'bg-amber-50 text-amber-700 border-amber-200',
      missing_attributes: 'bg-orange-50 text-orange-700 border-orange-200',
      unmapped: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    const labelMap = {
      mapped: 'Eşitlendi',
      missing_options: 'Seçenekler Eşitlenmedi',
      missing_attributes: 'Özellikler Eşitlenmedi',
      unmapped: 'Eşitlenmedi'
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorMap[status]}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            channel === 'Trendyol' ? 'bg-orange-500' : 'bg-amber-600'
          }`}
        />
        {channel}: {labelMap[status]}
      </span>
    );
  };

  const filteredCategories = categories.filter((c) => {
    const q = search.toLocaleLowerCase('tr-TR');
    const matchText =
      !q ||
      c.name.toLocaleLowerCase('tr-TR').includes(q) ||
      c.xmlCategoryTree.toLocaleLowerCase('tr-TR').includes(q);
    if (!matchText) return false;
    if (statusFilter === 'mapped') {
      return c.trendyolStatus === 'mapped' && c.hepsiburadaStatus === 'mapped';
    }
    if (statusFilter === 'unmapped') {
      return c.trendyolStatus !== 'mapped' || c.hepsiburadaStatus !== 'mapped';
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Üst Sekme Seçici */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 pb-0.5">
          <button
            onClick={() => setSection('categories')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              section === 'categories'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            Kategoriler ({categories.length})
          </button>
          <button
            onClick={() => setSection('brands')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              section === 'brands'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            Markalar ({brands.length})
          </button>
          <button
            onClick={() => setSection('variants')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              section === 'variants'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            Varyantlar ({variantGroups.length})
          </button>
          <button
            onClick={() => setSection('tags')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              section === 'tags'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            Etiketler ({tags.length})
          </button>
        </div>

        {section === 'categories' && (
          <button
            onClick={handleAutoMatchCategories}
            disabled={loading}
            className="w-full lg:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Tüm Kategorileri Otomatik Eşitle
          </button>
        )}
      </div>

      {/* 1. KATEGORİLER BÖLÜMÜ */}
      {section === 'categories' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kategori adı veya XML yolu ara..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="all">Tüm Durumlar ({categories.length})</option>
                <option value="mapped">Tam Eşitlenenler</option>
                <option value="unmapped">Eksik / Eşitlenmeyenler</option>
              </select>
            </div>
          </div>

          {/* Mobil Kategori Kartları */}
          <div className="md:hidden divide-y divide-slate-200">
            {filteredCategories.map((cat) => (
              <div key={`mcat-${cat.id}`} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 break-words">
                      {cat.xmlCategoryTree}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                    {cat.productCount} ürün
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {renderStatusBadge('Trendyol', cat.trendyolStatus)}
                  {renderStatusBadge('Hepsiburada', cat.hepsiburadaStatus)}
                </div>
                {(cat.trendyolCategoryName || cat.hepsiburadaCategoryName) && (
                  <div className="text-[11px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-lg">
                    {cat.trendyolCategoryName && (
                      <div>
                        <strong className="text-orange-600">TY:</strong> {cat.trendyolCategoryName}
                      </div>
                    )}
                    {cat.hepsiburadaCategoryName && (
                      <div>
                        <strong className="text-amber-700">HB:</strong>{' '}
                        {cat.hepsiburadaCategoryName}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setEditingCat({ ...cat })}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Kategoriyi Eşitle
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <th className="py-3.5 px-4">KATEGORİ ADI</th>
                  <th className="py-3.5 px-4">XML KATEGORİ AĞACI</th>
                  <th className="py-3.5 px-4">KAYNAK & ÜRÜN SAYISI</th>
                  <th className="py-3.5 px-4">PAZARYERİ EŞİTLEME DURUMU</th>
                  <th className="py-3.5 px-4 text-right">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{cat.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-mono">
                      {cat.xmlCategoryTree}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                        {cat.sourceName} ({cat.productCount} ürün)
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-2">
                        {renderStatusBadge('Trendyol', cat.trendyolStatus)}
                        {renderStatusBadge('Hepsiburada', cat.hepsiburadaStatus)}
                      </div>
                      {(cat.trendyolCategoryName || cat.hepsiburadaCategoryName) && (
                        <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                          {cat.trendyolCategoryName && (
                            <div>
                              <strong className="text-orange-600">TY:</strong>{' '}
                              {cat.trendyolCategoryName}
                            </div>
                          )}
                          {cat.hepsiburadaCategoryName && (
                            <div>
                              <strong className="text-amber-700">HB:</strong>{' '}
                              {cat.hepsiburadaCategoryName}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setEditingCat({ ...cat })}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        Eşitle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. MARKALAR BÖLÜMÜ */}
      {section === 'brands' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-blue-950">
                Sabit Marka &amp; Toplu Marka Eşitleme (Trendyol + Hepsiburada)
              </h3>
              <p className="text-xs text-blue-800 mt-0.5">
                XML kaynağındaki markaları tek tıkla mağaza markanızla (Örn: Aria&apos;s Closet veya
                LuneRose) eşitleyebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <input
                type="text"
                value={defaultBrandInput}
                onChange={(e) => setDefaultBrandInput(e.target.value)}
                className="w-full sm:w-52 px-3 py-2.5 rounded-lg border border-blue-300 text-sm bg-white"
                placeholder="Varsayılan Pazaryeri Markası"
              />
              <button
                onClick={handleAutoMatchBrands}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                Tüm Markaları Eşitle
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mobil Marka Kartları */}
            <div className="md:hidden divide-y divide-slate-200">
              {brands.map((b) => (
                <div key={`mbrand-${b.id}`} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                      <div className="text-xs text-slate-500">{b.productCount} ürün</div>
                    </div>
                    {b.isMapped ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Eşitlendi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Bekliyor
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg">
                    <div>
                      <div className="text-[10px] font-bold text-orange-600">TRENDYOL</div>
                      <div className="font-medium text-slate-800">
                        {b.trendyolBrandName || 'Eşitlenmedi'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-700">HEPSİBURADA</div>
                      <div className="font-medium text-slate-800">
                        {b.hepsiburadaBrandName || 'Eşitlenmedi'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">XML MARKA ADI</th>
                    <th className="py-3.5 px-4">ÜRÜN SAYISI</th>
                    <th className="py-3.5 px-4">TRENDYOL MARKA KARŞILIĞI</th>
                    <th className="py-3.5 px-4">HEPSİBURADA MARKA KARŞILIĞI</th>
                    <th className="py-3.5 px-4">DURUM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{b.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{b.productCount} ürün</td>
                      <td className="py-3.5 px-4">
                        {b.trendyolBrandName ? (
                          <span className="font-medium text-slate-800">
                            {b.trendyolBrandName}{' '}
                            <span className="text-xs text-slate-400">(#{b.trendyolBrandId})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-rose-600 font-medium">Eşitlenmedi</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.hepsiburadaBrandName ? (
                          <span className="font-medium text-slate-800">
                            {b.hepsiburadaBrandName}
                          </span>
                        ) : (
                          <span className="text-xs text-rose-600 font-medium">Eşitlenmedi</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.isMapped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eşitlendi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Bekliyor
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

      {/* 3. SEÇENEKLER (RENK & BEDEN) BÖLÜMÜ */}
      {section === 'variants' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Sopyo &quot;Görsel&quot; Renk Hatası Koruması Aktif
              </h3>
              <p className="text-xs text-amber-900 mt-1">
                Ticimax (`ariasclosetx`) XML kaynağında bazı ürünlerde `Renk: Görsel` gelmektedir.
                Sistemimiz bu değeri otomatik olarak ürün başlığındaki gerçek renge veya{' '}
                <strong>&quot;Çok Renkli&quot;</strong> değerine dönüştürerek Trendyol/Hepsiburada
                batch reddi almanızı engeller.
              </p>
            </div>
            <button
              onClick={handleAutoMatchVariants}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Seçenek Gruplarını Otomatik Eşitle
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {variantGroups.map((vg) => (
              <div
                key={vg.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      Seçenek Grubu: {vg.name}
                    </h4>
                    <p className="text-xs text-slate-500">{vg.productCount} üründe kullanılıyor</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      Trendyol: Eşitlendi
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      Hepsiburada: Eşitlendi
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase">
                        <th className="py-2">XML Değer</th>
                        <th className="py-2">Trendyol Karşılığı</th>
                        <th className="py-2">Hepsiburada Karşılığı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vg.valuesList.map((v, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-mono font-semibold text-slate-800">
                            {v.rawValue}
                          </td>
                          <td className="py-2 text-emerald-700 font-medium">
                            {v.normalizedTrendyolValue}
                          </td>
                          <td className="py-2 text-emerald-700 font-medium">
                            {v.normalizedHepsiburadaValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ETİKETLER BÖLÜMÜ */}
      {section === 'tags' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Ürün Etiketleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tags.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.productCount} üründe tanımlı</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">{t.color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tekil Kategori Eşitleme Modalı */}
      {editingCat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold truncate">
                  Kategori Eşitleme: {editingCat.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 truncate">{editingCat.xmlCategoryTree}</p>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Hazır Pazaryeri Kategori Şablonu Seçin (Trendyol + Hepsiburada)
                </label>
                <select
                  onChange={(e) => {
                    const found = MARKETPLACE_CATEGORY_CATALOG.find(
                      (c) => String(c.trendyolId) === e.target.value
                    );
                    if (found) {
                      setEditingCat({
                        ...editingCat,
                        trendyolCategoryId: found.trendyolId,
                        trendyolCategoryName: found.trendyolName,
                        trendyolStatus: 'mapped',
                        trendyolAttributes: found.defaultAttributes.trendyol,
                        hepsiburadaCategoryId: found.hepsiburadaId,
                        hepsiburadaCategoryName: found.hepsiburadaName,
                        hepsiburadaStatus: 'mapped',
                        hepsiburadaAttributes: found.defaultAttributes.hepsiburada
                      });
                    }
                  }}
                  value={editingCat.trendyolCategoryId || ''}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="">-- Pazaryeri Kategorisi Seçin --</option>
                  {MARKETPLACE_CATEGORY_CATALOG.map((item) => (
                    <option key={item.trendyolId} value={item.trendyolId}>
                      TY: {item.trendyolName} | HB: {item.hepsiburadaName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 space-y-2">
                  <div className="text-xs font-bold text-orange-800 uppercase">
                    Trendyol Kategori & Zorunlu Özellikler
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {editingCat.trendyolCategoryName || 'Seçilmedi'}
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {editingCat.trendyolAttributes.map((attr, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{attr.attributeName}:</span>
                        <span className="font-semibold text-slate-900">{attr.mappedValue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="text-xs font-bold text-amber-900 uppercase">
                    Hepsiburada Kategori & Zorunlu Özellikler
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {editingCat.hepsiburadaCategoryName || 'Seçilmedi'}
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {editingCat.hepsiburadaAttributes.map((attr, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{attr.attributeName}:</span>
                        <span className="font-semibold text-slate-900">{attr.mappedValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 pb-safe">
              <button
                onClick={() => setEditingCat(null)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveSingleCategory}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Eşleştirmeyi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
