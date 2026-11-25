export interface ApiPostResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  message: string;
  data: T | null;
}

/**
 * İstemci bileşenlerinden API uç noktalarına güvenli POST çağrısı yapar.
 * Ağ kopması, zaman aşımı veya bozuk JSON yanıtlarında Unhandled Promise Rejection üretmez.
 */
export async function apiPost<T extends { ok?: boolean; message?: string } = Record<string, any>>(
  url: string,
  payload: unknown
): Promise<ApiPostResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let parsed: T | null = null;
    try {
      parsed = (await res.json()) as T;
    } catch {
      parsed = null;
    }

    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    const ok = Boolean(res.ok && parsed && parsed.ok !== false);
    const message =
      (parsed && typeof parsed.message === 'string' && parsed.message) ||
      (ok ? 'İşlem tamamlandı.' : `İstek başarısız oldu (HTTP ${res.status}).`);

    return { ok, status: res.status, message, data: parsed };
  } catch (err) {
    console.error(`[apiPost ${url} error]`, err);
    return {
      ok: false,
      status: 0,
      message: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
      data: null
    };
  }
}
