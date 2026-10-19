/**
 * Panelden girilen düz yazıyı paragraflara böler: boş satır yeni paragraf, tek satır sonu paragraf içinde alt satır.
 * Paragraflar `whitespace-pre-line` ile çizilir ki tek satır sonları da görünsün.
 *   toParagraphs("Bir\nİki\n\nÜç") -> ["Bir\nİki", "Üç"]
 */
export function toParagraphs(text) {
    return String(text ?? "")
        .replace(/\r\n?/g, "\n")
        .split(/\n[ \t]*\n+/)
        .map((p) => p.replace(/^\n+|\n+$/g, "").replace(/[ \t]+$/gm, ""))
        .filter((p) => p.trim().length > 0);
}
