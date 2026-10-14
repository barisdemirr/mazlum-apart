"use client";

import { useEffect, useState } from "react";
import { PRELOADER_DURATION, PRELOADER_STORAGE_KEY, SITE } from "@/lib/constants";

const LETTERS = Array.from(SITE.name);

/**
 * ~1 sn'lik açılış: harfler belirir, eğri bir perde yukarı çekilir.
 * Animasyon tamamen CSS'tedir (globals.css #preloader); bu bileşen yalnızca
 *  - oturumda bir kez oynatır (sessionStorage),
 *  - süre bitince DOM'dan kaldırır.
 * Perde her zaman pointer-events: none olduğundan sayfa hiçbir an kilitlenmez.
 */
export default function Preloader() {
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        let seen = false;
        try {
            seen = sessionStorage.getItem(PRELOADER_STORAGE_KEY) === "1";
            sessionStorage.setItem(PRELOADER_STORAGE_KEY, "1");
        } catch {
            // Depolama kapalıysa her seferinde oynar; sorun değil
        }

        if (seen) {
            setMounted(false);
            return;
        }
        const timer = setTimeout(() => setMounted(false), PRELOADER_DURATION + 100);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div id="preloader" aria-hidden="true" className="flex items-center justify-center">
            <div className="relative flex flex-col items-center gap-4">
                <div className="flex font-display text-4xl sm:text-6xl font-semibold tracking-tight text-orchid-dark">
                    {LETTERS.map((char, i) => (
                        <span
                            key={i}
                            className={`inline-block animate-fade-char ${i >= 7 ? "italic text-orchid-pink" : ""}`}
                            style={{ animationDelay: `${i * 35}ms` }}
                        >
                            {char === " " ? " " : char}
                        </span>
                    ))}
                </div>
                <span className="h-px w-24 bg-gradient-to-r from-transparent via-orchid-petal to-transparent animate-pulse-glow" />
            </div>
        </div>
    );
}
