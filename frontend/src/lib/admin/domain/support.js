import { fail, find, nextId, studentName, withAudit } from "./core";

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

/**
 * SMS gönderimi (tekli ya da toplu). Şimdilik MOCK: mesajlar "kuyruğa alındı" sayılır ve iletişim kaydına yazılır.
 * Gerçekte backend Verimor toplu SMS servisine iletir; kimlik bilgileri yalnızca sunucuda tutulur.
 * messages: [{ enrollmentId, text, purpose }]
 * Her SMS, iletişim geçmişine kanal "sms" olarak yazılır (son iletişim tarihini de besler).
 */
export function sendSms(state, { messages }, ctx) {
    if (!Array.isArray(messages) || messages.length === 0) fail("Gönderilecek mesaj yok.");
    let s = state;
    const sent = [];
    const skipped = [];
    for (const m of messages) {
        const enrollment = find(s.enrollments, m.enrollmentId, "Kayıt");
        const student = s.students.find((x) => x.id === enrollment.studentId);
        const text = String(m.text ?? "").trim();
        if (!text) { skipped.push({ name: studentName(student), reason: "Mesaj boş" }); continue; }
        if (/\{\w+\}/.test(text)) { skipped.push({ name: studentName(student), reason: "Doldurulmamış değişken var" }); continue; }
        if (!/^5\d{9}$/.test(String(student?.phone ?? ""))) { skipped.push({ name: studentName(student), reason: "Telefon numarası geçersiz" }); continue; }
        const made = nextId(s, "ctc");
        const entry = { id: made.id, periodId: enrollment.periodId, enrollmentId: enrollment.id, purpose: m.purpose ?? "other", channel: "sms", note: text, delivery: "queued", at: ctx.now, by: ctx.by };
        s = { ...made.state, contacts: [entry, ...made.state.contacts] };
        sent.push(entry);
    }
    if (sent.length === 0) fail(`Hiçbir SMS gönderilemedi: ${skipped[0]?.reason ?? "geçersiz mesaj"}.`);
    if (sent.length > 1) {
        s = withAudit(s, ctx, { action: "sms.bulk", entity: "sms", entityId: sent[0].id, periodId: sent[0].periodId, after: { count: sent.length, skipped: skipped.length } });
    }
    return { state: s, result: { sent, skipped } };
}
