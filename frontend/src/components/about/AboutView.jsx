"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Magnetic from "@/components/ui/Magnetic";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { useSite } from "@/lib/site/SiteProvider";
import { mediaAlt, mediaUrl } from "@/lib/media";
import { toParagraphs } from "@/lib/paragraphs";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

/** Başlık kelimeleri maskenin altından yükselir */
function Word({ children, delay, className = "" }) {
    return (
        <span className="inline-block overflow-hidden pb-2 align-bottom">
            <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay, ease: EASE_OUT }} className={`inline-block ${className}`}>
                {children}
            </motion.span>
        </span>
    );
}

function Words({ text, delay = 0, step = 0.08, className = "" }) {
    return String(text)
        .split(" ")
        .map((word, i) => (
            <Word key={`${word}-${i}`} delay={delay + i * step} className={className}>
                {word}&nbsp;
            </Word>
        ));
}

/**
 * Hikâye paragrafı: ekranın ortasına yaklaştıkça soluk renkten koyuya "yanar" ve hafifçe yükselir.
 * İlk paragraf giriş paragrafıdır, büyük serif yazıyla dizilir. Satır sonları korunur (whitespace-pre-line).
 */
function StoryParagraph({ text, lead, reduce }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "start 0.45"] });
    const opacity = useTransform(scrollYProgress, [0, 1], [0.18, 1]);
    const y = useTransform(scrollYProgress, [0, 1], [28, 0]);

    return (
        <motion.p
            ref={ref}
            style={reduce ? undefined : { opacity, y }}
            className={
                lead
                    ? "whitespace-pre-line font-display text-[1.6rem] font-normal leading-[1.4] tracking-tight text-orchid-dark sm:text-[2rem] lg:text-[2.25rem]"
                    : "whitespace-pre-line text-base leading-[1.85] text-orchid-dark/85 sm:text-lg"
            }
        >
            {text}
        </motion.p>
    );
}

/** Hero fotoğraf kolajı: üç kart farklı hızda kayar (paralaks), çerçeve organik biçimde nefes alır */
function Collage({ images, locale }) {
    const ref = useRef(null);
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -90]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, 60]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, -40]);
    const [a, b, c] = images;

    return (
        <div ref={ref} className="relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[520px]">
            <div aria-hidden="true" className="absolute inset-8 rounded-full bg-gradient-to-tr from-orchid-petal/60 via-orchid-violet/30 to-orchid-pink/40 soft-blob animate-blob" />

            {a && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
                    animate={{ opacity: 1, scale: 1, rotate: -4 }}
                    transition={{ duration: 1.1, delay: 0.5, ease: EASE_OUT }}
                    style={reduce ? undefined : { y: y1 }}
                    className="absolute left-[6%] top-[4%] h-[62%] w-[58%] overflow-hidden border-4 border-white/80 shadow-[0_30px_70px_rgba(180,57,143,0.3)] animate-morph"
                >
                    <SafeImage src={mediaUrl(a, "md")} alt={mediaAlt(a, locale, "")} className="h-full w-full object-cover animate-kenburns" fetchPriority="high" />
                </motion.div>
            )}
            {b && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, rotate: 8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 5 }}
                    transition={{ duration: 1.1, delay: 0.7, ease: EASE_OUT }}
                    style={reduce ? undefined : { y: y2 }}
                    className="absolute bottom-[4%] right-[4%] h-[52%] w-[50%] overflow-hidden rounded-[36px] border-4 border-white/80 shadow-[0_30px_70px_rgba(123,70,199,0.28)]"
                >
                    <SafeImage src={mediaUrl(b, "md")} alt={mediaAlt(b, locale, "")} className="h-full w-full object-cover" />
                </motion.div>
            )}
            {c && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.9, ease: EASE_OUT }}
                    style={reduce ? undefined : { y: y3 }}
                    className="absolute bottom-[18%] left-[2%] hidden h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl sm:block"
                >
                    <SafeImage src={mediaUrl(c, "thumb")} alt="" className="h-full w-full object-cover" />
                </motion.div>
            )}
        </div>
    );
}

/**
 * Hakkımızda sayfası.
 *  - Metin yönetim panelinden gelir (düz yazı): boş satır yeni paragraf, Enter alt satır.
 *  - Görseller oda tiplerinin kapak fotoğraflarıdır; hiç yoksa kolaj ve şerit çizilmez.
 *  - Vaat kartları sitede zaten yazan gerçek bilgilerdir (uydurma sayı / yıl yok).
 */
export default function AboutView({ page, images = [] }) {
    const { t, locale } = useLanguage();
    const site = useSite();
    const a = t.aboutPage;
    const reduce = useReducedMotion();
    const paragraphs = toParagraphs(localized(page?.body, locale));
    const photos = images.filter(Boolean);
    const whatsapp = site.waHref(t.whatsapp.defaultMessage);

    // Hikâye bölümü ilerleme çizgisi
    const storyRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: storyRef, offset: ["start 0.7", "end 0.6"] });
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
    const photoIndex = useTransform(scrollYProgress, (v) => Math.min(photos.length - 1, Math.floor(v * photos.length)));

    const promises = [
        { icon: "female", title: a.promises.girls.title, text: a.promises.girls.text, tone: "from-orchid-pink/15 to-orchid-petal/10 text-orchid-pink" },
        { icon: "bolt", title: a.promises.bills.title, text: a.promises.bills.text, tone: "from-orchid-violet/15 to-orchid-lilac/30 text-orchid-violet" },
        { icon: "calendar_month", title: a.promises.term.title, text: a.promises.term.text, tone: "from-orchid-petal/20 to-orchid-powder/40 text-orchid-pink" },
        { icon: "smartphone", title: a.promises.portal.title, text: a.promises.portal.text, tone: "from-orchid-violet/15 to-orchid-powder/30 text-orchid-violet" },
    ];

    return (
        <main className="relative overflow-x-clip">
            {/* ───────── Hero ───────── */}
            <section className="relative px-4 pb-16 pt-32 sm:px-8 sm:pt-40 lg:px-12 lg:pb-24">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -top-40 left-[-10%] h-[560px] w-[560px] rounded-full bg-orchid-lilac/70 soft-blob animate-blob" />
                    <div className="absolute right-[-12%] top-24 h-[520px] w-[520px] rounded-full bg-orchid-powder/80 soft-blob animate-blob [animation-delay:6s]" />
                    <div className="absolute left-[44%] top-40 hidden h-20 w-20 rounded-full border border-orchid-petal/40 bg-white/20 backdrop-blur-md animate-float-slow lg:block" />
                </div>

                <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-12">
                    <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
                        <motion.span
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}
                            className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-orchid-pink animate-float-slow"
                        >
                            <Icon name="favorite" filled className="text-[16px]" />
                            {a.tag}
                        </motion.span>

                        <h1 className="font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-orchid-dark sm:text-6xl lg:text-7xl">
                            <span className="block"><Words text={a.titleStart} delay={0.45} /></span>
                            <span className="block"><Words text={a.titleAccent} delay={0.7} className="font-normal italic text-orchid-pink" /></span>
                        </h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1.05, ease: EASE_OUT }}
                            className="mt-6 max-w-[34rem] text-base leading-relaxed text-orchid-muted sm:text-lg"
                        >
                            {a.subtitle}
                        </motion.p>

                        <motion.a
                            href="#hikayemiz"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.3 }}
                            className="group mt-10 inline-flex items-center gap-3 text-sm font-bold text-orchid-dark"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-orchid-petal/60 bg-white/70 text-orchid-pink transition-all duration-500 group-hover:bg-orchid-pink group-hover:text-white">
                                <Icon name="south" className="text-[20px] transition-transform duration-500 group-hover:translate-y-0.5" />
                            </span>
                            {a.readStory}
                        </motion.a>
                    </div>

                    <div className="lg:col-span-6">
                        {photos.length > 0 ? (
                            <Collage images={photos} locale={locale} />
                        ) : (
                            <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[420px]">
                                <div className="absolute inset-0 bg-gradient-to-tr from-orchid-petal via-orchid-violet to-orchid-pink opacity-70 animate-morph" />
                                <div className="absolute inset-10 flex items-center justify-center bg-orchid-white/80 animate-morph [animation-delay:3s]">
                                    <Icon name="cottage" className="text-[96px] text-orchid-pink" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ───────── Hikâye: panelden gelen metin ───────── */}
            <section id="hikayemiz" ref={storyRef} className="relative scroll-mt-24 px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
                <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-12 lg:gap-16">
                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-32">
                            <Reveal>
                                <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{a.storyTitle}</h2>
                                <p className="mt-3 max-w-xs text-sm leading-relaxed text-orchid-muted">{a.storyHint}</p>
                            </Reveal>

                            {/* Okudukça dolan ilerleme çizgisi */}
                            <div aria-hidden="true" className="mt-8 hidden h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-orchid-powder lg:block">
                                <motion.div style={{ scaleX: reduce ? 1 : progress }} className="h-full origin-left rounded-full bg-gradient-to-r from-orchid-petal via-orchid-pink to-orchid-violet" />
                            </div>

                            {/* Okunan paragrafa göre değişen fotoğraf */}
                            {photos.length > 0 && (
                                <div className="relative mt-8 hidden aspect-[4/5] w-full max-w-xs overflow-hidden rounded-[32px] border-4 border-white shadow-[0_24px_60px_rgba(180,57,143,0.22)] lg:block">
                                    {photos.map((photo, i) => (
                                        <StoryPhoto key={i} index={i} active={photoIndex} photo={photo} locale={locale} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>

                    <div className="flex flex-col gap-8 lg:col-span-8 lg:max-w-[42rem]">
                        {paragraphs.length > 0 ? (
                            paragraphs.map((text, i) => <StoryParagraph key={i} text={text} lead={i === 0} reduce={reduce} />)
                        ) : (
                            <p className="rounded-3xl bg-orchid-powder/60 p-6 text-orchid-muted">{a.empty}</p>
                        )}
                    </div>
                </div>
            </section>

            {/* ───────── Vaatler ───────── */}
            <section className="relative px-4 py-20 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-[1240px]">
                    <Reveal className="mb-12 max-w-2xl">
                        <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{a.promisesTitle}</h2>
                        <p className="mt-3 text-orchid-muted">{a.promisesSubtitle}</p>
                    </Reveal>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {promises.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 50, rotate: i % 2 ? 2 : -2 }}
                                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                                viewport={VIEWPORT_ONCE}
                                transition={{ duration: 0.8, delay: i * 0.1, ease: EASE_OUT }}
                                whileHover={{ y: -8 }}
                                className="h-full"
                            >
                                <SpotlightCard className="h-full rounded-[32px] p-7">
                                    <div className="flex flex-col gap-5">
                                        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                                            <Icon name={item.icon} filled className="text-[28px]" />
                                        </span>
                                        <div>
                                            <h3 className="font-display text-xl font-medium text-orchid-dark">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-orchid-muted">{item.text}</p>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────── Fotoğraf şeridi (sonsuz kayar, üzerine gelince durur) ───────── */}
            {photos.length >= 3 && (
                <section aria-label={a.galleryLabel} className="group relative py-10">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-orchid-white to-transparent sm:w-40" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-orchid-white to-transparent sm:w-40" />
                    <div className="flex w-max animate-marquee-left gap-5 group-hover:[animation-play-state:paused]">
                        {[...photos, ...photos].map((photo, i) => (
                            <div key={i} className={`h-56 w-72 shrink-0 overflow-hidden border-4 border-white shadow-lg sm:h-72 sm:w-96 ${i % 2 ? "rounded-[40px] translate-y-6" : "rounded-[28px]"}`}>
                                <SafeImage src={mediaUrl(photo, "md")} alt={i < photos.length ? mediaAlt(photo, locale, "") : ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ───────── Davet ───────── */}
            <section className="px-4 pb-24 pt-14 sm:px-8 lg:px-12">
                <Reveal className="mx-auto max-w-[1240px]">
                    <div className="relative overflow-hidden rounded-[44px] bg-orchid-dark px-6 py-16 text-center text-white sm:px-12 sm:py-20">
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-orchid-pink/50 soft-blob animate-blob" />
                            <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-orchid-violet/50 soft-blob animate-blob [animation-delay:7s]" />
                            <div className="absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full border border-white/15 animate-spin-slow" />
                        </div>
                        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
                            <h2 className="font-display text-4xl font-normal leading-tight tracking-tight sm:text-5xl">{a.ctaTitle}</h2>
                            <p className="max-w-lg text-white/75">{a.ctaText}</p>
                            <div className="mt-2 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
                                <Magnetic className="w-full sm:w-auto">
                                    <LocalizedLink href="/odalar" className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white sm:w-auto">
                                        <Icon name="bed" className="text-[20px]" />
                                        {a.ctaRooms}
                                    </LocalizedLink>
                                </Magnetic>
                                <Magnetic className="w-full sm:w-auto">
                                    <LocalizedLink href="/basvuru" className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-white hover:text-orchid-dark sm:w-auto">
                                        <Icon name="edit_note" className="text-[20px]" />
                                        {a.ctaApply}
                                    </LocalizedLink>
                                </Magnetic>
                            </div>
                            {whatsapp && (
                                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
                                    <Icon name="chat" filled className="text-[18px]" />
                                    {a.ctaWhatsapp}
                                </a>
                            )}
                        </div>
                    </div>
                </Reveal>
            </section>
        </main>
    );
}

/** Hikâye fotoğrafı: aktif olan yumuşakça belirir, diğerleri söner */
function StoryPhoto({ index, active, photo, locale }) {
    const opacity = useTransform(active, (v) => (v === index ? 1 : 0));
    const scale = useTransform(active, (v) => (v === index ? 1 : 1.08));
    return (
        <motion.div style={{ opacity, scale }} transition={{ duration: 0.8 }} className="absolute inset-0 transition-[opacity,transform] duration-700 ease-out">
            <SafeImage src={mediaUrl(photo, "md")} alt={mediaAlt(photo, locale, "")} loading="lazy" className="h-full w-full object-cover" />
        </motion.div>
    );
}
