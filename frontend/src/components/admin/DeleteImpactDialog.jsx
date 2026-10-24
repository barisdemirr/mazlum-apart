"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import ModalPortal from "@/components/admin/ModalPortal";
import { errorText } from "@/components/admin/useCommand";

const WAIT_SECONDS = 5;

/** Etki özetinden, silme sonucunu anlatan cümleler (yalnızca sıfırdan büyük kalemler yazılır) */
function consequences(kind, name, i) {
    const lines = [];
    if (kind === "apartment") {
        lines.push(`“${name}” dairesini silerseniz bu dairedeki ${i.rooms} oda (toplam ${i.beds} yatak) da silinecek ve sitede ya da başvuruda artık seçilemeyecek.`);
        if (i.photos > 0) lines.push(`Dairenin ${i.photos} galeri öğesi daireden kaldırılacak (dosyalar medya kitaplığında kalır).`);
    } else if (kind === "roomtype") {
        lines.push(`“${name}” oda tipini silerseniz bu tipe ait ${i.rooms} oda (${i.apartments} dairede, toplam ${i.beds} yatak) da silinecek ve sitede ya da başvuruda artık seçilemeyecek.`);
        if (i.prices > 0) lines.push(`Bu tipin ${i.prices} dönem fiyatı da silinecek.`);
    } else {
        lines.push(`“${name}” odası (${i.beds} yatak) silinecek ve sitede ya da başvuruda artık seçilemeyecek.`);
    }
    if (i.pendingApplications > 0) lines.push(`${i.pendingApplications} başvurunun yatak tercihi temizlenecek (başvurular “yatak fark etmez” olarak kalır).`);
    if (i.pastPlacements > 0) lines.push(`${i.pastPlacements} geçmiş yerleşim kaydı, öğrencilerin yerleşim geçmişi listesinde artık görünmeyecek.`);
    lines.push("Bu işlem panelden geri alınamaz.");
    return lines;
}

/**
 * Kritik silme penceresi: önce sunucudan etki özeti alınır (kaç oda/yatak/fiyat etkilenecek), cümleyle gösterilir.
 * Onay düğmesi 5 saniye boyunca basılamaz. Silmeyi engelleyen bir durum varsa nedeni yazılır ve onay düğmesi çıkmaz.
 *
 * kind: "apartment" | "roomtype" | "room" · item: { id, name } · loadImpact({ id }) → etki özeti · onConfirm() async
 */
export default function DeleteImpactDialog({ open, kind, item, loadImpact, onConfirm, onCancel }) {
    const [impact, setImpact] = useState(null);
    const [error, setError] = useState("");
    const [left, setLeft] = useState(WAIT_SECONDS);
    const [busy, setBusy] = useState(false);

    // pencere açılınca etki özetini getir
    useEffect(() => {
        if (!open || !item) return;
        let alive = true;
        setImpact(null);
        setError("");
        setLeft(WAIT_SECONDS);
        loadImpact({ id: item.id })
            .then((data) => alive && setImpact(data))
            .catch((e) => alive && setError(errorText(e)));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, item?.id]);

    // geri sayım: özet geldikten sonra başlar
    const counting = Boolean(impact) && !impact.blockedReason && left > 0;
    useEffect(() => {
        if (!counting) return;
        const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [counting, left]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && !busy && onCancel();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, busy, onCancel]);

    if (!open || !item) return null;

    const confirm = async () => {
        setBusy(true);
        try {
            await onConfirm();
        } finally {
            setBusy(false);
        }
    };

    const blocked = impact?.blockedReason;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[66] flex items-end justify-center bg-ad-ink/60 p-4 backdrop-blur-sm sm:items-center">
                <div role="alertdialog" aria-modal="true" aria-labelledby="impact-title" className="ad-rise flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-ad-danger bg-ad-surface shadow-ad-lg">
                    <div className="flex items-start gap-3.5 border-b border-ad-line p-5 sm:p-6">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ad-danger-soft text-ad-danger"><Icon name="warning" className="text-[24px]" /></span>
                        <div className="min-w-0 pt-0.5">
                            <h2 id="impact-title" className="text-base font-bold">{blocked ? "Silinemez" : "Kritik işlem: silme onayı"}</h2>
                            <p className="mt-0.5 truncate text-xs text-ad-muted">{item.name}</p>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm leading-relaxed sm:p-6">
                        {error ? <p className="text-ad-danger">{error}</p>
                            : !impact ? <p className="text-ad-muted">Etkilenecek kayıtlar hesaplanıyor…</p>
                            : blocked ? <p className="rounded-2xl bg-ad-warn-soft p-4 text-ad-warn">{blocked}</p>
                            : (
                                <ul className="space-y-2.5">
                                    {consequences(kind, item.name, impact).map((line, index, all) => (
                                        <li key={line} className={`flex gap-2.5 ${index === all.length - 1 ? "font-bold text-ad-danger" : ""}`}>
                                            <Icon name={index === all.length - 1 ? "error" : "arrow_right"} className="mt-0.5 shrink-0 text-[18px]" />
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </div>

                    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ad-line p-5 sm:flex-row sm:justify-end sm:px-6">
                        <button type="button" onClick={onCancel} disabled={busy} className="ad-btn ad-btn-outline">{blocked || error ? "Kapat" : "Vazgeç"}</button>
                        {impact && !blocked && !error && (
                            <button type="button" onClick={confirm} disabled={busy || left > 0} className="ad-btn ad-btn-danger" aria-live="polite">
                                {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                                {left > 0 ? `Onaylıyorum (${left})` : "Onaylıyorum, sil"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
