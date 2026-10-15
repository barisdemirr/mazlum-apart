"use client";

/** items: [{ key, text, hint }] → { key: { en } } */
export async function translateFields(items) {
    const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
        window.location.href = "/admin/login?expired=1";
        throw new Error("Oturum süresi doldu.");
    }
    if (!response.ok) throw new Error(data?.title || "Çeviri başarısız.");

    return Object.fromEntries(data.results.map((r) => [r.key, { en: r.en }]));
}