import { ROLES, readRoleToken } from "@/lib/auth/token";

/** Yönetici oturum çerezi (httpOnly). Öğrenci çerezi ma_student'tan tamamen ayrıdır. */
export const ADMIN_COOKIE = "ma_admin";
/** Seçili dönem. Oturum bilgisi değildir; yalnızca panelin hangi dönemi gösterdiğini tutar. */
export const PERIOD_COOKIE = "ma_period";

export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";
/** Oturum yenileme anahtarı çerezi (httpOnly). Erişim token'ını sessizce yeniler (backend: Jwt:AdminRefreshDays). */
export const ADMIN_REFRESH_COOKIE = "ma_admin_rt";

/** Yönetici token yükü ({ sub, typ: "admin", name, email, exp }) ya da null */
export const readAdminToken = (token) => readRoleToken(token, ROLES.ADMIN);

/** Girişten sonra yalnızca panel içine dönülür (açık yönlendirme engeli) */
export function safeAdminReturn(from) {
    if (typeof from !== "string") return ADMIN_HOME;
    if (!/^\/admin(\/[\w-]*)*$/.test(from) || from.startsWith("//")) return ADMIN_HOME;
    return from === ADMIN_LOGIN ? ADMIN_HOME : from;
}

/** Giriş formu doğrulaması: { alan: "mesaj" } */
export function validateAdminLogin({ email, password }) {
    const errors = {};
    if (!email) errors.email = "E-posta adresini yazın.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Geçerli bir e-posta adresi yazın.";
    if (!password) errors.password = "Şifreyi yazın.";
    return errors;
}
