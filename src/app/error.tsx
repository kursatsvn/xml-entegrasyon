'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900">Beklenmeyen Bir Hata Oluştu</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ekran yüklenirken geçici bir sorun oluştu. Verileriniz güvende — sayfayı yeniden
            deneyebilirsiniz.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
          <a
            href="/login"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center"
          >
            Giriş Ekranı
          </a>
        </div>
      </div>
    </div>
  );
}
