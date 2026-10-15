"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = [
    "linear-gradient(135deg,#f59ac4,#b4398f)",
    "linear-gradient(135deg,#eee3fb,#7b46c7)",
    "linear-gradient(135deg,#fbe4ee,#f59ac4)",
    "linear-gradient(135deg,#b4398f,#7b46c7)",
];

/** Pembe-mor yaprak patlaması: merkezden fırlar, savrulur, düşerek solar. Yalnızca başarı ekranında (istemcide) çizilir. */
export default function PetalConfetti({ count = 46 }) {
    const petals = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => {
                const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
                const power = 140 + Math.random() * 300;
                return {
                    id: i,
                    x: Math.cos(angle) * power,
                    up: -Math.abs(Math.sin(angle)) * power * 0.9 - 40,
                    fall: 260 + Math.random() * 360,
                    rotate: (Math.random() - 0.5) * 900,
                    size: 10 + Math.random() * 14,
                    delay: Math.random() * 0.15,
                    duration: 2.4 + Math.random() * 1.6,
                    background: COLORS[i % COLORS.length],
                };
            }),
        [count]
    );

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
            <div className="absolute left-1/2 top-[34%]">
                {petals.map((p) => (
                    <motion.span
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
                        animate={{
                            x: [0, p.x * 0.7, p.x],
                            y: [0, p.up, p.up + p.fall],
                            opacity: [0, 1, 1, 0],
                            scale: [0.3, 1, 1],
                            rotate: p.rotate,
                        }}
                        transition={{ duration: p.duration, delay: p.delay, ease: "easeOut", times: [0, 0.35, 1] }}
                        className="absolute block"
                        style={{
                            width: p.size,
                            height: p.size * 1.35,
                            background: p.background,
                            borderRadius: "100% 0 100% 0",
                            boxShadow: "0 2px 8px rgba(180,57,143,0.25)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
