/**
 * GEÇİCİ örnek veri. Backend hazır olunca services katmanı API'ye bağlanır ve bu dosya silinir.
 * Şekil, backend DTO'larıyla aynı tutulur (çok dilli alanlar { tr, en }).
 * Görseller tasarım aracından gelen geçici adreslerdir; gerçek fotoğraflar panelden yüklenecek.
 */

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
