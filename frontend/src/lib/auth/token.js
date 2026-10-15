/**
 * Rol ayrımının temeli: iki oturum türü vardır ve token'daki `typ` alanı bunları ayırır.
 *   "admin"   -> yönetici (çerez: ma_admin)   -> yalnızca /admin
 *   "student" -> öğrenci  (çerez: ma_student) -> yalnızca /ogrenci
 *
 * Bu dosya Edge (middleware) ile uyumludur: Node'a özgü bir şey kullanmaz.
 * Token'ın imzası burada doğrulanamaz (anahtar backend'dedir); süre ve rol bakılır.
 * İmzası sahte bir token backend'den 401 alır ve girişe döner.
 */
export const ROLES = Object.freeze({ ADMIN: "admin", STUDENT: "student" });

/**
 * JWT yükünü okur. Biçim bozuksa, süresi dolmuşsa ya da `typ` beklenen rol değilse null döner.
 * Böylece öğrenci token'ı yönetici çerezine konsa bile yönetici sayılmaz (ve tersi).
 */
export function readRoleToken(token, role) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    try {
        const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(decodeURIComponent(escape(json)));
        if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
        if (payload.typ !== role) return null;
        return payload;
    } catch {
        return null;
    }
}
