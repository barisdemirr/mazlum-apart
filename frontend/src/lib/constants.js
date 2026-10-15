/**
 * Site sabitleri. İletişim bilgileri henüz gelmedi: boş alanlar arayüzde gizlenir.
 * Bilgiler geldiğinde (veya site ayarlarına taşındığında) buradan güncellenir.
 */
/*
 * MOCK iletişim ve ödeme bilgileri: gerçek değerler gelince YÖNETİM PANELİNDEN (İçerik & Site → Site Ayarları)
 * girilir; backend hazır olduğunda bu alan o ayarlardan (GET /site-settings) beslenecek.
 * Admin paneli de aynı değerlerle başlar (lib/admin/mock/seed.js bu nesneyi kullanır).
 * Ayarlarda alan boşaltılırsa ilgili bilgi sitede hiç gösterilmez.
 */
export const SITE = {
    name: "Mazlum Apart",
    whatsapp: "905550000000", // MOCK
    phone: "0 (555) 000 00 00", // MOCK
    phoneHref: "tel:+905550000000", // MOCK
    address: "",
    mapUrl: "",
    instagram: "",
    // MOCK banka bilgisi (sağlama basamağı geçerli ama gerçek bir hesap değil)
    bank: { name: "", holder: "Örnek Hesap Sahibi", iban: "TR88 0099 9000 0000 0012 3456 78" },
};

/** WhatsApp bağlantısı; numara yoksa null döner */
export const waHref = (message) => {
    if (!SITE.whatsapp) return null;
    const base = `https://wa.me/${SITE.whatsapp}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/**
 * Açılış ekranı: yalnızca ~1 sn görünür ve oturum başına bir kez oynar.
 * Süre globals.css içindeki preloader animasyonlarıyla eşleşmelidir (harfler + perde = 1 sn).
 */
export const PRELOADER_DURATION = 1000;
export const PRELOADER_STORAGE_KEY = "mazlum-preloader-seen";
