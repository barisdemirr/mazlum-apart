"use client";

import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion";

/** Aurora dolgulu ilerleme çizgisi; ucunda parlayan ışık noktası vardır */
function Track({ percent, className = "" }) {
    return (
        <div className={`relative rounded-full bg-orchid-powder ${className}`}>
            <motion.div
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
                className="relative h-full rounded-full bg-gradient-to-r from-orchid-petal via-orchid-pink to-orchid-violet"
            >
                <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_5px_rgba(245,154,196,0.95)] animate-pulse-glow" />
            </motion.div>
        </div>
    );
}

/**
 * Masaüstünde isimli yatay adımlar, mobilde "Adım 2 / 5 · Kişisel Bilgiler" + ince çubuk.
 * Tamamlanan adımlar onay ikonuna dönüşür ve "pop" yapar; ulaşılmış adımlara tıklanıp dönülebilir.
 */
export default function Stepper({ labels, current, maxReached, onGo, stepOfText, ariaLabel }) {
    const total = labels.length;
    const percent = ((current - 1) / (total - 1)) * 100;

    return (
        <>
            {/* Masaüstü */}
            <nav aria-label={ariaLabel} className="glass-card hidden rounded-[32px] px-6 py-7 md:block">
                <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
                    <div className="absolute top-5 -z-0 -translate-y-1/2" style={{ left: `${50 / total}%`, right: `${50 / total}%` }}>
                        <Track percent={percent} className="h-1.5" />
                    </div>
                    {labels.map((label, index) => {
                        const n = index + 1;
                        const done = n < current;
                        const active = n === current;
                        const reachable = n <= maxReached;
                        return (
                            <li key={label} className="relative z-10 flex flex-col items-center gap-2.5 text-center">
                                <button
                                    type="button"
                                    disabled={!reachable}
                                    onClick={() => onGo(n)}
                                    aria-current={active ? "step" : undefined}
                                    className="flex flex-col items-center gap-2.5 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-orchid-pink focus-visible:[&>span:first-child]:ring-offset-2"
                                >
                                    <motion.span
                                        animate={{ scale: active ? 1.12 : 1 }}
                                        transition={SPRING_BOUNCY}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
                                            done || active
                                                ? "bg-gradient-to-br from-orchid-pink to-orchid-violet text-white"
                                                : "bg-orchid-powder text-orchid-muted"
                                        } ${active ? "shadow-[0_0_0_6px_rgba(245,154,196,0.3),0_8px_24px_rgba(180,57,143,0.4)]" : ""}`}
                                    >
                                        <AnimatePresence mode="wait" initial={false}>
                                            {done ? (
                                                <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_BOUNCY} className="flex">
                                                    <Icon name="check" className="text-[22px]" />
                                                </motion.span>
                                            ) : (
                                                <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    {n}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </motion.span>
                                    <span className={`text-sm font-semibold transition-colors ${active ? "text-orchid-pink" : done ? "text-orchid-dark" : "text-orchid-muted"}`}>{label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </nav>

            {/* Mobil */}
            <div className="glass-card rounded-3xl px-5 py-4 md:hidden" role="group" aria-label={ariaLabel}>
                <div className="mb-3 flex items-baseline gap-2 overflow-hidden">
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-orchid-pink">{stepOfText}</span>
                    <span className="text-orchid-petal">·</span>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={current}
                            initial={{ y: 14, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -14, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="truncate font-display text-lg font-semibold text-orchid-dark"
                        >
                            {labels[current - 1]}
                        </motion.span>
                    </AnimatePresence>
                </div>
                <Track percent={percent} className="h-1.5" />
            </div>
        </>
    );
}
