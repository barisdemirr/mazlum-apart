"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
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

/** Bir slaytın ekranda kalma süresi (ms). İlerleme çubukları da bu süreyle dolar. */
const SLIDE_MS = 6000;

// Giriş animasyonu: her öğe sırayla yükselir (açılış perdesi ~1 sn sürdüğü için gecikme eklendi)
const rise = (i) => ({
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay: 0.7 + i * 0.12, ease: EASE_OUT },
});

/**
 * Başlık: kelimeler sırayla bulanıklıktan netleşerek yükselir; slayt değişince eskisi yukarı doğru silinir.
 * words: [{ text, accent }] — accent kelimeler italik ve pembe.
 */
function AnimatedTitle({ words, id, className, accentClass, reduce }) {
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.span
                key={id}
                className="block"
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -18, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
            >
                {words.map((word, i) => (
                    <motion.span
                        key={`${id}-${i}`}
                        className={`inline-block ${word.accent ? accentClass : ""}`}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
                    >
                        {word.text}
                        {i < words.length - 1 ? " " : ""}
                    </motion.span>
                ))}
            </motion.span>
        </AnimatePresence>
    );
}

/** Açıklama: slayt değişince yumuşakça yer değiştirir */
function AnimatedText({ text, className, reduce }) {
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.p
                key={text}
                className={className}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.45, delay: 0.15, ease: EASE_OUT }}
            >
                {text}
            </motion.p>
        </AnimatePresence>
    );
}

/** Hikâye (story) tarzı ilerleme çubukları: geçen slaytlar dolu, aktif olan süreyle dolar. Dokununca o slayta gider. */
function Progress({ count, index, onSelect, label, tone = "light" }) {
    if (count < 2) return null;
    const track = tone === "light" ? "bg-white/35" : "bg-orchid-petal/40";
    const fill = tone === "light" ? "bg-white" : "bg-orchid-pink";
    return (
        <div className="flex w-full gap-1.5">
            {Array.from({ length: count }, (_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-label={`${label} ${i + 1}`}
                    aria-current={i === index}
                    className="group flex-1 py-2"
                >
                    <span className={`block h-[3px] overflow-hidden rounded-full ${track}`}>
                        {i < index && <span className={`block h-full w-full ${fill}`} />}
                        {i === index && (
                            <motion.span
                                key={`fill-${index}`}
                                className={`block h-full origin-left ${fill}`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                            />
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}

export default function Hero({ media, slides = [] }) {
    const { t, locale } = useLanguage();
    const reduce = useReducedMotion();
    const [videoOpen, setVideoOpen] = useState(false);
    const closeVideo = useCallback(() => setVideoOpen(false), []);

    // Görsel, sayfa kaydıkça hafifçe yavaş akar (yalnızca masaüstü)
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
    const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const blobY = useTransform(scrollYProgress, [0, 1], [0, -120]);

    // Yönetim panelinden eklenen slaytlar sırayla geçer; yoksa tek kapak görseli kullanılır
    const items = slides.length > 0 ? slides : [{ id: "cover", image: media?.image, title: null, subtitle: null }];
    const count = items.length;
    const [index, setIndex] = useState(0);
    const current = items[index % count];

    const go = useCallback((next) => setIndex(((next % count) + count) % count), [count]);

    // Otomatik geçiş: elle geçişte sayaç baştan başlar (zamanlayıcı slayta bağlı)
    useEffect(() => {
        if (count < 2) return;
        const timer = setTimeout(() => go(index + 1), SLIDE_MS);
        return () => clearTimeout(timer);
    }, [index, count, go]);

    const slideTitle = localized(current.title, locale);
    const slideSubtitle = localized(current.subtitle, locale);
    const titleWords = slideTitle
        ? slideTitle.split(/\s+/).filter(Boolean).map((text) => ({ text, accent: false }))
        : [
              ...t.hero.titleStart.split(/\s+/).filter(Boolean).map((text) => ({ text, accent: false })),
              ...t.hero.titleAccent.split(/\s+/).filter(Boolean).map((text) => ({ text, accent: true })),
              ...(t.hero.titleEnd ?? "").split(/\s+/).filter(Boolean).map((text) => ({ text, accent: false })),
          ];
    const titleId = slideTitle || "default";
    const description = slideSubtitle || t.hero.description;

    // Masaüstü parallax'ı dokunmatik / küçük ekranda kapalı (kaydırırken GPU'yu yorar)
    const [lite, setLite] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px), (hover: none)");
        const update = () => setLite(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    const videoUrl = media?.videoUrl ? mediaUrl(media.videoUrl) : null;
    // Mobil ve masaüstü AYNI dosyayı ister: tarayıcı bir kez indirir
    const imageSrc = mediaUrl(current.image, "lg");
    const imageAlt = mediaAlt(current.image, locale);

    // Mobilde sağa/sola kaydırma ile slayt değişir (dikey kaydırma serbest)
    const onSwipe = (_, info) => {
        if (count < 2 || Math.abs(info.offset.x) < 50 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
        go(index + (info.offset.x < 0 ? 1 : -1));
    };

    return (
        <section ref={sectionRef} id="anasayfa" className="relative w-full">
            {/* ═════════════ MOBİL: tam ekran, görsel üzerinde içerik ═════════════ */}
            <motion.div onPanEnd={onSwipe} style={{ touchAction: "pan-y" }} className="relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden bg-orchid-dark lg:hidden">
                {/* Görsel: yumuşak geçiş + yavaş yakınlaşma (yalnızca opacity/transform → GPU dostu) */}
                <AnimatePresence initial={false}>
                    <motion.div
                        key={current.id}
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0.3 : 1, ease: "easeInOut" }}
                    >
                        <motion.div
                            className="h-full w-full"
                            initial={{ scale: reduce ? 1 : 1.12 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: reduce ? 0 : SLIDE_MS / 1000 + 1, ease: "easeOut" }}
                        >
                            <SafeImage src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" fetchPriority="high" />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>

                {/* Okunabilirlik: üstte hafif gölge (ilerleme çubukları), altta koyu geçiş (metin) */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orchid-dark/40 to-transparent" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-orchid-dark via-orchid-dark/75 to-transparent" />

                {/* İlerleme çubukları: navbar'ın hemen altında */}
                {count > 1 && (
                    <div className="absolute inset-x-5 top-[88px] z-10">
                        <Progress count={count} index={index} onSelect={go} label={t.hero.slide ?? "Slayt"} />
                    </div>
                )}

                {/* İçerik */}
                <div className="relative z-10 flex flex-col gap-4 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-40 text-white">
                    <motion.div {...rise(0)} className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-petal opacity-75 animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-orchid-petal" />
                            </span>
                            {t.hero.tag}
                        </span>
                    </motion.div>

                    <motion.h1 {...rise(1)} className="font-display text-[2.55rem] font-normal leading-[1.05] tracking-tight sm:text-6xl">
                        <AnimatedTitle words={titleWords} id={titleId} reduce={reduce} accentClass="font-light italic text-orchid-petal" />
                    </motion.h1>

                    <motion.div {...rise(2)}>
                        <AnimatedText text={description} reduce={reduce} className="text-[15px] leading-relaxed text-white/85 sm:text-lg" />
                    </motion.div>

                    {videoUrl && (
                        <motion.button
                            {...rise(3)}
                            type="button"
                            onClick={() => setVideoOpen(true)}
                            className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/25 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white active:scale-[0.97]"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-orchid-pink">
                                <Icon name="play_arrow" filled className="ml-0.5 text-[20px]" />
                            </span>
                            {t.hero.playTour}
                        </motion.button>
                    )}

                    <motion.div {...rise(4)} className="grid grid-cols-2 gap-3 pt-1">
                        <a
                            href="#odalar"
                            className="aurora-btn flex items-center justify-center gap-1.5 rounded-2xl px-4 py-4 text-sm font-bold text-white shadow-xl shadow-orchid-pink/30 active:scale-[0.97]"
                        >
                            {t.hero.explore}
                            <Icon name="arrow_downward" className="text-[18px]" />
                        </a>
                        <LocalizedLink
                            href={APPLY_HREF}
                            className="flex items-center justify-center rounded-2xl bg-white px-4 py-4 text-sm font-bold text-orchid-dark shadow-xl active:scale-[0.97]"
                        >
                            {t.hero.apply}
                        </LocalizedLink>
                    </motion.div>

                    <motion.ul {...rise(5)} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[12px] font-medium text-white/80">
                        <li className="flex items-center gap-1.5">
                            <Icon name="female" filled className="text-[15px] text-orchid-petal" />
                            {t.common.girlsOnly}
                        </li>
                        <li className="flex items-center gap-1.5">
                            <Icon name="bolt" filled className="text-[15px] text-orchid-petal" />
                            {t.common.billsIncluded}
                        </li>
                        <li className="flex items-center gap-1.5">
                            <Icon name="calendar_month" className="text-[15px] text-orchid-petal" />
                            {t.hero.termMonths}
                        </li>
                    </motion.ul>
                </div>
            </motion.div>

            {/* ═════════════ MASAÜSTÜ: solda metin, sağda organik çerçevede slayt ═════════════ */}
            <div className="relative hidden min-h-screen w-full items-center justify-center overflow-hidden px-12 pb-20 pt-32 lg:flex">
                {/* Aurora lekeleri */}
                <motion.div style={lite ? undefined : { y: blobY, willChange: "transform" }} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -left-32 -top-32 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-orchid-powder via-orchid-petal/30 to-transparent soft-blob animate-blob" />
                    <div className="absolute -right-28 top-1/4 h-[580px] w-[580px] rounded-full bg-gradient-to-bl from-orchid-lilac via-orchid-violet/25 to-transparent soft-blob animate-blob [animation-delay:4s]" />
                    <div className="absolute -bottom-20 left-1/3 h-[520px] w-[520px] rounded-full bg-gradient-to-t from-orchid-powder/60 via-orchid-pink/20 to-transparent soft-blob animate-blob [animation-delay:8s]" />
                </motion.div>

                <div className="z-10 mx-auto grid w-full max-w-[1340px] grid-cols-12 items-center gap-8">
                    {/* Sol: başlık ve butonlar */}
                    <div className="col-span-7 flex flex-col items-start gap-8">
                        <motion.div {...rise(0)} className="glass-card inline-flex items-center gap-2.5 rounded-full border border-orchid-petal/50 px-4 py-2 shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-pink opacity-75 animate-ping" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orchid-pink" />
                            </span>
                            <span className="text-sm font-bold uppercase tracking-wider text-orchid-pink">{t.hero.tag}</span>
                            <span className="text-orchid-muted">✦</span>
                            <span className="text-xs font-medium text-orchid-dark">{t.hero.place}</span>
                        </motion.div>

                        <motion.h1 {...rise(1)} className="min-h-[2.2em] font-display text-6xl font-normal leading-[1.06] tracking-tight text-orchid-dark xl:text-7xl">
                            <AnimatedTitle words={titleWords} id={titleId} reduce={reduce} accentClass="font-light italic text-orchid-pink" />
                        </motion.h1>

                        <motion.div {...rise(2)} className="min-h-[3.5em] max-w-xl">
                            <AnimatedText text={description} reduce={reduce} className="text-lg leading-relaxed text-orchid-muted xl:text-xl" />
                        </motion.div>

                        <motion.div {...rise(3)} className="flex flex-wrap items-center gap-4 pt-2">
                            <Magnetic>
                                <a
                                    href="#odalar"
                                    data-cursor={t.hero.explore}
                                    className="aurora-btn inline-flex items-center gap-3 rounded-full px-9 py-4 text-base font-bold text-white shadow-xl transition-transform hover:scale-[1.04] active:scale-[0.98]"
                                >
                                    <span>{t.hero.explore}</span>
                                    <Icon name="arrow_downward" className="text-[20px]" />
                                </a>
                            </Magnetic>
                            <Magnetic>
                                <LocalizedLink
                                    href={APPLY_HREF}
                                    data-cursor={t.hero.apply}
                                    className="inline-flex items-center justify-center rounded-full border-2 border-orchid-petal/40 bg-white/80 px-9 py-4 text-base font-bold text-orchid-dark shadow-md transition-all hover:scale-[1.03] hover:border-orchid-pink hover:bg-white active:scale-[0.98]"
                                >
                                    {t.hero.apply}
                                </LocalizedLink>
                            </Magnetic>
                        </motion.div>

                        <motion.div {...rise(4)} className="flex items-center gap-3 rounded-full border border-orchid-petal/30 bg-orchid-powder/50 px-4 py-2 text-sm font-semibold text-orchid-muted">
                            <Icon name="calendar_month" className="text-[18px] text-orchid-pink" />
                            <span>
                                {t.hero.termLabel}:{" "}
                                <strong className="font-bold text-orchid-dark">
                                    {t.common.term} ({t.hero.termMonths})
                                </strong>
                            </span>
                        </motion.div>
                    </div>

                    {/* Sağ: organik çerçevede slayt — yeni görsel perde gibi açılarak gelir */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.1, delay: 0.8, ease: EASE_OUT }}
                        className="relative col-span-5 flex items-center justify-center"
                    >
                        <div
                            aria-hidden="true"
                            className="absolute -inset-14 rounded-full bg-gradient-to-tr from-orchid-petal via-orchid-violet to-orchid-pink opacity-60 animate-pulse-glow will-change-transform"
                            style={{
                                WebkitMaskImage: "radial-gradient(closest-side, transparent 58%, rgb(0 0 0 / 0.9) 80%, transparent 100%)",
                                maskImage: "radial-gradient(closest-side, transparent 58%, rgb(0 0 0 / 0.9) 80%, transparent 100%)",
                            }}
                        />

                        <motion.div style={lite ? undefined : { y: imageY }} className="relative">
                            <div className="group relative isolate z-0 h-[520px] w-[460px] overflow-hidden border-4 border-white/70 bg-orchid-powder shadow-[0_30px_70px_rgba(180,57,143,0.3)] animate-morph">
                                <AnimatePresence initial={false}>
                                    <motion.div
                                        key={current.id}
                                        className="absolute inset-0"
                                        initial={reduce ? { opacity: 0, zIndex: 2 } : { clipPath: "inset(0% 0% 0% 100%)", zIndex: 2 }}
                                        animate={reduce ? { opacity: 1, zIndex: 2 } : { clipPath: "inset(0% 0% 0% 0%)", zIndex: 2 }}
                                        exit={reduce ? { opacity: 0, zIndex: 1 } : { opacity: 0, zIndex: 1, transition: { duration: 0.6, delay: 0.6 } }}
                                        transition={{ duration: 1.1, ease: [0.77, 0, 0.18, 1] }}
                                    >
                                        <motion.div
                                            className="h-full w-full"
                                            initial={{ scale: reduce ? 1 : 1.18 }}
                                            animate={{ scale: 1.04 }}
                                            transition={{ duration: reduce ? 0 : SLIDE_MS / 1000 + 1.2, ease: EASE_OUT }}
                                        >
                                            <SafeImage src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" fetchPriority="high" />
                                        </motion.div>
                                    </motion.div>
                                </AnimatePresence>
                                <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-orchid-dark/60 via-orchid-dark/10 to-transparent" />

                                {/* Slayt göstergesi + elle geçiş */}
                                {count > 1 && (
                                    <div className="absolute inset-x-0 bottom-0 z-[5] flex items-center gap-3 px-8 pb-6">
                                        <button
                                            type="button"
                                            onClick={() => go(index - 1)}
                                            aria-label={t.hero.prev ?? "Önceki"}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white hover:text-orchid-pink"
                                        >
                                            <Icon name="west" className="text-[18px]" />
                                        </button>
                                        <Progress count={count} index={index} onSelect={go} label={t.hero.slide ?? "Slayt"} />
                                        <button
                                            type="button"
                                            onClick={() => go(index + 1)}
                                            aria-label={t.hero.next ?? "Sonraki"}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white hover:text-orchid-pink"
                                        >
                                            <Icon name="east" className="text-[18px]" />
                                        </button>
                                    </div>
                                )}

                                {/* Oda turu videosu yüklendiyse oynat düğmesi görünür */}
                                {videoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setVideoOpen(true)}
                                        data-cursor={t.hero.playTour}
                                        aria-label={t.hero.playTour}
                                        className="absolute inset-x-0 bottom-20 top-0 z-[4] flex flex-col items-center justify-center gap-3"
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
                            <div className="glass-card absolute -left-8 -top-4 z-30 flex items-center gap-2.5 rounded-full border border-white/80 px-4 py-2.5 shadow-lg animate-float-slow">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orchid-pink/20 text-orchid-pink">
                                    <Icon name="female" filled className="text-[16px]" />
                                </span>
                                <span className="text-xs font-bold text-orchid-dark">{t.common.girlsOnly}</span>
                            </div>

                            <div className="glass-card absolute -bottom-6 -right-6 z-30 flex items-center gap-2.5 rounded-full border border-white/80 px-4 py-2.5 shadow-lg animate-float-delay">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orchid-violet/20 text-orchid-violet">
                                    <Icon name="bolt" filled className="text-[16px]" />
                                </span>
                                <span className="text-xs font-bold text-orchid-dark">{t.common.billsIncluded}</span>
                            </div>

                            <div className="glass-card absolute -right-8 top-1/2 z-30 hidden items-center gap-2 rounded-full border border-white/80 px-3.5 py-2 shadow-md animate-float-slow xl:flex">
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
            </div>

            <VideoModal open={videoOpen} src={videoUrl} onClose={closeVideo} closeLabel={t.hero.closeVideo} />
        </section>
    );
}
