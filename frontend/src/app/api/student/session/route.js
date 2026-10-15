import { NextResponse } from "next/server";
import { STUDENT_COOKIE, normalizePhoneInput, validateLogin } from "@/lib/student/auth";
import { ADMIN_COOKIE } from "@/lib/admin/auth";
import { cookieOptions } from "@/lib/student/session";
import { loginStatus } from "@/lib/api/auth-session";
import { authenticateStudent } from "@/services/studentAuth";

const noStore = { "Cache-Control": "no-store" };

/** Giriş: telefon + şifre backend'de doğrulanır, token httpOnly çerezde saklanır (tarayıcı JS'i göremez). Hız sınırı backend'dedir. */
export async function POST(request) {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneInput(body?.phone);
    const password = typeof body?.password === "string" ? body.password : "";

    if (Object.keys(validateLogin({ phone, password })).length) {
        return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
    }

    const result = await authenticateStudent({ phone, password, remember: Boolean(body?.remember) });
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: loginStatus[result.error], headers: noStore });
    }

    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(STUDENT_COOKIE, result.token, cookieOptions(result.maxAge));
    response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 }); // öğrenci girişi yönetici oturumunu sonlandırır
    return response;
}

/** Çıkış: çerez silinir */
export async function DELETE() {
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
}

/** Süresi dolmuş/geçersiz oturum: çerez silinir, giriş sayfasına yönlendirilir (sunucu bileşenleri ve vekil buraya yollar) */
export async function GET(request) {
    const response = NextResponse.redirect(new URL("/ogrenci/giris?expired=1", request.url));
    response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
}
