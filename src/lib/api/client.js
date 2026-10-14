import { buildApiUrl, API_CONFIG } from "./config";
import { parseApiResponse, ApiError } from "./error";

/**
 * Native fetch sarmalayıcı.
 * Sunucu bileşenlerinde Next önbelleği (revalidate + tags) ile çalışır.
 * revalidate: 0 -> önbelleğe alma (yazma işlemleri, fiyat sorguları)
 */
export async function apiFetch(path, options = {}) {
    const { fetchOptions = {}, revalidate, tags } = options;

    const url = buildApiUrl(path);
    const isBrowser = typeof window !== "undefined";
    const noStore = revalidate === 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers: {
                ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
                Accept: "application/json",
                ...fetchOptions.headers,
            },
            signal: controller.signal,
            ...(noStore ? { cache: "no-store" } : {}),
            ...(!isBrowser && !noStore
                ? {
                      next: {
                          revalidate: revalidate !== undefined ? revalidate : API_CONFIG.defaultRevalidate,
                          tags: tags || undefined,
                      },
                  }
                : {}),
        });

        return await parseApiResponse(response);
    } catch (err) {
        if (err instanceof ApiError) throw err;

        if (err.name === "AbortError") {
            throw new ApiError({ status: 0, title: "Zaman aşımı", detail: "Sunucu belirtilen sürede yanıt vermedi." });
        }

        throw new ApiError({
            status: 0,
            title: "Bağlantı hatası",
            detail: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.",
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

export function apiGet(path, options = {}) {
    return apiFetch(path, { ...options, fetchOptions: { method: "GET", ...options.fetchOptions } });
}

export function apiPost(path, body, options = {}) {
    return apiFetch(path, {
        revalidate: 0,
        ...options,
        fetchOptions: { method: "POST", body: JSON.stringify(body), ...options.fetchOptions },
    });
}

export function apiPut(path, body, options = {}) {
    return apiFetch(path, {
        revalidate: 0,
        ...options,
        fetchOptions: { method: "PUT", body: JSON.stringify(body), ...options.fetchOptions },
    });
}

export function apiDelete(path, options = {}) {
    return apiFetch(path, { revalidate: 0, ...options, fetchOptions: { method: "DELETE", ...options.fetchOptions } });
}
