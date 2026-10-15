import { admin } from "@/lib/admin/api";

/** Başvuru, kayıt ve yerleşim komutları */

/** Ofis kaydı: web başvurusuyla aynı alanlar (düz ApplicationInput) */
export const createApplication = (i) =>
    admin.post("/applications", {
        periodId: i.periodId,
        roomTypeId: i.roomTypeId,
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

/** Yanıt: { enrollmentId, studentId, phone, initialPassword, charges } — initialPassword YALNIZCA burada döner */
export const approveApplication = ({ id }) => admin.post(`/applications/${id}/approve`);

export const rejectApplication = ({ id, reason }) => admin.post(`/applications/${id}/reject`, { reason });

export const placeStudent = ({ enrollmentId, roomId, start, end }) =>
    admin.post(`/enrollments/${enrollmentId}/placements`, { roomId, start: start || null, end: end || null });

export const movePlacement = ({ enrollmentId, roomId, date }) => admin.post(`/enrollments/${enrollmentId}/move`, { roomId, date });

export const endEnrollment = ({ enrollmentId, status, effectiveDate, reason }) =>
    admin.post(`/enrollments/${enrollmentId}/end`, { status, effectiveDate, reason });

/** Yerleştirme penceresindeki uygun odalar (tarih aralığındaki en yoğun dolulukla) */
export const getRoomOptions = ({ enrollmentId, from, to, excludeRoomId }) =>
    admin.get(`/enrollments/${enrollmentId}/room-options`, { from, to, excludeRoomId });

/** Başvuru detayı (form bilgileri + onayda oluşacak ödeme planı önizlemesi) */
export const getApplication = ({ id }) => admin.get(`/applications/${id}`);
