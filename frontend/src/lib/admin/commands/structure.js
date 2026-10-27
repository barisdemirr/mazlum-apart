import { admin } from "@/lib/admin/api";

/** Oda tipi, daire, oda ve galeri komutları */

const loc = (v) => (v ? { tr: v.tr ?? "", en: v.en ?? "" } : null);
const items = (list) => (list ?? []).map((x) => ({ icon: x.icon || "check_circle", text: loc(x.text) }));

export const saveRoomType = ({ id, name, slug, description, mediaId, active, order, apartmentTypeId }) => {
    const body = { apartmentTypeId: apartmentTypeId || null, name: loc(name), slug: slug || null, description: loc(description), coverMediaId: mediaId || null, active: Boolean(active), order: Number(order ?? 0) };
    return id ? admin.put(`/room-types/${id}`, body) : admin.post("/room-types", body);
};
export const deleteRoomType = ({ id }) => admin.del(`/room-types/${id}`);
/** Sıralamayı kaydeder (yalnızca OrderIndex; kayıt, yerleşim ve doluluk verisi değişmez). kind: "apartment-types" | "room-types" */
export const saveStructureOrder = ({ kind, ids }) => admin.put("/structure/order", { kind, ids });

/** Silme öncesi etki özeti: kaç oda/yatak/fiyat etkilenir, silmeyi engelleyen durum var mı */
export const roomTypeDeleteImpact = ({ id }) => admin.get(`/room-types/${id}/delete-impact`);
export const apartmentDeleteImpact = ({ id }) => admin.get(`/apartments/${id}/delete-impact`);
export const roomDeleteImpact = ({ id }) => admin.get(`/rooms/${id}/delete-impact`);

/* Daire türleri: ana sayfada listelenen kategoriler (altında oda seçenekleri ve fiziksel daireler) */
export const saveApartmentType = ({ id, name, slug, description, mediaId, active, order }) => {
    const body = { name: loc(name), slug: slug || null, description: loc(description), coverMediaId: mediaId || null, active: Boolean(active), order: Number(order ?? 0) };
    return id ? admin.put(`/apartment-types/${id}`, body) : admin.post("/apartment-types", body);
};
export const deleteApartmentType = ({ id }) => admin.del(`/apartment-types/${id}`);
/** Daireyi (odalarıyla) kopyalar; aynı türden birden fazla daire için */
export const duplicateApartment = ({ id, name, count }) => admin.post(`/apartments/${id}/duplicate`, { name, count: Number(count || 1) });

export const saveApartment = ({ id, name, slug, floor, kitchens, bathrooms, note, published, order, sharedAreas, apartmentTypeId, description }) => {
    const body = {
        description: loc(description),
        apartmentTypeId: apartmentTypeId || null, name, slug: slug || null, floor: Number(floor || 0), kitchens: Number(kitchens || 0), bathrooms: Number(bathrooms || 0),
        note: note || null, published: Boolean(published), order: Number(order ?? 0), sharedAreas: items(sharedAreas),
    };
    return id ? admin.put(`/apartments/${id}`, body) : admin.post("/apartments", body);
};
export const deleteApartment = ({ id }) => admin.del(`/apartments/${id}`);

export const saveRoom = ({ id, apartmentId, roomTypeId, name, beds, status, order, features }) => {
    const body = { apartmentId, roomTypeId, name, beds: Number(beds), status, order: Number(order ?? 0), features: items(features) };
    return id ? admin.put(`/rooms/${id}`, body) : admin.post("/rooms", body);
};
export const deleteRoom = ({ id }) => admin.del(`/rooms/${id}`);

/* ── Galeri: dosyalar önce medya kitaplığına yüklenir (lib/admin/upload.js), sonra galeriye eklenir ── */
export const getGallery = ({ apartmentId }) => admin.get(`/apartments/${apartmentId}/gallery`);
export const addGalleryItems = ({ apartmentId, mediaIds, tag }) => admin.post(`/apartments/${apartmentId}/gallery`, { mediaIds, tag: tag ?? null });
export const updateGalleryItem = ({ apartmentId, itemId, tag, caption }) =>
    admin.put(`/apartments/${apartmentId}/gallery/${itemId}`, { tag: tag ?? null, caption: caption ? loc(caption) : null });
export const reorderGallery = ({ apartmentId, itemIds }) => admin.put(`/apartments/${apartmentId}/gallery/order`, { itemIds });
export const removeGalleryItem = ({ apartmentId, itemId, deleteFile = true }) =>
    admin.del(`/apartments/${apartmentId}/gallery/${itemId}`, { deleteFile });
