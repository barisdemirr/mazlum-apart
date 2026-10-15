"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { useToast } from "@/components/admin/Toast";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import { Card, Chips, EmptyState } from "@/components/admin/ui";
import { deleteMedia, updateMedia } from "@/lib/admin/commands/content";
import { mediaUrl } from "@/lib/media";
import { uploadImage, uploadVideo } from "@/lib/admin/upload";
import { IMAGE_MAX_BYTES, makeVideoPoster } from "@/lib/admin/videoPoster";
import { VIDEO_MAX_INPUT_BYTES, compressVideo } from "@/lib/admin/videoCompress";

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n ? `${Math.round(n / 1024)} KB` : "");

/**
 * Medya kitaplığı: görsel ve video. Görseller sunucuda WebP'ye çevrilip üç boyutta saklanır; videolar tarayıcıda
 * 720p / ~1,5 Mbps'e küçültülür ve kapak karesiyle birlikte yüklenir. Dosyalar doğrudan backend'e gider (yükleme bileti).
 */
export default function MediaView({ media, kind }) {
    const router = useRouter();
    const { exec } = useCommand();
    const toast = useToast();
    const input = useRef(null);
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [job, setJob] = useState(null); // { name, stage, value }

    const goto = (next) => {
        const q = new URLSearchParams();
        if (next.kind && next.kind !== "all") q.set("kind", next.kind);
        if (next.page > 1) q.set("page", String(next.page));
        router.push(`/admin/icerik/medya${q.size ? `?${q}` : ""}`);
    };

    const handleImage = async (file) => {
        if (file.size > IMAGE_MAX_BYTES) throw new Error(`${file.name}: en çok ${IMAGE_MAX_BYTES / 1048576} MB olabilir.`);
        setJob({ name: file.name, stage: "Yükleniyor", value: 0 });
        await uploadImage(file, { onProgress: (value) => setJob({ name: file.name, stage: "Yükleniyor", value }) });
    };

    const handleVideo = async (file) => {
        if (file.size > VIDEO_MAX_INPUT_BYTES) throw new Error(`${file.name}: ${VIDEO_MAX_INPUT_BYTES / 1048576} MB’tan büyük olamaz.`);
        setJob({ name: file.name, stage: "Küçültülüyor", value: 0 });
        const result = await compressVideo(file, { onProgress: (value) => setJob({ name: file.name, stage: "Küçültülüyor", value }) });
        const poster = await makeVideoPoster(result.file);
        setJob({ name: file.name, stage: "Yükleniyor", value: 0 });
        await uploadVideo(
            { file: result.file, poster, duration: result.duration, width: result.width, height: result.height },
            { onProgress: (value) => setJob({ name: file.name, stage: "Yükleniyor", value }) }
        );
    };

    const upload = async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        let done = 0;
        for (const file of files) {
            try {
                if (file.type.startsWith("image/")) await handleImage(file);
                else if (file.type.startsWith("video/")) await handleVideo(file);
                else throw new Error(`${file.name}: yalnızca görsel ya da video yüklenebilir.`);
                done++;
            } catch (err) {
                toast.error(err?.message && !err.title ? err.message : errorText(err));
            }
        }
        setJob(null);
        if (done) {
            toast.success(done === 1 ? "Dosya yüklendi." : `${done} dosya yüklendi.`);
            router.refresh();
        }
    };

    const confirmRemove = async () => {
        const out = await exec(deleteMedia, { id: removing.id }, "Dosya silindi.");
        if (out.ok) setRemoving(null);
    };

    const pages = Math.max(1, Math.ceil(media.total / media.pageSize));

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-ad-muted">Sitede kullanılacak görsel ve videolar. Slayt, oda tipi, galeri ve site ayarlarında buradan seçilir. Her dosyaya Türkçe ve İngilizce açıklama (alt metin) girin.</p>
                <button type="button" onClick={() => input.current?.click()} disabled={Boolean(job)} className="ad-btn ad-btn-primary"><Icon name="upload" className="text-[20px]" />Dosya yükle</button>
                <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={upload} />
            </div>

            <div className="mb-4">
                <Chips value={kind} onChange={(k) => goto({ kind: k, page: 1 })} items={[{ value: "all", label: "Tümü" }, { value: "image", label: "Görseller" }, { value: "video", label: "Videolar" }]} />
            </div>

            {job && (
                <div className="mb-4 rounded-2xl bg-ad-sunken p-4 text-sm" role="status">
                    <p className="font-semibold">{job.stage}: {job.name} — %{Math.round(job.value * 100)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ad-line"><div className="h-full bg-ad-brand transition-all" style={{ width: `${Math.round(job.value * 100)}%` }} /></div>
                    <p className="mt-2 text-xs text-ad-muted">Sekmeyi kapatmayın. Videolar önce tarayıcıda küçültülür.</p>
                </div>
            )}

            {media.items.length === 0 ? <EmptyState icon="photo_library" title="Medya kitaplığı boş" description="İlk dosyayı yükleyin." /> : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {media.items.map((m) => {
                        const src = mediaUrl(m.kind === "video" ? m.posterUrl : m.url, "md");
                        return (
                            <Card key={m.id} padded={false} className="overflow-hidden">
                                <button type="button" onClick={() => setEditing(m)} className="relative block aspect-[4/3] w-full bg-ad-sunken">
                                    {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={src} alt={m.alt?.tr || m.name} className="h-full w-full object-cover" />
                                    ) : <span className="flex h-full items-center justify-center text-ad-faint"><Icon name="movie" className="text-[32px]" /></span>}
                                    {m.kind === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white"><Icon name="play_circle" className="text-[34px]" /></span>}
                                </button>
                                <div className="flex items-center justify-between gap-2 p-3">
                                    <div className="min-w-0"><p className="truncate text-xs font-bold">{m.name}</p><p className="text-[11px] text-ad-muted">{kb(m.size)}{m.alt?.tr ? "" : " · açıklama yok"}</p></div>
                                    <button type="button" onClick={() => setRemoving(m)} aria-label="Sil" className="ad-btn ad-btn-icon ad-btn-danger-soft !h-8 !w-8"><Icon name="delete" className="text-[16px]" /></button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {pages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3 text-sm">
                    <button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled={media.page <= 1} onClick={() => goto({ kind, page: media.page - 1 })}>Önceki</button>
                    <span className="ad-num text-ad-muted">{media.page} / {pages}</span>
                    <button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled={media.page >= pages} onClick={() => goto({ kind, page: media.page + 1 })}>Sonraki</button>
                </div>
            )}

            {editing && <MediaDialog key={editing.id} item={editing} onClose={() => setEditing(null)} />}
            <ConfirmDialog open={!!removing} title="Dosya silinsin mi?" message="Slayt, oda tipi, galeri ya da site ayarlarında kullanılıyorsa silinemez." confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
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
    const src = mediaUrl(item.kind === "video" ? item.posterUrl : item.url, "lg");
    return (
        <FormDialog open title={item.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "alt", label: "Açıklama", value: alt, set: setAlt }]} /></div>}>
            {item.kind === "video" ? (
                <video src={mediaUrl(item.url)} poster={src ?? undefined} controls preload="metadata" className="max-h-64 w-full rounded-2xl bg-black" />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="max-h-64 w-full rounded-2xl object-cover" />
            )}
            <LocalizedField label="Açıklaması (alt metin)" name="alt" value={alt} onChange={setAlt} hint="Ekran okuyucular ve arama motorları için kısa bir tarif." />
        </FormDialog>
    );
}
