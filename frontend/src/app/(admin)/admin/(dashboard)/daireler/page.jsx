import ApartmentsView from "@/components/admin/structure/ApartmentsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Daireler & Odalar" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [apartments, roomTypes, occupancy] = await Promise.all([
        adminGet("/apartments"),
        adminGet("/room-types", { periodId: period.id }),
        adminGet("/occupancy", { periodId: period.id }),
    ]);
    return <ApartmentsView apartments={apartments} roomTypes={roomTypes} occupancy={occupancy} />;
}
