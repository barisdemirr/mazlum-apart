import { apiGet } from "@/lib/api";

/**
 * Herkese açık site ayarları: telefon, WhatsApp, adres, harita, Instagram, hero videosu, konum görseli.
 * Boş alanlar null gelir ve sitede hiç gösterilmez. IBAN burada YOK (yalnızca öğrenci portalında).
 */
export const getSiteSettings = () => apiGet("/api/site-settings", { revalidate: 60, tags: ["site-settings"] });

const EMPTY = { phone: null, whatsapp: null, email: null, address: null, mapUrl: null, instagram: null, heroVideo: null, mapImage: null };

/** Ayarlar alınamazsa site yine açılır (iletişim bilgileri gizlenir) */
export async function getSiteSettingsSafe() {
    try {
        return { ...EMPTY, ...(await getSiteSettings()) };
    } catch (error) {
        console.error("[site-settings]", error?.message ?? error);
        return EMPTY;
    }
}
