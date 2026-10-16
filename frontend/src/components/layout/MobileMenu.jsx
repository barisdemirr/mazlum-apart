"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import LanguageSwitch from "./LanguageSwitch";
import { APPLY_HREF, NAV_ITEMS, STUDENT_LOGIN_HREF } from "./navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

/**
 * Tam ekran mobil menü: yalnızca saydamlık animasyonuyla açılır (clip-path her karede yeniden boyama gerektirip kasıyordu),
 * bağlantılar sırayla yükselerek belirir.
 * `origin`: açılma noktası (düğme merkezi, px). Header'ın dışında render edilir ki
 * header'ın transform'u fixed konumlamayı bozmasın.
 */
export default function MobileMenu({ open, onClose, origin, activeHref }) {
    const { t } = useLanguage();

    // Açıkken sayfa kaymasın, Esc ile kapansın
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);


    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="mobile-menu"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.nav.menu}
                    className="fixed inset-0 z-[60] flex flex-col justify-between overflow-y-auto bg-[#3d1c49] p-8 pb-10 pt-28 text-white lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_IN_OUT }}
                >
                    {/* Dekoratif ışık lekeleri */}
                    <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-orchid-pink/30 soft-blob animate-blob" />
                    <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-20 h-72 w-72 rounded-full bg-orchid-violet/30 soft-blob animate-blob [animation-delay:4s]" />

                    <div className="relative flex flex-col gap-6">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs font-bold uppercase tracking-[0.3em] text-orchid-petal/80"
                        >
                            {t.nav.menu}
                        </motion.span>

                        <nav className="flex flex-col gap-3 font-display text-4xl font-medium">
                            {NAV_ITEMS.map((item, i) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: EASE_OUT }}
                                >
                                    <LocalizedLink
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-baseline gap-4 transition-colors hover:text-orchid-petal ${
                                            activeHref === item.href ? "text-orchid-petal italic" : ""
                                        }`}
                                    >
                                        <span className="font-sans text-xs font-semibold tracking-widest text-white/40">
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        {t.nav[item.key]}
                                    </LocalizedLink>
                                </motion.div>
                            ))}
                        </nav>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6, ease: EASE_OUT }}
                        className="relative mt-10 flex flex-col gap-4 border-t border-white/10 pt-8"
                    >
                        <LanguageSwitch id="mobile-lang" dark className="self-start" />
                        <LocalizedLink
                            href={STUDENT_LOGIN_HREF}
                            onClick={onClose}
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 py-3.5 text-sm font-semibold hover:bg-white/20"
                        >
                            <Icon name="lock_open" className="text-[18px]" />
                            {t.nav.studentLogin}
                        </LocalizedLink>
                        <LocalizedLink
                            href={APPLY_HREF}
                            onClick={onClose}
                            className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold text-white"
                        >
                            {t.nav.apply}
                            <Icon name="arrow_forward" className="text-[20px]" />
                        </LocalizedLink>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
