export const SESSION_COOKIE = 'sopyo_session_v1';
export const ADMIN_TENANT_COOKIE = 'sopyo_admin_tenant';

export interface SessionPayload {
  userId: string;
  tenantId: string;
  role: string;
  exp: number;
}

interface AdminTenantSwitchPayload {
  userId: string;
  tenantId: string;
  exp: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 gün

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVER_SECRET || '';
  if (!secret) {
    throw new Error('Oturum imzalama anahtarı (SESSION_SECRET veya SUPABASE_SERVER_SECRET) tanımlı değil.');
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function constantTimeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function computeHmacSignature(payloadB64Url: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64Url));
  return bytesToBase64Url(new Uint8Array(sigBuffer));
}

async function signJsonObject(payload: object): Promise<string> {
  const secret = getSessionSecret();
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64Url = bytesToBase64Url(payloadBytes);
  const sigB64Url = await computeHmacSignature(payloadB64Url, secret);
  return `${payloadB64Url}.${sigB64Url}`;
}

async function verifyJsonObject<T>(token?: string | null): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;

  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx !== token.lastIndexOf('.')) {
    return null;
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const payloadB64Url = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  if (!payloadB64Url || !providedSig) return null;

  const expectedSig = await computeHmacSignature(payloadB64Url, secret);
  if (!constantTimeStringEqual(providedSig, expectedSig)) {
    return null;
  }

  const payloadBytes = base64UrlToBytes(payloadB64Url);
  if (!payloadBytes) return null;

  try {
    return JSON.parse(new TextDecoder().decode(payloadBytes)) as T;
  } catch {
    return null;
  }
}

export async function signSessionToken(input: {
  userId: string;
  tenantId: string;
  role: string;
}): Promise<string> {
  const payload: SessionPayload = {
    userId: input.userId,
    tenantId: input.tenantId,
    role: input.role,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  return signJsonObject(payload);
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  const parsed = await verifyJsonObject<Partial<SessionPayload>>(token);
  if (
    !parsed ||
    typeof parsed.userId !== 'string' ||
    !parsed.userId ||
    typeof parsed.tenantId !== 'string' ||
    !parsed.tenantId ||
    typeof parsed.role !== 'string' ||
    !parsed.role ||
    typeof parsed.exp !== 'number' ||
    parsed.exp <= Date.now()
  ) {
    return null;
  }
  return {
    userId: parsed.userId,
    tenantId: parsed.tenantId,
    role: parsed.role,
    exp: parsed.exp
  };
}

export async function signAdminTenantCookie(userId: string, tenantId: string): Promise<string> {
  const payload: AdminTenantSwitchPayload = {
    userId,
    tenantId,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  return signJsonObject(payload);
}

export async function verifyAdminTenantCookie(
  token: string | null | undefined,
  expectedUserId: string
): Promise<string | null> {
  const parsed = await verifyJsonObject<Partial<AdminTenantSwitchPayload>>(token);
  if (
    !parsed ||
    typeof parsed.userId !== 'string' ||
    parsed.userId !== expectedUserId ||
    typeof parsed.tenantId !== 'string' ||
    !parsed.tenantId ||
    typeof parsed.exp !== 'number' ||
    parsed.exp <= Date.now()
  ) {
    return null;
  }
  return parsed.tenantId;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  };
}
