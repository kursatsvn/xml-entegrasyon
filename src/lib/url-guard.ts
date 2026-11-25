import dns from 'dns/promises';
import net from 'net';

export class UrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlGuardError';
  }
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_REDIRECTS = 3;

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 (unspecified)
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
  if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // Multicast & reserved (224.0.0.0/4+)

  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  const version = net.isIP(normalized);
  if (version === 4) {
    return isPrivateOrReservedIpv4(normalized);
  }
  if (version === 6) {
    if (normalized === '::' || normalized === '::1') return true;
    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7);
      if (net.isIP(mapped) === 4) {
        return isPrivateOrReservedIpv4(mapped);
      }
      return true;
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA fc00::/7
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true; // Link-local fe80::/10
    }
    if (normalized.startsWith('ff')) return true; // Multicast
    return false;
  }
  return true;
}

/**
 * Kullanıcıdan gelen XML kaynağının güvenli bir harici HTTPS adresi olduğunu doğrular (SSRF koruması).
 */
export async function assertSafeExternalXmlUrl(rawUrl: string): Promise<URL> {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new UrlGuardError('XML URL alanı boş olamaz.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UrlGuardError('Geçerli bir XML URL adresi giriniz.');
  }

  if (parsed.protocol !== 'https:') {
    throw new UrlGuardError('Güvenlik gereği yalnızca HTTPS protokolüne sahip XML adresleri desteklenir.');
  }

  if (parsed.username || parsed.password) {
    throw new UrlGuardError('URL içinde kullanıcı adı veya şifre bulunamaz.');
  }

  if (parsed.port && parsed.port !== '443') {
    throw new UrlGuardError('Güvenlik gereği yalnızca standart HTTPS (443) portu kullanılabilir.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new UrlGuardError('Yerel veya iç ağ adreslerine erişim engellendi.');
  }

  if (net.isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new UrlGuardError('Özel veya dahili IP adreslerine erişim engellendi.');
    }
    return parsed;
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UrlGuardError('XML sunucu alan adı çözümlenemedi.');
  }

  if (!records || records.length === 0) {
    throw new UrlGuardError('XML sunucu alan adı çözümlenemedi.');
  }

  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new UrlGuardError('Özel veya iç ağ IP adresine çözümlenen URL engellendi.');
    }
  }

  return parsed;
}

/**
 * SSRF, yönlendirme, zaman aşımı ve boyut sınırları uygulanmış güvenli XML indirme istemcisi.
 */
export async function safeFetchXmlText(
  rawUrl: string,
  options?: { timeoutMs?: number; maxBytes?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  let currentUrl = await assertSafeExternalXmlUrl(rawUrl);
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    response = await fetch(currentUrl.toString(), {
      headers: { 'User-Agent': 'Sopyo-XML-Bot/2.0' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new UrlGuardError('XML sunucusu geçersiz yönlendirme yanıtı döndürdü.');
      }
      if (redirectCount === MAX_REDIRECTS) {
        throw new UrlGuardError('XML kaynağı çok fazla yönlendirme içeriyor.');
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = await assertSafeExternalXmlUrl(nextUrl);
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    throw new UrlGuardError(`XML kaynağına erişilemedi (HTTP ${response?.status ?? 'ERR'}).`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new UrlGuardError(`XML dosya boyutu izin verilen sınırı (${Math.round(maxBytes / (1024 * 1024))} MB) aşıyor.`);
    }
  }

  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new UrlGuardError(`XML dosya boyutu izin verilen sınırı (${Math.round(maxBytes / (1024 * 1024))} MB) aşıyor.`);
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8').decode(merged);
}
