"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/admin/ui";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { applicationDocumentUrl, deleteStudentDocument, listStudentDocuments, studentDocumentUrl, uploadStudentDocument } from "@/lib/admin/commands/registration";
import { date } from "@/lib/admin/labels";
import { turkeyDate } from "@/lib/format";

const size = (b) => (b == null ? "" : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * Öğrenci profilindeki belgeler: başvuruda alınan belgeler (otomatik, her dönemin başvurusundan) + sonradan yüklenenler.
 * Yalnızca yönetici oturumuyla açılır; belgeler yönetici ucundan sunulur.
 */
export default function StudentFilesPanel({ studentId, enrollmentId, canEdit = true }) {
    const { exec, busy } = useCommand();
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const fileRef = useRef(null);

    const load = useCallback(() => {
        listStudentDocuments({ studentId }).then(setItems).catch((e) => setError(errorText(e)));
    }, [studentId]);
    useEffect(() => { load(); }, [load]);

    const upload = async (ev) => {
        ev.preventDefault();
        setError("");
        const out = await exec(uploadStudentDocument, { studentId, enrollmentId, title, file }, "Belge yüklendi.");
        if (out.ok) {
            setTitle("");
            setFile(null);
            if (fileRef.current) fileRef.current.value = "";
            load();
        }
    };

    const remove = async (item) => {
        if (!window.confirm(`“${item.title}” silinsin mi?`)) return;
        const out = await exec(deleteStudentDocument, { id: item.id }, "Belge silindi.");
        if (out.ok) load();
    };

    const href = (it, dl) => (it.kind === "application" ? applicationDocumentUrl(it.id, dl) : studentDocumentUrl(it.id, dl));

    return (
        <Card title="Belgeler" description="Başvuruda alınan belgeler otomatik görünür; yeni belge ekleyebilirsiniz.">
            {error && <p className="mt-3 text-sm font-semibold text-ad-danger">{error}</p>}
            {items === null ? (
                <p className="mt-4 text-sm text-ad-muted">Yükleniyor…</p>
            ) : items.length === 0 ? (
                <p className="mt-4 text-sm text-ad-muted">Bu öğrenci için kayıtlı belge yok.</p>
            ) : (
                <ul className="mt-4 space-y-2">
                    {items.map((it) => (
                        <li key={`${it.kind}-${it.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ad-sunken px-4 py-3 text-sm">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 font-bold"><Icon name="description" className="text-[18px] text-ad-accent" />{it.title}</div>
                                <div className="mt-0.5 text-[11px] text-ad-muted">
                                    {[it.source, it.fileName, size(it.size), date(turkeyDate(it.at))].filter(Boolean).join(" · ")}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <a href={href(it, false)} target="_blank" rel="noopener noreferrer" className="ad-btn ad-btn-outline ad-btn-sm">Aç</a>
                                <a href={href(it, true)} className="ad-btn ad-btn-soft ad-btn-sm">İndir</a>
                                {canEdit && it.kind === "upload" && (
                                    <button type="button" onClick={() => remove(it)} disabled={busy} className="ad-btn ad-btn-danger-soft ad-btn-sm">Sil</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {canEdit && (
                <form onSubmit={upload} className="mt-4 grid gap-2 rounded-2xl border border-ad-line p-4 sm:grid-cols-[1fr_auto]">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Belge adı (örn. Apart sözleşmesi)" className="ad-field sm:col-span-2" />
                    <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="ad-field text-sm" />
                    <button type="submit" disabled={busy || !file || !title.trim()} className="ad-btn ad-btn-primary ad-btn-sm">
                        <Icon name="upload_file" className="text-[18px]" />
                        Belge yükle
                    </button>
                    <p className="text-[11px] text-ad-muted sm:col-span-2">Yalnızca PDF, en fazla 6 MB. Belgeler yalnızca yönetim paneli oturumuyla açılır.</p>
                </form>
            )}
        </Card>
    );
}
