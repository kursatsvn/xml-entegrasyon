import { cookies } from 'next/headers';
import { DatabaseState } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  createSupabaseSsrServerClient,
  isSupabaseAuthConfigured
} from '@/lib/supabase/server';
import {
  ADMIN_TENANT_COOKIE,
  SESSION_COOKIE,
  verifyAdminTenantCookie,
  verifySessionToken
} from '@/lib/session';
import { Tenant, UserProfile } from '@/types/sopyo';

export interface AuthenticatedContext {
  user: UserProfile;
  tenant: Tenant;
  userId: string;
  tenantId: string;
  role: UserProfile['role'];
  authMode: 'supabase' | 'local_hmac';
}

/**
 * Hem Supabase Auth (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY) hem de
 * sunucu Admin/Service Role anahtarı tanımlıysa tam Supabase Auth modu aktiftir.
 * Yerel offline JSON geliştirme ortamında HMAC oturum yedeği devreye girer.
 */
export function isFullSupabaseAuthMode(): boolean {
  return isSupabaseAuthConfigured() && isSupabaseConfigured();
}

export async function resolveAuthenticatedContext(
  db: DatabaseState
): Promise<AuthenticatedContext | null> {
  const cookieStore = await cookies();

  // 1. Öncelik: Supabase SSR Auth (getUser() ile sunucu tarafı doğrulama)
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseSsrServerClient();
      if (!supabase) {
        return null;
      }
      const {
        data: { user: authUser },
        error
      } = await supabase.auth.getUser();

      if (!error && authUser) {
        const authEmail = (authUser.email || '').trim().toLowerCase();
        const user =
          db.users.find((u) => u.authUid && u.authUid === authUser.id) ||
          (authEmail
            ? db.users.find(
                (u) => !u.authUid && u.email.trim().toLowerCase() === authEmail
              )
            : undefined);

        if (!user || !user.isActive) {
          return null;
        }

        let effectiveTenantId = user.tenantId;
        if (user.role === 'super_admin') {
          const rawSwitch = cookieStore.get(ADMIN_TENANT_COOKIE)?.value;
          const switchedTenantId = await verifyAdminTenantCookie(rawSwitch, user.id);
          if (switchedTenantId && db.tenants.some((t) => t.id === switchedTenantId)) {
            effectiveTenantId = switchedTenantId;
          }
        }

        const tenant = db.tenants.find((t) => t.id === effectiveTenantId);
        if (!tenant) return null;
        if (!tenant.isActive && user.role !== 'super_admin') return null;

        return {
          user,
          tenant,
          userId: user.id,
          tenantId: tenant.id,
          role: user.role,
          authMode: 'supabase'
        };
      }
    } catch (err) {
      console.error('[auth-server supabase.auth.getUser error]', err);
    }
  }

  // Tam Supabase Auth modunda (Vercel prod vb.) yalnızca Supabase Auth oturumları kabul edilir
  if (isFullSupabaseAuthMode()) {
    return null;
  }

  // 2. Yerel offline JSON geliştirme ortamı (SUPABASE_SERVICE_ROLE_KEY olmadan) HMAC fallback
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(rawSession);
  if (!session) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) return null;

  const effectiveTenantId =
    user.role === 'super_admin' &&
    session.tenantId &&
    db.tenants.some((t) => t.id === session.tenantId)
      ? session.tenantId
      : user.tenantId;

  const tenant = db.tenants.find((t) => t.id === effectiveTenantId);
  if (!tenant) return null;
  if (!tenant.isActive && user.role !== 'super_admin') return null;

  return {
    user,
    tenant,
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    authMode: 'local_hmac'
  };
}
