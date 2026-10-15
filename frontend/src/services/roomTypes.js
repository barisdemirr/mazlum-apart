// import { apiGet, buildQuery } from "@/lib/api";
import { MOCK_ROOM_TYPES, getMockAvailability, getMockRoomTypeDetail } from "@/lib/mockData";

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
