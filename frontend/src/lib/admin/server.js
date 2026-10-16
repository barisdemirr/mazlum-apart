import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_LOGIN, ADMIN_REFRESH_COOKIE, PERIOD_COOKIE, readAdminToken } from "./auth";
import { refreshRequest } from "@/lib/api/auth-session";
import { writeSession } from "@/lib/api/session-cookies";

/**
 * Oturumu doğrular, yoksa girişe atar. Sunucu bileşenlerinde kullanılır.
 * Middleware zaten korur; bu, ikinci güvenlik katmanıdır (middleware atlansa bile veri açılmaz).
 */
export async function requireSession() {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    const payload = readAdminToken(token);
    if (!payload) redirect(`${ADMIN_LOGIN}?expired=1`);
    return { token, payload };
}

/**
 * API route'ları için (middleware dışındadırlar): yönetici değilse null döner (route 401 verir).
 * Access token'ın süresi dolmuşsa yenileme anahtarıyla oturum sessizce yenilenir ve çerezler bu yanıtta güncellenir.
 */
export async function adminFromRequest(request) {
    const payload = readAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (payload) return payload;

    const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;
    if (!refreshToken) return null;
    const renewed = await refreshRequest(refreshToken);
    if (renewed.error) return null;
    writeSession(await cookies(), "admin", renewed);
    return readAdminToken(renewed.token);
}

/** Seçili dönemin kimliği (çerezden). Geçerli değilse null; çağıran aktif dönemi kullanır. */
export async function readSelectedPeriodId() {
    return (await cookies()).get(PERIOD_COOKIE)?.value ?? null;
}
