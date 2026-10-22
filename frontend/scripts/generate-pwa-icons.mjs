/**
 * PWA ikonlarını tek bir kaynak görselden üretir.
 *
 * Kullanım:
 *   1) Kare (en az 512x512, ideal 1024x1024) PNG kaynakları şu adlarla koyun:
 *        public/pwa/student-mobileicon.png   -> Öğrenci uygulaması
 *        public/pwa/admin-mobileicon.png     -> Yönetim uygulaması
 *   2) npm run pwa:icons
 *   3) Üretilen dosyaları (public/pwa/*.png) commit'leyin.
 *
 * Üretilenler (her uygulama için):
 *   <app>-192.png            manifest, "any"
 *   <app>-512.png            manifest, "any"
 *   <app>-maskable-512.png   manifest, "maskable" (Android'in yuvarlak/squircle maskesi için güvenli alanlı)
 *   <app>-apple-180.png      iOS ana ekran ikonu (şeffaflık olmaz, düz zemin)
 *
 * Logo küçültülmez (maskable dahil). Zemin rengi (maskable ve apple için, şeffaf yerler bu renkle dolar) kaynak görselin
 * kenarlarından otomatik alınır; kenarlar şeffafsa aşağıdaki varsayılan renk kullanılır.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
    ({ default: sharp } = await import("sharp"));
} catch {
    console.error('Bu script "sharp" paketini ister (Next.js ile birlikte gelir). Bulunamadıysa: npm i -D sharp');
    process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "pwa");

const APPS = {
    student: { background: "#fff6f9" },
    admin: { background: "#f8f9ff" },
};

/** Görselin kenar piksellerinin ortalama rengi (yalnızca opak olanlar). Bulunamazsa null. */
async function detectBackground(source) {
    const size = 64;
    const { data } = await sharp(source).resize(size, size, { fit: "cover" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (x > 1 && x < size - 2 && y > 1 && y < size - 2) continue; // yalnızca kenar şeridi
            const i = (y * size + x) * 4;
            if (data[i + 3] < 250) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
    }
    if (n < size) return null; // kenarın çoğu şeffaf
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), alpha: 1 };
}

let failed = false;

for (const [app, { background }] of Object.entries(APPS)) {
    const source = path.join(dir, `${app}-mobileicon.png`);
    if (!fs.existsSync(source)) {
        console.error(`✗ ${path.relative(process.cwd(), source)} bulunamadı`);
        failed = true;
        continue;
    }

    const meta = await sharp(source).metadata();
    if (!meta.width || !meta.height || meta.width < 512 || meta.height < 512) {
        console.error(`✗ ${app}-mobileicon.png en az 512x512 olmalı (şu an ${meta.width}x${meta.height})`);
        failed = true;
        continue;
    }
    if (Math.abs(meta.width - meta.height) > 2) {
        console.warn(`! ${app}-mobileicon.png kare değil (${meta.width}x${meta.height}); ortadan kare kırpılacak`);
    }

    const square = () => sharp(source).resize({ width: 1024, height: 1024, fit: "cover", position: "centre" });

    // "any": şeffaflık korunur
    for (const size of [192, 512]) {
        await square().resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(dir, `${app}-${size}.png`));
    }

    const detected = await detectBackground(source);
    const bg = detected ?? background;

    // "maskable": küçültme yok, görsel tüm alanı kaplar; şeffaf yerler zemin rengiyle dolar
    await square().resize(512, 512).flatten({ background: bg }).png({ compressionLevel: 9 }).toFile(path.join(dir, `${app}-maskable-512.png`));

    // iOS: şeffaflık yok, tam kare (köşeleri iOS yuvarlar)
    await square().resize(180, 180).flatten({ background: bg }).png({ compressionLevel: 9 }).toFile(path.join(dir, `${app}-apple-180.png`));

    console.log(`✓ ${app}: 192, 512, maskable-512, apple-180 (zemin: ${detected ? `otomatik rgb(${detected.r},${detected.g},${detected.b})` : "varsayılan " + background})`);
}

process.exit(failed ? 1 : 0);
