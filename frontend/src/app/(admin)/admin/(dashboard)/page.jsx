import DashboardView from "@/components/admin/dashboard/DashboardView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Ana Panel" };

export default async function DashboardPage() {
    const { period } = await getAdminContext();
    const [data, occupancy] = await Promise.all([
        adminGet("/dashboard", { periodId: period.id }),
        adminGet("/occupancy", { periodId: period.id }),
    ]);
    return <DashboardView data={data} occupancy={occupancy} />;
}
