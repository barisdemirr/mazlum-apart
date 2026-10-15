import { NextResponse } from "next/server";
import { API_CONFIG } from "@/lib/api/config";
import { STUDENT_COOKIE } from "@/lib/student/auth";
import { ADMIN_COOKIE } from "@/lib/admin/auth";

/**
 * BFF vekili: tarayıcı -> /api/backend/<yol> -> backend /api/<yol>
 *
 * Güvenlik:
 *  - YALNIZCA tanımlı yollar geçer (allow-list); rol çerezi yola göre seçilir: student/* -> ma_student, admin/* -> ma_admin.
 *    Bir rolün çerezi diğer rolün yoluna ASLA eklenmez (backend ayrıca typ claim'ini de denetler).
 *  - Giriş uçları (…/auth/login) vekilden geçmez: token tarayıcıya hiç dönmez, yalnızca oturum rotaları (/api/admin/session, /api/student/session) çerez yazar.
 *  - Veri değiştiren isteklerde Origin aynı site değilse reddedilir (CSRF'e ek savunma; çerez zaten SameSite=Lax).
 *  - Gerçek istemci IP'si X-Client-Ip ile (ortak gizli anahtarla) iletilir: hız sınırı Vercel IP'sine değil kullanıcıya uygulanır.
 *  - 401 gelirse ilgili rol çerezi silinir.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_GET = /^(room-types(\/[\w-]+(\/(availability|apartments(\/[\w-]+)?))?)?|site-settings|applications\/config|locations|pages\/[\w-]+|slides|push\/config)$/;
const PUBLIC_POST = /^applications$/;
const STUDENT = /^student\/(me|me\/password|payments|maintenance-requests(\/[\w-]+(\/photos(\/[\w-]+)?)?)?|push\/subscriptions)$/;
const ADMIN = /^admin\/(?!auth\/login$)[\w\-/]+$/;

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "accept-language", "idempotency-key"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "content-disposition", "retry-after", "content-length"];

function classify(method, target) {
    if (target.split("/").some((part) => part === "" || part === "." || part === "..")) return null;
    if (method === "GET" && PUBLIC_GET.test(target)) return { role: null };
    if (method === "POST" && PUBLIC_POST.test(target)) return { role: null };
    if (STUDENT.test(target)) return { role: "student" };
    if (ADMIN.test(target)) return { role: "admin" };
    return null;
}

function sameSite(request) {
    const origin = request.headers.get("origin");
    if (!origin) return true; // sunucudan sunucuya / aynı site gezinmesi
    try {
        return new URL(origin).host === request.headers.get("host");
    } catch {
        return false;
    }
}

const problem = (status, title, detail) =>
    NextResponse.json({ title, detail, status }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });

async function forward(request, { params }) {
    const { path = [] } = await params;
    const target = path.map(decodeURIComponent).join("/");
    const method = request.method;

    const route = classify(method, target);
    if (!route) return problem(404, "Bulunamadı", "Bu adres vekil üzerinden erişilebilir değil.");
    if (method !== "GET" && !sameSite(request)) return problem(403, "Yasak", "İstek kaynağı geçersiz.");

    const cookieName = route.role === "student" ? STUDENT_COOKIE : route.role === "admin" ? ADMIN_COOKIE : null;
    const token = cookieName ? request.cookies.get(cookieName)?.value : null;
    if (cookieName && !token) return problem(401, "Oturum gerekli", "Lütfen giriş yapın.");

    const headers = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (process.env.PROXY_SECRET) {
        headers.set("X-Proxy-Secret", process.env.PROXY_SECRET);
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip");
        if (ip) headers.set("X-Client-Ip", ip);
    }

    let body;
    if (METHODS_WITH_BODY.has(method)) {
        const buffer = await request.arrayBuffer();
        if (buffer.byteLength > 0) body = buffer;
    }

    let upstream;
    try {
        upstream = await fetch(`${API_CONFIG.baseUrl}/api/${target}${request.nextUrl.search}`, {
            method,
            headers,
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(route.role === "admin" ? 120_000 : 30_000),
        });
    } catch {
        return problem(502, "Bağlantı hatası", "Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.");
    }

    const out = new Headers({ "Cache-Control": "no-store" });
    for (const name of FORWARD_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) out.set(name, value);
    }

    const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: out });
    if (upstream.status === 401 && cookieName) response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
