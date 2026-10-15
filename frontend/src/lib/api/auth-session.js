import "server-only";
import { API_CONFIG } from "./config";
import { forwardingHeaders } from "./server";

/**
 * Giriş uçlarının ortak işi (yalnızca /api/admin/session ve /api/student/session rotalarından çağrılır).
 * Başarılıysa { token, maxAge }, değilse { error: "credentials" | "rate" | "invalid" | "unavailable" }.
 * Token yalnızca httpOnly çereze yazılır, tarayıcıya hiç dönmez.
 */
export async function loginRequest(path, payload, { persistent }) {
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

    const seconds = Math.max(60, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
    return { token: data.accessToken, maxAge: persistent ? seconds : 0, user: data.user ?? null };
}

export const loginStatus = { credentials: 401, rate: 429, invalid: 400, unavailable: 503 };
