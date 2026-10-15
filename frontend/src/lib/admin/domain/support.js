import { fail, find, nextId, withAudit } from "./core";

/**
 * Destek komutları: iletişim kaydı (ContactLog) ve arıza durumu.
 * İletişim kaydı "son iletişim tarihi"ni besler; yaklaşan/geciken listelerinde görünür.
 */

export function logContact(state, { enrollmentId, purpose, channel = "whatsapp", note = "" }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    const made = nextId(state, "ctc");
    const entry = { id: made.id, periodId: enrollment.periodId, enrollmentId, purpose: purpose ?? "other", channel, note, at: ctx.now, by: ctx.by };
    return { state: { ...made.state, contacts: [entry, ...made.state.contacts] }, result: entry };
}

export function updateMaintenance(state, { id, status, adminNote }, ctx) {
    const item = find(state.maintenance, id, "Arıza kaydı");
    if (status && !["received", "in_progress", "done"].includes(status)) fail("Geçersiz durum.");
    const next = { ...item, status: status ?? item.status, adminNote: adminNote ?? item.adminNote, updatedAt: ctx.now };
    const s = withAudit({ ...state, maintenance: state.maintenance.map((m) => (m.id === id ? next : m)) }, ctx, {
        action: "maintenance.update", entity: "maintenance", entityId: id, periodId: item.periodId, before: { status: item.status }, after: { status: next.status },
    });
    return { state: s, result: next };
}
