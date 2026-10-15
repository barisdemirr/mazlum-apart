"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import { useInstall, usePush } from "@/lib/pwa/usePwa";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const DAY = 24 * 60 * 60 * 1000;
const keyOf = (kind) => `ma-pwa-banner-student-${kind}`;

function dismissedRecently(kind) {
    try {
        const at = Number(localStorage.getItem(keyOf(kind)));
        return at && Date.now() - at < 7 * DAY;
    } catch {
        return false;
    }
}

/**
 * Portalın üstünde, yalnızca gerektiğinde görünen tek bir öneri:
 *   1) kurulu değil -> uygulamayı yükle (iPhone'da yönerge bağlantısı)
 *   2) kurulu ve bildirim izni sorulmamış -> bildirimleri aç
 * Kapatılınca 7 gün görünmez. Telefon genişliğinde çizilir (masaüstünde Bilgilerim kartı yeter).
 */
export default function PwaBanner() {
    const { t, locale } = useLanguage();
    const copy = t.studentPortal.pwa;
    const install = useInstall();
    const push = usePush("student", { lang: locale });
    const [hidden, setHidden] = useState({ install: true, notify: true }); // sunucu/istemci farkı olmasın: önce gizli
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setHidden({ install: dismissedRecently("install"), notify: dismissedRecently("notify") });
    }, []);

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
    const action = async () => {
        if (isInstall && install.canInstall) {
            setBusy(true);
            await install.install();
            setBusy(false);
        } else if (!isInstall) {
            setBusy(true);
            await push.enable();
            setBusy(false);
            dismiss("notify");
        }
    };

    return (
        <div role="region" aria-label={isInstall ? copy.banner.installTitle : copy.banner.notifyTitle} className="mb-5 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-orchid-powder to-orchid-lilac p-3 pr-2 shadow-sm lg:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-orchid-pink shadow-sm">
                <Icon name={isInstall ? "install_mobile" : "notifications"} className="text-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-orchid-dark">{isInstall ? copy.banner.installTitle : copy.banner.notifyTitle}</p>
                <p className="text-xs leading-snug text-orchid-muted">{isInstall ? (install.canInstall ? copy.banner.installText : copy.banner.iosText) : copy.banner.notifyText}</p>
            </div>
            {isInstall && !install.canInstall ? (
                <LocalizedLink href="/ogrenci/bilgilerim#uygulama" className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-orchid-pink shadow-sm">
                    {copy.banner.details}
                </LocalizedLink>
            ) : (
                <button type="button" disabled={busy} onClick={action} className="aurora-btn shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                    {isInstall ? copy.install.button : copy.notifications.enable}
                </button>
            )}
            <button type="button" onClick={() => dismiss(kind)} aria-label={copy.banner.dismiss} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-orchid-muted hover:bg-white/60">
                <Icon name="close" className="text-[20px]" />
            </button>
        </div>
    );
}
