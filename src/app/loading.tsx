import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface text-slate-900 flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary text-white mx-auto flex items-center justify-center animate-pulse font-black text-xl shadow-sm">
          S
        </div>
        <div className="text-sm font-semibold text-slate-600">
          Sopyo Paneli Yükleniyor...
        </div>
      </div>
    </div>
  );
}
