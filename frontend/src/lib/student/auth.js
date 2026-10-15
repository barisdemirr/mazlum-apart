import { isValidPhone, onlyDigits } from "@/lib/application";

/** Öğrenci oturum çerezi: backend gelince içinde gerçek JWT durur (httpOnly) */
export const STUDENT_COOKIE = "ma_student";

/** Beni hatırla kapalıysa token 12 saat, açıksa 30 gün geçerlidir */
export const SESSION_HOURS = 12;
export const REMEMBER_DAYS = 30;

/**
 * Telefon alanına yapıştırılan her biçimi 10 haneye indirir:
 * "+90 555 123 45 67", "0555 123 45 67", "5551234567" -> "5551234567"
 */
export function normalizePhoneInput(value) {
    let digits = onlyDigits(value, 14);
    if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    return digits.slice(0, 10);
}

/** Giriş formu doğrulaması: { alan: "hataKodu" } döner (metinler dictionaries.portal.login.errors altında) */
export function validateLogin({ phone, password }) {
    const errors = {};
    if (!phone) errors.phone = "phoneRequired";
    else if (!isValidPhone(phone)) errors.phone = "phoneInvalid";
    if (!password) errors.password = "passwordRequired";
    return errors;
}

/** JWT payload'ını doğrulamadan okur (imza kontrolü backend'de). Süresi dolmuşsa null. */
export function readStudentToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(decodeURIComponent(escape(json)));
        if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

/** Girişten sonra yalnızca portal içine dönülür (açık yönlendirme engeli) */
export function safeReturnPath(from) {
    if (typeof from !== "string") return "/ogrenci";
    if (!/^\/ogrenci(\/[\w-]*)*$/.test(from) || from.startsWith("//")) return "/ogrenci";
    return from === "/ogrenci/giris" ? "/ogrenci" : from;
}
