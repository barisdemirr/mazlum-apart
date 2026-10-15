import ApplyForm from "@/components/apply/ApplyForm";
import { getApplicationConfig, getRoomTypeAvailability, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";
import { findBed, BED_STATUS } from "@/lib/availability";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang);
    return { title: t.apply.metaTitle, description: t.apply.metaDescription };
}

/**
 * Başvuru sayfası. Oda detay sayfasından gelinirse adres şöyledir:
 *   /basvuru?oda=iki-kisilik-oda&yatak=<yatakId>
 * Oda tipi formda seçili gelir; yatak hâlâ boşsa özet kartında gösterilir.
 */
export default async function ApplyPage({ params, searchParams }) {
    const { lang } = await params;
    const query = await searchParams;
    const roomSlug = typeof query?.oda === "string" ? query.oda : "";
    const bedId = typeof query?.yatak === "string" ? query.yatak : "";

    const [rooms, config, availability] = await Promise.all([
        settle(getRoomTypes(), []),
        settle(getApplicationConfig(), null),
        roomSlug && bedId ? settle(getRoomTypeAvailability(roomSlug), null) : Promise.resolve({ data: null }),
    ]);

    if (!config.data || !(rooms.data ?? []).length) {
        const t = getDictionary(lang);
        return (
            <main className="flex min-h-screen items-center justify-center px-6 text-center">
                <p className="max-w-md text-orchid-muted">{t.apply.unavailable}</p>
            </main>
        );
    }

    // Seçilen yatak hâlâ boş mu? (başkası almış olabilir)
    let bedRequest = null;
    if (roomSlug && bedId) {
        const found = findBed(availability.data, bedId);
        bedRequest = {
            id: bedId,
            roomSlug,
            available: found?.bed.status === BED_STATUS.AVAILABLE,
            flatName: found?.flat.name ?? null,
            roomName: found?.room.name ?? null,
            bedLabel: found?.bed.label ?? null,
        };
    }

    return (
        <main className="min-h-screen">
            <ApplyForm rooms={rooms.data} config={config.data} initialRoomSlug={roomSlug} bedRequest={bedRequest} />
        </main>
    );
}
