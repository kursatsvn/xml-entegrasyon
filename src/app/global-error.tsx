'use client';

import React from 'react';

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center font-black text-xl">
            S
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Sistem Geçici Olarak Yanıt Veremedi</h2>
          <p className="text-xs text-slate-500">
            Lütfen sayfayı yenileyerek tekrar deneyin.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            Sayfayı Yenile
          </button>
        </div>
      </body>
    </html>
  );
}
