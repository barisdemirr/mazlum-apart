/**
 * Tarayıcı "yükle" olayını (beforeinstallprompt) yakalayıp saklar. Olay sayfa açıldıktan kısa süre sonra bir kez
 * tetiklenir; arayüz ondan sonra bile yükleme düğmesi çizebilsin diye modül düzeyinde tutulur.
 */
let deferredPrompt = null;
let installed = false;
let started = false;
const listeners = new Set();
let snapshot = { canPrompt: false, installed: false };

const emit = () => {
    snapshot = { canPrompt: Boolean(deferredPrompt), installed };
    listeners.forEach((l) => l());
};

export function startInstallCapture() {
    if (started || typeof window === "undefined") return;
    started = true;
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault(); // tarayıcının kendi küçük çubuğu yerine kendi arayüzümüzü gösteririz
        deferredPrompt = event;
        emit();
    });
    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        installed = true;
        emit();
    });
}

export const subscribeInstall = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getInstallSnapshot = () => snapshot;
// Sunucu görüntüsü SABİT nesne olmalı: useSyncExternalStore her çağrıda aynı referansı bekler (yeni nesne sonsuz döngü yapar)
const SERVER_SNAPSHOT = Object.freeze({ canPrompt: false, installed: false });
export const getServerInstallSnapshot = () => SERVER_SNAPSHOT;

/** @returns "accepted" | "dismissed" | "unavailable" */
export async function promptInstall() {
    if (!deferredPrompt) return "unavailable";
    const event = deferredPrompt;
    deferredPrompt = null; // olay tek kullanımlıktır
    emit();
    try {
        await event.prompt();
        const { outcome } = await event.userChoice;
        return outcome;
    } catch {
        return "unavailable";
    }
}
