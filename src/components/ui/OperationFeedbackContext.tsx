'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Lock, ShieldAlert } from 'lucide-react';

export interface RunOperationOptions {
  title: string;
  description?: string;
  mode?: 'blocking' | 'soft';
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export interface PromptDialogOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ActiveOperationState {
  id: number;
  title: string;
  description: string;
  mode: 'blocking' | 'soft';
  startedAt: number;
}

interface DialogState {
  kind: 'confirm' | 'prompt';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'primary';
  defaultValue?: string;
  placeholder?: string;
  resolve: (val: any) => void;
}

export interface OperationFeedbackContextValue {
  isBusy: boolean;
  isBlocking: boolean;
  activeOperation: ActiveOperationState | null;
  hasUnsavedChanges: boolean;
  setOperationStage: (description: string) => void;
  runOperation: <T>(
    options: RunOperationOptions,
    task: (helpers: { setStage: (description: string) => void }) => Promise<T>
  ) => Promise<T | undefined>;
  guardNavigation: (onProceed: () => void, customDirtyMessage?: string) => void;
  confirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
  promptDialog: (options: PromptDialogOptions) => Promise<string | null>;
  registerDirtySource: (sourceId: string, isDirty: boolean) => void;
  clearAllDirtySources: () => void;
}

const OperationFeedbackContext = createContext<OperationFeedbackContextValue | null>(null);

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function OperationFeedbackProvider({
  children,
  onBlockedAttempt
}: {
  children: React.ReactNode;
  onBlockedAttempt?: (message: string) => void;
}) {
  const [activeOperation, setActiveOperation] = useState<ActiveOperationState | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showSoftIndicator, setShowSoftIndicator] = useState(false);
  const [blockedPulse, setBlockedPulse] = useState(false);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptInput, setPromptInput] = useState('');

  const busyRef = useRef<ActiveOperationState | null>(null);
  const opSeqRef = useRef(0);
  const dirtyMapRef = useRef<Map<string, boolean>>(new Map());
  const blockedCallbackRef = useRef(onBlockedAttempt);

  useEffect(() => {
    blockedCallbackRef.current = onBlockedAttempt;
  }, [onBlockedAttempt]);

  const hasUnsavedChanges = useMemo(() => {
    void dirtyVersion;
    for (const val of dirtyMapRef.current.values()) {
      if (val) return true;
    }
    return false;
  }, [dirtyVersion]);

  const registerDirtySource = useCallback((sourceId: string, isDirty: boolean) => {
    const prev = dirtyMapRef.current.get(sourceId) || false;
    if (prev === isDirty) return;
    if (isDirty) {
      dirtyMapRef.current.set(sourceId, true);
    } else {
      dirtyMapRef.current.delete(sourceId);
    }
    setDirtyVersion((v) => v + 1);
  }, []);

  const clearAllDirtySources = useCallback(() => {
    if (dirtyMapRef.current.size === 0) return;
    dirtyMapRef.current.clear();
    setDirtyVersion((v) => v + 1);
  }, []);

  // Canlı geçen süre sayacı (saniye bazlı)
  useEffect(() => {
    if (!activeOperation) {
      setElapsedSec(0);
      setShowSoftIndicator(false);
      return;
    }

    setElapsedSec(Math.max(0, Math.floor((Date.now() - activeOperation.startedAt) / 1000)));
    const interval = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - activeOperation.startedAt) / 1000)));
    }, 1000);

    let softTimer: ReturnType<typeof setTimeout> | null = null;
    if (activeOperation.mode === 'soft') {
      softTimer = setTimeout(() => setShowSoftIndicator(true), 150);
    }

    return () => {
      clearInterval(interval);
      if (softTimer) clearTimeout(softTimer);
    };
  }, [activeOperation]);

  // Tarayıcı sekmesi kapatma / F5 yenileme koruması
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeOperation && !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        'Devam eden bir işlem veya kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinize emin misiniz?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeOperation, hasUnsavedChanges]);

  // ESC tuşunun devam eden bloklayıcı işlemi kapatmasını engelle
  useEffect(() => {
    if (!activeOperation || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeOperation]);

  const setOperationStage = useCallback((description: string) => {
    setActiveOperation((prev) => (prev ? { ...prev, description } : null));
    if (busyRef.current) {
      busyRef.current = { ...busyRef.current, description };
    }
  }, []);

  const triggerBlockedFeedback = useCallback((msg?: string) => {
    setBlockedPulse(true);
    setTimeout(() => setBlockedPulse(false), 650);
    blockedCallbackRef.current?.(
      msg || 'Devam eden işlem tamamlanmadan sayfadan ayrılamaz veya başka işlem başlatamazsınız.'
    );
  }, []);

  const runOperation = useCallback(
    async <T,>(
      options: RunOperationOptions,
      task: (helpers: { setStage: (description: string) => void }) => Promise<T>
    ): Promise<T | undefined> => {
      if (busyRef.current) {
        triggerBlockedFeedback('Şu anda devam eden bir işlem var, lütfen tamamlanmasını bekleyin.');
        return undefined;
      }

      const nextOp: ActiveOperationState = {
        id: ++opSeqRef.current,
        title: options.title,
        description:
          options.description || 'Lütfen bekleyin, işleminiz sunucu tarafından gerçekleştiriliyor...',
        mode: options.mode || 'blocking',
        startedAt: Date.now()
      };

      busyRef.current = nextOp;
      setActiveOperation(nextOp);

      try {
        return await task({ setStage: setOperationStage });
      } finally {
        if (busyRef.current?.id === nextOp.id) {
          busyRef.current = null;
          setActiveOperation(null);
        }
      }
    },
    [setOperationStage, triggerBlockedFeedback]
  );

  const confirmDialog = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Onayla ve Devam Et',
        cancelText: options.cancelText || 'Vazgeç',
        variant: options.variant || 'primary',
        resolve
      });
    });
  }, []);

  const promptDialog = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    setPromptInput(options.defaultValue || '');
    return new Promise<string | null>((resolve) => {
      setDialog({
        kind: 'prompt',
        title: options.title,
        message: options.message,
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
        confirmText: options.confirmText || 'Gönder',
        cancelText: options.cancelText || 'Vazgeç',
        variant: 'warning',
        resolve
      });
    });
  }, []);

  const guardNavigation = useCallback(
    (onProceed: () => void, customDirtyMessage?: string) => {
      if (busyRef.current) {
        triggerBlockedFeedback(
          `"${busyRef.current.title}" işlemi devam ediyor. Lütfen işlem bitene kadar sayfadan ayrılmayın.`
        );
        return;
      }

      if (hasUnsavedChanges) {
        confirmDialog({
          title: 'Kaydedilmemiş Değişiklikleriniz Var',
          message:
            customDirtyMessage ||
            'Bu ekranda kaydetmediğiniz düzenlemeler bulunuyor. Başka bir bölüme geçerseniz yaptığınız değişiklikler kaybolacaktır.',
          confirmText: 'Kaydetmeden Çık',
          cancelText: 'Sayfada Kal',
          variant: 'warning'
        }).then((confirmed) => {
          if (confirmed) {
            clearAllDirtySources();
            onProceed();
          }
        });
        return;
      }

      onProceed();
    },
    [clearAllDirtySources, confirmDialog, hasUnsavedChanges, triggerBlockedFeedback]
  );

  const closeDialog = (result: any) => {
    if (!dialog) return;
    const resolver = dialog.resolve;
    setDialog(null);
    resolver(result);
  };

  const contextValue = useMemo<OperationFeedbackContextValue>(
    () => ({
      isBusy: Boolean(activeOperation),
      isBlocking: activeOperation?.mode === 'blocking',
      activeOperation,
      hasUnsavedChanges,
      setOperationStage,
      runOperation,
      guardNavigation,
      confirmDialog,
      promptDialog,
      registerDirtySource,
      clearAllDirtySources
    }),
    [
      activeOperation,
      clearAllDirtySources,
      confirmDialog,
      guardNavigation,
      hasUnsavedChanges,
      promptDialog,
      registerDirtySource,
      runOperation,
      setOperationStage
    ]
  );

  return (
    <OperationFeedbackContext.Provider value={contextValue}>
      {children}

      {/* Üst İnce İlerleme Şeridi (Hem Blocking Hem Soft İşlemlerde Aktif) */}
      {(activeOperation?.mode === 'blocking' || showSoftIndicator) && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 z-[85] h-1 bg-blue-100 overflow-hidden pointer-events-none no-print"
        >
          <div className="h-full w-1/2 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 animate-pulse rounded-r-full" />
        </div>
      )}

      {/* Soft İşlemler İçin Sağ Alt Kompakt Durum Rozeti */}
      {activeOperation?.mode === 'soft' && showSoftIndicator && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[82] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold no-print"
        >
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <div className="min-w-0">
            <div className="font-bold truncate">{activeOperation.title}</div>
            {activeOperation.description && (
              <div className="text-[11px] text-slate-300 truncate mt-0.5">
                {activeOperation.description}
              </div>
            )}
          </div>
          {elapsedSec >= 2 && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 font-mono text-[11px] shrink-0">
              {formatElapsed(elapsedSec)}
            </span>
          )}
        </div>
      )}

      {/* Kritik / Uzun İşlemler İçin Ekran Ortası Kilitli İşlem Popup'ı (OperationLockModal) */}
      {activeOperation?.mode === 'blocking' && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
          aria-labelledby="op-lock-title"
          aria-describedby="op-lock-desc"
          className="fixed inset-0 z-[80] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 pt-safe pb-safe no-print"
        >
          <div
            className={`bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden transition-transform duration-150 ${
              blockedPulse ? 'scale-[1.03] ring-4 ring-amber-400/70' : 'scale-100'
            }`}
          >
            {/* Üst Renkli Durum Çubuğu */}
            <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 animate-pulse rounded-full" />
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wide">
                  <Lock className="w-3 h-3" /> İşlem Devam Ediyor • {formatElapsed(elapsedSec)}
                </div>
                <h3 id="op-lock-title" className="text-base sm:text-lg font-extrabold text-slate-900">
                  {activeOperation.title}
                </h3>
                <p id="op-lock-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {activeOperation.description}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Lütfen sayfadan ayrılmayın:</strong> İşlem tamamlanana kadar sekmeyi
                  kapatmayın, sayfayı yenilemeyin veya başka bir menüye geçmeyin.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Uygulama İçi Onay / Metin Giriş Modalı (ConfirmModal & PromptModal) */}
      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[75] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 pt-safe pb-safe no-print"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    dialog.variant === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : dialog.variant === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {dialog.variant === 'primary' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-slate-900">{dialog.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {dialog.message}
                  </p>
                </div>
              </div>

              {dialog.kind === 'prompt' && (
                <div>
                  <textarea
                    rows={3}
                    autoFocus
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder={dialog.placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => closeDialog(dialog.kind === 'confirm' ? false : null)}
                  className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  {dialog.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    closeDialog(dialog.kind === 'confirm' ? true : promptInput.trim())
                  }
                  className={`w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer ${
                    dialog.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : dialog.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {dialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OperationFeedbackContext.Provider>
  );
}

export function useOperation(): OperationFeedbackContextValue {
  const ctx = useContext(OperationFeedbackContext);
  if (!ctx) {
    throw new Error('useOperation yalnızca OperationFeedbackProvider içinde kullanılabilir.');
  }
  return ctx;
}
