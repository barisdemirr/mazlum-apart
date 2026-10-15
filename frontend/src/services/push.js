/**
 * Bildirim (Web Push) abonelikleri. Şimdilik MOCK: abonelik bu tarayıcıda saklanır.
 *
 * Gerçek istekler (backend hazır olunca, çerezdeki oturumla):
 *   Öğrenci:  POST   /student/push/subscriptions   { endpoint, keys: { p256dh, auth }, lang }
 *             DELETE /student/push/subscriptions   { endpoint }
 *   Yönetici: POST   /admin/push/subscriptions     { endpoint, keys: { p256dh, auth } }
 *             DELETE /admin/push/subscriptions     { endpoint }
 * Sunucu her cihazı (endpoint) o kullanıcıya bağlı saklar; bildirim gönderirken abonelikteki `lang` ile TR/EN seçer.
 * Süresi dolan (404/410 dönen) abonelikleri sunucu siler.
 */
const keyOf = (app) => `ma-push-subscription-${app}`;

export async function registerPushSubscription(app, subscription, meta = {}) {
    try {
        localStorage.setItem(keyOf(app), JSON.stringify({ subscription, ...meta, savedAt: new Date().toISOString() }));
    } catch {}
    return { ok: true };
}

export async function removePushSubscription(app) {
    try {
        localStorage.removeItem(keyOf(app));
    } catch {}
    return { ok: true };
}
