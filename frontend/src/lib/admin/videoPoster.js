/**
 * Yüklenen videodan kapak karesi (poster) üretir; tarayıcıda, sunucusuz.
 * Başarısız olursa null döner (video yine eklenir, kapaksız görünür).
 * Backend hazır olunca video dosyası yüklenir ve poster ayrıca (veya sunucuda ffmpeg ile) üretilebilir.
 */
export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export function makeVideoPoster(file, { width = 960, at = 0.5 } = {}) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        let done = false;
        const finish = (value) => {
            if (done) return;
            done = true;
            URL.revokeObjectURL(url);
            resolve(value);
        };
        const timer = setTimeout(() => finish(null), 8000);
        video.muted = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.onerror = () => { clearTimeout(timer); finish(null); };
        video.onloadedmetadata = () => {
            video.currentTime = Math.min(at, (video.duration || 1) / 2);
        };
        video.onseeked = () => {
            try {
                const ratio = video.videoWidth ? video.videoHeight / video.videoWidth : 9 / 16;
                const canvas = document.createElement("canvas");
                canvas.width = Math.min(width, video.videoWidth || width);
                canvas.height = Math.round(canvas.width * ratio);
                canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => { clearTimeout(timer); finish(blob ? URL.createObjectURL(blob) : null); }, "image/jpeg", 0.8);
            } catch {
                clearTimeout(timer);
                finish(null);
            }
        };
        video.src = url;
    });
}
