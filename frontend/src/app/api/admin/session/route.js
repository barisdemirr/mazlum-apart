import { NextResponse } from "next/server";
import { ADMIN_COOKIE, validateAdminLogin } from "@/lib/admin/auth";
import { cookieOptions } from "@/lib/admin/session";
import { authenticateAdmin } from "@/services/adminAuth";

const noStore = { "Cache-Control": "no-store" };

/* Kaba kuvvet denemesine karşı: aynı adresten dakikada 5 hatalı giriş.
 * Tek sunucu belleğinde tutulur (yeterli bir ilk savunma); backend gelince orada da sınır olacak. */
const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_FAILS = 5;

function failsOf(ip) {
    const now = Date.now();
    const list = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    attempts.set(ip, list);
    return list;
}

/** Giriş: e-posta + şifre doğrulanır, token httpOnly çerezde saklanır (tarayıcı JS'i göremez) */
export async function POST(request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (failsOf(ip).length >= MAX_FAILS) {
        return NextResponse.json({ error: "rate" }, { status: 429, headers: noStore });
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (Object.keys(validateAdminLogin({ email, password })).length) {
        return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
    }

    const result = await authenticateAdmin({ email, password });
    if (!result) {
        failsOf(ip).push(Date.now());
        return NextResponse.json({ error: "credentials" }, { status: 401, headers: noStore });
    }

    attempts.delete(ip);
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(ADMIN_COOKIE, result.token, cookieOptions(result.maxAge));
    return response;
}

/** Çıkış: çerez silinir */
export async function DELETE() {
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
}
