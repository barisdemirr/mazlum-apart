"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import useCommand from "@/components/admin/useCommand";
import { addMedia, removeMedia } from "@/lib/admin/domain/config";

const MAX_MB = 10;

/**
 * Medya kitaplığından görsel seçtirir (oda tipi kapağı, slayt görseli). Buradan:
 *  - yeni görsel yüklenebilir (yüklenen görsel otomatik seçilir),
 *  - kullanılmayan görsel silinebilir (seçili olan ya da slayt/oda tipinde kullanılan silinmez).
 */
export default function MediaPicker({ value, onChange, allowNone = false }) {
    const { state } = useAdmin();
    const { exec } = useCommand();
    const toast = useToast();
    const input = useRef(null);
    const [removing, setRemoving] = useState(null);
    const images = state.media.filter((m) => m.kind === "image");

    const upload = async (e) => {
        let last = null;
        for (const file of Array.from(e.target.files ?? [])) {
            if (!file.type.startsWith("image/")) { toast.error(`${file.name}: yalnızca görsel yüklenebilir.`); continue; }
            if (file.size > MAX_MB * 1048576) { toast.error(`${file.name}: en çok ${MAX_MB} MB olabilir.`); continue; }
            const out = await exec(addMedia, { name: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file), size: file.size }, `${file.name} yüklendi.`);
            if (out.ok) last = out.result;
        }
        e.target.value = "";
        if (last) onChange(last.id);
    };

    const confirmRemove = async () => {
        await exec(removeMedia, { id: removing.id }, "Görsel silindi.");
        setRemoving(null);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {allowNone && <button type="button" onClick={() => onChange(null)} className={`flex aspect-[4/3] items-center justify-center rounded-xl border-2 text-xs font-bold ${!value ? "border-ad-brand text-ad-brand" : "border-ad-line text-ad-muted"}`}>Görsel yok</button>}
                {images.map((m) => (
                    <div key={m.id} className="group relative aspect-[4/3]" data-media-tile={m.id}>
                        <button type="button" onClick={() => onChange(m.id)} aria-pressed={value === m.id} title={m.name} className={`relative h-full w-full overflow-hidden rounded-xl border-2 transition-colors ${value === m.id ? "border-ad-brand" : "border-transparent hover:border-ad-line-strong"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.url} alt={m.alt?.tr || m.name} className="h-full w-full object-cover" />
                        </button>
                        {value !== m.id && (
                            <button type="button" onClick={() => setRemoving(m)} aria-label={`${m.name} görselini sil`} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ad-danger opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <Icon name="delete" className="text-[16px]" />
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={() => input.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ad-line text-xs font-bold text-ad-muted hover:border-ad-brand hover:text-ad-brand">
                    <Icon name="add_photo_alternate" className="text-[22px]" />Yeni görsel
                </button>
                <input ref={input} type="file" accept="image/*" multiple hidden onChange={upload} />
            </div>
            {images.length === 0 && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-muted">Kitaplıkta görsel yok. “Yeni görsel” ile yükleyin.</p>}
            <ConfirmDialog open={!!removing} title="Görsel silinsin mi?" message={removing ? `${removing.name} medya kitaplığından silinecek. Slaytta ya da başka bir oda tipinde kullanılıyorsa silinemez.` : ""} confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}
