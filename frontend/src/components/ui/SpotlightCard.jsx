"use client";

import { useRef } from "react";

/**
 * Üzerinde gezinen imleci takip eden yumuşak ışık (spotlight) efekti veren cam kart.
 * İmleç konumu CSS değişkenlerine yazılır; yeniden render olmadığı için akıcıdır.
 */
export default function SpotlightCard({ children, className = "", ...props }) {
    const ref = useRef(null);

    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };

    return (
        <div
            ref={ref}
            onMouseMove={onMove}
            className={`glass-card group relative overflow-hidden border border-orchid-petal/40 shadow-sm transition-shadow duration-500 hover:shadow-xl ${className}`}
            {...props}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                    background:
                        "radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgb(245 154 196 / 0.28), transparent 70%)",
                }}
            />
            <div className="relative flex h-full flex-col justify-between gap-6">{children}</div>
        </div>
    );
}
