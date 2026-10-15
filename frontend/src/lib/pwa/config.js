/**
 * İki bağımsız PWA: Öğrenci Portalı (/ogrenci) ve Yönetim Paneli (/admin).
 * Her birinin kendi manifest'i (public/pwa/*.webmanifest), service worker kaydı (kapsam = scope) ve
 * bildirim aboneliği vardır; birbirinin oturumuna, önbelleğine ya da bildirimine karışmaz.
 */
export const PWA_APPS = {
    student: { scope: "/ogrenci", name: "Mazlum Apart" },
    admin: { scope: "/admin", name: "Mazlum Yönetim" },
};

export const SW_URL = "/pwa/sw.js";

/**
 * Web Push "uygulama sunucusu anahtarı" (VAPID PUBLIC key). Boşsa bildirim izni alınabilir ama sunucuya
 * abonelik yapılamaz (backend hazır olana kadar normal). Anahtar çifti backend'de üretilir:
 *   npx web-push generate-vapid-keys   -> public key buraya (.env.local), private key yalnızca backend'e.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/** Service worker yalnızca production'da kaydolur (dev'de eski önbellek/karışıklık olmasın). Dev'de denemek için NEXT_PUBLIC_PWA_DEV=1 */
export const SW_ENABLED = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PWA_DEV === "1";
export const SW_DEV_MODE = process.env.NODE_ENV !== "production";
