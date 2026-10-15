"use client";

import Icon from "@/components/ui/Icon";
import { Card } from "@/components/admin/ui";
import { useInstall, usePush } from "@/lib/pwa/usePwa";

const ERRORS = {
    service: "Bildirim servisine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.",
    noWorker: "Uygulama henüz hazır değil. Sayfayı yenileyip tekrar deneyin.",
    denied: "Bildirim izni verilmedi.",
    unsupported: "Bu cihaz bildirimleri desteklemiyor.",
    unknown: "Bildirimler açılamadı. Tekrar deneyin.",
};

/** Yönetim uygulaması: kurulum + bu cihaza bildirim (yeni başvuru, geciken ödeme, yeni arıza uyarıları için) */
export default function PwaPanel() {
    const install = useInstall();
    const push = usePush("admin", { lang: "tr", testTitle: "Mazlum Yönetim", testBody: "Bildirimler bu cihazda çalışıyor." });
    const pushOn = push.permission === "granted" && (push.subscribed || !push.configured);

    return (
        <Card title="Uygulama ve bildirimler" description="Yönetim panelini telefonunuza ya da bilgisayarınıza uygulama olarak yükleyin; yeni başvuru ve arıza bildirimlerini bu cihazda alın.">
            <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ad-brand-soft text-ad-brand"><Icon name={install.standalone ? "check_circle" : "install_mobile"} className="text-[22px]" /></span>
                        <div>
                            <p className="text-sm font-bold">{install.standalone ? "Uygulama yüklü" : "Uygulamayı yükle"}</p>
                            <p className="text-xs text-ad-muted">{install.standalone ? "Panel uygulama olarak açık." : "Ana ekrandan tek dokunuşla, tam ekran açılır."}</p>
                        </div>
                    </div>
                    {install.canInstall && <button type="button" onClick={() => install.install()} className="ad-btn ad-btn-primary"><Icon name="download" className="text-[17px]" />Yükle</button>}
                    {install.showIosHint && (
                        <div className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-body">
                            <p className="mb-1 font-bold">iPhone / iPad&apos;de ana ekrana ekleyin</p>
                            <ol className="list-decimal space-y-0.5 ps-4"><li>Safari&apos;de Paylaş düğmesine dokunun.</li><li>“Ana Ekrana Ekle”yi seçin.</li><li>Sağ üstte Ekle&apos;ye dokunun.</li></ol>
                            <p className="mt-1.5 font-semibold text-ad-brand">iPhone&apos;da bildirimler yalnızca ana ekrandan açılan uygulamada çalışır.</p>
                        </div>
                    )}
                    {install.ready && !install.standalone && !install.canInstall && !install.showIosHint && <p className="text-xs text-ad-muted">Tarayıcı menüsünden “Uygulamayı yükle” seçeneğini kullanabilirsiniz.</p>}
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pushOn ? "bg-ad-ok-soft text-ad-ok" : "bg-ad-brand-soft text-ad-brand"}`}><Icon name={pushOn ? "notifications_active" : "notifications"} className="text-[22px]" /></span>
                        <div>
                            <p className="text-sm font-bold">{push.ready && pushOn ? "Bildirimler açık" : "Bildirimler"}</p>
                            <p className="text-xs text-ad-muted">Yeni başvuru, geciken ödeme ve yeni arıza kaydı bu cihaza bildirim olarak gelir.</p>
                        </div>
                    </div>
                    {push.ready && push.needsInstall && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-body">iPhone&apos;da bildirim almak için önce uygulamayı ana ekrana ekleyin.</p>}
                    {push.ready && !push.needsInstall && !push.supported && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-body">Bu tarayıcı bildirimleri desteklemiyor.</p>}
                    {push.ready && push.supported && !push.needsInstall && push.permission === "denied" && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-body">Bildirimler tarayıcı ayarlarından engellenmiş. Açmak için site ayarlarında Bildirimler iznini verin.</p>}
                    {push.ready && push.supported && !push.needsInstall && push.permission !== "denied" && (
                        <div className="flex flex-wrap items-center gap-2">
                            {!pushOn && <button type="button" disabled={push.busy} onClick={push.enable} className="ad-btn ad-btn-primary">{push.busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}Bildirimleri aç</button>}
                            {pushOn && <button type="button" onClick={push.sendTest} className="ad-btn ad-btn-outline"><Icon name="notification_add" className="text-[17px]" />Test bildirimi gönder</button>}
                            {pushOn && push.subscribed && <button type="button" disabled={push.busy} onClick={push.disable} className="ad-btn ad-btn-soft">Kapat</button>}
                        </div>
                    )}
                    {push.ready && pushOn && !push.configured && <p className="text-xs text-ad-muted">Bildirim izni verildi. Bildirimler, sunucu bağlantısı tamamlanınca gelmeye başlar.</p>}
                    {push.error && <p role="alert" className="text-xs font-semibold text-ad-danger">{ERRORS[push.error] ?? ERRORS.unknown}</p>}
                </div>
            </div>
        </Card>
    );
}
