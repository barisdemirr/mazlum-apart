const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-10" -> "Ekim 2026" ; short=true -> "Ekim" */
export function monthLabel(key, { short = false } = {}) {
    const [y, m] = String(key).split("-").map(Number);
    return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

const parse = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
};

/** a - b gün olarak (YYYY-MM-DD metinleri, saat dilimi kayması yok) */
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
