import { PWA_APPS, VAPID_PUBLIC_KEY } from "./config";

/** Web Push tarayıcıda var mı? (iPhone'da yalnızca ana ekrana eklenmiş uygulamada vardır) */
export function pushSupported() {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** VAPID anahtarı base64url -> Uint8Array (pushManager.subscribe bu biçimi ister) */
export function urlBase64ToUint8Array(base64) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Bu uygulamanın (kapsamın) etkin service worker kaydı; yoksa ya da zaman aşımında hata fırlatır */
export async function getReadyRegistration(app, timeoutMs = 10000) {
    if (!("serviceWorker" in navigator)) throw new Error("no-service-worker");
    const scope = PWA_APPS[app].scope;
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (!existing) throw new Error("no-service-worker");
    if (existing.active) return existing;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("no-service-worker")), timeoutMs);
        const worker = existing.installing || existing.waiting;
        if (!worker) return reject(new Error("no-service-worker"));
        worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
                clearTimeout(timer);
                resolve(existing);
            }
        });
    });
}

/** Aboneliği al ya da oluştur. VAPID anahtarı yoksa null döner (yalnızca izin alınmış olur). */
export async function ensureSubscription(registration) {
    if (!VAPID_PUBLIC_KEY) return null;
    const current = await registration.pushManager.getSubscription();
    if (current) return current;
    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
}

/** Tarayıcı hatasını arayüzün anlayacağı koda çevirir */
export function pushErrorCode(error) {
    const name = error?.name;
    const message = String(error?.message || "");
    if (message === "no-service-worker") return "noWorker";
    if (name === "NotAllowedError") return "denied";
    if (name === "AbortError" || name === "InvalidStateError" || /push service/i.test(message)) return "service";
    if (name === "NotSupportedError") return "unsupported";
    return "unknown";
}
