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

export const BILL_KIND = { electricity: "Elektrik", water: "Su", gas: "Doğalgaz", internet: "İnternet", other: "Diğer" };
export const BILL_STATE = {
    paid: { label: "Ödendi", tone: "ok" },
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
    other: "Diğer",
};

export const AUDIT_ACTION = {
    "payment.create": "Tahsilat girildi",
    "payment.cancel": "Tahsilat iptal edildi",
    "payment.refund": "Avans iadesi",
    "charge.create": "Borç kalemi eklendi",
    "charge.discount": "İndirim uygulandı",
    "charge.reverse": "Borç kalemi iptal edildi",
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
