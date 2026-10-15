import "server-only";
import { REMEMBER_DAYS, SESSION_HOURS } from "@/lib/student/auth";

/**
 * Öğrenci kimlik doğrulama. Şimdilik MOCK: backend hazır olunca yalnızca bu dosya değişir.
 *
 * Gerçek istek:
 *   const res = await apiPost("/student/auth/login", { phone, password });  // -> { token }
 *
 * Geliştirme hesabı (arayüzde GÖSTERİLMEZ):
 *   telefon 500 000 00 00 · şifre mazlum123
 */
const DEV_PHONE = "5000000000";
const DEV_PASSWORD = "mazlum123";

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Biçimi gerçek JWT ile aynı olan sahte token (imzasız) */
function createMockToken(sub, ttlSeconds) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub, exp })}.mock`;
}

/** Başarılıysa { token, maxAge } (maxAge: çerez ömrü; boşsa oturum çerezi), değilse null */
export async function authenticateStudent({ phone, password, remember }) {
    await new Promise((resolve) => setTimeout(resolve, 700)); // ağ gecikmesi simülasyonu

    if (phone !== DEV_PHONE || password !== DEV_PASSWORD) return null;

    const ttl = remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600;
    return { token: createMockToken("student-1", ttl), maxAge: remember ? ttl : 0 };
}
