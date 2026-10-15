import { parseDateOnly } from "@/lib/format";

/* ───────────────────────── Tarih yardımcıları ───────────────────────── */

const pad = (n) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" (formda tarihler bu biçimde tutulur) */
export function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Bugün ("YYYY-MM-DD") */
export const todayISO = () => toISO(new Date());

/** "gg/aa/yyyy" yazısını "YYYY-MM-DD"ye çevirir; geçersiz takvim günü ("31/02/2026") için "" döner */
export function parseDisplayDate(text) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text ?? "").trim());
    if (!match) return "";
    const [, d, m, y] = match.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "";
    return toISO(date);
}

/** Yazarken otomatik eğik çizgi ekler: "01092026" -> "01/09/2026" */
export function maskDate(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/* ───────────────────────── Alan biçimleri ───────────────────────── */

export const onlyDigits = (value, max) => String(value ?? "").replace(/\D/g, "").slice(0, max);

/** "5321234567" -> "532 123 45 67" (+90 ön eki arayüzde sabit gösterilir) */
export function formatPhone(digits) {
    const d = onlyDigits(digits, 10);
    const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
    return parts.join(" ");
}

/** TC Kimlik No: resmi sağlama algoritması (11 hane, ilk hane 0 olamaz, 10. ve 11. hane kontrolü) */
export function isValidTc(value) {
    const tc = String(value ?? "");
    if (!/^[1-9]\d{9}\d$/.test(tc)) return false;
    const d = tc.split("").map(Number);
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    const tenth = (((odd * 7 - even) % 10) + 10) % 10;
    const eleventh = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
    return d[9] === tenth && d[10] === eleventh;
}

export const isValidPhone = (digits) => /^5\d{9}$/.test(String(digits ?? ""));

/* ───────────────────────── Doğrulama ─────────────────────────
 * Her doğrulayıcı { alan: "hataKodu" } döner; metinler dictionaries.apply.errors altındadır. */

export const GRADES = ["prep", "1", "2", "3", "4", "5", "6"];

export function newGuardian() {
    return { id: `g-${Math.random().toString(36).slice(2, 9)}`, name: "", phone: "" };
}

/* ───────────────────────── Kayıt süresi (tam dönem / yarım dönem) ─────────────────────────
 * Müşteri kuralı: yarım dönem kayıtlar HER ZAMAN gösterilmez; boş oda fazlaysa yönetici dönem ayarından açar
 * (Dönemler → yarım dönemi aç + 1. yarı bitişi + 2. yarı başlangıcı). Kapalıyken form yalnızca tam dönemdir
 * ve "Kayıt Süresi" seçimi hiç görünmez. Backend: GET /api/applications/config → { period, halfTerm }. */
export function termOptions(config) {
    const { period, halfTerm } = config;
    const full = { id: "full", start: period.start, end: period.end };
    if (!halfTerm?.enabled || !halfTerm.firstEnd || !halfTerm.secondStart) return [full];
    return [
        full,
        { id: "first", start: period.start, end: halfTerm.firstEnd },
        { id: "second", start: halfTerm.secondStart, end: period.end },
    ];
}

export const termRange = (config, termId) => termOptions(config).find((term) => term.id === termId) ?? termOptions(config)[0];

/** Seçilebilecek en erken giriş tarihi: kayıt süresinin başı; süre başlamışsa bugün (geçmişe giriş verilemez) */
export const earliestEntry = (range) => {
    const today = todayISO();
    return today > range.start ? today : range.start;
};

/** Giriş tarihini seçilen sürenin sınırlarına çeker */
export const clampEntry = (entryDate, range) => {
    const min = earliestEntry(range);
    if (!entryDate || entryDate < min) return min;
    if (entryDate > range.end) return range.end;
    return entryDate;
};

export function emptyForm({ roomSlug = "", period }) {
    return {
        roomSlug,
        term: "full",
        entryDate: period ? earliestEntry(period) : "",
        payDay: "",
        firstName: "",
        lastName: "",
        tc: "",
        birthDate: "",
        phone: "",
        address: "",
        provinceId: "",
        district: "",
        school: "",
        faculty: "",
        department: "",
        grade: "",
        guardians: [newGuardian()],
        kvkk: false,
    };
}

const filled = (value) => String(value ?? "").trim().length > 0;

/** `period`: SEÇİLİ kayıt süresinin aralığı ({ start, end }); `terms`: seçilebilir süre kimlikleri (verilirse kontrol edilir) */
export function validateStep(step, form, { period, rooms, terms }) {
    const errors = {};
    const required = (field) => {
        if (!filled(form[field])) errors[field] = "required";
    };

    if (step === 1) {
        if (!rooms.some((room) => room.slug === form.roomSlug)) errors.roomSlug = "required";
        if (terms && !terms.includes(form.term)) errors.term = "required";
        if (!form.entryDate) errors.entryDate = "required";
        else if (form.entryDate < earliestEntry(period)) errors.entryDate = "dateMin";
        else if (form.entryDate > period.end) errors.entryDate = "dateMax";
        required("payDay");
    }

    if (step === 2) {
        required("firstName");
        required("lastName");
        if (!form.tc) errors.tc = "required";
        else if (form.tc.length < 11) errors.tc = "tcLength";
        else if (!isValidTc(form.tc)) errors.tc = "tc";

        if (!form.birthDate) errors.birthDate = "required";
        else if (form.birthDate >= toISO(new Date()) || form.birthDate < "1940-01-01") errors.birthDate = "birthDate";

        if (!form.phone) errors.phone = "required";
        else if (!isValidPhone(form.phone)) errors.phone = "phone";

        if (!filled(form.address)) errors.address = "required";
        else if (form.address.trim().length < 10) errors.address = "addressShort";

        required("provinceId");
        required("district");
    }

    if (step === 3) {
        required("school");
        required("faculty");
        required("department");
        required("grade");
    }

    if (step === 4) {
        form.guardians.forEach((guardian) => {
            if (!filled(guardian.name)) errors[`guardian-${guardian.id}-name`] = "required";
            if (!guardian.phone) errors[`guardian-${guardian.id}-phone`] = "required";
            else if (!isValidPhone(guardian.phone)) errors[`guardian-${guardian.id}-phone`] = "phone";
        });
    }

    if (step === 5 && !form.kvkk) errors.kvkk = "kvkk";

    return errors;
}

/**
 * Backend doğrulama hatalarını (problem+json `errors`: { alan: [mesaj] }) form alanlarına ve adıma çevirir.
 * Dönüş: { errors: { alan: kod }, step } ya da eşleşen alan yoksa null.
 */
const SERVER_FIELD_STEP = { roomSlug: 1, term: 1, entryDate: 1, payDay: 1, bedId: 1, firstName: 2, lastName: 2, tc: 2, birthDate: 2, phone: 2, address: 2, provinceId: 2, district: 2, school: 3, faculty: 3, department: 3, grade: 3 };
const SERVER_FIELD_CODE = { tc: "tc", phone: "phone", birthDate: "birthDate", entryDate: "dateInvalid" };

export function mapServerErrors(serverErrors, guardians = []) {
    const errors = {};
    let step = null;
    for (const key of Object.keys(serverErrors ?? {})) {
        const field = key.replace(/^\w/, (c) => c.toLowerCase());
        const guardian = field.match(/^guardians\[(\d+)\]\.(name|phone)$/);
        if (guardian) {
            const target = guardians[Number(guardian[1])];
            if (target) errors[`guardian-${target.id}-${guardian[2]}`] = guardian[2] === "phone" ? "phone" : "required";
            step = Math.min(step ?? 4, 4);
        } else if (SERVER_FIELD_STEP[field]) {
            errors[field] = SERVER_FIELD_CODE[field] ?? "required";
            step = Math.min(step ?? 5, SERVER_FIELD_STEP[field]);
        }
    }
    return Object.keys(errors).length ? { errors, step } : null;
}

/* ───────────────────────── Ödeme planı ─────────────────────────
 * Kural (müşteri): kayıtta 1 depozito + 1 aylık kira peşin; sonraki aylar seçilen ödeme gününe göre.
 * TEYİT BEKLİYOR: depozito tutarı. Müşteriden gelene kadar bir aylık kira kabul edilir;
 * backend oda tipine `depositAmount` eklediğinde otomatik o değer kullanılır. */
export const PAY_DAYS = {
    early: { from: 1, to: 5 },
    mid: { from: 15, to: 20 },
};

export const depositFor = (room) => room?.depositAmount ?? room?.monthlyPrice ?? 0;

export function buildPaymentPlan({ room, entryDate, payDay, period, locale = "tr" }) {
    if (!room) return null;

    const start = parseDateOnly(entryDate || period.start);
    const end = parseDateOnly(period.end);
    const price = room.monthlyPrice;
    const deposit = depositFor(room);
    const monthName = (date) => {
        const name = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { month: "long" }).format(date);
        return name.charAt(0).toLocaleUpperCase(locale === "en" ? "en" : "tr") + name.slice(1);
    };

    const rents = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    let index = 0;
    while (cursor <= end) {
        const first = index === 0;
        const dueDay = PAY_DAYS[payDay]?.to;
        rents.push({
            key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
            index: index + 1,
            month: monthName(cursor),
            amount: price,
            atRegistration: first,
            dueDate: !first && dueDay ? toISO(new Date(cursor.getFullYear(), cursor.getMonth(), dueDay)) : null,
        });
        cursor.setMonth(cursor.getMonth() + 1);
        index += 1;
    }

    /* Depozito (1 aylık kira) son ayın kirası yerine sayılır: dönemin son ayı için kira kalemi yoktur.
     * Giriş doğrudan son aya denk geliyorsa (tek ay) kira alınır. */
    let coveredMonth = null;
    if (rents.length > 1) coveredMonth = rents.pop().month;

    return {
        deposit,
        rents,
        coveredMonth,
        months: rents.length,
        dueAtRegistration: deposit + price,
        periodTotal: deposit + price * rents.length,
    };
}
