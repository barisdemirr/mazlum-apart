"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

/** Görünür olunca 0'dan hedef sayıya sayarak çıkar (hareket azaltma açıksa doğrudan hedefi gösterir) */
export default function CountUp({ to, duration = 1.2, className = "" }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            setValue(to);
            return;
        }
        const controls = animate(0, to, { duration, ease: "easeOut", onUpdate: (v) => setValue(Math.round(v)) });
        return () => controls.stop();
    }, [inView, to, duration]);

    return (
        <span ref={ref} className={className}>
            {value}
        </span>
    );
}
