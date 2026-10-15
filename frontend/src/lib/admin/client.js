"use client";

import { ADMIN_LOGIN, PERIOD_COOKIE } from "./auth";

/** Çıkış: çerez sunucuda silinir, giriş sayfasına gidilir */
export async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
    window.location.href = ADMIN_LOGIN;
}

/** Seçili dönemi çereze yazar (1 yıl). Sunucu bileşenleri sonraki istekte bunu okur. */
export function writePeriodCookie(periodId) {
    document.cookie = `${PERIOD_COOKIE}=${encodeURIComponent(periodId)}; path=/; max-age=31536000; samesite=lax`;
}
