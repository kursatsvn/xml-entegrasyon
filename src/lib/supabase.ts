import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serverSecret = process.env.SUPABASE_SERVER_SECRET || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return { url, anonKey, serverSecret, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey, serverSecret } = getSupabaseEnv();
  return Boolean(url && anonKey && serverSecret);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  if (!url || (!anonKey && !serviceRoleKey)) return null;

  return createClient(url, serviceRoleKey || anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
