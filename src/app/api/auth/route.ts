import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDbAsync, writeDbAsync } from '@/lib/store';
import { Tenant, UserProfile } from '@/types/sopyo';

const SESSION_COOKIE = 'sopyo_session_v1';

export async function GET() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  const db = await readDbAsync();

  let currentUser = db.users[0];
  let activeTenantId = currentUser.tenantId;

  if (rawSession) {
    try {
      const parsed = JSON.parse(Buffer.from(rawSession, 'base64').toString('utf8'));
      const foundUser = db.users.find((u) => u.id === parsed.userId);
      if (foundUser) {
        currentUser = foundUser;
        activeTenantId = parsed.tenantId || foundUser.tenantId;
      }
    } catch {
      // Varsayılan kullanıcı ile devam et
    }
  }

  const activeTenant = db.tenants.find((t) => t.id === activeTenantId) || db.tenants[0];

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
        ? db.users.map(({ password, ...rest }) => rest)
        : []
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const db = await readDbAsync();
  const cookieStore = await cookies();

  if (action === 'login') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = db.users.find(
      (u) => u.email.toLowerCase() === email && (!u.password || u.password === password)
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

    const token = Buffer.from(
      JSON.stringify({ userId: user.id, tenantId: user.tenantId })
    ).toString('base64');

    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

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

  if (action === 'register') {
    const storeName = String(body.storeName || '').trim();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    if (!storeName || !email || !password) {
      return NextResponse.json(
        { ok: false, message: 'Mağaza adı, e-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { ok: false, message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var.' },
        { status: 400 }
      );
    }

    const tenantId = `tenant-${Date.now()}`;
    const userId = `user-${Date.now()}`;
    const slug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `magaza-${Date.now()}`;

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

    const token = Buffer.from(
      JSON.stringify({ userId: newUser.id, tenantId: newTenant.id })
    ).toString('base64');

    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

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

  if (action === 'switch_tenant') {
    const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
    let currentUser = db.users[0];
    if (rawSession) {
      try {
        const parsed = JSON.parse(Buffer.from(rawSession, 'base64').toString('utf8'));
        const found = db.users.find((u) => u.id === parsed.userId);
        if (found) currentUser = found;
      } catch {}
    }

    const targetTenantId = String(body.tenantId || currentUser.tenantId);
    const token = Buffer.from(
      JSON.stringify({ userId: currentUser.id, tenantId: targetTenantId })
    ).toString('base64');

    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ ok: true, activeTenantId: targetTenantId });
  }

  if (action === 'logout') {
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: 'Geçersiz işlem' }, { status: 400 });
}
