import "server-only";
import { MOCK_PERIODS } from "@/lib/admin/mock/periods";

/**
 * Dönem listesi. Şimdilik MOCK; backend hazır olunca:
 *   const data = await apiGet("/admin/periods");
 */
export async function getPeriods() {
    return MOCK_PERIODS;
}

/** Çerezdeki kimlik geçerliyse o dönem, değilse aktif dönem */
export function pickPeriod(periods, selectedId) {
    return periods.find((p) => p.id === selectedId) ?? periods.find((p) => p.status === "active") ?? periods[0];
}
