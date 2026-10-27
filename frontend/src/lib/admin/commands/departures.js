import { admin } from "@/lib/admin/api";

/** Çıkış, geçici ayrılış ve daire durumu komutları (madde 18). Kayıt, yerleşim, borç ve tahsilata dokunmaz. */

/** Kaydın çıkış + ayrılış bilgisi: { state, exit, leaves[] } */
export const getDepartures = ({ enrollmentId }) => admin.get(`/enrollments/${enrollmentId}/departures`);

/** confirm: true ise girilir girilmez onaylı olur */
export const reportExit = ({ enrollmentId, exitDate, note, confirm }) =>
    admin.post(`/enrollments/${enrollmentId}/exit`, { exitDate: exitDate || null, note: note || null, confirm: Boolean(confirm) });

export const updateExit = ({ enrollmentId, exitDate, note }) =>
    admin.put(`/enrollments/${enrollmentId}/exit`, { exitDate: exitDate || null, note: note || null });

export const confirmExit = ({ enrollmentId }) => admin.post(`/enrollments/${enrollmentId}/exit/confirm`);

export const unconfirmExit = ({ enrollmentId }) => admin.post(`/enrollments/${enrollmentId}/exit/unconfirm`);

export const deleteExit = ({ enrollmentId }) => admin.del(`/enrollments/${enrollmentId}/exit`);

export const addLeave = ({ enrollmentId, leaveDate, plannedReturnDate, note }) =>
    admin.post(`/enrollments/${enrollmentId}/leaves`, { leaveDate, plannedReturnDate, note: note || null });

/** clearReturn: true ise "Döndü" işareti geri alınır */
export const updateLeave = ({ id, leaveDate, plannedReturnDate, note, clearReturn }) =>
    admin.put(`/leaves/${id}`, { leaveDate, plannedReturnDate, note: note || null, clearReturn: Boolean(clearReturn) });

/** returnedOn boşsa bugün */
export const markReturned = ({ id, returnedOn }) => admin.post(`/leaves/${id}/return`, { returnedOn: returnedOn || null });

export const deleteLeave = ({ id }) => admin.del(`/leaves/${id}`);

/** readiness: needs_cleaning | needs_repair | ready | "" (işareti kaldırır) */
export const setReadiness = ({ apartmentId, readiness, note }) =>
    admin.put(`/apartments/${apartmentId}/readiness`, { readiness: readiness || null, note: note || null });

export const setBoiler = ({ apartmentId, boilerOn }) => admin.put(`/apartments/${apartmentId}/boiler`, { boilerOn: Boolean(boilerOn) });

/** Tarih aralığında tamamen boş kalacak daireler */
export const getVacancies = ({ from, to }) => admin.get("/apartments/vacancies", { from, to });
