import { NextResponse } from "next/server";
import { ADMIN_LOGIN, validateAdminLogin } from "@/lib/admin/auth";
import { loginStatus, revokeRequest } from "@/lib/api/auth-session";
import { SESSION_COOKIES, clearSession, setSession } from "@/lib/api/session-cookies";
import { authenticateAdmin } from "@/services/adminAuth";

const noStore = { "Cache-Control": "no-store" };

/** Giriş: e-posta + şifre backend'de doğrulanır, token httpOnly çerezde saklanır (tarayıcı JS'i göremez). Hız sınırı backend'dedir. */
export async function POST(request) {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (Object.keys(validateAdminLogin({ email, password })).length) {
        return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
    }

    const result = await authenticateAdmin({ email, password });
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: loginStatus[result.error], headers: noStore });
    }

    const response = NextResponse.json({ ok: true }, { headers: noStore });
    setSession(response, "admin", result);
    clearSession(response, "student"); // bu rolün girişi diğer rolün oturumunu sonlandırır
    return response;
}

/** Çıkış: yenileme anahtarı backend'de iptal edilir, çerezler silinir */
export async function DELETE(request) {
    await revokeRequest(request.cookies.get(SESSION_COOKIES.admin.refresh)?.value);
    return clearSession(NextResponse.json({ ok: true }, { headers: noStore }), "admin");
}

/** Süresi dolmuş/geçersiz oturum: anahtar iptal edilir, çerezler silinir, giriş sayfasına yönlendirilir (sunucu bileşenleri ve vekil buraya yollar) */
export async function GET(request) {
    await revokeRequest(request.cookies.get(SESSION_COOKIES.admin.refresh)?.value);
    const response = NextResponse.redirect(new URL(`${ADMIN_LOGIN}?expired=1`, request.url));
    response.headers.set("Cache-Control", "no-store");
    return clearSession(response, "admin");
}
