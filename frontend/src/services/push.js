import { bffDelete, bffPost } from "@/lib/api/bff";

/**
 * Bildirim (Web Push) abonelikleri: cihaz, oturumdaki kullanıcıya bağlanır (vekil üzerinden, rol çerezi ile).
 *   Öğrenci:  POST/DELETE /api/student/push/subscriptions
 *   Yönetici: POST/DELETE /api/admin/push/subscriptions
 * Sunucu bildirimi abonelikteki `lang` ile TR/EN seçer; süresi dolan (404/410) abonelikleri kendisi siler.
 */
const base = (app) => (app === "admin" ? "/admin/push/subscriptions" : "/student/push/subscriptions");

export async function registerPushSubscription(app, subscription, meta = {}) {
    await bffPost(base(app), {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
        lang: meta.lang === "en" ? "en" : "tr",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
    return { ok: true };
}

/** Cihazdaki abonelik zaten kaldırıldı; sunucu kaydı silinemese bile kullanıcı akışı bozulmaz (ölü abonelik sunucuda temizlenir) */
export async function removePushSubscription(app, endpoint) {
    try {
        if (endpoint) await bffDelete(base(app), { endpoint });
    } catch (error) {
        console.error("[push]", error?.message ?? error);
    }
    return { ok: true };
}
