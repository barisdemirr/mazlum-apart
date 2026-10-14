import { dictionaries } from "./dictionaries";

/** Eksik İngilizce anahtarlar Türkçeden tamamlanır */
function merge(base, override) {
    if (override === undefined) return base;
    if (base === undefined || Array.isArray(base)) return override;

    if (base && typeof base === "object") {
        const out = { ...base };
        for (const key of Object.keys(override ?? {})) out[key] = merge(base[key], override[key]);
        return out;
    }

    return override;
}

const cache = {};

export function getDictionary(locale = "tr") {
    const key = locale.toUpperCase();
    cache[key] ??= key === "TR" ? dictionaries.TR : merge(dictionaries.TR, dictionaries[key]);
    return cache[key];
}
