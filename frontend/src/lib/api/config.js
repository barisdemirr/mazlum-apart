export const API_CONFIG = {
    // Sunucu tarafında API_URL (varsa) kullanılır, tarayıcıda NEXT_PUBLIC_API_URL
    baseUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5252",
    defaultRevalidate: 60, // saniye
    timeout: 15000, // ms
};

export function buildApiUrl(path) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_CONFIG.baseUrl}${cleanPath}`;
}
