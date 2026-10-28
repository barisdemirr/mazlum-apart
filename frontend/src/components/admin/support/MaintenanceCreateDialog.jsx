"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { Avatar } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { adaptRow } from "@/lib/admin/adapters";
import { createMaintenance, listEnrollments } from "@/lib/admin/commands/finance";
import { MAINT_AREA } from "@/lib/admin/labels";

const MAX_PHOTOS = 3;
const MAX_PHOTO_MB = 25; // ham dosya sınırı; görseller yüklenmeden önce otomatik küçültülür
const norm = (s) => String(s ?? "").toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const live = (r) => !["cancelled", "left"].includes(r.enrollment.status);

/**
 * Ofisten manuel arıza kaydı: öğrenci aranıp seçilir, daire/oda öğrencinin odasından gelir (değiştirilebilir),
 * açıklama ve en fazla 3 görsel eklenir. Kayıt, öğrencinin açtığı arızayla AYNI süreçten geçer (numara, zaman çizelgesi, durum takibi).
 */
export default function MaintenanceCreateDialog({ onClose }) {
    const { periodId } = useAdmin();
    const { exec, busy } = useCommand();
    const [rows, setRows] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [q, setQ] = useState("");
    const [picked, setPicked] = useState(null);
    const [v, setV] = useState({ area: "room", title: "", description: "", roomLabel: "" });
    const [photos, setPhotos] = useState([]);
    const [photoError, setPhotoError] = useState(null);

    useEffect(() => {
        let alive = true;
        listEnrollments({ periodId })
            .then((e) => alive && setRows(e.map(adaptRow).filter(live)))
            .catch((e) => alive && setLoadError(e?.detail || e?.message || "Liste yüklenemedi."));
        return () => { alive = false; };
    }, [periodId]);

    const matches = useMemo(() => {
        if (!rows) return [];
        const t = norm(q);
        const list = t ? rows.filter((r) => norm(`${r.student.firstName} ${r.student.lastName} ${r.student.tc} ${r.student.phone} ${r.room?.label ?? ""}`).includes(t)) : rows;
        return list.slice(0, 8);
    }, [rows, q]);

    const set = (name) => (e) => setV((x) => ({ ...x, [name]: e?.target ? e.target.value : e }));
    const pick = (r) => { setPicked(r); setV((x) => ({ ...x, roomLabel: r.room?.label ?? "" })); };

    const addPhotos = (files) => {
        setPhotoError(null);
        const next = [...photos];
        for (const file of files) {
            if (!file.type.startsWith("image/")) { setPhotoError("Yalnızca görsel dosyaları eklenebilir."); continue; }
            if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoError(`Her görsel en fazla ${MAX_PHOTO_MB} MB olabilir.`); continue; }
            if (next.length >= MAX_PHOTOS) { setPhotoError(`En fazla ${MAX_PHOTOS} görsel eklenebilir.`); break; }
            next.push(file);
        }
        setPhotos(next);
    };

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(createMaintenance, { enrollmentId: picked.enrollment.id, ...v, photos }, "Arıza kaydı açıldı.");
        if (out.ok) onClose();
    };

    const name = picked ? `${picked.student.firstName} ${picked.student.lastName}` : "";
    return (
        <FormDialog open size="lg" columns={1} title="Arıza kaydı aç" description={picked ? name : "Önce öğrenciyi seçin"} onClose={onClose} onSubmit={picked ? submit : undefined} busy={busy} saveLabel="Kaydı aç">
            {!picked ? (
                <>
                    <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci adı, T.C., telefon veya oda ara" />
                    {loadError ? <p className="text-sm text-ad-danger">{loadError}</p> : !rows ? <p className="text-sm text-ad-muted">Öğrenciler yükleniyor…</p> : matches.length === 0 ? <p className="text-sm text-ad-muted">Eşleşen öğrenci yok.</p> : (
                        <ul className="divide-y divide-ad-line rounded-2xl border border-ad-line">
                            {matches.map((r) => (
                                <li key={r.enrollment.id}>
                                    <button type="button" onClick={() => pick(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-ad-sunken">
                                        <Avatar name={`${r.student.firstName} ${r.student.lastName}`} />
                                        <span className="min-w-0 flex-1"><span className="block truncate font-bold">{r.student.firstName} {r.student.lastName}</span><span className="block text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}</span></span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <>
                    <div className="flex items-center gap-3 rounded-2xl bg-ad-sunken p-3">
                        <Avatar name={name} />
                        <div className="min-w-0 flex-1"><div className="truncate font-bold">{name}</div><div className="text-[11px] text-ad-muted">{picked.room?.label ?? "Yerleşmedi"}</div></div>
                        <button type="button" onClick={() => setPicked(null)} className="text-xs font-bold text-ad-brand hover:underline"><Icon name="swap_horiz" className="align-middle text-[16px]" /> Değiştir</button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Daire / oda" hint="Öğrencinin odasıdır; gerekirse değiştirin."><TextInput value={v.roomLabel} onChange={set("roomLabel")} maxLength={120} /></Field>
                        <Field label="Arızanın yeri" required><SelectInput value={v.area} onChange={set("area")}>{Object.entries(MAINT_AREA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</SelectInput></Field>
                        <Field label="Başlık" required className="sm:col-span-2" hint="En az 4 karakter"><TextInput value={v.title} onChange={set("title")} maxLength={120} /></Field>
                        <Field label="Açıklama" required className="sm:col-span-2" hint="En az 10 karakter"><TextInput as="textarea" rows={4} value={v.description} onChange={set("description")} maxLength={2000} /></Field>
                    </div>
                    <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-ad-body">Görseller <span className="font-normal text-ad-faint">(en fazla {MAX_PHOTOS}, her biri {MAX_PHOTO_MB} MB)</span></span>
                            {photos.length < MAX_PHOTOS && (
                                <label className="ad-btn ad-btn-outline ad-btn-sm cursor-pointer">
                                    <Icon name="add_photo_alternate" className="text-[16px]" />Görsel ekle
                                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
                                </label>
                            )}
                        </div>
                        {photos.length > 0 && (
                            <ul className="divide-y divide-ad-line rounded-2xl border border-ad-line">
                                {photos.map((file, i) => (
                                    <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                                        <Icon name="image" className="text-[18px] text-ad-muted" />
                                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                                        <span className="ad-num text-xs text-ad-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                        <button type="button" onClick={() => setPhotos(photos.filter((_, k) => k !== i))} className="text-xs font-bold text-ad-danger hover:underline">Kaldır</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {photoError && <p role="alert" className="mt-1.5 text-xs font-semibold text-ad-danger">{photoError}</p>}
                    </div>
                    <p className="text-xs text-ad-muted">Kayıt öğrencinin sayfasında da görünür ve normal arıza takip sürecine girer (durum güncellemeleri öğrenciye iletilir).</p>
                </>
            )}
        </FormDialog>
    );
}
