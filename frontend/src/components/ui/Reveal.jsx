"use client";

import { motion } from "framer-motion";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

/** Ekrana girince aşağıdan yükselerek beliren sarmalayıcı (bölümlerde ortak kullanılır) */
export default function Reveal({ children, delay = 0, y = 40, className = "", as = "div" }) {
    const Tag = motion[as] ?? motion.div;
    return (
        <Tag
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.8, delay, ease: EASE_OUT }}
            className={className}
        >
            {children}
        </Tag>
    );
}
