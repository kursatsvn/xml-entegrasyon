import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sopyo Pro — XML & Pazaryeri Yönetimi',
    short_name: 'Sopyo Pro',
    description:
      'Trendyol & Hepsiburada XML entegrasyonu, otomatik stok/fiyat senkronizasyonu, sipariş ve kargo yönetimi.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f5f9',
    theme_color: '#ffffff',
    lang: 'tr',
    categories: ['business', 'productivity', 'shopping'],
    icons: [
      {
        src: '/pwa-icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Siparişler',
        short_name: 'Siparişler',
        description: 'Siparişler ve Kargo Fişleri',
        url: '/?tab=orders'
      },
      {
        name: 'Ürün Listesi',
        short_name: 'Ürünler',
        description: 'Ürünleri ve Fiyatları Yönet',
        url: '/?tab=products'
      },
      {
        name: 'XML Kaynakları',
        short_name: 'XML',
        description: 'Canlı XML Çek ve Ayarlar',
        url: '/?tab=xml'
      }
    ]
  };
}
