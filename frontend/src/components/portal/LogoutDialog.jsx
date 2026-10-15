"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_SOFT } from "@/lib/motion";

/** Çıkış onayı: Esc ve dış tıklama ile kapanır, açılınca "Vazgeç" odaklanır */
export default function LogoutDialog({ open, onClose }) {
    const { t, href } = useLanguage();
    const copy = t.studentPortal.logoutDialog;
    const [busy, setBusy] = useState(false);
    const cancelRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKey = (event) => event.key === "Escape" && !busy && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onClose]);

    async function logout() {
        setBusy(true);
        try {
            await fetch("/api/student/session", { method: "DELETE" });
        } finally {
            // Tam sayfa yönlendirme: tüm istemci durumu temizlenir
            window.location.href = href("/ogrenci/giris");
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !busy && onClose()}
                    className="fixed inset-0 z-[120] flex items-end justify-center bg-orchid-dark/50 p-4 backdrop-blur-sm sm:items-center"
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                        aria-describedby="logout-text"
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.97 }}
                        transition={SPRING_SOFT}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-[32px] bg-orchid-white p-7 text-center shadow-2xl"
                    >
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                            <Icon name="logout" className="text-[26px]" />
                        </span>
                        <h2 id="logout-title" className="mt-4 font-display text-2xl font-semibold text-orchid-dark">
                            {copy.title}
                        </h2>
                        <p id="logout-text" className="mt-2 text-sm leading-relaxed text-orchid-muted">
                            {copy.text}
                        </p>
                        <div className="mt-6 flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={logout}
                                disabled={busy}
                                className="aurora-btn flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:cursor-wait disabled:opacity-90"
                            >
                                {busy && <Icon name="progress_activity" className="animate-spin text-[18px]" />}
                                {busy ? copy.busy : copy.confirm}
                            </button>
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="h-12 rounded-full text-sm font-bold text-orchid-muted transition-colors hover:bg-orchid-powder hover:text-orchid-pink disabled:opacity-50"
                            >
                                {copy.cancel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
