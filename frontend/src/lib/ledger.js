import { parseDateOnly } from "@/lib/format";

/**
 * Öğrenci hesap defteri (ledger). Tek doğruluk kaynağı: Özet ve Ödemeler sayfaları aynı sonucu kullanır.
 *
 * Girdi:
 *   charges  [{ id, kind: "deposit" | "rent", index?, month?: "YYYY-MM", dueDate: "YYYY-MM-DD", amount }]  (sıralı)
 *   payments [{ id, date: "YYYY-MM-DD", amount, method: "cash" | "transfer", note? }]
 *
 * Kural (müşteri): her dönemin hesabı ayrıdır; peşin ödeme olabilir (örn. 10.000 kiraya 35.000 yatırıldı).
 * Her ödeme, en eski açık kalemden başlayarak sırayla (FIFO) mahsup edilir; fazlası sonraki aylara geçer.
 * Durum: paid (kapandı) · overdue (vadesi geçti, açığı var) · partial (kısmen ödendi) · upcoming (bekliyor)
 */
const round = (n) => Math.round(n * 100) / 100;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DAY = 86400000;

export function buildLedger({ charges = [], payments = [], today = new Date() }) {
    const now = startOfDay(today);
    const items = charges.map((charge) => ({ ...charge, paid: 0, remaining: charge.amount }));

    const history = [...payments]
        .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))
        .map((payment) => {
            let left = payment.amount;
            const allocations = [];
            for (const item of items) {
                if (left <= 0) break;
                if (item.remaining <= 0) continue;
                const take = round(Math.min(left, item.remaining));
                item.paid = round(item.paid + take);
                item.remaining = round(item.remaining - take);
                left = round(left - take);
                allocations.push({ chargeId: item.id, amount: take });
            }
            return { ...payment, allocations, unallocated: left };
        })
        .reverse(); // en yeni üstte

    for (const item of items) {
        const due = parseDateOnly(item.dueDate);
        item.daysUntilDue = Math.round((startOfDay(due) - now) / DAY);
        if (item.remaining <= 0) item.status = "paid";
        else if (due < now) item.status = "overdue";
        else if (item.paid > 0) item.status = "partial";
        else item.status = "upcoming";
    }

    const total = round(items.reduce((sum, i) => sum + i.amount, 0));
    const paid = round(items.reduce((sum, i) => sum + i.paid, 0));
    const rents = items.filter((i) => i.kind === "rent");

    return {
        items,
        history,
        next: items.find((i) => i.remaining > 0) ?? null,
        totals: {
            total,
            paid,
            remaining: round(total - paid),
            overdue: round(items.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.remaining, 0)),
            credit: round(history.reduce((sum, p) => sum + p.unallocated, 0)), // kalemleri aşan fazla ödeme
            progress: total ? Math.min(1, paid / total) : 0,
            rentCount: rents.length,
            rentsPaid: rents.filter((i) => i.status === "paid").length,
        },
    };
}
