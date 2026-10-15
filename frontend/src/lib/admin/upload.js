"use client";

import { admin } from "@/lib/admin/api";
import { API_CONFIG } from "@/lib/api/config";
import { ApiError, parseApiResponse } from "@/lib/api/error";

/**
 * Medya yükleme. Vercel istek gövdesini 4,5 MB ile sınırlar; video (en çok 60 MB) ve büyük görseller bu yüzden vekilden geçemez.
 * Panel önce vekil üzerinden kısa ömürlü (10 dk) bir YÜKLEME BİLETİ ister, sonra dosyayı doğrudan backend'e gönderir.
 * Bilet yalnızca yükleme uçlarında geçerlidir; oturum token'ı (httpOnly çerez) tarayıcıya hiç verilmez.
 */
let cached = null; // { token, expiresAt }

async function ticket() {
    if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
    const out = await admin.post("/media/upload-ticket");
    cached = { token: out.token, expiresAt: new Date(out.expiresAt).getTime() };
    return cached.token;
}

function send(url, token, form, { onProgress, signal } = {}) {
    // fetch yükleme ilerlemesi vermez; XHR ile yüzde bildirilir
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.timeout = 10 * 60_000;
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
        xhr.onerror = () => reject(new ApiError({ status: 0, title: "Bağlantı hatası", detail: "Dosya yüklenemedi. İnternet bağlantınızı kontrol edin." }));
        xhr.ontimeout = () => reject(new ApiError({ status: 0, title: "Zaman aşımı", detail: "Yükleme çok uzun sürdü." }));
        xhr.onabort = () => reject(new ApiError({ status: 0, title: "İptal edildi", detail: "Yükleme iptal edildi." }));
        xhr.onload = () => {
            const response = new Response(xhr.responseText || null, { status: xhr.status, headers: { "Content-Type": xhr.getResponseHeader("Content-Type") || "application/json" } });
            parseApiResponse(response).then(resolve, reject);
        };
        signal?.addEventListener("abort", () => xhr.abort());
        xhr.send(form);
    });
}

async function post(path, form, options) {
    const url = `${API_CONFIG.baseUrl.replace(/\/$/, "")}/api/admin/media${path}`;
    try {
        return await send(url, await ticket(), form, options);
    } catch (error) {
        // Bilet bu arada geçersiz olduysa (401) bir kez yenile
        if (error instanceof ApiError && error.status === 401) {
            cached = null;
            return send(url, await ticket(), form, options);
        }
        throw error;
    }
}

/** Görsel: backend WebP'ye çevirip 3 boyutta saklar. alt: { tr, en } (isteğe bağlı) */
export function uploadImage(file, { alt, ...options } = {}) {
    const form = new FormData();
    form.append("file", file);
    if (alt?.tr) form.append("altTr", alt.tr);
    if (alt?.en) form.append("altEn", alt.en);
    return post("", form, options);
}

/** Video: tarayıcıda küçültülmüş dosya + kapak karesi (Blob) + süre/boyut bilgisi */
export function uploadVideo({ file, poster, duration, width, height, alt }, options) {
    const form = new FormData();
    form.append("file", file);
    if (poster) form.append("poster", poster, "poster.jpg");
    form.append("durationSeconds", String(duration));
    form.append("width", String(width));
    form.append("height", String(height));
    if (alt?.tr) form.append("altTr", alt.tr);
    if (alt?.en) form.append("altEn", alt.en);
    return post("/videos", form, options);
}
