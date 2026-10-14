/**
 * Site sabitleri. İletişim bilgileri henüz gelmedi: boş alanlar arayüzde gizlenir.
 * Bilgiler geldiğinde (veya site ayarlarına taşındığında) buradan güncellenir.
 */
export const SITE = {
    name: "Mazlum Apart",
    whatsapp: "", // örn. "905XXXXXXXXX"
    phone: "", // örn. "0 (5XX) XXX XX XX"
    phoneHref: "", // örn. "tel:+905XXXXXXXXX"
    address: "",
    mapUrl: "",
    instagram: "",
};

/** WhatsApp bağlantısı; numara yoksa null döner */
export const waHref = (message) => {
    if (!SITE.whatsapp) return null;
    const base = `https://wa.me/${SITE.whatsapp}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/** Açılış ekranı süresi (ms) ve oturum anahtarı */
export const PRELOADER_DURATION = 1600;
export const PRELOADER_STORAGE_KEY = "mazlum-preloader-seen";
