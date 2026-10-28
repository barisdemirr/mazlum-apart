"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import ModalPortal from "@/components/admin/ModalPortal";

/** Arıza fotoğrafı adresi: yönetici vekili üzerinden (oturum çerezi sunucuda eklenir), dosyalar adresle açık değildir. size: thumb | lg */
export const maintenancePhotoUrl = (requestId, photoId, size = "thumb") =>
    `/api/backend/admin/maintenance/${requestId}/photos/${photoId}?size=${size}`;

/**
 * Öğrencinin (ya da ofisin) yüklediği arıza fotoğrafları: küçük resimler, tıklayınca büyük görünüm (← → ve Esc ile gezilir).
 * photos: [{ id, width, height }]
 */
export default function MaintenancePhotos({ requestId, photos }) {
    const [index, setIndex] = useState(null);
    const count = photos?.length ?? 0;

    const close = useCallback(() => setIndex(null), []);
    const step = useCallback((delta) => setIndex((i) => (i === null ? i : (i + delta + count) % count)), [count]);

    useEffect(() => {
        if (index === null) return;
        const onKey = (e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [index, close, step]);

    if (!count) return null;

    return (
        <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-ad-body">Fotoğraflar <span className="font-normal text-ad-faint">({count})</span></p>
            <ul className="flex flex-wrap gap-2">
                {photos.map((photo, i) => (
                    <li key={photo.id}>
                        <button type="button" onClick={() => setIndex(i)} aria-label={`Fotoğraf ${i + 1} / ${count} — büyüt`} className="block h-24 w-24 overflow-hidden rounded-2xl border border-ad-line bg-ad-sunken transition-shadow hover:shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={maintenancePhotoUrl(requestId, photo.id, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </button>
                    </li>
                ))}
            </ul>

            {index !== null && (
                <ModalPortal>
                    <div role="dialog" aria-modal="true" aria-label="Arıza fotoğrafı" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4" onClick={close}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={maintenancePhotoUrl(requestId, photos[index].id, "lg")} alt="" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                        <button type="button" onClick={close} aria-label="Kapat" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                            <Icon name="close" className="text-[24px]" />
                        </button>
                        {count > 1 && (
                            <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Önceki" className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                                    <Icon name="chevron_left" className="text-[26px]" />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Sonraki" className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                                    <Icon name="chevron_right" className="text-[26px]" />
                                </button>
                                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">{index + 1} / {count}</span>
                            </>
                        )}
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
