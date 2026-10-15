import { SITE } from "@/lib/constants";
import { MOCK_HERO, MOCK_ROOM_TYPES, getMockRawGallery, getMockRoomNames, getMockRoomTypeDetail } from "@/lib/mockData";
import { MOCK_PERIODS } from "./periods";
import { addBill, addExpense, addCharge, payBill, recordPayment, refundAdvance, reverseCharge, transfer } from "@/lib/admin/domain/ledger";
import { approveApplication, createApplication, endEnrollment, placeStudent, rejectApplication } from "@/lib/admin/domain/registration";

/**
 * GEÇİCİ örnek veri: panelin nasıl çalıştığını göstermek için. Backend hazır olunca bu dosya silinir.
 * Veri, gerçek komutlarla (kayıt onayı, tahsilat, iptal...) üretilir; yani ekranlardaki her sayı
 * defter kurallarıyla tutarlıdır. İsimler, telefonlar ve tutarlar UYDURMADIR; müşteri verisi değildir.
 */

const BY = "Yönetici";
const at = (day) => `${day}T10:00:00`;
const ctxOn = (day) => ({ now: at(day), today: day, by: BY });

const tcFor = (n) => {
    const d = [1, 0, 0, 0, 0, 0, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    d.push(((odd * 7 - even) % 10 + 10) % 10);
    d.push(d.reduce((s, x) => s + x, 0) % 10);
    return d.join("");
};

const phoneFor = (n) => `500000${String(n).padStart(4, "0")}`;

/* Kayıt formunun diğer alanları (doğum tarihi, adres, il/ilçe, fakülte) için tutarlı örnek veri */
const PLACES = [
    { provinceId: 61, district: "Ortahisar" }, { provinceId: 28, district: "Merkez" }, { provinceId: 6, district: "Çankaya" },
    { provinceId: 34, district: "Kadıköy" }, { provinceId: 25, district: "Yakutiye" }, { provinceId: 53, district: "Merkez" },
];
const FACULTIES = ["Mühendislik Fakültesi", "Fen Fakültesi", "İktisadi ve İdari Bilimler Fakültesi", "Sağlık Bilimleri Fakültesi", "Orman Fakültesi", "Edebiyat Fakültesi"];
const profileFor = (n) => ({
    birthDate: `${2003 + (n % 3)}-${String(1 + (n % 12)).padStart(2, "0")}-${String(1 + ((n * 7) % 27)).padStart(2, "0")}`,
    address: `Örnek Mah. ${10 + n}. Sok. No: ${1 + (n % 40)} Daire: ${1 + (n % 9)}`,
    ...PLACES[n % PLACES.length],
    faculty: FACULTIES[n % FACULTIES.length],
});

export function buildSeed() {
    const feat = (list) => (list?.tr ?? []).map((tr, i) => ({ icon: "check_circle", text: { tr, en: list.en?.[i] ?? "" } }));
    const roomTypes = MOCK_ROOM_TYPES.map((r) => {
        const d = getMockRoomTypeDetail(r.slug);
        return {
            id: r.id, slug: r.slug, name: r.name, description: { tr: "", en: "" },
            peopleInFlat: r.peopleInFlat, peopleSharingKitchen: r.peopleSharingKitchen, peopleSharingBathroom: r.peopleSharingBathroom,
            features: feat(d?.roomFeatures), sharedAreas: feat(d?.sharedAreas),
            image: { mediaId: `med-${r.slug}`, url: r.image.url }, active: true,
            gallery: getMockRawGallery(r.slug).map((g) => ({ ...g, name: "", size: 0, poster: g.poster ?? null, caption: { tr: g.caption?.tr ?? "", en: g.caption?.en ?? "" }, tag: g.tag ?? null })),
        };
    });
    const media = [
        { id: "med-hero", name: "ana-sayfa-gorseli", url: MOCK_HERO.image.url, kind: "image", size: 0, alt: MOCK_HERO.image.alt, createdAt: at("2026-08-20") },
        ...MOCK_ROOM_TYPES.map((r) => ({ id: `med-${r.slug}`, name: r.slug, url: r.image.url, kind: "image", size: 0, alt: r.image.alt, createdAt: at("2026-08-20") })),
    ];
    const [TEK, IKI, UC] = roomTypes.map((r) => r.id);

    /* Bu iki dönemin fiyatları: aylık kira ve depozito (depozito = 1 aylık kira; son ay kirası yerine sayılır) */
    const prices = [
        { periodId: "p-2026-27", roomTypeId: TEK, monthly: 12500, deposit: 12500 },
        { periodId: "p-2026-27", roomTypeId: IKI, monthly: 9500, deposit: 9500 },
        { periodId: "p-2026-27", roomTypeId: UC, monthly: 7500, deposit: 7500 },
        { periodId: "p-2025-26", roomTypeId: TEK, monthly: 10000, deposit: 10000 },
        { periodId: "p-2025-26", roomTypeId: IKI, monthly: 7500, deposit: 7500 },
        { periodId: "p-2025-26", roomTypeId: UC, monthly: 6000, deposit: 6000 },
    ];

    const apartments = [
        { id: "apt-1", name: "Daire 1", floor: 2, kitchens: 1, bathrooms: 2, note: "" },
        { id: "apt-2", name: "Daire 2", floor: 2, kitchens: 1, bathrooms: 2, note: "" },
        { id: "apt-3", name: "Daire 3", floor: 3, kitchens: 1, bathrooms: 3, note: "" },
        { id: "apt-4", name: "Daire 4", floor: 3, kitchens: 1, bathrooms: 2, note: "" },
    ];
    const room = (id, apartmentId, name, roomTypeId, beds, status = "active") => ({ id, apartmentId, name, roomTypeId, beds, status });
    // Fiziksel oda adları galeri etiketleriyle aynıdır: "1. Sol Oda" etiketli fotoğraf, bu odanın fotoğrafıdır.
    const [tekNames, ikiNames, ucNames] = MOCK_ROOM_TYPES.map((r) => getMockRoomNames(r.slug));
    const rooms = [
        ...tekNames.map((n, i) => room(`r-1-${i + 1}`, "apt-1", n, TEK, 1)),
        ...ikiNames.map((n, i) => room(`r-2-${i + 1}`, "apt-2", n, IKI, 2)),
        ...ucNames.map((n, i) => room(`r-3-${i + 1}`, "apt-3", n, UC, 3)),
        ...tekNames.map((n, i) => room(`r-4-${i + 1}`, "apt-4", n, TEK, 1, i === 3 ? "maintenance" : "active")),
    ];

    let state = {
        seq: 1,
        periods: MOCK_PERIODS.map((p) => ({ ...p, status: "active", applicationsOpen: true })), // seed sırasında açık; sonunda eski dönemler kapatılır
        roomTypes,
        roomTypePrices: prices,
        apartments,
        rooms,
        accounts: [
            { id: "acc-cash", type: "cash", name: "Nakit Kasa", iban: null, active: true },
            { id: "acc-bank1", type: "bank", name: "Banka Hesabı 1", iban: null, active: true },
            { id: "acc-bank2", type: "bank", name: "Banka Hesabı 2", iban: null, active: true },
        ],
        expenseCategories: [
            { id: "cat-maint", name: "Bakım & Onarım" },
            { id: "cat-clean", name: "Temizlik" },
            { id: "cat-supply", name: "Malzeme" },
            { id: "cat-tax", name: "Vergi & Harç" },
            { id: "cat-bills", name: "Faturalar", system: "bills" },
            { id: "cat-other", name: "Diğer" },
        ],
        messageTemplates: [
            { id: "tpl-reminder", key: "payment_reminder", name: "Ödeme hatırlatma", tr: "Merhaba {ad}, {oda} için {kalem} ({tutar}) {vade} tarihinde ödenmelidir. Ödemeyi yaptıktan sonra bize bilgi verirseniz seviniriz.", en: "Hello {ad}, your {kalem} ({tutar}) for {oda} is due on {vade}. Please let us know once you have paid." },
            { id: "tpl-overdue", key: "payment_overdue", name: "Geciken ödeme", tr: "Merhaba {ad}, {kalem} ödemenizin vadesi {vade} tarihinde geçti. Kalan tutar: {tutar}. Ödeme yaptıysanız lütfen dekontu paylaşın.", en: "Hello {ad}, your {kalem} payment was due on {vade}. Remaining amount: {tutar}. If you have already paid, please share the receipt." },
            { id: "tpl-received", key: "application_received", name: "Başvuru alındı", tr: "Merhaba {ad}, başvurunuz bize ulaştı. İnceleyip size dönüş yapacağız.", en: "Hello {ad}, we have received your application and will get back to you shortly." },
            { id: "tpl-maint", key: "maintenance_update", name: "Arıza durumu", tr: "Merhaba {ad}, “{konu}” arıza kaydınızın durumu: {durum}.", en: "Hello {ad}, the status of your maintenance request “{konu}” is: {durum}." },
            { id: "tpl-approved", key: "enrollment_approved", name: "Kayıt onayı ve giriş bilgisi", tr: "Merhaba {ad}, kaydınız onaylandı. Öğrenci alanı giriş bilgileriniz: telefon {telefon}, şifre {sifre}.", en: "Hello {ad}, your registration is confirmed. Your student area login: phone {telefon}, password {sifre}." },
        ],
        media,
        slides: [{ id: "sld-1", mediaId: "med-hero", title: { tr: "", en: "" }, subtitle: { tr: "", en: "" }, active: true, order: 1 }],
        pages: [
            { key: "about", title: { tr: "Hakkımızda", en: "About us" }, body: { tr: "", en: "" }, updatedAt: null },
            { key: "contact", title: { tr: "İletişim", en: "Contact" }, body: { tr: "", en: "" }, updatedAt: null },
            { key: "kvkk", title: { tr: "KVKK Aydınlatma Metni", en: "Privacy Notice" }, body: { tr: "", en: "" }, updatedAt: null },
        ],
        siteSettings: { phone: SITE.phone.replace(/\D/g, "").slice(-10), whatsapp: SITE.whatsapp.replace(/\D/g, "").slice(-10), email: "", address: { tr: "", en: "" }, mapUrl: "", instagram: "", iban: SITE.bank.iban.replace(/\s/g, ""), ibanHolder: SITE.bank.holder },
        admins: [{ id: "admin-1", name: "Yönetici", email: "yonetici@mazlumapart.local", active: true, createdAt: at("2026-08-20") }],
        students: [],
        applications: [],
        enrollments: [],
        placements: [],
        charges: [],
        payments: [],
        allocations: [],
        transactions: [],
        expenses: [],
        bills: [],
        maintenance: [],
        contacts: [],
        audit: [],
    };

    const run = (fn, day) => {
        const out = fn(state, ctxOn(day));
        state = out.state;
        return out.result;
    };

    let n = 0;
    /** Kayıt aç: başvuru -> onay -> (isteğe bağlı) yerleşim */
    const enroll = ({ periodId, first, last, roomTypeId, entry, payWindow, roomId = null, school = "Karadeniz Teknik Üniversitesi", dept, grade = "2", source = "office" }) => {
        n += 1;
        const app = run((s, c) => createApplication(s, {
            periodId, source,
            student: { tc: tcFor(n), firstName: first, lastName: last, phone: phoneFor(n), ...profileFor(n), school, department: dept, grade, guardians: [{ name: `${last} (veli)`, phone: phoneFor(n + 500) }] },
            roomTypeId, entryDate: entry, payWindow,
        }, c), entry);
        const { enrollment } = run((s, c) => approveApplication(s, { applicationId: app.id }, c), entry);
        if (roomId) run((s, c) => placeStudent(s, { enrollmentId: enrollment.id, roomId }, c), entry);
        return enrollment;
    };
    const pay = (enr, day, amount, method = "transfer", accountId) =>
        run((s, c) => recordPayment(s, { enrollmentId: enr.id, amount, date: day, method, accountId: accountId ?? (method === "cash" ? "acc-cash" : "acc-bank1") }, c), day);

    /* ═════════ 2025–2026 (kapalı dönem) ═════════ */
    const P0 = "p-2025-26";
    const o1 = enroll({ periodId: P0, first: "Elif", last: "Yıldız", roomTypeId: TEK, entry: "2025-09-01", payWindow: "early", roomId: "r-1-1", dept: "Mimarlık" });
    pay(o1, "2025-09-01", 110000);
    const o2 = enroll({ periodId: P0, first: "Hatice", last: "Öztürk", roomTypeId: IKI, entry: "2025-09-02", payWindow: "early", roomId: "r-2-2", dept: "Eczacılık" });
    pay(o2, "2025-09-02", 67500, "cash");
    const o3 = enroll({ periodId: P0, first: "Sevgi", last: "Aksoy", roomTypeId: UC, entry: "2025-09-03", payWindow: "mid", roomId: "r-3-1", dept: "Hemşirelik" });
    pay(o3, "2025-09-03", 54000);
    const o4 = enroll({ periodId: P0, first: "Pınar", last: "Erdem", roomTypeId: TEK, entry: "2025-09-01", payWindow: "early", roomId: "r-1-2", dept: "Bilgisayar Mühendisliği" });
    pay(o4, "2025-09-01", 110000);
    const o5 = enroll({ periodId: P0, first: "Tuğba", last: "Çakır", roomTypeId: IKI, entry: "2025-09-05", payWindow: "mid", roomId: "r-2-1", dept: "İktisat" });
    pay(o5, "2025-09-05", 82500);
    const o6 = enroll({ periodId: P0, first: "Cansu", last: "Ateş", roomTypeId: UC, entry: "2025-09-06", payWindow: "early", roomId: "r-3-2", dept: "Psikoloji" });
    pay(o6, "2025-09-06", 66000, "cash");
    run((s, c) => addExpense(s, { periodId: P0, categoryId: "cat-maint", amount: 4200, date: "2025-11-12", accountId: "acc-bank1", description: "Kombi bakımı" }, c), "2025-11-12");
    run((s, c) => addExpense(s, { periodId: P0, categoryId: "cat-clean", amount: 1350, date: "2026-01-09", accountId: "acc-cash", description: "Temizlik malzemesi" }, c), "2026-01-09");

    /* ═════════ 2026–2027 (aktif dönem) ═════════ */
    const P1 = "p-2026-27";
    const e1 = enroll({ periodId: P1, first: "Elif", last: "Yıldız", roomTypeId: TEK, entry: "2026-09-01", payWindow: "early", roomId: "r-1-1", dept: "Mimarlık", grade: "3" });
    pay(e1, "2026-09-01", 62500); // peşin: depozito + Eylül–Aralık
    const e2 = enroll({ periodId: P1, first: "Zeynep", last: "Kaya", roomTypeId: TEK, entry: "2026-09-02", payWindow: "early", roomId: "r-1-2", dept: "Orman Mühendisliği", grade: "1", source: "online" });
    pay(e2, "2026-09-02", 25000, "cash");
    const e3 = enroll({ periodId: P1, first: "Ayşe", last: "Demir", roomTypeId: TEK, entry: "2026-09-05", payWindow: "mid", roomId: "r-1-3", dept: "Makine Mühendisliği", grade: "2" });
    pay(e3, "2026-09-05", 25000, "cash");
    const e4 = enroll({ periodId: P1, first: "Merve", last: "Çelik", roomTypeId: TEK, entry: "2026-09-03", payWindow: "early", roomId: "r-1-4", dept: "Diş Hekimliği", grade: "4" });
    pay(e4, "2026-09-03", 35000); // dep + Eylül + Ekim'in 10.000'i
    const e5 = enroll({ periodId: P1, first: "Selin", last: "Arslan", roomTypeId: IKI, entry: "2026-09-01", payWindow: "early", roomId: "r-2-1", dept: "İşletme", grade: "2", source: "online" });
    pay(e5, "2026-09-01", 19000); pay(e5, "2026-10-04", 9500);
    const e6 = enroll({ periodId: P1, first: "Büşra", last: "Koç", roomTypeId: IKI, entry: "2026-09-04", payWindow: "mid", roomId: "r-2-1", dept: "Hukuk", grade: "1" });
    pay(e6, "2026-09-04", 19000); pay(e6, "2026-10-12", 9500, "cash");
    const e7 = enroll({ periodId: P1, first: "Hatice", last: "Öztürk", roomTypeId: IKI, entry: "2026-09-10", payWindow: "early", roomId: "r-2-2", dept: "Eczacılık", grade: "4" });
    pay(e7, "2026-09-10", 19000);
    const e8 = enroll({ periodId: P1, first: "Fatma", last: "Aydın", roomTypeId: IKI, entry: "2026-09-10", payWindow: "early", roomId: "r-2-2", dept: "Gıda Mühendisliği", grade: "3" });
    pay(e8, "2026-09-10", 40000); // dep + Eylül–Kasım + Aralık'ın 2.000'i
    const e9 = enroll({ periodId: P1, first: "Esra", last: "Şahin", roomTypeId: UC, entry: "2026-09-06", payWindow: "mid", roomId: "r-3-1", dept: "Hemşirelik", grade: "1" });
    pay(e9, "2026-09-06", 15000, "cash");
    const e10 = enroll({ periodId: P1, first: "Rabia", last: "Kılıç", roomTypeId: UC, entry: "2026-09-06", payWindow: "early", roomId: "r-3-1", dept: "Psikoloji", grade: "2" });
    pay(e10, "2026-09-06", 15000); pay(e10, "2026-10-02", 7500);
    run((s, c) => addCharge(s, { enrollmentId: e10.id, kind: "discount", amount: 500, dueDate: "2026-10-05", note: "İndirim" }, c), "2026-10-02");
    const e11 = enroll({ periodId: P1, first: "Gamze", last: "Polat", roomTypeId: UC, entry: "2026-09-08", payWindow: "mid", roomId: "r-3-1", dept: "Sosyoloji", grade: "2" });
    pay(e11, "2026-09-08", 15000); pay(e11, "2026-10-10", 3000, "cash");
    const e12 = enroll({ periodId: P1, first: "Nur", last: "Tekin", roomTypeId: UC, entry: "2026-10-12", payWindow: "early", dept: "Kimya", grade: "1", source: "online" }); // onaylı, henüz yerleşmedi
    const e13 = enroll({ periodId: P1, first: "İrem", last: "Güneş", roomTypeId: TEK, entry: "2026-09-15", payWindow: "early", roomId: "r-4-1", dept: "Turizm", grade: "1" });
    pay(e13, "2026-09-15", 37500);
    run((s, c) => endEnrollment(s, { enrollmentId: e13.id, status: "cancelled", effectiveDate: "2026-10-02", reason: "Kayıt iptali" }, c), "2026-10-03");
    // Depozito iade akışı: depozito kalemi ters kayıtla kapatılır, serbest kalan para avans olur ve iade edilir
    const dep = state.charges.find((c) => c.enrollmentId === e13.id && c.kind === "deposit");
    run((s, c) => reverseCharge(s, { chargeId: dep.id, reason: "Depozito iadesi" }, c), "2026-10-03");
    run((s, c) => refundAdvance(s, { enrollmentId: e13.id, amount: 12500, date: "2026-10-04", accountId: "acc-bank1", note: "Depozito iadesi" }, c), "2026-10-04");
    const e14 = enroll({ periodId: P1, first: "Dilara", last: "Yavuz", roomTypeId: TEK, entry: "2026-09-20", payWindow: "mid", roomId: "r-4-2", dept: "Elektrik Mühendisliği", grade: "2" });
    pay(e14, "2026-09-20", 25000);

    // Bekleyen / reddedilen başvurular (online)
    const pending = [
        ["Ceren", "Aktaş", TEK, "Moleküler Biyoloji", "2026-10-26"],
        ["Damla", "Korkmaz", IKI, "Kamu Yönetimi", "2026-10-20"],
        ["Beyza", "Tunç", UC, "Beslenme ve Diyetetik", "2026-11-02"],
        ["Melis", "Ünal", IKI, "Fizyoterapi", "2026-10-19"],
        ["Aslı", "Bayrak", TEK, "Peyzaj Mimarlığı", "2026-10-22"],
    ];
    const pendingIds = [];
    pending.forEach(([f, l, rt, d, entry], i) => {
        n += 1;
        const day = `2026-10-${String(10 + i).padStart(2, "0")}`;
        const app = run((s, c) => createApplication(s, { periodId: P1, source: "online", student: { tc: tcFor(n), firstName: f, lastName: l, phone: phoneFor(n), ...profileFor(n), school: "Karadeniz Teknik Üniversitesi", department: d, grade: "1", guardians: [{ name: `${l} (veli)`, phone: phoneFor(n + 500) }] }, roomTypeId: rt, entryDate: entry, payWindow: i % 2 ? "mid" : "early" }, c), day);
        pendingIds.push(app.id);
    });
    run((s, c) => rejectApplication(s, { applicationId: pendingIds[3], reason: "Seçilen oda tipi dolu" }, c), "2026-10-14");
    // reddedilen başvuruyu listeden çıkarmak için pendingIds sırası korunur

    /* Gider ve faturalar */
    const ex = (day, cat, amount, desc, acc = "acc-cash") => run((s, c) => addExpense(s, { periodId: P1, categoryId: cat, amount, date: day, accountId: acc, description: desc }, c), day);
    ex("2026-09-02", "cat-maint", 1850, "Kombi servis bakımı", "acc-bank1");
    ex("2026-09-05", "cat-clean", 640, "Temizlik malzemesi");
    ex("2026-09-20", "cat-supply", 420, "Küçük onarım malzemesi");
    ex("2026-10-03", "cat-maint", 350, "Musluk tamiri");
    run((s, c) => transfer(s, { periodId: P1, fromId: "acc-cash", toId: "acc-bank1", amount: 20000, date: "2026-10-09", note: "Kasadan bankaya yatırma" }, c), "2026-10-09");

    const bill = (kind, month, amount, due, note = "") => run((s, c) => addBill(s, { periodId: P1, kind, month, amount, dueDate: due, note }, c), "2026-10-01");
    const b1 = bill("electricity", "2026-09", 3420, "2026-10-08");
    const b2 = bill("water", "2026-09", 880, "2026-10-08");
    bill("gas", "2026-09", 2150, "2026-10-18");
    bill("internet", "2026-09", 690, "2026-10-10");
    bill("internet", "2026-10", 690, "2026-11-10");
    run((s, c) => payBill(s, { billId: b1.id, accountId: "acc-bank1", date: "2026-10-07" }, c), "2026-10-07");
    run((s, c) => payBill(s, { billId: b2.id, accountId: "acc-bank1", date: "2026-10-07" }, c), "2026-10-07");

    /* Arıza kayıtları ve iletişim geçmişi */
    const roomLabel = (id) => { const r = rooms.find((x) => x.id === id); return `${apartments.find((a) => a.id === r.apartmentId).name} · ${r.name}`; };
    state = {
        ...state,
        maintenance: [
            { id: "mnt-1", periodId: P1, enrollmentId: e2.id, roomLabel: roomLabel("r-1-2"), area: "room", title: "Priz çalışmıyor", description: "Yatağın yanındaki priz elektrik vermiyor.", status: "received", adminNote: "", createdAt: at("2026-10-13"), updatedAt: at("2026-10-13") },
            { id: "mnt-2", periodId: P1, enrollmentId: e5.id, roomLabel: roomLabel("r-2-1"), area: "kitchen", title: "Evye tıkanıklığı", description: "Mutfak evyesi geç akıtıyor.", status: "in_progress", adminNote: "Tesisatçı çağrıldı.", createdAt: at("2026-10-09"), updatedAt: at("2026-10-11") },
            { id: "mnt-3", periodId: P1, enrollmentId: e11.id, roomLabel: roomLabel("r-3-1"), area: "bathroom", title: "Duş başlığı", description: "Duş başlığı damlatıyor.", status: "done", adminNote: "Değiştirildi.", createdAt: at("2026-10-02"), updatedAt: at("2026-10-04") },
        ],
        contacts: [
            { id: "ctc-1", periodId: P1, enrollmentId: e2.id, purpose: "payment_overdue", channel: "whatsapp", at: at("2026-10-14"), by: BY },
            { id: "ctc-2", periodId: P1, enrollmentId: e7.id, purpose: "payment_overdue", channel: "whatsapp", at: at("2026-10-10"), by: BY },
            { id: "ctc-3", periodId: P1, enrollmentId: e4.id, purpose: "payment_overdue", channel: "whatsapp", at: at("2026-10-11"), by: BY },
        ],
        seq: state.seq + 10,
    };

    // Eski dönemler kapatılır
    state = { ...state, periods: state.periods.map((p) => MOCK_PERIODS.find((m) => m.id === p.id) ?? p) };
    // Bildirim (push) aboneliği: öğrenci portalını yükleyip bildirimi açan öğrenciler. Gerçekte öğrencinin kendi
    // cihazı sunucuya abone olur; burada örnek olarak dört öğrenciden üçü abonedir.
    state = { ...state, students: state.students.map((s, i) => ({ ...s, pushEnabled: i % 4 !== 3 })) };
    // Seed denetim kayıtları "yönetici" adına zaten yazıldı
    return state;
}
