import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#ffffff'
};

export const metadata: Metadata = {
  title: 'Sopyo Enterprise — XML & Pazaryeri Entegrasyon Paneli (Trendyol & Hepsiburada)',
  description:
    'Çok kullanıcılı (Multi-Tenant) XML Ürün Kaynağı, Trendyol ve Hepsiburada Ürün, Fiyat, Stok, Sipariş ve Rekabet Yönetim Sistemi',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sopyo Pro'
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased selection:bg-indigo-600 selection:text-white overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
