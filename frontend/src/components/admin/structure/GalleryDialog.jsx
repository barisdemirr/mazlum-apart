"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { Badge } from "@/components/admin/ui";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { GALLERY_MAX_ITEMS, addGalleryItems, moveGalleryItem, removeGalleryItem, updateGalleryItem } from "@/lib/admin/domain/config";
import { AREA_TAGS, customTag, tagForRoom } from "@/lib/gallery";
import { IMAGE_MAX_BYTES, makeVideoPoster } from "@/lib/admin/videoPoster";
import { VIDEO_MAX_INPUT_BYTES, compressVideo } from "@/lib/admin/videoCompress";

const CUSTOM = "__custom";
const NONE = "";

/**
 * Daire galerisi: fotoğraflar + en fazla 1 video. Her dosya etiketlenir:
 * bu oda tipindeki fiziksel oda adları (1. Sol Oda…), Mutfak, Banyo, Salon… veya özel etiket.
 * Odalardan birini seçen öğrenci o odanın etiketli fotoğraflarını görür (etiket anahtarı oda adından üretilir).
 */
export default function GalleryDialog({ apartmentId, onClose }) {
    const { state } = useAdmin();
    const { exec, busy } = useCommand();
    const fileRef = useRef(null);
    const videoRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(null); // null | { stage: "compress", value: 0..1 }
    const [problem, setProblem] = useState("");
    const [removing, setRemoving] = useState(null);

    const apt = state.apartments.find((a) => a.id === apartmentId);
    const gallery = apt?.gallery ?? [];
    const video = gallery.find((g) => g.type === "video");

    // Etiket seçenekleri: bu dairenin fiziksel odaları (etiket oda KİMLİĞİNE bağlanır; başka dairedeki aynı adlı oda karışmaz)
    const roomOptions = useMemo(
        () => state.rooms.filter((r) => r.apartmentId === apartmentId).map((r) => tagForRoom(r)),
        [state.rooms, apartmentId]
    );

    if (!apt) return null;

    const tagValue = (tag) => (!tag ? NONE : tag.key);
    const allKnown = [...roomOptions, ...AREA_TAGS];
    const isCustom = (tag) => tag && !allKnown.some((t) => t.key === tag.key);

    const addImages = async (files) => {
        setProblem("");
        const list = [...files];
        if (!list.length) return;
        const bad = list.find((f) => !f.type.startsWith("image/") || f.size > IMAGE_MAX_BYTES);
        if (bad) return setProblem(`“${bad.name}” eklenemedi: yalnızca görsel dosyaları ve en fazla ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`);
        await exec(addGalleryItems, { apartmentId, items: list.map((f) => ({ type: "image", url: URL.createObjectURL(f), name: f.name, size: f.size })) }, `${list.length} fotoğraf eklendi. Şimdi etiketleyin.`);
    };

    const addVideo = async (file) => {
        setProblem("");
        if (!file) return;
        if (!file.type.startsWith("video/")) return setProblem("Yalnızca video dosyası seçin (MP4 önerilir).");
        if (file.size > VIDEO_MAX_INPUT_BYTES) return setProblem(`Video ${VIDEO_MAX_INPUT_BYTES / 1024 / 1024} MB’tan büyük olamaz.`);
        setUploading(true);
        setProgress({ value: 0 });
        try {
            // Paylaşımlı hosting'de sunucuda ffmpeg yok: video burada 720p / ~1.5 Mbps'e küçültülür.
            const result = await compressVideo(file, { onProgress: (value) => setProgress({ value }) });
            const poster = await makeVideoPoster(result.file);
            const note = result.compressed ? `Video küçültülüp eklendi (${(file.size / 1048576).toFixed(1)} → ${(result.file.size / 1048576).toFixed(1)} MB).` : "Video eklendi.";
            await exec(addGalleryItems, { apartmentId, items: [{ type: "video", url: URL.createObjectURL(result.file), poster, name: result.file.name, size: result.file.size }] }, note);
        } catch (e) {
            setProblem(e?.message || "Video eklenemedi.");
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const changeTag = (item, value) => {
        if (value === CUSTOM) return exec(updateGalleryItem, { apartmentId, id: item.id, tag: customTag("Özel etiket", "Custom label") });
        const tag = value === NONE ? null : allKnown.find((t) => t.key === value);
        return exec(updateGalleryItem, { apartmentId, id: item.id, tag });
    };

    return (
        <FormDialog open size="xl" title="Galeri" description={`${apt.name} · ${gallery.length}/${GALLERY_MAX_ITEMS} dosya`} onClose={onClose} busy={busy || uploading} hideFooter={false}
            saveLabel="Kapat" onSubmit={(e) => { e.preventDefault(); onClose(); }} columns={1}>
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
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || uploading || gallery.length >= GALLERY_MAX_ITEMS} className="ad-btn ad-btn-primary ad-btn-sm">
                    <Icon name="add_photo_alternate" className="text-[18px]" />Fotoğraf ekle
                </button>
                <button type="button" onClick={() => videoRef.current?.click()} disabled={busy || uploading || Boolean(video)} className="ad-btn ad-btn-outline ad-btn-sm" title={video ? "Zaten bir video var" : undefined}>
                    <Icon name="videocam" className="text-[18px]" />{uploading ? `Küçültülüyor %${Math.round((progress?.value ?? 0) * 100)}` : video ? "Video eklendi (1/1)" : "Video ekle"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => { addVideo(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {problem && <p role="alert" className="flex items-start gap-1.5 text-xs text-ad-danger"><Icon name="error" className="mt-px text-[14px]" />{problem}</p>}

            {gallery.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ad-line p-8 text-center text-sm text-ad-muted">Henüz dosya yok. Fotoğraf ve video ekleyin.</p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {gallery.map((item, index) => (
                        <li key={item.id} className="flex gap-3 rounded-2xl border border-ad-line p-3" data-gallery-item={item.id}>
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ad-sunken">
                                {(item.type === "video" ? item.poster : item.url) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.type === "video" ? item.poster : item.url} alt="" className="h-full w-full object-cover" />
                                ) : <div className="flex h-full items-center justify-center text-ad-faint"><Icon name="image" className="text-[28px]" /></div>}
                                {item.type === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white"><Icon name="play_circle" className="text-[32px]" /></span>}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                    {item.type === "video" ? <Badge tone="accent">Video</Badge> : <Badge tone="neutral">Fotoğraf</Badge>}
                                    {!item.tag && item.type !== "video" && <span className="text-[11px] text-ad-warn">Etiketsiz</span>}
                                    <div className="ms-auto flex">
                                        <button type="button" aria-label="Yukarı taşı" disabled={busy || index === 0} onClick={() => exec(moveGalleryItem, { apartmentId, id: item.id, direction: "up" })} className="ad-btn ad-btn-icon !h-8 !w-8"><Icon name="arrow_upward" className="text-[16px]" /></button>
                                        <button type="button" aria-label="Aşağı taşı" disabled={busy || index === gallery.length - 1} onClick={() => exec(moveGalleryItem, { apartmentId, id: item.id, direction: "down" })} className="ad-btn ad-btn-icon !h-8 !w-8"><Icon name="arrow_downward" className="text-[16px]" /></button>
                                        <button type="button" aria-label="Sil" disabled={busy} onClick={() => setRemoving(item)} className="ad-btn ad-btn-icon ad-btn-danger-soft !h-8 !w-8"><Icon name="delete" className="text-[16px]" /></button>
                                    </div>
                                </div>
                                <SelectInput aria-label="Etiket" value={isCustom(item.tag) ? CUSTOM : tagValue(item.tag)} onChange={(e) => changeTag(item, e.target.value)} disabled={busy}>
                                    <option value={NONE}>Etiket yok</option>
                                    {roomOptions.length > 0 && <optgroup label="Odalar">{roomOptions.map((t) => <option key={t.key} value={t.key}>{t.tr}</option>)}</optgroup>}
                                    <optgroup label="Ortak alanlar">{AREA_TAGS.map((t) => <option key={t.key} value={t.key}>{t.tr}</option>)}</optgroup>
                                    <option value={CUSTOM}>Özel etiket…</option>
                                </SelectInput>
                                {isCustom(item.tag) && <CustomTag item={item} onSave={(tag) => exec(updateGalleryItem, { apartmentId, id: item.id, tag })} busy={busy} />}
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
                onConfirm={async () => { await exec(removeGalleryItem, { apartmentId, id: removing.id }, "Silindi."); setRemoving(null); }}
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
