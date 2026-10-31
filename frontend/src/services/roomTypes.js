import { apiGet } from "@/lib/api";
import { orNull } from "@/lib/api/nullable";
import { TTL_LONG, TTL_SHORT } from "@/lib/api/cache";

/**
 * Oda tipleri ve doluluk: herkese açık uçlar (token gerekmez). Sunucu bileşenlerinde çalışır, Next önbelleği ile tutulur.
 * Panelden yapılan her değişiklik ve her yeni başvuru "catalog" etiketini hemen geçersiz kılar (bkz. lib/api/cache.js),
 * süreler yalnızca tarihe bağlı değişiklikler için yedektir.
 */
const enc = encodeURIComponent;
const CACHE = { revalidate: TTL_LONG, tags: ["catalog"] };
// Doluluk daha sık değişir: kısa önbellek
const FRESH = { revalidate: TTL_SHORT, tags: ["catalog"] };

/** GET /api/apartment-types: ana sayfadaki daire türleri, her birinin altında fiyatlı oda seçenekleri */
export const getApartmentTypes = () => apiGet("/api/apartment-types", FRESH);

/** GET /api/apartment-types/{slug} (404 -> null) */
export const getApartmentTypeBySlug = (slug) => orNull(apiGet(`/api/apartment-types/${enc(slug)}`, FRESH));

/** GET /api/apartments: /odalar sayfasındaki daire kartları (sıralı, kısa açıklamalı) */
export const getApartmentListings = () => apiGet("/api/apartments", FRESH);

/** GET /api/room-types */
export const getRoomTypes = () => apiGet("/api/room-types", CACHE);

/** GET /api/room-types/{slug} (404 -> null) */
export const getRoomTypeBySlug = (slug) => orNull(apiGet(`/api/room-types/${enc(slug)}`, CACHE));

/** GET /api/room-types/{slug}/availability: daire / oda / yatak bazlı doluluk, öğrenci bilgisi içermez (404 -> null) */
export const getRoomTypeAvailability = (slug) => orNull(apiGet(`/api/room-types/${enc(slug)}/availability`, FRESH));

/** GET /api/room-types/{slug}/rooms: tipin ODALARI (hangi dairede olduğu, kendi fotoğrafı, boş yatak). 404 -> null */
export const getAllRooms = () => orNull(apiGet("/api/rooms", FRESH));
export const getRoomTypeRooms = (slug) => orNull(apiGet(`/api/room-types/${enc(slug)}/rooms`, FRESH));

/** GET /api/room-types/{slug}/apartments: daire özet kartları (404 -> null) */
export const getRoomTypeApartments = (slug) => orNull(apiGet(`/api/room-types/${enc(slug)}/apartments`, FRESH));

/** GET /api/room-types/{slug}/apartments/{apartmentSlug}: galeri, odalar, yataklar (404 -> null) */
export const getApartment = (slug, apartmentSlug) => orNull(apiGet(`/api/room-types/${enc(slug)}/apartments/${enc(apartmentSlug)}`, FRESH));
