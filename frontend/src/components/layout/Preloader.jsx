"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SiteLoader from "@/components/ui/SiteLoader";
import { stripLocale } from "@/lib/i18n/config";
import { PRELOADER_DURATION, PRELOADER_STORAGE_KEY, BRAND_NAME } from "@/lib/constants";

const LETTERS = Array.from(BRAND_NAME);

/**
 * ~1 sn'lik açılış: markalı yükleme animasyonu (SiteLoader) görünür, eğri bir perde yukarı çekilir (öğrenci alanında: harfler belirir).
 * Animasyon tamamen CSS'tedir (globals.css #preloader); bu bileşen yalnızca
 *  - oturumda bir kez oynatır (sessionStorage),
 *  - süre bitince DOM'dan kaldırır.
 * Perde her zaman pointer-events: none olduğundan sayfa hiçbir an kilitlenmez.
 */
export default function Preloader() {
    const [mounted, setMounted] = useState(true);
    // Öğrenci alanı eski harf animasyonunu korur; markalı yükleme animasyonu yalnızca genel sitede gösterilir
    const portal = stripLocale(usePathname() || "/").startsWith("/ogrenci");

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

    if (!portal) {
        return (
            <div id="preloader" aria-hidden="true" className="flex items-center justify-center">
                <SiteLoader />
            </div>
        );
    }

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
