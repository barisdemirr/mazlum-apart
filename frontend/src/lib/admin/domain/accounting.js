import { diffDays, monthKey, monthLabel } from "./dates";

/**
 * MUHASEBE ÇEKİRDEĞİ: saf fonksiyonlar (veri tabanı, ekran, saat bilgisi yok).
 * Backend'de bu dosya Domain/Accounting altına C# olarak taşınır; sonuçlar birebir aynı olmalıdır.
 *
 * ┌ Defter (ledger) ilkeleri ─────────────────────────────────────────────────────────┐
 * │ 1. Borç kalemi (charge), tahsilat (payment), dağıtım (allocation) ve hesap hareketi │
 * │    (transaction) ASLA düzenlenmez ya da silinmez. Hata, ters kayıtla düzeltilir.    │
 * │ 2. Bakiyeler saklanmaz; hareketlerden HESAPLANIR.                                   │
 * │ 3. Borç kalemi iptali = eksi tutarlı yeni kalem (reversalOf). Orijinal görünür kalır.│
 * │ 4. Dağıtım iptali = eksi tutarlı yeni dağıtım. Serbest kalan para avansa döner.     │
 * └────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Kavramlar (bir KAYIT = öğrencinin bir dönemdeki hesabı):
 *   net borç      = kalem tutarı + o kalemin ters kayıtları (eksi)
 *   dağıtılan     = kaleme yazılan dağıtımların toplamı (iptaller eksi)
 *   kalan         = max(0, net borç − dağıtılan)
 *   avans         = (iptal edilmemiş tahsilatlar − dağıtılanlar) − iadeler
 */
export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const sum = (list, pick = (x) => x) => round(list.reduce((s, x) => s + pick(x), 0));

/* ─────────────── Kalem bazında durum ─────────────── */

/**
 * Bir kaydın kalemlerini, ters kayıtları ve dağıtımları işleyerek hesaplar.
 * @returns kalemler (ters kayıtlar HARİÇ, her biri { net, allocated, remaining, reversed })
 */
export function computeItems({ charges, allocations }) {
    const reversalsOf = new Map();
    for (const c of charges) {
        if (c.reversalOf) reversalsOf.set(c.reversalOf, round((reversalsOf.get(c.reversalOf) ?? 0) + c.amount));
    }

    const allocatedTo = new Map();
    for (const a of allocations) {
        allocatedTo.set(a.chargeId, round((allocatedTo.get(a.chargeId) ?? 0) + a.amount));
    }

    const items = charges
        .filter((c) => !c.reversalOf)
        .map((c) => {
            const net = round(c.amount + (reversalsOf.get(c.id) ?? 0));
            const allocated = allocatedTo.get(c.id) ?? 0;
            return {
                ...c,
                net,
                allocated,
                discounted: 0,
                remaining: Math.max(0, round(net - allocated)),
                reversed: net === 0 && c.amount !== 0,
            };
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt?.localeCompare(b.createdAt ?? "") || 0);

    // İndirim (eksi kalem) açık kalemlerden, vadesi en eski olandan başlayarak düşülür.
    // Böylece indirim "kalan"ı gerçekten azaltır; ödenmiş kalemlere dokunmaz.
    let credit = round(-items.filter((i) => i.net < 0).reduce((s, i) => s + i.net, 0));
    for (const item of items) {
        if (credit <= 0) break;
        if (item.net <= 0 || item.remaining <= 0) continue;
        const take = round(Math.min(credit, item.remaining));
        item.discounted = take;
        item.remaining = round(item.remaining - take);
        credit = round(credit - take);
    }
    return items;
}

/** Vadesi en eski olandan başlayarak sırayla dağıtım planı (FIFO). Fazlası `leftover` (avans). */
export function planFifo(amount, items) {
    let left = round(amount);
    const lines = [];
    for (const item of items) {
        if (left <= 0) break;
        if (item.remaining <= 0 || item.net <= 0) continue; // indirim (eksi) kalemlere para dağıtılmaz
        const take = round(Math.min(left, item.remaining));
        lines.push({ chargeId: item.id, amount: take });
        left = round(left - take);
    }
    return { lines, leftover: left };
}

/* ─────────────── Kayıt (öğrenci hesabı) özeti ─────────────── */

/**
 * @param enrollmentState { charges, payments, allocations }  (yalnızca o kayda ait)
 */
export function summarizeEnrollment({ charges, payments, allocations }, today) {
    const items = computeItems({ charges, allocations });
    const activePayments = payments.filter((p) => p.kind === "collection" && !p.cancelledAt);
    const refunds = payments.filter((p) => p.kind === "refund" && !p.cancelledAt);

    const activeIds = new Set(activePayments.map((p) => p.id));
    const liveAllocations = allocations.filter((a) => activeIds.has(a.paymentId));

    const totalNet = sum(items.filter((i) => i.net > 0), (i) => i.net); // indirimler ayrı
    const discounts = sum(items.filter((i) => i.net < 0), (i) => i.net); // eksi
    const charged = round(totalNet + discounts);
    const allocated = sum(liveAllocations, (a) => a.amount);
    const collected = sum(activePayments, (p) => p.amount);
    const refunded = sum(refunds, (p) => p.amount);
    const advance = Math.max(0, round(collected - allocated - refunded));
    const remaining = sum(items, (i) => i.remaining);

    const open = items.filter((i) => i.remaining > 0);
    const overdueItems = open.filter((i) => diffDays(today, i.dueDate) > 0);
    const overdue = sum(overdueItems, (i) => i.remaining);

    return {
        items,
        charged,
        collected,
        refunded,
        allocated,
        remaining,
        overdue,
        advance,
        next: open[0] ?? null,
        covered: coveredPeriod(items),
        status: remaining === 0 ? (items.length ? "paid" : "empty") : overdue > 0 ? "overdue" : "ok",
    };
}

/**
 * "Ödemesi karşılanan süre": aylık kiralar sırayla ele alınır.
 * Örn. Eylül-Ekim-Kasım tam, Aralık'tan 5.000 ödenmişse
 *   { fullThrough: "2026-11", partial: { month: "2026-12", paid: 5000, remaining: 5000 } }
 */
export function coveredPeriod(items) {
    const rents = items.filter((i) => i.kind === "rent" && i.net > 0).sort((a, b) => a.month.localeCompare(b.month));
    let fullThrough = null;
    let partial = null;
    for (const r of rents) {
        if (r.remaining === 0) fullThrough = r.month;
        else {
            if (r.allocated > 0) partial = { month: r.month, paid: r.allocated, remaining: r.remaining };
            break;
        }
    }
    return { fullThrough, partial };
}

/** "Kasım sonuna kadar ödendi; Aralık kirasının ₺5.000'si ödendi" gibi okunur özet (para biçimi çağırandan) */
export function describeCovered(covered, fmt) {
    const parts = [];
    if (covered.fullThrough) parts.push(`${monthLabel(covered.fullThrough, { short: true })} sonuna kadar ödendi`);
    if (covered.partial)
        parts.push(`${monthLabel(covered.partial.month, { short: true })} kirasının ${fmt(covered.partial.paid)}'si ödendi`);
    return parts.length ? parts.join("; ") : "Henüz kira ödemesi yok";
}

/* ─────────────── Vade takibi (yaklaşan / geciken) ─────────────── */

/**
 * Yalnızca ödenmemiş KALAN tutarı olan kalemlere bakar.
 * Peşin ödeyen öğrenci, karşılanmayan ilk kalemin vadesi yaklaşana kadar listede görünmez.
 *  - overdue : vadesi geçmiş ve kalanı var   (gecikme günü = bugün − vade)
 *  - upcoming: vadesi [bugün, bugün+withinDays] aralığında ve kalanı var
 */
export function dueLists(items, today, withinDays = 7) {
    const open = items.filter((i) => i.remaining > 0);
    const overdue = open.filter((i) => diffDays(today, i.dueDate) > 0).map((i) => ({ ...i, lateDays: diffDays(today, i.dueDate) }));
    const upcoming = open
        .filter((i) => {
            const d = diffDays(i.dueDate, today);
            return d >= 0 && d <= withinDays;
        })
        .map((i) => ({ ...i, inDays: diffDays(i.dueDate, today) }));
    return { overdue, upcoming };
}

/* ─────────────── Kasa / banka ─────────────── */

/** Bir hesabın bakiyesi = girişler − çıkışlar (yalnızca verilen hareketlerden; dönem filtresi çağırandadır) */
export function accountBalance(accountId, transactions) {
    return sum(
        transactions.filter((t) => t.accountId === accountId),
        (t) => (t.direction === "in" ? t.amount : -t.amount)
    );
}

/* ─────────────── Dönem özeti ─────────────── */

/**
 * Seçili dönemin tahsilat/gider/net durumu. Transferler gelir ya da gider SAYILMAZ.
 * Tahsilat ve gider hareket tablosundan değil kendi kayıtlarından toplanır; hesap hareketi ile çapraz kontrol edilir.
 */
export function periodTotals({ payments, expenses, transactions, accounts }) {
    const collections = payments.filter((p) => p.kind === "collection" && !p.cancelledAt);
    const refunds = payments.filter((p) => p.kind === "refund" && !p.cancelledAt);
    const liveExpenses = expenses.filter((e) => !e.cancelledAt);

    const byMethod = { cash: 0, transfer: 0, pos: 0 };
    for (const p of collections) byMethod[p.method] = round((byMethod[p.method] ?? 0) + p.amount);

    const typeOf = new Map(accounts.map((a) => [a.id, a.type]));
    const inCash = sum(collections.filter((p) => typeOf.get(p.accountId) === "cash"), (p) => p.amount);
    const inBank = sum(collections.filter((p) => typeOf.get(p.accountId) === "bank"), (p) => p.amount);

    const collected = sum(collections, (p) => p.amount);
    const refunded = sum(refunds, (p) => p.amount);
    const spent = sum(liveExpenses, (e) => e.amount);

    // Çapraz kontrol: kasa+banka toplam bakiyesi = açılış + tahsilat − iade − gider (transferler sıfırlanır)
    const totalBalance = sum(transactions, (t) => (t.direction === "in" ? t.amount : -t.amount));

    return {
        collected,
        refunded,
        spent,
        net: round(collected - refunded - spent),
        byMethod,
        inCash,
        inBank,
        totalBalance,
    };
}

/** Faturanın vade durumu */
export function billState(bill, today, soonDays = 7) {
    if (bill.status === "paid") return "paid";
    const d = diffDays(bill.dueDate, today);
    if (d < 0) return "overdue";
    if (d <= soonDays) return "soon";
    return "unpaid";
}

export { monthKey };
