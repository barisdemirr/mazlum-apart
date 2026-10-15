/**
 * Öğrencinin arıza talepleri. Şimdilik MOCK.
 *
 * Gerçek istekler (token çerezden proxy ile eklenir):
 *   list:   apiGet("/student/maintenance-requests")
 *   create: apiPost("/student/maintenance-requests", { area, title, description })   // fotoğraf: multipart ayrı uç
 *
 * Talep: { id, no, area, title, description, status, createdAt, photoCount, events[] }
 * events: durum geçmişi { at, status, note? } (en eskiden yeniye); note'u yönetici yazar.
 * Durumlar: received (alındı) · in_progress (işlemde) · done (tamamlandı)
 */
const MOCK_REQUESTS = [
    {
        id: "mr-3",
        no: "TK-0003",
        area: "room",
        title: "Oda kapısı kolu gevşek",
        description: "Kapı kolunda hafif oynama var, kilit mekanizması sağlam görünüyor.",
        status: "received",
        createdAt: "2026-10-14T09:12:00",
        photoCount: 0,
        events: [{ at: "2026-10-14T09:12:00", status: "received" }],
    },
    {
        id: "mr-2",
        no: "TK-0002",
        area: "bathroom",
        title: "Lavabo bataryası damlatıyor",
        description: "Lavabo bataryasından hafif su sızıyor, vana kapatılsa da damlama devam ediyor.",
        status: "in_progress",
        createdAt: "2026-10-08T22:40:00",
        photoCount: 1,
        events: [
            { at: "2026-10-08T22:40:00", status: "received" },
            { at: "2026-10-09T10:15:00", status: "in_progress", note: "Teknik ekip yönlendirildi." },
        ],
    },
    {
        id: "mr-1",
        no: "TK-0001",
        area: "room",
        title: "Çalışma lambası ampulü",
        description: "Masanın üstündeki lambanın ampulü yanmıyor.",
        status: "done",
        createdAt: "2026-09-20T19:05:00",
        photoCount: 0,
        events: [
            { at: "2026-09-20T19:05:00", status: "received" },
            { at: "2026-09-21T11:20:00", status: "done", note: "Ampul değiştirildi." },
        ],
    },
];

export async function getMaintenanceRequests() {
    return MOCK_REQUESTS;
}

/** Mock: kalıcı kayıt yok; sahte yanıt döner, istemci listeye ekler */
export async function createMaintenanceRequest({ area, title, description, photoCount = 0 }) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
    const n = MOCK_REQUESTS.length + 1 + Math.floor(Math.random() * 50);
    return {
        id: `mr-${Date.now()}`,
        no: `TK-${String(n).padStart(4, "0")}`,
        area,
        title: title.trim(),
        description: description.trim(),
        status: "received",
        createdAt: at,
        photoCount,
        events: [{ at, status: "received" }],
    };
}
