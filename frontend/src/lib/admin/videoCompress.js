/**
 * Tarayıcıda video küçültme: en fazla 720p, ~1.5 Mbps, sessiz (oda turu için ses gerekmez).
 * Neden frontend? Backend paylaşımlı hosting'te olacak; ffmpeg çalıştırılamaz ve disk paketi sınırlı.
 *
 * Yöntem: video gerçek hızda bir <canvas>'a çizilir, canvas.captureStream() MediaRecorder ile kodlanır.
 * Bu yüzden süre kadar bekler (60 sn video ≈ 60 sn). İlerleme `onProgress(0..1)` ile bildirilir.
 * Çıktı tercihi: MP4 (H.264) -> WebM (VP9) -> WebM (VP8). Hiçbiri yoksa ya da sonuç özgün dosyadan büyükse
 * özgün dosya olduğu gibi döner (compressed:false).
 */
export const VIDEO_TARGET_HEIGHT = 720;
export const VIDEO_TARGET_BITRATE = 1_500_000;
export const VIDEO_MAX_SECONDS = 180;
export const VIDEO_MAX_INPUT_BYTES = 500 * 1024 * 1024;

const MIME_CANDIDATES = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

export const pickMime = () => (typeof MediaRecorder === "undefined" ? null : MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null);

function loadMeta(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onloadedmetadata = () => resolve({ video, url });
        video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Video okunamadı. MP4 ya da MOV deneyin.")); };
        video.src = url;
    });
}

/** @returns {Promise<{file: File, compressed: boolean, width: number, height: number, duration: number}>} */
export async function compressVideo(file, { onProgress } = {}) {
    const { video, url } = await loadMeta(file);
    const duration = video.duration;
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    try {
        if (!Number.isFinite(duration) || !sw || !sh) throw new Error("Video okunamadı. MP4 ya da MOV deneyin.");
        if (duration > VIDEO_MAX_SECONDS) throw new Error(`Video en fazla ${VIDEO_MAX_SECONDS / 60} dakika olabilir. Kısaltıp tekrar deneyin.`);

        const bitrate = (file.size * 8) / duration;
        const small = Math.min(sw, sh) <= VIDEO_TARGET_HEIGHT && bitrate <= VIDEO_TARGET_BITRATE * 1.15;
        const mime = pickMime();
        if (small || !mime) return { file, compressed: false, width: sw, height: sh, duration };

        // Kısa kenar 720'ye indirilir (dikey videoda da 720x1280 gibi); yukarı ölçeklenmez. Boyutlar çift sayı olmalı.
        const scale = Math.min(1, VIDEO_TARGET_HEIGHT / Math.min(sw, sh));
        const w = Math.max(2, Math.round((sw * scale) / 2) * 2);
        const h = Math.max(2, Math.round((sh * scale) / 2) * 2);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_TARGET_BITRATE });
        const chunks = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

        const done = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = (e) => reject(e.error ?? new Error("Video kodlanamadı."));
        });

        let raf = 0;
        const draw = () => {
            ctx.drawImage(video, 0, 0, w, h);
            onProgress?.(Math.min(0.99, video.currentTime / duration));
            if (!video.ended) raf = (video.requestVideoFrameCallback ?? requestAnimationFrame).call(video, draw);
        };
        video.onended = () => { cancelAnimationFrame(raf); setTimeout(() => recorder.state !== "inactive" && recorder.stop(), 150); };

        recorder.start(1000);
        await video.play();
        draw();
        await done;

        const type = mime.split(";")[0];
        const ext = type === "video/mp4" ? "mp4" : "webm";
        const blob = new Blob(chunks, { type });
        if (!blob.size || blob.size >= file.size) return { file, compressed: false, width: sw, height: sh, duration };
        onProgress?.(1);
        const name = `${file.name.replace(/\.[^.]+$/, "")}-720p.${ext}`;
        return { file: new File([blob], name, { type }), compressed: true, width: w, height: h, duration };
    } finally {
        video.pause();
        URL.revokeObjectURL(url);
    }
}
