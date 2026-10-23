import { bffPost } from "@/lib/api/bff";

/**
 * Ön başvuru (dolu oda ilanında "fiyatlar açıklanınca haber ver"). Tarayıcıdan, vekil üzerinden gider.
 * payload: { fullName, phone (10 hane), roomSlug?, note?, lang, kvkk }  ->  { already }
 * Hata: ApiError. 400 -> errors { fullName | phone | note | kvkk }, 409 -> ön başvuru kapalı, 429 -> çok fazla deneme.
 */
export const submitPreRegistration = (payload) => bffPost("/pre-registrations", payload);

/** Sitede gösterilecek başlık: tarih bugün ya da ileride ise tarihli, değilse "yakında" */
export function preRegistrationTitle(announceDate, copy, tpl, locale) {
    if (!announceDate) return copy.titleSoon;
    const [y, m, d] = String(announceDate).split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || date < today) return copy.titleSoon;
    const text = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
    return tpl(copy.titleDate, { date: text });
}
