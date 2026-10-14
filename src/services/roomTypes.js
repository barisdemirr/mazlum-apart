// import { apiGet, buildQuery } from "@/lib/api";
import { MOCK_ROOM_TYPES } from "@/lib/mockData";

/**
 * Oda tipleri.
 * Backend hazır olunca: return apiGet(`/api/room-types${buildQuery(params)}`);
 */
export async function getRoomTypes(params) {
    void params;
    return MOCK_ROOM_TYPES;
}

/** Backend hazır olunca: return apiGet(`/api/room-types/${encodeURIComponent(slug)}`); */
export async function getRoomTypeBySlug(slug) {
    return MOCK_ROOM_TYPES.find((room) => room.slug === slug) ?? null;
}
