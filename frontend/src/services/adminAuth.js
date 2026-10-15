import "server-only";
import { ADMIN_SESSION_HOURS } from "@/lib/admin/auth";

/**
 * Yönetici kimlik doğrulama. Şimdilik MOCK: backend hazır olunca yalnızca bu dosya değişir.
 *
 * Gerçek istek:
 *   const res = await apiPost("/admin/auth/login", { email, password });  // -> { accessToken }
 *
 * Geliştirme hesabı (arayüzde GÖSTERİLMEZ):
 *   e-posta yonetici@mazlumapart.local · şifre mazlum-admin
 */
const DEV_EMAIL = "yonetici@mazlumapart.local";
const DEV_PASSWORD = "mazlum-admin";

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Biçimi gerçek JWT ile aynı olan sahte token (imzasız). typ: "admin" rol ayrımını sağlar. */
function createMockToken(claims, ttlSeconds) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ ...claims, typ: "admin", exp })}.mock`;
}

/** Başarılıysa { token, maxAge }, değilse null */
export async function authenticateAdmin({ email, password }) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // ağ gecikmesi simülasyonu

    if (email.toLowerCase() !== DEV_EMAIL || password !== DEV_PASSWORD) return null;

    const ttl = ADMIN_SESSION_HOURS * 3600;
    const token = createMockToken({ sub: "admin-1", name: "Yönetici", email: DEV_EMAIL }, ttl);
    return { token, maxAge: ttl };
}
