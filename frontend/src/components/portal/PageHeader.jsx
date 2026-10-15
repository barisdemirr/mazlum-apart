"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/** Portal sayfalarının ortak başlığı */
export default function PageHeader({ eyebrow, title, text, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
            <div>
                {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orchid-pink">{eyebrow}</p>}
                <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-orchid-dark sm:text-4xl">{title}</h1>
                {text && <p className="mt-2 max-w-xl text-sm leading-relaxed text-orchid-muted">{text}</p>}
            </div>
            {children}
        </motion.div>
    );
}
