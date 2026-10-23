import { apiGet } from "@/lib/api";
import { bffPost } from "@/lib/api/bff";

/**
 * Başvuru formunun ayarları (GET /api/applications/config):
 *   { period: akademik dönem | null, halfTerm, applicationsOpen, yearly: { end, summerPrices } | null, summer: { period, prices } | null }
 * Ne akademik ne yaz dönemi açıksa null döner ve sayfa "başvurular kapalı" mesajını gösterir.
 */
export async function getApplicationConfig() {
    const config = await apiGet("/api/applications/config", { revalidate: 30, tags: ["application-config"] });
    const academic = Boolean(config?.period && config.applicationsOpen);
    return academic || config?.summer ? config : null;
}

/**
 * Başvuruyu gönderir (tarayıcıdan, vekil üzerinden). Dönüş: { applicationNo }.
 * Hata: ApiError. status 400 -> errors { alan: [mesaj] } (form hangi adıma döneceğini bundan seçer), 409 -> yatak/T.C. çakışması,
 * 429 -> çok fazla deneme.
 */
export async function submitApplication(payload) {
    return bffPost("/applications", payload);
}
