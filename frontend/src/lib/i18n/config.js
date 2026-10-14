export const LOCALES = ["tr", "en"];
export const DEFAULT_LOCALE = "tr";

export const OG_LOCALES = { tr: "tr_TR", en: "en_US" };

// Sayı ve tarih biçimleri için
export const INTL_LOCALES = { tr: "tr-TR", en: "en-GB" };

export const isLocale = (value) => LOCALES.includes(value);

/**
 * "/odalar" + "en" -> "/en/odalar"
 * Türkçe (varsayılan) öneksizdir. Dış bağlantılar, #anchor, tel: gibi değerler olduğu gibi döner.
 */
export function localizedPath(locale, path) {
    if (typeof path !== "string" || !path.startsWith("/")) return path;
    if (locale === DEFAULT_LOCALE) return path;
    if (path === `/${locale}` || path.startsWith(`/${locale}/`) || path.startsWith(`/${locale}?`)) return path;
    return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** "/en/odalar" -> "/odalar" */
export function stripLocale(pathname) {
    const match = pathname.match(/^\/(tr|en)(\/.*)?$/);
    return match ? match[2] || "/" : pathname;
}
