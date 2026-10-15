// import { apiGet, buildQuery } from "@/lib/api";
import { MOCK_ROOM_TYPES, getMockApartment, getMockApartments, getMockAvailability, getMockRoomTypeDetail } from "@/lib/mockData";

/**
 * Oda tipleri.
 * Backend hazır olunca: return apiGet(`/api/room-types${buildQuery(params)}`);
 */
export async function getRoomTypes(params) {
    void params;
    return MOCK_ROOM_TYPES;
}

/**
 * Oda tipi detayı (galeri, açıklama, özellik listeleri dahil).
 * Backend hazır olunca: return apiGet(`/api/room-types/${encodeURIComponent(slug)}`); (404 -> null)
 */
export async function getRoomTypeBySlug(slug) {
    return getMockRoomTypeDetail(slug);
}

/**
 * Bu oda tipinin daire / oda / yatak bazlı doluluğu (seçili dönem için).
 * Halka açıktır ve hiçbir öğrenci bilgisi içermez; yalnızca yatak durumunu verir.
 * Backend hazır olunca: return apiGet(`/api/room-types/${encodeURIComponent(slug)}/availability`);
 */
export async function getRoomTypeAvailability(slug) {
    return getMockAvailability(slug);
}

/**
 * Bu tipteki daireler (özet kartlar: kapak, boş yatak, kişi sayıları). Galeri DAİREYE aittir.
 * Backend hazır olunca: return apiGet(`/api/room-types/${encodeURIComponent(slug)}/apartments`);
 */
export async function getRoomTypeApartments(slug) {
    return getMockApartments(slug);
}

/**
 * Tek daire: galeri (video + etiketli fotoğraflar), odalar ve yataklar.
 * Backend hazır olunca: return apiGet(`/api/room-types/${encodeURIComponent(slug)}/apartments/${encodeURIComponent(apartmentSlug)}`); (404 -> null)
 */
export async function getApartment(slug, apartmentSlug) {
    return getMockApartment(slug, apartmentSlug);
}
