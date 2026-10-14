"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Magnetic from "@/components/ui/Magnetic";
import Reveal from "@/components/ui/Reveal";
import { APPLY_HREF } from "@/components/layout/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

/** "Nasıl kayıt olursun?": 4 adım; masaüstünde adımları bağlayan yol sayfa kaydıkça çizilir */
export default function HowItWorks() {
    const { t } = useLanguage();
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 70%"] });
    const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

    return (
        <section
            ref={ref}
            id="nasil-kayit"
            className="relative w-full overflow-hidden bg-gradient-to-b from-orchid-white via-orchid-powder/40 to-orchid-white px-4 py-24 sm:px-8 lg:px-12"
        >
            <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-16">
                <Reveal className="flex max-w-xl flex-col items-center gap-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{t.steps.eyebrow}</span>
                    <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{t.steps.title}</h2>
                    <p className="text-base text-orchid-muted">{t.steps.subtitle}</p>
                </Reveal>

                <div className="relative w-full">
                    {/* Masaüstü bağlantı yolu */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 900 100"
                        fill="none"
                        className="pointer-events-none absolute left-[8%] top-14 hidden h-24 w-[84%] lg:block"
                    >
                        <defs>
                            <linearGradient id="steps-path-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#b4398f" />
                                <stop offset="50%" stopColor="#f59ac4" />
                                <stop offset="100%" stopColor="#7b46c7" />
                            </linearGradient>
                        </defs>
                        <path d="M 0,50 Q 225,0 450,50 T 900,50" stroke="#f59ac4" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="6 6" />
                        <motion.path
                            d="M 0,50 Q 225,0 450,50 T 900,50"
                            stroke="url(#steps-path-gradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            style={{ pathLength: draw }}
                        />
                    </svg>

                    <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {t.steps.items.map((step, i) => {
                            const last = i === t.steps.items.length - 1;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={VIEWPORT_ONCE}
                                    transition={{ duration: 0.8, delay: i * 0.12, ease: EASE_OUT }}
                                    data-cursor={String(i + 1)}
                                    className={`group flex flex-col items-start gap-4 rounded-[28px] p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                                        last
                                            ? "bg-gradient-to-br from-orchid-pink to-orchid-violet text-white shadow-xl"
                                            : "glass-card border border-orchid-petal/40 shadow-sm hover:border-orchid-pink hover:shadow-xl"
                                    }`}
                                >
                                    <span
                                        className={`flex h-14 w-14 items-center justify-center rounded-2xl font-display text-2xl font-bold shadow-md transition-all ${
                                            last
                                                ? "border border-white/30 bg-white/20 text-white backdrop-blur-md"
                                                : "border border-orchid-petal/40 bg-white text-orchid-pink group-hover:bg-orchid-pink group-hover:text-white"
                                        }`}
                                    >
                                        {i + 1}
                                    </span>
                                    <h3 className={`pt-2 font-display text-2xl font-medium ${last ? "text-white" : "text-orchid-dark"}`}>
                                        {step.title}
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${last ? "text-orchid-lilac" : "text-orchid-muted"}`}>{step.text}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <Reveal>
                    <Magnetic>
                        <LocalizedLink
                            href={APPLY_HREF}
                            data-cursor={t.steps.cta}
                            className="aurora-btn inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-bold text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
                        >
                            <span>{t.steps.cta}</span>
                            <Icon name="arrow_forward" className="text-[20px]" />
                        </LocalizedLink>
                    </Magnetic>
                </Reveal>
            </div>
        </section>
    );
}
