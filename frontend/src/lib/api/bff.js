import { parseApiResponse, ApiError } from "./error";

/**
 * Tarayıcıdan backend'e giden TEK yol: kendi sitemizdeki /api/backend/* vekili (BFF).
 * Token httpOnly çerezdedir; vekil onu sunucuda Authorization başlığına koyar. Tarayıcı JS'i token'ı görmez,
 * CORS gerekmez, gerçek istemci IP'si hız sınırı için backend'e iletilir.
 *
 * `path` /api'siz yazılır: bffGet("/student/payments"), bffPost("/applications", body).
 */
const BASE = "/api/backend";
const TIMEOUT_MS = 30_000;

/** Para hareketi gibi tekrarı zararlı komutlar için: aynı kutu iki kez gönderilse bile bir kez işlenir */
export const newIdempotencyKey = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });

export async function bffRequest(path, { method = "GET", body, form, headers = {}, idempotent = false, signal, timeout = TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    signal?.addEventListener("abort", () => controller.abort());

    try {
        const response = await fetch(`${BASE}${path.startsWith("/") ? path : `/${path}`}`, {
            method,
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...(idempotent ? { "Idempotency-Key": idempotent === true ? newIdempotencyKey() : idempotent } : {}),
                ...headers,
            },
            body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
            signal: controller.signal,
        });

        // Oturum bitmiş: ilgili alanın giriş sayfasına (çerezi temizleyerek) gönder
        if (response.status === 401 && typeof window !== "undefined") {
            const area = path.startsWith("/admin") ? "/api/admin/session" : path.startsWith("/student") ? "/api/student/session" : null;
            if (area) window.location.assign(area);
        }
        return await parseApiResponse(response);
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error?.name === "AbortError") {
            throw new ApiError({ status: 0, title: "Zaman aşımı", detail: "Sunucu belirtilen sürede yanıt vermedi." });
        }
        throw new ApiError({ status: 0, title: "Bağlantı hatası", detail: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin." });
    } finally {
        clearTimeout(timer);
    }
}

export const bffGet = (path, options) => bffRequest(path, { ...options, method: "GET" });
export const bffPost = (path, body, options) => bffRequest(path, { ...options, method: "POST", body });
export const bffPut = (path, body, options) => bffRequest(path, { ...options, method: "PUT", body });
export const bffDelete = (path, body, options) => bffRequest(path, { ...options, method: "DELETE", body });
/** Dosya yükleme: FormData gönderilir (Content-Type'ı tarayıcı sınır değeriyle birlikte kendisi koyar) */
export const bffUpload = (path, form, options) => bffRequest(path, { ...options, method: "POST", form, timeout: options?.timeout ?? 120_000 });
