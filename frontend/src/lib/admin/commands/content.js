import { admin } from "@/lib/admin/api";

/** Site ayarları, slayt, sayfa, mesaj şablonu ve medya komutları */

const loc = (v) => (v ? { tr: v.tr ?? "", en: v.en ?? "" } : null);

export const saveSiteSettings = (f) =>
    admin.put("/site-settings", {
        phone: f.phone || null,
        whatsapp: f.whatsapp || null,
        email: f.email || null,
        address: loc(f.address),
        mapUrl: f.mapUrl || null,
        instagram: f.instagram || null,
        iban: (f.iban || "").replace(/\s/g, "") || null,
        ibanHolder: f.ibanHolder || null,
        heroVideoMediaId: f.heroVideoMediaId || null,
        mapMediaId: f.mapMediaId || null,
    });

export const saveSlide = ({ id, mediaId, title, subtitle, active }) => {
    const body = { mediaId, title: loc(title), subtitle: loc(subtitle), active: Boolean(active) };
    return id ? admin.put(`/slides/${id}`, body) : admin.post("/slides", body);
};
export const deleteSlide = ({ id }) => admin.del(`/slides/${id}`);
export const reorderSlides = ({ ids }) => admin.put("/slides/order", { ids });

/** Yalnızca metin (Hakkımızda). Satır sonları olduğu gibi gider; site boş satırı paragraf, tek satır sonunu alt satır olarak gösterir. */
export const savePage = ({ key, body }) => admin.put(`/pages/${key}`, { body: loc(body) });

export const saveTemplate = ({ id, name, tr, en }) => admin.put(`/message-templates/${id}`, { name, tr, en });

export const listMedia = ({ kind, page = 1, pageSize = 48 } = {}) => admin.get("/media", { kind, page, pageSize });
export const updateMedia = ({ id, alt }) => admin.put(`/media/${id}`, { alt: loc(alt) });
export const deleteMedia = ({ id }) => admin.del(`/media/${id}`);
