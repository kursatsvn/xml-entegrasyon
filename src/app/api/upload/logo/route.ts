import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync } from '@/lib/store';
import { resolveAuthenticatedContext } from '@/lib/auth-server';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_LOGO_BYTES = 512 * 1024; // 512 KB
const LOGO_BUCKET = 'tenant-logos';

interface DetectedImageType {
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  ext: 'png' | 'jpg' | 'webp';
}

function detectAllowedRasterImage(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const db = await readDbAsync({ skipProducts: true });
    const auth = await resolveAuthenticatedContext(db);
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: 'Oturum gerekli. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { ok: false, message: 'Geçersiz dosya yükleme isteği.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { ok: false, message: 'Yüklenecek logo dosyası seçilmedi.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { ok: false, message: 'Logo dosyası 512 KB boyutundan küçük olmalıdır.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const detected = detectAllowedRasterImage(bytes);

    if (!detected) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Geçersiz görsel formatı. Yalnızca PNG, JPEG veya WebP dosyaları kabul edilir (SVG desteklenmez).'
        },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        return NextResponse.json(
          { ok: false, message: 'Depolama servisi yapılandırılamadı.' },
          { status: 500 }
        );
      }

      const safeTenantSegment = auth.tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
      const objectPath = `${safeTenantSegment}/logo.${detected.ext}`;

      const { error: uploadError } = await admin.storage
        .from(LOGO_BUCKET)
        .upload(objectPath, bytes, {
          contentType: detected.mime,
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('[api/upload/logo storage error]', uploadError);
        return NextResponse.json(
          { ok: false, message: 'Logo depolama alanına yüklenemedi.' },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = admin.storage.from(LOGO_BUCKET).getPublicUrl(objectPath);
      const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

      return NextResponse.json({
        ok: true,
        url: publicUrl,
        mime: detected.mime,
        message: 'Logo başarıyla yüklendi.'
      });
    }

    // Yerel offline JSON modu (magic-byte doğrulanmış güvenli raster data URL)
    const base64 = Buffer.from(bytes).toString('base64');
    return NextResponse.json({
      ok: true,
      url: `data:${detected.mime};base64,${base64}`,
      mime: detected.mime,
      message: 'Logo başarıyla yüklendi.'
    });
  } catch (err) {
    console.error('[api/upload/logo error]', err);
    return NextResponse.json(
      { ok: false, message: 'Logo yüklenirken beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
