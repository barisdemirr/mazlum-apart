import RoomTypesView from "@/components/admin/structure/RoomTypesView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Oda Tipleri" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [roomTypes, apartmentTypes] = await Promise.all([adminGet("/room-types", { periodId: period.id }), adminGet("/apartment-types")]);
    return <RoomTypesView roomTypes={roomTypes} apartmentTypes={apartmentTypes} />;
}
