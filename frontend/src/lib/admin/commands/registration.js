import { admin } from "@/lib/admin/api";

/** Başvuru, kayıt ve yerleşim komutları */

/** Ofis kaydı: web başvurusuyla aynı alanlar (düz ApplicationInput) */
export const createApplication = (i) =>
    admin.post("/applications", {
        periodId: i.periodId,
        roomTypeId: i.roomTypeId,
        stayPlan: i.stayPlan || null,
        term: i.term,
        entryDate: i.entryDate,
        payWindow: i.payWindow,
        firstName: i.firstName,
        lastName: i.lastName,
        tc: i.tc,
        birthDate: i.birthDate,
        phone: i.phone,
        address: i.address,
        provinceId: i.provinceId ? Number(i.provinceId) : null,
        district: i.district,
        school: i.school,
        faculty: i.faculty,
        department: i.department,
        grade: i.grade,
        guardians: i.guardians.map(({ name, phone }) => ({ name, phone })),
        note: i.note || null,
    });

/** Öğrenci belgesi (PDF) ekler ya da değiştirir. Yanıt: { documentName, documentSize } */
export const uploadApplicationDocument = ({ id, file }) => {
    const form = new FormData();
    form.append("document", file, file.name);
    return admin.upload(`/applications/${id}/document`, form);
};

/** Belgeyi açma / indirme adresi (vekil üzerinden, yönetici oturumuyla) */
export const applicationDocumentUrl = (id, download = false) => `/api/backend/admin/applications/${id}/document${download ? "?download=true" : ""}`;

/** Yanıt: { enrollmentId, studentId, phone, initialPassword, charges } — initialPassword YALNIZCA burada döner */
export const approveApplication = ({ id }) => admin.post(`/applications/${id}/approve`);

export const rejectApplication = ({ id, reason }) => admin.post(`/applications/${id}/reject`, { reason });

export const placeStudent = ({ enrollmentId, roomId, start, end }) =>
    admin.post(`/enrollments/${enrollmentId}/placements`, { roomId, start: start || null, end: end || null });

export const movePlacement = ({ enrollmentId, roomId, date }) => admin.post(`/enrollments/${enrollmentId}/move`, { roomId, date });

/** Kayıt süresini iptal etmeden değiştirir (tam dönem ↔ 1. yarı): ödeme planı, yerleşim ve oda müsaitliği birlikte güncellenir. Yanıt: { reversedRents, addedRents, placementsChanged } */
export const changeEnrollmentTerm = ({ enrollmentId, term, reason }) => admin.post(`/enrollments/${enrollmentId}/term`, { term, reason });

/** Dönem bazlı giriş / parmak izi / WhatsApp grubu / sözleşme takibi */
export const saveTracking = ({ enrollmentId, movedIn, movedInDate, fingerprintTaken, whatsAppGroupAdded, contractSigned }) =>
    admin.put(`/enrollments/${enrollmentId}/tracking`, { movedIn, movedInDate: movedIn ? movedInDate || null : null, fingerprintTaken, whatsAppGroupAdded, contractSigned });

export const endEnrollment = ({ enrollmentId, status, effectiveDate, reason }) =>
    admin.post(`/enrollments/${enrollmentId}/end`, { status, effectiveDate, reason });

/** Yerleştirme penceresindeki uygun odalar (tarih aralığındaki en yoğun dolulukla) */
export const getRoomOptions = ({ enrollmentId, from, to, excludeRoomId, roomTypeId }) =>
    admin.get(`/enrollments/${enrollmentId}/room-options`, { from, to, excludeRoomId, roomTypeId });

/** Daire türü / oda tipi değişikliği için seçenekler ve bu dönemdeki fiyatları */
export const getRoomChangeOptions = ({ enrollmentId }) => admin.get(`/enrollments/${enrollmentId}/room-change-options`);

/** Kaydı iptal etmeden daire türü / oda tipi / oda değiştirir. Yanıt: { roomTypeChanged, roomChanged, revisedCharges, monthlyBefore, monthlyAfter } */
export const changeEnrollmentRoom = ({ enrollmentId, roomTypeId, roomId, date, updatePaymentPlan, reason }) =>
    admin.post(`/enrollments/${enrollmentId}/room-change`, { roomTypeId, roomId: roomId || null, date, updatePaymentPlan: Boolean(updatePaymentPlan), reason });

/** Başvuru detayı (form bilgileri + onayda oluşacak ödeme planı önizlemesi) */
export const getApplication = ({ id }) => admin.get(`/applications/${id}`);

/** Öğrenci profili belgeleri: başvuru belgeleri (otomatik) + sonradan yüklenenler */
export const listStudentDocuments = ({ studentId }) => admin.get(`/students/${studentId}/documents`);
export const uploadStudentDocument = ({ studentId, enrollmentId, title, file }) => {
    const form = new FormData();
    form.append("title", title);
    if (enrollmentId) form.append("enrollmentId", enrollmentId);
    form.append("document", file, file.name);
    return admin.upload(`/students/${studentId}/documents`, form);
};
export const deleteStudentDocument = ({ id }) => admin.del(`/student-documents/${id}`);
export const studentDocumentUrl = (id, download = false) => `/api/backend/admin/student-documents/${id}/file${download ? "?download=true" : ""}`;

/** Medya sayfası "Öğrenci belgeleri": belgesi olan başvurular + belge silme */
export const listApplicationDocuments = () => admin.get("/application-documents");
export const deleteApplicationDocument = ({ id }) => admin.del(`/applications/${id}/document`);
