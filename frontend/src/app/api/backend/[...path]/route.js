import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { API_CONFIG } from "@/lib/api/config";
import { PUBLIC_TAGS } from "@/lib/api/cache";
import { readStudentToken } from "@/lib/student/auth";
import { readAdminToken } from "@/lib/admin/auth";
import { refreshRequest } from "@/lib/api/auth-session";
import { SESSION_COOKIES, clearSession, setSession } from "@/lib/api/session-cookies";

/**
 * BFF vekili: tarayıcı -> /api/backend/<yol> -> backend /api/<yol>
 *
 * Güvenlik:
 *  - YALNIZCA tanımlı yollar geçer (allow-list); rol çerezi yola göre seçilir: student/* -> ma_student, admin/* -> ma_admin.
 *    Bir rolün çerezi diğer rolün yoluna ASLA eklenmez (backend ayrıca typ claim'ini de denetler).
 *  - Giriş uçları (…/auth/login) vekilden geçmez: token tarayıcıya hiç dönmez, yalnızca oturum rotaları (/api/admin/session, /api/student/session) çerez yazar.
 *  - Veri değiştiren isteklerde Origin aynı site değilse reddedilir (CSRF'e ek savunma; çerez zaten SameSite=Lax).
 *  - Gerçek istemci IP'si X-Client-Ip ile (ortak gizli anahtarla) iletilir: hız sınırı Vercel IP'sine değil kullanıcıya uygulanır.
 *  - Access token kısa ömürlüdür: süresi dolmuş/dolmak üzereyse ya da backend 401 verirse, yenileme anahtarıyla oturum
 *    sessizce yenilenir (çerezler bu yanıtta güncellenir) ve istek bir kez tekrarlanır. Yenilenemezse rol çerezleri silinir.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_GET = /^(room-types(\/[\w-]+(\/(availability|rooms|apartments(\/[\w-]+)?))?)?|site-settings|applications\/config|locations|pages\/[\w-]+|slides|push\/config)$/;
const PUBLIC_POST = /^(applications|pre-registrations|discount-codes\/check)$/;
const STUDENT = /^student\/(me|me\/password|payments|renewal(\/preview)?|maintenance-requests(\/[\w-]+(\/photos(\/[\w-]+)?)?)?|departures(\/exit|\/leaves(\/[\w-]+(\/return)?)?)?|push\/subscriptions)$/;
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

    const names = route.role ? SESSION_COOKIES[route.role] : null;
    const readToken = route.role === "admin" ? readAdminToken : readStudentToken;
    let token = names ? request.cookies.get(names.access)?.value : null;
    const refreshToken = names ? request.cookies.get(names.refresh)?.value : null;

    // Yenilenmiş oturum (varsa yanıtta çerezlere yazılır). Aynı istekte en fazla bir kez yenilenir.
    let renewed = null;
    const renew = async () => {
        if (!refreshToken || renewed) return false;
        const result = await refreshRequest(refreshToken);
        if (result.error) return false;
        renewed = result;
        token = result.token;
        return true;
    };

    if (names) {
        const payload = readToken(token);
        const expiringSoon = payload && payload.exp * 1000 - Date.now() < 30_000;
        if (!payload || expiringSoon) await renew();
        if (!readToken(token)) return clearSession(problem(401, "Oturum gerekli", "Lütfen giriş yapın."), route.role);
    }

    const headers = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
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

    const send = () => {
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(`${API_CONFIG.baseUrl}/api/${target}${request.nextUrl.search}`, {
            method,
            headers,
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(route.role === "admin" ? 120_000 : 30_000),
        });
    };

    let upstream;
    try {
        upstream = await send();
        // Token geçerli görünse de backend reddedebilir (ör. saat farkı): bir kez yenileyip tekrar dene
        if (upstream.status === 401 && names && !renewed && (await renew())) upstream = await send();
    } catch {
        return problem(502, "Bağlantı hatası", "Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.");
    }

    // Veri değiştiren başarılı istek (panel işlemi ya da yeni başvuru): herkese açık sayfaların önbelleği süre dolmasını
    // beklemeden tazelenir. Böylece önbellek süreleri uzun tutulabilir (sayfalar sürekli yeniden üretilmez, CPU harcanmaz)
    // ama panelden yapılan değişiklik sitede hemen görünür.
    if (method !== "GET" && upstream.ok && (route.role === "admin" || target === "applications")) {
        for (const tag of PUBLIC_TAGS) revalidateTag(tag);
    }

    const out = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of FORWARD_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) out.set(name, value);
    }

    const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: out });
    if (upstream.status === 401 && names) return clearSession(response, route.role);
    if (renewed) setSession(response, route.role, renewed);
    return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
