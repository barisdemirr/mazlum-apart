import { notFound } from "next/navigation";
import RoomDetailBody from "@/components/room-detail/RoomDetailBody";
import { getRoomTypeAvailability, getRoomTypeBySlug, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";

export async function generateMetadata({ params }) {
    const { lang, slug } = await params;
    const room = await getRoomTypeBySlug(slug);
    if (!room) return {};

    const name = localized(room.name, lang);
    const image = room.gallery?.find((item) => item.type === "image") ?? room.image;
    return {
        title: name,
        openGraph: image ? { title: name, images: [mediaUrl(image.url)] } : { title: name },
    };
}

export default async function RoomDetailPage({ params }) {
    const { slug } = await params;
    const room = await getRoomTypeBySlug(slug);
    if (!room) notFound();

    // Doluluk ve diğer odalar, sayfanın geri kalanından bağımsız yüklenir: biri düşerse sayfa yine açılır
    const [availability, rooms] = await Promise.all([
        settle(getRoomTypeAvailability(slug), null),
        settle(getRoomTypes(), []),
    ]);

    const otherRooms = (rooms.data ?? []).filter((item) => item.slug !== slug);

    return (
        <main className="min-h-screen pb-24 lg:pb-0">
            <RoomDetailBody room={room} availability={availability.data} otherRooms={otherRooms} />
        </main>
    );
}
