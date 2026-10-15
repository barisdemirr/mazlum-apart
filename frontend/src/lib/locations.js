import data from "@/lib/data/turkeyLocations.json";

/**
 * İl / ilçe listesi (81 il, 971 ilçe). Şimdilik yerel dosyadan okunur;
 * backend hazır olunca GET /api/locations/provinces ve /provinces/{id}/districts ile değiştirilebilir.
 */
export function getProvinces() {
    return data.map(({ id, name }) => ({ id, name }));
}

export function getDistricts(provinceId) {
    const province = data.find((item) => item.id === Number(provinceId));
    return province ? province.districts : [];
}

export function getProvinceName(provinceId) {
    return data.find((item) => item.id === Number(provinceId))?.name ?? "";
}

/** Aramada Türkçe karakter farkını yok sayar: "istanbul" -> İstanbul, "sisli" -> Şişli */
export function fold(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr")
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ç/g, "c")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u")
        .trim();
}
