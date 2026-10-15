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

/** Başvuru formunun ayarları: dönem, kayıt süreleri (panelden açılıp kapatılır) */
export async function getApplicationConfig() {
    // return apiGet("/api/applications/config", { revalidate: 60 });
    return {
        period: MOCK_PERIOD,
        terms: [
            { id: "full", enabled: true },
            { id: "half", enabled: false }, // işletme panelden açınca aktif olur
        ],
    };
}

/**
 * Başvuruyu gönderir.
 * payload: { roomSlug, bedId, term, entryDate, payDay, firstName, lastName, tc, birthDate, phone (10 hane),
 *            address, provinceId, district, school, faculty, department, grade, guardians: [{ name, phone }] }
 * Dönüş: { applicationNo }
 */
export async function submitApplication(payload) {
    // return apiPost("/api/applications", payload, { revalidate: 0 });
    await new Promise((resolve) => setTimeout(resolve, 1600));
    // GEÇİCİ: gerçek numara backend'den gelir
    return { applicationNo: "MA-2026-0142", received: Boolean(payload) };
}
