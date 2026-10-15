/** Arıza talebi sabitleri ve form doğrulaması (metinler dictionaries.studentPortal.maintenance altında) */
export const AREAS = [
    { id: "room", icon: "bed" },
    { id: "kitchen", icon: "countertops" },
    { id: "bathroom", icon: "shower" },
    { id: "other", icon: "more_horiz" },
];

export const STATUSES = ["received", "in_progress", "done"];

export const MAX_PHOTOS = 3;
/** Seçilebilecek en büyük ham dosya; yüklemeden önce küçültülür (lib/image/compress.js), bu yüzden backend sınırından (5 MB) yüksektir */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export const emptyRequest = () => ({ area: "room", title: "", description: "", photos: [] });

export function validateRequest(form) {
    const errors = {};
    if (!form.title.trim()) errors.title = "titleRequired";
    else if (form.title.trim().length < 4) errors.title = "titleShort";
    if (!form.description.trim()) errors.description = "descriptionRequired";
    else if (form.description.trim().length < 10) errors.description = "descriptionShort";
    return errors;
}
