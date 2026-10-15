/**
 * Komut altyapısı. Her komut saf bir fonksiyondur: (state, input, ctx) -> { state, result }.
 * Hata durumunda DomainError fırlatır (arayüz mesajı doğrudan gösterir; backend'de 409/400 olur).
 * Panelde bu fonksiyonlar bellekteki durum üzerinde çalışır; backend gelince her biri bir endpoint olur.
 */
export class DomainError extends Error {
    constructor(message, code = "invalid") {
        super(message);
        this.code = code;
    }
}

export const fail = (message, code) => {
    throw new DomainError(message, code);
};

/** Sıralı kimlik üretir: ("pay", state) -> { id: "pay-12", state: {...seq+1} } */
export function nextId(state, prefix) {
    const seq = (state.seq ?? 1) + 1;
    return { id: `${prefix}-${seq}`, state: { ...state, seq } };
}

/** Kapalı dönemde yasak işlemler (plan 3.3): yeni başvuru, kayıt ve yerleşim açılamaz */
export function assertPeriodOpen(state, periodId, what = "Bu işlem") {
    const period = state.periods.find((p) => p.id === periodId);
    if (!period) fail("Dönem bulunamadı.", "not_found");
    if (period.status === "closed") fail(`${what} kapalı dönemde yapılamaz.`, "period_closed");
    return period;
}

export function requirePeriod(state, periodId) {
    const period = state.periods.find((p) => p.id === periodId);
    if (!period) fail("Dönem bulunamadı.", "not_found");
    return period;
}

export function find(list, id, label) {
    const item = list.find((x) => x.id === id);
    if (!item) fail(`${label} bulunamadı.`, "not_found");
    return item;
}

/** İşlem geçmişi kaydı (AuditLog): kim, ne zaman, ne yaptı, önce/sonra */
export function withAudit(state, ctx, { action, entity, entityId, periodId = null, before = null, after = null, note = "" }) {
    const { id, state: next } = nextId(state, "aud");
    return {
        ...next,
        audit: [
            { id, at: ctx.now, by: ctx.by, action, entity, entityId, periodId, before, after, note },
            ...next.audit,
        ],
    };
}

export const studentName = (s) => (s ? `${s.firstName} ${s.lastName}` : "");
