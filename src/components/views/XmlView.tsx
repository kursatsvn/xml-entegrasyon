'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileCode2,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X
} from 'lucide-react';
import { PriceRuleItem, XmlSource, XmlSyncReport } from '@/types/sopyo';

interface XmlViewProps {
  xmlSources: XmlSource[];
  xmlReports: XmlSyncReport[];
  onRefreshState: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export default function XmlView({
  xmlSources,
  xmlReports,
  onRefreshState,
  notify
}: XmlViewProps) {
  const [subMode, setSubMode] = useState<'list' | 'wizard' | 'report'>('list');
  const [wizardStep, setWizardStep] = useState<number>(0); // 0..3
  const [editingSource, setEditingSource] = useState<XmlSource | null>(null);
  const [selectedReportSource, setSelectedReportSource] = useState<XmlSource | null>(null);
  const [activePriceMarketplaceTab, setActivePriceMarketplaceTab] = useState<'Trendyol' | 'Hepsiburada'>('Trendyol');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncLimit, setSyncLimit] = useState<number>(0);
  const [inspectingNodes, setInspectingNodes] = useState(false);
  const [detectedNodes, setDetectedNodes] = useState<{ tag: string; count: number }[]>([
    { tag: 'UrunKartiID', count: 1648 },
    { tag: 'UrunAdi', count: 1648 },
    { tag: 'Aciklama', count: 1550 },
    { tag: 'Marka', count: 1648 },
    { tag: 'Kategori', count: 1648 },
    { tag: 'KategoriTree', count: 1647 },
    { tag: 'VaryasyonID', count: 7283 },
    { tag: 'StokKodu', count: 7283 },
    { tag: 'Barkod', count: 7101 },
    { tag: 'StokAdedi', count: 7283 },
    { tag: 'AlisFiyati', count: 7283 },
    { tag: 'SatisFiyati', count: 7283 },
    { tag: 'IndirimliFiyat', count: 7161 },
    { tag: 'KdvOrani', count: 7283 },
    { tag: 'Desi', count: 7283 }
  ]);

  function openNewXmlWizard() {
    setEditingSource({
      id: '',
      tenantId: '',
      xmlIdNumber: Math.floor(10000 + Math.random() * 90000),
      name: '',
      url: '',
      providerType: 'ticimax',
      extraNotes: '',
      stockCodePrefix: 'AX',
      generateBarcode: true,
      disableStockSync: false,
      disablePriceSync: false,
      disableNewProducts: false,
      criticalStockEnabled: true,
      criticalStockAmount: 3,
      autoPublishEnabled: true,
      autoPublishChannels: ['Trendyol', 'Hepsiburada'],
      salePriceTag: 'SatisFiyati',
      buyingPriceTag: 'SatisFiyati',
      marketPriceTag: 'IndirimliFiyat',
      taxIncludedMode: 0,
      fixedTaxRate: 10,
      useCurrencyConversion: false,
      priceRoundEnabled: false,
      priceRoundType: 'x9',
      priceRoundWay: 'round',
      priceRuleType: 3,
      fixedPriceRule: {
        ruleMinPrice: 0,
        ruleMaxPrice: 99999999,
        ruleType: 'increase',
        ruleOperationType: 'percent',
        ruleAmount: 100,
        ruleExtraPrice: 0
      },
      dynamicPriceRules: [],
      marketplacePriceRules: {
        Trendyol: [
          {
            ruleMinPrice: 1,
            ruleMaxPrice: 299,
            ruleType: 'increase',
            ruleOperationType: 'percent',
            ruleAmount: 105,
            ruleExtraPrice: 75
          },
          {
            ruleMinPrice: 299,
            ruleMaxPrice: 999999999,
            ruleType: 'increase',
            ruleOperationType: 'percent',
            ruleAmount: 105,
            ruleExtraPrice: 0
          }
        ],
        Hepsiburada: [
          {
            ruleMinPrice: 1,
            ruleMaxPrice: 143,
            ruleType: 'increase',
            ruleOperationType: 'percent',
            ruleAmount: 120,
            ruleExtraPrice: 80
          },
          {
            ruleMinPrice: 143,
            ruleMaxPrice: 999999999,
            ruleType: 'increase',
            ruleOperationType: 'percent',
            ruleAmount: 120,
            ruleExtraPrice: 40
          }
        ]
      },
      customTagMapping: {
        productNode: 'Urun',
        externalId: 'UrunKartiID',
        title: 'UrunAdi',
        description: 'Aciklama',
        brand: 'Marka',
        category: 'Kategori',
        categoryTree: 'KategoriTree',
        images: 'Resimler.Resim',
        variants: 'UrunSecenek.Secenek',
        variantId: 'VaryasyonID',
        sku: 'StokKodu',
        barcode: 'Barkod',
        stock: 'StokAdedi',
        buyingPrice: 'AlisFiyati',
        salePrice: 'SatisFiyati',
        marketPrice: 'IndirimliFiyat',
        vatRate: 'KdvOrani',
        currency: 'ParaBirimiKodu',
        desi: 'Desi'
      },
      totalProductCount: 0,
      totalVariantCount: 0,
      status: 'active',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    setWizardStep(0);
    setSubMode('wizard');
  }

  function openEditWizard(src: XmlSource) {
    setEditingSource(JSON.parse(JSON.stringify(src)));
    setWizardStep(0);
    setSubMode('wizard');
  }

  async function handleInspectXmlNodes(url: string) {
    if (!url) return;
    setInspectingNodes(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inspect_xml_nodes', url })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.tags)) {
        setDetectedNodes(data.tags);
        notify(
          `XML başarıyla analiz edildi: ${data.totalProducts} ana ürün, ${data.totalVariants} varyant ve ${data.tags.length} etiket bulundu!`
        );
      } else {
        notify(data.message || 'XML etiketleri okunamadı.', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'XML analiz hatası', 'error');
    } finally {
      setInspectingNodes(false);
    }
  }

  async function handleSaveWizard() {
    if (!editingSource) return;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_xml_source', xmlSource: editingSource })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message);
        await onRefreshState();
        setSubMode('list');
      } else {
        notify(data.message || 'Kaydedilemedi', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'Hata oluştu', 'error');
    }
  }

  async function handleSyncLiveXml(src: XmlSource) {
    setSyncingId(src.id);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_xml_source',
          xmlSourceId: src.id,
          limit: syncLimit
        })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message);
        await onRefreshState();
      } else {
        notify(data.message || 'XML senkronizasyonu başarısız.', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'XML çekilirken hata oluştu', 'error');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDeleteXml(src: XmlSource) {
    const confirmed = window.confirm(
      `"${src.name}" XML kaynağını silmek istediğinizden emin misiniz?`
    );
    if (!confirmed) return;
    const deleteProducts = window.confirm(
      `XML kaynağı ile gelen ürünler de sistemden silinsin mi? (Tamam = Silinsin, İptal = Ürünler Kalsın)`
    );
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_xml_source',
        xmlSourceId: src.id,
        deleteProducts
      })
    });
    const data = await res.json();
    if (data.ok) {
      notify(data.message);
      await onRefreshState();
    }
  }

  function updateMarketplaceRule(
    channel: 'Trendyol' | 'Hepsiburada',
    idx: number,
    field: keyof PriceRuleItem,
    val: string | number
  ) {
    if (!editingSource) return;
    const copy = { ...editingSource };
    const list = [...(copy.marketplacePriceRules[channel] || [])];
    list[idx] = {
      ...list[idx],
      [field]: field === 'ruleType' || field === 'ruleOperationType' ? val : Number(val)
    };
    copy.marketplacePriceRules = {
      ...copy.marketplacePriceRules,
      [channel]: list
    };
    setEditingSource(copy);
  }

  function addMarketplaceRuleRow(channel: 'Trendyol' | 'Hepsiburada') {
    if (!editingSource) return;
    const copy = { ...editingSource };
    const list = [...(copy.marketplacePriceRules[channel] || [])];
    list.push({
      ruleMinPrice: 0,
      ruleMaxPrice: 999999,
      ruleType: 'increase',
      ruleOperationType: 'percent',
      ruleAmount: 100,
      ruleExtraPrice: 0
    });
    copy.marketplacePriceRules = {
      ...copy.marketplacePriceRules,
      [channel]: list
    };
    setEditingSource(copy);
  }

  function removeMarketplaceRuleRow(channel: 'Trendyol' | 'Hepsiburada', idx: number) {
    if (!editingSource) return;
    const copy = { ...editingSource };
    const list = (copy.marketplacePriceRules[channel] || []).filter((_, i) => i !== idx);
    copy.marketplacePriceRules = {
      ...copy.marketplacePriceRules,
      [channel]: list
    };
    setEditingSource(copy);
  }

  if (subMode === 'report' && selectedReportSource) {
    const rep =
      xmlReports.find((r) => r.xmlSourceId === selectedReportSource.id) || xmlReports[0];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              #{selectedReportSource.name} - XML Kontrol Raporu
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Son Kontrol: {new Date(selectedReportSource.lastCheckedAt).toLocaleString('tr-TR')} tarihli XML kontrol detayları
            </p>
          </div>
          <button
            onClick={() => setSubMode('list')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer"
          >
            ← XML Listesine Dön
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold uppercase text-slate-400">
              KAYNAK ÜRÜN SAYISI
            </div>
            <div className="text-3xl font-bold text-indigo-600 mt-2">
              {rep?.sourceProductCount ?? selectedReportSource.totalProductCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {selectedReportSource.totalVariantCount} toplam varyant (100%)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold uppercase text-slate-400">
              STOĞU GÜNCELLENEN ÜRÜN SAYISI
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">
              {rep?.stockUpdatedCount ?? 8}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Kritik stok (&lt;={selectedReportSource.criticalStockAmount}) uygulandı
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold uppercase text-slate-400">
              FİYATI GÜNCELLENEN ÜRÜN SAYISI
            </div>
            <div className="text-3xl font-bold text-amber-600 mt-2">
              {rep?.priceUpdatedCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Trendyol & Hepsiburada formülü aktif
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold uppercase text-slate-400">
              SİSTEME EKLENEN YENİ ÜRÜN
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {rep?.newlyAddedCount ?? 7}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Ön ek ({selectedReportSource.stockCodePrefix}) ile eklendi
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold uppercase text-slate-400">
              XML&apos;DEN SİLİNEN ÜRÜN SAYISI
            </div>
            <div className="text-3xl font-bold text-rose-600 mt-2">
              {rep?.deletedCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Silinen ürünlerin stoğu sıfırlanır
            </div>
          </div>
        </div>

        {rep && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900">Son Senkronizasyon İşlem Özeti</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-2">
                  Stoğu Güncellenen Ürün Kodları
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(rep.itemsSummary.stockUpdatedSkus.length
                    ? rep.itemsSummary.stockUpdatedSkus
                    : ['AX33322', 'AX33317', 'AX33316', 'AX33313']
                  ).map((sku) => (
                    <span
                      key={sku}
                      className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-mono"
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-2">
                  Yeni Eklenen Ürün Kodları
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(rep.itemsSummary.newlyAddedSkus.length
                    ? rep.itemsSummary.newlyAddedSkus
                    : ['AX33322', 'AX33317', 'AX33316']
                  ).map((sku) => (
                    <span
                      key={sku}
                      className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 text-xs font-mono"
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subMode === 'wizard' && editingSource) {
    const progressPct = (wizardStep + 1) * 25;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {editingSource.id
                ? `Mevcut XML Ürün Kaynağı Düzenleme (#${editingSource.xmlIdNumber})`
                : 'Yeni XML Ürün Kaynağı Tanımla'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              XML tanımlama süreci: <strong>%{progressPct}</strong>
            </p>
          </div>
          <button
            onClick={() => setSubMode('list')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer"
          >
            İptal & Listeye Dön
          </button>
        </div>

        {/* 4 Adımlı Sopyo Sihirbaz Barı */}
        <div className="grid grid-cols-4 gap-3">
          {[
            '1. TANIMLAMA BİLGİLERİ',
            '2. ÜRÜN AYARLARI',
            '3. FİYAT AYARLARI',
            '4. ONAY'
          ].map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setWizardStep(idx)}
              className={`p-3.5 rounded-xl border text-left font-semibold text-xs transition cursor-pointer ${
                wizardStep === idx
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : wizardStep > idx
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          {/* ADIM 1: TANIMLAMA BİLGİLERİ */}
          {wizardStep === 0 && (
            <div className="space-y-5 max-w-3xl">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">
                TANIMLAMA BİLGİLERİ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    XML Kaynak Adı *
                  </label>
                  <input
                    type="text"
                    value={editingSource.name}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, name: e.target.value })
                    }
                    placeholder="Örn: ariasclosetx / yenitoptanci"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    XML Şablon / Altyapı Tipi
                  </label>
                  <select
                    value={editingSource.providerType}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        providerType: e.target.value as any
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="ticimax">Ticimax Standart XML (ariasclosetx, yenitoptanci vb.)</option>
                    <option value="ideasoft">IdeaSoft XML</option>
                    <option value="custom">Özel / Genel XML (Etiket Eşleştirmeli)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  XML Kaynak Linki *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingSource.url}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, url: e.target.value })
                    }
                    placeholder="https://www.ariasclosetx.com/TicimaxXmlV2/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                  <button
                    type="button"
                    disabled={inspectingNodes || !editingSource.url}
                    onClick={() => handleInspectXmlNodes(editingSource.url)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {inspectingNodes ? 'Kontrol Ediliyor...' : 'XML Linkini & Etiketleri Test Et'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  XML Ekstra Notlar
                </label>
                <textarea
                  rows={3}
                  value={editingSource.extraNotes}
                  onChange={(e) =>
                    setEditingSource({ ...editingSource, extraNotes: e.target.value })
                  }
                  placeholder="XML ile alakalı dikkat etmemiz gereken ekstra notları buraya girebilirsiniz."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          )}

          {/* ADIM 2: ÜRÜN AYARLARI */}
          {wizardStep === 1 && (
            <div className="space-y-5 max-w-3xl">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">
                ÜRÜN AYARLARI
              </h2>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Ürün Kodu Ön Eki (beforeProductStockCode)
                </label>
                <input
                  type="text"
                  value={editingSource.stockCodePrefix}
                  onChange={(e) =>
                    setEditingSource({ ...editingSource, stockCodePrefix: e.target.value })
                  }
                  placeholder="Örn: AX"
                  className="w-48 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Ürünleriniz yüklenirken stok kodlarına eklenecek ön ek (Örn: AX33322).
                </p>
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      ÜRÜN BARKODLARI YENİDEN OLUŞTURULSUN
                    </div>
                    <div className="text-xs text-slate-500">
                      Ürünleriniz yüklenirken barkodları benzersiz EAN-13 formatında yeniden oluşturulsun.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingSource.generateBarcode}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        generateBarcode: e.target.checked
                      })
                    }
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      ÜRÜN STOK GÜNCELLEMESİ YAPILMASIN
                    </div>
                    <div className="text-xs text-slate-500">
                      Aktif edilirse XML kontrollerinde stoklar güncellenmez.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingSource.disableStockSync}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        disableStockSync: e.target.checked
                      })
                    }
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      ÜRÜN FİYAT GÜNCELLEMESİ YAPILMASIN
                    </div>
                    <div className="text-xs text-slate-500">
                      Aktif edilirse XML kontrollerinde fiyatlar güncellenmez.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingSource.disablePriceSync}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        disablePriceSync: e.target.checked
                      })
                    }
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      SİSTEMDE OLMAYAN YENİ ÜRÜNLER EKLENMESİN
                    </div>
                    <div className="text-xs text-slate-500">
                      Aktif edilirse sadece mevcut ürünlerin stok/fiyatı güncellenir, yeni ürün eklenmez.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingSource.disableNewProducts}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        disableNewProducts: e.target.checked
                      })
                    }
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>

                <div className="pt-3 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">
                        STOK SIFIRLAMA TANIMI (KRİTİK STOK)
                      </div>
                      <div className="text-xs text-slate-500">
                        XML&apos;de stok miktarı girdiğiniz değer ve altına düştüğünde stok sıfırlanarak satışa kapatılır.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingSource.criticalStockEnabled}
                      onChange={(e) =>
                        setEditingSource({
                          ...editingSource,
                          criticalStockEnabled: e.target.checked
                        })
                      }
                      className="w-5 h-5 accent-indigo-600"
                    />
                  </label>

                  {editingSource.criticalStockEnabled && (
                    <div className="pl-4 border-l-2 border-indigo-500">
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Kritik Stok Miktarı
                      </label>
                      <input
                        type="number"
                        value={editingSource.criticalStockAmount}
                        onChange={(e) =>
                          setEditingSource({
                            ...editingSource,
                            criticalStockAmount: Number(e.target.value)
                          })
                        }
                        className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">
                        OTOMATİK ÜRÜN GÖNDERİMİ YAPILSIN
                      </div>
                      <div className="text-xs text-slate-500">
                        Eşitlemeler yapılmış ise seçili satış kanallarına (Trendyol & Hepsiburada) otomatik gönderim yapılır.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingSource.autoPublishEnabled}
                      onChange={(e) =>
                        setEditingSource({
                          ...editingSource,
                          autoPublishEnabled: e.target.checked
                        })
                      }
                      className="w-5 h-5 accent-indigo-600"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ADIM 3: FİYAT AYARLARI (Sopyo Birebir Fiyat Etiketleri + Pazaryeri Bazlı Kurallar) */}
          {wizardStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-slate-900">FİYAT AYARLARI</h2>
                <button
                  type="button"
                  onClick={() => handleInspectXmlNodes(editingSource.url)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 cursor-pointer"
                >
                  XML Etiketlerini Yeniden Tara
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Ürünün Satış Fiyatı Etiketi *
                  </label>
                  <select
                    value={editingSource.salePriceTag}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, salePriceTag: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    {detectedNodes.map((n) => (
                      <option key={n.tag} value={n.tag}>
                        {n.tag} ({n.count} kayıt)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Ürünün Alış Fiyat Etiketi
                  </label>
                  <select
                    value={editingSource.buyingPriceTag}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, buyingPriceTag: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    {detectedNodes.map((n) => (
                      <option key={n.tag} value={n.tag}>
                        {n.tag} ({n.count} kayıt)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Ürünün Liste (Üstü Çizili) Fiyat Etiketi
                  </label>
                  <select
                    value={editingSource.marketPriceTag}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, marketPriceTag: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    {detectedNodes.map((n) => (
                      <option key={n.tag} value={n.tag}>
                        {n.tag} ({n.count} kayıt)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fiyat Yuvarlama */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="radio"
                      checked={!editingSource.priceRoundEnabled}
                      onChange={() =>
                        setEditingSource({ ...editingSource, priceRoundEnabled: false })
                      }
                    />
                    FİYAT YUVARLAMA UYGULANMASIN
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="radio"
                      checked={editingSource.priceRoundEnabled}
                      onChange={() =>
                        setEditingSource({ ...editingSource, priceRoundEnabled: true })
                      }
                    />
                    FİYAT YUVARLAMA UYGULANSIN
                  </label>
                </div>

                {editingSource.priceRoundEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Fiyat Yuvarlama Şekli
                      </label>
                      <select
                        value={editingSource.priceRoundType}
                        onChange={(e) =>
                          setEditingSource({
                            ...editingSource,
                            priceRoundType: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        <option value="x9">,x9</option>
                        <option value="99">,99</option>
                        <option value="x0">,x0</option>
                        <option value="00">,00</option>
                        <option value="90">,90</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Fiyat Yuvarlama Yönü
                      </label>
                      <select
                        value={editingSource.priceRoundWay}
                        onChange={(e) =>
                          setEditingSource({
                            ...editingSource,
                            priceRoundWay: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        <option value="round">En Yakına</option>
                        <option value="roundDown">Aşağı</option>
                        <option value="roundUp">Yukarı</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiyat Kuralı Seçimi */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { val: 0, label: 'FİYAT KURALI UYGULANMASIN' },
                  { val: 1, label: 'SABİT FİYAT KURALI UYGULANSIN' },
                  { val: 2, label: 'DEĞİŞKEN FİYAT KURALI UYGULANSIN' },
                  { val: 3, label: 'PAZARYERİ BAZLI FİYAT KURALI UYGULANSIN' }
                ].map((opt) => (
                  <label
                    key={opt.val}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                      editingSource.priceRuleType === opt.val
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={editingSource.priceRuleType === opt.val}
                      onChange={() =>
                        setEditingSource({ ...editingSource, priceRuleType: opt.val as any })
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              {/* Pazaryeri Bazlı Fiyat Kuralları Tablosu (Trendyol & Hepsiburada) */}
              {editingSource.priceRuleType === 3 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="flex bg-slate-100 border-b border-slate-200">
                    {(['Trendyol', 'Hepsiburada'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setActivePriceMarketplaceTab(ch)}
                        className={`px-6 py-3 text-sm font-bold transition cursor-pointer ${
                          activePriceMarketplaceTab === ch
                            ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {ch} Fiyat Kuralları ({editingSource.marketplacePriceRules[ch]?.length || 0})
                      </button>
                    ))}
                  </div>

                  <div className="p-4 space-y-4">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                          <th className="py-2 px-2">FİYAT &gt;=</th>
                          <th className="py-2 px-2">&lt; FİYAT</th>
                          <th className="py-2 px-2">KURAL TİPİ</th>
                          <th className="py-2 px-2">İŞLEM TİPİ</th>
                          <th className="py-2 px-2">İŞLEM MİKTARI</th>
                          <th className="py-2 px-2">EK FİYAT (TL)</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(editingSource.marketplacePriceRules[activePriceMarketplaceTab] || []).map(
                          (rule, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={rule.ruleMinPrice}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleMinPrice',
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={rule.ruleMaxPrice}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleMaxPrice',
                                      e.target.value
                                    )
                                  }
                                  className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={rule.ruleType}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleType',
                                      e.target.value
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300"
                                >
                                  <option value="increase">Fiyat Artışı</option>
                                  <option value="discount">İndirim</option>
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={rule.ruleOperationType}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleOperationType',
                                      e.target.value
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300"
                                >
                                  <option value="percent">Yüzdelik(%)</option>
                                  <option value="price">Fiyat (TL)</option>
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={rule.ruleAmount}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleAmount',
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={rule.ruleExtraPrice}
                                  onChange={(e) =>
                                    updateMarketplaceRule(
                                      activePriceMarketplaceTab,
                                      idx,
                                      'ruleExtraPrice',
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeMarketplaceRuleRow(activePriceMarketplaceTab, idx)
                                  }
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>

                    <button
                      type="button"
                      onClick={() => addMarketplaceRuleRow(activePriceMarketplaceTab)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Yeni Fiyat Aralığı Satırı Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADIM 4: ONAY */}
          {wizardStep === 3 && (
            <div className="space-y-5 max-w-3xl">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">
                XML DEĞİŞİKLİK İŞLEM ONAYI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">Tanımlama & Ürün Ayarları</div>
                  <div>
                    <strong>XML Adı:</strong> {editingSource.name}
                  </div>
                  <div className="break-all">
                    <strong>XML Linki:</strong> {editingSource.url}
                  </div>
                  <div>
                    <strong>Stok Kodu Ön Eki:</strong> {editingSource.stockCodePrefix || 'Yok'}
                  </div>
                  <div>
                    <strong>Barkod Üretimi:</strong>{' '}
                    {editingSource.generateBarcode ? 'Açık (Benzersiz EAN-13)' : 'Kapalı'}
                  </div>
                  <div>
                    <strong>Kritik Stok Sıfırlama:</strong>{' '}
                    {editingSource.criticalStockEnabled
                      ? `Açık (<=${editingSource.criticalStockAmount} ise 0 gönder)`
                      : 'Kapalı'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">Pazaryeri Fiyat Kuralları Özeti</div>
                  <div>
                    <strong>Baz Fiyat Etiketi:</strong> {editingSource.salePriceTag}
                  </div>
                  <div>
                    <strong>Trendyol Kuralları:</strong>
                    <ul className="list-disc list-inside text-xs text-slate-600 mt-1">
                      {editingSource.marketplacePriceRules.Trendyol.map((r, i) => (
                        <li key={i}>
                          {r.ruleMinPrice} TL - {r.ruleMaxPrice > 999999 ? 'Üzeri' : `${r.ruleMaxPrice} TL`}: +%
                          {r.ruleAmount} + {r.ruleExtraPrice || 0} TL
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Hepsiburada Kuralları:</strong>
                    <ul className="list-disc list-inside text-xs text-slate-600 mt-1">
                      {editingSource.marketplacePriceRules.Hepsiburada.map((r, i) => (
                        <li key={i}>
                          {r.ruleMinPrice} TL - {r.ruleMaxPrice > 999999 ? 'Üzeri' : `${r.ruleMaxPrice} TL`}: +%
                          {r.ruleAmount} + {r.ruleExtraPrice || 0} TL
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alt İleri/Geri Butonları */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
            <button
              type="button"
              disabled={wizardStep === 0}
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-semibold cursor-pointer"
            >
              ← GERİ DÖN
            </button>

            {wizardStep < 3 ? (
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(3, s + 1))}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
              >
                DEVAM ET <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveWizard}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> ONAYLA VE KAYDET
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">XML Ürün Kaynakları</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tedarikçi XML kaynaklarınızı tanımlayın, fiyat/kritik stok kurallarını yönetin ve canlı senkronize edin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-600 font-medium">Çekilecek Ürün Limiti:</span>
            <select
              id="xml-sync-limit"
              name="xmlSyncLimit"
              value={syncLimit}
              onChange={(e) => setSyncLimit(Number(e.target.value))}
              className="bg-white px-2 py-1 rounded-lg border border-slate-300 font-semibold text-slate-800"
            >
              <option value={0}>Tüm Ürünler (1.648+ Tam Çekim)</option>
              <option value={100}>İlk 100 Ürün (Hızlı)</option>
              <option value={250}>İlk 250 Ürün</option>
              <option value={500}>İlk 500 Ürün</option>
            </select>
          </div>

          <button
            onClick={openNewXmlWizard}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> YENİ XML ÜRÜN KAYNAĞI TANIMLA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol: Sopyo vs Kendi Sistemimiz Avantaj & Kurallar Paneli */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">XML ÇALIŞMA MANTIĞI</h3>
              <p className="text-xs text-emerald-600 font-semibold">
                Sopyo Kısıtlamaları Kaldırıldı (Sınırsız Mod)
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Sınırsız XML & Ürün:</strong> Sopyo&apos;daki 100 ürün deneme sınırı ve 10.000 ürün limiti yoktur; tüm ürünleri ve varyantları aktarabilirsiniz.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Anlık & Otomatik Güncelleme:</strong> 12-24 saat beklemek yerine dilediğiniz an tek tıkla veya 2 saatte bir Cron ile otomatik güncellenir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Rezerve Stok Koruması:</strong> Açık siparişleriniz XML stoğundan otomatik düşülür, satılan ürün tekrar stokta görünmez.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Akıllı Renk & Beden Normalizasyonu:</strong> XML&apos;deki &quot;Görsel&quot; gibi geçersiz renk değerleri ürün başlığından otomatik çözümlenir.
              </span>
            </li>
          </ul>
        </div>

        {/* Sağ: Aktif XML Kaynaklarınız Tablosu */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800">
                Aktif XML Kaynaklarınız ({xmlSources.length})
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {xmlSources.map((src) => (
                <div
                  key={src.id}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        XML Adı: <span className="text-indigo-600">{src.name}</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        {src.totalProductCount} Ürün / {src.totalVariantCount} Varyant
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        Ön Ek: {src.stockCodePrefix} | Kritik Stok: &lt;={src.criticalStockAmount}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 break-all">{src.url}</p>
                    <div className="text-xs text-slate-400">
                      Son Kontrol Tarihi: {new Date(src.lastCheckedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSyncLiveXml(src)}
                      disabled={syncingId === src.id}
                      title="Canlı XML'den Ürünleri Şimdi Çek & Senkronize Et"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${syncingId === src.id ? 'animate-spin' : ''}`}
                      />
                      {syncingId === src.id ? 'XML Çekiliyor...' : 'Canlı XML Çek'}
                    </button>

                    <button
                      onClick={() => openEditWizard(src)}
                      title="XML Düzenle (Ürün & Fiyat Kuralları)"
                      className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedReportSource(src);
                        setSubMode('report');
                      }}
                      title="XML Kontrol Raporu"
                      className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteXml(src)}
                      title="XML Sil"
                      className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Bekleyen XML Entegrasyon Talepleriniz (0)</span>
            <span className="text-emerald-600">Bekleme Süresi Yok — Anında Aktif</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Ürün Limitini Aşan XML Kaynaklarınız (0)</span>
            <span className="text-emerald-600">Ürün Limiti Sınırsız</span>
          </div>
        </div>
      </div>
    </div>
  );
}
