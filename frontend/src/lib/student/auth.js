import { isValidPhone, onlyDigits } from "@/lib/application";
import { ROLES, readRoleToken } from "@/lib/auth/token";

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

/** Öğrenci token yükü ({ sub, typ: "student", exp }). Süresi dolmuş ya da rolü farklıysa null. */
export function readStudentToken(token) {
    return readRoleToken(token, ROLES.STUDENT);
}

/** Girişten sonra yalnızca portal içine dönülür (açık yönlendirme engeli) */
export function safeReturnPath(from) {
    if (typeof from !== "string") return "/ogrenci";
    if (!/^\/ogrenci(\/[\w-]*)*$/.test(from) || from.startsWith("//")) return "/ogrenci";
    return from === "/ogrenci/giris" ? "/ogrenci" : from;
}
