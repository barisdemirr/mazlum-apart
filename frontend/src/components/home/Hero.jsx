"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Magnetic from "@/components/ui/Magnetic";
import SafeImage from "@/components/ui/SafeImage";
import VideoModal from "@/components/ui/VideoModal";
import { APPLY_HREF } from "@/components/layout/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { mediaAlt, mediaUrl } from "@/lib/media";
import { localized } from "@/lib/i18n/localized";
import { EASE_OUT } from "@/lib/motion";

// Giriş animasyonu: her öğe sırayla yükselir (açılış perdesi ~1 sn sürdüğü için gecikme eklendi)
const rise = (i) => ({
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay: 0.7 + i * 0.12, ease: EASE_OUT },
});

export default function Hero({ media, slides = [] }) {
    const { t, locale } = useLanguage();
    const [videoOpen, setVideoOpen] = useState(false);
    const closeVideo = useCallback(() => setVideoOpen(false), []);

    // Görsel, sayfa kaydıkça hafifçe yavaş akar (parallax)
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
    const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const blobY = useTransform(scrollYProgress, [0, 1], [0, -120]);

    // Yönetim panelinden eklenen slaytlar 5 sn'de bir geçer; yoksa tek kapak görseli kullanılır
    const items = slides.length > 0 ? slides : [{ id: "cover", image: media?.image, title: null, subtitle: null }];
    const [index, setIndex] = useState(0);
    const current = items[index % items.length];
    useEffect(() => {
        if (items.length < 2) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
        return () => clearInterval(timer);
    }, [items.length]);
    const slideTitle = localized(current.title, locale);
    const slideSubtitle = localized(current.subtitle, locale);

    const videoUrl = media?.videoUrl ? mediaUrl(media.videoUrl) : null;

    return (
        <section
            ref={sectionRef}
            id="anasayfa"
            className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 pb-20 pt-32 sm:px-8 lg:px-12"
        >
            {/* Aurora lekeleri */}
            <motion.div style={{ y: blobY, willChange: "transform" }} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -left-32 -top-32 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-orchid-powder via-orchid-petal/30 to-transparent soft-blob animate-blob" />
                <div className="absolute -right-28 top-1/4 h-[580px] w-[580px] rounded-full bg-gradient-to-bl from-orchid-lilac via-orchid-violet/25 to-transparent soft-blob animate-blob [animation-delay:4s]" />
                <div className="absolute -bottom-20 left-1/3 h-[520px] w-[520px] rounded-full bg-gradient-to-t from-orchid-powder/60 via-orchid-pink/20 to-transparent soft-blob animate-blob [animation-delay:8s]" />
            </motion.div>

            <div className="z-10 mx-auto grid w-full max-w-[1340px] grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-8">
                {/* Sol: başlık ve butonlar */}
                <div className="flex flex-col items-start gap-6 sm:gap-8 lg:col-span-7">
                    <motion.div
                        {...rise(0)}
                        className="glass-card inline-flex items-center gap-2.5 rounded-full border border-orchid-petal/50 px-4 py-2 shadow-sm"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-pink opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orchid-pink" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-orchid-pink sm:text-sm">{t.hero.tag}</span>
                        <span className="text-orchid-muted">✦</span>
                        <span className="text-xs font-medium text-orchid-dark">{t.hero.place}</span>
                    </motion.div>

                    <motion.h1
                        {...rise(1)}
                        className="font-display text-5xl font-normal leading-[1.06] tracking-tight text-orchid-dark sm:text-6xl xl:text-7xl"
                    >
                        {slideTitle ? (
                            slideTitle
                        ) : (
                            <>
                                {t.hero.titleStart} <span className="italic font-light text-orchid-pink">{t.hero.titleAccent}</span>{" "}
                                {t.hero.titleEnd}
                            </>
                        )}
                    </motion.h1>

                    <motion.p {...rise(2)} className="max-w-xl text-base leading-relaxed text-orchid-muted sm:text-lg lg:text-xl">
                        {slideSubtitle || t.hero.description}
                    </motion.p>

                    <motion.div {...rise(3)} className="flex flex-wrap items-center gap-4 pt-2">
                        <Magnetic>
                            <a
                                href="#odalar"
                                data-cursor={t.hero.explore}
                                className="aurora-btn inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-bold text-white shadow-xl transition-transform hover:scale-[1.04] active:scale-[0.98] sm:px-9"
                            >
                                <span>{t.hero.explore}</span>
                                <Icon name="arrow_downward" className="text-[20px]" />
                            </a>
                        </Magnetic>
                        <Magnetic>
                            <LocalizedLink
                                href={APPLY_HREF}
                                data-cursor={t.hero.apply}
                                className="inline-flex items-center justify-center rounded-full border-2 border-orchid-petal/40 bg-white/80 px-8 py-4 text-base font-bold text-orchid-dark shadow-md transition-all hover:scale-[1.03] hover:border-orchid-pink hover:bg-white active:scale-[0.98] sm:px-9"
                            >
                                {t.hero.apply}
                            </LocalizedLink>
                        </Magnetic>
                    </motion.div>

                    <motion.div
                        {...rise(4)}
                        className="flex items-center gap-3 rounded-full border border-orchid-petal/30 bg-orchid-powder/50 px-4 py-2 text-xs font-semibold text-orchid-muted sm:text-sm"
                    >
                        <Icon name="calendar_month" className="text-[18px] text-orchid-pink" />
                        <span>
                            {t.hero.termLabel}:{" "}
                            <strong className="font-bold text-orchid-dark">
                                {t.common.term} ({t.hero.termMonths})
                            </strong>
                        </span>
                    </motion.div>
                </div>

                {/* Sağ: organik blob içinde görsel ve yüzen rozetler */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.1, delay: 0.8, ease: EASE_OUT }}
                    className="relative flex items-center justify-center lg:col-span-5"
                >
                    <div aria-hidden="true" className="absolute -inset-14 rounded-full bg-gradient-to-tr from-orchid-petal via-orchid-violet to-orchid-pink opacity-60 animate-pulse-glow will-change-transform" style={{ WebkitMaskImage: "radial-gradient(closest-side, transparent 58%, rgb(0 0 0 / 0.9) 80%, transparent 100%)", maskImage: "radial-gradient(closest-side, transparent 58%, rgb(0 0 0 / 0.9) 80%, transparent 100%)" }} />

                    <motion.div style={{ y: imageY }} className="relative">
                        <div className="group relative h-[380px] w-[320px] overflow-hidden border-4 border-white/70 shadow-[0_30px_70px_rgba(180,57,143,0.3)] animate-morph sm:h-[480px] sm:w-[420px] lg:h-[520px] lg:w-[460px]">
                            <AnimatePresence initial={false}>
                                <motion.div
                                    key={current.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.9 }}
                                    className="absolute inset-0"
                                >
                                    <SafeImage
                                        src={mediaUrl(current.image, "lg")}
                                        alt={mediaAlt(current.image, locale)}
                                        className="h-full w-full object-cover animate-kenburns"
                                        fetchPriority="high"
                                    />
                                </motion.div>
                            </AnimatePresence>
                            <div className="absolute inset-0 bg-gradient-to-t from-orchid-dark/60 via-orchid-dark/10 to-transparent" />
                            {items.length > 1 && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-6 text-white">
                                    {items.length > 1 && (
                                        <div className="flex gap-1.5">
                                            {items.map((it, i) => (
                                                <span key={it.id} className={`h-1.5 rounded-full transition-all ${i === index % items.length ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Oda turu videosu yüklendiyse oynat düğmesi görünür */}
                            {videoUrl && (
                                <button
                                    type="button"
                                    onClick={() => setVideoOpen(true)}
                                    data-cursor={t.hero.playTour}
                                    aria-label={t.hero.playTour}
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                                >
                                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-orchid-pink shadow-[0_0_35px_rgba(255,255,255,0.9)] transition-all group-hover:scale-110 group-hover:bg-orchid-pink group-hover:text-white">
                                        <Icon name="play_arrow" filled className="ml-1 text-[38px]" />
                                    </span>
                                    <span className="rounded-full border border-white/30 bg-orchid-dark/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                                        {t.hero.playTour}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Yüzen cam rozetler */}
                        <div className="glass-card absolute -left-6 -top-4 flex items-center gap-2.5 rounded-full border border-white/80 px-4 py-2.5 shadow-lg animate-float-slow sm:-left-8">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orchid-pink/20 text-orchid-pink">
                                <Icon name="female" filled className="text-[16px]" />
                            </span>
                            <span className="text-xs font-bold text-orchid-dark">{t.common.girlsOnly}</span>
                        </div>

                        <div className="glass-card absolute -bottom-6 -right-4 flex items-center gap-2.5 rounded-full border border-white/80 px-4 py-2.5 shadow-lg animate-float-delay sm:-right-6">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orchid-violet/20 text-orchid-violet">
                                <Icon name="bolt" filled className="text-[16px]" />
                            </span>
                            <span className="text-xs font-bold text-orchid-dark">{t.common.billsIncluded}</span>
                        </div>

                        <div className="glass-card absolute -right-8 top-1/2 hidden items-center gap-2 rounded-full border border-white/80 px-3.5 py-2 shadow-md animate-float-slow xl:flex">
                            <Icon name="calendar_month" className="text-[16px] text-orchid-pink" />
                            <span className="text-[11px] font-bold text-orchid-dark">{t.common.term}</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Kaydır göstergesi */}
            <a
                href="#faturalar-strip"
                className="group absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-orchid-muted transition-colors hover:text-orchid-pink"
            >
                <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{t.hero.scroll}</span>
                <span className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-orchid-petal/60 p-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-orchid-pink animate-bounce" />
                </span>
            </a>

            <VideoModal open={videoOpen} src={videoUrl} onClose={closeVideo} closeLabel={t.hero.closeVideo} />
        </section>
    );
}
