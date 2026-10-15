"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useInstall, usePush } from "@/lib/pwa/usePwa";

const DAY = 24 * 60 * 60 * 1000;
const keyOf = (kind) => `ma-pwa-banner-admin-${kind}`;
const recently = (kind) => {
    try {
        const at = Number(localStorage.getItem(keyOf(kind)));
        return Boolean(at) && Date.now() - at < 7 * DAY;
    } catch {
        return false;
    }
};

/** Telefon genişliğinde tek bir öneri: uygulamayı yükle -> (kuruluysa) bildirimleri aç. Kapatılınca 7 gün görünmez. */
export default function PwaBanner() {
    const install = useInstall();
    const push = usePush("admin", { lang: "tr" });
    const [hidden, setHidden] = useState({ install: true, notify: true });
    const [busy, setBusy] = useState(false);

    useEffect(() => setHidden({ install: recently("install"), notify: recently("notify") }), []);

    const dismiss = (kind) => {
        try {
            localStorage.setItem(keyOf(kind), String(Date.now()));
        } catch {}
        setHidden((h) => ({ ...h, [kind]: true }));
    };

    let kind = null;
    if (install.ready && !install.standalone && (install.canInstall || install.showIosHint) && !hidden.install) kind = "install";
    else if (install.standalone && push.ready && push.supported && !push.needsInstall && push.permission === "default" && !hidden.notify) kind = "notify";
    if (!kind) return null;

    const isInstall = kind === "install";
    const act = async () => {
        setBusy(true);
        if (isInstall) await install.install();
        else {
            await push.enable();
            dismiss("notify");
        }
        setBusy(false);
    };

    return (
        <div role="region" aria-label={isInstall ? "Uygulamayı yükle" : "Bildirimleri aç"} className="flex items-center gap-3 border-b border-ad-line bg-ad-brand-soft px-3 py-2.5 sm:px-6 lg:hidden">
            <Icon name={isInstall ? "install_mobile" : "notifications"} className="text-[22px] text-ad-brand" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{isInstall ? "Uygulamayı yükleyin" : "Bildirimleri açın"}</p>
                <p className="text-xs text-ad-muted">{isInstall ? (install.canInstall ? "Ana ekrana ekleyin, bildirim alın." : "Paylaş düğmesi → Ana Ekrana Ekle") : "Yeni başvuru ve arıza kayıtlarını kaçırmayın."}</p>
            </div>
            {isInstall && !install.canInstall ? (
                <Link href="/admin/sistem/profil" className="ad-btn ad-btn-outline ad-btn-sm">Ayrıntı</Link>
            ) : (
                <button type="button" disabled={busy} onClick={act} className="ad-btn ad-btn-primary ad-btn-sm">{isInstall ? "Yükle" : "Aç"}</button>
            )}
            <button type="button" aria-label="Kapat" onClick={() => dismiss(kind)} className="flex h-8 w-8 items-center justify-center rounded-full text-ad-muted hover:bg-white/60"><Icon name="close" className="text-[18px]" /></button>
        </div>
    );
}
