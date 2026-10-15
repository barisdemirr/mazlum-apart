/**
 * GEÇİCİ örnek veri. Backend hazır olunca services katmanı API'ye bağlanır ve bu dosya silinir.
 * Şekil, backend DTO'larıyla aynı tutulur (çok dilli alanlar { tr, en }).
 * Görseller tasarım aracından gelen geçici adreslerdir; gerçek fotoğraflar panelden yüklenecek.
 */

import { roomNameEn, roomTagKey, tagForRoom, AREA_TAGS, toPublicGallery } from "@/lib/gallery";

export const MOCK_HERO = {
    image: {
        url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdMmgGfLbLmOZ-M6d4B1N6R_EEl44SkelOZIbpR_71nic7HVSSYUELyz7DfPxj2z0qdp-d9UF0wjfWbMhqxfDYnphITGKAiUlp1VrP3bo9VA1cBC_IgbzQFAJl9uKLcGaFagxqYaZ7FX_1u-bQFP4I_jSM7aA6G5fZxP1LCfB5qgUbPX5vXePl-aK5okWlKQNMYoptEuxcSfbb4fNujRqA2kGK4LJq08A3gYrQbF8e2vaDkO4PBFU",
        alt: { tr: "Gün ışığı alan öğrenci odası", en: "A sunlit student room" },
    },
    videoUrl: null,
};

export const MOCK_ROOM_TYPES = [
    {
        id: "11111111-0000-0000-0000-000000000001",
        slug: "tek-kisilik-oda",
        name: { tr: "Tek Kişilik Oda", en: "Single Room" },
        image: { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtIa9qMZqUkVXbEJWBTML-igBcsPsxleGw8rVtKWNekRTOHVcqRRXhHrTM2z_Ex3n2XAgSq-WQnBQuMUZAWJV59lssYbEV4_pj786TBPseV2GZJFYt5aCueokz9Pw_aqSv2-uXyPXJo7OPrw2nuZ3AeClruY3UwdTzAgtcIBdypU7sbw7VJlOPq7F_cUPVq5aY6Cxan8Ppwmus6dGqI3MRkCnxavqZT88aX3T8NxOepgOlZ7E7a6M", alt: { tr: "Tek kişilik oda", en: "Single room" } },
        videoUrl: null,
        hasVideo: true,
        photoCount: 12,
        peopleInFlat: 4,
        peopleSharingKitchen: 4,
        peopleSharingBathroom: 2,
        monthlyPrice: 12500,
        currency: "TRY",
    },
    {
        id: "11111111-0000-0000-0000-000000000002",
        slug: "iki-kisilik-oda",
        name: { tr: "İki Kişilik Oda", en: "Double Room" },
        image: { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQCOZyZUt8HgAcot0lxzR82-E9CoYuTA8I9kJ1Q5gOT3263-1zIjboXFBe2aLut1T0eDphXjyoTyrdbDoKhAd_0MaCgQMc-TINN9A0okuZWPMYHf-KSqZTTQXJBFS_UKR17_logfmutHSSQ903m9Ula_Syqu6t3CGjQ90Gvo5H56JVbmB9b07D4lat1Rx9iapOPRAv0PWfzV1zoluP7db8PgXvNBn2d8hyTEffqlx-P4V6egAXTQ4", alt: { tr: "İki kişilik oda", en: "Double room" } },
        videoUrl: null,
        hasVideo: true,
        photoCount: 16,
        peopleInFlat: 4,
        peopleSharingKitchen: 4,
        peopleSharingBathroom: 2,
        monthlyPrice: 9500,
        currency: "TRY",
    },
    {
        id: "11111111-0000-0000-0000-000000000003",
        slug: "uc-kisilik-oda",
        name: { tr: "Üç Kişilik Oda", en: "Triple Room" },
        image: { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrhhTZeOWPIa5ToNpuR8YtOKkl81oTElsVactqpno9V2v8YdzaKE-vcs4xlPpH_ANqwlp481WMrBjPG-Lxrmgb5zp6qFfwxLbwuKGqTBXpeqg5ilNcLwGQn1YRyWDfnhkqOcuhaAzZ-Lr7Mr7WCxSgkcre0VS3baFnXvn8fB9pFR4rZ_V7YVXHflsNprgY6fv6ml2SaALWm-3BS7E10QsIZPV_Gz9t6ikmPhLX7JdJiAEas6qLWxI", alt: { tr: "Üç kişilik oda", en: "Triple room" } },
        videoUrl: null,
        hasVideo: true,
        photoCount: 14,
        peopleInFlat: 6,
        peopleSharingKitchen: 6,
        peopleSharingBathroom: 3,
        monthlyPrice: 7500,
        currency: "TRY",
    },
];

export const MOCK_MAP_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuD6TsV231IuGc6pIC-6BQAC8gcvsnarBgxpTwetdp1PsGi0A643PPWlRvTDw4Dodfwl-CnZP3zNJhB1Fmj-eAJVtKyW-xmSTNcqBTI_ZNOuToWf1_606nbG_vCeJEzsLDOyeHzMWSEtgdKWghNc-FRbtFitZtA_uUYU6o3dLuVnuJYOyp1_yrzGYZ_SW-1D2O35D_rMj-UPAmbekKGGRVS-lgVI0YezZC1RfEN2QhKqQYQwY-h9PxE";

/* ───────────────────────── Oda tipi detayı (GEÇİCİ) ─────────────────────────
   Backend DTO şekli:
   RoomTypeDetail = RoomType listesi alanları + {
     summary?, description?: { tr: string[], en: string[] },
     (galeri ve donanım DAİRE tarafındadır: Apartment.gallery / Apartment.sharedAreas / Room.features;
      oda tipi yalnızca kategori, fiyat, kapak ve tanıtım metnidir. Tip kartlarındaki peopleInFlat/peopleSharing* alanları
      dairelerden TÜRETİLMİŞ özettir; panelde elle girilmez.)
     roomFeatures / flatFeatures / sharedAreas / services / includedServices: { tr: string[], en: string[] }
   }
   Boş alanlar sayfada gizlenir; içerik panelden girilir. Buradaki metinler yalnızca örnektir. */

const IMG = {
    single: MOCK_ROOM_TYPES[0].image.url,
    double: MOCK_ROOM_TYPES[1].image.url,
    triple: MOCK_ROOM_TYPES[2].image.url,
    hero: MOCK_HERO.image.url,
};

/* Fotoğraflar fiziksel odalara/alanlara ETİKETLENİR (lib/gallery.js). Etiket anahtarı doluluk ekranındaki odayla aynıdır. */
const tagArea = (key) => AREA_TAGS.find((a) => a.key === key);
const photo = (id, url, tag, caption) => ({ id, type: "image", url, tag, caption });
const video = (id, poster) => ({ id, type: "video", url: null, poster, caption: { tr: "Oda ve daire turu", en: "Room and flat tour" } });

/** Oda tipine göre dairedeki oda adları (yönetim panelindeki fiziksel oda adlarıyla aynı olmalı) */
const ROOM_NAMES = {
    "tek-kisilik-oda": ["1. Sol Oda", "2. Sol Oda", "1. Sağ Oda", "2. Sağ Oda"],
    "iki-kisilik-oda": ["Sol Oda", "Sağ Oda"],
    "uc-kisilik-oda": ["Sol Oda", "Sağ Oda"],
};

const IMG_POOL = [IMG.single, IMG.double, IMG.triple, IMG.hero];

/**
 * Bir DAİRENİN galerisi (ham, etiketli): 1 video + her odadan bir fotoğraf + mutfak + banyo.
 * `variant` dairelere göre görselleri kaydırır; böylece aynı tipteki iki dairenin görüntüsü farklıdır.
 * rooms: [{ id, name }]  (name: Türkçe oda adı). Yönetim paneli tohumu ve herkese açık örnek veri aynı yardımcıyı kullanır.
 */
export function getMockFlatGallery(rooms, variant = 0) {
    const pick = (i) => IMG_POOL[(i + variant) % IMG_POOL.length];
    return [
        video("v1", pick(0)),
        ...rooms.map((room, i) => photo(`p${i + 1}`, pick(i + 1), tagForRoom(room), i === 0 ? { tr: "Yatak ve çalışma alanı", en: "Bed and study area" } : undefined)),
        photo("pk", pick(rooms.length + 1), tagArea("kitchen")),
        photo("pb", pick(rooms.length + 2), tagArea("bathroom")),
    ];
}

const toItems = (list, icon) => (list?.tr ?? []).map((tr, i) => ({ icon, text: { tr, en: list.en?.[i] ?? "" } }));
/** Oda özellikleri ODAYA, ortak alanlar DAİREYE aittir (oda tipine değil). Örnek veri tipten türetilir. */
export const getMockRoomFeatures = (slug) => toItems(MOCK_DETAILS[slug]?.roomFeatures, "check_circle");
export const getMockSharedAreas = (slug) => toItems(MOCK_DETAILS[slug]?.sharedAreas, "check_circle");

const MOCK_DETAILS = {
    "tek-kisilik-oda": {
        roomFeatures: { tr: ["Yatak", "Çalışma masası ve sandalye", "Gardırop"], en: ["Bed", "Desk and chair", "Wardrobe"] },
        sharedAreas: { tr: ["Ortak mutfak", "Ortak banyo"], en: ["Shared kitchen", "Shared bathroom"] },
    },
    "iki-kisilik-oda": {
        roomFeatures: { tr: ["Her öğrenciye yatak", "Çalışma masası ve sandalye", "Gardırop"], en: ["A bed for each student", "Desk and chair", "Wardrobe"] },
        sharedAreas: { tr: ["Ortak mutfak", "Ortak banyo"], en: ["Shared kitchen", "Shared bathroom"] },
    },
    "uc-kisilik-oda": {
        roomFeatures: { tr: ["Her öğrenciye yatak", "Çalışma masası", "Gardırop"], en: ["A bed for each student", "Desk", "Wardrobe"] },
        sharedAreas: { tr: ["Ortak mutfak", "Ortak banyo"], en: ["Shared kitchen", "Shared bathroom"] },
    },
};

export const getMockRoomNames = (slug) => ROOM_NAMES[slug] ?? [];

export function getMockRoomTypeDetail(slug) {
    const base = MOCK_ROOM_TYPES.find((room) => room.slug === slug);
    if (!base) return null;
    return { ...base };
}

/* ───────────────────────── Yatak bazlı doluluk (GEÇİCİ) ─────────────────────────
   Backend: GET /api/room-types/{slug}/availability  (halka açık, öğrenci bilgisi içermez)
   Yatak durumu: "available" | "reserved" (başvuruyla ayrıldı) | "occupied" (dolu).
   Kapalı/bakımdaki yataklar backend tarafından zaten listeye konmaz. */

const BED_LABELS = {
    1: [{ tr: "Yatak", en: "Bed" }],
    2: [
        { tr: "Sol yatak", en: "Left bed" },
        { tr: "Sağ yatak", en: "Right bed" },
    ],
};

const bedLabel = (count, index) => BED_LABELS[count]?.[index] ?? { tr: `${index + 1}. yatak`, en: `Bed ${index + 1}` };

function buildApartments({ slug, flats, roomsPerFlat, bedsPerRoom, bathrooms, statuses }) {
    let cursor = 0;
    const names = ROOM_NAMES[slug] ?? [];
    return Array.from({ length: flats }, (_, f) => {
        const rooms = Array.from({ length: roomsPerFlat }, (_, r) => {
            const trName = names[r] ?? `${r + 1}. Oda`;
            const id = `${slug}-flat-${f + 1}-room-${r + 1}`;
            return {
                id,
                name: { tr: trName, en: roomNameEn(trName) },
                tagKey: roomTagKey(id),
                features: getMockRoomFeatures(slug),
                beds: Array.from({ length: bedsPerRoom }, (_, b) => ({
                    id: `${id}-bed-${b + 1}`,
                    label: bedLabel(bedsPerRoom, b),
                    status: statuses[cursor++ % statuses.length],
                })),
            };
        });
        return {
            id: `${slug}-flat-${f + 1}`,
            slug: `daire-${f + 1}`,
            name: { tr: `Daire ${f + 1}`, en: `Flat ${f + 1}` },
            floor: f + 2,
            kitchens: 1,
            bathrooms,
            sharedAreas: getMockSharedAreas(slug),
            rooms,
            gallery: toPublicGallery(getMockFlatGallery(rooms.map((r) => ({ id: r.id, name: r.name.tr })), f)),
        };
    });
}

const PERIOD = { id: "period-2026-2027", name: { tr: "2026–2027 Dönemi", en: "2026–2027 Term" } };
const A = "available";
const R = "reserved";
const O = "occupied";

const AVAILABILITY_SPEC = {
    "tek-kisilik-oda": { flats: 2, roomsPerFlat: 4, bedsPerRoom: 1, bathrooms: 2, statuses: [O, O, A, O, O, R, O, A] },
    "iki-kisilik-oda": { flats: 3, roomsPerFlat: 2, bedsPerRoom: 2, bathrooms: 2, statuses: [O, O, O, A, O, R, A, A, O, O, O, O] },
    "uc-kisilik-oda": { flats: 2, roomsPerFlat: 2, bedsPerRoom: 3, bathrooms: 3, statuses: [O, O, O, O, O, A, O, R, O, O, O, O] },
};

const bedsOf = (flat) => flat.rooms.flatMap((r) => r.beds);

/** Doluluk (yalnızca daire > oda > yatak; galeri yok). GET /api/room-types/{slug}/availability */
export function getMockAvailability(slug) {
    const spec = AVAILABILITY_SPEC[slug];
    if (!spec) return null;
    const apartments = buildApartments({ slug, ...spec }).map(({ gallery, kitchens, bathrooms, sharedAreas, ...flat }) => ({ ...flat, ...flatPeople({ ...flat, kitchens, bathrooms }) }));
    return { period: PERIOD, apartments };
}

/** Dairedeki kişi sayıları yatak sayısından hesaplanır (elle girilmez). */
function flatPeople(flat) {
    const beds = bedsOf(flat).length;
    return { peopleInFlat: beds, peopleSharingKitchen: Math.ceil(beds / flat.kitchens), peopleSharingBathroom: Math.ceil(beds / flat.bathrooms) };
}

/**
 * Bu tipteki daireler (kartlar için özet). GET /api/room-types/{slug}/apartments
 * Apartment özeti: { id, slug, name, floor, peopleInFlat, peopleSharingKitchen, peopleSharingBathroom,
 *   bedsTotal, bedsFree, cover?: {url}, hasVideo, photoCount }
 */
export function getMockApartments(slug) {
    const spec = AVAILABILITY_SPEC[slug];
    if (!spec) return null;
    return buildApartments({ slug, ...spec }).map((flat) => {
        const beds = bedsOf(flat);
        const images = flat.gallery.filter((g) => g.type === "image");
        return {
            id: flat.id, slug: flat.slug, name: flat.name, floor: flat.floor,
            ...flatPeople(flat),
            bedsTotal: beds.length, bedsFree: beds.filter((b) => b.status === "available").length,
            cover: images[0] ? { url: images[0].url } : null,
            hasVideo: flat.gallery.some((g) => g.type === "video"), photoCount: images.length,
        };
    });
}

/**
 * Tek daire detayı (galeri + odalar + yataklar). GET /api/room-types/{slug}/apartments/{apartmentSlug}
 * { ...özet, gallery: MediaItem[], sharedAreas: [{icon,text:{tr,en}}], rooms: [{ id, name, features: [{icon,text}], bedCount }],
 *   availability: { period, apartments: [daire] } }
 */
export function getMockApartment(slug, apartmentSlug) {
    const spec = AVAILABILITY_SPEC[slug];
    const flat = spec && buildApartments({ slug, ...spec }).find((f) => f.slug === apartmentSlug);
    if (!flat) return null;
    const summary = getMockApartments(slug).find((a) => a.slug === apartmentSlug);
    const { gallery, kitchens, bathrooms, sharedAreas, ...lean } = flat;
    return { ...summary, gallery, sharedAreas, rooms: flat.rooms.map(({ id, name, features, beds }) => ({ id, name, features, bedCount: beds.length })), availability: { period: PERIOD, apartments: [{ ...lean, ...flatPeople(flat) }] } };
}
