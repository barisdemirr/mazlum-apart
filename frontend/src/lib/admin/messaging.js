import { CHARGE_KIND, date, money } from "@/lib/admin/labels";
import { monthLabel } from "@/lib/admin/month";

/**
 * Mesajlaşma yardımcıları (WhatsApp bağlantısı + SMS). Saf fonksiyonlar, ağ yok.
 * SMS'in gerçek gönderimi backend'de (Netgsm) yapılır; burada yalnızca metin hazırlanır ve uzunluk hesaplanır.
 */

/** "{ad}" gibi değişkenleri doldurur; değeri olmayan değişken olduğu gibi kalır (arayüz uyarır) */
export function fillTemplate(text, vars) {
    return text.replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined && vars[key] !== "" ? vars[key] : m));
}

export const hasUnfilled = (text) => /\{\w+\}/.test(text);

export function whatsappLink(phone, text) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    const full = digits.startsWith("90") ? digits : `90${digits.replace(/^0/, "")}`;
    return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Bir öğrenci satırı (+ isteğe bağlı borç kalemi) için şablon değişkenleri */
export function messageVars(row, item, extra = {}) {
    const student = row.student;
    return {
        ad: student.firstName,
        telefon: student.phone,
        oda: row.room?.label ?? "odanız",
        tutar: item ? money(item.remaining) : money(row.summary.remaining),
        vade: item ? date(item.dueDate) : "",
        kalem: item ? `${CHARGE_KIND[item.kind]}${item.kind === "rent" ? ` (${monthLabel(item.month, { short: true })})` : ""}` : "ödeme",
        ...extra,
    };
}

/**
 * SMS uzunluğu. Türkçe karakter (ç ğ ı İ ş Ş Ğ ö ü) içeren mesajlar 70 karakterlik (çoklu: 67) bloklarla,
 * diğerleri 160 (çoklu: 153) ile sayılır. Bu bir TAHMİNdir; kesin kredi kullanımını sağlayıcı hesaplar.
 */
export function smsInfo(text) {
    const value = String(text ?? "");
    const length = [...value].length;
    const unicode = /[^\x20-\x7E\n\r]/.test(value); // ASCII dışı (Türkçe) karakter varsa Unicode say
    const single = unicode ? 70 : 160;
    const multi = unicode ? 67 : 153;
    const parts = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
    return { length, unicode, parts, perPart: parts > 1 ? multi : single };
}
