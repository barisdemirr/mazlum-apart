import { notFound } from "next/navigation";
import RoomDetailBody from "@/components/room-detail/RoomDetailBody";
import { getApartment, getRoomTypeApartments, getRoomTypeBySlug, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";

export async function generateMetadata({ params }) {
    const { lang, slug, daire } = await params;
    const [room, apartment] = await Promise.all([getRoomTypeBySlug(slug), getApartment(slug, daire)]);
    if (!room || !apartment) return {};

    const title = `${localized(room.name, lang)} · ${localized(apartment.name, lang)}`;
    const image = apartment.gallery?.find((item) => item.type === "image") ?? room.image;
    return {
        title,
        openGraph: image ? { title, images: [mediaUrl(image.url)] } : { title },
    };
}

/** Daire sayfası: dairenin kendi galerisi, videosu, odaları ve yatakları. Adres paylaşılabilir (örn. veliye). */
export default async function ApartmentDetailPage({ params }) {
    const { slug, daire } = await params;
    const [room, apartment] = await Promise.all([getRoomTypeBySlug(slug), getApartment(slug, daire)]);
    if (!room || !apartment) notFound();

    const [apartments, rooms] = await Promise.all([settle(getRoomTypeApartments(slug), []), settle(getRoomTypes(), [])]);
    const otherRooms = (rooms.data ?? []).filter((item) => item.slug !== slug);

    return (
        <main className="min-h-screen pb-24 lg:pb-0">
            <RoomDetailBody room={room} availability={apartment.availability} apartment={apartment} apartments={apartments.data ?? []} otherRooms={otherRooms} />
        </main>
    );
}
