"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Değer değişince eski sayıdan yenisine yumuşakça sayar (örn. oda tipi değişince kira).
 * format: sayıyı metne çeviren fonksiyon (örn. formatPrice).
 */
export default function AnimatedNumber({ value, format = (n) => String(n), duration = 0.7, className = "" }) {
    const [shown, setShown] = useState(value);
    const previous = useRef(value);

    useEffect(() => {
        const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || previous.current === value) {
            setShown(value);
            previous.current = value;
            return;
        }
        const controls = animate(previous.current, value, {
            duration,
            ease: "easeOut",
            onUpdate: (v) => setShown(Math.round(v)),
            onComplete: () => setShown(value),
        });
        previous.current = value;
        return () => controls.stop();
    }, [value, duration]);

    return <span className={className}>{format(shown)}</span>;
}
