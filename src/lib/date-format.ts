const TR_LOCALE = 'tr-TR';
const TR_TIMEZONE = 'Europe/Istanbul';

function toValidDate(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTrDateTime(value?: string | number | Date | null, fallback = '—'): string {
  const d = toValidDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(TR_LOCALE, {
    timeZone: TR_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatTrDate(value?: string | number | Date | null, fallback = '—'): string {
  const d = toValidDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(TR_LOCALE, {
    timeZone: TR_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

export function formatTrTime(value?: string | number | Date | null, fallback = '—'): string {
  const d = toValidDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(TR_LOCALE, {
    timeZone: TR_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(d);
}
