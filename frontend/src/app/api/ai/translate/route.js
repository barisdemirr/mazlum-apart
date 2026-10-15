import { adminFromRequest } from "@/lib/admin/server";

const MODEL = "gemini-3.5-flash-lite";
const MAX_CHARS = 30000;

const SYSTEM = `Sen bir öğrenci apartı (yurt) tanıtım sitesi için profesyonel çevirmensin. İşletme: Mazlum Apart, Trabzon'da üniversite öğrencilerine odaları ve daireleriyle konaklama hizmeti veriyor.

Kurallar:
- Türkçe metni İngilizceye (en) çevir.
- Tanıtım metinlerinde doğal, akıcı ve sıcak bir dil kullan; birebir sözlük çevirisi yapma.
- Özel adları koru: Mazlum Apart, Trabzon, Karadeniz Teknik Üniversitesi ve benzeri kurum/yer adları.
- Metin HTML içeriyorsa etiketleri aynen koru, sadece metinleri çevir.
- Kısa etiket ve başlıkları kısa tut, cümleye dönüştürme.
- Para birimi, sayı, tarih ve {süslü_parantez} içindeki değişkenleri değiştirme.
- Sadece istenen JSON'u döndür, açıklama veya kod bloğu ekleme.`;

export async function POST(request) {
    // Sadece oturum açmış yönetici kullanabilir
    if (!(await adminFromRequest(request))) {
        return Response.json({ title: "Oturum süresi doldu." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return Response.json({ title: "Çeviri servisi yapılandırılmamış." }, { status: 503 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ title: "Geçersiz istek." }, { status: 400 });
    }

    // items: [{ key, text, hint? }] — tek alan da çoklu alan da aynı uçtan geçer
    const items = Array.isArray(body?.items) ? body.items.filter((i) => i?.text?.trim()) : [];

    if (items.length === 0) {
        return Response.json({ title: "Çevrilecek metin yok." }, { status: 400 });
    }

    const totalChars = items.reduce((sum, i) => sum + i.text.length, 0);
    if (totalChars > MAX_CHARS) {
        return Response.json({ title: "Metin çok uzun, parça parça çevirin." }, { status: 413 });
    }

    const payload = items.map((i) => ({ key: i.key, hint: i.hint ?? undefined, tr: i.text }));

    const prompt = `Aşağıdaki alanları çevir. "hint" alanın ne olduğunu anlatır, çeviriyi ona göre tonla.

${JSON.stringify(payload, null, 2)}

Yanıtı tam olarak şu biçimde ver:
{"results":[{"key":"...","en":"..."}]}`;

    let response;
    try {
        response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM }] },
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        responseMimeType: "application/json",
                    },
                }),
                signal: AbortSignal.timeout(45000),
            }
        );
    } catch {
        return Response.json({ title: "Çeviri servisine ulaşılamadı." }, { status: 503 });
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error("[gemini]", response.status, detail.slice(0, 500));
        return Response.json(
            { title: response.status === 429 ? "Çeviri sınırı aşıldı, biraz bekleyin." : "Çeviri başarısız." },
            { status: 502 }
        );
    }

    const data = await response.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

    let parsed;
    try {
        parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
    } catch {
        console.error("[gemini] çözümlenemeyen yanıt:", text.slice(0, 500));
        return Response.json({ title: "Çeviri yanıtı okunamadı, tekrar deneyin." }, { status: 502 });
    }

    const results = Array.isArray(parsed?.results) ? parsed.results : [];

    // Sadece istenen anahtarlar, sadece dolu değerler
    const wanted = new Set(items.map((i) => i.key));
    const clean = results
        .filter((r) => wanted.has(r?.key))
        .map((r) => ({
            key: r.key,
            en: typeof r.en === "string" ? r.en.trim() : "",
        }))
        .filter((r) => r.en);

    if (clean.length === 0) {
        return Response.json({ title: "Çeviri üretilemedi, tekrar deneyin." }, { status: 502 });
    }

    return Response.json({ results: clean });
}