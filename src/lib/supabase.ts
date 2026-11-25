import { createClient, SupabaseClient } from '@supabase/supabase-js';

function assertServerRuntime() {
  if (typeof window !== 'undefined') {
    throw new Error('src/lib/supabase.ts yalnızca sunucu tarafında kullanılabilir.');
  }
}

export function getSupabaseEnv() {
  assertServerRuntime();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  const serverSecret = process.env.SUPABASE_SERVER_SECRET || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  return { url, anonKey, serverSecret, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, serviceRoleKey, serverSecret } = getSupabaseEnv();
  return Boolean(url && serviceRoleKey && serverSecret);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export const createSupabaseAdminClient = createSupabaseServerClient;
