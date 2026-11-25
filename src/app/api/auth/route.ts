import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDbAsync, writeDbAsync } from '@/lib/store';
import {
  ADMIN_TENANT_COOKIE,
  SESSION_COOKIE,
  constantTimeStringEqual,
  getSessionCookieOptions,
  signAdminTenantCookie,
  signSessionToken
} from '@/lib/session';
import { isFullSupabaseAuthMode, resolveAuthenticatedContext } from '@/lib/auth-server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  createSupabaseSsrServerClient,
  isSupabaseAuthConfigured
} from '@/lib/supabase/server';
import { AuthActionSchema, formatZodError } from '@/lib/validators';
import { Tenant, UserProfile } from '@/types/sopyo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await readDbAsync({ skipProducts: true });
    const auth = await resolveAuthenticatedContext(db);

    if (!auth) {
      return NextResponse.json(
        { authenticated: false, message: 'Oturum bulunamadı.' },
        { status: 401 }
      );
    }

    const { user: currentUser, tenant: activeTenant } = auth;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        fullName: currentUser.fullName,
        phone: currentUser.phone,
        role: currentUser.role,
        tenantId: currentUser.tenantId
      },
      activeTenant,
      allTenants: currentUser.role === 'super_admin' ? db.tenants : [activeTenant],
      allUsers:
        currentUser.role === 'super_admin'
          ? db.users.map(({ password: _password, clearPassword: _clear, ...rest }) => rest)
          : []
    });
  } catch (err) {
    console.error('[api/auth GET error]', err);
    return NextResponse.json(
      { authenticated: false, message: 'Oturum doğrulanırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Geçersiz JSON istek gövdesi.' }, { status: 400 });
    }

    const parsed = AuthActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const cookieStore = await cookies();

    // 1. LOGOUT
    if (input.action === 'logout') {
      if (isSupabaseAuthConfigured()) {
        try {
          const supabase = await createSupabaseSsrServerClient();
          if (supabase) {
            await supabase.auth.signOut();
          }
        } catch (err) {
          console.error('[api/auth logout supabase signOut]', err);
        }
      }
      cookieStore.delete(ADMIN_TENANT_COOKIE);
      cookieStore.delete(SESSION_COOKIE);
      return NextResponse.json({ ok: true, message: 'Oturum kapatıldı.' });
    }

    const db = await readDbAsync({ skipProducts: true });

    // 2. LOGIN
    if (input.action === 'login') {
      const { email, password } = input;

      if (isFullSupabaseAuthMode()) {
        const supabase = await createSupabaseSsrServerClient();
        const admin = createSupabaseAdminClient();
        if (!supabase) {
          return NextResponse.json(
            { ok: false, message: 'Sunucu kimlik yapılandırması eksik.' },
            { status: 500 }
          );
        }

        // Önce Supabase Auth ile giriş dene
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!signInErr && signInData.user) {
          const authUid = signInData.user.id;
          const user =
            db.users.find((u) => u.authUid === authUid) ||
            db.users.find((u) => u.email.trim().toLowerCase() === email);

          if (!user || !user.isActive) {
            await supabase.auth.signOut();
            return NextResponse.json(
              {
                ok: false,
                message: !user
                  ? 'Kullanıcı profili bulunamadı.'
                  : 'Hesabınız pasif durumdadır. Yönetici ile iletişime geçin.'
              },
              { status: 403 }
            );
          }

          // Eski düz metin parola kalmışsa veya authUid eksikse temizle & bağla
          if (!user.authUid || user.password) {
            user.authUid = authUid;
            user.clearPassword = true;
            delete user.password;
            await writeDbAsync(db, { skipProducts: true });
          }

          cookieStore.delete(ADMIN_TENANT_COOKIE);
          cookieStore.delete(SESSION_COOKIE);

          return NextResponse.json({
            ok: true,
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              tenantId: user.tenantId
            }
          });
        }

        // Lazy Migration: Mevcut düz-metin profilli kullanıcıyı ilk girişte Supabase Auth'a geçir
        const legacyUser = db.users.find(
          (u) =>
            !u.authUid &&
            u.email.trim().toLowerCase() === email &&
            typeof u.password === 'string' &&
            u.password.length > 0 &&
            constantTimeStringEqual(u.password, password)
        );

        if (legacyUser && admin) {
          if (!legacyUser.isActive) {
            return NextResponse.json(
              { ok: false, message: 'Hesabınız pasif durumdadır. Yönetici ile iletişime geçin.' },
              { status: 403 }
            );
          }

          const { data: createdAuth, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: legacyUser.fullName,
              tenant_id: legacyUser.tenantId
            }
          });

          if (createErr || !createdAuth.user) {
            console.error('[api/auth lazy migration createUser error]', createErr);
            return NextResponse.json(
              { ok: false, message: 'E-posta adresi veya şifre hatalı.' },
              { status: 401 }
            );
          }

          legacyUser.authUid = createdAuth.user.id;
          legacyUser.clearPassword = true;
          delete legacyUser.password;
          await writeDbAsync(db, { skipProducts: true });

          const { error: secondSignInErr } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (secondSignInErr) {
            console.error('[api/auth lazy migration signIn error]', secondSignInErr);
            return NextResponse.json(
              { ok: false, message: 'Oturum başlatılamadı. Lütfen tekrar deneyin.' },
              { status: 500 }
            );
          }

          cookieStore.delete(ADMIN_TENANT_COOKIE);
          cookieStore.delete(SESSION_COOKIE);

          return NextResponse.json({
            ok: true,
            user: {
              id: legacyUser.id,
              email: legacyUser.email,
              fullName: legacyUser.fullName,
              role: legacyUser.role,
              tenantId: legacyUser.tenantId
            }
          });
        }

        return NextResponse.json(
          { ok: false, message: 'E-posta adresi veya şifre hatalı.' },
          { status: 401 }
        );
      }

      // Yerel offline JSON geliştirme ortamı (HMAC fallback)
      const user = db.users.find(
        (u) =>
          u.email.toLowerCase() === email &&
          typeof u.password === 'string' &&
          u.password.length > 0 &&
          constantTimeStringEqual(u.password, password)
      );

      if (!user) {
        return NextResponse.json(
          { ok: false, message: 'E-posta adresi veya şifre hatalı.' },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { ok: false, message: 'Hesabınız pasif durumdadır. Yönetici ile iletişime geçin.' },
          { status: 403 }
        );
      }

      const token = await signSessionToken({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role
      });

      cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions());

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId
        }
      });
    }

    // 3. REGISTER (Doğrudan aktif kayıt — email_confirm: true)
    if (input.action === 'register') {
      const { storeName, fullName, email, phone, password } = input;

      if (db.users.some((u) => u.email.trim().toLowerCase() === email)) {
        return NextResponse.json(
          { ok: false, message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var.' },
          { status: 400 }
        );
      }

      const tenantId = `tenant-${Date.now()}`;
      const userId = `user-${Date.now()}`;
      const baseSlug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `magaza-${Date.now()}`;
      const slug = db.tenants.some((t) => t.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString().slice(-4)}`
        : baseSlug;

      const newTenant: Tenant = {
        id: tenantId,
        name: storeName,
        slug,
        plan: 'professional',
        licenseExpiresAt: '2027-12-31T23:59:59Z',
        isActive: true,
        maxXmlSources: 5,
        maxProducts: 25000,
        companyPhone: phone,
        companyEmail: email,
        companyAddress: '',
        companyWebsite: '',
        defaultVatRate: 10,
        maskInvoiceProductNames: false,
        defaultMaskedProductName: 'Tekstil Ürünü',
        cargoLabelTemplate: 'single',
        cargoLabelShowStock: false,
        cargoLabelShowProducts: true,
        cargoLabelShowPrice: true,
        cargoLabelShowSku: true,
        cargoLabelFontSize: 7.7,
        trendyolInvoiceNote:
          'İş bu fatura tutarı DSM Grup Danışmanlık İletişim ve Satış Tic.A.Ş hesabına devredilmiştir.',
        hepsiburadaInvoiceNote:
          'İş bu fatura tutarı D-Market Elektronik Hiz. ve Tic. A.Ş. hesabına devredilmiştir.',
        createdAt: new Date().toISOString()
      };

      if (isFullSupabaseAuthMode()) {
        const admin = createSupabaseAdminClient();
        const supabase = await createSupabaseSsrServerClient();
        if (!admin || !supabase) {
          return NextResponse.json(
            { ok: false, message: 'Sunucu kimlik yapılandırması eksik.' },
            { status: 500 }
          );
        }

        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || storeName,
            store_name: storeName,
            tenant_id: tenantId
          }
        });

        if (authErr || !authData.user) {
          const msg =
            authErr?.message?.toLowerCase().includes('already') ||
            authErr?.message?.toLowerCase().includes('registered')
              ? 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var.'
              : 'Kayıt oluşturulurken bir hata oluştu.';
          return NextResponse.json({ ok: false, message: msg }, { status: 400 });
        }

        const newUser: UserProfile = {
          id: userId,
          authUid: authData.user.id,
          tenantId,
          email,
          fullName: fullName || storeName,
          phone,
          role: 'owner',
          clearPassword: true,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        db.tenants.push(newTenant);
        db.users.push(newUser);

        try {
          await writeDbAsync(db, { skipProducts: true });
        } catch (writeErr) {
          // Profil/mağaza kaydı başarısız olursa orphan Auth kullanıcısını geri al
          await admin.auth.admin.deleteUser(authData.user.id).catch(() => {});
          throw writeErr;
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInErr) {
          console.error('[api/auth register auto-login error]', signInErr);
        }

        cookieStore.delete(ADMIN_TENANT_COOKIE);
        cookieStore.delete(SESSION_COOKIE);

        return NextResponse.json({
          ok: true,
          message: 'Mağaza ve kullanıcı kaydınız başarıyla oluşturuldu!',
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            role: newUser.role,
            tenantId: newTenant.id
          }
        });
      }

      // Yerel offline JSON geliştirme ortamı
      const newUser: UserProfile = {
        id: userId,
        tenantId,
        email,
        fullName: fullName || storeName,
        phone,
        role: 'owner',
        password,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.tenants.push(newTenant);
      db.users.push(newUser);
      await writeDbAsync(db, { skipProducts: true });

      const token = await signSessionToken({
        userId: newUser.id,
        tenantId: newTenant.id,
        role: newUser.role
      });

      cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions());

      return NextResponse.json({
        ok: true,
        message: 'Mağaza ve kullanıcı kaydınız başarıyla oluşturuldu!',
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          tenantId: newTenant.id
        }
      });
    }

    // 4. SWITCH TENANT (Yalnızca Süper Admin)
    if (input.action === 'switch_tenant') {
      const auth = await resolveAuthenticatedContext(db);
      if (!auth) {
        return NextResponse.json(
          { ok: false, message: 'Oturum gerekli. Lütfen giriş yapın.' },
          { status: 401 }
        );
      }

      if (auth.role !== 'super_admin') {
        return NextResponse.json(
          {
            ok: false,
            message: 'Mağaza değiştirme işlemi yalnızca Süper Admin yetkisiyle yapılabilir.'
          },
          { status: 403 }
        );
      }

      const targetTenantId = String(input.targetTenantId || input.tenantId || '').trim();
      const targetTenant = db.tenants.find((t) => t.id === targetTenantId);

      if (!targetTenant) {
        return NextResponse.json(
          { ok: false, message: 'Seçilen mağaza bulunamadı.' },
          { status: 404 }
        );
      }

      if (auth.authMode === 'supabase') {
        const switchToken = await signAdminTenantCookie(auth.userId, targetTenant.id);
        cookieStore.set(ADMIN_TENANT_COOKIE, switchToken, getSessionCookieOptions());
      } else {
        const token = await signSessionToken({
          userId: auth.userId,
          tenantId: targetTenant.id,
          role: auth.role
        });
        cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions());
      }

      return NextResponse.json({
        ok: true,
        activeTenantId: targetTenant.id,
        message: `${targetTenant.name} mağazasına başarıyla geçildi.`
      });
    }

    return NextResponse.json({ ok: false, message: 'Geçersiz işlem' }, { status: 400 });
  } catch (err) {
    console.error('[api/auth POST error]', err);
    return NextResponse.json(
      { ok: false, message: 'Kimlik doğrulama işlemi sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
