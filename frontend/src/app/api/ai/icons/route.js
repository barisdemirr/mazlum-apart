import { adminFromRequest } from "@/lib/admin/server";

const MODEL = "gemini-3.5-flash-lite";

const SYSTEM = `Sen Material Symbols ikon kütüphanesi uzmanısın. Kullanıcının Türkçe yazdığı kavrama en uygun ikonları seçersin.

Kurallar:
- Yalnızca Google Material Symbols (Outlined) kütüphanesinde GERÇEKTEN var olan ikon adlarını döndür. Uydurma.
- Ad biçimi: küçük harf ve alt çizgi. Örnek: local_gas_station, directions_car, ac_unit.
- En alakalı 5 ikonu, alakalılık sırasına göre ver.
- Her ikon için Türkçe kısa bir açıklama yaz (en fazla 4 kelime).
- Sadece istenen JSON'u döndür, açıklama veya kod bloğu ekleme.`;

export async function POST(request) {
    if (!(await adminFromRequest(request))) {
        return Response.json({ title: "Oturum süresi doldu." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ title: "Öneri servisi yapılandırılmamış." }, { status: 503 });

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ title: "Geçersiz istek." }, { status: 400 });
    }

    const query = String(body?.query ?? "").trim().slice(0, 100);
    if (!query) return Response.json({ title: "Arama metni girin." }, { status: 400 });

    const prompt = `Kavram: "${query}"

Yanıtı tam olarak şu biçimde ver:
{"icons":[{"name":"...","label":"..."}]}`;

    let response;
    try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(20000),
        });
    } catch {
        return Response.json({ title: "Öneri servisine ulaşılamadı." }, { status: 503 });
    }

    if (!response.ok) {
        console.error("[gemini-icons]", response.status, (await response.text().catch(() => "")).slice(0, 300));
        return Response.json({ title: "Öneri alınamadı." }, { status: 502 });
    }

    const data = await response.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

    let parsed;
    try {
        parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
    } catch {
        return Response.json({ title: "Öneri okunamadı, tekrar deneyin." }, { status: 502 });
    }

    // Ad biçimi doğrulanır: yalnızca küçük harf ve alt çizgi
    const icons = (Array.isArray(parsed?.icons) ? parsed.icons : [])
        .filter((i) => typeof i?.name === "string" && /^[a-z0-9_]+$/.test(i.name))
        .slice(0, 5)
        .map((i) => ({ name: i.name, label: typeof i.label === "string" ? i.label.slice(0, 40) : "" }));

    if (icons.length === 0) return Response.json({ title: "Uygun ikon bulunamadı." }, { status: 502 });

    return Response.json({ icons });
}