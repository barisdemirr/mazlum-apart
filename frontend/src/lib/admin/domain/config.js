import { DomainError, fail, find, nextId, withAudit } from "./core";
import { peakOccupancy } from "./registration";
import { round } from "./accounting";

/**
 * YAPI VE AYAR KOMUTLARI: oda tipi, daire, oda, dönem, fiyat, şablon, içerik, yönetici.
 * Finans kayıtlarının aksine bunlar düzenlenebilir; ama kritik olanlar (fiyat, dönem, yönetici) AuditLog'a yazılır.
 * Fiyat değişikliği yalnızca YENİ başvuruları etkiler: mevcut kayıtlar kayıt anındaki fiyatı (snapshot) taşır.
 */

const slugify = (text) =>
    text.toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

/* ───────── oda tipleri ───────── */

export function saveRoomType(state, input, ctx) {
    if (!input.name?.tr?.trim()) fail("Türkçe oda tipi adını yazın.");
    const slug = slugify(input.slug?.trim() || input.name.tr);
    if (!slug) fail("Adres (slug) üretilemedi; farklı bir ad yazın.");
    if (state.roomTypes.some((r) => r.slug === slug && r.id !== input.id)) fail("Bu adreste başka bir oda tipi var.", "conflict");

    let s = state;
    let id = input.id;
    const before = id ? find(s.roomTypes, id, "Oda tipi") : null;
    if (!id) {
        const made = nextId(s, "rt");
        s = made.state;
        id = made.id;
    }
    const num = (v) => (v === "" || v == null ? null : Math.max(0, Math.round(Number(v))));
    const roomType = {
        ...(before ?? {}),
        id, slug,
        name: { tr: input.name.tr.trim(), en: input.name.en?.trim() ?? "" },
        description: { tr: input.description?.tr?.trim() ?? "", en: input.description?.en?.trim() ?? "" },
        peopleInFlat: num(input.peopleInFlat),
        peopleSharingKitchen: num(input.peopleSharingKitchen),
        peopleSharingBathroom: num(input.peopleSharingBathroom),
        features: (input.features ?? []).filter((f) => f.text?.tr?.trim()),
        sharedAreas: (input.sharedAreas ?? []).filter((f) => f.text?.tr?.trim()),
        image: input.image ?? before?.image ?? null,
        active: input.active ?? before?.active ?? true,
    };
    s = { ...s, roomTypes: upsert(s.roomTypes, roomType) };
    s = withAudit(s, ctx, { action: before ? "roomtype.update" : "roomtype.create", entity: "roomtype", entityId: id, before, after: roomType });
    return { state: s, result: roomType };
}

/* ───────── daire & oda ───────── */

export function saveApartment(state, input, ctx) {
    if (!input.name?.trim()) fail("Daire adını yazın.");
    if (state.apartments.some((a) => a.name.toLowerCase() === input.name.trim().toLowerCase() && a.id !== input.id)) fail("Bu adda bir daire zaten var.", "conflict");
    let s = state;
    let id = input.id;
    const before = id ? find(s.apartments, id, "Daire") : null;
    if (!id) {
        const made = nextId(s, "apt");
        s = made.state;
        id = made.id;
    }
    const n = (v) => (v === "" || v == null ? 0 : Math.max(0, Math.round(Number(v))));
    const apartment = { id, name: input.name.trim(), floor: n(input.floor), kitchens: n(input.kitchens), bathrooms: n(input.bathrooms), note: input.note?.trim() ?? "" };
    s = { ...s, apartments: upsert(s.apartments, apartment) };
    s = withAudit(s, ctx, { action: before ? "apartment.update" : "apartment.create", entity: "apartment", entityId: id, before, after: apartment });
    return { state: s, result: apartment };
}

export function deleteApartment(state, { id }, ctx) {
    const apt = find(state.apartments, id, "Daire");
    if (state.rooms.some((r) => r.apartmentId === id)) fail("Bu dairede oda var. Önce odaları kaldırın.", "conflict");
    const s = withAudit({ ...state, apartments: state.apartments.filter((a) => a.id !== id) }, ctx, { action: "apartment.delete", entity: "apartment", entityId: id, before: apt });
    return { state: s, result: id };
}

export function saveRoom(state, input, ctx) {
    if (!input.name?.trim()) fail("Oda adını yazın (örn. 1. Sol Oda).");
    find(state.apartments, input.apartmentId, "Daire");
    find(state.roomTypes, input.roomTypeId, "Oda tipi");
    const beds = Math.round(Number(input.beds));
    if (!(beds >= 1)) fail("Yatak sayısı en az 1 olmalı.");
    if (!["active", "closed", "maintenance"].includes(input.status)) fail("Durum seçin.");
    if (state.rooms.some((r) => r.apartmentId === input.apartmentId && r.name.toLowerCase() === input.name.trim().toLowerCase() && r.id !== input.id)) fail("Bu dairede aynı adda bir oda var.", "conflict");

    let s = state;
    let id = input.id;
    const before = id ? find(s.rooms, id, "Oda") : null;

    // Doluyken kapasite düşürme / kapatma / oda tipi değiştirme engeli (bugünden itibaren yerleşimler)
    if (before) {
        const upcoming = s.placements.filter((p) => p.roomId === id && p.end >= ctx.today);
        if (upcoming.length) {
            if (input.status !== "active") fail("Bu odada şu an ya da ileride kalan öğrenci var; kapatmadan/bakıma almadan önce odalarını değiştirin.", "conflict");
            if (input.roomTypeId !== before.roomTypeId) fail("Bu odada kalan öğrenci var; oda tipi değiştirilemez.", "conflict");
            const start = upcoming.reduce((m, p) => (p.start < m ? p.start : m), upcoming[0].start);
            const end = upcoming.reduce((m, p) => (p.end > m ? p.end : m), upcoming[0].end);
            if (peakOccupancy(s.placements, id, start < ctx.today ? ctx.today : start, end) > beds) fail("Yatak sayısı, odada kalan öğrenci sayısından az olamaz.", "conflict");
        }
    } else {
        const made = nextId(s, "r");
        s = made.state;
        id = made.id;
    }
    const room = { id, apartmentId: input.apartmentId, name: input.name.trim(), roomTypeId: input.roomTypeId, beds, status: input.status };
    s = { ...s, rooms: upsert(s.rooms, room) };
    s = withAudit(s, ctx, { action: before ? "room.update" : "room.create", entity: "room", entityId: id, before, after: room });
    return { state: s, result: room };
}

export function deleteRoom(state, { id }, ctx) {
    const room = find(state.rooms, id, "Oda");
    if (state.placements.some((p) => p.roomId === id)) fail("Bu odada geçmişte yerleşim kaydı var; silinemez. Odayı “Kapalı” yapın.", "conflict");
    const s = withAudit({ ...state, rooms: state.rooms.filter((r) => r.id !== id) }, ctx, { action: "room.delete", entity: "room", entityId: id, before: room });
    return { state: s, result: id };
}

/* ───────── dönem & fiyat ───────── */

export function createPeriod(state, input, ctx) {
    if (!input.name?.trim()) fail("Dönem adını yazın.");
    if (!["academic", "summer"].includes(input.type)) fail("Dönem tipini seçin.");
    if (!input.start || !input.end) fail("Başlangıç ve bitiş tarihini seçin.");
    if (input.start >= input.end) fail("Bitiş tarihi başlangıçtan sonra olmalı.");
    if (state.periods.some((p) => p.name.toLowerCase() === input.name.trim().toLowerCase())) fail("Bu adda bir dönem zaten var.", "conflict");

    const made = nextId(state, "p");
    const period = { id: made.id, name: input.name.trim(), type: input.type, start: input.start, end: input.end, status: "active", applicationsOpen: true, halfTerm: { enabled: false, firstEnd: null, secondStart: null } };
    let s = made.state;

    // Yeni dönem başlayınca şu an aktif olanlar kapanır (plan 3.4); hiçbir kayıt kopyalanmaz
    const closing = s.periods.filter((p) => p.status === "active");
    s = { ...s, periods: [...s.periods.map((p) => (p.status === "active" ? { ...p, status: "closed", applicationsOpen: false } : p)), period] };

    let copied = 0;
    if (input.copyFromPeriodId) {
        const rows = s.roomTypePrices.filter((p) => p.periodId === input.copyFromPeriodId);
        copied = rows.length;
        s = { ...s, roomTypePrices: [...s.roomTypePrices, ...rows.map((r) => ({ ...r, periodId: period.id }))] };
    }
    s = withAudit(s, ctx, { action: "period.create", entity: "period", entityId: period.id, periodId: period.id, after: { ...period, closed: closing.map((p) => p.name), copiedPrices: copied } });
    return { state: s, result: period };
}

export function updatePeriod(state, input, ctx) {
    const period = find(state.periods, input.id, "Dönem");
    if (period.status === "closed") fail("Kapalı dönem düzenlenemez.", "conflict");
    if (!input.name?.trim()) fail("Dönem adını yazın.");
    if (!input.start || !input.end || input.start >= input.end) fail("Tarih aralığı geçersiz.");
    // Dönem dışında kalan yerleşim ya da kayıt oluşmasın
    if (state.enrollments.some((e) => e.periodId === period.id && e.entryDate < input.start)) fail("Bu tarihten önce giriş yapan kayıtlar var; başlangıç tarihi ileri alınamaz.", "conflict");
    if (state.placements.some((p) => p.periodId === period.id && p.end > input.end)) fail("Bitiş tarihinden sonrasına uzanan yerleşimler var.", "conflict");
    const half = input.halfTerm ?? period.halfTerm;
    if (half.enabled && (!half.firstEnd || !half.secondStart)) fail("Yarım dönemi açmak için 1. yarının bitişini ve 2. yarının başlangıcını girin.");
    const next = { ...period, name: input.name.trim(), start: input.start, end: input.end, applicationsOpen: !!input.applicationsOpen, halfTerm: half };
    const s = withAudit({ ...state, periods: state.periods.map((p) => (p.id === period.id ? next : p)) }, ctx, { action: "period.update", entity: "period", entityId: period.id, periodId: period.id, before: period, after: next });
    return { state: s, result: next };
}

export function closePeriod(state, { id }, ctx) {
    const period = find(state.periods, id, "Dönem");
    if (period.status === "closed") fail("Dönem zaten kapalı.", "conflict");
    const pending = state.applications.filter((a) => a.periodId === id && a.status === "pending").length;
    if (pending) fail(`${pending} bekleyen başvuru var. Önce onaylayın ya da reddedin.`, "conflict");
    const next = { ...period, status: "closed", applicationsOpen: false };
    const s = withAudit({ ...state, periods: state.periods.map((p) => (p.id === id ? next : p)) }, ctx, { action: "period.close", entity: "period", entityId: id, periodId: id, before: period, after: next });
    return { state: s, result: next };
}

export function savePrice(state, { periodId, roomTypeId, monthly, deposit }, ctx) {
    const period = find(state.periods, periodId, "Dönem");
    find(state.roomTypes, roomTypeId, "Oda tipi");
    if (period.status === "closed") fail("Kapalı dönemin fiyatları değiştirilemez.", "conflict");
    const m = round(Number(monthly));
    const d = round(Number(deposit));
    if (!(m > 0)) fail("Aylık kira sıfırdan büyük olmalı.");
    if (!(d >= 0)) fail("Depozito eksi olamaz.");
    const before = state.roomTypePrices.find((p) => p.periodId === periodId && p.roomTypeId === roomTypeId) ?? null;
    const row = { periodId, roomTypeId, monthly: m, deposit: d };
    const list = before ? state.roomTypePrices.map((p) => (p === before ? row : p)) : [...state.roomTypePrices, row];
    const s = withAudit({ ...state, roomTypePrices: list }, ctx, { action: "price.update", entity: "price", entityId: `${periodId}:${roomTypeId}`, periodId, before, after: row });
    return { state: s, result: row };
}

/* ───────── mesaj şablonları ───────── */

export function saveTemplate(state, { id, name, tr, en }, ctx) {
    const tpl = find(state.messageTemplates, id, "Şablon");
    if (!tr?.trim()) fail("Türkçe mesaj metnini yazın.");
    const next = { ...tpl, name: name?.trim() || tpl.name, tr: tr.trim(), en: en?.trim() ?? "" };
    return { state: { ...state, messageTemplates: state.messageTemplates.map((t) => (t.id === id ? next : t)) }, result: next };
}

/* ───────── site içeriği ───────── */

export function addMedia(state, { name, url, kind = "image", size = 0, alt }, ctx) {
    if (!url) fail("Dosya seçin.");
    const made = nextId(state, "med");
    const item = { id: made.id, name: name || "görsel", url, kind, size, alt: alt ?? { tr: "", en: "" }, createdAt: ctx.now };
    return { state: { ...made.state, media: [item, ...made.state.media] }, result: item };
}

export function updateMedia(state, { id, alt }, ctx) {
    const item = find(state.media, id, "Medya");
    const next = { ...item, alt: { tr: alt?.tr?.trim() ?? "", en: alt?.en?.trim() ?? "" } };
    return { state: { ...state, media: state.media.map((m) => (m.id === id ? next : m)) }, result: next };
}

export function removeMedia(state, { id }, ctx) {
    const item = find(state.media, id, "Medya");
    if (state.slides.some((s) => s.mediaId === id)) fail("Bu görsel bir slaytta kullanılıyor. Önce slaytı değiştirin.", "conflict");
    if (state.roomTypes.some((r) => r.image?.mediaId === id)) fail("Bu görsel bir oda tipinde kullanılıyor.", "conflict");
    return { state: { ...state, media: state.media.filter((m) => m.id !== id) }, result: item.id };
}

export function saveSlide(state, input, ctx) {
    if (!input.mediaId) fail("Slayt için bir görsel seçin.");
    find(state.media, input.mediaId, "Medya");
    if (!input.title?.tr?.trim()) fail("Türkçe başlığı yazın.");
    let s = state;
    let id = input.id;
    const before = id ? find(s.slides, id, "Slayt") : null;
    if (!id) {
        const made = nextId(s, "sld");
        s = made.state;
        id = made.id;
    }
    const slide = {
        id, mediaId: input.mediaId,
        title: { tr: input.title.tr.trim(), en: input.title.en?.trim() ?? "" },
        subtitle: { tr: input.subtitle?.tr?.trim() ?? "", en: input.subtitle?.en?.trim() ?? "" },
        active: input.active ?? true,
        order: before?.order ?? s.slides.length + 1,
    };
    return { state: { ...s, slides: upsert(s.slides, slide) }, result: slide };
}

export function moveSlide(state, { id, direction }, ctx) {
    const sorted = [...state.slides].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === id);
    const j = i + (direction === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= sorted.length) return { state, result: null };
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    return { state: { ...state, slides: sorted.map((x, idx) => ({ ...x, order: idx + 1 })) }, result: id };
}

export function deleteSlide(state, { id }, ctx) {
    find(state.slides, id, "Slayt");
    return { state: { ...state, slides: state.slides.filter((x) => x.id !== id).map((x, idx) => ({ ...x, order: idx + 1 })) }, result: id };
}

export function savePage(state, { key, title, body }, ctx) {
    const page = find(state.pages.map((p) => ({ ...p, id: p.key })), key, "Sayfa");
    if (!title?.tr?.trim()) fail("Türkçe başlığı yazın.");
    const next = { key, title: { tr: title.tr.trim(), en: title.en?.trim() ?? "" }, body: { tr: body?.tr?.trim() ?? "", en: body?.en?.trim() ?? "" }, updatedAt: ctx.now };
    return { state: { ...state, pages: state.pages.map((p) => (p.key === key ? next : p)) }, result: next };
}

/** Site ayarları: BOŞ alanlar sitede gösterilmez (uydurma iletişim bilgisi yok) */
export function saveSiteSettings(state, input, ctx) {
    const phone = String(input.phone ?? "").replace(/\D/g, "");
    const whatsapp = String(input.whatsapp ?? "").replace(/\D/g, "");
    if (phone && !/^5\d{9}$/.test(phone.replace(/^0/, ""))) fail("Telefon 5 ile başlayan 10 haneli olmalı.");
    if (whatsapp && !/^5\d{9}$/.test(whatsapp.replace(/^0/, ""))) fail("WhatsApp numarası 5 ile başlayan 10 haneli olmalı.");
    if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) fail("E-posta adresi geçersiz.");
    const next = {
        phone: phone.replace(/^0/, ""), whatsapp: whatsapp.replace(/^0/, ""), email: input.email?.trim() ?? "",
        address: { tr: input.address?.tr?.trim() ?? "", en: input.address?.en?.trim() ?? "" },
        mapUrl: input.mapUrl?.trim() ?? "", instagram: input.instagram?.trim() ?? "",
        iban: input.iban?.replace(/\s/g, "") ?? "", ibanHolder: input.ibanHolder?.trim() ?? "",
    };
    const s = withAudit({ ...state, siteSettings: next }, ctx, { action: "settings.update", entity: "settings", entityId: "site", before: state.siteSettings, after: next });
    return { state: s, result: next };
}

/* ───────── yöneticiler ───────── */

export function addAdmin(state, { name, email }, ctx) {
    if (!name?.trim()) fail("Adı yazın.");
    if (!/^\S+@\S+\.\S+$/.test(email ?? "")) fail("Geçerli bir e-posta yazın.");
    if (state.admins.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) fail("Bu e-posta ile bir yönetici zaten var.", "conflict");
    const made = nextId(state, "admin");
    const admin = { id: made.id, name: name.trim(), email: email.trim().toLowerCase(), active: true, createdAt: ctx.now };
    const initialPassword = Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 9000);
    const s = withAudit({ ...made.state, admins: [...made.state.admins, admin] }, ctx, { action: "admin.create", entity: "admin", entityId: admin.id, after: { name: admin.name, email: admin.email } });
    return { state: s, result: { admin, initialPassword } };
}

export function setAdminActive(state, { id, active }, ctx) {
    const admin = find(state.admins, id, "Yönetici");
    if (!active) {
        if (id === ctx.userId) fail("Kendi hesabınızı pasife alamazsınız.", "conflict");
        if (state.admins.filter((a) => a.active && a.id !== id).length === 0) fail("En az bir aktif yönetici kalmalı.", "conflict");
    }
    const next = { ...admin, active };
    const s = withAudit({ ...state, admins: state.admins.map((a) => (a.id === id ? next : a)) }, ctx, { action: active ? "admin.activate" : "admin.deactivate", entity: "admin", entityId: id, before: { active: admin.active }, after: { active } });
    return { state: s, result: next };
}

export function updateProfile(state, { id, name }, ctx) {
    const admin = find(state.admins, id, "Yönetici");
    if (!name?.trim()) fail("Adınızı yazın.");
    const next = { ...admin, name: name.trim() };
    return { state: { ...state, admins: state.admins.map((a) => (a.id === id ? next : a)) }, result: next };
}

export function changePassword(state, { id, current, next, repeat }, ctx) {
    find(state.admins, id, "Yönetici");
    if (!current) fail("Mevcut şifrenizi yazın.");
    if ((next ?? "").length < 8) fail("Yeni şifre en az 8 karakter olmalı.");
    if (next !== repeat) fail("Yeni şifreler aynı değil.");
    if (next === current) fail("Yeni şifre eskisiyle aynı olamaz.");
    // Gerçek doğrulama ve hash backend'dedir; burada yalnızca denetim kaydı yazılır
    return { state: withAudit(state, ctx, { action: "admin.password", entity: "admin", entityId: id }), result: true };
}

export { DomainError };
