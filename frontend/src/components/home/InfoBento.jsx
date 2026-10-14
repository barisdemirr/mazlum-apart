"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_SOFT } from "@/lib/motion";

function CardHead({ icon, chip, iconClass = "text-orchid-pink", chipClass = "bg-orchid-powder/80 text-orchid-dark" }) {
    return (
        <div className="flex items-start justify-between">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-orchid-powder ${iconClass}`}>
                <Icon name={icon} className="text-[30px]" />
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${chipClass}`}>{chip}</span>
        </div>
    );
}

/** Ödeme günü seçici: iki aralık arasında geçiş yapılır, açıklama değişir */
function PaydayCard({ info }) {
    const [range, setRange] = useState("first");
    const options = [
        { key: "first", label: info.first, result: info.firstResult },
        { key: "second", label: info.second, result: info.secondResult },
    ];
    const active = options.find((o) => o.key === range);

    return (
        <SpotlightCard className="rounded-[32px] p-8 sm:p-10 md:col-span-5">
            <CardHead icon="payments" chip={info.chip} iconClass="text-orchid-violet" chipClass="bg-orchid-powder/80 text-orchid-violet" />
            <div>
                <h3 className="mb-2 font-display text-2xl font-medium text-orchid-dark">{info.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-orchid-muted">{info.text}</p>

                <div role="group" className="flex items-center gap-2 rounded-full border border-orchid-petal/30 bg-orchid-powder/50 p-1.5">
                    {options.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setRange(option.key)}
                            aria-pressed={range === option.key}
                            className={`relative flex-1 rounded-full py-2 text-center text-xs font-bold transition-colors ${
                                range === option.key ? "text-orchid-pink" : "text-orchid-muted hover:text-orchid-dark"
                            }`}
                        >
                            {range === option.key && (
                                <motion.span layoutId="payday-pill" transition={SPRING_SOFT} className="absolute inset-0 rounded-full bg-white shadow-sm" />
                            )}
                            <span className="relative">{option.label}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-4 min-h-10">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                            key={active.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm font-semibold text-orchid-dark"
                        >
                            {active.result}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </SpotlightCard>
    );
}

/** "Önemli Bilgiler": bento ızgara, her kartta imleci izleyen ışık */
export default function InfoBento() {
    const { t, tpl } = useLanguage();
    const { info } = t;

    return (
        <section id="bilgiler" className="relative w-full px-4 py-24 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[1240px] flex-col gap-12">
                <Reveal className="flex max-w-xl flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{info.eyebrow}</span>
                    <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{info.title}</h2>
                    <p className="text-base text-orchid-muted">{info.subtitle}</p>
                </Reveal>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                    <Reveal className="md:col-span-7">
                        <SpotlightCard className="h-full rounded-[32px] p-8 sm:p-10">
                            <CardHead icon="date_range" chip={info.term.chip} />
                            <div>
                                <h3 className="mb-3 font-display text-2xl font-medium text-orchid-dark sm:text-3xl">{info.term.title}</h3>
                                <p className="text-base leading-relaxed text-orchid-muted">{tpl(info.term.text, { term: t.common.term })}</p>
                            </div>
                        </SpotlightCard>
                    </Reveal>

                    <Reveal delay={0.1} className="md:col-span-5">
                        <PaydayCard info={info.payday} />
                    </Reveal>

                    <Reveal delay={0.1} className="md:col-span-5">
                        <SpotlightCard className="h-full rounded-[32px] p-8 sm:p-10">
                            <CardHead icon="assignment_turned_in" chip={info.register.chip} />
                            <div>
                                <h3 className="mb-3 font-display text-2xl font-medium text-orchid-dark">{info.register.title}</h3>
                                <p className="text-sm leading-relaxed text-orchid-muted sm:text-base">{info.register.text}</p>
                            </div>
                        </SpotlightCard>
                    </Reveal>

                    <Reveal delay={0.2} className="md:col-span-7">
                        <SpotlightCard className="h-full rounded-[32px] p-8 sm:p-10">
                            <CardHead icon="wb_sunny" chip={info.summer.chip} iconClass="text-amber-600" chipClass="bg-amber-50 text-amber-700" />
                            <div>
                                <h3 className="mb-3 font-display text-2xl font-medium text-orchid-dark sm:text-3xl">{info.summer.title}</h3>
                                <p className="text-base leading-relaxed text-orchid-muted">{info.summer.text}</p>
                            </div>
                        </SpotlightCard>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
