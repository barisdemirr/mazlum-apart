/**
 * Tarayıcıda fotoğraf küçültme. Vercel'in istek gövdesi sınırı 4,5 MB olduğu için telefon fotoğrafları (5–12 MB)
 * yüklenmeden önce uzun kenarı 1280 px olan JPEG'e çevrilir (çoğunlukla 150–400 KB). Backend bunu 720 px genişlikli WebP'ye indirir.
 * 3 fotoğraf × en fazla 1 MB = 3 MB: gövde Vercel sınırının (4,5 MB) güvenle altında kalır.
 */
export async function compressImage(file, { maxSide = 1280, maxBytes = 1_000_000 } = {}) {
    if (!file.type.startsWith("image/")) throw new Error("not-image");

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff"; // saydam PNG'ler siyah kalmasın
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let quality = 0.82;
    let blob = await toBlob(canvas, quality);
    while (blob.size > maxBytes && quality > 0.45) {
        quality -= 0.1;
        blob = await toBlob(canvas, quality);
    }
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

const toBlob = (canvas, quality) =>
    new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode-failed"))), "image/jpeg", quality));
