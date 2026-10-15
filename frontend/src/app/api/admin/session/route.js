import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_LOGIN, validateAdminLogin } from "@/lib/admin/auth";
import { STUDENT_COOKIE } from "@/lib/student/auth";
import { cookieOptions } from "@/lib/admin/session";
import { loginStatus } from "@/lib/api/auth-session";
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
    response.cookies.set(ADMIN_COOKIE, result.token, cookieOptions(result.maxAge));
    response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 }); // yönetici girişi öğrenci oturumunu sonlandırır
    return response;
}

/** Çıkış: çerez silinir */
export async function DELETE() {
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
}

/** Süresi dolmuş/geçersiz oturum: çerez silinir, giriş sayfasına yönlendirilir (sunucu bileşenleri ve vekil buraya yollar) */
export async function GET(request) {
    const response = NextResponse.redirect(new URL(`${ADMIN_LOGIN}?expired=1`, request.url));
    response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
}
