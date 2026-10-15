"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PWA_APPS, VAPID_PUBLIC_KEY } from "./config";
import { ensureSubscription, getReadyRegistration, pushErrorCode, pushSupported } from "./push";
import { getInstallSnapshot, getServerInstallSnapshot, promptInstall, startInstallCapture, subscribeInstall } from "./store";
import { registerPushSubscription, removePushSubscription } from "@/services/push";

/**
 * Uygulama kurulum durumu.
 *   standalone  : şu an kurulu uygulama olarak açık mı
 *   ios         : iPhone/iPad (kurulum tarayıcı menüsünden elle yapılır, "yükle" düğmesi yoktur)
 *   canInstall  : tarayıcı kurulum penceresini açabilir (Android/masaüstü Chrome, Edge)
 */
export function useInstall() {
    const snap = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getServerInstallSnapshot);
    const [env, setEnv] = useState({ ready: false, standalone: false, ios: false });

    useEffect(() => {
        startInstallCapture();
        const mq = window.matchMedia("(display-mode: standalone)");
        const read = () => {
            const ua = navigator.userAgent || "";
            const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            setEnv({ ready: true, ios, standalone: mq.matches || navigator.standalone === true });
        };
        read();
        mq.addEventListener?.("change", read);
        return () => mq.removeEventListener?.("change", read);
    }, []);

    const standalone = env.standalone || snap.installed;
    return {
        ready: env.ready,
        standalone,
        ios: env.ios,
        canInstall: env.ready && !standalone && snap.canPrompt,
        // iOS'ta ya da kurulum olayı gelmeyen tarayıcılarda: elle ekleme yönergesi
        showIosHint: env.ready && !standalone && env.ios,
        install: promptInstall,
    };
}

/**
 * Bildirim (Web Push) durumu ve işlemleri.
 *   supported   : bu tarayıcı/cihaz push destekliyor
 *   needsInstall: iPhone'da önce ana ekrana eklenmeli
 *   permission  : "default" | "granted" | "denied"
 *   subscribed  : sunucuya abonelik iletildi
 *   configured  : VAPID anahtarı tanımlı (değilse yalnızca izin alınır)
 *   error       : "denied" | "service" | "noWorker" | "unsupported" | "unknown" | null
 */
export function usePush(app, { lang = "tr", testTitle = "", testBody = "" } = {}) {
    const { ready: envReady, ios, standalone } = useInstall();
    const [state, setState] = useState({ ready: false, supported: false, permission: "default", subscribed: false });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const configured = Boolean(VAPID_PUBLIC_KEY);

    const syncServer = useCallback(
        async (registration) => {
            const sub = await ensureSubscription(registration);
            if (!sub) return false;
            await registerPushSubscription(app, sub.toJSON(), { lang });
            return true;
        },
        [app, lang]
    );

    // Başlangıç durumu: izin ve mevcut abonelik
    useEffect(() => {
        if (!envReady) return;
        const supported = pushSupported();
        const permission = supported ? Notification.permission : "default";
        setState((s) => ({ ...s, ready: true, supported, permission }));
        if (!supported || permission !== "granted" || !configured) return;

        let cancelled = false;
        (async () => {
            try {
                const registration = await getReadyRegistration(app, 4000);
                const existing = await registration.pushManager.getSubscription();
                if (cancelled) return;
                setState((s) => ({ ...s, subscribed: Boolean(existing) }));
                // İzin zaten verilmişse kopmuş aboneliği sessizce yenile; oturumda bir kez sunucuya bildir
                const key = `ma-push-synced-${app}`;
                if (!existing || !sessionStorage.getItem(key)) {
                    if (await syncServer(registration)) {
                        sessionStorage.setItem(key, "1");
                        if (!cancelled) setState((s) => ({ ...s, subscribed: true }));
                    }
                }
            } catch {
                /* service worker henüz yok (ör. geliştirme modu): durum "abone değil" kalır */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [envReady, app, configured, syncServer]);

    // Service worker "abonelik yenilendi" derse sunucuya yeniden bildir
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        const onMessage = async (event) => {
            if (event.data?.type !== "push-subscription-changed") return;
            try {
                const registration = await getReadyRegistration(app, 4000);
                await syncServer(registration);
            } catch {}
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }, [app, syncServer]);

    /** Kullanıcı dokunuşuyla çağrılmalı (tarayıcılar izin penceresini başka türlü göstermez) */
    const enable = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const permission = await Notification.requestPermission();
            setState((s) => ({ ...s, permission }));
            if (permission !== "granted") {
                setError("denied");
                return false;
            }
            const registration = await getReadyRegistration(app);
            if (configured) {
                const ok = await syncServer(registration);
                setState((s) => ({ ...s, subscribed: ok }));
                if (ok) sessionStorage.setItem(`ma-push-synced-${app}`, "1");
            }
            return true;
        } catch (e) {
            setError(pushErrorCode(e));
            return false;
        } finally {
            setBusy(false);
        }
    }, [app, configured, syncServer]);

    /** Bildirimleri kapat: abonelik iptal edilir. (Tarayıcı izni kullanıcı tarafından site ayarlarından geri alınır.) */
    const disable = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const registration = await getReadyRegistration(app, 4000).catch(() => null);
            const sub = await registration?.pushManager.getSubscription();
            if (sub) {
                const endpoint = sub.endpoint;
                await sub.unsubscribe();
                await removePushSubscription(app, endpoint);
            }
            setState((s) => ({ ...s, subscribed: false }));
            sessionStorage.removeItem(`ma-push-synced-${app}`);
            return true;
        } catch (e) {
            setError(pushErrorCode(e));
            return false;
        } finally {
            setBusy(false);
        }
    }, [app]);

    /** Cihazda yerel test bildirimi (sunucu gerekmez): her şeyin çalıştığını gösterir */
    const sendTest = useCallback(async () => {
        setError(null);
        try {
            const registration = await getReadyRegistration(app, 4000);
            await registration.showNotification(testTitle || PWA_APPS[app].name, {
                body: testBody,
                icon: `/pwa/${app === "admin" ? "admin" : "student"}-192.png`,
                tag: "ma-test",
                data: { url: PWA_APPS[app].scope },
            });
            return true;
        } catch (e) {
            setError(pushErrorCode(e));
            return false;
        }
    }, [app, testTitle, testBody]);

    return {
        ...state,
        configured,
        busy,
        error,
        needsInstall: state.ready && ios && !standalone,
        enable,
        disable,
        sendTest,
    };
}
