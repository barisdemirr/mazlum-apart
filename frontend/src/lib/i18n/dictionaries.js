/**
 * Arayüz metinleri. Bileşenlerde sabit metin yazılmaz, buradan okunur.
 * Yeni anahtar eklerken TR ve EN birlikte eklenir. EN'de eksik anahtar TR'den tamamlanır.
 */

/** interpolate("Merhaba {name}", { name: "Elif" }) -> "Merhaba Elif" */
export function interpolate(text, vars = {}) {
    return String(text ?? "").replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export const dictionaries = {
    TR: {
        meta: {
            title: "Mazlum Apart | Trabzon Kız Öğrenci Apartı",
            description:
                "Trabzon'da sadece kız öğrencilere özel apart. Oda tiplerini fotoğraf ve videolarla incele, online başvur. Tüm faturalar fiyata dahil.",
        },
        common: {
            perMonth: "/ ay",
            billsIncluded: "Tüm faturalar dahil",
            girlsOnly: "Sadece kız öğrenciler",
            term: "1 Eylül – 30 Haziran",
        },
        hero: {
            tag: "Sadece kız öğrencilere özel",
            place: "Trabzon",
            titleStart: "Trabzon'da",
            titleAccent: "kendine ait",
            titleEnd: "bir dünya.",
            description:
                "Kız öğrencilere özel apartımızda oda tiplerini fotoğraf ve videolarla incele, başvurunu online yap. Tüm faturalar fiyata dahil.",
            explore: "Odaları Keşfet",
            apply: "Hemen Başvur",
            termLabel: "Akademik Dönem",
            termMonths: "10 Ay",
            scroll: "Kaydır",
            playTour: "Oda turunu izle",
            closeVideo: "Videoyu kapat",
        },
        strip: {
            front: ["Tüm faturalar fiyata dahil", "Sadece kız öğrenciler", "1 Eylül – 30 Haziran", "Online başvuru"],
            back: ["Trabzon", "Kız öğrenci apartı", "Fotoğraf ve video ile incele", "Öğrenci portalı"],
        },
        rooms: {
            eyebrow: "Fotoğraf ve video ile incele",
            title: "Oda Tiplerimiz",
            subtitle: "Her oda tipini fotoğraf ve videolarıyla detaylı incele. Tüm faturalar fiyata dahildir.",
            prev: "Önceki oda",
            next: "Sonraki oda",
            video: "Video Tur",
            photos: "{count} fotoğraf",
            peopleInFlat: "Dairede {count} kişi",
            kitchen: "Mutfak {count} kişi ortak",
            bathroom: "Banyo {count} kişi ortak",
            monthlyPrice: "Aylık fiyat",
            view: "Odayı incele",
            allTitle: "Sana en uygun odayı birlikte seçelim",
            allText: "Fotoğraf ve video turlarını inceleyip online başvuru adımlarına geçebilirsin.",
            allCta: "Tüm Odaları Gör",
        },
        nav: {
            home: "Anasayfa",
            rooms: "Odalar",
            about: "Hakkımızda",
            contact: "İletişim",
            studentLogin: "Öğrenci Girişi",
            apply: "Hemen Başvur",
            menu: "Menü",
            openMenu: "Menüyü aç",
            closeMenu: "Menüyü kapat",
            tagline: "Kız Öğrenci Apartı",
            language: "Dil",
        },
        footer: {
            about: "Trabzon'da sadece kız öğrencilere özel apart. Tüm faturalar fiyata dahil.",
            menu: "Menü",
            student: "Öğrenci",
            contact: "İletişim",
            rights: "Tüm hakları saklıdır.",
            location: "Trabzon / Türkiye",
            instagram: "Instagram",
            whatsapp: "WhatsApp",
        },
        whatsapp: {
            fab: "Bize yaz",
            aria: "WhatsApp ile yaz",
            defaultMessage: "Merhaba, Mazlum Apart hakkında bilgi almak istiyorum.",
        },
    },

    EN: {
        meta: {
            title: "Mazlum Apart | Female Student Residence in Trabzon",
            description:
                "A student residence in Trabzon for female students only. Explore room types with photos and videos and apply online. All bills included.",
        },
        common: {
            perMonth: "/ month",
            billsIncluded: "All bills included",
            girlsOnly: "Female students only",
            term: "1 September – 30 June",
        },
        hero: {
            tag: "For female students only",
            place: "Trabzon",
            titleStart: "A world of your own",
            titleAccent: "in Trabzon.",
            titleEnd: "",
            description:
                "Explore the room types in our female-only residence with photos and videos, and apply online. All bills are included in the price.",
            explore: "Explore Rooms",
            apply: "Apply Now",
            termLabel: "Academic Term",
            termMonths: "10 Months",
            scroll: "Scroll",
            playTour: "Watch the room tour",
            closeVideo: "Close video",
        },
        strip: {
            front: ["All bills included", "Female students only", "1 September – 30 June", "Apply online"],
            back: ["Trabzon", "Female student residence", "Explore with photos and videos", "Student portal"],
        },
        rooms: {
            eyebrow: "Explore with photos and videos",
            title: "Our Room Types",
            subtitle: "Explore each room type in detail with photos and videos. All bills are included in the price.",
            prev: "Previous room",
            next: "Next room",
            video: "Video Tour",
            photos: "{count} photos",
            peopleInFlat: "{count} people in the flat",
            kitchen: "Kitchen shared by {count}",
            bathroom: "Bathroom shared by {count}",
            monthlyPrice: "Monthly price",
            view: "View room",
            allTitle: "Let's find the room that suits you",
            allText: "Browse the photo and video tours, then move on to the online application.",
            allCta: "See All Rooms",
        },
        nav: {
            home: "Home",
            rooms: "Rooms",
            about: "About",
            contact: "Contact",
            studentLogin: "Student Login",
            apply: "Apply Now",
            menu: "Menu",
            openMenu: "Open menu",
            closeMenu: "Close menu",
            tagline: "Female Student Residence",
            language: "Language",
        },
        footer: {
            about: "A student residence in Trabzon for female students only. All bills included.",
            menu: "Menu",
            student: "Student",
            contact: "Contact",
            rights: "All rights reserved.",
            location: "Trabzon / Türkiye",
            instagram: "Instagram",
            whatsapp: "WhatsApp",
        },
        whatsapp: {
            fab: "Message us",
            aria: "Message us on WhatsApp",
            defaultMessage: "Hello, I would like information about Mazlum Apart.",
        },
    },
};
