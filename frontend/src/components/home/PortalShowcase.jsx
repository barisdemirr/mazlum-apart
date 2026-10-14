"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import { STUDENT_LOGIN_HREF } from "@/components/layout/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

const FEATURE_ICONS = [
    { icon: "receipt_long", color: "bg-orchid-pink" },
    { icon: "verified", color: "bg-orchid-violet" },
    { icon: "build", color: "bg-orchid-pink" },
];

/** Telefon maketi: imleci izleyerek 3B eğilir. İçerik yalnızca örnek görünümdür. */
function PhoneMockup() {
    const { t } = useLanguage();
    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const springX = useSpring(rx, { stiffness: 140, damping: 16 });
    const springY = useSpring(ry, { stiffness: 140, damping: 16 });
    const rotateX = useTransform(springX, (v) => `${v}deg`);
    const rotateY = useTransform(springY, (v) => `${v}deg`);

    const onMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        ry.set(px * 14);
        rx.set(-py * 14);
    };
    const onLeave = () => {
        rx.set(0);
        ry.set(0);
    };

    return (
        <div className="flex flex-col items-center gap-4" style={{ perspective: 1000 }}>
            <motion.div
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="w-full max-w-[340px] rounded-[44px] border-4 border-white/60 bg-orchid-dark p-3 shadow-[0_25px_60px_rgba(52,22,63,0.35)]"
                aria-hidden="true"
            >
                <div className="flex flex-col gap-4 overflow-hidden rounded-[36px] border border-orchid-petal/20 bg-orchid-white p-5">
                    <div className="flex items-center justify-between border-b border-orchid-petal/20 pb-2 pt-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orchid-pink text-xs font-bold text-white">M</span>
                            <span className="text-xs font-bold text-orchid-dark">{t.portal.appName}</span>
                        </div>
                        <Icon name="notifications" className="text-[20px] text-orchid-muted" />
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-orchid-petal/30 bg-white p-4 shadow-sm">
                        <span className="text-xs font-medium text-orchid-muted">{t.portal.remaining}</span>
                        <div className="h-7 w-28 rounded-lg bg-orchid-powder" />
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orchid-powder px-2.5 py-1 text-[11px] font-bold text-orchid-pink">
                            <Icon name="event" className="text-[13px]" />
                            {t.portal.nextPayment}
                        </span>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-orchid-petal/30 bg-white p-4 shadow-sm">
                        <span className="text-xs font-bold text-orchid-dark">{t.portal.status}</span>
                        {t.portal.months.map((month, i) => (
                            <div key={month} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-orchid-dark">{month}</span>
                                    <span className={`flex items-center gap-1 ${i === 0 ? "font-bold text-orchid-pink" : "text-orchid-muted"}`}>
                                        <Icon name={i === 0 ? "check_circle" : "schedule"} filled={i === 0} className="text-[14px]" />
                                        {i === 0 ? t.portal.paid : t.portal.pending}
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-orchid-powder">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: i === 0 ? "100%" : "0%" }}
                                        viewport={VIEWPORT_ONCE}
                                        transition={{ duration: 1.2, delay: 0.5, ease: EASE_OUT }}
                                        className="h-full rounded-full bg-orchid-pink"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orchid-powder/80 px-4 py-3 text-xs font-bold text-orchid-pink">
                        <Icon name="add_circle" className="text-[18px]" />
                        {t.portal.newRequest}
                    </div>
                </div>
            </motion.div>
            <span className="text-xs font-medium text-orchid-muted">{t.portal.sample}</span>
        </div>
    );
}

export default function PortalShowcase() {
    const { t } = useLanguage();

    return (
        <section id="portal" className="relative w-full overflow-hidden px-4 py-24 sm:px-8 lg:px-12">
            <div className="relative mx-auto max-w-[1240px] rounded-[40px] border border-orchid-petal/50 bg-gradient-to-br from-orchid-powder/60 via-orchid-lilac/30 to-orchid-white p-8 sm:p-14 lg:p-16">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                    <div className="flex flex-col items-start gap-8 lg:col-span-6">
                        <Reveal className="flex flex-col items-start gap-8">
                            <span className="inline-flex items-center gap-2 rounded-full border border-orchid-petal/40 bg-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orchid-pink shadow-sm">
                                <Icon name="smartphone" className="text-[16px]" />
                                {t.portal.badge}
                            </span>
                            <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-orchid-dark sm:text-5xl">
                                {t.portal.titleStart} <br />
                                <span className="italic text-orchid-pink">{t.portal.titleAccent}</span>
                            </h2>
                        </Reveal>

                        <div className="flex w-full flex-col gap-4">
                            {t.portal.features.map((text, i) => (
                                <motion.div
                                    key={text}
                                    initial={{ opacity: 0, x: -40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={VIEWPORT_ONCE}
                                    transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: EASE_OUT }}
                                    className="glass-card flex items-center gap-4 rounded-2xl border border-orchid-petal/30 p-4 shadow-sm transition-transform hover:scale-[1.02]"
                                >
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${FEATURE_ICONS[i]?.color ?? "bg-orchid-pink"}`}>
                                        <Icon name={FEATURE_ICONS[i]?.icon ?? "check"} className="text-[18px]" />
                                    </span>
                                    <span className="text-sm font-semibold text-orchid-dark sm:text-base">{text}</span>
                                </motion.div>
                            ))}
                        </div>

                        <LocalizedLink
                            href={STUDENT_LOGIN_HREF}
                            data-cursor={t.portal.cta}
                            className="aurora-btn inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                            <span>{t.portal.cta}</span>
                            <Icon name="login" className="text-[18px]" />
                        </LocalizedLink>
                    </div>

                    <Reveal delay={0.1} className="flex justify-center lg:col-span-6">
                        <PhoneMockup />
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
