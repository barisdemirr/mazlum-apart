import { admin } from "@/lib/admin/api";
import { newIdempotencyKey } from "@/lib/api/bff";

/** İletişim: mesaj şablonları, iletişim kaydı, SMS */

export const PURPOSES = ["payment_reminder", "payment_overdue", "application_received", "enrollment_approved", "maintenance_update", "announcement", "other"];
export const purposeOf = (key) => (PURPOSES.includes(key) ? key : "other");

export const listTemplates = () => admin.get("/message-templates");

/** WhatsApp bağlantısı açıldığında "son iletişim" kaydı */
export const logContact = ({ enrollmentId, purpose, note }) => admin.post("/contacts", { enrollmentId, purpose: purposeOf(purpose), note: note || null });

export const previewSms = ({ purpose, text, lang, recipients }) => admin.post("/sms/preview", { purpose: purposeOf(purpose), text, lang, recipients });

/** Çift tıklama iki SMS göndermesin diye her gönderim tek anahtar taşır (anahtar bileşen başına üretilir) */
export const sendSms = ({ purpose, text, lang, recipients, key }) =>
    admin.post("/sms/send", { purpose: purposeOf(purpose), text, lang, recipients }, { idempotent: key ?? newIdempotencyKey() });

/** Toplu bildirim (Web Push) */
export const previewPush = (i) => admin.post("/notifications/preview", pushBody(i));
export const sendPush = ({ key, ...i }) => admin.post("/notifications/send", pushBody(i), { idempotent: key ?? newIdempotencyKey() });
const pushBody = ({ purpose, url, title, body, recipients }) => ({ purpose: purposeOf(purpose), url: url || "/ogrenci", title, body, recipients });
