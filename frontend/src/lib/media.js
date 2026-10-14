import { localized } from "@/lib/i18n/localized";

const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5252").replace(/\/$/, "");

const VARIANTS = { lg: "_lg.webp", md: "_md.webp", thumb: "_thumb.webp" };

/**
 * Backend MediaItem ({ url, alt }) veya yol metninden tam adres üretir.
 * size: "lg" (1600px, varsayılan) | "md" (800px, kartlar) | "thumb" (200px)
 */
export function mediaUrl(media, size = "lg") {
    const path = typeof media === "string" ? media : media?.url;
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const resized = size === "lg" ? path : path.replace(VARIANTS.lg, VARIANTS[size] ?? VARIANTS.lg);
    return `${BASE}${resized}`;
}

/** Görselin seçili dildeki alt metni (yoksa fallback) */
export function mediaAlt(media, locale = "tr", fallback = "") {
    return localized(media?.alt, locale) || fallback;
}
