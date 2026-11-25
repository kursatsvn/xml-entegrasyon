import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({
    request: {
      headers: req.headers
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );
  const fullSupabaseAuthMode = Boolean(supabaseUrl && supabaseAnonKey && hasServiceRole);

  let isAuthenticated = false;

  // 1. Supabase Auth doğrulama ve cookie yenileme (her zaman getUser() kullanılır)
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({
              request: {
                headers: req.headers
              }
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          }
        }
      });

      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (!error && user) {
        isAuthenticated = true;
      }
    } catch {
      // Supabase erişilemezse aşağıdaki yerel mod kontrolüne düşer
    }
  }

  // 2. Yerel offline JSON geliştirme ortamı için HMAC fallback (prod/Supabase modunda kapalı)
  const rawToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!isAuthenticated && !fullSupabaseAuthMode) {
    const session = await verifySessionToken(rawToken);
    if (session) {
      isAuthenticated = true;
    }
  }

  if (pathname.startsWith('/api/state') || pathname.startsWith('/api/upload')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, message: 'Oturum gerekli. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }
    return res;
  }

  if (pathname === '/') {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      const redirectRes = NextResponse.redirect(loginUrl);
      if (rawToken) {
        redirectRes.cookies.delete(SESSION_COOKIE);
      }
      return redirectRes;
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/', '/api/state/:path*', '/api/upload/:path*']
};
