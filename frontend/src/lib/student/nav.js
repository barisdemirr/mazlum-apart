import { stripLocale } from "@/lib/i18n/config";

/** Portal menüsü: label anahtarı dictionaries.studentPortal.nav altındadır */
export const PORTAL_NAV = [
    { key: "summary", href: "/ogrenci", icon: "grid_view" },
    { key: "payments", href: "/ogrenci/odemeler", icon: "payments" },
    { key: "maintenance", href: "/ogrenci/ariza", icon: "build" },
    { key: "renewal", href: "/ogrenci/kayit-yenile", icon: "autorenew" },
    { key: "profile", href: "/ogrenci/bilgilerim", icon: "person" },
];

/** Geçerli adrese göre aktif menü (dil öneki yok sayılır) */
export function getActivePortalHref(pathname) {
    const current = stripLocale(pathname || "/").replace(/\/$/, "") || "/";
    const match = PORTAL_NAV.find((item) => (item.href === "/ogrenci" ? current === "/ogrenci" : current.startsWith(item.href)));
    return match?.href ?? null;
}
