import "server-only";
import { loginRequest } from "@/lib/api/auth-session";

/**
 * Öğrenci girişi: backend POST /api/student/auth/login.
 * "Beni hatırla" kapalıysa çerez oturum çerezidir (tarayıcı kapanınca biter); açıksa token süresi kadar kalır.
 */
export function authenticateStudent({ phone, password, remember }) {
    return loginRequest("/api/student/auth/login", { phone, password, remember }, { persistent: remember });
}
