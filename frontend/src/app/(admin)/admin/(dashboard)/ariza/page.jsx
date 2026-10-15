import MaintenanceView from "@/components/admin/support/MaintenanceView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Arıza Kayıtları" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <MaintenanceView items={await adminGet("/maintenance", { periodId: period.id })} />;
}
