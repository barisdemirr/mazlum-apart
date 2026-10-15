/**
 * Oda tipi galerisi: fotoğraf etiketleri ve ortak yardımcılar (hem halka açık site hem yönetim paneli kullanır).
 *
 * Müşteri kuralı: fotoğraflar etiketlenebilmeli; örn. "1. Sol Oda", "2. Sol Oda", "1. Sağ Oda", "2. Sağ Oda", "Mutfak", "Banyo".
 * Etiketli fotoğraf, dairedeki fiziksel odayla EŞLEŞİR: oda adından üretilen anahtar (`room:1-sol-oda`) hem fotoğrafta
 * hem de doluluk ekranındaki odada aynıdır; böylece öğrenci bir odayı seçerken o odanın fotoğraflarını görebilir.
 *
 * Etiket: { key, tr, en }        Galeri öğesi (DTO):
 *   key: "room:<slug>" | "kitchen" | "bathroom" | "living" | "hall" | "balcony" | "building" | "custom:<slug>"
 *   { id, type: "image" | "video", url, poster?, tag?: Etiket, caption?: { tr, en }, size? }
 * Halka açık sitenin gördüğü şekil (toPublicGallery): { id, type, url, poster, label, category, tag }
 */

/** Dairenin ortak alanları için hazır etiketler */
export const AREA_TAGS = [
    { key: "kitchen", tr: "Mutfak", en: "Kitchen", category: "kitchen" },
    { key: "bathroom", tr: "Banyo", en: "Bathroom", category: "bathroom" },
    { key: "living", tr: "Salon", en: "Living room", category: "flat" },
    { key: "hall", tr: "Koridor", en: "Hallway", category: "flat" },
    { key: "balcony", tr: "Balkon", en: "Balcony", category: "flat" },
    { key: "building", tr: "Bina", en: "Building", category: "other" },
];

export const ROOM_TAG_PREFIX = "room:";
export const CUSTOM_TAG_PREFIX = "custom:";

/** "Sağ Oda" -> "sag-oda" (aksan ve büyük/küçük harf farkı eşleşmeyi bozmaz) */
export function slugKey(text) {
    return String(text ?? "")
        .toLocaleLowerCase("tr")
        .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Fiziksel oda adından etiket anahtarı: "1. Sol Oda" -> "room:1-sol-oda" */
export const roomTagKey = (roomName) => `${ROOM_TAG_PREFIX}${slugKey(roomName)}`;

const ORDINAL_EN = { 1: "1st", 2: "2nd", 3: "3rd" };
const SIDE_EN = { sol: "Left", sag: "Right", "sağ": "Right" };

/**
 * Türkçe oda adının İngilizce karşılığı. Bilinen kalıplar ("1. Sol Oda", "Sağ Oda", "3. Oda") çevrilir;
 * bilinmeyen adlar aynen bırakılır (yönetici özel etikette İngilizcesini yazabilir).
 */
export function roomNameEn(trName) {
    const name = String(trName ?? "").trim();
    const match = /^(?:(\d+)\.\s*)?(?:(sol|sağ|sag)\s+)?oda$/i.exec(name);
    if (!match) return name;
    const [, n, side] = match;
    const parts = [];
    if (n) parts.push(ORDINAL_EN[Number(n)] ?? `${n}th`);
    if (side) parts.push(SIDE_EN[side.toLocaleLowerCase("tr")]);
    parts.push("Room");
    return parts.join(" ");
}

/** Fiziksel oda için etiket */
export const tagForRoom = (roomName) => ({ key: roomTagKey(roomName), tr: String(roomName).trim(), en: roomNameEn(roomName) });

/** Özel etiket (yönetici kendi yazar) */
export const customTag = (tr, en) => ({ key: `${CUSTOM_TAG_PREFIX}${slugKey(tr)}`, tr: tr.trim(), en: (en ?? "").trim() || tr.trim() });

/** Etiket anahtarından halka açık sitedeki kategori (ikon/rozet için) */
export function categoryOfTag(tag) {
    if (!tag?.key) return "other";
    if (tag.key.startsWith(ROOM_TAG_PREFIX)) return "room";
    return AREA_TAGS.find((a) => a.key === tag.key)?.category ?? "other";
}

/**
 * Yönetim galerisini halka açık siteye uygun şekle çevirir.
 * Video her zaman başa gelir (müşteri: uzaktan kayıtta fotoğraflar yanıltıcı olabilir, video öne çıksın).
 */
export function toPublicGallery(items = []) {
    const mapped = items.map((item) => {
        const isVideo = item.type === "video";
        const cap = item.caption;
        const hasCaption = Boolean(cap?.tr?.trim() || cap?.en?.trim());
        const label = hasCaption
            ? { tr: cap.tr?.trim() || cap.en.trim(), en: cap.en?.trim() || cap.tr.trim() }
            : item.tag
              ? { tr: item.tag.tr, en: item.tag.en || item.tag.tr }
              : { tr: isVideo ? "Video turu" : "Fotoğraf", en: isVideo ? "Video tour" : "Photo" };
        return {
            id: item.id,
            type: item.type,
            url: item.url,
            poster: item.poster ?? null,
            label,
            category: isVideo ? "video" : categoryOfTag(item.tag),
            tag: item.tag ?? null,
        };
    });
    return [...mapped.filter((i) => i.type === "video"), ...mapped.filter((i) => i.type !== "video")];
}

/**
 * Galeri filtresi için "çip" anahtarı: etiketli öğede etiketin anahtarı, etiketsizde kategori.
 * Böylece "1. Sol Oda" ve "Mutfak" ayrı çip olur; eski (etiketsiz) veriler de kategoriye göre süzülür.
 */
export const chipKey = (item) => (item.type === "video" ? "video" : item.tag?.key ?? `category:${item.category}`);
