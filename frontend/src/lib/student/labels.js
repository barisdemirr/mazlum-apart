import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/dictionaries";

/** "2026-11" -> "Kasım 2026" */
export function monthLabel(month, locale = "tr", { withYear = true } = {}) {
    const [year, m] = month.split("-").map(Number);
    const text = new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? INTL_LOCALES.tr, {
        month: "long",
        ...(withYear ? { year: "numeric" } : {}),
    }).format(new Date(year, m - 1, 1));
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** Kalem başlığı: "Depozito" ya da "3. Ay · Kasım 2026 kirası" */
export function chargeLabel(item, copy, locale) {
    if (item.kind === "deposit") return copy.deposit;
    return interpolate(copy.rentLabel, { index: item.index, month: monthLabel(item.month, locale) });
}

/** "10000000146" -> "100******46" (kimlik numarası ekranda hiçbir zaman tam gösterilmez) */
export function maskTc(tc) {
    const value = String(tc ?? "");
    return value.length === 11 ? `${value.slice(0, 3)}${"*".repeat(6)}${value.slice(-2)}` : "";
}

/** "2026-10-08T14:20:00" -> "08/10/2026 · 14:20" */
export function formatDateTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
