"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { KVKK_TEXT } from "@/lib/legal";

/** KVKK aydınlatma metni: alttan açılan pencere. Metin müşteriden gelene kadar "eklenecek" notu gösterilir. */
export default function KvkkModal({ open, onClose }) {
    const { t, locale } = useLanguage();
    const r = t.apply.review;
    const paragraphs = KVKK_TEXT[locale]?.length ? KVKK_TEXT[locale] : KVKK_TEXT.tr;

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
                    <motion.button type="button" aria-label={r.kvkkClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-orchid-dark/50 backdrop-blur-sm" />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={r.kvkkTitle}
                        initial={{ y: 60, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-[32px] bg-orchid-white shadow-[0_30px_80px_rgba(52,22,63,0.4)] sm:rounded-[32px]"
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-orchid-petal/30 px-6 py-5">
                            <h2 className="font-display text-2xl font-medium text-orchid-dark">{r.kvkkTitle}</h2>
                            <button type="button" onClick={onClose} aria-label={r.kvkkClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                <Icon name="close" className="text-[20px]" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-orchid-dark/90">
                            {paragraphs.length ? (
                                paragraphs.map((p, i) => (
                                    <p key={i} className="mb-3">
                                        {p}
                                    </p>
                                ))
                            ) : (
                                <p className="rounded-2xl bg-orchid-powder/70 p-4 text-orchid-muted">{r.kvkkPending}</p>
                            )}
                        </div>
                        <div className="border-t border-orchid-petal/30 px-6 py-4">
                            <button type="button" onClick={onClose} className="aurora-btn w-full rounded-full px-6 py-3.5 text-sm font-bold text-white">
                                {r.kvkkClose}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
