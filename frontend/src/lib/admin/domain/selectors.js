import { accountBalance, billState, dueLists, periodTotals, round, sum } from "./accounting";
import { enrollmentSummary } from "./ledger";
import { currentRoomOf, occupancyOn } from "./registration";
import { diffDays } from "./dates";

/**
 * Ekranların okuduğu türetilmiş görünümler (saf fonksiyonlar). Hiçbir şey saklanmaz, hepsi hesaplanır.
 * Backend gelince aynı şekiller dashboard/liste uçlarından döner.
 */

const lastContactOf = (state, enrollmentId) =>
    state.contacts.filter((c) => c.enrollmentId === enrollmentId).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;

/** Bir kaydın tek satırlık görünümü: öğrenci + hesap özeti + oda + son iletişim */
export function enrollmentRow(state, enrollment, today) {
    const student = state.students.find((s) => s.id === enrollment.studentId);
    const summary = enrollmentSummary(state, enrollment.id, today);
    const room = currentRoomOf(state, enrollment.id, today);
    const roomType = state.roomTypes.find((r) => r.id === enrollment.roomTypeId);
    return { enrollment, student, summary, room, roomType, lastContact: lastContactOf(state, enrollment.id) };
}

export function periodView(state, periodId, today) {
    const period = state.periods.find((p) => p.id === periodId);
    const enrollments = state.enrollments.filter((e) => e.periodId === periodId);
    const rows = enrollments.map((e) => enrollmentRow(state, e, today));
    const live = rows.filter((r) => !["cancelled", "left"].includes(r.enrollment.status)) ;

    const tx = state.transactions.filter((t) => t.periodId === periodId);
    const payments = state.payments.filter((p) => p.periodId === periodId);
    const expenses = state.expenses.filter((e) => e.periodId === periodId);
    const totals = periodTotals({ payments, expenses, transactions: tx, accounts: state.accounts });

    const balances = state.accounts.map((a) => ({ account: a, balance: accountBalance(a.id, tx) }));
    const cashBalance = sum(balances.filter((b) => b.account.type === "cash"), (b) => b.balance);
    const bankBalance = sum(balances.filter((b) => b.account.type === "bank"), (b) => b.balance);

    // Vade listeleri: yalnızca kalanı olan kalemler; iptal/ayrılmış kayıtlarda kalem kalmaz zaten
    const upcoming = [];
    const overdue = [];
    for (const r of rows) {
        const lists = dueLists(r.summary.items, today, 7);
        for (const item of lists.overdue) overdue.push({ ...r, item });
        for (const item of lists.upcoming) upcoming.push({ ...r, item });
    }
    overdue.sort((a, b) => b.item.lateDays - a.item.lateDays);
    upcoming.sort((a, b) => a.item.inDays - b.item.inDays);

    const bills = state.bills
        .filter((b) => b.periodId === periodId)
        .map((b) => ({ bill: b, state: billState(b, today) }));

    const receivable = sum(rows, (r) => r.summary.remaining);
    const advances = sum(rows, (r) => r.summary.advance);
    const debtors = rows.filter((r) => r.summary.remaining > 0).length;
    const charged = sum(rows, (r) => r.summary.charged);

    const pendingApplications = state.applications.filter((a) => a.periodId === periodId && a.status === "pending");
    const openMaintenance = state.maintenance.filter((m) => m.periodId === periodId && m.status !== "done");

    // Doluluk: seçili dönem içindeyse bugün, değilse dönemin ilk günü
    const day = today >= period.start && today <= period.end ? today : period.start;
    const occupancy = occupancyOn(state, periodId, day);

    return {
        period, rows, live, totals, balances, cashBalance, bankBalance,
        upcoming, overdue, bills, receivable, advances, debtors, charged,
        collectionRate: charged ? round(totals.collected / charged) : 0,
        pendingApplications, openMaintenance, occupancy, occupancyDay: day,
        dueBills: bills.filter((b) => b.state === "overdue" || b.state === "soon").length,
    };
}

/**
 * "Önceki dönemlerden açık kalanlar" (plan 3.4): seçili dönemden ÖNCE başlayan dönemlerin
 * ödenmemiş öğrenci borçları ve faturaları. Tahsilatı yapılsa da hareket o eski döneme yazılır.
 */
export function carriedOver(state, periodId, today) {
    const current = state.periods.find((p) => p.id === periodId);
    const items = [];
    for (const period of state.periods) {
        if (period.id === periodId || period.start >= current.start) continue;
        for (const enrollment of state.enrollments.filter((e) => e.periodId === period.id)) {
            const row = enrollmentRow(state, enrollment, today);
            if (row.summary.remaining > 0) items.push({ kind: "student", period, row, amount: row.summary.remaining });
        }
        for (const bill of state.bills.filter((b) => b.periodId === period.id && b.status === "unpaid")) {
            items.push({ kind: "bill", period, bill, amount: bill.amount });
        }
    }
    return items;
}

export { diffDays };
