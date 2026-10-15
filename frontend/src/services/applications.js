/**
 * Başvuru servisi. Şimdilik sahte veri döner; backend hazır olunca yorumdaki adresler kullanılır.
 */

// GEÇİCİ: dönem bilgisi panelden (Dönem yönetimi) gelecek
const MOCK_PERIOD = {
    id: "2026-2027",
    name: "2026–2027",
    start: "2026-09-01",
    end: "2027-06-30",
};

/**
 * Başvuru formunun ayarları: açık dönem ve yarım dönem durumu.
 * halfTerm: yönetici Dönemler sayfasından açana kadar `enabled:false` (form yalnızca tam dönemdir, yarım dönem hiç gösterilmez).
 * Açıldığında: { enabled:true, firstEnd: "2027-01-29", secondStart: "2027-02-08" } → form "1. Yarıyıl / 2. Yarıyıl" seçeneklerini gösterir.
 * Backend: dönemin (Period) halfTerm alanını aynen döndürür.
 */
export async function getApplicationConfig() {
    // return apiGet("/api/applications/config", { revalidate: 60 });
    return {
        period: MOCK_PERIOD,
        halfTerm: { enabled: false, firstEnd: null, secondStart: null },
    };
}

/**
 * Başvuruyu gönderir.
 * payload: { roomSlug, bedId, term: "full" | "first" | "second", entryDate, payDay, firstName, lastName, tc, birthDate, phone (10 hane),
 *            address, provinceId, district, school, faculty, department, grade, guardians: [{ name, phone }] }
 * Dönüş: { applicationNo }
 */
export async function submitApplication(payload) {
    // return apiPost("/api/applications", payload, { revalidate: 0 });
    await new Promise((resolve) => setTimeout(resolve, 1600));
    // GEÇİCİ: gerçek numara backend'den gelir
    return { applicationNo: "MA-2026-0142", received: Boolean(payload) };
}
