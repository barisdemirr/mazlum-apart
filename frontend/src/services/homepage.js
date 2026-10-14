// import { apiGet } from "@/lib/api";
import { MOCK_HERO, MOCK_MAP_IMAGE } from "@/lib/mockData";

/**
 * Anasayfa hero medyası (görsel + oda turu videosu).
 * Backend hazır olunca site ayarlarından gelecek: return apiGet("/api/site-settings/hero");
 */
export async function getHeroMedia() {
    return MOCK_HERO;
}

/** Konum görseli. Backend hazır olunca site ayarlarından gelecek. */
export async function getMapImage() {
    return MOCK_MAP_IMAGE;
}
