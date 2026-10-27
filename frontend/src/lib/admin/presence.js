/**
 * Çıkış / ayrılış durumlarının ekrandaki karşılığı (renkler müşterinin istediği gibi):
 * yeşil = aktif konaklama · sarı = geçici ayrılış · turuncu = çıkış bildirildi · gri = çıkış onaylandı
 * Durumlar sunucuda seçilen güne göre hesaplanır; burada yalnızca görünüm vardır.
 */
export const STAY = {
    active: { label: "Aktif konaklama", chip: "bg-emerald-50 text-emerald-900 ring-emerald-300", dot: "bg-emerald-500", tone: "ok" },
    temporary_away: { label: "Geçici ayrılışta", chip: "bg-yellow-50 text-yellow-900 ring-yellow-300", dot: "bg-yellow-400", tone: "warn" },
    exit_reported: { label: "Çıkış bildirildi", chip: "bg-orange-50 text-orange-900 ring-orange-300", dot: "bg-orange-500", tone: "warn" },
    exit_confirmed: { label: "Çıkış onaylandı", chip: "bg-slate-100 text-slate-700 ring-slate-300", dot: "bg-slate-400", tone: "neutral" },
};

export const READINESS = {
    needs_cleaning: "Temizlik bekliyor",
    needs_repair: "Tadilat bekliyor",
    ready: "Hazır",
};

export const VACANCY_KIND = {
    vacated: { label: "Tamamen boş (çıkış onaylı)", tone: "danger" },
    temporary: { label: "Geçici olarak tamamen boş", tone: "brand" },
    exit_pending: { label: "Çıkış onay bekliyor", tone: "warn" },
    unoccupied: { label: "Yerleşimi yok", tone: "neutral" },
};

/**
 * Dairenin kartı: { label, ring, tone } ya da null (normal görünüm).
 * Tamamen boşalan daire kırmızı; temizlik/tadilat tamamlanıp "Hazır" işaretlenince yeşil.
 * Geçici olarak tamamen boş mavi. Daire kısmen doluysa kart değişmez, yalnızca çıkan öğrencinin rengi değişir.
 */
export function apartmentLook(p) {
    if (!p) return null;
    switch (p.state) {
        case "fully_vacated":
            if (p.readiness === "ready") return { label: "Hazır", ring: "ring-2 ring-emerald-400", tone: "ok" };
            if (p.readiness === "needs_cleaning") return { label: "Boşaldı · temizlik bekliyor", ring: "ring-2 ring-red-400", tone: "danger" };
            if (p.readiness === "needs_repair") return { label: "Boşaldı · tadilat bekliyor", ring: "ring-2 ring-red-400", tone: "danger" };
            return { label: "Tamamen boşaldı", ring: "ring-2 ring-red-400", tone: "danger" };
        case "temporarily_empty":
            return { label: "Geçici olarak tamamen boş", ring: "ring-2 ring-sky-400", tone: "brand" };
        case "exit_pending":
            return { label: "Çıkışlar onay bekliyor", ring: "ring-2 ring-orange-300", tone: "warn" };
        case "partially_empty":
            return { label: "Kısmen boş", ring: "", tone: "neutral" };
        default:
            return null;
    }
}

/** Sunucu UTC saatini ("Z"siz de gelebilir) Türkiye saatiyle yazar: 27.10.2026 22:43 */
export function dateTime(iso) {
    if (!iso) return "";
    const value = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
    return new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Ayrılışın kısa durumu: { label, tone } */
export function leaveStatus(leave) {
    if (leave.returnedOn) return { label: "Döndü", tone: "ok" };
    if (leave.overdue) return { label: "Dönüşü gecikti", tone: "danger" };
    if (leave.away) return { label: "Ayrılışta", tone: "warn" };
    if (!leave.started) return { label: "Planlı", tone: "neutral" };
    return { label: "Ayrılışta", tone: "warn" };
}

/** "3 gün sonra döner" / "2 gün gecikti" */
export function returnHint(leave) {
    if (leave.returnedOn || leave.returnInDays == null) return null;
    const n = leave.returnInDays;
    if (n > 0) return `${n} gün sonra döner`;
    if (n === 0) return "Bugün dönmesi bekleniyor";
    return `${-n} gün gecikti`;
}
