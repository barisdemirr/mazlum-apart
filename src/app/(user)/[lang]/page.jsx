import { getDictionary } from "@/lib/i18n/getDictionary";

// Geçici: anasayfa bölümleri sonraki adımlarda eklenecek
export default async function HomePage({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="font-display text-5xl italic text-orchid-pink">Mazlum Apart</h1>
            <p className="text-orchid-muted">{t.common.billsIncluded}</p>
        </main>
    );
}
