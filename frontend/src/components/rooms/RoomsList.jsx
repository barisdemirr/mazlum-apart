"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Magnetic from "@/components/ui/Magnetic";
import Reveal from "@/components/ui/Reveal";
import { RoomCard } from "@/components/room-detail/RoomCards";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSite } from "@/lib/site/SiteProvider";
import { localized } from "@/lib/i18n/localized";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion";

const SORTS = ["recommended", "priceAsc", "priceDesc"];

const sorters = {
    recommended: null, // backend'in verdiği sıra (panelden belirlenen görüntüleme sırası)
    priceAsc: (a, b) => (a.monthlyPrice ?? Infinity) - (b.monthlyPrice ?? Infinity),
    priceDesc: (a, b) => (b.monthlyPrice ?? -Infinity) - (a.monthlyPrice ?? -Infinity),
};

/** Sayfa başlığı kelime kelime yükselerek gelir */
function Word({ children, delay, className = "" }) {
    return (
        <span className="inline-block overflow-hidden pb-2 align-bottom">
            <motion.span
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay, ease: EASE_OUT }}
                className={`inline-block ${className}`}
            >
                {children}
            </motion.span>
        </span>
    );
}

/** rooms: tek tek ODALAR (her biri kendi tipi, dairesi ve fiyatıyla); types: filtre sekmeleri için oda tipleri */
export default function RoomsList({ rooms, types = [], children }) {
    const { t, tpl, locale } = useLanguage();
    const [sort, setSort] = useState("recommended");
    const [type, setType] = useState("all");

    // Tipi olmayan (odası bulunmayan) tip için sekme gösterilmez
    const filters = useMemo(() => {
        const counts = new Map();
        for (const room of rooms) counts.set(room.roomTypeSlug, (counts.get(room.roomTypeSlug) ?? 0) + 1);
        return types.filter((item) => counts.has(item.slug)).map((item) => ({ key: item.slug, label: localized(item.name, locale), count: counts.get(item.slug) }));
    }, [rooms, types, locale]);

    const visible = useMemo(() => {
        const filtered = type === "all" ? rooms : rooms.filter((room) => room.roomTypeSlug === type);
        const compare = sorters[sort];
        return compare ? [...filtered].sort(compare) : filtered;
    }, [rooms, type, sort]);

    const site = useSite();
    const whatsapp = site.waHref(t.whatsapp.defaultMessage);

    return (
        <>
            {/* ───────── Başlık alanı ───────── */}
            <section className="relative flex flex-col items-center px-4 pb-10 pt-36 text-center sm:px-8 sm:pt-40">
                {/* Aurora lekeleri ve yüzen cam halkalar */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 h-[520px] w-[700px] max-w-full -translate-x-1/2 rounded-full bg-gradient-to-tr from-orchid-petal/40 via-orchid-lilac/60 to-orchid-powder/50 soft-blob animate-blob" />
                    <div className="absolute -left-32 top-[40%] h-[420px] w-[420px] rounded-full bg-orchid-powder/70 soft-blob animate-blob [animation-delay:5s]" />
                    <div className="absolute -right-32 top-[55%] h-[460px] w-[460px] rounded-full bg-orchid-lilac/70 soft-blob animate-blob [animation-delay:9s]" />
                    <div className="absolute left-[8%] top-36 hidden h-24 w-24 rounded-full border border-orchid-petal/40 bg-white/10 backdrop-blur-md animate-float-slow lg:block" />
                    <div className="absolute right-[10%] top-64 hidden h-36 w-36 rounded-full border border-orchid-violet/25 bg-orchid-lilac/20 backdrop-blur-lg animate-float-delay md:block" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.7, ease: EASE_OUT }}
                    className="mb-6 flex flex-wrap items-center justify-center gap-3"
                >
                    <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-orchid-pink animate-float-slow">
                        <Icon name="female" filled className="text-[18px]" />
                        {t.common.girlsOnly}
                    </span>
                    <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-orchid-violet animate-float-delay">
                        <Icon name="verified" filled className="text-[18px]" />
                        {t.common.billsIncluded}
                    </span>
                </motion.div>

                <h1 className="flex flex-wrap items-center justify-center gap-x-3 font-display text-5xl font-medium leading-tight tracking-tight text-orchid-dark md:text-7xl">
                    <Word delay={0.8}>{t.roomsPage.titleStart}</Word>
                    <Word delay={0.95} className="font-normal italic text-orchid-pink">
                        {t.roomsPage.titleAccent}
                    </Word>
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 1.05, ease: EASE_OUT }}
                    className="mt-4 max-w-xl text-base text-orchid-muted sm:text-lg"
                >
                    {t.roomsPage.subtitle}
                </motion.p>
            </section>

            {/* ───────── Filtre ve sıralama çubuğu ───────── */}
            {rooms.length > 0 && (
                <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-8 lg:px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 1.2, ease: EASE_OUT }}
                        className="glass-card flex flex-col gap-4 rounded-[28px] p-4 shadow-lg shadow-orchid-pink/10 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                    >
                        {/* Oda tipi filtresi */}
                        <div role="group" aria-label={t.roomsPage.filterLabel} className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
                            {[{ key: "all", label: t.roomsPage.all, count: rooms.length }, ...filters].map((item) => {
                                const active = type === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setType(item.key)}
                                        aria-pressed={active}
                                        className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                            active ? "text-white" : "text-orchid-muted hover:text-orchid-dark"
                                        }`}
                                    >
                                        {active && <motion.span layoutId="rooms-filter-pill" transition={SPRING_SOFT} className="aurora-btn absolute inset-0 rounded-full" />}
                                        <span className="relative">
                                            {item.label} <span className={`text-xs ${active ? "text-white/80" : "text-orchid-muted/70"}`}>{item.count}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sıralama */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div role="group" aria-label={t.roomsPage.sortLabel} className="flex items-center rounded-full bg-white/60 p-1">
                                {SORTS.map((key) => {
                                    const active = sort === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSort(key)}
                                            aria-pressed={active}
                                            className={`relative flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                                                active ? "text-white" : "text-orchid-muted hover:text-orchid-dark"
                                            }`}
                                        >
                                            {active && <motion.span layoutId="rooms-sort-pill" transition={SPRING_SOFT} className="aurora-btn absolute inset-0 rounded-full" />}
                                            <span className="relative">{t.roomsPage.sort[key]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <span className="text-xs font-medium text-orchid-muted sm:min-w-16 sm:text-right" aria-live="polite">
                                {tpl(t.roomsPage.count, { count: visible.length })}
                            </span>
                        </div>
                    </motion.div>
                </section>
            )}

            {/* ───────── Oda listesi ───────── */}
            <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-12">
                {rooms.length > 0 ? (
                    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {visible.map((room, i) => (
                            <motion.div
                                key={room.id}
                                layout
                                transition={{ layout: SPRING_SOFT }}
                                className="h-full lg:[&:nth-child(3n+2)]:mt-8"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 60 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.15 }}
                                    transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: EASE_OUT }}
                                    className="h-full"
                                >
                                    <RoomCard room={room} showType showPrice />
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <Reveal className="glass-card mx-auto my-10 flex max-w-xl flex-col items-center rounded-[32px] p-10 text-center shadow-xl">
                        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orchid-lilac/60 text-orchid-pink">
                            <Icon name="apartment" className="text-[40px]" />
                        </span>
                        <h2 className="mb-2 font-display text-2xl font-medium text-orchid-dark">{t.roomsPage.emptyTitle}</h2>
                        <p className="mb-6 text-orchid-muted">{t.roomsPage.emptyText}</p>
                        <LocalizedLink
                            href="/iletisim"
                            className="aurora-btn rounded-full px-8 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
                        >
                            {t.roomsPage.ctaContact}
                        </LocalizedLink>
                    </Reveal>
                )}
            </section>

            {/* Sayfa bileşeninden gelen akan şerit */}
            {children}

            {/* ───────── Kapanış: soru kartı ───────── */}
            <section className="px-4 pb-4 sm:px-8">
                <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden rounded-[36px] border border-orchid-petal/40 bg-gradient-to-br from-orchid-powder/70 via-orchid-lilac/50 to-orchid-white p-10 text-center shadow-xl sm:p-14">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orchid-petal/30 soft-blob animate-blob" />
                    <span className="relative mb-2 text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{t.roomsPage.ctaEyebrow}</span>
                    <h2 className="relative mb-3 font-display text-3xl font-normal tracking-tight text-orchid-dark sm:text-4xl">{t.roomsPage.ctaTitle}</h2>
                    <p className="relative mb-8 max-w-lg text-orchid-muted">{t.roomsPage.ctaText}</p>
                    <Magnetic>
                        {whatsapp ? (
                            <a
                                href={whatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-cursor="WhatsApp"
                                className="aurora-btn group relative inline-flex items-center gap-3 rounded-full px-9 py-4 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
                            >
                                <Icon name="chat" className="text-[22px] transition-transform group-hover:rotate-12" />
                                {t.roomsPage.ctaWhatsapp}
                            </a>
                        ) : (
                            <LocalizedLink
                                href="/iletisim"
                                data-cursor={t.roomsPage.ctaContact}
                                className="aurora-btn relative inline-flex items-center gap-3 rounded-full px-9 py-4 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
                            >
                                {t.roomsPage.ctaContact}
                                <Icon name="arrow_forward" className="text-[20px]" />
                            </LocalizedLink>
                        )}
                    </Magnetic>
                </Reveal>
            </section>
        </>
    );
}
