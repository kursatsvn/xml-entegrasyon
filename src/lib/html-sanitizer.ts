/**
 * Ürün açıklamaları ve pazaryeri HTML şablonları için sıkı allowlist HTML temizleyici.
 * Tüm <script>, <iframe>, <object>, <embed>, <svg>, <style>, <form> etiketlerini,
 * on*= olay dinleyicilerini ve javascript:/vbscript:/data: protokollerini kaldırır.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'blockquote',
  'small',
  'sub',
  'sup'
]);

const DANGEROUS_BLOCK_TAGS =
  /<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const DANGEROUS_SELF_CLOSING_TAGS =
  /<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link|base)\b[^>]*\/?>/gi;

export function sanitizeRichHtml(rawHtml?: string | null): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let cleaned = rawHtml
    // HTML yorumlarını kaldır
    .replace(/<!--[\s\S]*?-->/g, '')
    // Tehlikeli blok ve tekil etiketleri içerikleriyle birlikte kaldır
    .replace(DANGEROUS_BLOCK_TAGS, '')
    .replace(DANGEROUS_SELF_CLOSING_TAGS, '');

  // Yalnızca güvenli etiketlere izin ver ve tüm tehlikeli öznitelikleri soy
  cleaned = cleaned.replace(/<\s*(\/?)\s*([a-zA-Z0-9-]+)([^>]*)>/g, (_match, slash, tagName) => {
    const lower = String(tagName).toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) {
      return '';
    }
    if (slash) {
      return `</${lower}>`;
    }
    if (lower === 'br' || lower === 'hr') {
      return `<${lower} />`;
    }
    return `<${lower}>`;
  });

  // Kalabilecek javascript: / data: ifadelerini metin seviyesinde de etkisizleştir
  cleaned = cleaned.replace(/\b(?:javascript|vbscript)\s*:/gi, '');

  return cleaned.trim();
}
