import { NextResponse } from "next/server";
import { STUDENT_COOKIE, normalizePhoneInput, validateLogin } from "@/lib/student/auth";
import { cookieOptions } from "@/lib/student/session";
import { authenticateStudent } from "@/services/studentAuth";

const noStore = { "Cache-Control": "no-store" };

/** Giriş: telefon + şifre doğrulanır, token httpOnly çerezde saklanır (tarayıcı JS'i göremez) */
export async function POST(request) {
    const body = await request.json().catch(() => null);
    const phone = normalizePhoneInput(body?.phone);
    const password = typeof body?.password === "string" ? body.password : "";

    if (Object.keys(validateLogin({ phone, password })).length) {
        return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
    }

    const result = await authenticateStudent({ phone, password, remember: Boolean(body?.remember) });
    if (!result) {
        return NextResponse.json({ error: "credentials" }, { status: 401, headers: noStore });
    }

    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(STUDENT_COOKIE, result.token, cookieOptions(result.maxAge));
    return response;
}

/** Çıkış: çerez silinir */
export async function DELETE() {
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
}
