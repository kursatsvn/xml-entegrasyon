'use client';

import { useEffect, useMemo } from 'react';
import { useOperation } from '@/components/ui/OperationFeedbackContext';

/**
 * Bir form veya sihirbazdaki kaydedilmemiş değişiklikleri merkezi navigasyon ve
 * tarayıcı sekme kapatma (beforeunload) korumasına bağlar.
 */
export function useUnsavedChanges(sourceId: string, isDirty: boolean): void {
  const { registerDirtySource } = useOperation();

  useEffect(() => {
    registerDirtySource(sourceId, isDirty);
    return () => {
      registerDirtySource(sourceId, false);
    };
  }, [sourceId, isDirty, registerDirtySource]);
}

/**
 * Başlangıç değeri ile güncel form değerini JSON bazlı karşılaştırarak
 * gerçekte değişiklik yapılıp yapılmadığını (isDirty) hesaplar.
 */
export function useIsFormDirty<T>(currentValue: T, baselineValue: T, enabled = true): boolean {
  const baselineJson = useMemo(
    () => (enabled ? JSON.stringify(baselineValue) : ''),
    [baselineValue, enabled]
  );
  const currentJson = useMemo(
    () => (enabled ? JSON.stringify(currentValue) : ''),
    [currentValue, enabled]
  );

  if (!enabled) return false;
  return currentJson !== baselineJson;
}
