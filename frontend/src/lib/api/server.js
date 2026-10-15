import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_CONFIG, buildApiUrl } from "./config";
import { ApiError, parseApiResponse } from "./error";
import { STUDENT_COOKIE } from "@/lib/student/auth";
import { ADMIN_COOKIE } from "@/lib/admin/auth";

/**
 * Sunucu tarafı (server component / route handler) backend istemcisi.
 *
 * role: "student" | "admin" -> o rolün httpOnly çerezindeki token Authorization olarak eklenir; yanıt asla önbelleğe alınmaz.
 *       verilmezse herkese açık istek (Next önbelleği: revalidate sn).
 * Token geçersiz/süresi dolmuşsa (401) kullanıcı çerezi temizleyen oturum rotası üzerinden girişe gönderilir.
 */
const ROLES = {
    student: { cookie: STUDENT_COOKIE, expire: "/api/student/session" },
    admin: { cookie: ADMIN_COOKIE, expire: "/api/admin/session" },
};

/** Backend'in gerçek istemci IP'sini görmesi için (hız sınırı); yalnızca ortak gizli anahtarla güvenilir */
export async function forwardingHeaders() {
    const out = {};
    const secret = process.env.PROXY_SECRET;
    if (!secret) return out;
    out["X-Proxy-Secret"] = secret;
    try {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip");
        if (ip) out["X-Client-Ip"] = ip;
    } catch {}
    return out;
}

export async function serverFetch(path, { role, method = "GET", body, revalidate = 60, tags, headers: extra = {} } = {}) {
    const session = role ? ROLES[role] : null;
    const token = session ? (await cookies()).get(session.cookie)?.value : null;
    if (session && !token) redirect(session.expire);

    const response = await fetch(buildApiUrl(`/api${path.startsWith("/") ? path : `/${path}`}`), {
        method,
        headers: {
            Accept: "application/json",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(await forwardingHeaders()),
            ...extra,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(API_CONFIG.timeout),
        ...(session || method !== "GET" ? { cache: "no-store" } : { next: { revalidate, tags } }),
    }).catch(() => {
        throw new ApiError({ status: 0, title: "Bağlantı hatası", detail: "Sunucuya ulaşılamadı." });
    });

    if (response.status === 401 && session) redirect(session.expire);
    return parseApiResponse(response);
}

/** Yanıt 404 ise null döner (sayfa notFound() yapabilsin), diğer hatalar fırlar */
export async function serverFetchOrNull(path, options) {
    try {
        return await serverFetch(path, options);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}
