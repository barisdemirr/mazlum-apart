/**
 * Giriş yapmış öğrencinin kendi verisi. Şimdilik MOCK.
 *
 * Gerçek istek (token çerezden proxy ile eklenir):
 *   return apiGet("/student/me");
 *
 * Alan adları backend sözleşmesiyle aynı tutulur; çok dilli alanlar { tr, en }.
 */
const MOCK_STUDENT = {
    id: "student-1",
    firstName: "Elif",
    lastName: "Demir",
    phone: "5000000000",
    room: {
        typeName: { tr: "İki Kişilik Oda", en: "Double Room" },
        flat: "Daire 4",
        roomName: "Oda 2",
        bed: "Yatak B",
        flatPeople: 4,
    },
    entryDate: "2026-09-01",
    period: { id: "2026-2027", name: "2026–2027", start: "2026-09-01", end: "2027-06-30" },
};

export async function getStudentProfile() {
    return MOCK_STUDENT;
}
