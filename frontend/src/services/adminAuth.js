import "server-only";
import { loginRequest } from "@/lib/api/auth-session";

/** Yönetici girişi: backend POST /api/admin/auth/login. Başarılıysa { token, maxAge }, değilse { error } */
export function authenticateAdmin({ email, password }) {
    // Yönetici oturumu her zaman kalıcı çerezdir; ömrünü token'ın süresi belirler (backend: Jwt ayarları)
    return loginRequest("/api/admin/auth/login", { email, password }, { persistent: true });
}
