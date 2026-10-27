"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";

/** Portalın küçük form penceresi (mobilde alttan açılır). Girdi alanları children olarak verilir. */
export default function DepartureSheet({ open, title, closeLabel, busy, error, submitLabel, cancelLabel, onClose, onSubmit, children }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && !busy && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, busy, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
                    <motion.button type="button" aria-label={closeLabel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} className="absolute inset-0 bg-orchid-dark/50 backdrop-blur-sm" />
                    <motion.form
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        onSubmit={(e) => { e.preventDefault(); if (!busy) onSubmit(); }}
                        noValidate
                        initial={{ y: 70, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 70, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[32px] bg-orchid-white shadow-[0_30px_80px_rgba(52,22,63,0.4)] sm:rounded-[32px]"
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-orchid-petal/30 px-6 py-5">
                            <h2 className="font-display text-2xl font-medium text-orchid-dark">{title}</h2>
                            <button type="button" onClick={onClose} disabled={busy} aria-label={closeLabel} className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                <Icon name="close" className="text-[20px]" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-6">
                            {children}
                            {error && <p role="alert" className="rounded-2xl bg-orchid-powder px-4 py-3 text-sm font-semibold text-orchid-pink">{error}</p>}
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-orchid-petal/30 px-6 py-4">
                            <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full px-5 text-sm font-bold text-orchid-muted hover:text-orchid-dark">{cancelLabel}</button>
                            <button type="submit" disabled={busy} className="aurora-btn flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white disabled:opacity-60">
                                {busy && <Icon name="progress_activity" className="animate-spin text-[18px]" />}
                                {submitLabel}
                            </button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Tarih / metin alanı: portalın sade etiketli girdisi */
export function SheetField({ id, label, hint, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-orchid-muted">{label}</label>
            {children}
            {hint && <p className="text-xs text-orchid-muted">{hint}</p>}
        </div>
    );
}

export const sheetInput = "h-12 w-full rounded-[18px] border border-orchid-petal/40 bg-orchid-white px-4 text-base text-orchid-dark outline-none transition-colors focus:border-orchid-pink";
