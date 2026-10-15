import { turkeyDate } from "@/lib/format";

/**
 * Backend DTO'larını arayüzün (portal bileşenlerinin) beklediği şekle çevirir. Saf fonksiyonlar, hem sunucuda hem tarayıcıda çalışır.
 * Kural: hesaplamalar backend'de yapılır (tek doğruluk kaynağı); burada yalnızca şekil dönüşümü vardır.
 */

const EMPTY_TEXT = { tr: "", en: "" };

/** GET /api/student/me -> portal öğrenci nesnesi */
export function adaptStudent(me) {
    return {
        id: me.id,
        firstName: me.firstName,
        lastName: me.lastName,
        phone: me.phone,
        tc: me.tc,
        birthDate: me.birthDate,
        provinceId: me.provinceId,
        district: me.district,
        address: me.address,
        school: me.school,
        faculty: me.faculty,
        department: me.department,
        grade: me.grade,
        guardians: (me.guardians ?? []).map((guardian, index) => ({ id: `g-${index}`, name: guardian.name, phone: guardian.phone })),
        enrollmentId: me.enrollmentId ?? null,
        status: me.status ?? "active", // approved | active | cancelled | left
        term: me.term ?? "full",
        entryDate: me.entryDate ?? null,
        registeredAt: turkeyDate(me.registeredAt),
        period: me.period ?? { id: null, name: "", start: null, end: null },
        room: {
            typeName: me.room?.typeName ?? EMPTY_TEXT,
            flat: me.room?.flat ?? "",
            roomName: me.room?.roomName ?? "",
            bed: me.room?.bed ?? "",
            flatPeople: me.room?.flatPeople ?? 0,
        },
    };
}

/**
 * GET /api/student/payments -> { period, bank, ledger }
 * ledger: lib/ledger.js ile aynı şekil (items, history, next, totals) ama değerler SUNUCUDAN gelir:
 * hangi ödeme hangi aya sayıldı, kalan/gecikme/avans hesabı yöneticinin gördüğüyle birebir aynıdır.
 */
export function adaptPayments(data) {
    const items = (data.charges ?? []).map((charge) => ({
        id: charge.id,
        kind: charge.kind, // deposit | rent | extra_stay | summer | other
        index: charge.index ?? null,
        month: charge.month,
        dueDate: charge.dueDate,
        note: charge.note ?? null,
        amount: charge.amount,
        paid: charge.paid,
        remaining: charge.remaining,
        status: charge.status, // paid | overdue | partial | upcoming
        daysUntilDue: charge.daysUntilDue,
    }));

    const history = (data.payments ?? [])
        .filter((payment) => payment.kind === "collection")
        .map((payment) => ({
            id: payment.id,
            date: payment.date,
            amount: payment.amount,
            method: payment.method,
            allocations: (payment.allocations ?? []).map((a) => ({ chargeId: a.chargeId, amount: a.amount })),
        })); // sunucu en yeniyi üste sıralar

    const totals = data.totals ?? {};
    return {
        period: data.period,
        bank: data.bank ? { name: "", holder: data.bank.holder ?? "", iban: data.bank.iban } : null,
        ledger: {
            items,
            history,
            next: items.find((item) => item.id === data.next?.id) ?? null,
            totals: {
                total: totals.total ?? 0,
                paid: totals.paid ?? 0,
                remaining: totals.remaining ?? 0,
                overdue: totals.overdue ?? 0,
                credit: totals.credit ?? 0,
                progress: totals.progress ?? 0,
                rentCount: totals.rentCount ?? 0,
                rentsPaid: totals.rentsPaid ?? 0,
            },
        },
    };
}

/** Arıza talebi (liste ve oluşturma yanıtı aynı şekil) */
export function adaptRequest(request) {
    return {
        id: request.id,
        no: request.no,
        area: request.area, // room | kitchen | bathroom | other
        title: request.title,
        description: request.description,
        status: request.status, // received | in_progress | done
        createdAt: request.createdAt,
        photoCount: request.photoCount ?? request.photos?.length ?? 0,
        events: (request.events ?? []).map((event) => ({ at: event.at, status: event.status, note: event.note ?? undefined })),
    };
}
