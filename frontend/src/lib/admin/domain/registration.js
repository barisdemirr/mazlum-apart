import { generateCharges } from "./plan";
import { addDays, diffDays, monthKey, parseISO, toISO } from "./dates";
import { assertPeriodOpen, fail, find, nextId, requirePeriod, studentName, withAudit } from "./core";
import { reverseCharge } from "./ledger";
import { computeItems, round } from "./accounting";

/**
 * KAYIT KOMUTLARI: başvuru, onay/ret, kayıt durumu, yerleşim ve doluluk.
 * Kapalı dönemde yeni başvuru, kayıt ve yerleşim açılamaz (plan 3.3).
 *
 * Durum eşlemesi (plan 5.6):
 *   Başvuru ........ application.status = "pending"
 *   Reddedildi ..... application.status = "rejected"
 *   Onaylı kayıt ... enrollment.status  = "approved"   (ödeme planı var, henüz odaya yerleşmedi)
 *   Aktif konaklama  enrollment.status  = "active"     (odaya yerleşti)
 *   İptal / Ayrıldı  enrollment.status  = "cancelled" | "left"
 */

/* ───────── başvuru ───────── */

export function createApplication(state, input, ctx) {
    const period = assertPeriodOpen(state, input.periodId, "Yeni başvuru");
    if (!period.applicationsOpen) fail("Bu dönem başvuruya kapalı.", "conflict");
    const s0 = input.student ?? {};
    if (!s0.tc || !/^\d{11}$/.test(s0.tc)) fail("T.C. kimlik no 11 haneli olmalı.");
    if (!s0.firstName?.trim() || !s0.lastName?.trim()) fail("Ad ve soyad zorunlu.");
    if (!/^5\d{9}$/.test(s0.phone ?? "")) fail("Telefon 5 ile başlayan 10 haneli olmalı.");
    const roomType = find(state.roomTypes, input.roomTypeId, "Oda tipi");
    const price = state.roomTypePrices.find((p) => p.periodId === input.periodId && p.roomTypeId === roomType.id);
    if (!price) fail("Bu oda tipi için bu dönemde fiyat tanımlı değil. Önce Dönemler & Fiyatlar'dan fiyat girin.", "conflict");
    if (!input.entryDate) fail("Giriş tarihini seçin.");
    if (input.entryDate < period.start || input.entryDate > period.end) fail("Giriş tarihi dönemin tarihleri içinde olmalı.");
    if (state.applications.some((a) => a.periodId === input.periodId && a.student.tc === s0.tc && a.status !== "rejected")) {
        fail("Bu T.C. kimlik no ile bu dönemde zaten bir başvuru/kayıt var.", "conflict");
    }

    const made = nextId(state, "app");
    const application = {
        id: made.id,
        periodId: input.periodId,
        source: input.source ?? "office",
        createdAt: ctx.now,
        status: "pending",
        student: { ...s0, firstName: s0.firstName.trim(), lastName: s0.lastName.trim() },
        roomTypeId: roomType.id,
        entryDate: input.entryDate,
        payWindow: input.payWindow ?? "early",
        term: input.term ?? "full",
        priceSnapshot: { monthly: price.monthly, deposit: price.deposit },
        note: input.note?.trim() ?? "",
        decidedAt: null,
        enrollmentId: null,
    };
    const s = withAudit({ ...made.state, applications: [application, ...made.state.applications] }, ctx, { action: "application.create", entity: "application", entityId: application.id, periodId: input.periodId, after: { source: application.source } });
    return { state: s, result: application };
}

export function rejectApplication(state, { applicationId, reason }, ctx) {
    const app = find(state.applications, applicationId, "Başvuru");
    if (app.status !== "pending") fail("Yalnızca bekleyen başvuru reddedilebilir.", "conflict");
    if (!reason?.trim()) fail("Ret nedenini yazın.");
    const next = { ...app, status: "rejected", decidedAt: ctx.now, decidedBy: ctx.by, rejectReason: reason.trim() };
    const s = withAudit({ ...state, applications: state.applications.map((a) => (a.id === app.id ? next : a)) }, ctx, { action: "application.reject", entity: "application", entityId: app.id, periodId: app.periodId, before: { status: "pending" }, after: { status: "rejected" }, note: reason.trim() });
    return { state: s, result: next };
}

/** Onay: öğrenci kimliği (T.C. ile eşleşir ya da yeni açılır) + kayıt + dönemin tüm ödeme planı */
export function approveApplication(state, { applicationId }, ctx) {
    const app = find(state.applications, applicationId, "Başvuru");
    assertPeriodOpen(state, app.periodId, "Başvuru onayı");
    if (app.status !== "pending") fail("Yalnızca bekleyen başvuru onaylanabilir.", "conflict");
    const period = requirePeriod(state, app.periodId);

    let s = state;
    let student = s.students.find((x) => x.tc === app.student.tc);
    if (!student) {
        const made = nextId(s, "stu");
        s = made.state;
        student = { id: made.id, ...app.student, createdAt: ctx.now };
        s = { ...s, students: [...s.students, student] };
    }
    if (s.enrollments.some((e) => e.periodId === app.periodId && e.studentId === student.id && !["cancelled"].includes(e.status))) {
        fail("Bu öğrencinin bu dönemde zaten bir kaydı var.", "conflict");
    }

    const e = nextId(s, "enr");
    s = e.state;
    const enrollment = {
        id: e.id,
        periodId: app.periodId,
        studentId: student.id,
        applicationId: app.id,
        roomTypeId: app.roomTypeId,
        status: "approved",
        payWindow: app.payWindow,
        term: app.term,
        entryDate: app.entryDate,
        price: app.priceSnapshot,
        createdAt: ctx.now,
    };
    s = { ...s, enrollments: [...s.enrollments, enrollment] };

    const endDate = app.term === "first" && period.halfTerm?.firstEnd ? period.halfTerm.firstEnd : period.end;
    const drafts = generateCharges({ entryDate: app.entryDate, payWindow: app.payWindow, price: app.priceSnapshot, periodEnd: endDate });
    for (const d of drafts) {
        const c = nextId(s, "chg");
        s = { ...c.state, charges: [...c.state.charges, { id: c.id, periodId: app.periodId, enrollmentId: enrollment.id, reversalOf: null, createdAt: ctx.now, createdBy: ctx.by, ...d }] };
    }

    s = { ...s, applications: s.applications.map((a) => (a.id === app.id ? { ...a, status: "approved", decidedAt: ctx.now, decidedBy: ctx.by, enrollmentId: enrollment.id } : a)) };
    s = withAudit(s, ctx, { action: "application.approve", entity: "application", entityId: app.id, periodId: app.periodId, before: { status: "pending" }, after: { status: "approved", enrollmentId: enrollment.id, charges: drafts.length } });

    // Öğrenci alanı ilk şifresi: yalnızca bu sonuçta döner (backend'de hash'lenir, bir daha gösterilmez)
    const initialPassword = String(100000 + Math.floor(Math.random() * 900000));
    return { state: s, result: { enrollment, student, initialPassword } };
}

/* ───────── kayıt durumu ───────── */

/**
 * İptal / ayrılış. Gelecek ayların kiraları ters kayıtla kapatılır (silinmez);
 * ödenmiş kısım varsa avansa döner. Yerleşim bitiş tarihine kısalır.
 */
export function endEnrollment(state, { enrollmentId, status, effectiveDate, reason }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    if (!["cancelled", "left"].includes(status)) fail("Durum seçin.");
    if (["cancelled", "left"].includes(enrollment.status)) fail("Bu kayıt zaten kapatılmış.", "conflict");
    if (!effectiveDate) fail("Ayrılış tarihini seçin.");
    if (!reason?.trim()) fail("Nedenini yazın.");

    let s = state;
    const items = computeItems({ charges: s.charges.filter((c) => c.enrollmentId === enrollmentId), allocations: s.allocations.filter((a) => a.enrollmentId === enrollmentId) });
    const cutoff = monthKey(effectiveDate);
    const future = items.filter((i) => i.kind === "rent" && i.net > 0 && i.month > cutoff);
    for (const item of future) {
        s = reverseCharge(s, { chargeId: item.id, reason: `Ayrılış: ${reason.trim()}` }, ctx).state;
    }

    s = {
        ...s,
        placements: s.placements.map((p) => (p.enrollmentId === enrollmentId && p.end > effectiveDate ? { ...p, end: effectiveDate < p.start ? p.start : effectiveDate } : p)),
        enrollments: s.enrollments.map((e) => (e.id === enrollmentId ? { ...e, status, endedAt: effectiveDate, endReason: reason.trim() } : e)),
    };
    s = withAudit(s, ctx, { action: "enrollment.end", entity: "enrollment", entityId: enrollmentId, periodId: enrollment.periodId, before: { status: enrollment.status }, after: { status, effectiveDate, reversedRents: future.length }, note: reason.trim() });
    return { state: s, result: { reversed: future.length } };
}

/* ───────── yerleşim ───────── */

/** Bir odada [start,end] aralığında aynı anda en çok kaç kişi kalıyor? (çakışma kontrolü) */
export function peakOccupancy(placements, roomId, start, end, ignoreId = null) {
    const list = placements.filter((p) => p.roomId === roomId && p.id !== ignoreId && p.start <= end && p.end >= start);
    const points = new Set([start, ...list.map((p) => (p.start > start ? p.start : start))]);
    let peak = 0;
    for (const day of points) {
        peak = Math.max(peak, list.filter((p) => p.start <= day && p.end >= day).length);
    }
    return peak;
}

export function placeStudent(state, { enrollmentId, roomId, start, end }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    assertPeriodOpen(state, enrollment.periodId, "Yerleşim");
    if (!["approved", "active"].includes(enrollment.status)) fail("Yalnızca onaylı kayıtlar yerleştirilebilir.", "conflict");
    const room = find(state.rooms, roomId, "Oda");
    if (room.status !== "active") fail("Bu oda şu an kullanıma kapalı (kapalı ya da bakımda).", "conflict");
    if (room.roomTypeId !== enrollment.roomTypeId) fail("Oda, öğrencinin kayıtlı oda tipine uygun değil.", "conflict");
    const period = requirePeriod(state, enrollment.periodId);
    const from = start || enrollment.entryDate;
    const to = end || period.end;
    if (from > to) fail("Başlangıç tarihi bitişten sonra olamaz.");
    if (from < period.start || to > period.end) fail("Yerleşim tarihleri dönemin dışına çıkamaz.", "conflict");
    if (state.placements.some((p) => p.enrollmentId === enrollmentId && p.start <= to && p.end >= from)) {
        fail("Bu öğrenci o tarihlerde başka bir odaya yerleşmiş. Oda değişikliği için 'Odayı değiştir' kullanın.", "conflict");
    }
    if (peakOccupancy(state.placements, roomId, from, to) >= room.beds) {
        fail(`${room.name} o tarihlerde dolu: ${room.beds} yataklı oda, kapasite aşılamaz.`, "conflict");
    }

    const made = nextId(state, "plc");
    const placement = { id: made.id, periodId: enrollment.periodId, enrollmentId, roomId, start: from, end: to, createdAt: ctx.now };
    let s = { ...made.state, placements: [...made.state.placements, placement] };
    if (enrollment.status === "approved") s = { ...s, enrollments: s.enrollments.map((e) => (e.id === enrollmentId ? { ...e, status: "active" } : e)) };
    s = withAudit(s, ctx, { action: "placement.create", entity: "placement", entityId: placement.id, periodId: enrollment.periodId, after: placement });
    return { state: s, result: placement };
}

/** Oda değişikliği: eski yerleşim değişiklik gününden önceki güne biter, yenisi o günle başlar */
export function movePlacement(state, { enrollmentId, roomId, date }, ctx) {
    const enrollment = find(state.enrollments, enrollmentId, "Kayıt");
    assertPeriodOpen(state, enrollment.periodId, "Yerleşim");
    const current = state.placements.filter((p) => p.enrollmentId === enrollmentId && p.end >= date).sort((a, b) => b.start.localeCompare(a.start))[0];
    if (!current) fail("Bu öğrencinin değiştirilecek bir yerleşimi yok.", "conflict");
    if (current.roomId === roomId) fail("Öğrenci zaten bu odada.", "conflict");
    const room = find(state.rooms, roomId, "Oda");
    if (room.status !== "active") fail("Bu oda şu an kullanıma kapalı.", "conflict");
    if (room.roomTypeId !== enrollment.roomTypeId) fail("Oda, öğrencinin kayıtlı oda tipine uygun değil.", "conflict");
    if (date <= current.start) fail("Değişiklik tarihi mevcut yerleşimin başlangıcından sonra olmalı.");
    if (peakOccupancy(state.placements, roomId, date, current.end) >= room.beds) fail(`${room.name} o tarihlerde dolu.`, "conflict");

    const made = nextId(state, "plc");
    const dayBefore = addDays(date, -1);
    const next = { id: made.id, periodId: enrollment.periodId, enrollmentId, roomId, start: date, end: current.end, createdAt: ctx.now };
    let s = { ...made.state, placements: [...made.state.placements.map((p) => (p.id === current.id ? { ...p, end: dayBefore } : p)), next] };
    s = withAudit(s, ctx, { action: "placement.move", entity: "placement", entityId: next.id, periodId: enrollment.periodId, before: { roomId: current.roomId }, after: { roomId, date } });
    return { state: s, result: next };
}

/* ───────── doluluk (hesaplanır) ───────── */

/**
 * Seçilen günde her odanın doluluğu. Bekleyen başvurular doluluğu DEĞİŞTİRMEZ; yalnızca yerleşimler sayılır.
 * @returns { rooms: [{ room, occupants:[{enrollment,student,placement}], free }], apartments: [...] }
 */
export function occupancyOn(state, periodId, day) {
    const placements = state.placements.filter((p) => p.periodId === periodId && p.start <= day && p.end >= day);
    const rooms = state.rooms.map((room) => {
        const occupants = placements
            .filter((p) => p.roomId === room.id)
            .map((placement) => {
                const enrollment = state.enrollments.find((e) => e.id === placement.enrollmentId);
                const student = state.students.find((x) => x.id === enrollment?.studentId);
                return { placement, enrollment, student };
            });
        const usable = room.status === "active";
        return { room, occupants, free: usable ? Math.max(0, room.beds - occupants.length) : 0, usable };
    });

    const apartments = state.apartments.map((apartment) => {
        const list = rooms.filter((r) => r.room.apartmentId === apartment.id);
        const beds = list.reduce((s, r) => s + (r.usable ? r.room.beds : 0), 0);
        const taken = list.reduce((s, r) => s + r.occupants.length, 0);
        return { apartment, rooms: list, beds, taken, free: Math.max(0, beds - taken), fullRooms: list.filter((r) => r.usable && r.free === 0).length, emptyRooms: list.filter((r) => r.usable && r.occupants.length === 0).length };
    });

    const beds = apartments.reduce((s, a) => s + a.beds, 0);
    const taken = apartments.reduce((s, a) => s + a.taken, 0);
    return { rooms, apartments, totals: { beds, taken, free: Math.max(0, beds - taken), rate: beds ? round(taken / beds) : 0 } };
}

/** Öğrencinin verilen gündeki (yoksa son) yerleşim odası */
export function currentRoomOf(state, enrollmentId, day) {
    const list = state.placements.filter((p) => p.enrollmentId === enrollmentId).sort((a, b) => b.start.localeCompare(a.start));
    const placement = list.find((p) => p.start <= day && p.end >= day) ?? list[0];
    if (!placement) return null;
    const room = state.rooms.find((r) => r.id === placement.roomId);
    const apartment = state.apartments.find((a) => a.id === room?.apartmentId);
    return { placement, room, apartment, label: room ? `${apartment?.name ?? ""} · ${room.name}` : "" };
}

export { diffDays, parseISO, toISO, studentName };
