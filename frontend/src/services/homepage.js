import { apiGet } from "@/lib/api";
import { getSiteSettings } from "./siteSettings";

/** Anasayfa hero slaytları (yalnızca yayındakiler, sıralı): [{ id, image, title, subtitle }] */
export const getHeroSlides = () => apiGet("/api/slides", { revalidate: 60, tags: ["slides"] });

/**
 * Anasayfa hero medyası: site ayarlarındaki oda turu videosu ve kapak görseli (videonun poster karesi).
 * Video yüklenmemişse { image: null, videoUrl: null } döner; sayfa kapak olarak ilk oda tipinin görselini kullanır.
 */
export async function getHeroMedia() {
    const settings = await getSiteSettings();
    const video = settings.heroVideo;
    return {
        image: video?.poster ? { url: video.poster, alt: { tr: "Mazlum Apart oda turu", en: "Mazlum Apart room tour" } } : null,
        videoUrl: video?.url ?? null,
    };
}

/** Konum görseli (site ayarları). Yüklenmemişse boş metin. */
export async function getMapImage() {
    const settings = await getSiteSettings();
    return settings.mapImage ?? "";
}
