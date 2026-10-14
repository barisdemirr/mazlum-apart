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
