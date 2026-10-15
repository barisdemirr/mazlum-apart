import { bffUpload } from "@/lib/api/bff";
import { adaptRequest } from "@/lib/api/adapters";
import { compressImage } from "@/lib/image/compress";

/**
 * Yeni arıza talebi (tarayıcıdan, vekil üzerinden): POST /api/student/maintenance-requests (multipart).
 * Fotoğraflar yüklenmeden önce küçültülür (Vercel gövde sınırı 4,5 MB). Dönüş: yeni talep (listeye eklenir).
 * Hata: ApiError; errors { title | description | area | photos } alan mesajları.
 */
export async function createMaintenanceRequest({ area, title, description, photos = [] }) {
    const form = new FormData();
    form.set("area", area);
    form.set("title", title.trim());
    form.set("description", description.trim());

    for (const photo of photos) {
        const file = await compressImage(photo.file);
        form.append("photos", file, file.name);
    }

    return adaptRequest(await bffUpload("/student/maintenance-requests", form));
}
