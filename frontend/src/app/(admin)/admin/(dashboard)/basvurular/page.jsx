import ApplicationsView from "@/components/admin/registration/ApplicationsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Başvurular" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [applications, roomTypes] = await Promise.all([
        adminGet("/applications", { periodId: period.id, pageSize: 200 }),
        adminGet("/room-types", { periodId: period.id }),
    ]);
    return <ApplicationsView applications={applications} roomTypes={roomTypes} />;
}
