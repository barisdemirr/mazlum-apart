"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Çocuğunu imlece doğru hafifçe çeken "manyetik" sarmalayıcı.
 * Dokunmatik cihazlarda mousemove olmadığı için kendiliğinden etkisiz kalır.
 */
export default function Magnetic({ children, strength = 0.3, className = "" }) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.2 });
    const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.2 });

    const onMove = (e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        // Dış kap sabit kalır (hareket alanını ve imleci o ölçer); yalnızca iç kap kayar.
        // Aksi halde kayan öğe kendi ölçüm kutusunu da kaydırır ve imleçten kaçıyormuş gibi titrer.
        <div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={className || "inline-flex"}
        >
            <motion.div style={{ x: sx, y: sy }} className="inline-flex max-w-full">
                {children}
            </motion.div>
        </div>
    );
}
