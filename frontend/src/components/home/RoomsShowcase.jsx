"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import RoomCard from "./RoomCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

/** Oda tiplerini yatay kaydırmalı vitrinde gösterir; oklar ve ilerleme çubuğu kaydırmaya bağlıdır */
export default function RoomsShowcase({ rooms }) {
    const { t } = useLanguage();
    const trackRef = useRef(null);

    // Kaydırma konumu -> ilerleme çubuğu
    const { scrollXProgress } = useScroll({ container: trackRef });
    const progress = useSpring(scrollXProgress, { stiffness: 140, damping: 24 });

    const scrollByCard = (direction) => {
        const track = trackRef.current;
        if (!track) return;
        const card = track.querySelector("article, [data-room-end]");
        const step = (card?.getBoundingClientRect().width ?? 360) + 32;
        track.scrollBy({ left: direction * step, behavior: "smooth" });
    };

    return (
        <section id="odalar" className="relative w-full overflow-hidden px-4 py-20 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1340px]">
                <div className="flex flex-col justify-between gap-6 pb-12 md:flex-row md:items-end">
                    <Reveal className="flex flex-col gap-3">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{t.rooms.eyebrow}</span>
                        <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl lg:text-6xl">
                            {t.rooms.title}
                        </h2>
                        <p className="max-w-lg text-base text-orchid-muted">{t.rooms.subtitle}</p>
                    </Reveal>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => scrollByCard(-1)}
                                aria-label={t.rooms.prev}
                                className="flex h-12 w-12 items-center justify-center rounded-full border border-orchid-petal/50 bg-white/80 text-orchid-dark shadow-sm transition-all hover:scale-105 hover:bg-white active:scale-95"
                            >
                                <Icon name="west" className="text-[20px]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollByCard(1)}
                                aria-label={t.rooms.next}
                                className="flex h-12 w-12 items-center justify-center rounded-full border border-orchid-petal/50 bg-orchid-pink text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                            >
                                <Icon name="east" className="text-[20px]" />
                            </button>
                        </div>
                        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-orchid-powder">
                            <motion.div
                                style={{ scaleX: progress }}
                                className="h-full origin-left rounded-full bg-gradient-to-r from-orchid-pink to-orchid-violet"
                            />
                        </div>
                    </div>
                </div>

                <div ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto pb-8 pt-2">
                    {rooms.map((room, i) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT_ONCE}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: EASE_OUT }}
                            className="flex"
                        >
                            <RoomCard room={room} />
                        </motion.div>
                    ))}

                    {/* Son kart: tüm odalar */}
                    <div
                        data-room-end
                        data-cursor={t.rooms.allCta}
                        className="group relative flex min-w-[280px] snap-center flex-col justify-between gap-10 overflow-hidden rounded-[32px] bg-gradient-to-br from-orchid-dark via-orchid-violet to-orchid-pink p-8 text-white shadow-2xl sm:min-w-[340px] sm:p-10"
                    >
                        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-white/10 blur-xl transition-transform duration-700 group-hover:scale-150" />
                        <div className="relative flex flex-col gap-4">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-orchid-petal backdrop-blur-md">
                                <Icon name="apartment" className="text-[28px]" />
                            </span>
                            <h3 className="font-display text-3xl font-normal leading-tight sm:text-4xl">{t.rooms.allTitle}</h3>
                            <p className="text-sm text-orchid-lilac">{t.rooms.allText}</p>
                        </div>
                        <LocalizedLink
                            href="/odalar"
                            className="relative flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-center text-sm font-bold text-orchid-dark shadow-lg transition-transform hover:scale-105 hover:bg-orchid-powder active:scale-95"
                        >
                            <span>{t.rooms.allCta}</span>
                            <Icon name="east" className="text-[18px]" />
                        </LocalizedLink>
                    </div>
                </div>
            </div>
        </section>
    );
}
