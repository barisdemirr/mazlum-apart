import { bffDelete, bffGet, bffPost, bffPut } from "@/lib/api/bff";

/**
 * Öğrenci portalı: çıkış ve geçici ayrılış (tarayıcıdan, vekil üzerinden). Kayıt kimliği gönderilmez:
 * sunucu öğrencinin güncel kaydını token'dan seçer. Yanıt kodları: ApiError (400 doğrulama, 409 çakışma/kilit).
 */
export const getDepartures = () => bffGet("/student/departures");

export const reportExit = ({ exitDate, note }) => bffPost("/student/departures/exit", { exitDate: exitDate || null, note: note || null });
export const updateExit = ({ exitDate, note }) => bffPut("/student/departures/exit", { exitDate: exitDate || null, note: note || null });
export const retractExit = () => bffDelete("/student/departures/exit");

export const reportLeave = ({ leaveDate, plannedReturnDate, note }) => bffPost("/student/departures/leaves", { leaveDate, plannedReturnDate, note: note || null });
export const updateLeave = ({ id, leaveDate, plannedReturnDate, note }) => bffPut(`/student/departures/leaves/${id}`, { leaveDate, plannedReturnDate, note: note || null });
export const markReturned = ({ id }) => bffPost(`/student/departures/leaves/${id}/return`);
export const cancelLeave = ({ id }) => bffDelete(`/student/departures/leaves/${id}`);
