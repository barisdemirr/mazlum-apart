"use client";

import { useEffect } from "react";
import { PWA_APPS, SW_DEV_MODE, SW_ENABLED, SW_URL } from "@/lib/pwa/config";
import { startInstallCapture } from "@/lib/pwa/store";

/**
 * Service worker'ı kaydeder (uygulama başına bir kayıt, kapsamı o uygulamanın yoluyla sınırlı) ve
 * "yükle" olayını erkenden yakalar. Görsel çıktısı yoktur.
 *
 *   <PwaRegister app="student" />  -> /ogrenci kapsamı
 *   <PwaRegister app="admin" />    -> /admin kapsamı
 */
export default function PwaRegister({ app }) {
    useEffect(() => {
        startInstallCapture();
        if (!("serviceWorker" in navigator)) return;

        const { scope } = PWA_APPS[app];

        // Geliştirmede service worker kapalıdır; daha önce (ör. production denemesinde) kaydedilmişse temizle
        if (!SW_ENABLED) {
            navigator.serviceWorker.getRegistrations().then((list) =>
                list
                    .filter((r) => new URL(r.scope).pathname === scope && r.active?.scriptURL.includes(SW_URL))
                    .forEach((r) => r.unregister())
            );
            return;
        }

        let registration;
        let disposed = false;

        const register = async () => {
            try {
                const url = `${SW_URL}?app=${app}${SW_DEV_MODE ? "&dev=1" : ""}`;
                registration = await navigator.serviceWorker.register(url, { scope, updateViaCache: "none" });
            } catch (error) {
                if (!disposed) console.warn("[pwa] service worker kaydedilemedi:", error);
            }
        };

        // Sayfa yüklemesini geciktirmemek için yükleme bittikten sonra kaydet
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });

        // Uygulama uzun süre açık kaldıysa öne gelince yeni sürüm var mı diye bak
        const onVisible = () => {
            if (document.visibilityState === "visible") registration?.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            disposed = true;
            window.removeEventListener("load", register);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [app]);

    return null;
}
