/** { featured: true, limit: 6 } -> "?featured=true&limit=6" (boş değerler atlanır) */
export function buildQuery(params) {
    if (!params) return "";
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        search.set(key, String(value));
    }
    const text = search.toString();
    return text ? `?${text}` : "";
}
