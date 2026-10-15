import { monthLabel } from "@/lib/admin/month";

/**
 * Backend satırı -> panel görünümlerinin ortak satır şekli.
 * Backend düz EnrollmentRow döner; WhatsAppButton, listeler ve mesaj değişkenleri { enrollment, student, room, roomType, summary, lastContact }
 * şeklini bekler. Dönüşüm TEK yerde yapılır.
 */
export function adaptRow(r) {
    return {
        enrollment: {
            id: r.id,
            periodId: r.periodId,
            status: r.status,
            entryDate: r.entryDate,
            payWindow: r.payWindow,
            term: r.term,
            roomTypeId: r.roomTypeId,
            endedAt: r.endedAt ?? null,
            endReason: r.endReason ?? null,
            price: { monthly: r.monthlyPrice, deposit: r.depositPrice },
        },
        student: r.student,
        room: r.room ?? null,
        roomType: { id: r.roomTypeId, name: { tr: r.roomTypeName } },
        summary: r.summary,
        lastContact: r.lastContactAt ? { at: r.lastContactAt } : null,
    };
}

/** Geciken / yaklaşan satırı (DueRow): satır + borç kalemi. days: gecikmede geçen gün, yaklaşanda kalan gün */
export function adaptDue(d, kind) {
    return {
        enrollment: { id: d.enrollmentId, status: d.status },
        student: d.student,
        room: d.room ?? null,
        roomType: { name: { tr: d.roomTypeName } },
        summary: { remaining: d.item.remaining },
        lastContact: d.lastContactAt ? { at: d.lastContactAt } : null,
        item: {
            id: d.item.id,
            kind: d.item.kind,
            month: d.item.month,
            dueDate: d.item.dueDate,
            note: d.item.note,
            remaining: d.item.remaining,
            ...(kind === "overdue" ? { lateDays: d.item.days } : { inDays: d.item.days }),
        },
    };
}

/** "Ödenen süre" metni (backend CoveredPeriod: { fullThrough, partial: { month, paid, remaining } }) */
export function describeCovered(covered, fmt) {
    const parts = [];
    if (covered?.fullThrough) parts.push(`${monthLabel(covered.fullThrough, { short: true })} sonuna kadar ödendi`);
    if (covered?.partial) parts.push(`${monthLabel(covered.partial.month, { short: true })} kirasının ${fmt(covered.partial.paid)}'si ödendi`);
    return parts.length ? parts.join("; ") : "Henüz kira ödemesi yok";
}
