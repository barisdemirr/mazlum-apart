import { NextResponse } from "next/server";
import { ADMIN_LOGIN } from "@/lib/admin/auth";
import { refreshRequest } from "@/lib/api/auth-session";
import { SESSION_COOKIES, clearSession, safeRefreshTarget, setSession } from "@/lib/api/session-cookies";

export const dynamic = "force-dynamic";

/**
 * Sessiz oturum yenileme (middleware buraya yönlendirir): access token'ın süresi dolmuş ya da dolmak üzereyken
 * yenileme anahtarıyla yeni çift alınır, çerezler yazılır ve kullanıcı gitmek istediği sayfaya (?to=) döner.
 * Yenilenemezse (anahtar iptal/süresi dolmuş) çerezler silinir ve giriş sayfasına gidilir; sunucuya ulaşılamazsa
 * çerezlere dokunulmadan girişe gidilir (kullanıcı oturumu bu yüzden kaybetmez).
 */
export async function GET(request) {
    const to = safeRefreshTarget(request.nextUrl.searchParams.get("to"), "admin");
    const result = await refreshRequest(request.cookies.get(SESSION_COOKIES.admin.refresh)?.value);

    if (result.error === "unavailable") {
        const response = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
        response.headers.set("Cache-Control", "no-store");
        return response;
    }
    if (result.error) {
        const response = NextResponse.redirect(new URL(`${ADMIN_LOGIN}?expired=1`, request.url));
        response.headers.set("Cache-Control", "no-store");
        return clearSession(response, "admin");
    }

    const response = NextResponse.redirect(new URL(to, request.url));
    response.headers.set("Cache-Control", "no-store");
    return setSession(response, "admin", result);
}
