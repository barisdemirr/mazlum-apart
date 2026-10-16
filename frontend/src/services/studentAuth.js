import "server-only";
import { loginRequest } from "@/lib/api/auth-session";

/**
 * Öğrenci girişi: backend POST /api/student/auth/login.
 * "Beni hatırla" kapalıysa çerezler oturum çerezidir (tarayıcı kapanınca biter); açıksa yenileme anahtarı süresi kadar kalır (backend karar verir).
 */
export function authenticateStudent({ phone, password, remember }) {
    return loginRequest("/api/student/auth/login", { phone, password, remember });
}
