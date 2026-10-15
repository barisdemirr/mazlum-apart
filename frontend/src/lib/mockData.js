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
     gallery: MediaItem[]  // { id, type: "video"|"image", url, poster?, label: {tr,en}, category, tag?: {key,tr,en} }  (tag: fotoğrafın ait olduğu oda/alan, lib/gallery.js)
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

const MOCK_GALLERY = {
    "tek-kisilik-oda": [
        video("v1", IMG.single),
        photo("p1", IMG.single, tagForRoom("1. Sol Oda"), { tr: "Yatak ve çalışma alanı", en: "Bed and study area" }),
        photo("p2", IMG.hero, tagForRoom("2. Sol Oda")),
        photo("p3", IMG.double, tagForRoom("1. Sağ Oda")),
        photo("p4", IMG.triple, tagForRoom("2. Sağ Oda")),
        photo("p5", IMG.double, tagArea("kitchen")),
        photo("p6", IMG.triple, tagArea("bathroom")),
    ],
    "iki-kisilik-oda": [
        video("v1", IMG.double),
        photo("p1", IMG.double, tagForRoom("Sol Oda"), { tr: "Yataklar ve çalışma alanı", en: "Beds and study area" }),
        photo("p2", IMG.hero, tagForRoom("Sol Oda"), { tr: "Gardırop", en: "Wardrobe" }),
        photo("p3", IMG.single, tagForRoom("Sağ Oda")),
        photo("p4", IMG.triple, tagArea("kitchen")),
        photo("p5", IMG.single, tagArea("bathroom")),
    ],
    "uc-kisilik-oda": [
        video("v1", IMG.triple),
        photo("p1", IMG.triple, tagForRoom("Sol Oda"), { tr: "Yataklar", en: "Beds" }),
        photo("p2", IMG.double, tagForRoom("Sağ Oda"), { tr: "Çalışma alanı", en: "Study area" }),
        photo("p3", IMG.hero, tagArea("kitchen")),
    ],
};

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

/** Yönetim paneli tohum verisi için ham galeri (etiketli) */
export const getMockRawGallery = (slug) => MOCK_GALLERY[slug] ?? [];
export const getMockRoomNames = (slug) => ROOM_NAMES[slug] ?? [];

export function getMockRoomTypeDetail(slug) {
    const base = MOCK_ROOM_TYPES.find((room) => room.slug === slug);
    if (!base) return null;
    return { ...base, ...MOCK_DETAILS[slug], gallery: toPublicGallery(MOCK_GALLERY[slug] ?? []) };
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

function buildApartments({ slug, flats, roomsPerFlat, bedsPerRoom, statuses }) {
    let cursor = 0;
    const names = ROOM_NAMES[slug] ?? [];
    return Array.from({ length: flats }, (_, f) => ({
        id: `${slug}-flat-${f + 1}`,
        name: { tr: `Daire ${f + 1}`, en: `Flat ${f + 1}` },
        floor: f + 2,
        rooms: Array.from({ length: roomsPerFlat }, (_, r) => {
            const trName = names[r] ?? `${r + 1}. Oda`;
            return {
                id: `${slug}-flat-${f + 1}-room-${r + 1}`,
                name: { tr: trName, en: roomNameEn(trName) },
                tagKey: roomTagKey(trName),
                beds: Array.from({ length: bedsPerRoom }, (_, b) => ({
                    id: `${slug}-flat-${f + 1}-room-${r + 1}-bed-${b + 1}`,
                    label: bedLabel(bedsPerRoom, b),
                    status: statuses[cursor++ % statuses.length],
                })),
            };
        }),
    }));
}

const PERIOD = { id: "period-2026-2027", name: { tr: "2026–2027 Dönemi", en: "2026–2027 Term" } };
const A = "available";
const R = "reserved";
const O = "occupied";

const AVAILABILITY_SPEC = {
    "tek-kisilik-oda": { flats: 2, roomsPerFlat: 4, bedsPerRoom: 1, statuses: [O, O, A, O, O, R, O, A] },
    "iki-kisilik-oda": { flats: 3, roomsPerFlat: 2, bedsPerRoom: 2, statuses: [O, O, O, A, O, R, A, A, O, O, O, O] },
    "uc-kisilik-oda": { flats: 2, roomsPerFlat: 2, bedsPerRoom: 3, statuses: [O, O, O, O, O, A, O, R, O, O, O, O] },
};

export function getMockAvailability(slug) {
    const spec = AVAILABILITY_SPEC[slug];
    if (!spec) return null;
    return { period: PERIOD, apartments: buildApartments({ slug, ...spec }) };
}
