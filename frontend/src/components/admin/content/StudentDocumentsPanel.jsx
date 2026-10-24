"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import useCommand from "@/components/admin/useCommand";
import { Card, EmptyState } from "@/components/admin/ui";
import { applicationDocumentUrl, deleteApplicationDocument, listApplicationDocuments } from "@/lib/admin/commands/registration";
import { date } from "@/lib/admin/labels";

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n ? `${Math.round(n / 1024)} KB` : "");
const STATUS = { Pending: "Beklemede", Approved: "Onaylandı", Rejected: "Reddedildi" };

/** Medya > Öğrenci belgeleri: başvurularla gelen PDF'ler, öğrenci adı ve başvuru numarasıyla listelenir; açılır, indirilir, silinebilir. */
export default function StudentDocumentsPanel() {
    const { exec } = useCommand();
    const [items, setItems] = useState(null);
    const [error, setError] = useState(false);
    const [removing, setRemoving] = useState(null);

    const load = useCallback(async () => {
        try {
            setItems(await listApplicationDocuments());
            setError(false);
        } catch {
            setError(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const confirmRemove = async () => {
        const out = await exec(deleteApplicationDocument, { id: removing.applicationId }, "Belge silindi.");
        if (out.ok) {
            setRemoving(null);
            load();
        }
    };

    if (error) return <EmptyState icon="error" title="Belgeler yüklenemedi" description="Sayfayı yenileyip tekrar deneyin." />;
    if (items === null) return <p className="text-sm text-ad-muted">Yükleniyor…</p>;
    if (items.length === 0) return <EmptyState icon="description" title="Öğrenci belgesi yok" description="Başvurularla gelen belgeler burada listelenir." />;

    return (
        <div>
            <p className="mb-4 max-w-2xl text-sm text-ad-muted">Başvuruyla yüklenen öğrenci belgeleri (PDF). Belge silinirse başvuru kalır, yalnızca belge kaldırılır.</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((d) => (
                    <Card key={d.applicationId} className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ad-sunken text-ad-brand"><Icon name="picture_as_pdf" className="text-[24px]" /></span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{d.studentName}</p>
                                <p className="text-xs text-ad-muted">{d.applicationNo} · {STATUS[d.status] ?? d.status}</p>
                                <p className="truncate text-[11px] text-ad-faint" title={d.fileName ?? ""}>{d.fileName}{d.size ? ` · ${kb(d.size)}` : ""} · {date(d.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a href={applicationDocumentUrl(d.applicationId)} target="_blank" rel="noopener noreferrer" className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="visibility" className="text-[16px]" />Aç</a>
                            <a href={applicationDocumentUrl(d.applicationId, true)} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="text-[16px]" />İndir</a>
                            <button type="button" onClick={() => setRemoving(d)} className="ad-btn ad-btn-danger-soft ad-btn-sm ms-auto"><Icon name="delete" className="text-[16px]" />Sil</button>
                        </div>
                    </Card>
                ))}
            </div>
            <ConfirmDialog open={Boolean(removing)} title="Belge silinsin mi?" message={removing ? `${removing.studentName} (${removing.applicationNo}) için yüklenen belge kalıcı olarak silinir. Başvuru silinmez.` : ""} confirmLabel="Sil" onCancel={() => setRemoving(null)} onConfirm={confirmRemove} />
        </div>
    );
}
