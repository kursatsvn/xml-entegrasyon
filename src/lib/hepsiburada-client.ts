import { MarketplaceAccount } from '@/types/sopyo';

export type HepsiburadaServiceType = 'mpop' | 'listing' | 'oms';

export function getHepsiburadaBaseUrl(
  account: Pick<MarketplaceAccount, 'environment'>,
  service: HepsiburadaServiceType
): string {
  const isSit = account.environment === 'sit';
  if (service === 'mpop') {
    return isSit ? 'https://mpop-sit.hepsiburada.com' : 'https://mpop.hepsiburada.com';
  }
  if (service === 'listing') {
    return isSit
      ? 'https://listing-external-sit.hepsiburada.com'
      : 'https://listing-external.hepsiburada.com';
  }
  return isSit
    ? 'https://oms-external-sit.hepsiburada.com'
    : 'https://oms-external.hepsiburada.com';
}

/**
 * Resmi Hepsiburada API v1.0 Kimlik Doğrulama Başlıkları:
 * - Authorization: Basic Base64(MerchantID:ServisAnahtari)
 * - User-Agent: <entegrator_adi>_dev (ör: kodanka_dev)
 */
export function getHepsiburadaAuthHeaders(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret'>,
  options?: { multipart?: boolean; accept?: string }
): Record<string, string> {
  const merchantId = (account.supplierOrMerchantId || '').trim();
  const serviceKey = (account.apiSecret || '').trim();
  const integratorUserAgent = (account.apiKey || 'kodanka_dev').trim();
  const token = Buffer.from(`${merchantId}:${serviceKey}`).toString('base64');

  const headers: Record<string, string> = {
    Authorization: `Basic ${token}`,
    'User-Agent': integratorUserAgent,
    Accept: options?.accept || 'application/json'
  };

  if (!options?.multipart) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export interface HepsiburadaFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  errorMessage: string;
}

function extractReadableError(status: number, data: unknown, rawText: string): string {
  if (status === 401) {
    return 'Yetkilendirme hatası (HTTP 401): Merchant ID, Servis Anahtarı veya Entegratör User-Agent (_dev) bilgisini kontrol edin.';
  }
  if (status === 403) {
    return 'Erişim reddedildi (HTTP 403): Entegratör yetkisi bu servis için onaylı değil.';
  }
  if (status === 429) {
    return 'Hepsiburada API istek limiti (HTTP 429) aşıldı. Kısa süre sonra tekrar deneyin.';
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const msg =
      obj.message ||
      obj.Message ||
      obj.error_description ||
      obj.error ||
      obj.detail ||
      (Array.isArray(obj.errors) ? JSON.stringify(obj.errors[0]) : '');
    if (typeof msg === 'string' && msg.trim()) {
      return `HTTP ${status}: ${msg.trim().slice(0, 260)}`;
    }
  }
  if (rawText.trim()) {
    return `HTTP ${status}: ${rawText.trim().slice(0, 260)}`;
  }
  return `Hepsiburada API hatası (HTTP ${status})`;
}

export async function hepsiburadaFetch<T = unknown>(
  account: Pick<MarketplaceAccount, 'supplierOrMerchantId' | 'apiKey' | 'apiSecret' | 'environment'>,
  service: HepsiburadaServiceType,
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string | FormData;
    multipart?: boolean;
    accept?: string;
    timeoutMs?: number;
    retryOn429?: boolean;
  }
): Promise<HepsiburadaFetchResult<T>> {
  const baseUrl = getHepsiburadaBaseUrl(account, service);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const method = options?.method || 'GET';
  const timeoutMs = options?.timeoutMs ?? 12000;
  const maxAttempts = options?.retryOn429 === false ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: getHepsiburadaAuthHeaders(account, {
          multipart: options?.multipart,
          accept: options?.accept
        }),
        body: options?.body,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfterSec = Number(res.headers.get('retry-after') || '0');
        const waitMs = Math.min(3000, Math.max(1000, (retryAfterSec || 1.5) * 1000));
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const rawText = await res.text().catch(() => '');
      let data: T | null = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText) as T;
        } catch {
          data = null;
        }
      }

      if (res.ok) {
        return { ok: true, status: res.status, data, rawText, errorMessage: '' };
      }

      return {
        ok: false,
        status: res.status,
        data,
        rawText,
        errorMessage: extractReadableError(res.status, data, rawText)
      };
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      return {
        ok: false,
        status: 0,
        data: null,
        rawText: '',
        errorMessage: isTimeout
          ? 'Hepsiburada API isteği zaman aşımına uğradı.'
          : 'Hepsiburada API sunucusuna bağlanılamadı.'
      };
    }
  }

  return {
    ok: false,
    status: 429,
    data: null,
    rawText: '',
    errorMessage: 'Hepsiburada API istek limiti (HTTP 429) aşıldı.'
  };
}

/**
 * Hepsiburada MPOP sayısal kategori ID çözücü.
 * Eski sahte "HB-60000..." placeholder değerlerini geçersiz olarak reddeder.
 */
export function parseHepsiburadaCategoryId(raw?: string | number | null): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  const str = String(raw || '').trim();
  if (!str) return null;
  // Eski sahte placeholder formatı (HB-60000xxx) gerçek MPOP categoryId değildir
  if (/^HB-/i.test(str)) return null;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  return null;
}

export function normalizeHepsiburadaMerchantSku(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, 100);
}
