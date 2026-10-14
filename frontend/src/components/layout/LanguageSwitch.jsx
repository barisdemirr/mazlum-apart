"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_SOFT } from "@/lib/motion";

/**
 * TR / EN seçici. Aktif dilin arkasındaki beyaz hap, seçim değişince kayarak taşınır.
 * `id`: aynı sayfada iki seçici varsa (navbar + mobil menü) animasyonlar karışmasın diye.
 */
export default function LanguageSwitch({ id = "lang", dark = false, className = "" }) {
    const { locale, supported, setLocale, isSwitching, t } = useLanguage();

    return (
        <div
            role="group"
            aria-label={t.nav.language}
            className={`flex items-center rounded-full border p-1 text-xs font-semibold transition-opacity ${
                dark ? "border-white/20 bg-white/10 text-white/70" : "border-orchid-petal/30 bg-orchid-lilac/40 text-orchid-muted"
            } ${isSwitching ? "opacity-60" : ""} ${className}`}
        >
            {supported.map((code) => {
                const active = code === locale;
                return (
                    <button
                        key={code}
                        type="button"
                        onClick={() => setLocale(code)}
                        aria-pressed={active}
                        lang={code}
                        className={`relative rounded-full px-2.5 py-1 transition-colors ${
                            active ? "text-orchid-pink" : dark ? "hover:text-white" : "hover:text-orchid-dark"
                        }`}
                    >
                        {active && (
                            <motion.span
                                layoutId={`${id}-pill`}
                                transition={SPRING_SOFT}
                                className="absolute inset-0 rounded-full bg-white shadow-sm"
                            />
                        )}
                        <span className="relative">{code.toUpperCase()}</span>
                    </button>
                );
            })}
        </div>
    );
}
