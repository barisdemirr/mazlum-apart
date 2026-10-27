import { formatDate, formatPrice } from "@/lib/format";

/** Panelde görünen etiketler ve biçimler: tek yerde. Yeni bir durum eklenirse buraya yazılır. */

export const money = (n) => formatPrice(n, "TRY", "tr");
export const date = (iso) => formatDate(iso);

export const initials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase("tr")).join("");

/** tone: neutral | brand | accent | ok | warn | danger  (admin.css .ad-badge-*) */
export const ENROLLMENT_STATUS = {
    approved: { label: "Onaylı kayıt", tone: "accent" },
    active: { label: "Aktif konaklama", tone: "ok" },
    cancelled: { label: "İptal", tone: "danger" },
    left: { label: "Ayrıldı", tone: "neutral" },
};

/** Tek SMS'in durumu (backend SmsMessageStatus, snake_case) */
export const SMS_MESSAGE_STATUS = {
    pending: { label: "Bekliyor", tone: "neutral" },
    simulated: { label: "Simüle", tone: "neutral" },
    waiting: { label: "Gönderildi", tone: "accent" },
    delivered: { label: "İletildi", tone: "ok" },
    not_delivered: { label: "İletilemedi", tone: "danger" },
    expired: { label: "Zaman aşımı", tone: "warn" },
    rejected: { label: "Reddedildi", tone: "danger" },
    failed: { label: "Gönderilemedi", tone: "danger" },
    unknown: { label: "Belirsiz", tone: "warn" },
};

/** Ön başvuru durumu (backend PreRegistrationStatus) */
export const PRE_REGISTRATION_STATUS = {
    new: { label: "Yeni", tone: "brand" },
    contacted: { label: "Bilgilendirildi", tone: "accent" },
    registered: { label: "Kayıt oldu", tone: "ok" },
    cancelled: { label: "Vazgeçti", tone: "neutral" },
};

export const APPLICATION_STATUS = {
    pending: { label: "Başvuru", tone: "brand" },
    approved: { label: "Onaylandı", tone: "ok" },
    rejected: { label: "Reddedildi", tone: "danger" },
};

export const PAY_STATUS = {
    paid: { label: "Ödendi", tone: "ok" },
    ok: { label: "Güncel", tone: "brand" },
    overdue: { label: "Gecikmiş", tone: "danger" },
    empty: { label: "Kalem yok", tone: "neutral" },
};

export const CHARGE_KIND = {
    deposit: "Depozito",
    rent: "Kira",
    extra_stay: "Ek konaklama",
    summer: "Yaz",
    other: "Diğer",
    discount: "İndirim",
};

export const METHOD = { cash: "Nakit", transfer: "Havale / EFT", pos: "POS" };
export const ACCOUNT_TYPE = { cash: "Kasa", bank: "Banka" };
export const PAY_WINDOW = { early: "Ayın 1–5'i", mid: "Ayın 15–20'si" };
export const SOURCE = { online: "Web sitesi", office: "Ofis" };
export const TERM = { full: "Tam dönem", first: "1. yarı", second: "2. yarı" };

/** Konaklama türü (backend StayPlan): başvuru formunda öğrenci seçer */
export const STAY_PLAN = {
    academic: { label: "Akademik", tone: "neutral", long: "Akademik dönem (10 ay)" },
    yearly: { label: "12 ay", tone: "accent", long: "12 ay (yaz dahil)" },
    summer: { label: "Sadece yaz", tone: "warn", long: "Sadece yaz" },
};

export const BILL_KIND = { electricity: "Elektrik", water: "Su", gas: "Doğalgaz", internet: "İnternet", other: "Diğer" };
export const BILL_STATE = {
    paid: { label: "Ödendi", tone: "ok" },
    awaiting: { label: "Fatura bekleniyor", tone: "accent" }, // abonelikten üretildi, gerçek fatura henüz girilmedi
    overdue: { label: "Gecikmiş", tone: "danger" },
    soon: { label: "Yaklaşıyor", tone: "warn" },
    unpaid: { label: "Ödenmedi", tone: "neutral" },
};

export const ROOM_STATUS = {
    active: { label: "Aktif", tone: "ok" },
    closed: { label: "Kapalı", tone: "neutral" },
    maintenance: { label: "Bakımda", tone: "warn" },
};

export const MAINT_STATUS = {
    received: { label: "Alındı", tone: "brand" },
    in_progress: { label: "İşlemde", tone: "warn" },
    done: { label: "Tamamlandı", tone: "ok" },
};

export const CONTACT_PURPOSE = {
    payment_reminder: "Ödeme hatırlatma",
    payment_overdue: "Geciken ödeme",
    application_received: "Başvuru bilgilendirme",
    enrollment_approved: "Kayıt onayı",
    maintenance_update: "Arıza durumu",
    announcement: "Duyuru",
    other: "Diğer",
};

export const CONTACT_CHANNEL = { whatsapp: "WhatsApp", sms: "SMS", push: "Bildirim" };

export const AUDIT_ACTION = {
    "sms.bulk": "Toplu SMS gönderildi",
    "push.bulk": "Toplu bildirim gönderildi",
    "payment.create": "Tahsilat girildi",
    "payment.cancel": "Tahsilat iptal edildi",
    "payment.refund": "Avans iadesi",
    "charge.create": "Borç kalemi eklendi",
    "charge.discount": "İndirim uygulandı",
    "charge.reverse": "Borç kalemi iptal edildi",
    "enrollment.discount": "Aylık indirim uygulandı",
    "enrollment.term": "Kayıt süresi değiştirildi",
    "enrollment.tracking": "Giriş / işlem takibi güncellendi",
    "student.document": "Öğrenci belgesi yüklendi",
    "student.document-delete": "Öğrenci belgesi silindi",
    "enrollment.room-change": "Daire / oda tipi değiştirildi",
    "charge.reschedule": "Taksit vadesi değiştirildi",
    "account.create": "Hesap eklendi",
    "account.opening": "Açılış bakiyesi girildi",
    "transfer.create": "Transfer yapıldı",
    "expense.create": "Gider girildi",
    "expense.cancel": "Gider iptal edildi",
    "bill.create": "Fatura kaydedildi",
    "bill.pay": "Fatura ödendi",
    "application.create": "Başvuru alındı",
    "application.approve": "Başvuru onaylandı",
    "application.reject": "Başvuru reddedildi",
    "enrollment.end": "Kayıt kapatıldı",
    "placement.create": "Yerleşim yapıldı",
    "placement.move": "Oda değiştirildi",
    "roomtype.create": "Oda tipi eklendi",
    "roomtype.update": "Oda tipi güncellendi",
    "apartment.create": "Daire eklendi",
    "apartment.update": "Daire güncellendi",
    "apartment.delete": "Daire silindi",
    "room.create": "Oda eklendi",
    "room.update": "Oda güncellendi",
    "room.delete": "Oda silindi",
    "period.create": "Yeni dönem başlatıldı",
    "period.update": "Dönem güncellendi",
    "period.close": "Dönem kapatıldı",
    "price.update": "Fiyat güncellendi",
    "settings.update": "Site ayarları güncellendi",
    "admin.create": "Yönetici eklendi",
    "admin.activate": "Yönetici aktifleştirildi",
    "admin.deactivate": "Yönetici pasife alındı",
    "admin.password": "Şifre değiştirildi",
    "maintenance.update": "Arıza kaydı güncellendi",
};

/** Hesap hareketi kaynağı (Kasa & Banka listesi) */
export const TX_SOURCE = {
    opening: "Açılış bakiyesi",
    payment: "Öğrenci tahsilatı",
    payment_cancel: "Tahsilat iptali",
    refund: "Avans iadesi",
    expense: "Gider",
    expense_cancel: "Gider iptali",
    transfer: "Transfer",
};

export const MAINT_AREA = { room: "Oda", kitchen: "Mutfak", bathroom: "Banyo", common: "Ortak alan", other: "Diğer" };

/** "TR880099…" → "TR88 0099 …" (4'lü gruplar) */
export const formatIban = (iban) => String(iban ?? "").replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
