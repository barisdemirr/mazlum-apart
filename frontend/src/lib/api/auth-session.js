import "server-only";
import { API_CONFIG } from "./config";
import { forwardingHeaders } from "./server";

/**
 * Giriş uçlarının ortak işi (yalnızca /api/admin/session ve /api/student/session rotalarından çağrılır).
 * Başarılıysa { token, refreshToken, maxAge, user }, değilse { error: "credentials" | "rate" | "invalid" | "unavailable" }.
 * Token ve yenileme anahtarı yalnızca httpOnly çereze yazılır, tarayıcıya hiç dönmez.
 * maxAge: çerez ömrü (sn). Backend "kalıcı değil" derse 0 (oturum çerezi).
 */
export async function loginRequest(path, payload) {
    let response;
    try {
        response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...(await forwardingHeaders()) },
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(API_CONFIG.timeout),
        });
    } catch {
        return { error: "unavailable" };
    }

    if (response.status === 429) return { error: "rate" };
    if (response.status === 401) return { error: "credentials" };
    if (response.status === 400) return { error: "invalid" };
    if (!response.ok) return { error: "unavailable" };

    const data = await response.json().catch(() => null);
    if (!data?.accessToken) return { error: "unavailable" };

    return { ...toSession(data), user: data.user ?? null };
}

/** Backend yanıtı -> çerezlere yazılacak oturum. Çerez ömrü yenileme anahtarının ömrüdür. */
function toSession(data) {
    const seconds = Math.max(60, Math.floor((new Date(data.refreshExpiresAt).getTime() - Date.now()) / 1000));
    return { token: data.accessToken, refreshToken: data.refreshToken, maxAge: data.persistent ? seconds : 0 };
}

/**
 * Yenileme anahtarını yeni bir token çiftiyle değiştirir (anahtar döndürülür; eskisi geçersiz olur).
 * Başarılıysa { token, refreshToken, maxAge }; geçersiz/iptal ise { error: "invalid" }; sunucuya ulaşılamazsa { error: "unavailable" }.
 */
export async function refreshRequest(refreshToken) {
    if (!refreshToken) return { error: "invalid" };
    let response;
    try {
        response = await fetch(`${API_CONFIG.baseUrl}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...(await forwardingHeaders()) },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
            signal: AbortSignal.timeout(API_CONFIG.timeout),
        });
    } catch {
        return { error: "unavailable" };
    }
    if (response.status === 401 || response.status === 400) return { error: "invalid" };
    if (!response.ok) return { error: "unavailable" };
    const data = await response.json().catch(() => null);
    if (!data?.accessToken || !data?.refreshToken) return { error: "unavailable" };
    return toSession(data);
}

/** Çıkış: anahtarın ailesi backend'de iptal edilir (en iyi çaba; çerezler her durumda silinir) */
export async function revokeRequest(refreshToken) {
    if (!refreshToken) return;
    await fetch(`${API_CONFIG.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await forwardingHeaders()) },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
    }).catch(() => null);
}

export const loginStatus = { credentials: 401, rate: 429, invalid: 400, unavailable: 503 };
