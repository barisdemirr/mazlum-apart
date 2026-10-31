/**
 * Herkese açık veri önbelleği: süreler ve etiketler tek yerde.
 *
 * Sayfalar bu sürelerde bir kez yeniden üretilir (Vercel'de her yeniden üretim sunucu CPU'su harcar).
 * Süreleri uzun tutmak güvenlidir, çünkü panelden yapılan her değişiklik ve her yeni başvuru, vekil
 * (app/api/backend/[...path]/route.js) içinde PUBLIC_TAGS etiketlerini hemen geçersiz kılar.
 * Süre yalnızca "tarihe bağlı" değişiklikler (dönem açılışı, çıkış tarihi gelmesi) için yedek sigortadır.
 */
export const TTL_LONG = 1800; // oda tipleri, site ayarları, sayfalar, slaytlar (30 dk)
export const TTL_SHORT = 300; // doluluk, daire listeleri, başvuru ayarları (5 dk)

/** services/* içinde kullanılan tüm etiketler */
export const PUBLIC_TAGS = ["catalog", "site-settings", "slides", "pages", "application-config"];
