import { computeItems, planFifo, round, sum, summarizeEnrollment } from "./accounting";
import { DomainError, assertPeriodOpen, fail, find, nextId, requirePeriod, withAudit } from "./core";

/**
 * MUHASEBE KOMUTLARI (tahsilat, iade, borç kalemi, iptal, hesap hareketi, transfer, gider, fatura).
 * Her komut: doğrular -> yeni kayıt(lar) ekler -> AuditLog yazar. Hiçbir kayıt düzenlenmez/silinmez.
 */

/* ───────── yardımcılar ───────── */

const enrollmentData = (state, enrollmentId) => ({
    charges: state.charges.filter((c) => c.enrollmentId === enrollmentId),
    payments: state.payments.filter((p) => p.enrollmentId === enrollmentId),
    allocations: state.allocations.filter((a) => a.enrollmentId === enrollmentId),
});

export const enrollmentSummary = (state, enrollmentId, today) => summarizeEnrollment(enrollmentData(state, enrollmentId), today);

function addTransaction(state, tx) {
    const { id, state: s } = nextId(state, "trx");
    return { state: { ...s, transactions: [...s.transactions, { id, createdAt: tx.createdAt, ...tx }] }, id };
}

/**
 * Serbest (dağıtılmamış) parayı açık kalemlere otomatik mahsup eder (vadesi en eski olandan).
 * Yeni kalem eklenince, kalem iptal edilince ve tahsilat girilince çağrılır.
 */
export function autoAllocate(state, enrollmentId, ctx) {
    const data = enrollmentData(state, enrollmentId);
    const live = data.payments.filter((p) => p.kind === "collection" && !p.cancelledAt).sort((a, b) => a.date.localeCompare(b.date));
    let next = state;

    for (const payment of live) {
        const items = computeItems({ charges: next.charges.filter((c) => c.enrollmentId === enrollmentId), allocations: next.allocations.filter((a) => a.enrollmentId === enrollmentId) });
        const used = sum(next.allocations.filter((a) => a.paymentId === payment.id), (a) => a.amount);
        const refundedShare = 0; // iadeler avanstan düşer, tahsilata bağlanmaz
        const free = round(payment.amount - used - refundedShare);
        if (free <= 0) continue;

        const { lines } = planFifo(free, items);
        for (const line of lines) {
            const made = nextId(next, "alc");
            next = {
                ...made.state,
                allocations: [
                    ...made.state.allocations,
                    { id: made.id, periodId: payment.periodId, enrollmentId, paymentId: payment.id, chargeId: line.chargeId, amount: line.amount, at: ctx.now, auto: true },
                ],
            };
        }
    }
    return next;
}

/** Avansı iadelerden sonra gerçekten serbest kalan tutar */
const advanceOf = (state, enrollmentId, today) => enrollmentSummary(state, enrollmentId, today).advance;

/* ───────── tahsilat ───────── */

/**
 * input: { enrollmentId, amount, date, method, accountId, note, allocations? }
 * allocations verilmezse vadesi en eski olandan başlayarak otomatik dağıtılır (FIFO).
 * Verilirse (elle dağıtım) toplamı tahsilat tutarını aşamaz; artan tutar avans olarak kalır.
 */
export function recordPayment(state, input, ctx) {
    const enrollment = find(state.enrollments, input.enrollmentId, "Kayıt");
    const amount = round(Number(input.amount));
    if (!(amount > 0)) fail("Tutar sıfırdan büyük olmalı.");
    if (!input.date) fail("Tahsilat tarihini seçin.");
    if (!["cash", "transfer", "pos"].includes(input.method)) fail("Ödeme yöntemini seçin.");
    const account = find(state.accounts, input.accountId, "Kasa/banka hesabı");
    if (input.method === "cash" && account.type !== "cash") fail("Nakit tahsilat bir kasa hesabına yazılmalı.");
    if (input.method === "transfer" && account.type !== "bank") fail("Havale/EFT bir banka hesabına yazılmalı.");
    requirePeriod(state, enrollment.periodId);

    const items = computeItems({ charges: state.charges.filter((c) => c.enrollmentId === enrollment.id), allocations: state.allocations.filter((a) => a.enrollmentId === enrollment.id) });

    let lines;
    if (input.allocations) {
        lines = input.allocations.filter((l) => Number(l.amount) > 0).map((l) => ({ chargeId: l.chargeId, amount: round(Number(l.amount)) }));
        const total = sum(lines, (l) => l.amount);
        if (total > amount) fail("Dağıtılan tutar tahsilat tutarını aşıyor.");
        for (const l of lines) {
            const item = items.find((i) => i.id === l.chargeId);
            if (!item) fail("Dağıtım, başka bir kaydın ya da başka bir dönemin kalemine yapılamaz.", "conflict");
            if (l.amount > item.remaining) fail(`"${item.note || item.kind}" kaleminin kalanı ${item.remaining} ₺; daha fazlası dağıtılamaz.`);
        }
    } else {
        lines = planFifo(amount, items).lines;
    }

    let s = state;
    const made = nextId(s, "pay");
    s = made.state;
    const payment = {
        id: made.id,
        periodId: enrollment.periodId,
        enrollmentId: enrollment.id,
        kind: "collection",
        amount,
        date: input.date,
        method: input.method,
        accountId: account.id,
        note: input.note?.trim() ?? "",
        cancelledAt: null,
        createdAt: ctx.now,
        createdBy: ctx.by,
    };
    s = { ...s, payments: [...s.payments, payment] };

    for (const line of lines) {
        const a = nextId(s, "alc");
        s = { ...a.state, allocations: [...a.state.allocations, { id: a.id, periodId: enrollment.periodId, enrollmentId: enrollment.id, paymentId: payment.id, chargeId: line.chargeId, amount: line.amount, at: ctx.now, auto: !input.allocations }] };
    }

    const tx = addTransaction(s, { periodId: enrollment.periodId, accountId: account.id, date: input.date, direction: "in", amount, source: "payment", sourceId: payment.id, note: "Öğrenci tahsilatı", createdAt: ctx.now });
    s = tx.state;

    s = withAudit(s, ctx, { action: "payment.create", entity: "payment", entityId: payment.id, periodId: enrollment.periodId, after: { amount, method: input.method, lines } });
    const advance = Math.max(0, round(amount - sum(lines, (l) => l.amount)));
    return { state: s, result: { payment, lines, advance } };
}

/** Tahsilat iptali: dağıtımlar geri alınır (eksi dağıtım), ters kasa/banka hareketi yazılır; kayıt "iptal edildi" olarak kalır */
export function cancelPayment(state, { paymentId, reason }, ctx) {
    const payment = find(state.payments, paymentId, "Tahsilat");
    if (payment.kind !== "collection") fail("Yalnızca tahsilat iptal edilebilir.");
    if (payment.cancelledAt) fail("Bu tahsilat zaten iptal edilmiş.", "conflict");
    if (!reason?.trim()) fail("İptal nedenini yazın.");

    // Bu tahsilattan avans iadesi yapılmışsa iptal, avansı eksiye düşürür: engelle
    const usedNow = sum(state.allocations.filter((x) => x.paymentId === paymentId), (x) => x.amount);
    const advanceNow = advanceOf(state, payment.enrollmentId, ctx.today);
    if (round(advanceNow - (payment.amount - usedNow)) < 0) {
        fail("Bu tahsilatın avansından iade yapılmış. Önce iade edilen tutarın karşılığını düzenleyin.", "conflict");
    }

    let s = state;
    // Bu tahsilatın bıraktığı net dağıtımları geri al
    const perCharge = new Map();
    for (const a of s.allocations.filter((x) => x.paymentId === paymentId)) {
        perCharge.set(a.chargeId, round((perCharge.get(a.chargeId) ?? 0) + a.amount));
    }
    for (const [chargeId, amount] of perCharge) {
        if (amount === 0) continue;
        const a = nextId(s, "alc");
        s = { ...a.state, allocations: [...a.state.allocations, { id: a.id, periodId: payment.periodId, enrollmentId: payment.enrollmentId, paymentId, chargeId, amount: -amount, at: ctx.now, reversal: true }] };
    }

    const cancelled = { ...payment, cancelledAt: ctx.now, cancelReason: reason.trim(), cancelledBy: ctx.by };
    s = { ...s, payments: s.payments.map((p) => (p.id === paymentId ? cancelled : p)) };

    const tx = addTransaction(s, { periodId: payment.periodId, accountId: payment.accountId, date: ctx.today, direction: "out", amount: payment.amount, source: "payment_cancel", sourceId: paymentId, note: `Tahsilat iptali: ${reason.trim()}`, createdAt: ctx.now });
    s = tx.state;

    // Mahsup serbest kalan parayı bu kayıttaki diğer tahsilatlara değil, başka açık kalemlere yeniden dağıtmaz:
    // iptal edilen tahsilatın parası zaten çıkıştır. Diğer tahsilatların serbest payı varsa otomatik mahsup edilir.
    s = autoAllocate(s, payment.enrollmentId, ctx);
    s = withAudit(s, ctx, { action: "payment.cancel", entity: "payment", entityId: paymentId, periodId: payment.periodId, before: payment, after: cancelled, note: reason.trim() });
    return { state: s, result: cancelled };
}

/** Avans iadesi: öğrencinin alacağı kasa/bankadan çıkış olarak ödenir */
export function refundAdvance(state, { enrollmentId, amount, date, accountId, note }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    const value = round(Number(amount));
    if (!(value > 0)) fail("İade tutarı sıfırdan büyük olmalı.");
    if (!date) fail("İade tarihini seçin.");
    const account = find(state.accounts, accountId, "Kasa/banka hesabı");
    const advance = advanceOf(state, enrollmentId, ctx.today);
    if (value > advance) fail(`İade edilebilecek avans ${advance} ₺; daha fazlası iade edilemez.`, "conflict");

    let s = state;
    const made = nextId(s, "pay");
    s = made.state;
    const refund = { id: made.id, periodId: enrollment.periodId, enrollmentId, kind: "refund", amount: value, date, method: account.type === "cash" ? "cash" : "transfer", accountId, note: note?.trim() ?? "", cancelledAt: null, createdAt: ctx.now, createdBy: ctx.by };
    s = { ...s, payments: [...s.payments, refund] };
    const tx = addTransaction(s, { periodId: enrollment.periodId, accountId, date, direction: "out", amount: value, source: "refund", sourceId: refund.id, note: "Avans iadesi", createdAt: ctx.now });
    s = withAudit(tx.state, ctx, { action: "payment.refund", entity: "payment", entityId: refund.id, periodId: enrollment.periodId, after: { amount: value } });
    return { state: s, result: refund };
}

/* ───────── borç kalemleri ───────── */

/** Elle kalem: ek konaklama (bütünleme), yaz, diğer, indirim (eksi). Avans varsa otomatik mahsup edilir. */
export function addCharge(state, { enrollmentId, kind, month, amount, dueDate, note }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    if (!["extra_stay", "summer", "other", "discount", "rent", "deposit"].includes(kind)) fail("Kalem türünü seçin.");
    let value = round(Number(amount));
    if (!(value > 0)) fail("Tutar sıfırdan büyük olmalı (indirim için de pozitif yazın).");
    if (kind === "discount") value = -value;
    if (!dueDate) fail("Vade tarihini seçin.");
    if (kind === "discount" && !note?.trim()) fail("İndirim için açıklama yazın.");

    const made = nextId(state, "chg");
    const charge = { id: made.id, periodId: enrollment.periodId, enrollmentId, kind, month: month || dueDate.slice(0, 7), amount: value, dueDate, note: note?.trim() ?? "", reversalOf: null, createdAt: ctx.now, createdBy: ctx.by };
    let s = { ...made.state, charges: [...made.state.charges, charge] };
    s = autoAllocate(s, enrollmentId, ctx);
    s = withAudit(s, ctx, { action: kind === "discount" ? "charge.discount" : "charge.create", entity: "charge", entityId: charge.id, periodId: enrollment.periodId, after: charge });
    return { state: s, result: charge };
}

/**
 * Kalem iptali (ters kayıt): kalemin kalan net tutarı kadar eksi kalem yazılır.
 * Kalemin ödenmiş kısmı varsa, o para dağıtımdan çözülür ve AVANSA döner (iade edilebilir).
 */
export function reverseCharge(state, { chargeId, reason }, ctx) {
    const charge = find(state.charges, chargeId, "Kalem");
    if (charge.reversalOf) fail("Ters kayıt tekrar iptal edilemez.");
    if (!reason?.trim()) fail("İptal nedenini yazın.");

    const items = computeItems({ charges: state.charges.filter((c) => c.enrollmentId === charge.enrollmentId), allocations: state.allocations.filter((a) => a.enrollmentId === charge.enrollmentId) });
    const item = items.find((i) => i.id === chargeId);
    if (!item || item.net === 0) fail("Bu kalem zaten iptal edilmiş.", "conflict");

    const made = nextId(state, "chg");
    const reversal = { id: made.id, periodId: charge.periodId, enrollmentId: charge.enrollmentId, kind: charge.kind, month: charge.month, amount: -item.net, dueDate: charge.dueDate, note: `İptal: ${reason.trim()}`, reversalOf: chargeId, createdAt: ctx.now, createdBy: ctx.by };
    let s = { ...made.state, charges: [...made.state.charges, reversal] };

    // Ödenmiş kısım dağıtımdan çözülür (en son dağıtımdan başlayarak)
    let toRelease = item.allocated;
    if (toRelease > 0) {
        const rows = s.allocations.filter((a) => a.chargeId === chargeId && a.amount > 0).sort((a, b) => b.at.localeCompare(a.at));
        for (const row of rows) {
            if (toRelease <= 0) break;
            const give = round(Math.min(toRelease, row.amount));
            const a = nextId(s, "alc");
            s = { ...a.state, allocations: [...a.state.allocations, { id: a.id, periodId: row.periodId, enrollmentId: row.enrollmentId, paymentId: row.paymentId, chargeId, amount: -give, at: ctx.now, reversal: true }] };
            toRelease = round(toRelease - give);
        }
    }

    s = autoAllocate(s, charge.enrollmentId, ctx); // serbest kalan para başka açık kaleme mahsup edilir
    s = withAudit(s, ctx, { action: "charge.reverse", entity: "charge", entityId: chargeId, periodId: charge.periodId, before: item, after: reversal, note: reason.trim() });
    return { state: s, result: reversal };
}

/* ───────── kasa & banka ───────── */

export function addAccount(state, { type, name, iban }, ctx) {
    if (!["cash", "bank"].includes(type)) fail("Hesap türünü seçin.");
    if (!name?.trim()) fail("Hesap adını yazın.");
    if (state.accounts.some((a) => a.name.toLowerCase() === name.trim().toLowerCase())) fail("Bu adda bir hesap zaten var.", "conflict");
    const made = nextId(state, "acc");
    const account = { id: made.id, type, name: name.trim(), iban: iban?.replace(/\s/g, "") || null, active: true };
    const s = withAudit({ ...made.state, accounts: [...made.state.accounts, account] }, ctx, { action: "account.create", entity: "account", entityId: account.id, after: account });
    return { state: s, result: account };
}

/** Açılış bakiyesi (dönem başında hesap 0 ile başlar; istenirse elle girilir) */
export function addOpeningBalance(state, { periodId, accountId, amount, date }, ctx) {
    assertPeriodOpen(state, periodId, "Açılış bakiyesi");
    find(state.accounts, accountId, "Hesap");
    const value = round(Number(amount));
    if (!(value > 0)) fail("Açılış tutarı sıfırdan büyük olmalı.");
    if (state.transactions.some((t) => t.periodId === periodId && t.accountId === accountId && t.source === "opening")) fail("Bu hesap için açılış bakiyesi zaten girilmiş. Düzeltme için ters kayıt kullanın.", "conflict");
    const tx = addTransaction(state, { periodId, accountId, date, direction: "in", amount: value, source: "opening", sourceId: null, note: "Açılış bakiyesi", createdAt: ctx.now });
    const s = withAudit(tx.state, ctx, { action: "account.opening", entity: "transaction", entityId: tx.id, periodId, after: { accountId, amount: value } });
    return { state: s, result: tx.id };
}

/** Transfer (kasa<->banka, banka<->banka): tek işlemde iki bacaklı hareket; gelir/gider SAYILMAZ */
export function transfer(state, { periodId, fromId, toId, amount, date, note }, ctx) {
    requirePeriod(state, periodId);
    if (fromId === toId) fail("Kaynak ve hedef hesap farklı olmalı.");
    find(state.accounts, fromId, "Kaynak hesap");
    find(state.accounts, toId, "Hedef hesap");
    const value = round(Number(amount));
    if (!(value > 0)) fail("Tutar sıfırdan büyük olmalı.");
    if (!date) fail("Tarihi seçin.");

    const made = nextId(state, "trf");
    let s = made.state;
    const out = addTransaction(s, { periodId, accountId: fromId, date, direction: "out", amount: value, source: "transfer", sourceId: made.id, note: note?.trim() || "Hesaplar arası transfer", createdAt: ctx.now });
    const inn = addTransaction(out.state, { periodId, accountId: toId, date, direction: "in", amount: value, source: "transfer", sourceId: made.id, note: note?.trim() || "Hesaplar arası transfer", createdAt: ctx.now });
    s = withAudit(inn.state, ctx, { action: "transfer.create", entity: "transfer", entityId: made.id, periodId, after: { fromId, toId, amount: value } });
    return { state: s, result: made.id };
}

/* ───────── gider ───────── */

export function addExpense(state, { periodId, categoryId, amount, date, accountId, description, billId = null }, ctx) {
    requirePeriod(state, periodId);
    find(state.expenseCategories, categoryId, "Gider kategorisi");
    find(state.accounts, accountId, "Ödeme hesabı");
    const value = round(Number(amount));
    if (!(value > 0)) fail("Tutar sıfırdan büyük olmalı.");
    if (!date) fail("Tarihi seçin.");
    if (!description?.trim()) fail("Açıklama yazın.");

    const made = nextId(state, "exp");
    const expense = { id: made.id, periodId, categoryId, amount: value, date, accountId, description: description.trim(), billId, cancelledAt: null, createdAt: ctx.now, createdBy: ctx.by };
    let s = { ...made.state, expenses: [...made.state.expenses, expense] };
    const tx = addTransaction(s, { periodId, accountId, date, direction: "out", amount: value, source: "expense", sourceId: expense.id, note: description.trim(), createdAt: ctx.now });
    s = withAudit(tx.state, ctx, { action: "expense.create", entity: "expense", entityId: expense.id, periodId, after: expense });
    return { state: s, result: expense };
}

/** Gider iptali: ters hareket (giriş) yazılır; faturadan geldiyse fatura yeniden "ödenmedi" olur */
export function cancelExpense(state, { expenseId, reason }, ctx) {
    const expense = find(state.expenses, expenseId, "Gider");
    if (expense.cancelledAt) fail("Bu gider zaten iptal edilmiş.", "conflict");
    if (!reason?.trim()) fail("İptal nedenini yazın.");

    let s = { ...state, expenses: state.expenses.map((e) => (e.id === expenseId ? { ...e, cancelledAt: ctx.now, cancelReason: reason.trim(), cancelledBy: ctx.by } : e)) };
    const tx = addTransaction(s, { periodId: expense.periodId, accountId: expense.accountId, date: ctx.today, direction: "in", amount: expense.amount, source: "expense_cancel", sourceId: expenseId, note: `Gider iptali: ${reason.trim()}`, createdAt: ctx.now });
    s = tx.state;
    if (expense.billId) {
        s = { ...s, bills: s.bills.map((b) => (b.id === expense.billId ? { ...b, status: "unpaid", paidAt: null, expenseId: null } : b)) };
    }
    s = withAudit(s, ctx, { action: "expense.cancel", entity: "expense", entityId: expenseId, periodId: expense.periodId, before: expense, note: reason.trim() });
    return { state: s, result: expenseId };
}

/* ───────── fatura ───────── */

/** Fatura kaydetmek bakiyeyi DEĞİŞTİRMEZ; yalnızca ödemesi işlenince gider + hesap hareketi oluşur */
export function addBill(state, { periodId, kind, month, amount, dueDate, note }, ctx) {
    requirePeriod(state, periodId);
    if (!["electricity", "water", "gas", "internet", "other"].includes(kind)) fail("Fatura türünü seçin.");
    const value = round(Number(amount));
    if (!(value > 0)) fail("Tutar sıfırdan büyük olmalı.");
    if (!month) fail("Ait olduğu ayı seçin.");
    if (!dueDate) fail("Son ödeme tarihini seçin.");
    const made = nextId(state, "bil");
    const bill = { id: made.id, periodId, kind, month, amount: value, dueDate, note: note?.trim() ?? "", status: "unpaid", paidAt: null, expenseId: null, createdAt: ctx.now };
    const s = withAudit({ ...made.state, bills: [...made.state.bills, bill] }, ctx, { action: "bill.create", entity: "bill", entityId: bill.id, periodId, after: bill });
    return { state: s, result: bill };
}

export function payBill(state, { billId, accountId, date }, ctx) {
    const bill = find(state.bills, billId, "Fatura");
    if (bill.status === "paid") fail("Bu fatura zaten ödenmiş.", "conflict");
    if (!date) fail("Ödeme tarihini seçin.");
    const category = state.expenseCategories.find((c) => c.system === "bills");
    if (!category) fail("Fatura gider kategorisi bulunamadı.", "not_found");

    const labels = { electricity: "Elektrik", water: "Su", gas: "Doğalgaz", internet: "İnternet", other: "Fatura" };
    const exp = addExpense(state, { periodId: bill.periodId, categoryId: category.id, amount: bill.amount, date, accountId, description: `${labels[bill.kind]} faturası (${bill.month})`, billId }, ctx);
    let s = exp.state;
    s = { ...s, bills: s.bills.map((b) => (b.id === billId ? { ...b, status: "paid", paidAt: date, expenseId: exp.result.id } : b)) };
    s = withAudit(s, ctx, { action: "bill.pay", entity: "bill", entityId: billId, periodId: bill.periodId, before: { status: "unpaid" }, after: { status: "paid", date, accountId } });
    return { state: s, result: exp.result };
}

export { DomainError };
