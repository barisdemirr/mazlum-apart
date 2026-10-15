"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { deleteMedia, listMedia } from "@/lib/admin/commands/content";
import { mediaUrl } from "@/lib/media";
import { uploadImage } from "@/lib/admin/upload";
import { IMAGE_MAX_BYTES } from "@/lib/admin/videoPoster";

/**
 * Medya kitaplığından dosya seçtirir (oda tipi kapağı, slayt görseli, site ayarlarındaki video/harita).
 * Kitaplık kendi kendine backend'den okunur; yüklenen görsel doğrudan seçilir. kind="video" iken yalnızca mevcut videolar listelenir
 * (video yükleme, tarayıcıda küçültme gerektirdiği için Medya sayfasındadır).
 */
export default function MediaPicker({ value, onChange, allowNone = false, kind = "image" }) {
    const toast = useToast();
    const { exec } = useCommand();
    const input = useRef(null);
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [removing, setRemoving] = useState(null);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        try {
            const page = await listMedia({ kind, pageSize: 60 });
            setItems(page.items);
            setError("");
        } catch (e) {
            setError(errorText(e));
        }
    }, [kind]);

    useEffect(() => { load(); }, [load]);

    const upload = async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        let last = null;
        setUploading(true);
        try {
            for (const file of files) {
                if (!file.type.startsWith("image/")) { toast.error(`${file.name}: yalnızca görsel yüklenebilir.`); continue; }
                if (file.size > IMAGE_MAX_BYTES) { toast.error(`${file.name}: en çok ${IMAGE_MAX_BYTES / 1048576} MB olabilir.`); continue; }
                try {
                    last = await uploadImage(file);
                    toast.success(`${file.name} yüklendi.`);
                } catch (err) {
                    toast.error(`${file.name}: ${errorText(err)}`);
                }
            }
        } finally {
            setUploading(false);
        }
        if (last) {
            await load();
            onChange(last.id);
        }
    };

    const confirmRemove = async () => {
        const out = await exec(deleteMedia, { id: removing.id }, "Dosya silindi.", { refresh: false });
        setRemoving(null);
        if (out.ok) {
            if (value === removing.id) onChange(null);
            load();
        }
    };

    const list = items ?? [];
    const thumb = (m) => mediaUrl(kind === "video" ? m.posterUrl : m.url, "md");

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {allowNone && <button type="button" onClick={() => onChange(null)} className={`flex aspect-[4/3] items-center justify-center rounded-xl border-2 text-xs font-bold ${!value ? "border-ad-brand text-ad-brand" : "border-ad-line text-ad-muted"}`}>{kind === "video" ? "Video yok" : "Görsel yok"}</button>}
                {list.map((m) => (
                    <div key={m.id} className="group relative aspect-[4/3]" data-media-tile={m.id}>
                        <button type="button" onClick={() => onChange(m.id)} aria-pressed={value === m.id} title={m.name} className={`relative h-full w-full overflow-hidden rounded-xl border-2 bg-ad-sunken transition-colors ${value === m.id ? "border-ad-brand" : "border-transparent hover:border-ad-line-strong"}`}>
                            {thumb(m) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb(m)} alt={m.alt?.tr || m.name} className="h-full w-full object-cover" />
                            ) : <span className="flex h-full items-center justify-center text-ad-faint"><Icon name="movie" className="text-[28px]" /></span>}
                            {kind === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white"><Icon name="play_circle" className="text-[28px]" /></span>}
                        </button>
                        {value !== m.id && (
                            <button type="button" onClick={() => setRemoving(m)} aria-label={`${m.name} dosyasını sil`} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ad-danger opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <Icon name="delete" className="text-[16px]" />
                            </button>
                        )}
                    </div>
                ))}
                {kind === "image" && (
                    <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ad-line text-xs font-bold text-ad-muted hover:border-ad-brand hover:text-ad-brand disabled:opacity-60">
                        <Icon name="add_photo_alternate" className="text-[22px]" />{uploading ? "Yükleniyor…" : "Yeni görsel"}
                    </button>
                )}
                <input ref={input} type="file" accept="image/*" multiple hidden onChange={upload} />
            </div>
            {error && <p role="alert" className="rounded-xl bg-ad-danger-soft p-3 text-xs text-ad-danger">{error}</p>}
            {items === null && !error && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-muted">Kitaplık yükleniyor…</p>}
            {items && list.length === 0 && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-muted">{kind === "video" ? "Kitaplıkta video yok. Medya sayfasından yükleyin." : "Kitaplıkta görsel yok. “Yeni görsel” ile yükleyin."}</p>}
            <ConfirmDialog open={!!removing} title="Dosya silinsin mi?" message={removing ? `${removing.name} medya kitaplığından silinecek. Slaytta, oda tipinde ya da galeride kullanılıyorsa silinemez.` : ""} confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}
