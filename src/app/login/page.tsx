'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck, Store, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('zekihamdicinarr@gmail.com');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading || typeof window === 'undefined') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLoadingStage(
      mode === 'login'
        ? 'Kimlik bilgileri doğrulanıyor ve oturum açılıyor...'
        : 'Yeni mağaza alanınız ve yönetici hesabınız oluşturuluyor...'
    );
    setError('');
    let redirected = false;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { action: 'login', email, password }
            : { action: 'register', storeName, fullName, email, phone, password }
        )
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || 'Giriş yapılamadı.');
      } else {
        redirected = true;
        setLoadingStage('Başarılı! Yönetim paneliniz hazırlanıyor...');
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Bağlantı hatası');
    } finally {
      if (!redirected) {
        setLoading(false);
        setLoadingStage('');
      }
    }
  }

  return (
    <div className="min-h-[100dvh] pt-safe pb-safe grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-white">
      {/* Sol Tanıtım Alanı (Mobilde Formun Altında, Masaüstünde Solda) */}
      <div className="order-2 lg:order-1 lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 lg:p-12 flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-slate-800">
        <div>
          <div className="hidden lg:flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">
              S
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">Sopyo</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Multi-Tenant Cloud
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-4 lg:mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sınırsız XML & Anlık Çapraz Stok Senkronizasyonu
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight mb-5 lg:mb-6">
            XML Kaynaklarını Trendyol ve Hepsiburada ile Tek Merkezden Eşitle.
          </h2>

          <ul className="space-y-3.5 lg:space-y-4 text-slate-300 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Sınırsız XML & Ürün Aktarımı:</strong> 100 ürün veya 24 saat bekleme sınırı olmadan Ticimax ve özel XML kaynaklarını anında çekin.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Otomatik Çapraz Stok Düşme:</strong> Trendyol&apos;dan sipariş geldiği anda Hepsiburada stoğunuz (veya tersi) otomatik düşer; rezerve stok korunur.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Çok Kullanıcılı (SaaS) Mağaza Yapısı:</strong> Her kullanıcı kendi mağazasını açıp kendi Trendyol/Hepsiburada API ve XML linklerini güvenle yönetebilir.
              </span>
            </li>
          </ul>
        </div>

        <div className="pt-6 mt-6 lg:pt-8 border-t border-slate-800/80">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
            Aktif Resmi Pazaryeri Entegrasyonları
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 font-semibold text-xs sm:text-sm">
              Trendyol Partner API
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs sm:text-sm">
              Hepsiburada Merchant API
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-xs sm:text-sm">
              Ticimax & Genel XML
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Form Alanı (Mobilde İlk Sırada Görünür) */}
      <div className="order-1 lg:order-2 lg:col-span-7 bg-white text-slate-900 flex flex-col items-center justify-center p-5 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobil Üst Marka Şeridi */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow">
              S
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-base leading-none">
                SOPYO <span className="text-blue-600 text-xs">PRO</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Trendyol & Hepsiburada XML Paneli
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {mode === 'login' ? 'Tekrar hoş geldin' : 'Yeni Mağaza Hesabı Oluştur'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'login'
                  ? 'Mağaza yönetim paneline erişmek için giriş yapın.'
                  : 'Kendi XML ve Trendyol/Hepsiburada API bilgilerinizle hemen başlayın.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                mode === 'register'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ücretsiz Kayıt Ol
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Mağaza / Firma Adı *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Örn: LuneRose / ModaButik"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                      Ad Soyad *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Adınız Soyadınız"
                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                      Telefon
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                E-Posta Adresi *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@magaza.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Şifre *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {loading
                ? 'İşleniyor...'
                : mode === 'login'
                ? 'Giriş Yap'
                : 'Mağazamı Oluştur ve Başla'}
            </button>
          </form>

          {loading && (
            <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {mode === 'login' ? 'Giriş Yapılıyor' : 'Mağazanız Oluşturuluyor'}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{loadingStage}</p>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Hazır Tanımlı Ana Hesap (LuneRose - Süper Admin)
              </div>
              <div>
                <strong>E-posta:</strong> zekihamdicinarr@gmail.com
              </div>
              <div className="text-slate-500 pt-1">
                * Yeni bir kişi/mağaza eklemek için üstteki <strong>Ücretsiz Kayıt Ol</strong> sekmesini veya panel içindeki <strong>Süper Admin</strong> menüsünü kullanabilirsiniz.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
