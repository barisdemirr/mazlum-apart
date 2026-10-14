"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Kesintisiz akan bir grup: içerik 2 kez çizilir, animasyon -%50 kayarak döngüyü gizler */
function Track({ items, className, itemClass, separator, reverse = false }) {
    // Ekranı doldursun diye maddeler 3 kez tekrarlanır; iki kopyanın ikincisi ekran okuyuculardan gizlenir
    const group = [...items, ...items, ...items];
    const animation = reverse ? "animate-marquee-right" : "animate-marquee-left";

    return (
        <div className={`flex w-max ${animation} ${className}`}>
            {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center">
                    {group.map((text, i) => (
                        <span key={i} className={`flex items-center whitespace-nowrap ${itemClass}`}>
                            {text}
                            <span className={separator}>✦</span>
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

/** -3° eğik, iki katmanlı kayan şerit: ön bant aurora gradyanlı, arkadaki ters yönde akar */
export default function BillsStrip() {
    const { t } = useLanguage();

    return (
        <section id="faturalar-strip" aria-label={t.common.billsIncluded} className="relative my-10 w-full overflow-hidden py-14">
            <div className="relative -mx-4 -rotate-3 scale-105 sm:-mx-8">
                {/* Arka, ters yönde ve soluk */}
                <div className="flex w-full overflow-hidden border-y border-orchid-petal/30 bg-orchid-lilac/70 py-2.5 opacity-70" aria-hidden="true">
                    <Track
                        items={t.strip.back}
                        reverse
                        itemClass="gap-8 pr-8 text-xs font-bold uppercase tracking-[0.3em] text-orchid-violet"
                        separator="text-orchid-violet"
                    />
                </div>

                {/* Ön ana bant */}
                <div className="flex w-full overflow-hidden bg-gradient-to-r from-orchid-pink via-orchid-violet to-orchid-dark py-4 text-white shadow-xl">
                    <Track
                        items={t.strip.front}
                        itemClass="gap-10 pr-10 font-display text-lg font-normal italic tracking-wide sm:text-2xl"
                        separator="text-sm not-italic text-orchid-petal"
                    />
                </div>
            </div>
        </section>
    );
}
