import { stripLocale } from "@/lib/i18n/config";

/** Ana gezinme bağlantıları: label anahtarı dictionaries.nav altındadır */
export const NAV_ITEMS = [
    { key: "home", href: "/" },
    { key: "rooms", href: "/odalar" },
    { key: "about", href: "/hakkimizda" },
    { key: "contact", href: "/iletisim" },
];

export const STUDENT_LOGIN_HREF = "/ogrenci/giris";
export const APPLY_HREF = "/basvuru";

/** Geçerli adrese göre aktif bağlantı (dil öneki yok sayılır) */
export function getActiveHref(pathname) {
    const current = stripLocale(pathname || "/");
    const match = NAV_ITEMS.find((item) => (item.href === "/" ? current === "/" : current.startsWith(item.href)));
    return match?.href ?? null;
}
