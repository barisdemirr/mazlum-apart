import { apiGet } from "@/lib/api";
import { bffPost } from "@/lib/api/bff";

/**
 * Başvuru formunun ayarları: açık dönem ve yarım dönem durumu (GET /api/applications/config).
 * Dönem yoksa period null gelir ve sayfa "başvurular kapalı" mesajını gösterir.
 * Dönüş: { period: {id,name,start,end} | null, halfTerm: {enabled, firstEnd, secondStart}, applicationsOpen }
 */
export async function getApplicationConfig() {
    const config = await apiGet("/api/applications/config", { revalidate: 30, tags: ["application-config"] });
    return config?.period && config.applicationsOpen ? config : null;
}

/**
 * Başvuruyu gönderir (tarayıcıdan, vekil üzerinden). Dönüş: { applicationNo }.
 * Hata: ApiError. status 400 -> errors { alan: [mesaj] } (form hangi adıma döneceğini bundan seçer), 409 -> yatak/T.C. çakışması,
 * 429 -> çok fazla deneme.
 */
export async function submitApplication(payload) {
    return bffPost("/applications", payload);
}
