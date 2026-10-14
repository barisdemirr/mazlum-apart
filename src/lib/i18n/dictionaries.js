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
    },
};
