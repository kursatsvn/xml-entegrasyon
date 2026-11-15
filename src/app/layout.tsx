import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sopyo Enterprise — XML & Pazaryeri Entegrasyon Paneli (Trendyol & Hepsiburada)',
  description:
    'Çok kullanıcılı (Multi-Tenant) XML Ürün Kaynağı, Trendyol ve Hepsiburada Ürün, Fiyat, Stok, Sipariş ve Rekabet Yönetim Sistemi',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='900' font-size='20'>S</text></svg>"
  }
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
