"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { useToast } from "@/components/admin/Toast";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import { Card, EmptyState } from "@/components/admin/ui";
import { addMedia, removeMedia, updateMedia } from "@/lib/admin/domain/config";

const MAX_MB = 10;
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n ? `${Math.round(n / 1024)} KB` : "");

/**
 * Medya kitaplığı. Şimdilik yalnızca görsel; yüklenen dosya bu oturumda tarayıcıda tutulur (örnek davranış).
 * Backend gelince dosya sunucuya yüklenir; video sıkıştırma ve yükleme yolu planın 7. bölümündedir.
 */
export default function MediaView() {
    const { state } = useAdmin();
    const { exec } = useCommand();
    const toast = useToast();
    const input = useRef(null);
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);

    const upload = async (e) => {
        for (const file of Array.from(e.target.files ?? [])) {
            if (!file.type.startsWith("image/")) { toast.error(`${file.name}: yalnızca görsel yüklenebilir.`); continue; }
            if (file.size > MAX_MB * 1048576) { toast.error(`${file.name}: en çok ${MAX_MB} MB olabilir.`); continue; }
            await exec(addMedia, { name: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file), size: file.size }, `${file.name} yüklendi.`);
        }
        e.target.value = "";
    };

    const confirmRemove = async () => {
        const out = await exec(removeMedia, { id: removing.id }, "Görsel silindi.");
        if (out.ok) setRemoving(null);
    };

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-ad-muted">Sitede kullanılacak görseller. Slayt ve oda tipi görselleri buradan seçilir. Her görsele Türkçe ve İngilizce açıklama (alt metin) girin.</p>
                <button type="button" onClick={() => input.current?.click()} className="ad-btn ad-btn-primary"><Icon name="upload" className="text-[20px]" />Görsel yükle</button>
                <input ref={input} type="file" accept="image/*" multiple hidden onChange={upload} />
            </div>
            {state.media.length === 0 ? <EmptyState icon="photo_library" title="Medya kitaplığı boş" description="İlk görseli yükleyin." /> : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {state.media.map((m) => (
                        <Card key={m.id} padded={false} className="overflow-hidden">
                            <button type="button" onClick={() => setEditing(m)} className="block aspect-[4/3] w-full bg-ad-sunken">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.url} alt={m.alt?.tr || m.name} className="h-full w-full object-cover" />
                            </button>
                            <div className="flex items-center justify-between gap-2 p-3">
                                <div className="min-w-0"><p className="truncate text-xs font-bold">{m.name}</p><p className="text-[11px] text-ad-muted">{kb(m.size)}{m.alt?.tr ? "" : " · açıklama yok"}</p></div>
                                <button type="button" onClick={() => setRemoving(m)} aria-label="Sil" className="ad-btn ad-btn-icon ad-btn-danger-soft !h-8 !w-8"><Icon name="delete" className="text-[16px]" /></button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            {editing && <MediaDialog item={editing} onClose={() => setEditing(null)} />}
            <ConfirmDialog open={!!removing} title="Görsel silinsin mi?" message="Slayt ya da oda tipinde kullanılıyorsa silinemez." confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}

function MediaDialog({ item, onClose }) {
    const { exec, busy } = useCommand();
    const [alt, setAlt] = useState(toLocalized(item.alt));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(updateMedia, { id: item.id, alt }, "Açıklama kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title={item.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "alt", label: "Açıklama", value: alt, set: setAlt }]} /></div>}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="max-h-64 w-full rounded-2xl object-cover" />
            <LocalizedField label="Görsel açıklaması (alt metin)" name="alt" value={alt} onChange={setAlt} hint="Ekran okuyucular ve arama motorları için kısa bir tarif." />
        </FormDialog>
    );
}
