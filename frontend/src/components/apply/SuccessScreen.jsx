"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Magnetic from "@/components/ui/Magnetic";
import PetalConfetti from "./PetalConfetti";
import { waHref } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion";

/** Daire çizilip içinde tik'in kendini çizdiği büyük onay ikonu */
function BigCheck() {
    return (
        <div className="relative flex h-32 w-32 items-center justify-center">
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} className="absolute inset-0 rounded-full bg-gradient-to-br from-orchid-petal/50 to-orchid-lilac blur-2xl animate-pulse-glow" />
            <svg viewBox="0 0 120 120" className="relative h-full w-full">
                <defs>
                    <linearGradient id="ok-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f59ac4" />
                        <stop offset="55%" stopColor="#b4398f" />
                        <stop offset="100%" stopColor="#7b46c7" />
                    </linearGradient>
                </defs>
                <motion.circle cx="60" cy="60" r="52" fill="#fff6f9" stroke="url(#ok-grad)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0, rotate: -90 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE_OUT }} style={{ originX: "50%", originY: "50%", rotate: -90 }} />
                <motion.path d="M36 62l16 16 32-36" fill="none" stroke="url(#ok-grad)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.7, ease: EASE_OUT }} />
            </svg>
        </div>
    );
}

/** "Sırada ne var?" yolu: kaydırdıkça çizilir, durak numaraları sırayla yanar */
function Roadmap({ title, steps }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
    const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
    const height = useTransform(fill, [0, 1], ["0%", "100%"]);

    return (
        <section className="mt-14 w-full max-w-xl text-left">
            <h2 className="mb-8 text-center font-display text-3xl font-medium text-orchid-dark">{title}</h2>
            <div ref={ref} className="relative pl-16">
                <div className="absolute bottom-6 left-[1.35rem] top-6 w-1 rounded-full bg-orchid-powder">
                    <motion.div style={{ height }} className="w-full rounded-full bg-gradient-to-b from-orchid-petal via-orchid-pink to-orchid-violet" />
                </div>
                <ol className="flex flex-col gap-10">
                    {steps.map((text, index) => (
                        <motion.li
                            key={text}
                            initial={{ opacity: 0, x: 24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.6 }}
                            transition={{ duration: 0.55, ease: EASE_OUT }}
                            className="relative"
                        >
                            <motion.span
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true, amount: 0.6 }}
                                transition={SPRING_BOUNCY}
                                className="absolute -left-16 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orchid-pink to-orchid-violet font-display text-lg font-semibold text-white shadow-[0_8px_20px_rgba(180,57,143,0.35)]"
                            >
                                {index + 1}
                            </motion.span>
                            <div className="glass-card rounded-2xl px-5 py-3.5 text-sm font-semibold text-orchid-dark">{text}</div>
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** Başvuru gönderildikten sonraki ayrı ekran */
export default function SuccessScreen({ applicationNo }) {
    const { t, tpl } = useLanguage();
    const s = t.apply.success;
    const [copied, setCopied] = useState(false);
    const number = `#${applicationNo}`;
    const wa = waHref(tpl(s.whatsappMessage, { no: number }));

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(number);
        } catch {
            // pano izni yoksa yine de geri bildirim göster
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-24 pt-32 text-center sm:pt-36">
            <PetalConfetti />
            <BigCheck />

            <h1 className="mt-6 overflow-hidden pb-2 font-display text-5xl font-medium leading-tight tracking-tight text-orchid-dark sm:text-6xl">
                <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: EASE_OUT }} className="inline-block">
                    {s.title}
                </motion.span>
            </h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="mt-2 max-w-md text-base text-orchid-muted sm:text-lg">
                {s.subtitle}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1, duration: 0.6, ease: EASE_OUT }} className="glass-card mt-8 flex items-center gap-3 rounded-full py-2 pl-6 pr-2 shadow-[0_16px_40px_-12px_rgba(180,57,143,0.3)]">
                <span className="text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-orchid-muted">{s.numberLabel}</span>
                    <span className="block font-display text-2xl font-semibold tracking-wide text-orchid-pink">{number}</span>
                </span>
                <button type="button" onClick={copy} className={`relative flex h-12 items-center gap-1.5 overflow-hidden rounded-full px-5 text-sm font-bold transition-colors ${copied ? "bg-orchid-powder text-orchid-pink" : "aurora-btn text-white"}`}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={copied ? "done" : "copy"} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center gap-1.5">
                            <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
                            {copied ? s.copied : s.copy}
                        </motion.span>
                    </AnimatePresence>
                </button>
            </motion.div>

            <Roadmap title={s.nextTitle} steps={s.next} />

            <div className="mt-14 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic className="inline-flex w-full sm:w-auto">
                    <LocalizedLink href="/" className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white sm:w-auto">
                        <Icon name="home" className="text-[20px]" />
                        {s.home}
                    </LocalizedLink>
                </Magnetic>
                {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="glass-card flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-orchid-dark transition-colors hover:bg-white sm:w-auto">
                        <Icon name="chat" filled className="text-[20px] text-[#25d366]" />
                        {s.whatsapp}
                    </a>
                )}
            </div>
        </motion.div>
    );
}
