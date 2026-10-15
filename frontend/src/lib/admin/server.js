import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_LOGIN, PERIOD_COOKIE, readAdminToken } from "./auth";

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

/** API route'ları için: yönetici değilse null döner (route 401 verir) */
export async function adminFromRequest(request) {
    return readAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
}

/** Seçili dönemin kimliği (çerezden). Geçerli değilse null; çağıran aktif dönemi kullanır. */
export async function readSelectedPeriodId() {
    return (await cookies()).get(PERIOD_COOKIE)?.value ?? null;
}
