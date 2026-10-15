"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion";

const CATEGORY_ORDER = ["video", "room", "kitchen", "bathroom", "flat", "other"];
const CATEGORY_ICONS = { video: "videocam", room: "bed", kitchen: "kitchen", bathroom: "shower", flat: "meeting_room", other: "photo" };

/** Tam ekran büyük görsel: ok tuşları ve Esc ile gezilir */
function Lightbox({ items, index, onIndex, onClose }) {
    const { t, tpl, locale } = useLanguage();
    const item = items[index];
    const go = useCallback((delta) => onIndex((index + delta + items.length) % items.length), [index, items.length, onIndex]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [go, onClose]);

    return (
        <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] flex flex-col justify-between bg-orchid-dark/92 p-4 backdrop-blur-2xl md:p-8"
        >
            <div className="flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-orchid-petal">
                        <Icon name={CATEGORY_ICONS[item.category] ?? "photo"} className="text-[20px]" />
                    </span>
                    <span className="text-base font-semibold">{localized(item.label, locale)}</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t.roomDetail.media.close}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/25"
                >
                    <Icon name="close" className="text-[24px]" />
                </button>
            </div>

            <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center py-4" onClick={(e) => e.stopPropagation()}>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                        key={item.id}
                        src={mediaUrl(item.url)}
                        alt={localized(item.label, locale)}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
                    />
                </AnimatePresence>
                {items.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label={t.roomDetail.media.prev}
                            className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
                        >
                            <Icon name="chevron_left" className="text-[28px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label={t.roomDetail.media.next}
                            className="absolute right-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
                        >
                            <Icon name="chevron_right" className="text-[28px]" />
                        </button>
                    </>
                )}
            </div>

            <div className="text-center text-sm text-white/70">{tpl(t.roomDetail.media.counter, { index: index + 1, total: items.length })}</div>
        </motion.div>
    );
}

/**
 * Oda tipi medya alanı: video ve etiketli fotoğraflar aynı sahnede gösterilir.
 * Üstte büyük sahne, altında küçük resim şeridi, kategoriye göre filtre.
 * Video varsa ilk sırada gelir; yoksa ilk fotoğraf açılır.
 */
export default function MediaGallery({ items = [], roomName }) {
    const { t, tpl, locale } = useLanguage();
    const [category, setCategory] = useState("all");
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [lightbox, setLightbox] = useState(null); // lightbox içindeki fotoğraf sırası

    const categories = useMemo(() => {
        const present = new Set(items.map((item) => item.category));
        return CATEGORY_ORDER.filter((key) => present.has(key));
    }, [items]);

    const filtered = useMemo(() => (category === "all" ? items : items.filter((item) => item.category === category)), [items, category]);
    const photos = useMemo(() => items.filter((item) => item.type === "image"), [items]);
    const photoCount = photos.length;

    const safeIndex = Math.min(index, Math.max(filtered.length - 1, 0));
    const active = filtered[safeIndex];

    const select = (next) => {
        setPlaying(false);
        setIndex(next);
    };
    const step = (delta) => select((safeIndex + delta + filtered.length) % filtered.length);
    const changeCategory = (key) => {
        setCategory(key);
        select(0);
    };

    const openLightbox = () => {
        if (!active || active.type !== "image") return;
        setLightbox(photos.findIndex((p) => p.id === active.id));
    };

    if (items.length === 0) {
        return (
            <div className="glass-card flex aspect-[16/9] max-h-[560px] w-full items-center justify-center rounded-[32px] text-orchid-muted">
                {t.roomDetail.media.empty}
            </div>
        );
    }

    const isVideo = active?.type === "video";
    const videoSrc = isVideo && active.url ? mediaUrl(active.url) : null;
    const stageImage = isVideo ? active.poster : active?.url;

    return (
        <div className="flex flex-col gap-4">
            {/* Kategori filtreleri */}
            {categories.length > 1 && (
                <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1" role="tablist">
                    {["all", ...categories].map((key) => {
                        const on = category === key;
                        const count = key === "all" ? items.length : items.filter((i) => i.category === key).length;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => changeCategory(key)}
                                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                    on ? "text-white" : "glass-card text-orchid-muted hover:text-orchid-dark"
                                }`}
                            >
                                {on && (
                                    <motion.span layoutId="media-filter-pill" transition={SPRING_SOFT} className="aurora-btn absolute inset-0 rounded-full" />
                                )}
                                <span className="relative flex items-center gap-1.5">
                                    {key !== "all" && <Icon name={CATEGORY_ICONS[key]} className="text-[18px]" />}
                                    {key === "all" ? t.roomDetail.media.all : t.roomDetail.media.categories[key]}
                                    <span className={`text-xs ${on ? "text-white/80" : "text-orchid-muted/70"}`}>{count}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Sahne */}
            <div className="group relative aspect-[16/10] max-h-[620px] w-full overflow-hidden rounded-[32px] border border-orchid-petal/30 bg-orchid-powder shadow-[0_24px_60px_rgba(180,57,143,0.18)] sm:aspect-[16/9]">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={active.id}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE_OUT }}
                        drag={filtered.length > 1 && !playing ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -70) step(1);
                            else if (info.offset.x > 70) step(-1);
                        }}
                        className="absolute inset-0"
                    >
                        {playing && videoSrc ? (
                            <video src={videoSrc} poster={mediaUrl(active.poster)} controls autoPlay playsInline className="h-full w-full bg-black object-contain" />
                        ) : (
                            <>
                                <SafeImage
                                    src={mediaUrl(stageImage, "lg")}
                                    alt={localized(active.label, locale, roomName)}
                                    draggable={false}
                                    className="h-full w-full object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-orchid-dark/70 via-transparent to-orchid-dark/20" />
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Video: oynat düğmesi (video dosyası henüz yoksa bilgi) */}
                {isVideo && !playing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        {videoSrc ? (
                            <button
                                type="button"
                                onClick={() => setPlaying(true)}
                                aria-label={t.roomDetail.media.play}
                                data-cursor={t.roomDetail.media.play}
                                className="aurora-btn flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform hover:scale-110 active:scale-95 md:h-24 md:w-24"
                            >
                                <Icon name="play_arrow" filled className="ml-1 text-[44px]" />
                            </button>
                        ) : (
                            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-orchid-pink backdrop-blur">
                                {t.roomDetail.media.videoSoon}
                            </span>
                        )}
                    </div>
                )}

                {/* Üst etiket ve sayaç */}
                {!playing && (
                    <>
                        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6">
                            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orchid-pink shadow-md backdrop-blur-xl">
                                <Icon name={CATEGORY_ICONS[active.category] ?? "photo"} className="text-[16px]" />
                                {t.roomDetail.media.categories[active.category] ?? t.roomDetail.media.categories.other}
                            </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
                            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-orchid-dark shadow-lg backdrop-blur-xl">
                                {localized(active.label, locale)}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                                    {tpl(t.roomDetail.media.counter, { index: safeIndex + 1, total: filtered.length })}
                                </span>
                                {!isVideo && (
                                    <button
                                        type="button"
                                        onClick={openLightbox}
                                        aria-label={t.roomDetail.media.zoom}
                                        data-cursor={t.roomDetail.media.zoom}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-orchid-dark backdrop-blur-md transition-all hover:bg-orchid-pink hover:text-white"
                                    >
                                        <Icon name="zoom_in" className="text-[20px]" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Oklar */}
                {filtered.length > 1 && !playing && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={t.roomDetail.media.prev}
                            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-orchid-dark opacity-100 shadow-md backdrop-blur-md transition-all hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                        >
                            <Icon name="chevron_left" className="text-[26px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={t.roomDetail.media.next}
                            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-orchid-dark opacity-100 shadow-md backdrop-blur-md transition-all hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                        >
                            <Icon name="chevron_right" className="text-[26px]" />
                        </button>
                    </>
                )}
            </div>

            {/* Küçük resim şeridi */}
            {filtered.length > 1 && (
                <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
                    {filtered.map((item, i) => {
                        const on = i === safeIndex;
                        const thumb = item.type === "video" ? item.poster : item.url;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => select(i)}
                                aria-label={localized(item.label, locale)}
                                aria-current={on}
                                title={localized(item.label, locale)}
                                className={`relative h-[68px] w-24 shrink-0 overflow-hidden rounded-2xl transition-all duration-300 sm:h-20 sm:w-32 ${
                                    on ? "scale-100 ring-2 ring-orchid-pink ring-offset-2 ring-offset-orchid-white" : "opacity-70 hover:opacity-100"
                                }`}
                            >
                                <SafeImage src={mediaUrl(thumb, "thumb")} alt="" className="h-full w-full object-cover" />
                                {item.type === "video" && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-orchid-dark/35 text-white">
                                        <Icon name="play_circle" filled className="text-[30px]" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-orchid-muted">
                {photoCount > 0 && tpl(t.roomDetail.media.photoCount, { count: photoCount })}
            </p>

            <AnimatePresence>
                {lightbox !== null && photos[lightbox] && (
                    <Lightbox
                        key="lightbox"
                        items={photos}
                        index={lightbox}
                        onIndex={setLightbox}
                        onClose={() => setLightbox(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
