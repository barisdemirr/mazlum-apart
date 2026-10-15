"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { interpolate } from "./dictionaries";
import { getDictionary } from "./getDictionary";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, LOCALES, isLocale, isStudentPath, localizedPath, stripLocale } from "./config";

const LanguageContext = createContext(null);

export function LanguageProvider({ locale, children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const inPortal = isStudentPath(pathname);

    const value = useMemo(
        () => ({
            locale, // "tr" | "en" (adresler, backend alanları)
            supported: LOCALES,
            t: getDictionary(locale),
            tpl: interpolate,
            isSwitching: isPending,
            // Dile uygun iç bağlantı: href("/odalar") -> "/en/odalar"
            // Öğrenci portalının İÇİNDE portal adresleri öneksiz kalır (PWA kapsamı /ogrenci; dil çerezden gelir)
            href: (path) => (inPortal && isStudentPath(path) ? stripLocale(path) : localizedPath(locale, path)),
            // Aynı sayfayı seçilen dilde açar (arama ve # korunur)
            setLocale: (next) => {
                const target = String(next).toLowerCase();
                if (!isLocale(target) || target === locale) return;

                // Portalda dil adrese değil çereze yazılır; sayfa yeni dille yeniden yüklenir
                if (inPortal) {
                    try {
                        document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
                    } catch {}
                    window.location.reload();
                    return;
                }

                const path = localizedPath(target, stripLocale(pathname));
                startTransition(() => {
                    router.push(`${path}${window.location.search}${window.location.hash}`);
                });
            },
        }),
        [locale, pathname, router, isPending, inPortal]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
    return ctx;
}
