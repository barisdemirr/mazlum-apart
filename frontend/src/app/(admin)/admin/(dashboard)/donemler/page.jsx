import PeriodsView from "@/components/admin/periods/PeriodsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Dönemler & Fiyatlar" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [overview, roomTypes] = await Promise.all([adminGet("/periods/overview"), adminGet("/room-types", { periodId: period.id })]);
    return <PeriodsView overview={overview} roomTypes={roomTypes} />;
}
