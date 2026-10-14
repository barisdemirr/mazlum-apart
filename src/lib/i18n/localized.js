/**
 * Backend'in çok dilli alanından seçili dili okur: { tr, en } -> metin.
 * Seçili dil boşsa Türkçeye düşer (backend kuralıyla aynı).
 */
export function localized(field, locale = "tr") {
    if (field == null) return "";
    if (typeof field === "string") return field;
    return field[locale]?.trim() ? field[locale] : field.tr ?? "";
}
