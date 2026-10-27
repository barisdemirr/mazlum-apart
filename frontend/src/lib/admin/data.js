import "server-only";
import { cache } from "react";
import { serverFetch, serverFetchOrNull } from "@/lib/api/server";
import { buildQuery } from "@/lib/api/query";
import { turkeyDate } from "@/lib/format";
import { readSelectedPeriodId } from "@/lib/admin/server";

/**
 * Panelin sunucu tarafı veri katmanı: sayfalar (server component) veriyi buradan okur, görünümlere prop olarak verir.
 * Yönetici token'ı httpOnly çerezden alınır; 401'de oturum rotası çerezi silip girişe gönderir.
 */
export const adminGet = (path, query) => serverFetch(`/admin${path}${buildQuery(query)}`, { role: "admin" });

/** 404 ise null (sayfa notFound() yapabilsin) */
export const adminGetOrNull = (path, query) => serverFetchOrNull(`/admin${path}${buildQuery(query)}`, { role: "admin" });

/**
 * Çerezdeki dönem geçerliyse o, değilse bugünü kapsayan aktif dönem (yeni dönem açılıp eski dönem henüz kapatılmadıysa
 * birden çok aktif dönem olabilir), sonra herhangi bir aktif dönem, o da yoksa en yeni dönem
 */
export function pickPeriod(periods, selectedId) {
    const today = todayInTurkey();
    return (
        periods.find((p) => p.id === selectedId) ??
        periods.find((p) => p.status === "active" && p.start <= today && p.end >= today) ??
        periods.find((p) => p.status === "active") ??
        [...periods].sort((a, b) => b.start.localeCompare(a.start))[0] ??
        null
    );
}

/** Türkiye saatine göre bugün (YYYY-MM-DD) */
export const todayInTurkey = () => turkeyDate(new Date().toISOString());

/**
 * Her sayfanın ihtiyacı olan ortak bağlam: dönemler, seçili dönem, menü sayaçları, bugün.
 * Aynı istek içinde (layout + sayfa) bir kez çalışır.
 */
export const getAdminContext = cache(async () => {
    const [periods, selectedId] = await Promise.all([adminGet("/periods"), readSelectedPeriodId()]);
    const period = pickPeriod(periods, selectedId);
    const badges = period ? await adminGet("/badges", { periodId: period.id }) : { newApplications: 0, openMaintenance: 0, dueBills: 0, newPreRegistrations: 0 };
    return { periods, period, badges, today: todayInTurkey() };
});
