import { INTL_LOCALES } from "@/lib/i18n/config";

const SYMBOLS = { TRY: "₺", USD: "$", EUR: "€" };

/** formatPrice(12500, "TRY", "tr") -> "₺12.500" */
export function formatPrice(amount, currency = "TRY", locale = "tr") {
    if (amount == null || Number.isNaN(Number(amount))) return "";

    const number = new Intl.NumberFormat(INTL_LOCALES[locale] ?? INTL_LOCALES.tr, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(amount));

    return `${SYMBOLS[currency] ?? currency}${number}`;
}

/** "YYYY-MM-DD" metnini saat dilimi kayması olmadan yerel tarihe çevirir */
export function parseDateOnly(value) {
    if (value instanceof Date) return value;
    const [y, m, d] = String(value).split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** "2026-12-05" -> "05/12/2026" (sitede tarih her yerde gg/aa/yyyy) */
export function formatDate(value) {
    if (!value) return "";
    const date = parseDateOnly(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** formatPercent(31, "tr") -> "%31", formatPercent(31, "en") -> "31%" */
export function formatPercent(value, locale = "tr") {
    return locale === "en" ? `${value}%` : `%${value}`;
}

const TR_ZONE = "Europe/Istanbul";

/** Bir an (ISO, UTC) -> Türkiye saatiyle "YYYY-MM-DD" (sunucu hangi saat diliminde olursa olsun aynı sonuç) */
export function turkeyDate(iso) {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", { timeZone: TR_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
