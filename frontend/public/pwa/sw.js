/*
 * Mazlum Apart — service worker (tek dosya, iki uygulama)
 *
 *   /pwa/sw.js?app=student  -> kapsam /ogrenci  (Öğrenci Portalı)
 *   /pwa/sw.js?app=admin    -> kapsam /admin    (Yönetim Paneli)
 *
 * İki uygulama birbirinden TAMAMEN ayrıdır: ayrı kayıt, ayrı önbellek, ayrı bildirim kanalı.
 * Bu dosya yalnızca hangi uygulama için çalıştığını `app` parametresinden öğrenir.
 *
 * Önbellek ilkesi (özel veri içerdiği için kasıtlı olarak dar):
 *   - Sayfalar (HTML) ve /api istekleri ASLA önbelleğe alınmaz: öğrenci/yönetici verisi cihazda saklanmaz.
 *   - Yalnızca içeriği değişmeyen dosyalar (/_next/static, ikonlar) ve çevrimdışı sayfası saklanır.
 *   - Ağ yoksa sayfa isteklerine "çevrimdışısınız" sayfası döner.
 */
const params = new URL(self.location.href).searchParams;
const APP = params.get("app") === "admin" ? "admin" : "student";
const DEV = params.get("dev") === "1"; // geliştirmede /_next dosyaları sabit olmadığı için önbelleğe alınmaz

const VERSION = "v1";
const CACHE = `ma-${APP}-${VERSION}`;
const SCOPE_PATH = APP === "admin" ? "/admin" : "/ogrenci";
const OFFLINE_URL = `/pwa/offline-${APP}.html`;
const ICON = `/pwa/${APP}-192.png`;
const DEFAULT_TITLE = APP === "admin" ? "Mazlum Apart Yönetim" : "Mazlum Apart";
const MAX_STATIC_ENTRIES = 150;

/* ───────── kurulum ───────── */
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            // Çevrimdışı sayfası zorunludur; ikonlar eksikse kurulum bozulmasın
            await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
            await Promise.all(
                [ICON, `/pwa/${APP}-512.png`].map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {}))
            );
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // Bu uygulamanın eski sürüm önbelleklerini sil; diğer uygulamanınkine dokunma
            const names = await caches.keys();
            await Promise.all(names.filter((n) => n.startsWith(`ma-${APP}-`) && n !== CACHE).map((n) => caches.delete(n)));
            // Gezinme ön yüklemesi: ağ isteğini service worker açılırken başlatır (daha hızlı)
            if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
            await self.clients.claim();
        })()
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* ───────── istekler ───────── */
async function handleNavigation(event) {
    try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
    } catch {
        // Yalnızca ağ HATASINDA (bağlantı yok) çevrimdışı sayfası; sunucu yanıtı (401, 500…) olduğu gibi geçer
        const cache = await caches.open(CACHE);
        return (
            (await cache.match(OFFLINE_URL)) ||
            new Response("Çevrimdışısınız.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
        );
    }
}

async function trim(cache) {
    const keys = await cache.keys();
    if (keys.length <= MAX_STATIC_ENTRIES) return;
    await Promise.all(keys.slice(0, keys.length - MAX_STATIC_ENTRIES).map((k) => cache.delete(k)));
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
        await cache.put(request, response.clone());
        trim(cache);
    }
    return response;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // harici (yazı tipi vb.) istekler tarayıcıya kalır
    if (url.pathname.startsWith("/api/")) return; // API yanıtları asla saklanmaz

    if (request.mode === "navigate") {
        event.respondWith(handleNavigation(event));
        return;
    }

    if (!DEV && url.pathname.startsWith("/_next/static/")) {
        event.respondWith(cacheFirst(request)); // dosya adında içerik özeti var: değişince adı da değişir
        return;
    }

    if (/^\/pwa\/[\w-]+\.(png|svg)$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
    }
});

/* ───────── bildirimler (Web Push) ─────────
 * Gelen veri (JSON): { title, body, url, tag, icon, image }
 * Sunucu veriyi hangi dilde göndereceğini abonelikteki dile göre seçer; burada çeviri yapılmaz. */
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }

    const options = {
        body: data.body || "",
        icon: data.icon || ICON,
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        data: { url: data.url || SCOPE_PATH },
    };
    if (data.image) options.image = data.image;

    // userVisibleOnly aboneliği: her push mutlaka bir bildirim göstermelidir
    event.waitUntil(self.registration.showNotification(data.title || DEFAULT_TITLE, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // Hedef yalnızca aynı site olabilir; değilse uygulamanın ana sayfası
    let target = new URL(SCOPE_PATH, self.location.origin);
    try {
        const candidate = new URL((event.notification.data && event.notification.data.url) || SCOPE_PATH, self.location.origin);
        if (candidate.origin === self.location.origin && (candidate.pathname === SCOPE_PATH || candidate.pathname.startsWith(`${SCOPE_PATH}/`))) {
            target = candidate;
        }
    } catch {}

    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            const open = windows.find((c) => new URL(c.url).pathname.startsWith(SCOPE_PATH));
            if (open) {
                await open.focus().catch(() => {});
                if ("navigate" in open && open.url !== target.href) await open.navigate(target.href).catch(() => {});
                return;
            }
            await self.clients.openWindow(target.href);
        })()
    );
});

// Tarayıcı aboneliği yenilediyse sayfaya haber ver; sayfa yeni aboneliği sunucuya iletir
self.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
            windows.forEach((c) => c.postMessage({ type: "push-subscription-changed" }));
        })
    );
});
