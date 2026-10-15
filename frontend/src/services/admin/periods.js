import "server-only";

/**
 * Dönem listesi. Şimdilik MOCK; backend hazır olunca:
 *   const data = await apiGet("/admin/periods");
 *
 * Dönem kuralı: bir dönemin muhasebesi başka bir dönemle karışmaz. Aynı anda tek aktif akademik dönem vardır.
 * status: "active" | "closed"   type: "academic" | "summer"
 */
export const MOCK_PERIODS = [
    { id: "p-2026-27", name: "2026–2027 Akademik", type: "academic", start: "2026-09-01", end: "2027-06-30", status: "active" },
    { id: "p-2026-yaz", name: "2026 Yaz", type: "summer", start: "2026-07-01", end: "2026-08-31", status: "closed" },
    { id: "p-2025-26", name: "2025–2026 Akademik", type: "academic", start: "2025-09-01", end: "2026-06-30", status: "closed" },
];

export async function getPeriods() {
    return MOCK_PERIODS;
}

/** Çerezdeki kimlik geçerliyse o dönem, değilse aktif dönem */
export function pickPeriod(periods, selectedId) {
    return periods.find((p) => p.id === selectedId) ?? periods.find((p) => p.status === "active") ?? periods[0];
}
