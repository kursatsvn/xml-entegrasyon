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
  const [runningAiGuard, setRunningAiGuard] = useState(false);

  async function handleRunAiComplianceGuard() {
    setRunningAiGuard(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_ai_compliance_scan' })
      });
      const data = await res.json();
      if (data.ok) {
        notify(data.message, 'success');
        await onRefreshState();
      } else {
        notify(data.message || 'AI Katalog taraması başarısız', 'error');
      }
    } catch (e: any) {
      notify(e?.message || 'AI tarama hatası', 'error');
    } finally {
      setRunningAiGuard(false);
    }
  }
  const [inspectingNodes, setInspectingNodes] = useState(false);
  const [detectedNodes, setDetectedNodes] = useState<{ tag: string; count: number }[]>([
    { tag: 'UrunKartiID', count: 1647 },
    { tag: 'UrunAdi', count: 1647 },
    { tag: 'Aciklama', count: 1550 },
    { tag: 'Marka', count: 1647 },
    { tag: 'MarkaID', count: 1647 },
    { tag: 'SatisBirimi', count: 1647 },
    { tag: 'KategoriID', count: 1647 },
    { tag: 'Kategori', count: 1647 },
    { tag: 'KategoriTree', count: 1646 },
    { tag: 'UrunUrl', count: 1647 },
    { tag: 'VaryasyonID', count: 7273 },
    { tag: 'StokKodu', count: 7273 },
    { tag: 'Barkod', count: 7091 },
    { tag: 'StokAdedi', count: 7273 },
    { tag: 'AlisFiyati', count: 7273 },
    { tag: 'SatisFiyati', count: 7273 },
    { tag: 'IndirimliFiyat', count: 7151 },
    { tag: 'KDVDahil', count: 7273 },
    { tag: 'KdvOrani', count: 7273 },
    { tag: 'ParaBirimi', count: 7273 },
    { tag: 'ParaBirimiKodu', count: 7273 },
    { tag: 'Desi', count: 7273 },
    { tag: 'OnYazi', count: 76 },
    { tag: 'Ozellik', count: 4 },
    { tag: 'Resim', count: 344 },
    { tag: 'OzellikID', count: 10 },
    { tag: 'OzellikTanim', count: 10 },
    { tag: 'DegerID', count: 10 },
    { tag: 'DegerTanim', count: 10 }
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
      marketPriceTag: '',
      taxIncludedMode: 0,
      fixedTaxRate: 20,
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              #{selectedReportSource.name} - XML Kontrol Raporu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Son Kontrol: {new Date(selectedReportSource.lastCheckedAt).toLocaleString('tr-TR')} tarihli XML kontrol detayları
            </p>
          </div>
          <button
            onClick={() => setSubMode('list')}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer shrink-0"
          >
            ← XML Listesine Dön
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 sm:px-6 py-4 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {editingSource.id
              ? 'Mevcut XML Ürün Kaynağı Düzenleme'
              : 'Yeni XML Ürün Kaynağı Tanımla'}
          </h1>
          <button
            onClick={() => setSubMode('list')}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer shrink-0"
          >
            ← XML Ürün Kaynaklarına Dön
          </button>
        </div>

        {/* Sopyo Sol-Sağ Bölmeli 4 Adımlı Sihirbaz Kartı */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[620px]">
            {/* SOL PANEL: % İlerleme, 4 Adım, Bilgilendirme Kutusu */}
            <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-6 flex flex-col justify-between bg-slate-50/40">
              <div className="space-y-4 lg:space-y-6">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{progressPct}%</span>
                    <span className="text-xs text-slate-400 font-medium">XML tanımlama süreci</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2.5 lg:mt-3 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Mobilde Yatay Kaydırılabilir, Masaüstünde Dikey 4 Adım Listesi */}
                <div className="flex lg:block overflow-x-auto no-scrollbar gap-2 lg:space-y-1 pb-1 lg:pb-0">
                  {[
                    { idx: 0, title: 'TANIMLAMA BİLGİLERİ', short: '1. Tanımlama' },
                    { idx: 1, title: 'ÜRÜN AYARLARI', short: '2. Ürün' },
                    { idx: 2, title: 'FİYAT AYARLARI', short: '3. Fiyat' },
                    { idx: 3, title: 'ONAY', short: '4. Onay' }
                  ].map((step, i) => {
                    const isCompleted = wizardStep > step.idx;
                    const isCurrent = wizardStep === step.idx;
                    return (
                      <React.Fragment key={step.idx}>
                        <button
                          type="button"
                          onClick={() => setWizardStep(step.idx)}
                          className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:px-0 rounded-xl lg:rounded-none border lg:border-0 text-left cursor-pointer group transition ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-200 lg:bg-transparent'
                              : isCompleted
                              ? 'bg-emerald-50/70 border-emerald-200 lg:bg-transparent'
                              : 'bg-white border-slate-200 lg:bg-transparent'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-400'
                            }`}
                          >
                            {isCompleted ? '✓' : step.idx + 1}
                          </div>
                          <span
                            className={`text-xs font-bold tracking-wide whitespace-nowrap lg:whitespace-normal transition ${
                              isCompleted
                                ? 'text-emerald-600'
                                : isCurrent
                                ? 'text-blue-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            <span className="lg:hidden">{step.short}</span>
                            <span className="hidden lg:inline">{step.title}</span>
                          </span>
                        </button>
                        {i < 3 && <div className="hidden lg:block ml-3.5 h-4 border-l border-slate-200" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Mobil Kompakt IP Bilgisi */}
                <div className="lg:hidden flex items-center justify-between px-3 py-2 rounded-lg bg-orange-50/80 border border-orange-200/70 text-[11px] text-orange-700">
                  <span className="font-bold">☆ Sunucu IP:</span>
                  <span className="font-mono font-bold text-orange-600">77.92.152.100</span>
                </div>
              </div>

              {/* Sol Alt Bilgilendirme Kutusu (Masaüstü) */}
              <div className="hidden lg:block mt-8 p-4 rounded-xl bg-orange-50/80 border border-orange-200/70 text-xs space-y-1.5">
                <div className="font-bold text-orange-600 flex items-center gap-1.5">
                  <span>☆</span> BİLGİLENDİRME
                </div>
                <p className="text-orange-700/90 leading-relaxed">
                  Tedarikçinize aşağıda yer alan ip adresimizi iletebilirsiniz.
                </p>
                <div className="pt-1 font-bold text-orange-600">
                  IP Adresi : <span className="font-mono">77.92.152.100</span>
                </div>
              </div>
            </div>

            {/* SAĞ PANEL: ADIM İÇERİKLERİ */}
            <div className="lg:col-span-9 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
              <div>
                {/* ADIM 1: TANIMLAMA BİLGİLERİ */}
                {wizardStep === 0 && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <h2 className="text-base font-bold text-slate-800 tracking-wide">
                        TANIMLAMA BİLGİLERİ
                      </h2>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                          XML KAYNAK ADI <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editingSource.name}
                          onChange={(e) =>
                            setEditingSource({ ...editingSource, name: e.target.value })
                          }
                          placeholder="ariasclosetx"
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Entegrasyonu yapılacak olan XML kaynağınızın adı (Ürün listesinde bu ad ile ürünlerinizi görebilir aynı zamanda filtre uygulayabilirsiniz.)
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                          XML KAYNAK LINKI <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={editingSource.url}
                            onChange={(e) =>
                              setEditingSource({ ...editingSource, url: e.target.value })
                            }
                            placeholder="https://www.ariasclosetx.com/TicimaxXmlV2/CD636DDDFFD142D396880893BBFF5820/"
                            className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono text-slate-800"
                          />
                          <button
                            type="button"
                            disabled={inspectingNodes || !editingSource.url}
                            onClick={() => handleInspectXmlNodes(editingSource.url)}
                            className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            {inspectingNodes ? 'Taranıyor...' : 'Etiketleri Test Et'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                          XML EKSTRA NOTLAR
                        </label>
                        <textarea
                          rows={3}
                          value={editingSource.extraNotes}
                          onChange={(e) =>
                            setEditingSource({ ...editingSource, extraNotes: e.target.value })
                          }
                          placeholder="XML ile alakalı dikkat etmemiz gereken ekstra notları buraya girebilirsiniz."
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ADIM 2: ÜRÜN AYARLARI */}
                {wizardStep === 1 && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <h2 className="text-base font-bold text-slate-800 tracking-wide">
                        ÜRÜN AYARLARI
                      </h2>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                        ÜRÜN KODU ÖN EKI
                      </label>
                      <input
                        type="text"
                        value={editingSource.stockCodePrefix}
                        onChange={(e) =>
                          setEditingSource({ ...editingSource, stockCodePrefix: e.target.value })
                        }
                        placeholder="AX"
                        className="w-full max-w-xl px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-800"
                      />
                    </div>

                    <div className="space-y-5 divide-y divide-slate-100">
                      {/* 1. ÜRÜN BARKODLARI YENİDEN OLUŞTURULSUN */}
                      <div className="flex items-start justify-between gap-6 pt-4">
                        <div className="max-w-xl">
                          <div className="font-bold text-xs uppercase text-slate-800">
                            ÜRÜN BARKODLARI YENİDEN OLUŞTURULSUN
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Ürünleriniz Sopyo&apos;ya yüklenirken barkodları benzersiz bir şekilde yeniden eklemek istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={editingSource.generateBarcode}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                generateBarcode: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {editingSource.generateBarcode ? 'Ayarı Kapat' : 'Ayarı Aç'}
                          </span>
                        </label>
                      </div>

                      {/* 2. ÜRÜN STOK GÜNCELLEMESİ YAPILMASIN */}
                      <div className="flex items-start justify-between gap-6 pt-4">
                        <div className="max-w-xl">
                          <div className="font-bold text-xs uppercase text-slate-800">
                            ÜRÜN STOK GÜNCELLEMESİ YAPILMASIN
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Ürünleriniz Sopyo&apos;ya yüklendikten sonra 3 saatte bir stokları güncellenmemesini istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={editingSource.disableStockSync}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                disableStockSync: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {editingSource.disableStockSync ? 'Ayarı Kapat' : 'Ayarı Aç'}
                          </span>
                        </label>
                      </div>

                      {/* 3. ÜRÜN FİYAT GÜNCELLEMESİ YAPILMASIN */}
                      <div className="flex items-start justify-between gap-6 pt-4">
                        <div className="max-w-xl">
                          <div className="font-bold text-xs uppercase text-slate-800">
                            ÜRÜN FİYAT GÜNCELLEMESİ YAPILMASIN
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Ürünleriniz Sopyo&apos;ya yüklendikten sonra 3 saatte bir fiyatlarının güncellenmemesini istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={editingSource.disablePriceSync}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                disablePriceSync: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {editingSource.disablePriceSync ? 'Ayarı Kapat' : 'Ayarı Aç'}
                          </span>
                        </label>
                      </div>

                      {/* 4. SOPYO'DA OLMAYAN ÜRÜNLER EKLENMESİN */}
                      <div className="flex items-start justify-between gap-6 pt-4">
                        <div className="max-w-xl">
                          <div className="font-bold text-xs uppercase text-slate-800">
                            SOPYO&apos;DA OLMAYAN ÜRÜNLER EKLENMESİN
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Ürünleriniz Sopyo&apos;ya yüklendikten sonra kontrol edildiğinde Sopyo&apos;da olmayan ürünlerin eklenmemesini istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={editingSource.disableNewProducts}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                disableNewProducts: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {editingSource.disableNewProducts ? 'Ayarı Kapat' : 'Ayarı Aç'}
                          </span>
                        </label>
                      </div>

                      {/* 5. STOK SIFIRLAMA TANIMI + Kritik Stok Miktarı */}
                      <div className="pt-4 space-y-4">
                        <div className="flex items-start justify-between gap-6">
                          <div className="max-w-xl">
                            <div className="font-bold text-xs uppercase text-slate-800">
                              STOK SIFIRLAMA TANIMI
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              Ürünleriniz Sopyo&apos;ya yüklendikten sonra kontrol edildiğinde XML&apos;de stok miktarları belli bir seviye altına düştüğünde stoklarınızı sıfırlayıp satışa kapatmak istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={editingSource.criticalStockEnabled}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  criticalStockEnabled: e.target.checked
                                })
                              }
                              className="w-4 h-4 accent-blue-600 rounded"
                            />
                            <span className="text-xs font-medium text-slate-600">
                              {editingSource.criticalStockEnabled ? 'Ayarı Kapat' : 'Ayarı Aç'}
                            </span>
                          </label>
                        </div>

                        {editingSource.criticalStockEnabled && (
                          <div className="max-w-xl">
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                              KRİTİK STOK MİKTARI
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
                              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                              Girdiğiniz değer ve altında stok miktarı olan ürünlerinizin stokları sıfırlanarak satışa kapatılacaktır.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 6. OTOMATİK ÜRÜN GÖNDERİMİ YAPILSIN + Satış Kanalı Seçiniz */}
                      <div className="pt-4 space-y-4">
                        <div className="flex items-start justify-between gap-6">
                          <div className="max-w-xl">
                            <div className="font-bold text-xs uppercase text-slate-800">
                              OTOMATİK ÜRÜN GÖNDERİMİ YAPILSIN
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              Ürünleriniz Sopyo&apos;ya yüklendikten sonra eşitlemeler yapılmış ise ayarı açık olan satış kanallarına otomatik gönderiminin yapılmasını istiyorsanız bu seçeneği aktif etmeniz gerekmektedir.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={editingSource.autoPublishEnabled}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  autoPublishEnabled: e.target.checked
                                })
                              }
                              className="w-4 h-4 accent-blue-600 rounded"
                            />
                            <span className="text-xs font-medium text-slate-600">
                              {editingSource.autoPublishEnabled ? 'Ayarı Kapat' : 'Ayarı Aç'}
                            </span>
                          </label>
                        </div>

                        {editingSource.autoPublishEnabled && (
                          <div className="max-w-xl">
                            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                              SATIŞ KANALI SEÇİNİZ
                            </label>
                            <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                              {(['Hepsiburada', 'Trendyol'] as const).map((ch) => {
                                const isChecked = (
                                  editingSource.autoPublishChannels || ['Trendyol', 'Hepsiburada']
                                ).includes(ch);
                                return (
                                  <label
                                    key={ch}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = new Set(
                                          editingSource.autoPublishChannels || [
                                            'Trendyol',
                                            'Hepsiburada'
                                          ]
                                        );
                                        if (e.target.checked) current.add(ch);
                                        else current.delete(ch);
                                        setEditingSource({
                                          ...editingSource,
                                          autoPublishChannels: Array.from(current)
                                        });
                                      }}
                                      className="w-4 h-4 accent-blue-600"
                                    />
                                    {ch}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ADIM 3: FİYAT AYARLARI */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <h2 className="text-base font-bold text-slate-800 tracking-wide">
                        FİYAT AYARLARI
                      </h2>
                    </div>

                    {/* 3 Etiket Seçimi: Satış Fiyatı, Alış Fiyatı, Liste(Üstü Çizili) Fiyatı */}
                    <div className="space-y-4 max-w-2xl">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          ÜRÜNÜN SATIŞ FİYATI ETİKETİ <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={editingSource.salePriceTag || 'SatisFiyati'}
                          onChange={(e) =>
                            setEditingSource({ ...editingSource, salePriceTag: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="">----------</option>
                          {detectedNodes.map((n) => (
                            <option key={n.tag} value={n.tag}>
                              {n.tag}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          ÜRÜNÜN ALIŞ FİYAT ETİKETİ
                        </label>
                        <select
                          value={editingSource.buyingPriceTag || 'SatisFiyati'}
                          onChange={(e) =>
                            setEditingSource({ ...editingSource, buyingPriceTag: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="">----------</option>
                          {detectedNodes.map((n) => (
                            <option key={n.tag} value={n.tag}>
                              {n.tag}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          ÜRÜNÜN LİSTE(ÜSTÜ ÇİZİLİ) FİYAT ETİKETİ
                        </label>
                        <select
                          value={editingSource.marketPriceTag || ''}
                          onChange={(e) =>
                            setEditingSource({ ...editingSource, marketPriceTag: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="">----------</option>
                          {detectedNodes.map((n) => (
                            <option key={n.tag} value={n.tag}>
                              {n.tag}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* KDV Seçimi (3 Kutulu Radyo: FİYATLARA KDV DAHİL | XML KDV ETİKETİNİ KULLAN | MANUEL KDV ORANI KULLAN) */}
                    <div className="space-y-3 max-w-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { val: 0, label: 'FİYATLARA KDV DAHİL' },
                          { val: 1, label: 'XML KDV ETİKETİNİ KULLAN' },
                          { val: 2, label: 'MANUEL KDV ORANI KULLAN' }
                        ].map((kdvOpt) => (
                          <label
                            key={kdvOpt.val}
                            className={`p-3.5 rounded-lg border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                              (editingSource.taxIncludedMode ?? 0) === kdvOpt.val
                                ? 'bg-blue-50/70 border-blue-500 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="radio"
                              checked={(editingSource.taxIncludedMode ?? 0) === kdvOpt.val}
                              onChange={() =>
                                setEditingSource({
                                  ...editingSource,
                                  taxIncludedMode: kdvOpt.val as 0 | 1 | 2
                                })
                              }
                              className="w-4 h-4 accent-blue-600"
                            />
                            {kdvOpt.label}
                          </label>
                        ))}
                      </div>

                      {editingSource.taxIncludedMode === 1 && (
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                            XML KDV ETİKETİNİ KULLAN
                          </label>
                          <select
                            value={editingSource.customTagMapping?.vatRate || 'KdvOrani'}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                customTagMapping: {
                                  ...editingSource.customTagMapping,
                                  vatRate: e.target.value
                                }
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                          >
                            <option value="">----------</option>
                            {detectedNodes.map((n) => (
                              <option key={n.tag} value={n.tag}>
                                {n.tag}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {editingSource.taxIncludedMode === 2 && (
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                            MANUEL KDV ORANI KULLAN
                          </label>
                          <select
                            value={editingSource.fixedTaxRate || 20}
                            onChange={(e) =>
                              setEditingSource({
                                ...editingSource,
                                fixedTaxRate: Number(e.target.value)
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                          >
                            <option value={20}>20</option>
                            <option value={18}>18</option>
                            <option value={10}>10</option>
                            <option value={8}>8</option>
                            <option value={1}>1</option>
                            <option value={0}>0</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Fiyat Yuvarlama (2 Kutulu Radyo: FİYAT YUVARLAMA UYGULANMASIN | FİYAT YUVARLAMA UYGULANSIN) */}
                    <div className="space-y-3 max-w-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-3.5 rounded-lg border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                            !editingSource.priceRoundEnabled
                              ? 'bg-blue-50/70 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={!editingSource.priceRoundEnabled}
                            onChange={() =>
                              setEditingSource({ ...editingSource, priceRoundEnabled: false })
                            }
                            className="w-4 h-4 accent-blue-600"
                          />
                          FİYAT YUVARLAMA UYGULANMASIN
                        </label>
                        <label
                          className={`p-3.5 rounded-lg border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                            editingSource.priceRoundEnabled
                              ? 'bg-blue-50/70 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={editingSource.priceRoundEnabled}
                            onChange={() =>
                              setEditingSource({ ...editingSource, priceRoundEnabled: true })
                            }
                            className="w-4 h-4 accent-blue-600"
                          />
                          FİYAT YUVARLAMA UYGULANSIN
                        </label>
                      </div>

                      {editingSource.priceRoundEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                              FİYAT YUVARLAMA ŞEKLİ
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
                              FİYAT YUVARLAMA YÖNÜ
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

                    {/* Fiyat Kuralı Seçimi (4 Kutulu Radyo) */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-2xl">
                      {[
                        { val: 0, label: 'FİYAT KURALI UYGULANMASIN' },
                        { val: 1, label: 'SABİT FİYAT KURALI UYGULANSIN' },
                        { val: 2, label: 'DEĞİŞKEN FİYAT KURALI UYGULANSIN' },
                        { val: 3, label: 'PAZARYERİ BAZLI FİYAT KURALI UYGULANSIN' }
                      ].map((opt) => (
                        <label
                          key={opt.val}
                          className={`p-3.5 rounded-lg border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                            editingSource.priceRuleType === opt.val
                              ? 'bg-blue-50/70 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={editingSource.priceRuleType === opt.val}
                            onChange={() =>
                              setEditingSource({ ...editingSource, priceRuleType: opt.val as any })
                            }
                            className="w-4 h-4 accent-blue-600 shrink-0"
                          />
                          <span className="leading-snug">{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Sabit Fiyat Kuralı Tablosu (priceRuleType === 1) */}
                    {editingSource.priceRuleType === 1 && (
                      <div className="border border-slate-200 rounded-xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block font-bold uppercase text-slate-500 mb-1">
                              KURAL TİPİ
                            </label>
                            <select
                              value={editingSource.fixedPriceRule.ruleType}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  fixedPriceRule: {
                                    ...editingSource.fixedPriceRule,
                                    ruleType: e.target.value as any
                                  }
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="increase">Fiyat Artışı</option>
                              <option value="discount">İndirim</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold uppercase text-slate-500 mb-1">
                              İŞLEM TİPİ
                            </label>
                            <select
                              value={editingSource.fixedPriceRule.ruleOperationType}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  fixedPriceRule: {
                                    ...editingSource.fixedPriceRule,
                                    ruleOperationType: e.target.value as any
                                  }
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="percent">Yüzdelik(%)</option>
                              <option value="price">Fiyat</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold uppercase text-slate-500 mb-1">
                              İŞLEM MİKTARI
                            </label>
                            <input
                              type="number"
                              value={editingSource.fixedPriceRule.ruleAmount}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  fixedPriceRule: {
                                    ...editingSource.fixedPriceRule,
                                    ruleAmount: Number(e.target.value)
                                  }
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block font-bold uppercase text-slate-500 mb-1">
                              EK FİYAT (TL)
                            </label>
                            <input
                              type="number"
                              value={editingSource.fixedPriceRule.ruleExtraPrice}
                              onChange={(e) =>
                                setEditingSource({
                                  ...editingSource,
                                  fixedPriceRule: {
                                    ...editingSource.fixedPriceRule,
                                    ruleExtraPrice: Number(e.target.value)
                                  }
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pazaryeri Bazlı Fiyat Kuralları Tablosu (Hepsiburada & Trendyol) */}
                    {editingSource.priceRuleType === 3 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex bg-slate-50 border-b border-slate-200">
                          {(['Hepsiburada', 'Trendyol'] as const).map((ch) => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setActivePriceMarketplaceTab(ch)}
                              className={`flex-1 sm:flex-none px-5 sm:px-6 py-3 text-xs font-bold transition cursor-pointer ${
                                activePriceMarketplaceTab === ch
                                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 sm:p-4 space-y-4">
                          {/* Mobil Kural Kartları */}
                          <div className="md:hidden space-y-3">
                            {(
                              editingSource.marketplacePriceRules[activePriceMarketplaceTab] || []
                            ).map((rule, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                  <span className="font-bold text-slate-700">
                                    {activePriceMarketplaceTab} Kural #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeMarketplaceRuleRow(activePriceMarketplaceTab, idx)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Sil
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      FİYAT &gt;=
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      &lt; FİYAT
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      KURAL TİPİ
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                                    >
                                      <option value="increase">Fiyat Artışı</option>
                                      <option value="discount">İndirim</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      İŞLEM TİPİ
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                                    >
                                      <option value="percent">Yüzdelik(%)</option>
                                      <option value="price">Fiyat</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      İŞLEM MİKTARI
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                      EK FİYAT (TL)
                                    </label>
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
                                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Masaüstü Tablosu */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 uppercase text-slate-500">
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
                                {(
                                  editingSource.marketplacePriceRules[activePriceMarketplaceTab] || []
                                ).map((rule, idx) => (
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
                                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300"
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
                                        <option value="price">Fiyat</option>
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
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <button
                            type="button"
                            onClick={() => addMarketplaceRuleRow(activePriceMarketplaceTab)}
                            className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> YENİ SATIR EKLE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ADIM 4: ONAY (Sopyo Birebir Önizleme + Ürün Ayar Seçimleri + XML Fiyat Ayar Seçimleri + Tablo) */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <h2 className="text-base font-bold text-slate-800">
                        KAYNAK ADI: <span className="text-slate-900">{editingSource.name}</span>
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                        ? Kalan Ürün Limitiniz : Sınırsız ({editingSource.totalProductCount || 1647} Ürün)
                      </span>
                    </div>

                    {/* 1. ÖRNEK ÜRÜN DEĞİŞİKLİK ÖNİZLEMESİ */}
                    <div className="border-b border-slate-200 pb-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wide">
                        ÖRNEK ÜRÜN DEĞİŞİKLİK ÖNİZLEMESİ
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-8 pl-2">
                        <div className="w-24 h-24 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shrink-0">
                          🥿
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                              <span className="text-blue-500">▣</span> ÜRÜN KODU
                            </div>
                            <div className="text-base font-bold text-slate-800 mt-0.5 font-mono">
                              KET000123 <span className="text-blue-600 mx-1">➔</span>{' '}
                              <span className="underline decoration-blue-600 text-blue-700">
                                {editingSource.stockCodePrefix || 'AX'}
                              </span>
                              KET000123
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                              <span className="text-blue-500">||||||||</span> ÜRÜN BARKODU
                            </div>
                            <div className="text-base font-bold text-slate-800 mt-0.5 font-mono">
                              869000203134 <span className="text-blue-600 mx-1">➔</span>{' '}
                              {editingSource.generateBarcode ? '869000123246' : '869000203134'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. ÜRÜN AYAR SEÇİMLERİ */}
                    <div className="border-b border-slate-200 pb-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wide">
                        ÜRÜN AYAR SEÇİMLERİ
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> ÜRÜN BARKODLARI YENİDEN
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.generateBarcode ? 'OLUŞTURULSUN' : 'OLUŞTURULMASIN'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> STOK GÜNCELLEMESİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.disableStockSync ? 'YAPILMASIN' : 'YAPILSIN'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> FİYAT GÜNCELLEMESİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.disablePriceSync ? 'YAPILMASIN' : 'YAPILSIN'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> SOPYO&apos;DA OLMAYAN ÜRÜNLER
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.disableNewProducts ? 'EKLENMESİN' : 'EKLENSİN'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. XML FİYAT AYAR SEÇİMLERİ */}
                    <div className="border-b border-slate-200 pb-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wide">
                        XML FİYAT AYAR SEÇİMLERİ
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> XML SATIŞ FİYATI ETİKETİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.salePriceTag || 'SatisFiyati'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> XML ALIŞ FİYATI ETİKETİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.buyingPriceTag || 'SatisFiyati'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> XML LİSTE(ÜSTÜ ÇİZİLİ) FİYATI ETİKETİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.marketPriceTag ? editingSource.marketPriceTag : 'KULLANILMASIN'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> KRİTİK STOK MİKTARI
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.criticalStockEnabled ? editingSource.criticalStockAmount : 'Yok'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> FİYAT KURALI
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {editingSource.priceRuleType === 3
                              ? 'PAZARYERİ BAZLI FİYAT KURALI UYGULANSIN'
                              : editingSource.priceRuleType === 2
                              ? 'DEĞİŞKEN FİYAT KURALI UYGULANSIN'
                              : editingSource.priceRuleType === 1
                              ? 'SABİT FİYAT KURALI UYGULANSIN'
                              : 'FİYAT KURALI UYGULANMASIN'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                            <span className="text-blue-500">?</span> KDV BİLGİSİ
                          </div>
                          <div className="text-sm font-bold text-slate-800 mt-1">
                            {(editingSource.taxIncludedMode ?? 0) === 0
                              ? 'FİYATLARA KDV DAHİL'
                              : editingSource.taxIncludedMode === 1
                              ? 'XML KDV ETİKETİNİ KULLAN'
                              : `MANUEL KDV ORANI (%${editingSource.fixedTaxRate || 20})`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. PAZARYERİ FİYAT KURALLARI ÖZET TABLOSU (Hepsiburada | Trendyol) */}
                    {editingSource.priceRuleType === 3 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex bg-slate-50 border-b border-slate-200">
                          {(['Hepsiburada', 'Trendyol'] as const).map((ch) => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setActivePriceMarketplaceTab(ch)}
                              className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 text-xs font-bold transition cursor-pointer ${
                                activePriceMarketplaceTab === ch
                                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                        <div className="p-3 sm:p-4">
                          {/* Mobil Özet Kartları */}
                          <div className="md:hidden space-y-2">
                            {(
                              editingSource.marketplacePriceRules[activePriceMarketplaceTab] || []
                            ).map((r, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                  <span>
                                    {r.ruleMinPrice} ₺ –{' '}
                                    {r.ruleMaxPrice > 999999 ? '∞' : `${r.ruleMaxPrice} ₺`}
                                  </span>
                                  <span className="text-blue-600">
                                    {r.ruleType === 'increase' ? '+' : '-'}
                                    {r.ruleAmount}
                                    {r.ruleOperationType === 'percent' ? '%' : ' ₺'}
                                    {r.ruleExtraPrice ? ` + ${r.ruleExtraPrice} ₺` : ''}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {r.ruleType === 'increase' ? 'Fiyat Artışı' : 'İndirim'} •{' '}
                                  {r.ruleOperationType === 'percent' ? 'Yüzdelik(%)' : 'Fiyat'}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Masaüstü Tablosu */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 uppercase text-slate-500">
                                  <th className="py-2 px-2">FİYAT &gt;=</th>
                                  <th className="py-2 px-2">&lt; FİYAT</th>
                                  <th className="py-2 px-2">KURAL TİPİ</th>
                                  <th className="py-2 px-2">İŞLEM TİPİ</th>
                                  <th className="py-2 px-2">İŞLEM MİKTARI</th>
                                  <th className="py-2 px-2">EK FİYAT (TL)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(
                                  editingSource.marketplacePriceRules[activePriceMarketplaceTab] || []
                                ).map((r, i) => (
                                  <tr key={i} className="text-slate-800 font-medium">
                                    <td className="py-2.5 px-2">{r.ruleMinPrice}</td>
                                    <td className="py-2.5 px-2">
                                      {r.ruleMaxPrice > 999999 ? '9999999999999999' : r.ruleMaxPrice}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      {r.ruleType === 'increase' ? 'Fiyat Artışı' : 'İndirim'}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      {r.ruleOperationType === 'percent' ? 'Yüzdelik(%)' : 'Fiyat'}
                                    </td>
                                    <td className="py-2.5 px-2">{r.ruleAmount}</td>
                                    <td className="py-2.5 px-2">{r.ruleExtraPrice || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Alt İleri / Önceki Adım / Onayla ve Bitir Barı */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-5 mt-6 sm:pt-6 sm:mt-8 border-t border-slate-200">
                {wizardStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ← ÖNCEKİ ADIM
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.min(3, s + 1))}
                    className="w-full sm:w-auto min-h-[44px] px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    DEVAM ET →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveWizard}
                    className="w-full sm:w-auto min-h-[44px] px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ONAYLA VE BİTİR →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">XML Ürün Kaynakları</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tedarikçi XML kaynaklarınızı tanımlayın, fiyat/kritik stok kurallarını yönetin ve canlı senkronize edin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-100 px-3 py-2 rounded-xl text-xs w-full sm:w-auto">
            <span className="text-slate-600 font-medium shrink-0">Limit:</span>
            <select
              id="xml-sync-limit"
              name="xmlSyncLimit"
              value={syncLimit}
              onChange={(e) => setSyncLimit(Number(e.target.value))}
              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800 flex-1 sm:flex-none min-w-0"
            >
              <option value={0}>Tüm Ürünler (1.648+ Tam Çekim)</option>
              <option value={100}>İlk 100 Ürün (Hızlı)</option>
              <option value={250}>İlk 250 Ürün</option>
              <option value={500}>İlk 500 Ürün</option>
            </select>
          </div>

          <button
            onClick={openNewXmlWizard}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" /> YENİ XML KAYNAĞI TANIMLA
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
                <strong>3 Saatte Bir Otomatik XML Senkronizasyonu:</strong> Her 3 saatte bir (<code>0 */3 * * *</code>) XML kaynağınız otomatik çekilir, stok ve fiyatlar Trendyol &amp; Hepsiburada&apos;da güncellenir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>🛡️ AI Yasaklı Kelime &amp; İhlal Koruması:</strong> Her XML güncellemesinde <em>&quot;%100 Orijinal&quot;, &quot;Etek altı&quot;, &quot;Göğüs dikleştirici&quot;, &quot;Erotik&quot;</em> gibi Trendyol red sebebi kelimeler otomatik temizlenir; satışı yasak ürünler (Yenilebilir ürün vb.) otomatik engellenir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Çoklanan Ürün Önleyici (Tekilleştirme):</strong> Tedarikçi XML&apos;inde farklı stok kodlarıyla açılmış aynı <em>(Ürün Başlığı + Renk)</em> kartları her güncellemede otomatik tekilleştirilir; her üründen yalnızca 1 adet gönderilir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>0,00 TL Fiyat &amp; Akıllı Kategori Koruması:</strong> XML satış fiyatı 0 TL olan ürünler pazaryerine gönderilmez ve yanlış kategorili ürünler (Göğüs ucu kapatıcı vb.) doğru yaprak kategoriye yönlendirilir.
              </span>
            </li>
          </ul>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleRunAiComplianceGuard}
              disabled={runningAiGuard}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${runningAiGuard ? 'animate-spin' : ''}`} />
              {runningAiGuard
                ? 'AI Katalog & İhlal Taraması Çalışıyor...'
                : '🛡️ AI Yasaklı Kelime & Çoklanan Ürün Taramasını Şimdi Çalıştır'}
            </button>
          </div>
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
                  className="p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        XML Adı: <span className="text-indigo-600">{src.name}</span>
                      </span>
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        {src.totalProductCount} Ürün / {src.totalVariantCount} Varyant
                      </span>
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        Ön Ek: {src.stockCodePrefix} | Kritik: &lt;={src.criticalStockAmount}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 break-all">{src.url}</p>
                    <div className="text-xs text-slate-400">
                      Son Kontrol Tarihi: {new Date(src.lastCheckedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSyncLiveXml(src)}
                      disabled={syncingId === src.id}
                      title="Canlı XML'den Ürünleri Şimdi Çek & Senkronize Et"
                      className="flex-1 sm:flex-none min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${syncingId === src.id ? 'animate-spin' : ''}`}
                      />
                      {syncingId === src.id ? 'Çekiliyor...' : 'Canlı XML Çek'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingSource(JSON.parse(JSON.stringify(src)));
                        setWizardStep(2);
                        setSubMode('wizard');
                      }}
                      title="XML Fiyat Ayarları (% Yüzde + Ekstra TL)"
                      className="flex-1 sm:flex-none min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                    >
                      % + ₺ Fiyat Ayarı
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => openEditWizard(src)}
                        title="XML Düzenle (Ürün & Fiyat Kuralları)"
                        className="flex-1 sm:flex-none min-h-[42px] min-w-[42px] inline-flex items-center justify-center gap-1.5 px-3 sm:p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="sm:hidden">Düzenle</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedReportSource(src);
                          setSubMode('report');
                        }}
                        title="XML Kontrol Raporu"
                        className="flex-1 sm:flex-none min-h-[42px] min-w-[42px] inline-flex items-center justify-center gap-1.5 px-3 sm:p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="sm:hidden">Rapor</span>
                      </button>

                      <button
                        onClick={() => handleDeleteXml(src)}
                        title="XML Sil"
                        className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
