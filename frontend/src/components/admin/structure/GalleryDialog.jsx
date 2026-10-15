"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { useToast } from "@/components/admin/Toast";
import { Badge } from "@/components/admin/ui";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { addGalleryItems, getGallery, removeGalleryItem, reorderGallery, updateGalleryItem } from "@/lib/admin/commands/structure";
import { uploadImage, uploadVideo } from "@/lib/admin/upload";
import { mediaUrl } from "@/lib/media";
import { AREA_TAGS, customTag, tagForRoom } from "@/lib/gallery";
import { IMAGE_MAX_BYTES, makeVideoPoster } from "@/lib/admin/videoPoster";
import { VIDEO_MAX_INPUT_BYTES, compressVideo } from "@/lib/admin/videoCompress";

const GALLERY_MAX_ITEMS = 30;
const CUSTOM = "__custom";
const NONE = "";

/**
 * Daire galerisi: fotoğraflar + en fazla 1 video. Her dosya etiketlenir:
 * bu oda tipindeki fiziksel oda adları (1. Sol Oda…), Mutfak, Banyo, Salon… veya özel etiket.
 * Odalardan birini seçen öğrenci o odanın etiketli fotoğraflarını görür (etiket anahtarı oda adından üretilir).
 */
export default function GalleryDialog({ apartment: apt, onClose }) {
    const router = useRouter();
    const toast = useToast();
    const { exec, busy } = useCommand();
    const apartmentId = apt.id;
    const fileRef = useRef(null);
    const videoRef = useRef(null);
    const [gallery, setGallery] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(null); // null | { stage, value: 0..1 }
    const [problem, setProblem] = useState("");
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        let alive = true;
        getGallery({ apartmentId })
            .then((list) => alive && setGallery(list))
            .catch((e) => alive && setLoadError(errorText(e)));
        return () => { alive = false; };
    }, [apartmentId]);

    const items = gallery ?? [];
    const video = items.find((g) => g.type === "video");

    // Galeri komutları güncel listeyi döner; yerel durum onunla değişir. Sayfa verisi (özet sayıları) kapanırken yenilenir.
    const run = (command, input, success) =>
        exec(command, { apartmentId, ...input }, success, { refresh: false }).then((out) => {
            if (out.ok && Array.isArray(out.result)) setGallery(out.result);
            return out;
        });
    const close = () => { router.refresh(); onClose(); };

    // Etiket seçenekleri: bu dairenin fiziksel odaları (etiket oda KİMLİĞİNE bağlanır; başka dairedeki aynı adlı oda karışmaz)
    const roomOptions = useMemo(() => apt.rooms.map((r) => tagForRoom(r)), [apt.rooms]);

    const tagValue = (tag) => (!tag ? NONE : tag.key);
    const allKnown = [...roomOptions, ...AREA_TAGS];
    const isCustom = (tag) => tag && !allKnown.some((t) => t.key === tag.key);

    const addImages = async (files) => {
        setProblem("");
        const list = [...files];
        if (!list.length) return;
        const bad = list.find((f) => !f.type.startsWith("image/") || f.size > IMAGE_MAX_BYTES);
        if (bad) return setProblem(`“${bad.name}” eklenemedi: yalnızca görsel dosyaları ve en fazla ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`);
        if (items.length + list.length > GALLERY_MAX_ITEMS) return setProblem(`Bir dairede en fazla ${GALLERY_MAX_ITEMS} dosya olabilir.`);
        setUploading(true);
        try {
            const mediaIds = [];
            for (const [i, file] of list.entries()) {
                setProgress({ stage: `Yükleniyor ${i + 1}/${list.length}`, value: 0 });
                const media = await uploadImage(file, { onProgress: (value) => setProgress({ stage: `Yükleniyor ${i + 1}/${list.length}`, value }) });
                mediaIds.push(media.id);
            }
            await run(addGalleryItems, { mediaIds }, `${list.length} fotoğraf eklendi. Şimdi etiketleyin.`);
        } catch (e) {
            setProblem(errorText(e));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const addVideo = async (file) => {
        setProblem("");
        if (!file) return;
        if (!file.type.startsWith("video/")) return setProblem("Yalnızca video dosyası seçin (MP4 önerilir).");
        if (file.size > VIDEO_MAX_INPUT_BYTES) return setProblem(`Video ${VIDEO_MAX_INPUT_BYTES / 1024 / 1024} MB’tan büyük olamaz.`);
        setUploading(true);
        setProgress({ stage: "Küçültülüyor", value: 0 });
        try {
            // Paylaşımlı hosting'de sunucuda ffmpeg yok: video burada 720p / ~1.5 Mbps'e küçültülür.
            const result = await compressVideo(file, { onProgress: (value) => setProgress({ stage: "Küçültülüyor", value }) });
            const poster = await makeVideoPoster(result.file);
            setProgress({ stage: "Yükleniyor", value: 0 });
            const media = await uploadVideo(
                { file: result.file, poster, duration: result.duration, width: result.width, height: result.height },
                { onProgress: (value) => setProgress({ stage: "Yükleniyor", value }) }
            );
            const note = result.compressed ? `Video küçültülüp eklendi (${(file.size / 1048576).toFixed(1)} → ${(result.file.size / 1048576).toFixed(1)} MB).` : "Video eklendi.";
            await run(addGalleryItems, { mediaIds: [media.id] }, note);
        } catch (e) {
            setProblem(e?.title ? errorText(e) : e?.message || "Video eklenemedi.");
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const move = (index, direction) => {
        const ids = items.map((g) => g.id);
        const target = direction === "up" ? index - 1 : index + 1;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        return run(reorderGallery, { itemIds: ids });
    };

    const sendTag = (t) => (t ? { key: t.key.startsWith("custom") ? "custom" : t.key, tr: t.tr, en: t.en } : null);
    const changeTag = (item, value) => {
        if (value === CUSTOM) return run(updateGalleryItem, { itemId: item.id, tag: { key: "custom", tr: "Özel etiket", en: "Custom label" }, caption: item.caption });
        const tag = value === NONE ? null : allKnown.find((t) => t.key === value);
        return run(updateGalleryItem, { itemId: item.id, tag: sendTag(tag), caption: item.caption });
    };

    return (
        <FormDialog open size="xl" title="Galeri" description={`${apt.name} · ${items.length}/${GALLERY_MAX_ITEMS} dosya`} onClose={close} busy={busy || uploading} hideFooter={false}
            saveLabel="Kapat" onSubmit={(e) => { e.preventDefault(); close(); }} columns={1}>
            <div className="rounded-2xl bg-ad-sunken p-4 text-sm text-ad-body">
                <p className="font-semibold">Nasıl çalışır?</p>
                <ul className="mt-1.5 list-disc space-y-1 ps-5 text-xs text-ad-muted">
                    <li>Her fotoğrafı etiketleyin: <b>{roomOptions.map((r) => r.tr).join(", ") || "odaları önce ekleyin"}</b>, Mutfak, Banyo… Öğrenci bir odayı seçince o odanın fotoğrafları öne çıkar.</li>
                    <li>Video yüklenince tarayıcıda otomatik 720p / ~1,5 Mbps’e küçültülür (süre kadar bekler, sekmeyi kapatmayın; en fazla 3 dk).</li>
                    <li>Her daireye <b>1 video</b> eklenebilir; sitede galerinin başında görünür. Uzaktan kayıtlarda fotoğraflar yanıltıcı olabildiği için video önerilir.</li>
                    <li>Etiketsiz fotoğraf sitede “Fotoğraf” olarak görünür.</li>
                </ul>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || uploading || items.length >= GALLERY_MAX_ITEMS || gallery === null} className="ad-btn ad-btn-primary ad-btn-sm">
                    <Icon name="add_photo_alternate" className="text-[18px]" />Fotoğraf ekle
                </button>
                <button type="button" onClick={() => videoRef.current?.click()} disabled={busy || uploading || Boolean(video)} className="ad-btn ad-btn-outline ad-btn-sm" title={video ? "Zaten bir video var" : undefined}>
                    <Icon name="videocam" className="text-[18px]" />{uploading ? `${progress?.stage ?? "Yükleniyor"} %${Math.round((progress?.value ?? 0) * 100)}` : video ? "Video eklendi (1/1)" : "Video ekle"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => { addVideo(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {problem && <p role="alert" className="flex items-start gap-1.5 text-xs text-ad-danger"><Icon name="error" className="mt-px text-[14px]" />{problem}</p>}

            {loadError ? <p role="alert" className="rounded-2xl bg-ad-danger-soft p-4 text-sm text-ad-danger">{loadError}</p> : gallery === null ? <p className="rounded-2xl bg-ad-sunken p-6 text-center text-sm text-ad-muted">Galeri yükleniyor…</p> : items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ad-line p-8 text-center text-sm text-ad-muted">Henüz dosya yok. Fotoğraf ve video ekleyin.</p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {items.map((item, index) => (
                        <li key={item.id} className="flex gap-3 rounded-2xl border border-ad-line p-3" data-gallery-item={item.id}>
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ad-sunken">
                                {(item.type === "video" ? item.poster : item.url) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={mediaUrl(item.type === "video" ? item.poster : item.url, "thumb")} alt="" className="h-full w-full object-cover" />
                                ) : <div className="flex h-full items-center justify-center text-ad-faint"><Icon name="image" className="text-[28px]" /></div>}
                                {item.type === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white"><Icon name="play_circle" className="text-[32px]" /></span>}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                    {item.type === "video" ? <Badge tone="accent">Video</Badge> : <Badge tone="neutral">Fotoğraf</Badge>}
                                    {!item.tag && item.type !== "video" && <span className="text-[11px] text-ad-warn">Etiketsiz</span>}
                                    <div className="ms-auto flex">
                                        <button type="button" aria-label="Yukarı taşı" disabled={busy || index === 0} onClick={() => move(index, "up")} className="ad-btn ad-btn-icon !h-8 !w-8"><Icon name="arrow_upward" className="text-[16px]" /></button>
                                        <button type="button" aria-label="Aşağı taşı" disabled={busy || index === items.length - 1} onClick={() => move(index, "down")} className="ad-btn ad-btn-icon !h-8 !w-8"><Icon name="arrow_downward" className="text-[16px]" /></button>
                                        <button type="button" aria-label="Sil" disabled={busy} onClick={() => setRemoving(item)} className="ad-btn ad-btn-icon ad-btn-danger-soft !h-8 !w-8"><Icon name="delete" className="text-[16px]" /></button>
                                    </div>
                                </div>
                                <SelectInput aria-label="Etiket" value={isCustom(item.tag) ? CUSTOM : tagValue(item.tag)} onChange={(e) => changeTag(item, e.target.value)} disabled={busy}>
                                    <option value={NONE}>Etiket yok</option>
                                    {roomOptions.length > 0 && <optgroup label="Odalar">{roomOptions.map((t) => <option key={t.key} value={t.key}>{t.tr}</option>)}</optgroup>}
                                    <optgroup label="Ortak alanlar">{AREA_TAGS.map((t) => <option key={t.key} value={t.key}>{t.tr}</option>)}</optgroup>
                                    <option value={CUSTOM}>Özel etiket…</option>
                                </SelectInput>
                                {isCustom(item.tag) && <CustomTag item={item} onSave={(tag) => run(updateGalleryItem, { itemId: item.id, tag: sendTag(tag), caption: item.caption })} busy={busy} />}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <ConfirmDialog
                open={Boolean(removing)}
                title={removing?.type === "video" ? "Video silinsin mi?" : "Fotoğraf silinsin mi?"}
                message="Sitedeki oda sayfasından kalkar."
                confirmLabel="Sil"
                onCancel={() => setRemoving(null)}
                onConfirm={async () => {
                    const out = await run(removeGalleryItem, { itemId: removing.id }, "Silindi.");
                    if (out.ok) setGallery((list) => list.filter((g) => g.id !== removing.id));
                    setRemoving(null);
                }}
            />
        </FormDialog>
    );
}

function CustomTag({ item, onSave, busy }) {
    const [tr, setTr] = useState(item.tag.tr === "Özel etiket" ? "" : item.tag.tr);
    const [en, setEn] = useState(item.tag.en === "Custom label" ? "" : item.tag.en);
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Etiket (TR)"><TextInput value={tr} onChange={(e) => setTr(e.target.value)} placeholder="Çalışma köşesi" /></Field>
            <Field label="Etiket (EN)"><TextInput value={en} onChange={(e) => setEn(e.target.value)} placeholder="Study corner" /></Field>
            <button type="button" disabled={busy || !tr.trim()} onClick={() => onSave(customTag(tr, en))} className="ad-btn ad-btn-soft ad-btn-sm sm:col-span-2">Etiketi kaydet</button>
        </div>
    );
}
