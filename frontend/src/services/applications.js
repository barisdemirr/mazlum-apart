import { apiGet } from "@/lib/api";
import { bffUpload } from "@/lib/api/bff";
import { TTL_SHORT } from "@/lib/api/cache";

/**
 * Başvuru formunun ayarları (GET /api/applications/config):
 *   { period: akademik dönem | null, halfTerm, applicationsOpen, yearly: { end, summerPrices } | null, summer: { period, prices } | null, nineMonth }
 * nineMonth true iken period.start kiranın başladığı ilk gündür (Ekim); Eylül kirası alınmaz.
 * Ne akademik ne yaz dönemi açıksa null döner ve sayfa "başvurular kapalı" mesajını gösterir.
 */
export async function getApplicationConfig() {
    const config = await apiGet("/api/applications/config", { revalidate: TTL_SHORT, tags: ["application-config"] });
    const academic = Boolean(config?.period && config.applicationsOpen);
    return academic || config?.summer ? config : null;
}

/**
 * Başvuruyu gönderir (tarayıcıdan, vekil üzerinden). multipart: "data" = başvuru JSON'u, "document" = öğrenci belgesi (PDF).
 * Dönüş: { applicationNo }.
 * Hata: ApiError. status 400 -> errors { alan: [mesaj] } (form hangi adıma döneceğini bundan seçer), 409 -> yatak/T.C. çakışması,
 * 429 -> çok fazla deneme.
 */
export async function submitApplication(payload, document) {
    const form = new FormData();
    form.append("data", JSON.stringify(payload));
    if (document) form.append("document", document, document.name);
    return bffUpload("/applications", form, { timeout: 90_000 });
}
