import { buildPaymentPlan, toISO } from "@/lib/application";
import { SITE } from "@/lib/constants";
import { parseDateOnly } from "@/lib/format";

/**
 * Öğrencinin kalemleri ve kayıtlı ödemeleri. Şimdilik MOCK.
 *
 * Gerçek istek (hesap defteri backend'de tutulur, yönetici ödemeyi elle işler):
 *   return apiGet("/student/payments");   // -> { period, currency, charges, payments }
 *
 * Sözleşme: ödemeler "kalemlere" bağlanmaz, ham gelir. Hangi ödemenin hangi aya sayıldığını
 * arayüz değil lib/ledger.js (FIFO) belirler; böylece Özet ve Ödemeler her zaman aynı rakamı gösterir.
 */
const PERIOD = { id: "2026-2027", name: "2026–2027", start: "2026-09-01", end: "2027-06-30" };
const MOCK_ROOM = { monthlyPrice: 9500 }; // iki kişilik oda; depozito = 1 aylık kira (TEYİT BEKLİYOR)

function buildMockCharges() {
    const plan = buildPaymentPlan({ room: MOCK_ROOM, entryDate: PERIOD.start, payDay: "early", period: PERIOD });
    const entry = parseDateOnly(PERIOD.start);

    return [
        { id: "deposit", kind: "deposit", dueDate: toISO(entry), amount: plan.deposit },
        ...plan.rents.map((rent) => {
            const [year, month] = rent.key.split("-").map(Number);
            return {
                id: `rent-${rent.index}`,
                kind: "rent",
                index: rent.index,
                month: `${year}-${String(month + 1).padStart(2, "0")}`,
                dueDate: rent.dueDate ?? toISO(entry), // ilk ay kayıtta ödenir
                amount: rent.amount,
            };
        }),
    ];
}

const MOCK_PAYMENTS = [
    { id: "p1", date: "2026-09-01", amount: 19000, method: "transfer" }, // depozito + Eylül
    { id: "p2", date: "2026-10-03", amount: 9500, method: "cash" }, // Ekim
    { id: "p3", date: "2026-10-10", amount: 4000, method: "transfer" }, // Kasım için peşin (kısmi)
];

export async function getStudentPayments() {
    return {
        period: PERIOD,
        currency: "TRY",
        charges: buildMockCharges(),
        payments: MOCK_PAYMENTS,
        // Banka bilgisi yalnızca tanımlıysa gönderilir
        bank: SITE.bank.iban ? SITE.bank : null,
    };
}
