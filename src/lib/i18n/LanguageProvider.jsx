"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { interpolate } from "./dictionaries";
import { getDictionary } from "./getDictionary";
import { LOCALES, isLocale, localizedPath, stripLocale } from "./config";

const LanguageContext = createContext(null);

export function LanguageProvider({ locale, children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const value = useMemo(
        () => ({
            locale, // "tr" | "en" (adresler, backend alanları)
            supported: LOCALES,
            t: getDictionary(locale),
            tpl: interpolate,
            isSwitching: isPending,
            // Dile uygun iç bağlantı: href("/odalar") -> "/en/odalar"
            href: (path) => localizedPath(locale, path),
            // Aynı sayfayı seçilen dilde açar (arama ve # korunur)
            setLocale: (next) => {
                const target = String(next).toLowerCase();
                if (!isLocale(target) || target === locale) return;

                const path = localizedPath(target, stripLocale(pathname));
                startTransition(() => {
                    router.push(`${path}${window.location.search}${window.location.hash}`);
                });
            },
        }),
        [locale, pathname, router, isPending]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
    return ctx;
}
