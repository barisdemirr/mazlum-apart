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
 * Kaynak şeffaf arka planlıysa zemin rengi aşağıdaki BACKGROUND ile doldurulur (maskable ve apple için).
 * Kaynak zaten tam kenara taşan renkli bir kareyse görünüm aynen korunur.
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

    // "maskable": görsel güvenli alana (orta %80) küçülür, kalan alan düz zemin
    const inner = Math.round(512 * 0.8);
    const logo = await square().resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: 512, height: 512, channels: 4, background } })
        .composite([{ input: logo, gravity: "centre" }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(dir, `${app}-maskable-512.png`));

    // iOS: şeffaflık yok, tam kare (köşeleri iOS yuvarlar)
    await square().resize(180, 180).flatten({ background }).png({ compressionLevel: 9 }).toFile(path.join(dir, `${app}-apple-180.png`));

    console.log(`✓ ${app}: 192, 512, maskable-512, apple-180`);
}

process.exit(failed ? 1 : 0);
