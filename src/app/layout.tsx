import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sopyo Enterprise — XML & Pazaryeri Entegrasyon Paneli (Trendyol & Hepsiburada)',
  description:
    'Çok kullanıcılı (Multi-Tenant) XML Ürün Kaynağı, Trendyol ve Hepsiburada Ürün, Fiyat, Stok, Sipariş ve Rekabet Yönetim Sistemi'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
