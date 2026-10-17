import RoomsList from "@/components/rooms/RoomsList";
import BillsStrip from "@/components/home/BillsStrip";
import { getAllRooms, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang);
    return { title: t.roomsPage.metaTitle, description: t.roomsPage.metaDescription };
}

export default async function RoomsPage() {
    const [rooms, types] = await Promise.all([settle(getAllRooms(), []), settle(getRoomTypes(), [])]);

    return (
        <main className="min-h-screen">
            <RoomsList rooms={rooms.data ?? []} types={types.data ?? []}>
                <BillsStrip />
            </RoomsList>
        </main>
    );
}
