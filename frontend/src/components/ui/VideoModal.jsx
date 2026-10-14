"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";

/** Tam ekran video penceresi: dışarı tıklama veya Esc ile kapanır, açıkken sayfa kaymaz */
export default function VideoModal({ open, src, onClose, closeLabel = "Close" }) {
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
            {open && src && (
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-orchid-dark/90 p-4 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-black shadow-2xl"
                    >
                        <video src={src} controls autoPlay playsInline className="aspect-video w-full" />
                    </motion.div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={closeLabel}
                        className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
                    >
                        <Icon name="close" className="text-[24px]" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
