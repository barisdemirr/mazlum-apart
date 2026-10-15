"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "@/components/apply/fields/FloatingField";
import { FieldError, GroupLabel, Segmented } from "@/components/apply/fields/Choice";
import { AREAS, MAX_PHOTOS, MAX_PHOTO_BYTES, emptyRequest, validateRequest } from "@/lib/maintenance";
import { createMaintenanceRequest } from "@/services/maintenance";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { interpolate } from "@/lib/i18n/dictionaries";

/**
 * Yeni arıza kaydı penceresi (mobilde alttan açılır). Fotoğraflar önizlenir, gönderirken küçültülüp
 * multipart olarak yüklenir.
 */
export default function RequestForm({ open, onClose, onCreated }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.maintenance;
    const f = copy.form;

    const [form, setForm] = useState(emptyRequest);
    const [errors, setErrors] = useState({});
    const [photoError, setPhotoError] = useState("");
    const [tick, setTick] = useState(0);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    // Her açılışta temiz form
    useEffect(() => {
        if (open) {
            setForm(emptyRequest());
            setErrors({});
            setPhotoError("");
            setBusy(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && !busy && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, busy, onClose]);

    // Önizleme adresleri bellek sızdırmasın
    useEffect(() => () => form.photos.forEach((p) => URL.revokeObjectURL(p.url)), [form.photos]);

    const set = (key) => (value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    function addPhotos(fileList) {
        const files = Array.from(fileList ?? []);
        if (fileRef.current) fileRef.current.value = "";
        if (!files.length) return;

        if (files.some((file) => !file.type.startsWith("image/"))) return setPhotoError(f.errors.photoType);
        if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return setPhotoError(f.errors.photoSize);
        if (form.photos.length + files.length > MAX_PHOTOS) return setPhotoError(interpolate(f.errors.photoLimit, { max: MAX_PHOTOS }));

        setPhotoError("");
        setForm((prev) => ({ ...prev, photos: [...prev.photos, ...files.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file) }))] }));
    }

    const removePhoto = (id) => setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));

    async function submit(event) {
        event.preventDefault();
        if (busy) return;

        const found = validateRequest(form);
        if (Object.keys(found).length) {
            setErrors(found);
            setTick((n) => n + 1);
            return;
        }

        setBusy(true);
        try {
            const created = await createMaintenanceRequest(form);
            onCreated(created);
        } catch (error) {
            // Sunucunun doğrulama/çakışma mesajı (örn. "Çok sayıda açık arıza kaydınız var") olduğu gibi gösterilir
            const serverMessage = error?.status >= 400 && error?.status < 500 && error?.status !== 429 ? error.getAllMessages?.()[0] : null;
            setErrors({ form: error?.name === "ApiError" ? serverMessage || "network" : "photoType" });
            setBusy(false);
        }
    }

    const text = (code) => (code ? (f.errors[code] ?? code) : null);

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
                    <motion.button
                        type="button"
                        aria-label={f.close}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !busy && onClose()}
                        className="absolute inset-0 bg-orchid-dark/50 backdrop-blur-sm"
                    />
                    <motion.form
                        role="dialog"
                        aria-modal="true"
                        aria-label={f.title}
                        onSubmit={submit}
                        noValidate
                        initial={{ y: 70, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 70, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-[32px] bg-orchid-white shadow-[0_30px_80px_rgba(52,22,63,0.4)] sm:rounded-[32px]"
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-orchid-petal/30 px-6 py-5">
                            <h2 className="font-display text-2xl font-medium text-orchid-dark">{f.title}</h2>
                            <button type="button" onClick={onClose} disabled={busy} aria-label={f.close} className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                <Icon name="close" className="text-[20px]" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
                            <div className="flex flex-col gap-2.5">
                                <GroupLabel id="mr-area">{f.area}</GroupLabel>
                                <Segmented
                                    ariaLabelledBy="mr-area"
                                    value={form.area}
                                    onChange={set("area")}
                                    options={AREAS.map((a) => ({ id: a.id, label: copy.areas[a.id] }))}
                                />
                            </div>

                            <FloatingField
                                id="mr-title"
                                name="title"
                                label={f.titleLabel}
                                required
                                value={form.title}
                                onChange={set("title")}
                                error={text(errors.title)}
                                tick={tick}
                                inputProps={{ maxLength: 80 }}
                            />
                            <FloatingField
                                id="mr-description"
                                name="description"
                                label={f.descriptionLabel}
                                required
                                multiline
                                rows={4}
                                value={form.description}
                                onChange={set("description")}
                                error={text(errors.description)}
                                tick={tick}
                                inputProps={{ maxLength: 600 }}
                            />

                            <div className="flex flex-col gap-2.5">
                                <GroupLabel>{f.photosLabel}</GroupLabel>
                                <div className="flex flex-wrap gap-3">
                                    {form.photos.map((photo) => (
                                        <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-orchid-petal/40">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo.url} alt="" className="h-full w-full object-cover" />
                                            <button type="button" onClick={() => removePhoto(photo.id)} aria-label={f.removePhoto} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orchid-dark/70 text-white">
                                                <Icon name="close" className="text-[15px]" />
                                            </button>
                                        </motion.div>
                                    ))}
                                    {form.photos.length < MAX_PHOTOS && (
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-orchid-petal/60 text-orchid-pink transition-colors hover:bg-orchid-powder"
                                        >
                                            <Icon name="add_a_photo" className="text-[24px]" />
                                            <span className="text-[10px] font-bold">{f.addPhoto}</span>
                                        </button>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                                <p className="text-xs text-orchid-muted">{interpolate(f.photosHint, { max: MAX_PHOTOS })}</p>
                                <FieldError id="mr-photo-error" message={photoError} />
                            </div>

                            <FieldError id="mr-form-error" message={text(errors.form)} />
                        </div>

                        <div className="border-t border-orchid-petal/30 px-6 py-4">
                            <button type="submit" disabled={busy} className="aurora-btn flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold text-white disabled:cursor-wait disabled:opacity-90">
                                <Icon name={busy ? "progress_activity" : "send"} className={`text-[20px] ${busy ? "animate-spin" : ""}`} />
                                {busy ? f.submitting : f.submit}
                            </button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
