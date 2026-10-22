"use client";

import Icon from "@/components/ui/Icon";
import { useInstall, usePush } from "@/lib/pwa/usePwa";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * "Uygulama ve bildirimler" kartı (Bilgilerim sayfası): kurulum yönergesi/düğmesi + bildirim açma/kapama/test.
 * Her durum için açık bir metin gösterir (iPhone'da ana ekrana ekleme, izin engelli, desteklenmiyor…).
 */
export default function PwaPanel() {
    const { t, locale } = useLanguage();
    const copy = t.studentPortal.pwa;
    const install = useInstall();
    const push = usePush("student", { lang: locale, testTitle: copy.notifications.testTitle, testBody: copy.notifications.testBody });
    const n = copy.notifications;

    const pushOn = push.permission === "granted" && (push.subscribed || !push.configured);

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" id="uygulama">
            {/* ───────── Kurulum ───────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                        <Icon name={install.standalone ? "check_circle" : "install_mobile"} className="text-[22px]" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-display text-lg font-semibold text-orchid-dark">{install.standalone ? copy.install.installed : copy.install.title}</p>
                        <p className="text-sm leading-relaxed text-orchid-muted">{install.standalone ? copy.install.installedText : copy.install.text}</p>
                    </div>
                </div>

                {install.canInstall && (
                    <button type="button" onClick={() => install.install()} className="aurora-btn flex h-12 items-center justify-center gap-2 self-start rounded-full px-6 text-sm font-bold text-white">
                        <Icon name="download" className="text-[20px]" />
                        {copy.install.button}
                    </button>
                )}

                {install.showIosHint && (
                    <div className="rounded-2xl bg-orchid-powder/60 p-4">
                        <p className="text-sm font-bold text-orchid-dark">{copy.install.iosTitle}</p>
                        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm text-orchid-muted">
                            {copy.install.iosSteps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                        <p className="mt-2 text-xs font-semibold text-orchid-pink">{copy.install.iosNote}</p>
                    </div>
                )}

                {install.ready && !install.standalone && !install.canInstall && !install.showIosHint && (
                    <p className="text-xs text-orchid-muted">{copy.install.other}</p>
                )}
            </div>

            {/* ───────── Bildirimler ───────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${pushOn ? "bg-emerald-50 text-emerald-700" : "bg-orchid-powder text-orchid-pink"}`}>
                        <Icon name={pushOn ? "notifications_active" : "notifications"} filled={pushOn} className="text-[22px]" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-display text-lg font-semibold text-orchid-dark">{push.ready && pushOn ? n.on : n.title}</p>
                        <p className="text-sm leading-relaxed text-orchid-muted">{n.text}</p>
                    </div>
                </div>

                {push.ready && push.needsInstall && <p className="rounded-2xl bg-orchid-powder/60 p-3 text-sm text-orchid-muted">{n.needInstall}</p>}

                {push.ready && !push.needsInstall && !push.supported && <p className="rounded-2xl bg-orchid-powder/60 p-3 text-sm text-orchid-muted">{n.unsupported}</p>}

                {push.ready && push.supported && !push.needsInstall && push.permission === "denied" && (
                    <p className="rounded-2xl bg-orchid-powder/60 p-3 text-sm text-orchid-muted">{n.denied}</p>
                )}

                {push.ready && push.supported && !push.needsInstall && push.permission !== "denied" && (
                    <div className="flex flex-wrap items-center gap-2">
                        {!pushOn && (
                            <button type="button" disabled={push.busy} onClick={push.enable} className="aurora-btn flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white disabled:opacity-60">
                                <Icon name={push.busy ? "progress_activity" : "notifications"} className={`text-[20px] ${push.busy ? "animate-spin" : ""}`} />
                                {n.enable}
                            </button>
                        )}
                        {pushOn && (
                            <>
                                {push.subscribed && (
                                    <button type="button" disabled={push.busy} onClick={push.disable} className="flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-orchid-muted hover:bg-orchid-powder hover:text-orchid-pink disabled:opacity-60">
                                        {n.disable}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {push.ready && pushOn && !push.configured && <p className="text-xs text-orchid-muted">{n.pending}</p>}
                {push.error && <p role="alert" className="text-sm font-semibold text-red-600">{n.errors[push.error] ?? n.errors.unknown}</p>}
            </div>
        </div>
    );
}
