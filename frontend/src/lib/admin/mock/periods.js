/**
 * Dönem listesi (GEÇİCİ örnek veri). Backend hazır olunca GET /api/admin/periods.
 * Kural: bir dönemin muhasebesi başka bir dönemle karışmaz. Aynı anda tek aktif akademik dönem vardır.
 * status: "active" | "closed"   type: "academic" | "summer"
 * halfTerm: yarım dönem varsayılan KAPALI; tarihler müşteriden gelince dönem ayarından açılır.
 */
export const MOCK_PERIODS = [
    { id: "p-2026-27", name: "2026–2027 Akademik", type: "academic", start: "2026-09-01", end: "2027-06-30", status: "active", applicationsOpen: true, halfTerm: { enabled: false, firstEnd: null, secondStart: null } },
    { id: "p-2026-yaz", name: "2026 Yaz", type: "summer", start: "2026-07-01", end: "2026-08-31", status: "closed", applicationsOpen: false, halfTerm: { enabled: false, firstEnd: null, secondStart: null } },
    { id: "p-2025-26", name: "2025–2026 Akademik", type: "academic", start: "2025-09-01", end: "2026-06-30", status: "closed", applicationsOpen: false, halfTerm: { enabled: false, firstEnd: null, secondStart: null } },
];
