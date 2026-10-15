/** Tarih yardımcıları: tüm tarihler "YYYY-MM-DD" metnidir, saat dilimi kayması olmaz. */
const pad = (n) => String(n).padStart(2, "0");

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISO(value) {
    const [y, m, d] = String(value).split("-").map(Number);
    return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso, days) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + days);
    return toISO(d);
}

/** a - b, gün olarak (negatifse a, b'den önce) */
export function diffDays(a, b) {
    const ms = parseISO(a) - parseISO(b);
    return Math.round(ms / 86400000);
}

/** "2026-10-05" -> "2026-10" */
export const monthKey = (iso) => String(iso).slice(0, 7);

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-10" -> "Ekim 2026" ; short=true -> "Ekim" */
export function monthLabel(key, { short = false } = {}) {
    const [y, m] = String(key).split("-").map(Number);
    return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

export const addMonthsKey = (key, n) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
