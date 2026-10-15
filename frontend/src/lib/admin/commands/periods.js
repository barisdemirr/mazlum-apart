import { admin } from "@/lib/admin/api";

/** Dönem komutları. Her biri tek bir backend ucuna karşılık gelir; doğrulama ve kurallar backend'dedir. */
const dateOrNull = (v) => (v ? v : null);

export const createPeriod = (i) =>
    admin.post("/periods", { name: i.name?.trim(), type: i.type, start: i.start, end: i.end, copyFromPeriodId: i.copyFromPeriodId || null });

export const updatePeriod = ({ id, name, start, end, applicationsOpen, halfTerm }) =>
    admin.put(`/periods/${id}`, {
        name: name?.trim(),
        start,
        end,
        applicationsOpen: Boolean(applicationsOpen),
        halfTerm: { enabled: Boolean(halfTerm?.enabled), firstEnd: dateOrNull(halfTerm?.firstEnd), secondStart: dateOrNull(halfTerm?.secondStart) },
    });

export const closePeriod = ({ id }) => admin.post(`/periods/${id}/close`);

export const savePrice = ({ periodId, roomTypeId, monthly, deposit }) =>
    admin.put(`/periods/${periodId}/prices/${roomTypeId}`, { monthly: Number(monthly), deposit: Number(deposit) });
