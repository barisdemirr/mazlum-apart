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

/**
 * Öğrenci portalı (/ogrenci) PWA olarak kurulabildiği için adresi dil önekine BÖLÜNMEZ: Türkçe ve İngilizce
 * aynı /ogrenci/... adresindedir (PWA kapsamı tek bir yol önekidir). Dil bu çerezde tutulur; middleware çerezi
 * okuyup içeride /en/ogrenci/... olarak yeniden yazar. Herkese açık site önceki gibi /en önekini kullanır.
 */
export const LANG_COOKIE = "ma_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const STUDENT_PREFIX = "/ogrenci";

/** Dil öneki yok sayılarak: "/en/ogrenci/odemeler" ve "/ogrenci" öğrenci alanıdır */
export const isStudentPath = (pathname) => {
    const path = stripLocale(pathname || "/");
    return path === STUDENT_PREFIX || path.startsWith(`${STUDENT_PREFIX}/`);
};
